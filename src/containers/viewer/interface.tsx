import Book from "../../models/Book";
import HtmlBook from "../../models/HtmlBook";

export interface ViewerProps {
  currentBook: Book;
  htmlBook: HtmlBook | null;
  isShow: boolean;
  isOpenMenu: boolean;
  menuMode: string;
  readerMode: string;
  isNavLocked: boolean;
  handleReadingState: (isReading: boolean) => void;
  handleLeaveReader: (position: string) => void;
  handleEnterReader: (position: string) => void;
  handleFetchBooks: () => void;
  handleFetchBookmarks: () => void;
  handleFetchNotes: () => void;
  handleFetchPercentage: (currentBook: Book) => void;
  handleCurrentChapter: (currentChapter: string) => void;
  handleCurrentChapterIndex: (currentChapterIndex: number) => void;
  handleHtmlBook: (htmlBook: HtmlBook | null) => void;
  handleRenderBookFunc: (renderBookFunc: () => void) => void;
  handleFetchPlugins: () => void;
  handleNoteKey: (key: string) => void;
  handleMenuMode: (menu: string) => void;
  handleOpenMenu: (isOpenMenu: boolean) => void;
  defaultSyncOption: boolean;
  notes: any[];
  t: (title: string) => string;
}

export interface ViewerState {
  cfiRange: any;
  contents: any;
  rect: any;
  key: string;
  isFirst: boolean;
  scale: string | number;
  chapterTitle: string;
  isDisablePopup: boolean;
  isTouch: boolean;
  margin: number;
  chapterDocIndex: number;
  pageOffset: string;
  pageWidth: string;
  chapter: string;
  rendition: any;
  htmlBook: HtmlBook | null;
  readerMode: string;
  currentBook: Book | null;
  isSpeedReaderActive?: boolean;
  speedReaderWPM?: number;
  isMatrixOverlayActive: boolean;
  currentWords: string[];
}
