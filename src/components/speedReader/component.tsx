import React from "react";
import "./speedReader.css";
import { SpeedReaderProps, SpeedReaderState } from "./interface";
import MatrixBackground from "./atoms/matrixBackground/MatrixBackground";
import WordDisplay from "./atoms/wordDisplay/WordDisplay";
import SpeedControls from "./atoms/controls/SpeedControls";
import ProgressBar from "./atoms/progressBar/ProgressBar";
import { EnhancedTextExtractor } from "../../utils/reader/enhancedTextExtractor";

class SpeedReader extends React.Component<SpeedReaderProps, SpeedReaderState> {
  private wordTimer: NodeJS.Timeout | null = null;
  private textExtractor: EnhancedTextExtractor;

  constructor(props: SpeedReaderProps) {
    super(props);
    console.log('[SpeedReader] Constructor:', {
      hasProps: !!props,
      hasHtmlBook: !!props.htmlBook,
      hasCurrentBook: !!props.currentBook
    });
    
    this.textExtractor = new EnhancedTextExtractor();
    
    this.state = {
      currentWord: "Loading...",
      currentIndex: 0,
      isPlaying: false,
      isCompleted: false,
      isLoading: true,
      wpm: 300,
      words: [],
      progress: 0,
      currentChapter: "",
      currentChapterIndex: 0,
      chapters: [],
      flattenChapters: [],
      rendition: null,
      totalWords: 0,
      rawChapterText: ""
    };
  }

  componentDidMount() {
    console.log('[SpeedReader] Component mounted:', {
      hasHtmlBook: !!this.props.htmlBook,
      currentBook: this.props.currentBook?.key,
    });
    
    if (this.props.currentBook) {
      console.log('[SpeedReader] Calling initializeReader from mount');
      this.initializeReader();
    }
    document.addEventListener('keydown', this.handleKeyPress);
  }

