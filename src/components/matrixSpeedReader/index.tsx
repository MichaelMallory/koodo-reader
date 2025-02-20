import React, { useEffect, useRef, useState } from 'react';
import './matrixSpeedReader.css';
import { QuestionGeneratorService, Question, ValidationResult, Quiz } from "../../services/comprehension/questionGenerator";
import PerformanceAnalytics from '../performanceAnalytics';

interface MatrixSpeedReaderProps {
  text: WordWithPause[];  // Only accept WordWithPause[] now
  onClose: () => void;
  initialWPM?: number;
  bookKey?: string;
  chapterIndex?: number;
  bookName: string;
  chapterTitle: string;
  onProgressUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

interface WordWithPause {
  word: string;
  pauseFactor: number;
  punctuation: string;
}

interface Section {
  words: WordWithPause[];
  startIndex: number;
  endIndex: number;
  isComplete: boolean;
  testCompleted: boolean;
  testScore?: number;
}

interface QuestionType {
  type: 'theme' | 'character' | 'plot' | 'mood' | 'detail' | 'inference';
  weight: number;
}

const QUESTION_DISTRIBUTION: QuestionType[] = [
  { type: 'theme', weight: 3 },     // Theme and main ideas (increased weight)
  { type: 'plot', weight: 3 },      // Plot progression and events (increased weight)
  { type: 'inference', weight: 3 }, // Reading between the lines (increased weight)
  { type: 'character', weight: 2 }, // Character development/motivation (increased weight)
  { type: 'mood', weight: 1 },      // Tone, atmosphere, mood
  { type: 'detail', weight: 0.5 }   // Key supporting details (reduced weight)
];

const MIN_SECTION_SIZE = 500; // Minimum words per section
const MAX_SECTION_SIZE = 1500; // Maximum words per section
const TARGET_SECTION_SIZE = 1000; // Ideal words per section

const MatrixSpeedReader: React.FC<MatrixSpeedReaderProps> = ({
  text,
  onClose,
  initialWPM = 300,
  bookKey,
  chapterIndex,
  bookName,
  chapterTitle,
  onProgressUpdate = () => {},
  onComplete = () => {}
}) => {
  // No need to convert text since it's already WordWithPause[]
  const allWords = text;

  // Split words into sections
  const [sections, setSections] = useState<Section[]>(() => {
    const totalWords = allWords.length;

    // Calculate optimal number of sections
    let sectionCount = Math.ceil(totalWords / TARGET_SECTION_SIZE);
    
    // Adjust section count if sections would be too small
    if (totalWords / sectionCount < MIN_SECTION_SIZE) {
      sectionCount = Math.max(1, Math.floor(totalWords / MIN_SECTION_SIZE));
    }
    
    // Adjust section count if sections would be too large
    if (totalWords / sectionCount > MAX_SECTION_SIZE) {
      sectionCount = Math.ceil(totalWords / MAX_SECTION_SIZE);
    }

    // Calculate base size and remainder for even distribution
    const baseSize = Math.floor(totalWords / sectionCount);
    const remainder = totalWords % sectionCount;

    return Array.from({ length: sectionCount }, (_, index) => {
      // Add one extra word to early sections to distribute remainder
      const extraWord = index < remainder ? 1 : 0;
      const sectionSize = baseSize + extraWord;
      const startIndex = index * baseSize + Math.min(index, remainder);
      const endIndex = startIndex + sectionSize;

      console.log('[MatrixReader] Creating section:', {
        index,
        startIndex,
        endIndex,
        sectionSize,
        totalWords,
        sectionCount
      });

      return {
        words: allWords.slice(startIndex, endIndex),
        startIndex,
        endIndex,
        isComplete: false,
        testCompleted: false
      };
    });
  });

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isPaused, setIsPaused] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [wpm, setWpm] = useState(initialWPM);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const matrixCharacters = '日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍｦｲｸｺｿﾁﾄﾉﾌﾔﾖﾙﾚﾛﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const drops: number[] = [];
  const fontSize = 14;
  let columns = 0;

  // Quiz-related state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizResults, setQuizResults] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // QuestionGenerator service ref
  const questionGeneratorRef = useRef<QuestionGeneratorService | null>(null);

  // Performance analytics state
  const [showPerformanceAnalytics, setShowPerformanceAnalytics] = useState(false);

