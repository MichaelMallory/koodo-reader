import React from 'react';
import { motion } from 'framer-motion';
import './SpeedControls.css';

interface SpeedControlsProps {
  wpm: number;
  isPlaying: boolean;
  onWpmChange: (wpm: number) => void;
  onPlayPause: () => void;
  onReset: () => void;
}

const SpeedControls: React.FC<SpeedControlsProps> = ({
  wpm,
  isPlaying,
  onWpmChange,
  onPlayPause,
  onReset,
}) => {
  const handleWpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWpm = Math.max(100, Math.min(1000, parseInt(e.target.value) || 100));
    onWpmChange(newWpm);
  };

  return (
    <div className="speed-controls">
      <div className="speed-controls-group">
        <label className="speed-label">WPM:</label>
        <input
          type="number"
          className="wpm-input"
          value={wpm}
          onChange={handleWpmChange}
          min="100"
          max="1000"
          step="10"
        />
        <input
          type="range"
          className="wpm-slider"
          value={wpm}
          onChange={handleWpmChange}
          min="100"
          max="1000"
          step="10"
        />
      </div>
      <div className="speed-controls-group">
        <motion.button
          className="control-button"
          whileTap={{ scale: 0.95 }}
          onClick={onPlayPause}
        >
          {isPlaying ? 'Pause' : 'Start'}
        </motion.button>
        <motion.button
          className="control-button"
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
        >
          Reset
        </motion.button>
      </div>
    </div>
  );
};

export default SpeedControls; 