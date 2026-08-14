
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { AshParticle } from '../../types';

const NUM_PARTICLES = 150;
const ASH_COLOR_BASE = [60, 60, 60]; // Dark grey for ash

const AshfallEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<AshParticle[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  const initializeParticle = useCallback((canvasWidth: number, canvasHeight: number, idSuffix: string | number): AshParticle => {
    return {
      id: `ash-${idSuffix}-${Date.now()}`,
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight - canvasHeight, // Start some off-screen from top
      size: Math.random() * 2 + 1, // 1px to 3px
      opacity: Math.random() * 0.5 + 0.1, // 0.1 to 0.6
      speedY: Math.random() * 0.8 + 0.4, // 0.4 to 1.2
      swayAngle: Math.random() * Math.PI * 2,
      swaySpeed: (Math.random() - 0.5) * 0.02 + 0.01, // 0.005 to 0.015, can be negative
      swayAmplitude: Math.random() * 10 + 5, // 5 to 15
      initialSpeedX: (Math.random() - 0.5) * 0.4, // -0.2 to 0.2
    };
  }, []);
  
  // Initialize particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return; // Wait for canvas to have dimensions

    const initialParticles = Array.from({ length: NUM_PARTICLES }, (_, i) =>
      initializeParticle(width, height, i)
    );
    setParticles(initialParticles);
  }, [initializeParticle]);

  const mousePosRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mousePosRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        mousePosRef.current = {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
    };

    const handleMouseLeave = () => {
      mousePosRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('touchend', handleMouseLeave, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchend', handleMouseLeave);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || particles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!canvasRef.current) return; // Ensure canvas still exists
      const currentCanvas = canvasRef.current;
      ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);

      particles.forEach(p => {
        p.y += p.speedY;
        p.swayAngle += p.swaySpeed;
        const currentSway = Math.sin(p.swayAngle) * p.swayAmplitude;
        
        p.x += p.initialSpeedX + currentSway;

        // Custom pointer interaction flow representing a localized draft of air pushing ash
        if (mousePosRef.current.x >= 0 && mousePosRef.current.y >= 0) {
          const dx = p.x - mousePosRef.current.x;
          const dy = p.y - mousePosRef.current.y;
          const dist = Math.hypot(dx, dy);
          const repelRadius = 120;
          if (dist < repelRadius && dist > 0) {
            const force = (repelRadius - dist) / repelRadius;
            const pushX = (dx / dist) * force * force * 5.0;
            const pushY = (dy / dist) * force * force * 2.5; 
            p.x += pushX;
            p.y += pushY;
          }
        }

        // Boundary checks and reset
        if (p.y > currentCanvas.height + p.size) {
          p.y = -p.size;
          p.x = Math.random() * currentCanvas.width;
          // Optionally re-randomize other properties for variation
          p.size = Math.random() * 2 + 1;
          p.opacity = Math.random() * 0.5 + 0.1;
          p.speedY = Math.random() * 0.8 + 0.4;
        }
        if (p.x > currentCanvas.width + p.size) {
          p.x = -p.size;
        } else if (p.x < -p.size) {
          p.x = currentCanvas.width + p.size;
        }

        ctx.fillStyle = `rgba(${ASH_COLOR_BASE[0]}, ${ASH_COLOR_BASE[1]}, ${ASH_COLOR_BASE[2]}, ${p.opacity})`;
        ctx.beginPath();
        // Simple irregular shape: a main circle with a smaller offset one
        ctx.arc(p.x, p.y, Math.max(0, p.size), 0, Math.PI * 2);
        ctx.fill();

        // Add a smaller, slightly offset dot for irregularity
        if (p.size > 1.5) {
            ctx.beginPath();
            ctx.arc(p.x + p.size * 0.3 * Math.cos(p.swayAngle*2), p.y + p.size * 0.3 * Math.sin(p.swayAngle*2) , Math.max(0, p.size * 0.6), 0, Math.PI * 2);
            ctx.fill();
        }

      });
      animationFrameIdRef.current = requestAnimationFrame(draw);
    };

    animationFrameIdRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [particles]);

  // Canvas resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
          // Optionally re-initialize particles if strategy requires it,
          // but current particle reset logic should handle most resizes.
           setParticles(prevParticles => prevParticles.map(p => ({
             ...p,
             x: (p.x / (canvasRef.current?.width || width)) * width, // Scale x
             y: (p.y / (canvasRef.current?.height || height)) * height // Scale y
           })));
        }
      }
    });

    resizeObserver.observe(parent);
    // Set initial size
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    
    return () => resizeObserver.unobserve(parent);
  }, []);


  return (
    <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full"
        aria-hidden="true" 
    />
  );
};

export default AshfallEffect;
