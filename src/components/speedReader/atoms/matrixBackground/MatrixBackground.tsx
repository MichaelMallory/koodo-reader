import React, { useEffect, useRef } from 'react';
import './MatrixBackground.css';

interface MatrixBackgroundProps {
  isCompleted?: boolean;
  centerFadeZone?: boolean;
}

const MatrixBackground: React.FC<MatrixBackgroundProps> = ({
  isCompleted = false,
  centerFadeZone = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      if (!canvas) return;
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

    const getOpacityAtY = (y: number): number => {
      if (!centerFadeZone || isCompleted) return 1;
      if (y < fadeStart || y > fadeEnd) return 1;
      const distanceFromCenter = Math.abs(y - centerY);
      const fadeProgress = distanceFromCenter / fadeZoneHeight;
      return fadeProgress;
    };

    const draw = () => {
      if (!canvas || !ctx) return;

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

    let animationId: number;
    const animate = () => {
      draw();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [isCompleted, centerFadeZone]);

  return (
    <canvas
      ref={canvasRef}
      className="matrix-background"
      aria-hidden="true"
    />
  );
};

export default MatrixBackground; 