  // Initialize question generator
  useEffect(() => {
    try {
      questionGeneratorRef.current = new QuestionGeneratorService();
      console.log('[QuizDebug] QuestionGenerator initialized successfully');
    } catch (error) {
      console.error('[QuizDebug] Error initializing QuestionGenerator:', error);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    let resizeTimeout: NodeJS.Timeout;
    
    const resizeCanvas = () => {
      if (!canvas) return;
      
      try {
        // Clear any pending resize operations
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }

        // Debounce the resize operation
        resizeTimeout = setTimeout(() => {
          const devicePixelRatio = window.devicePixelRatio || 1;
          const displayWidth = Math.floor(window.innerWidth * devicePixelRatio);
          const displayHeight = Math.floor(window.innerHeight * devicePixelRatio);

          // Only resize if dimensions have actually changed
          if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            columns = Math.floor(canvas.width / fontSize);
            
            // Reset drops array with new size
            drops.length = 0;
            for (let i = 0; i < columns; i++) {
              drops.push(0);
            }
          }
        }, 100); // 100ms debounce
      } catch (error) {
        console.error('[MatrixReader] Error resizing canvas:', error);
      }
    };

    // Initial resize
    resizeCanvas();

    // Add resize listener
    window.addEventListener('resize', resizeCanvas);

    // Matrix rain animation
    const draw = () => {
      try {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0F0';
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
          const text = matrixCharacters.charAt(
            Math.floor(Math.random() * matrixCharacters.length)
          );
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);

          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }

        requestRef.current = requestAnimationFrame(draw);
      } catch (error) {
        console.error('[MatrixReader] Error in draw loop:', error);
        // Attempt to recover by canceling the animation frame
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
        }
      }
    };

    requestRef.current = requestAnimationFrame(draw);

    return () => {
      // Cleanup
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      window.removeEventListener('resize', resizeCanvas);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Get current section's words
  const currentSection = sections[currentSectionIndex];
  const words = currentSection?.words || [];

  useEffect(() => {
    if (isPaused || currentWordIndex >= words.length || currentWordIndex === -1) return;

    const baseInterval = 60000 / wpm;
    const intervalId = setInterval(() => {
      if (currentWordIndex < words.length - 1) {
        const newIndex = currentWordIndex + 1;
        const newProgress = ((currentSection.startIndex + newIndex + 1) / allWords.length) * 100;
        
        setCurrentWordIndex(newIndex);
        onProgressUpdate(newProgress / 100);
      } else {
        // Section complete
        setSections(prev => prev.map((section, idx) => 
          idx === currentSectionIndex ? { ...section, isComplete: true } : section
        ));
        setIsComplete(true);
        setIsPaused(true);
        clearInterval(intervalId);
      }
    }, baseInterval * (words[currentWordIndex]?.pauseFactor || 1.0));

    return () => clearInterval(intervalId);
  }, [currentWordIndex, isPaused, words, wpm, currentSection]);

  const handleWpmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newWpm = parseInt(event.target.value);
    setWpm(newWpm);
  };

  const togglePause = () => {
    console.log('[MatrixReader] Toggling pause:', {
      currentState: isPaused,
      currentIndex: currentWordIndex,
      totalWords: words.length
    });

    if (currentWordIndex === -1) {
      // First start
      console.log('[MatrixReader] Initial start');
      setCurrentWordIndex(0);
    }
    setIsPaused(!isPaused);
  };

  const progress = currentWordIndex === -1 ? 0 : ((currentWordIndex + 1) / words.length) * 100;
  
  console.log('[MatrixReader] Render state:', {
    progress,
    currentWordIndex,
    totalWords: words.length,
    isPaused,
    isComplete,
    currentWord: currentWordIndex >= 0 ? words[currentWordIndex]?.word : null
  });

  const handleStartQuiz = async () => {
    if (!questionGeneratorRef.current) return;

    setIsLoading(true);
    setIsQuizMode(true);
    
    try {
      // Generate quiz for current section only
      const sectionText = words.map(w => w.word).join(' ');
      const quiz = await questionGeneratorRef.current.generateQuestions(
        sectionText,
        6,
        wpm,
        bookKey,
        chapterIndex,
        {
          questionTypes: QUESTION_DISTRIBUTION,
          context: {
            bookName,
            chapterTitle,
            sectionIndex: currentSectionIndex,
            totalSections: sections.length,
            isFirstSection: currentSectionIndex === 0,
            isLastSection: currentSectionIndex === sections.length - 1
          }
        }
      );
      
      setQuestions(quiz.questions);
      setCurrentQuiz(quiz);
      setIsLoading(false);
    } catch (error) {
      console.error('[QuizDebug] Error generating questions:', error);
      setIsLoading(false);
    }
  };

  const handleQuizComplete = (score: number) => {
    // Mark current section's test as completed
    setSections(prev => prev.map((section, idx) => 
      idx === currentSectionIndex ? { ...section, testCompleted: true, testScore: score } : section
    ));

    // Check if there are more sections
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentWordIndex(-1);
      setIsComplete(false);
      setIsQuizMode(false);
      setQuizResults(null);
      setSelectedAnswers([]);
      setCurrentQuestionIndex(0); // Reset question index for next section
    } else {
      // All sections complete
      setIsQuizMode(false);
      setQuizResults(null);
      setCurrentQuestionIndex(0);
      setSelectedAnswers([]);
      setShowPerformanceAnalytics(true); // Show the performance analytics dashboard
      onComplete();
    }
  };

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    console.log('[QuizDebug] Selecting answer:', {
      questionIndex,
      answerIndex,
      currentQuestion: questions[questionIndex]
    });
    
    setSelectedAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  };

  const handleSubmitQuiz = async () => {
    if (!questionGeneratorRef.current || !currentQuiz) return;

    setIsLoading(true);
    try {
      const results = await questionGeneratorRef.current.validateAnswers(currentQuiz, selectedAnswers);
      setQuizResults(results);
      if (results) {
        // Don't immediately call handleQuizComplete - let user see results first
        // handleQuizComplete(results.score);
        // Instead, show results and let user proceed via quiz results UI
      }
    } catch (error) {
      console.error('[QuizDebug] Error validating answers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetQuiz = () => {
    setIsQuizMode(false);
    setQuizResults(null);
    setQuestions([]);
    setCurrentQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setIsLoading(false);
  };

  const renderQuizResults = () => {
    if (!quizResults) return null;

    const getScoreColor = (score: number) => {
      if (score >= 80) return '#4CAF50';
      if (score >= 60) return '#FFC107';
      return '#F44336';
    };

    return (
      <div className="quiz-results">
        <h3>Neural Sync Test Results</h3>
        
        <div className="score-display" style={{ color: getScoreColor(quizResults.score) }}>
          {quizResults.score.toFixed(1)}%
        </div>
        
        <div className="score-details">
          <p>Correct Answers: {quizResults.correctAnswers} of {quizResults.totalQuestions}</p>
          <p>Section {currentSectionIndex + 1} of {sections.length}</p>
        </div>

        <div className="feedback-list">
          {quizResults.feedback.map((feedback, index) => (
            <div 
              key={index} 
              className={`feedback-item ${feedback.includes('Correct!') ? 'correct' : 'incorrect'}`}
            >
              {feedback}
            </div>
          ))}
        </div>

        <div className="quiz-controls">
          {currentSectionIndex < sections.length - 1 ? (
            <button 
              onClick={() => handleQuizComplete(quizResults.score)} 
              className="matrix-button"
            >
              Continue to Next Section
            </button>
          ) : (
            <div className="final-section-controls">
              <button 
                onClick={() => handleQuizComplete(quizResults.score)} 
                className="matrix-button"
              >
                View Performance Dashboard
              </button>
              <button 
                onClick={onClose} 
                className="matrix-button secondary"
              >
                Return to Reader
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuizContent = () => {
    console.log('[QuizDebug] Rendering quiz content - loading:', isLoading, 'questions:', questions.length);

    if (!process.env.REACT_APP_OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY === 'your_openai_api_key_here') {
      return (
        <div className="quiz-error">
          <h3>Neural Sync Configuration Required</h3>
          <p>OpenAI API key not configured. Please follow these steps:</p>
          <ol>
            <li>Create a copy of .env.example as .env in the project root</li>
            <li>Add your OpenAI API key to REACT_APP_OPENAI_API_KEY in .env</li>
            <li>Restart the application</li>
          </ol>
          <button onClick={resetQuiz} className="matrix-button">
            Return to Summary
          </button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="quiz-loading">
          <p>Initializing Neural Comprehension Test...</p>
        </div>
      );
    }

    if (quizResults) {
      return renderQuizResults();
    }

    if (questions.length === 0) {
      return (
        <div className="quiz-loading">
          <p>Error initializing comprehension test.</p>
          <button onClick={resetQuiz}>
            Return to Summary
          </button>
        </div>
      );
    }

    const currentQuestion = questions[currentQuestionIndex];
    return (
      <div className="quiz-content">
        <div className="question-counter">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
        <div className="question-text">
          {currentQuestion.question}
        </div>
        <div className="answer-options">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              className={`answer-option ${selectedAnswers[currentQuestionIndex] === index ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(currentQuestionIndex, index)}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="quiz-navigation">
          {currentQuestionIndex > 0 && (
            <button
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            >
              Previous
            </button>
          )}
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              disabled={selectedAnswers[currentQuestionIndex] === undefined}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmitQuiz}
              disabled={selectedAnswers.length !== questions.length}
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleProgressBarClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    const newWordIndex = Math.floor((words.length * percentage) / 100);
    setCurrentWordIndex(Math.min(newWordIndex, words.length - 1));
  };

  const handleProgressBarDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    
    const updateProgress = (clientX: number) => {
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      const newWordIndex = Math.floor((words.length * percentage) / 100);
      setCurrentWordIndex(Math.min(newWordIndex, words.length - 1));
    };

    const onMouseMove = (e: MouseEvent) => {
      updateProgress(e.clientX);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const renderProgress = () => {
    const overallProgress = (currentSection.startIndex + currentWordIndex + 1) / allWords.length * 100;
    const sectionProgress = (currentWordIndex + 1) / words.length * 100;
    
    return (
      <div className="progress-container">
        <div className="progress-text">
          BrainLoading {bookName} - {overallProgress.toFixed(2)}%
        </div>
        <div 
          className="progress-bar"
          onClick={handleProgressBarClick}
          onMouseDown={handleProgressBarDrag}
        >
          <div 
            className="progress-line-fill" 
            style={{ width: `${sectionProgress}%` }} 
          />
        </div>
      </div>
    );
  };

  const renderCompletionMessage = () => {
    if (showPerformanceAnalytics) {
      return (
        <PerformanceAnalytics
          onClose={() => setShowPerformanceAnalytics(false)}
          questionGenerator={questionGeneratorRef.current!}
        />
      );
    }

    if (isQuizMode) {
      return (
        <div className="quiz-interface">
          <h2 className="quiz-title">Neural Comprehension Interface</h2>
          {renderQuizContent()}
        </div>
      );
    }
    
    return (
      <div className="completion-message">
        <h2 className="completion-title">Section Complete</h2>
        <p className="completion-subtitle">
          Ready for comprehension test
        </p>
        <div className="completion-controls">
          <button 
            className="neural-test-button"
            onClick={handleStartQuiz}
          >
            <span className="icon-brain"></span>
            Initialize Neural Sync Test
          </button>
          <button 
            className="performance-button"
            onClick={() => setShowPerformanceAnalytics(true)}
          >
            <span className="icon-chart"></span>
            View Neural Performance Matrix
          </button>
          <button onClick={onClose}>Return to Reader</button>
        </div>
      </div>
    );
  };

  return (
    <div className="matrix-speed-reader">
      <canvas ref={canvasRef} className="matrix-canvas" />
      <div className="matrix-overlay">
        {!isComplete ? (
          <>
            {renderProgress()}
            
            <div className="word-display">
              {currentWordIndex === -1 ? 
                `Press Start to begin Section ${currentSectionIndex + 1}` : 
                words[currentWordIndex]?.word || ''
              }
            </div>

            <div className="controls">
              <div className="wpm-control">
                <span>WPM:</span>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  value={wpm}
                  onChange={handleWpmChange}
                  className="wpm-slider"
                />
                <span className="wpm-value">{wpm}</span>
              </div>
              
              <button onClick={togglePause}>
                {currentWordIndex === -1 ? 'Start' : (isPaused ? 'Resume' : 'Pause')}
              </button>
              <button onClick={onClose}>Exit</button>
            </div>
          </>
        ) : (
          renderCompletionMessage()
        )}
      </div>
    </div>
  );
};

export default MatrixSpeedReader; 