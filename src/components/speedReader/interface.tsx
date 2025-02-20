import HtmlBook from "../../models/HtmlBook";
import Book from "../../models/Book";
import { WithTranslation } from "react-i18next";

// Empty interface for now, will add more props as we implement features
export interface SpeedReaderBaseProps {
  htmlBook?: HtmlBook | null;
  currentBook: Book;
  handleCurrentChapter: (title: string, index: number) => void;
}

export type SpeedReaderProps = SpeedReaderBaseProps & Partial<WithTranslation>;

export interface SpeedReaderState {
  currentWord: string;
  currentIndex: number;
  isPlaying: boolean;
  isCompleted: boolean;
  isLoading: boolean;
  wpm: number;
  words: string[];
  progress: number;
  currentChapter: string;
  currentChapterIndex: number;
  chapters: any[];
  flattenChapters: any[];
  rendition: any;
  totalWords: number;
  testBook?: {
    key: string;
    name: string;
    path: string;
    format: string;
    charset: string;
  };
  rawChapterText: string;
  isCalibrationActive: boolean;
} 