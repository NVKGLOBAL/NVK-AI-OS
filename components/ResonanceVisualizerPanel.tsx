
import React, { useEffect, useRef, useState } from 'react';
import type { ResonanceEffect } from '../types';

type ResonanceVisualizerPanelProps = {
  effects: ResonanceEffect[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClearEffects: () => void;
  // onJumpToGlyph?: (glyphId: string) => void; // Optional, not implemented in this pass
};

interface VisualParticle {
  id: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  angle: number;
  orbitRadius: number;
  rotationSpeed: number;
  pulseSpeed: number;
}

export const ResonanceVisualizerPanel: React.FC<ResonanceVisualizerPanelProps> = ({
  effects,
  isPlaying,
  onTogglePlay,
  onClearEffects,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [effectTypeFilter, setEffectTypeFilter] = useState<'ALL' | 'VISUAL' | 'MULTISENSORY'>('ALL');
  const [particles, setParticles] = useState<VisualParticle[]>([]);
  const [canvasSize, setCanvasSize] = useState({width: 0, height: 0});
  const resizeTimeoutRef = useRef<number | null>(null);

  const mousePos = useRef({ x: -1000, y: -1000 });
  const clickWave = useRef({ x: -1000, y: -1000, radius: 0, active: false, force: 0 });

  const updateCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mousePos.current = {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    clickWave.current = {
      x,
      y,
      radius: 5,
      active: true,
      force: 22,
    };
  };

  // Effect to update canvas DOM width/height attributes when canvasSize state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; 

    if (canvasSize.width > 0 && canvas.width !== canvasSize.width) {
      canvas.width = canvasSize.width;
    }
    if (canvasSize.height > 0 && canvas.height !== canvasSize.height) {
      canvas.height = canvasSize.height;
    }
  }, [canvasSize]);

  // Canvas resizing logic: ResizeObserver updates React state (canvasSize) with debouncing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(entries => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = window.setTimeout(() => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          
          const roundedWidth = Math.round(width);
          const roundedHeight = Math.round(height);
          
          setCanvasSize(prevSize => {
            if (roundedWidth > 0 && roundedHeight > 0) {
              if (prevSize.width !== roundedWidth || prevSize.height !== roundedHeight) {
                return { width: roundedWidth, height: roundedHeight };
              }
            }
            return prevSize; 
          });
        }
      }, 50); // Debounce time: 50ms
    });

    resizeObserver.observe(canvas);
    
    // Initial size set by observer firing once
    const initialRect = canvas.getBoundingClientRect();
    if(initialRect.width > 0 && initialRect.height > 0) {
        setCanvasSize({width: Math.round(initialRect.width), height: Math.round(initialRect.height)});
    }


    return () => {
      resizeObserver.unobserve(canvas);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []); 


  // Initialize and update particles when effects, filter, or canvasSize change
  useEffect(() => {
    if (canvasSize.width === 0 || canvasSize.height === 0) {
        setParticles([]); 
        return;
    }

    const filteredEffects = effects.filter(
      (e) => effectTypeFilter === 'ALL' || e.effectType === effectTypeFilter
    );

    setParticles(
      filteredEffects.map((effect, index) => {
        const x = (canvasSize.width / (filteredEffects.length + 1)) * (index + 1) + (Math.random() - 0.5) * Math.min(20, canvasSize.width * 0.05);
        const y = canvasSize.height / 2 + (Math.random() - 0.5) * Math.min(canvasSize.height * 0.3, canvasSize.height / 2 - 20);
        return {
          id: effect.id,
          x: x,
          y: y,
          baseX: x,
          baseY: y,
          vx: 0,
          vy: 0,
          radius: 5 + effect.intensity * 10,
          color: effect.colorProfile,
          opacity: 0.6 + effect.intensity * 0.4,
          angle: Math.random() * Math.PI * 2,
          orbitRadius: 5 + Math.random() * 15,
          rotationSpeed: (Math.random() - 0.5) * 0.002, 
          pulseSpeed: 0.001 + Math.random() * 0.002, 
        };
      })
    );
  }, [effects, effectTypeFilter, canvasSize]);


  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isPlaying || !canvas || !canvas.getContext('2d') || canvasSize.width === 0 || canvasSize.height === 0) {
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0,0, canvas.width, canvas.height);
            }
        }
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return; 

    let animationFrameId: number;
    let lastTime = performance.now(); 

    const render = (currentTime: number) => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;

      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);

      // Decp/expand click waves
      if (clickWave.current.active) {
        clickWave.current.radius += 8;
        clickWave.current.force *= 0.95;
        if (clickWave.current.radius > 250) {
          clickWave.current.active = false;
        }
      }

      particles.forEach((p) => {
        p.angle += p.rotationSpeed * deltaTime;
        const pulseFactor = 0.9 + Math.sin(p.angle * 2 + currentTime * p.pulseSpeed) * 0.1;
        const currentRadius = p.radius * pulseFactor;

        // Circular dynamic target orbit coordinate
        const targetX = p.baseX + Math.cos(p.angle) * p.orbitRadius;
        const targetY = p.baseY + Math.sin(p.angle) * p.orbitRadius;

        // Ensure positions are correct
        if (p.x === undefined || isNaN(p.x)) p.x = targetX;
        if (p.y === undefined || isNaN(p.y)) p.y = targetY;
        if (p.vx === undefined) p.vx = 0;
        if (p.vy === undefined) p.vy = 0;

        // 1. Spring Force snapping particles back to target orbit
        const k = 0.045; // stiffness
        const fSpringX = (targetX - p.x) * k;
        const fSpringY = (targetY - p.y) * k;
        p.vx += fSpringX;
        p.vy += fSpringY;

        // 2. Mouse / Touch Hover repulsion with quadratic falloff
        if (mousePos.current.x >= 0 && mousePos.current.y >= 0) {
          const dx = p.x - mousePos.current.x;
          const dy = p.y - mousePos.current.y;
          const dist = Math.hypot(dx, dy);
          const hoverRadius = 120;
          if (dist < hoverRadius && dist > 0) {
            const force = (hoverRadius - dist) / hoverRadius;
            const pushPattern = force * force * 5.5; // snappy displacement
            p.vx += (dx / dist) * pushPattern;
            p.vy += (dy / dist) * pushPattern;
          }
        }

        // 3. Click blastwave disruption
        if (clickWave.current.active) {
          const cdx = p.x - clickWave.current.x;
          const cdy = p.y - clickWave.current.y;
          const cdist = Math.hypot(cdx, cdy);
          if (cdist < clickWave.current.radius && cdist > 0) {
            const ratio = (clickWave.current.radius - cdist) / clickWave.current.radius;
            const blast = ratio * clickWave.current.force;
            p.vx += (cdx / cdist) * blast;
            p.vy += (cdy / cdist) * blast;
          }
        }

        // 4. Dampen speed with a drag coefficient, then update position
        p.vx *= 0.85; 
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;

        // Bounce outer boundary safety
        const pad = currentRadius + 5;
        if (p.x < pad) { p.x = pad; p.vx *= -0.5; }
        if (p.x > currentCanvas.width - pad) { p.x = currentCanvas.width - pad; p.vx *= -0.5; }
        if (p.y < pad) { p.y = pad; p.vy *= -0.5; }
        if (p.y > currentCanvas.height - pad) { p.y = currentCanvas.height - pad; p.vy *= -0.5; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(2, currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(2, currentRadius) + 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * 0.25; 
        ctx.filter = 'blur(6px)';
        ctx.fill();
        
        ctx.globalAlpha = 1;
        ctx.filter = 'none';
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [particles, isPlaying, canvasSize]); 

  return (
    <div className="resonance-visualizer-panel bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-6 h-[400px] flex flex-col">
      <div className="resonance-controls-panel flex items-center space-x-3 mb-4">
        <button
          onClick={onTogglePlay}
          className="rounded-button bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-sm transition flex items-center whitespace-nowrap"
          aria-label={isPlaying ? 'Pause visualization' : 'Play visualization'}
          aria-pressed={isPlaying}
        >
          <i className={`ri-${isPlaying ? 'pause' : 'play'}-line mr-2`}></i>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={onClearEffects}
          className="rounded-button bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-sm transition flex items-center whitespace-nowrap"
          aria-label="Clear all visualized effects"
        >
          <i className="ri-delete-bin-line mr-2"></i>Clear
        </button>
        <select
          value={effectTypeFilter}
          onChange={(e) => setEffectTypeFilter(e.target.value as 'ALL' | 'VISUAL' | 'MULTISENSORY')}
          className="rounded-button bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-sm transition focus:ring-primary focus:border-primary appearance-none"
          aria-label="Filter effects by type"
        >
          <option value="ALL">All Types</option>
          <option value="VISUAL">Visual</option>
          <option value="MULTISENSORY">Multisensory</option>
        </select>
      </div>
      <canvas
        ref={canvasRef}
        onMouseMove={(e) => {
          updateCoordinates(e.clientX, e.clientY);
        }}
        onMouseLeave={() => {
          mousePos.current = { x: -1000, y: -1000 };
        }}
        onMouseDown={(e) => {
          handlePointerDown(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
            handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={() => {
          mousePos.current = { x: -1000, y: -1000 };
        }}
        className="resonance-visualizer-canvas w-full flex-1 bg-slate-800/50 rounded-md border border-slate-700/50 shadow-inner min-h-[200px] cursor-pointer" 
        aria-label="Resonance effects visualization"
        role="img" 
      />
    </div>
  );
};
