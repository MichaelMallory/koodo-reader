import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  progress: number; // 0 to 100
  totalWords: number;
  currentWord: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  totalWords,
  currentWord,
}) => {
  return (
    <div className="progress-container">
      <div className="progress-info">
        <span className="progress-text">
          {currentWord} / {totalWords} words ({progress}%)
        </span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ 
            width: `${progress}%`,
            boxShadow: '0 0 10px rgba(0,255,0,0.7), 0 0 5px #fff'
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar; 