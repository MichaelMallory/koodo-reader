import React, { useState, useEffect, useRef } from 'react';

const MatrixRainReader = () => {
  const [text, setText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(250);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionAnim, setShowCompletionAnim] = useState(false);
  const canvasRef = useRef(null);
  
  const defaultText = `The human brain is remarkable in its capacity to process information. 
    Through practice and proper techniques, we can significantly enhance our reading speed and comprehension. 
    Speed reading is not just about moving faster through text, but about optimizing our cognitive processes.`;
  
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const progress = Math.min(100, Math.round((currentIndex / Math.max(1, words.length - 1)) * 100));

  // Matrix rain effect (same as before)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const chars = '日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789';
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = new Array(columns).fill(0);
    
    const centerY = canvas.height / 2;
    const fadeZoneHeight = canvas.height * 0.15;
    const fadeStart = centerY - fadeZoneHeight;
    const fadeEnd = centerY + fadeZoneHeight;

    const getOpacityAtY = (y) => {
      if (isCompleted) return 1; // Full opacity when completed
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
        const speed = isCompleted ? 2 : 1; // Faster rain when completed
        
        ctx.fillStyle = `rgba(0, 255, 0, ${opacity})`;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, x, y);
        
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i] += speed;
        }
      }
    };

    let animationId;
    const animate = () => {
      draw();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [isCompleted]);

  useEffect(() => {
    let interval;
    if (isPlaying && currentIndex < words.length - 1) {
      interval = setInterval(() => {
        if (currentIndex === words.length - 2) {
          setIsPlaying(false);
          setIsCompleted(true);
          setShowCompletionAnim(true);
          setTimeout(() => setShowCompletionAnim(false), 2000);
        }
        setCurrentIndex(prev => prev + 1);
      }, (60 * 1000) / speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, words.length, currentIndex]);

  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
    setIsCompleted(false);
    setShowCompletionAnim(false);
  };

  const CompletionMessage = () => (
    <div className="text-center">
      <div 
        className="text-4xl font-bold mb-2"
        style={{
          animation: 'glitch 1s infinite',
          textShadow: '0 0 10px #0f0, 0 0 20px #0f0, 0 0 30px #0f0',
        }}
      >
        DOWNLOAD COMPLETE
      </div>
      <div 
        className="text-xl"
        style={{
          animation: 'fadeIn 0.5s',
          textShadow: '0 0 5px #0f0',
        }}
      >
        Brain Enhancement Protocol Activated
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-black text-green-400 rounded-lg shadow-lg">
      <div className="mb-6">
        <textarea
          className="w-full p-2 bg-gray-900 text-green-400 border border-green-500 rounded"
          rows="4"
          placeholder="Paste your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-2 mt-2">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={() => setText(defaultText)}
          >
            Load Sample Text
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>
      
      <div className="flex gap-4 mb-6">
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={isCompleted}
        >
          {isPlaying ? 'Pause' : 'Start'}
        </button>
        <div className="flex items-center gap-2">
          <label className="text-green-400">WPM:</label>
          <input
            type="number"
            className="w-20 p-1 bg-gray-900 text-green-400 border border-green-500 rounded"
            value={speed}
            onChange={(e) => setSpeed(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
      </div>
      
      <div className="relative h-96 bg-black border border-green-500 rounded overflow-hidden">
        <div className="absolute top-0 left-0 w-full z-10 p-4 bg-black bg-opacity-50">
          <div 
            className="text-lg font-bold mb-2"
            style={{
              animation: isCompleted ? 'none' : 'pulse 2s infinite',
              textShadow: '0 0 10px rgba(0,255,0,0.7)',
            }}
          >
            {isCompleted ? 'Download Complete' : `Downloading Brainlift... ${progress}%`}
          </div>
          <div 
            className="h-0.5 bg-green-500 transition-all duration-300"
            style={{ 
              width: `${progress}%`,
              boxShadow: '0 0 10px rgba(0,255,0,0.7), 0 0 5px #fff'
            }}
          />
        </div>

        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
        />
        <div 
          className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
          style={{
            background: isCompleted ? 'none' : 'radial-gradient(circle at center, rgba(0,0,0,0.8) 10%, transparent 40%)'
          }}
        >
          {showCompletionAnim ? (
            <div className="animate-matrix-complete">
              <CompletionMessage />
            </div>
          ) : (
            <div 
              className="text-4xl font-bold text-green-400"
              style={{
                textShadow: '0 0 10px rgba(0,255,0,0.5)',
                opacity: !isCompleted && words[currentIndex] ? 1 : 0,
                transition: 'opacity 0.2s ease-in-out'
              }}
            >
              {isCompleted ? '' : words[currentIndex] || ''}
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes glitch {
          0% { transform: translate(0) }
          20% { transform: translate(-2px, 2px) }
          40% { transform: translate(-2px, -2px) }
          60% { transform: translate(2px, 2px) }
          80% { transform: translate(2px, -2px) }
          100% { transform: translate(0) }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-matrix-complete {
          animation: fadeIn 0.5s;
        }
      `}</style>
    </div>
  );
};

export default MatrixRainReader;
