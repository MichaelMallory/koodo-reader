import Book from "../../models/Book";
import { RouteComponentProps } from "react-router-dom";

export interface SpeedReaderPageProps extends RouteComponentProps {
  books: Book[];
  t: (title: string) => string;
  isLoading?: boolean;
  setLoading?: (isLoading: boolean) => void;
  handleReadingBook: (isReading: boolean) => void;
}

export interface SpeedReaderPageState {
  selectedBook: Book | null;
  currentChapter: string;
  currentChapterIndex: number;
  isLoading: boolean;
  error: string | null;
  debugInfo: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
} 