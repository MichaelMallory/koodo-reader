export interface WordDisplayProps {
  word: string;
  isVisible: boolean;
  isCompleted: boolean;
  isPlaying: boolean;
  onNext: () => void;
  onPrevious: () => void;
} 