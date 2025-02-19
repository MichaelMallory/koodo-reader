export interface MatrixSpeedReaderProps {
  words: string[];
  onClose: () => void;
  onComplete: () => void;
  initialWPM?: number;
  onProgressUpdate?: (progress: number) => void;
}

export interface MatrixSpeedReaderState {
  currentIndex: number;
  isPlaying: boolean;
  wpm: number;
  progress: number;
  isComplete: boolean;
  canvasContext: CanvasRenderingContext2D | null;
}

export interface MatrixCharacter {
  x: number;
  y: number;
  value: string;
  speed: number;
  opacity: number;
} 