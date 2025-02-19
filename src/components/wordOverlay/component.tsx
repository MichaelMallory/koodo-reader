import React from "react";
import "./wordOverlay.css";
import { WordOverlayProps, WordOverlayState } from "./interface";

class WordOverlay extends React.Component<WordOverlayProps, WordOverlayState> {
  constructor(props: WordOverlayProps) {
    super(props);
    this.state = {
      words: [],
      isVisible: true
    };
  }

  componentDidMount() {
    this.updateWords();
    // Listen for page changes
    if (this.props.rendition) {
      this.props.rendition.on("rendered", this.updateWords);
    }
  }

  componentWillUnmount() {
    if (this.props.rendition) {
      this.props.rendition.off("rendered", this.updateWords);
    }
  }

  updateWords = async () => {
    if (!this.props.rendition) {
      console.log("[WordOverlay] No rendition available");
      return;
    }

    try {
      // Get the iframe document
      const iframe = document.querySelector("#page-area iframe") as HTMLIFrameElement;
      if (!iframe || !iframe.contentDocument) {
        console.log("[WordOverlay] No iframe found");
        return;
      }

      let text = '';
      
      // Get all text from the current chapter for all reading modes
      const chapterContent = iframe.contentDocument.body;
      if (chapterContent) {
        // Create a clone to avoid modifying the actual DOM
        const clone = chapterContent.cloneNode(true) as HTMLElement;
        
        // Remove any script, style, and hidden elements
        const elementsToRemove = clone.querySelectorAll('script, style, [style*="display: none"], [style*="visibility: hidden"]');
        elementsToRemove.forEach(el => el.parentNode?.removeChild(el));
        
        text = clone.textContent || '';
      }

      console.log("[WordOverlay] Raw text:", text.slice(0, 100) + "...");

      // Process the text into words
      const words = text
        .split(/\s+/)
        .map(word => word.trim())
        .filter(word => {
          if (!word || word.length === 0) return false;
          if (/^[.,!?;:"'()[\]{}]+$/.test(word)) return false;
          return true;
        })
        .map(word => word.replace(/^[.,!?;:"'()[\]{}]+|[.,!?;:"'()[\]{}]+$/g, ''))
        .filter(word => word.length > 0);

      console.log("[WordOverlay] Processed words:", {
        total: words.length,
        sample: words.slice(0, 10)
      });

      this.setState({ words });
    } catch (error) {
      console.error("[WordOverlay] Error updating words:", error);
      this.setState({ words: [] });
    }
  };

  toggleVisibility = () => {
    this.setState(prevState => ({ isVisible: !prevState.isVisible }));
  };

  render() {
    const { isVisible, words } = this.state;

    if (!isVisible) {
      return (
        <div className="word-overlay-toggle" onClick={this.toggleVisibility}>
          <span className="icon-grid"></span>
        </div>
      );
    }

    return (
      <div className="word-overlay-container">
        <div className="word-overlay-header">
          <span>Chapter Words ({words.length})</span>
          <span className="word-overlay-close" onClick={this.toggleVisibility}>×</span>
        </div>
        <div className="word-overlay-content">
          {words.length > 0 ? (
            words.map((word, index) => (
              <span key={index} className="word-overlay-word">{word}</span>
            ))
          ) : (
            <span className="word-overlay-empty">No words found in current chapter</span>
          )}
        </div>
      </div>
    );
  }
}

export default WordOverlay; 