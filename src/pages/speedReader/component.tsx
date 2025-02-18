import React from "react";
import "./speedReader.css";
import { SpeedReaderPageProps, SpeedReaderPageState } from "./interface";
import { Trans } from "react-i18next";
import EmptyCover from "../../components/emptyCover";
import CoverUtil from "../../utils/file/coverUtil";
import { EnhancedTextExtractor } from "../../utils/reader/enhancedTextExtractor";
import Book from "../../models/Book";

class SpeedReaderPage extends React.Component<SpeedReaderPageProps, SpeedReaderPageState> {
  private matrixInterval: NodeJS.Timeout | null = null;
  private wordTimer: NodeJS.Timeout | null = null;
  private textExtractor: EnhancedTextExtractor;
  private mounted: boolean = false;
  private loadingAbortController: AbortController | null = null;

  constructor(props: SpeedReaderPageProps) {
    super(props);
    this.textExtractor = new EnhancedTextExtractor();
    this.state = {
      selectedBook: null,
      currentChapter: "",
      currentChapterIndex: 0,
      matrixColumns: [],
      chapterText: "",
      isLoading: false,
      error: null,
      words: [],
      currentWordIndex: 0,
      isPlaying: false,
      wpm: 300,
      progress: 0,
      showCompletionAnim: false,
      chapters: [],
      debugInfo: []
    };
  }

  componentDidMount() {
    console.log('[SpeedReader] Component mounted');
    this.mounted = true;
    this.initMatrixEffect();
    if (this.props.setLoading) {
      this.props.setLoading(false);
    }
    window.addEventListener('error', this.handleGlobalError);
  }

  componentWillUnmount() {
    console.log('[SpeedReader] Component unmounting, cleaning up resources');
    this.mounted = false;

    if (this.matrixInterval) {
      console.log('[SpeedReader] Clearing matrix interval');
      clearInterval(this.matrixInterval);
      this.matrixInterval = null;
    }
    if (this.wordTimer) {
      console.log('[SpeedReader] Clearing word timer');
      clearInterval(this.wordTimer);
      this.wordTimer = null;
    }

    if (this.loadingAbortController) {
      console.log('[SpeedReader] Aborting pending operations');
      this.loadingAbortController.abort();
      this.loadingAbortController = null;
    }

    if (this.props.setLoading) {
      this.props.setLoading(false);
    }

    window.removeEventListener('error', this.handleGlobalError);
    console.log('[SpeedReader] Cleanup complete');
  }

  safeSetState = (state: any, callback?: () => void) => {
    if (this.mounted) {
      this.setState(state, callback);
    }
  };

  initMatrixEffect = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
    const columnCount = Math.floor(window.innerWidth / 20);
    
    const createColumn = () => {
      const column = {
        x: Math.random() * window.innerWidth,
        chars: Array(Math.floor(Math.random() * 25 + 5))
          .fill(0)
          .map(() => characters[Math.floor(Math.random() * characters.length)]),
        speed: Math.random() * 2 + 1
      };
      return column;
    };

    const columns = Array(columnCount).fill(0).map(createColumn);
    this.safeSetState({ matrixColumns: columns });

