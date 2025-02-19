import React from "react";
import "./speedReader.css";
import { SpeedReaderPageProps, SpeedReaderPageState } from "./interface";
import { Trans } from "react-i18next";
import EmptyCover from "../../components/emptyCover";
import CoverUtil from "../../utils/file/coverUtil";
import SpeedReader from "../../components/speedReader/component";
import Book from "../../models/Book";
import { StorageInspector } from '../../components/storageInspector/component';

class SpeedReaderPage extends React.Component<SpeedReaderPageProps, SpeedReaderPageState> {
  private mounted: boolean = false;

  constructor(props: SpeedReaderPageProps) {
    super(props);
    this.state = {
      selectedBook: null,
      currentChapter: "",
      currentChapterIndex: 0,
      isLoading: false,
      error: null,
      debugInfo: []
    };
  }

  componentDidMount() {
    console.log('[SpeedReader] Component mounted');
    this.mounted = true;
    if (this.props.setLoading) {
      this.props.setLoading(false);
    }
    window.addEventListener('error', this.handleGlobalError);
  }

  componentWillUnmount() {
    console.log('[SpeedReader] Component unmounting');
    this.mounted = false;
    window.removeEventListener('error', this.handleGlobalError);
  }

  safeSetState = (state: any, callback?: () => void) => {
    if (this.mounted) {
      this.setState(state, callback);
    }
  };

  handleBookSelect = async (book: Book) => {
    try {
      this.safeSetState({
        selectedBook: book,
        isLoading: false,
        error: null 
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Error selecting book:', error);
      this.safeSetState({
        error: `Failed to load book: ${error.message}`,
        isLoading: false
      });
    }
  };

  handleChapterChange = (title: string, index: number) => {
    this.safeSetState({
      currentChapter: title,
      currentChapterIndex: index
    });
  };

  handleGlobalError = (event: ErrorEvent) => {
    this.addDebugInfo('error', event.message);
  };

  addDebugInfo = (type: string, message: string) => {
    this.safeSetState(prevState => ({
      debugInfo: [
        ...prevState.debugInfo,
        { type, message, timestamp: new Date().toISOString() }
      ].slice(-50) // Keep last 50 messages
    }));
  };

  renderDebugPanel = () => {
    return (
      <div className="debug-panel">
        {this.state.debugInfo.map((info, index) => (
          <div key={index} className={`debug-item debug-${info.type}`}>
            <span className="debug-timestamp">{info.timestamp}</span>
            <span className="debug-message">{info.message}</span>
            </div>
          ))}
      </div>
    );
  };

  handleBackToLibrary = () => {
    this.props.handleReadingBook(false);
  };

  render() {
    const { selectedBook, error } = this.state;
    const { books } = this.props;

    return (
      <>
        <StorageInspector />
        <div className="speed-reader-page">
          {this.renderDebugPanel()}

          <div 
            className="back-button"
            onClick={this.handleBackToLibrary}
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
            <SpeedReader
              currentBook={selectedBook}
              handleCurrentChapter={(title: string, index: number) => this.handleChapterChange(title, index)}
            />
          )}
        </div>
      </>
    );
  }
}

export default SpeedReaderPage; 