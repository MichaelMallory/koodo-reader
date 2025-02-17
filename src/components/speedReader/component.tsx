import React from "react";
import "./speedReader.css";
import { SpeedReaderProps, SpeedReaderState } from "./interface";
import { WithTranslation } from "react-i18next";
import MatrixBackground from "./atoms/matrixBackground/MatrixBackground";
import WordDisplay from "./atoms/wordDisplay/WordDisplay";
import SpeedControls from "./atoms/controls/SpeedControls";
import ProgressBar from "./atoms/progressBar/ProgressBar";

class SpeedReader extends React.Component<SpeedReaderProps & WithTranslation, SpeedReaderState> {
  private wordTimer: NodeJS.Timeout | null = null;

  constructor(props: SpeedReaderProps & WithTranslation) {
    super(props);
    this.state = {
      currentWord: "Hello",
      currentIndex: 0,
      isPlaying: false,
      isCompleted: false,
      wpm: 300,
      words: ["Hello", "World", "This", "Is", "A", "Test"], // Temporary test words
      progress: 0
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyPress);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyPress);
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
    }
  }

  handleKeyPress = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.handlePlayPause();
        break;
      case 'ArrowLeft':
        this.handlePreviousWord();
        break;
      case 'ArrowRight':
        this.handleNextWord();
        break;
      case 'ArrowUp':
        this.handleWpmChange(this.state.wpm + 10);
        break;
      case 'ArrowDown':
        this.handleWpmChange(this.state.wpm - 10);
        break;
    }
  };

  handlePlayPause = () => {
    if (this.state.isPlaying) {
      if (this.wordTimer) {
        clearInterval(this.wordTimer);
        this.wordTimer = null;
      }
    } else {
      this.startReading();
    }
    this.setState(prevState => ({
      currentWord: prevState.currentWord,
      currentIndex: prevState.currentIndex,
      isPlaying: !prevState.isPlaying,
      isCompleted: prevState.isCompleted,
      wpm: prevState.wpm,
      words: prevState.words,
      progress: prevState.progress
    }));
  };

  startReading = () => {
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
    }
    
    this.wordTimer = setInterval(() => {
      this.handleNextWord();
    }, (60 * 1000) / this.state.wpm);
  };

  handleNextWord = () => {
    this.setState(prevState => {
      const nextIndex = prevState.currentIndex + 1;
      if (nextIndex >= prevState.words.length) {
        if (this.wordTimer) {
          clearInterval(this.wordTimer);
          this.wordTimer = null;
        }
        return {
          currentWord: prevState.currentWord,
          currentIndex: prevState.currentIndex,
          isPlaying: false,
          isCompleted: true,
          wpm: prevState.wpm,
          words: prevState.words,
          progress: 100
        };
      }
      
      return {
        currentWord: prevState.words[nextIndex],
        currentIndex: nextIndex,
        isPlaying: prevState.isPlaying,
        isCompleted: prevState.isCompleted,
        wpm: prevState.wpm,
        words: prevState.words,
        progress: (nextIndex / (prevState.words.length - 1)) * 100
      };
    });
  };

  handlePreviousWord = () => {
    this.setState(prevState => {
      const prevIndex = Math.max(0, prevState.currentIndex - 1);
      return {
        currentWord: prevState.words[prevIndex],
        currentIndex: prevIndex,
        isPlaying: prevState.isPlaying,
        isCompleted: prevState.isCompleted,
        wpm: prevState.wpm,
        words: prevState.words,
        progress: (prevIndex / (prevState.words.length - 1)) * 100
      };
    });
  };

  handleWpmChange = (newWpm: number) => {
    this.setState({ wpm: newWpm }, () => {
      if (this.state.isPlaying) {
        this.startReading(); // Restart with new WPM
      }
    });
  };

  handleReset = () => {
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
      this.wordTimer = null;
    }
    this.setState({
      currentIndex: 0,
      currentWord: this.state.words[0],
      isPlaying: false,
      isCompleted: false,
      progress: 0
    });
  };

  render(): React.ReactNode {
    const { 
      currentWord,
      isCompleted,
      isPlaying,
      wpm,
      words,
      progress,
      currentIndex
    } = this.state;
    
    return (
      <div className="speed-reader-container">
        <MatrixBackground
          isCompleted={isCompleted}
          centerFadeZone={true}
        />
        <SpeedControls
          wpm={wpm}
          isPlaying={isPlaying}
          onWpmChange={this.handleWpmChange}
          onPlayPause={this.handlePlayPause}
          onReset={this.handleReset}
        />
        <WordDisplay
          word={currentWord}
          isVisible={true}
          isCompleted={isCompleted}
        />
        <ProgressBar
          progress={progress}
          totalWords={words.length}
          currentWord={currentIndex + 1}
        />
      </div>
    );
  }
}

export default SpeedReader; 