  componentDidUpdate(prevProps: SpeedReaderProps) {
    console.log('[SpeedReader] Component updated:', {
      prevHadBook: !!prevProps.currentBook,
      nowHasBook: !!this.props.currentBook,
      currentBookKey: this.props.currentBook?.key
    });

    if (!prevProps.currentBook && this.props.currentBook) {
      console.log('[SpeedReader] Book became available, calling initializeReader');
      this.initializeReader();
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyPress);
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
    }
  }

  initializeReader = async () => {
    const { currentBook } = this.props;

    console.log('[SpeedReader] Initializing reader:', {
      hasBook: !!currentBook,
      bookKey: currentBook?.key,
      bookName: currentBook?.name,
      hasTextExtractor: !!this.textExtractor
    });

    if (!currentBook) {
      console.error('[SpeedReader] No book available');
      return;
    }

    try {
      // Convert the book to a File object
      const bookFile = new File([currentBook.path], currentBook.name, {
        type: `application/${currentBook.format.toLowerCase()}`
      });

      // Extract chapters
      const chapters = await this.textExtractor.extractFromFile(bookFile, currentBook);
      
      if (chapters.length === 0) {
        throw new Error('No chapters extracted from the book');
      }

      // Get words from the first chapter
      const words = this.textExtractor.getChapterWords(0);
      
      this.setState({
        chapters,
        words,
        currentWord: words[0] || "",
        currentIndex: 0,
        currentChapter: chapters[0].title,
        currentChapterIndex: 0,
        isLoading: false,
        totalWords: this.textExtractor.getTotalWordCount(),
        progress: 0,
        isPlaying: false,
        isCompleted: false,
        flattenChapters: chapters,
        rendition: null
      });

      // Update parent component
      this.props.handleCurrentChapter(chapters[0].title);
      this.props.handleCurrentChapterIndex(0);

    } catch (error) {
      console.error('[SpeedReader] Error initializing reader:', error);
      this.setState({
        isLoading: false,
        currentWord: "Error loading book"
      });
    }
  }

  handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key) {
      case " ":
        event.preventDefault();
        this.handlePlayPause();
        break;
      case "ArrowRight":
        event.preventDefault();
        this.handleNextWord();
        break;
      case "ArrowLeft":
        event.preventDefault();
        this.handlePreviousWord();
        break;
      default:
        break;
    }
  }

  handlePlayPause = () => {
    if (this.state.isPlaying) {
      if (this.wordTimer) {
        clearInterval(this.wordTimer);
      }
    } else {
      this.startReading();
    }
    this.setState(prevState => ({ isPlaying: !prevState.isPlaying }));
  }

  startReading = () => {
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
    }

    const msPerWord = Math.floor(60000 / this.state.wpm);
    
    this.wordTimer = setInterval(() => {
      this.handleNextWord();
    }, msPerWord);
  }

  handleNextWord = () => {
    this.setState(prevState => {
      if (prevState.currentIndex >= prevState.words.length - 1) {
        // End of current chapter
        if (prevState.currentChapterIndex < this.textExtractor.getChapterCount() - 1) {
          // Move to next chapter
          const nextChapterIndex = prevState.currentChapterIndex + 1;
          const words = this.textExtractor.getChapterWords(nextChapterIndex);
          const chapter = this.textExtractor.getCurrentChapter();
          
          // Update parent component
          this.props.handleCurrentChapter(chapter?.title || "");
          this.props.handleCurrentChapterIndex(nextChapterIndex);

          return {
            ...prevState,
            currentChapterIndex: nextChapterIndex,
            currentChapter: chapter?.title || "",
            words,
            currentIndex: 0,
            currentWord: words[0] || "",
            progress: this.calculateProgress(nextChapterIndex, 0)
          };
        } else {
          // End of book
          if (this.wordTimer) {
            clearInterval(this.wordTimer);
          }
          return {
            ...prevState,
            isPlaying: false,
            isCompleted: true,
            progress: 100
          };
        }
      }

      // Next word in current chapter
      return {
        ...prevState,
        currentIndex: prevState.currentIndex + 1,
        currentWord: prevState.words[prevState.currentIndex + 1],
        progress: this.calculateProgress(prevState.currentChapterIndex, prevState.currentIndex + 1)
      };
    });
  }

  handlePreviousWord = () => {
    this.setState(prevState => {
      if (prevState.currentIndex <= 0) {
        // Start of current chapter
        if (prevState.currentChapterIndex > 0) {
          // Move to previous chapter
          const prevChapterIndex = prevState.currentChapterIndex - 1;
          const words = this.textExtractor.getChapterWords(prevChapterIndex);
          const chapter = this.textExtractor.getCurrentChapter();
          
          // Update parent component
          this.props.handleCurrentChapter(chapter?.title || "");
          this.props.handleCurrentChapterIndex(prevChapterIndex);

          return {
            ...prevState,
            currentChapterIndex: prevChapterIndex,
            currentChapter: chapter?.title || "",
            words,
            currentIndex: words.length - 1,
            currentWord: words[words.length - 1] || "",
            progress: this.calculateProgress(prevChapterIndex, words.length - 1)
          };
        }
        return prevState;
      }

      // Previous word in current chapter
      return {
        ...prevState,
        currentIndex: prevState.currentIndex - 1,
        currentWord: prevState.words[prevState.currentIndex - 1],
        progress: this.calculateProgress(prevState.currentChapterIndex, prevState.currentIndex - 1)
      };
    });
  }

  handleWpmChange = (newWpm: number) => {
    this.setState({ wpm: newWpm }, () => {
      if (this.state.isPlaying) {
        this.startReading(); // Restart with new WPM
      }
    });
  }

  handleReset = () => {
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
    }
    this.setState({
      currentIndex: 0,
      currentWord: this.state.words[0] || "",
      isPlaying: false,
      isCompleted: false,
      progress: 0
    });
  }

  calculateProgress = (chapterIndex: number, wordIndex: number): number => {
    const { chapters } = this.state;
    if (chapters.length === 0) return 0;

    let totalWordsBefore = 0;
    for (let i = 0; i < chapterIndex; i++) {
      totalWordsBefore += chapters[i].wordCount;
    }
    
    const currentProgress = totalWordsBefore + wordIndex;
    return (currentProgress / this.state.totalWords) * 100;
  }

  render(): JSX.Element {
    const {
      currentWord,
      isPlaying,
      isCompleted,
      isLoading,
      wpm,
      progress,
      currentChapter,
      currentIndex,
      totalWords
    } = this.state;

    if (isLoading) {
      return (
        <div className="speed-reader-container">
          <div className="loading-message">Loading book content...</div>
        </div>
      );
    }

    return (
      <div className="speed-reader-container">
        <MatrixBackground />
        
        <div className="speed-reader-content">
          <div className="chapter-info">{currentChapter}</div>
          
          <WordDisplay
            word={isCompleted ? "Completed" : currentWord}
            isVisible={true}
            isCompleted={isCompleted}
            isPlaying={isPlaying}
            onNext={this.handleNextWord}
            onPrevious={this.handlePreviousWord}
          />
          
          <SpeedControls
            wpm={wpm}
            isPlaying={isPlaying}
            onPlayPause={this.handlePlayPause}
            onWpmChange={this.handleWpmChange}
            onReset={this.handleReset}
          />
          
          <ProgressBar 
            progress={progress}
            totalWords={totalWords}
            currentWord={currentIndex + 1}
          />
        </div>
      </div>
    );
  }
}

export default SpeedReader; 