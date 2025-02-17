// Empty interface for now, will add more props as we implement features
export interface SpeedReaderProps {}

export interface SpeedReaderState {
  currentWord: string;
  currentIndex: number;
  isPlaying: boolean;
  isCompleted: boolean;
  wpm: number;
  words: string[];
  progress: number;
} 