    this.matrixInterval = setInterval(() => {
      this.safeSetState(prevState => ({
        matrixColumns: prevState.matrixColumns.map(col => {
          if (Math.random() < 0.02) {
            return createColumn();
          }
          return col;
        })
      }));
    }, 100);
  };

  startReading = () => {
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
    }

    this.setState({ isPlaying: true }, () => {
      this.wordTimer = setInterval(() => {
        this.setState(prevState => {
          if (prevState.currentWordIndex >= prevState.words.length - 1) {
            clearInterval(this.wordTimer!);
            return {
              isPlaying: false,
              showCompletionAnim: true,
              progress: 100,
              currentWordIndex: prevState.currentWordIndex
            };
          }

          const newIndex = prevState.currentWordIndex + 1;
          return {
            currentWordIndex: newIndex,
            progress: Math.min(100, Math.round((newIndex / Math.max(1, prevState.words.length - 1)) * 100)),
            isPlaying: true,
            showCompletionAnim: false
          };
        });
      }, (60 * 1000) / this.state.wpm);
    });
  };

  pauseReading = () => {
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
    }
    this.setState({ isPlaying: false });
  };

  handleWpmChange = (newWpm: number) => {
    const boundedWpm = Math.max(100, Math.min(1000, newWpm));
    this.setState({ wpm: boundedWpm }, () => {
      if (this.state.isPlaying) {
        this.startReading();
      }
    });
  };

  handleReset = () => {
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
    }
    this.setState({
      currentWordIndex: 0,
      isPlaying: false,
      showCompletionAnim: false,
      progress: 0
    });
  };

  handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('[SpeedReader] Starting file processing:', {
        fileName: file.name,
        fileSize: file.size,
        mounted: this.mounted
      });

      // Create new abort controller for this operation
      if (this.loadingAbortController) {
        console.log('[SpeedReader] Aborting previous operation');
        this.loadingAbortController.abort();
      }
      this.loadingAbortController = new AbortController();

      this.safeSetState({ isLoading: true, error: null });
      this.addDebugInfo('info', `Starting text extraction for file: ${file.name}`);

      // Create a Book object from the file
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      console.log('[SpeedReader] Created book object, starting extraction');
      
      const book: Book = new Book(
        Date.now().toString(),
        file.name,
        '',
        '',
        '',
        '',
        fileExtension,
        '',
        file.size,
        0,
        URL.createObjectURL(file),
        'utf-8'
      );

      // Extract text content
      const extractionStart = Date.now();
      console.log('[SpeedReader] Beginning text extraction');
      
      const chapters = await this.textExtractor.extractFromFile(file, book);
      
      console.log('[SpeedReader] Extraction complete:', {
        duration: Date.now() - extractionStart,
        chapterCount: chapters.length,
        mounted: this.mounted
      });

      if (!this.mounted) {
        console.log('[SpeedReader] Component unmounted during extraction, aborting state update');
        return;
      }

      if (chapters.length === 0) {
        throw new Error('No chapters found in the file');
      }

      this.safeSetState({
        selectedBook: book,
        chapters: chapters.map(c => c.title),
        currentChapterIndex: 0,
        currentChapter: chapters[0].title,
        chapterText: chapters[0].text,
        words: chapters[0].text.split(/\s+/).filter(word => word.length > 0),
        currentWordIndex: 0,
        isLoading: false
      });

      console.log('[SpeedReader] State updated successfully');

    } catch (err) {
      console.error('[SpeedReader] Error in file processing:', {
        error: err,
        mounted: this.mounted
      });
      
      if (this.mounted) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.addDebugInfo('error', `Failed to process file: ${error.message}`);
        this.safeSetState({
          error: `Failed to process file: ${error.message}`,
          isLoading: false
        });
      }
    } finally {
      if (this.loadingAbortController) {
        this.loadingAbortController = null;
      }
    }
  };

  handleBookSelect = async (book: Book) => {
    try {
      this.safeSetState({ isLoading: true, error: null });
      this.addDebugInfo('info', `Starting text extraction for book: ${book.name}`);

      // Get the file for the book
      const file = await this.getBookFile(book);
      const chapters = await this.textExtractor.extractFromFile(file, book);
      this.addDebugInfo('success', `Successfully extracted ${chapters.length} chapters`);

      if (chapters.length === 0) {
        throw new Error('No chapters found in the book');
      }

      this.safeSetState({
        selectedBook: book,
        chapters: chapters.map(c => c.title),
        currentChapterIndex: 0,
        currentChapter: chapters[0].title,
        chapterText: chapters[0].text,
        words: chapters[0].text.split(/\s+/).filter(word => word.length > 0),
        currentWordIndex: 0,
        isLoading: false
      });

      this.addDebugInfo('info', `Loaded chapter: ${chapters[0].title} with ${chapters[0].text.split(/\s+/).filter(word => word.length > 0).length} words`);

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Error selecting book:', error);
      this.addDebugInfo('error', `Failed to load book: ${error.message}`);
      this.safeSetState({
        error: `Failed to load book: ${error.message}`,
        isLoading: false
      });
    }
  };

  // Helper method to get the File object for a book
  private getBookFile = async (book: Book): Promise<File> => {
    const response = await fetch(book.path);
    if (!response.ok) {
      throw new Error(`Failed to fetch book file: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new File([blob], book.name, { type: `application/${book.format.toLowerCase()}` });
  };

  handleChapterChange = async (chapterIndex: number) => {
    try {
      this.safeSetState({ isLoading: true, error: null });
      const { selectedBook } = this.state;
      
      if (!selectedBook) {
        throw new Error('No book selected');
      }

      // Get the file for the book
      const file = await this.getBookFile(selectedBook);
      const chapters = await this.textExtractor.extractFromFile(file, selectedBook);
      
      if (chapterIndex < 0 || chapterIndex >= chapters.length) {
        throw new Error(`Invalid chapter index: ${chapterIndex}`);
      }

      const chapter = chapters[chapterIndex];
      this.safeSetState({
        currentChapterIndex: chapterIndex,
        currentChapter: chapter.title,
        chapterText: chapter.text,
        words: chapter.text.split(/\s+/).filter(word => word.length > 0),
        currentWordIndex: 0,
        isLoading: false,
        isPlaying: false
      });

      this.addDebugInfo('info', `Changed to chapter: ${chapter.title} with ${chapter.text.split(/\s+/).filter(word => word.length > 0).length} words`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Error changing chapter:', error);
      this.addDebugInfo('error', `Failed to change chapter: ${error.message}`);
      this.safeSetState({
        error: `Failed to change chapter: ${error.message}`,
        isLoading: false
      });
    }
  };

  // Add a componentDidUpdate method to track important state changes
  componentDidUpdate(_prevProps: SpeedReaderPageProps, prevState: SpeedReaderPageState) {
    // Only log when important state properties change
    if (prevState.selectedBook !== this.state.selectedBook || 
        prevState.isLoading !== this.state.isLoading ||
        prevState.error !== this.state.error ||
        prevState.chapterText !== this.state.chapterText) {
      console.log('Important state update:', {
        hasSelectedBook: !!this.state.selectedBook,
        isLoading: this.state.isLoading,
        chapterText: this.state.chapterText.slice(0, 100) + '...',
        error: this.state.error
      });
    }
  }

  handleGlobalError = (event: ErrorEvent) => {
    this.addDebugInfo('Error', event.error?.message || 'Unknown error occurred');
  }

  addDebugInfo = (type: string, message: string) => {
    this.safeSetState(prevState => ({
      debugInfo: [
        {
          type,
          message,
          timestamp: Date.now()
        },
        ...prevState.debugInfo
      ].slice(0, 100) // Keep only last 100 messages
    }));
  };

  renderDebugPanel = () => {
    const { debugInfo } = this.state;
    if (!debugInfo || debugInfo.length === 0) return null;

    return (
      <div className="debug-panel">
        <h3>Debug Information</h3>
        <div className="debug-messages">
          {debugInfo.map((info, index) => (
            <div key={index} className={`debug-message ${info.type}`}>
              <span className="timestamp">{new Date(info.timestamp).toLocaleTimeString()}</span>
              <span className="type">[{info.type}]</span>
              <span className="message">{info.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  render() {
    const { 
      selectedBook, matrixColumns, isLoading, 
      currentChapterIndex, error, words, currentWordIndex, 
      isPlaying, wpm, progress, showCompletionAnim, chapters
    } = this.state;
    const { books } = this.props;

    const CompletionMessage = () => (
      <div className="completion-message">
        <div className="completion-title">
          CHAPTER COMPLETE
        </div>
        <div className="completion-subtitle">
          Brain Enhancement Protocol Activated
        </div>
      </div>
    );

    return (
      <div className="speed-reader-page">
        {/* Add debug panel at the top */}
        {this.renderDebugPanel()}
        {/* Matrix background effect */}
        <div className="matrix-background">
          {matrixColumns.map((column, i) => (
            <div
              key={i}
              className="matrix-column"
              style={{
                left: `${column.x}px`,
                animationDuration: `${20 / column.speed}s`,
                animationDelay: `-${Math.random() * 20}s`
              }}
            >
              {column.chars.join('')}
            </div>
          ))}
        </div>

        {/* Back button */}
        <div 
          className="back-button"
          onClick={() => this.handleBackToLibrary()}
        >
          <Trans>Back to Library</Trans>
        </div>

        {error && (
          <div className="error-message">
            <Trans>{error}</Trans>
          </div>
        )}

        {!selectedBook ? (
          <div className="book-selection-container">
            <h2 className="book-selection-title">
              <Trans>Select a Book for Speed Reading</Trans>
            </h2>
            <div className="book-grid">
              {books?.map((book) => (
                <div
                  key={book.key}
                  className="book-item"
                  onClick={() => this.handleBookSelect(book)}
                >
                  {!CoverUtil.isCoverExist(book) ? (
                    <div className="book-cover">
                      <EmptyCover
                        format={book.format}
                        title={book.name}
                        scale={1.14}
                      />
                    </div>
                  ) : (
                    <img
                      src={CoverUtil.getCover(book)}
                      alt={book.name}
                      className="book-cover"
                    />
                  )}
                  <div className="book-info">
                    <div className="book-title">{book.name}</div>
                    <div className="book-author">{book.author}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="speed-reader-content">
            <div className="chapter-navigation">
              <button 
                onClick={() => this.handleChapterChange(currentChapterIndex - 1)}
                disabled={currentChapterIndex <= 0 || isLoading}
                className="nav-button"
              >
                <Trans>Previous Chapter</Trans>
              </button>
              <span className="chapter-title">{this.state.currentChapter}</span>
              <button 
                onClick={() => this.handleChapterChange(currentChapterIndex + 1)}
                disabled={!selectedBook || currentChapterIndex >= books.length - 1 || isLoading}
                className="nav-button"
              >
                <Trans>Next Chapter</Trans>
              </button>
            </div>

            <div className="reader-controls">
              <button
                className="control-button"
                onClick={isPlaying ? this.pauseReading : this.startReading}
                disabled={isLoading || words.length === 0}
              >
                <Trans>{isPlaying ? 'Pause' : 'Start'}</Trans>
              </button>
              
              <div className="wpm-control">
                <label className="wpm-label"><Trans>WPM:</Trans></label>
                <input
                  type="number"
                  className="wpm-input"
                  value={wpm}
                  onChange={(e) => this.handleWpmChange(parseInt(e.target.value))}
                  min="100"
                  max="1000"
                />
              </div>

              <button
                className="control-button"
                onClick={this.handleReset}
                disabled={isLoading || words.length === 0}
              >
                <Trans>Reset</Trans>
              </button>
            </div>

            <div className="matrix-reader-display">
              <div className="progress-bar">
                <div className="progress-text">
                  {isLoading ? (
                    <Trans>Loading chapter...</Trans>
                  ) : (
                    <Trans>Progress: {progress}%</Trans>
                  )}
                </div>
                <div 
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="chapter-text-container">
                <textarea
                  className="chapter-text"
                  value={this.state.chapterText}
                  readOnly
                />
              </div>

              <div className="word-display">
                {showCompletionAnim ? (
                  <CompletionMessage />
                ) : (
                  <div className="current-word">
                    {isLoading ? "Loading..." : words[currentWordIndex] || ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="speed-reader-test-ui">
          <h2>Speed Reader Text Extractor Test</h2>
          
          {/* File Selection */}
          <div className="test-section">
            <h3>1. Select a File</h3>
            <input
              type="file"
              accept=".epub,.pdf"
              onChange={this.handleFileSelect}
              disabled={isLoading}
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="test-section">
              <h3>Loading...</h3>
              <p>Please wait while we extract the text from your file.</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="test-section error">
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          )}

          {/* Chapter Selection */}
          {chapters.length > 0 && (
            <div className="test-section">
              <h3>2. Select a Chapter</h3>
              <div className="chapter-list">
                {chapters.map((chapter, index) => (
                  <div
                    key={index}
                    className={`chapter-item ${index === currentChapterIndex ? 'active' : ''}`}
                    onClick={() => this.handleChapterChange(index)}
                  >
                    <h4>{chapter}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chapter Content Preview */}
          {chapters.length > 0 && (
            <div className="test-section">
              <h3>3. Chapter Content Preview</h3>
              <div className="chapter-preview">
                <h4>{chapters[currentChapterIndex]}</h4>
                <div className="text-preview">
                  {chapters[currentChapterIndex].split(/\s+/).slice(0, 50).join(' ')}...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  handleBackToLibrary = () => {
    if (this.state.isLoading || this.props.isLoading) {
      return;
    }

    if (this.loadingAbortController) {
      this.loadingAbortController.abort();
      this.loadingAbortController = null;
    }
    
    this.setState({
      selectedBook: null,
      currentChapter: "",
      chapterText: "",
      isLoading: false,
      error: null,
      words: [],
      currentWordIndex: 0,
      isPlaying: false,
      progress: 0,
      showCompletionAnim: false,
      chapters: [],
      debugInfo: []
    }, () => {
      if (this.props.setLoading) {
        this.props.setLoading(false);
      }
      this.props.history.push("/manager/home");
    });
  };
}

export default SpeedReaderPage; 