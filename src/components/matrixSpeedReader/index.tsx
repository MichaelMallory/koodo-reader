import React, { useEffect, useRef, useState } from 'react';
import './matrixSpeedReader.css';

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

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      while (drops.length < columns) {
        drops.push(0);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
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
    };

    requestRef.current = requestAnimationFrame(draw);

    return () => {
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

  const handleStartQuiz = () => {
    setIsQuizMode(true);
    // Future: This is where we'll trigger the LLM to generate questions
  };

  const renderCompletionMessage = () => {
    if (isQuizMode) {
      return (
        <div className="quiz-interface">
          <h2 className="quiz-title">Neural Comprehension Interface</h2>
          <div className="quiz-content">
            <p className="quiz-subtitle">Initializing knowledge verification protocol...</p>
            {/* Future: This is where quiz questions will be rendered */}
          </div>
          <div className="quiz-controls">
            <button onClick={() => setIsQuizMode(false)}>Return to Summary</button>
            <button onClick={onClose}>Exit Reader</button>
          </div>
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