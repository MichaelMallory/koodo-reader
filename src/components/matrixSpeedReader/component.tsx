import React from "react";
import "./matrixSpeedReader.css";
import { MatrixSpeedReaderProps, MatrixSpeedReaderState } from "./interface";

class MatrixSpeedReader extends React.Component<MatrixSpeedReaderProps, MatrixSpeedReaderState> {
  private canvasRef: React.RefObject<HTMLCanvasElement>;
  private animationFrameId: number | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(props: MatrixSpeedReaderProps) {
    super(props);
    this.canvasRef = React.createRef();
    this.state = {
      currentIndex: 0,
      isPlaying: false,
      wpm: 300,
      progress: 0,
      isComplete: false,
      canvasContext: null
    };
  }

  componentDidMount() {
    this.initializeCanvas();
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = () => {
    const canvas = this.canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  };

  initializeCanvas = () => {
    const canvas = this.canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    this.setState({ canvasContext: ctx });
    this.startMatrixRain();
  };

  startMatrixRain = () => {
    const canvas = this.canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chars = '日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789';
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = new Array(columns).fill(0);

    const centerY = canvas.height / 2;
    const fadeZoneHeight = canvas.height * 0.15;
    const fadeStart = centerY - fadeZoneHeight;
    const fadeEnd = centerY + fadeZoneHeight;

    const getOpacityAtY = (y: number) => {
      if (this.state.isComplete) return 1;
      if (y < fadeStart || y > fadeEnd) return 1;
      const distanceFromCenter = Math.abs(y - centerY);
      const fadeProgress = distanceFromCenter / fadeZoneHeight;
      return fadeProgress;
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        
        const opacity = getOpacityAtY(y);
        const speed = this.state.isComplete ? 2 : 1;
        
        ctx.fillStyle = `rgba(0, 255, 0, ${opacity})`;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, x, y);
        
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i] += speed;
        }
      }

      this.animationFrameId = requestAnimationFrame(draw);
    };

    draw();
  };

  togglePlayPause = () => {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  };

  play = () => {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.setState({ isPlaying: true }, () => {
      this.intervalId = setInterval(() => {
        this.setState(prevState => {
          if (prevState.currentIndex >= this.props.words.length - 1) {
            this.complete();
            return prevState;
          }

          const newIndex = prevState.currentIndex + 1;
          const progress = Math.min(100, Math.round((newIndex / (this.props.words.length - 1)) * 100));
          
          return {
            ...prevState,
            currentIndex: newIndex,
            progress
          };
        });
      }, (60 * 1000) / this.state.wpm);
    });
  };

  pause = () => {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.setState({ isPlaying: false });
  };

  complete = () => {
    this.pause();
    this.setState({ isComplete: true });
    if (this.props.onComplete) {
      this.props.onComplete();
    }
  };

  handleWpmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const wpm = Math.max(1, parseInt(event.target.value) || 1);
    this.setState({ wpm }, () => {
      if (this.state.isPlaying) {
        this.play(); // Restart with new WPM
      }
    });
  };

  handleExit = () => {
    this.pause();
    this.props.onClose();
  };

  render() {
    const { currentIndex, isPlaying, wpm, progress, isComplete } = this.state;
    const { words } = this.props;

    return (
      <div className="matrix-speed-reader">
        <canvas ref={this.canvasRef} className="matrix-canvas" />
        
        <div className="matrix-overlay">
          <div className="progress-bar">
            <div className="progress-text">
              {isComplete ? 'Download Complete' : `Downloading Knowledge... ${progress}%`}
            </div>
            <div className="progress-line" style={{ width: `${progress}%` }} />
          </div>

          <div className="word-display">
            {!isComplete && words[currentIndex]}
          </div>

          <div className="controls">
            <button onClick={this.togglePlayPause} disabled={isComplete}>
              {isPlaying ? 'Pause' : 'Start'}
            </button>
            
            <div className="wpm-control">
              <label>WPM:</label>
              <input
                type="number"
                value={wpm}
                onChange={this.handleWpmChange}
                min="1"
                max="1000"
              />
            </div>

            <button onClick={this.handleExit}>
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default MatrixSpeedReader; 