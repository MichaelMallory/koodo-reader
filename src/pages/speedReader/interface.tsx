import Book from "../../models/Book";
import { RouteComponentProps } from "react-router-dom";

interface MatrixColumn {
  x: number;
  chars: string[];
  speed: number;
}

export interface SpeedReaderPageProps extends RouteComponentProps {
  books: Book[];
  t: (title: string) => string;
  isLoading?: boolean;
  setLoading?: (isLoading: boolean) => void;
}

export interface SpeedReaderPageState {
  selectedBook: Book | null;
  currentChapter: string;
  currentChapterIndex: number;
  matrixColumns: MatrixColumn[];
  chapterText: string;
  isLoading: boolean;
  error: string | null;
  words: string[];
  currentWordIndex: number;
  isPlaying: boolean;
  wpm: number;
  progress: number;
  showCompletionAnim: boolean;
  chapters: string[];
  debugInfo: Array<{type: string, message: string, timestamp: number}>;
} 