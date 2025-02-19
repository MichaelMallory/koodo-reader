import React, { useEffect, useRef, useState } from 'react';
import './matrixSpeedReader.css';
import { QuestionGeneratorService, Question, ValidationResult, Quiz } from "../../services/comprehension/questionGenerator";

interface MatrixSpeedReaderProps {
  words: string[];
  initialWPM: number;
  onClose: () => void;
  onComplete: () => void;
  onProgressUpdate: (progress: number) => void;
  bookName: string;
  chapterTitle: string;
}

const MatrixSpeedReader: React.FC<MatrixSpeedReaderProps> = ({
  words,
  initialWPM,
  onClose,
  onComplete,
  onProgressUpdate,
  bookName,
  chapterTitle,
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(-1); // Start at -1 to indicate not started
  const [isPaused, setIsPaused] = useState(true); // Start paused
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

  useEffect(() => {
    if (isPaused || currentWordIndex >= words.length || currentWordIndex === -1) return;

    console.log('[MatrixReader] Progress check:', {
      currentWordIndex,
      totalWords: words.length,
      progress: ((currentWordIndex + 1) / words.length) * 100,
      isPaused,
      isComplete
    });

    const intervalId = setInterval(() => {
      if (currentWordIndex < words.length - 1) {
        const newIndex = currentWordIndex + 1;
        const newProgress = (newIndex / words.length) * 100;
        
        console.log('[MatrixReader] Updating progress:', {
          newIndex,
          totalWords: words.length,
          newProgress,
          currentWord: words[newIndex]
        });

        setCurrentWordIndex(newIndex);
        onProgressUpdate(newProgress / 100); // Convert to decimal for progress update
      } else {
        console.log('[MatrixReader] Completing chapter:', {
          finalIndex: currentWordIndex,
          totalWords: words.length,
          progress: 100
        });
        
        setIsComplete(true);
        setIsPaused(true);
        onComplete();
        clearInterval(intervalId);
      }
    }, 60000 / wpm);

    return () => clearInterval(intervalId);
  }, [currentWordIndex, isPaused, words, wpm, onComplete, onProgressUpdate]);

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
    currentWord: currentWordIndex >= 0 ? words[currentWordIndex] : null
  });

  const handleStartQuiz = async () => {
    console.log('[QuizDebug] handleStartQuiz called');
    if (!questionGeneratorRef.current) {
      console.error('[QuizDebug] Question generator not initialized');
      return;
    }

    setIsLoading(true);
    setIsQuizMode(true);
    console.log('[QuizDebug] State updated - loading:', true, 'quizMode:', true);
    
    try {
      // Join all words into text for question generation
      const text = words.join(' ');
      console.log('[QuizDebug] Preparing text for quiz - length:', text.length, 'words:', words.length);
      
      console.log('[QuizDebug] Calling generateQuestions');
      const quiz = await questionGeneratorRef.current.generateQuestions(text, 6, wpm);
      console.log('[QuizDebug] Quiz generated:', quiz);
      
      setQuestions(quiz.questions);
      setCurrentQuiz(quiz);
      setIsLoading(false);
      console.log('[QuizDebug] Quiz state updated');
    } catch (error) {
      console.error('[QuizDebug] Error generating questions:', error);
      setIsLoading(false);
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
    console.log('[QuizDebug] Attempting to submit quiz:', {
      hasQuestionGenerator: !!questionGeneratorRef.current,
      hasCurrentQuiz: !!currentQuiz,
      selectedAnswers,
      totalQuestions: currentQuiz?.questions?.length,
      questions: currentQuiz?.questions
    });

    if (!questionGeneratorRef.current || !currentQuiz) {
      console.error('[QuizDebug] Cannot submit quiz - missing required data');
      return;
    }

    if (selectedAnswers.length !== currentQuiz.questions.length) {
      console.warn('[QuizDebug] Not all questions answered:', {
        answered: selectedAnswers.length,
        total: currentQuiz.questions.length,
        selectedAnswers
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('[QuizDebug] Validating answers with data:', {
        quiz: currentQuiz,
        userAnswers: selectedAnswers
      });
      
      const results = await questionGeneratorRef.current.validateAnswers(currentQuiz, selectedAnswers);
      console.log('[QuizDebug] Validation results:', results);
      
      if (!results || typeof results.score !== 'number') {
        throw new Error('Invalid validation results received');
      }
      
      setQuizResults(results);
    } catch (error) {
      console.error('[QuizDebug] Error validating answers:', error);
      setQuizResults({
        score: 0,
        totalQuestions: currentQuiz.questions.length,
        correctAnswers: 0,
        feedback: ['An error occurred while validating your answers. Please try again.'],
      });
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
          <button onClick={resetQuiz} className="matrix-button">
            Return to Summary
          </button>
          <button onClick={() => {
            setQuizResults(null);
            setCurrentQuestionIndex(0);
            setSelectedAnswers([]);
          }} className="matrix-button">
            Try Again
          </button>
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

  const renderCompletionMessage = () => {
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
        <h2 className="completion-title">Download Complete</h2>
        <p className="completion-subtitle">
          Chapter successfully processed
        </p>
        <div className="completion-controls">
          <button 
            className="neural-test-button"
            onClick={handleStartQuiz}
          >
            <span className="icon-brain"></span>
            Initialize Neural Sync Test
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
            <div className="progress-bar">
              <div 
                className="progress-line-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="progress-text">
              {currentWordIndex === -1 ? (
                "Ready to begin BrainLoading..."
              ) : (
                <>
                  BrainLoading {bookName} - {progress.toFixed(2)}%
                  <div className="progress-stats">
                    Chapter: {chapterTitle}
                    <br />
                    Word {currentWordIndex + 1} of {words.length}
                  </div>
                </>
              )}
            </div>
            
            <div className="word-display">
              {currentWordIndex === -1 ? 
                "Press Start to begin BrainLoad" : 
                words[currentWordIndex] || ''
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