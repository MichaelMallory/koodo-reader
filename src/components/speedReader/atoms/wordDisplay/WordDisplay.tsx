import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './WordDisplay.css';

interface WordDisplayProps {
  word: string;
  isVisible?: boolean;
  isCompleted?: boolean;
}

const WordDisplay: React.FC<WordDisplayProps> = ({
  word,
  isVisible = true,
  isCompleted = false,
}) => {
  if (isCompleted) return null;

  return (
    <div className="word-display-container">
      <div className="word-display-center">
        <AnimatePresence>
          {isVisible && word && (
            <motion.div
              key={word}
              className="word-display"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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