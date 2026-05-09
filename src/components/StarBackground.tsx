import { useEffect, useRef } from 'react';

export const StarBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let stars: Star[] = [];
    const starCount = 150;
    let animationFrameId: number;

    class Star {
      x: number = 0;
      y: number = 0;
      size: number = 0;
      opacity: number = 0;
      fadeSpeed: number = 0;
      isFadingIn: boolean = true;
      maxOpacity: number = 0;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * (canvas?.width || window.innerWidth);
        this.y = Math.random() * (canvas?.height || window.innerHeight);
        this.size = Math.random() * 1.5;
        this.opacity = 0;
        this.fadeSpeed = Math.random() * 0.01 + 0.002;
        this.isFadingIn = true;
        this.maxOpacity = Math.random() * 0.8 + 0.2;
      }

      update() {
        if (this.isFadingIn) {
          this.opacity += this.fadeSpeed;
          if (this.opacity >= this.maxOpacity) {
            this.isFadingIn = false;
          }
        } else {
          this.opacity -= this.fadeSpeed;
          if (this.opacity <= 0) {
            this.reset();
          }
        }
      }

      draw(context: CanvasRenderingContext2D) {
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        context.fill();
      }
    }

    const init = () => {
      stars = [];
      for (let i = 0; i < starCount; i++) {
        const star = new Star();
        star.opacity = Math.random() * star.maxOpacity;
        star.isFadingIn = Math.random() > 0.5;
        stars.push(star);
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    const animate = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        star.update();
        star.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
      style={{ background: '#000000' }}
    />
  );
};
