import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WordDisplayProps } from './interface';
import './WordDisplay.css';

const WordDisplay: React.FC<WordDisplayProps> = ({
  word,
  isVisible = true,
  isCompleted = false,
  isPlaying = false,
  onNext,
  onPrevious,
}) => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isCompleted) return;
      
      switch (event.code) {
        case 'ArrowLeft':
          event.preventDefault();
          onPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isCompleted, onNext, onPrevious]);

  if (isCompleted) return null;

  return (
    <div className="word-display-container">
      <div className="word-display-center">
        <AnimatePresence>
          {isVisible && word && (
            <motion.div
              key={word}
              className={`word-display ${isPlaying ? 'playing' : ''}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                color: isPlaying ? 'var(--reader-text-color, #00ff00)' : 'rgba(0, 255, 0, 0.7)'
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
            >
              {word}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WordDisplay; 