
import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { AxiomPulseEngine } from '../../lib/tesseract/ResonantAxiomProjector';
import { TesseractRenderer } from '../../lib/tesseract/TesseractRenderer';
import { usePanelState } from '../../hooks/usePanelState';
import type { VisualizationMatrixPanelProps as ExternalProps, Particle } from '../../types';
import { VisualizationMatrixMode } from '../../types';
import ModeSelector from '../core/ModeSelector'; 

const TESSERACT_EDGES = [
  [0, 1], [0, 2], [0, 4], [0, 8], [1, 3], [1, 5], [1, 9], [2, 3], [2, 6], [2, 10],
  [3, 7], [3, 11], [4, 5], [4, 6], [4, 12], [5, 7], [5, 13], [6, 7], [6, 14],
  [7, 15], [8, 9], [8, 10], [8, 12], [9, 11], [9, 13], [10, 11], [10, 14],
  [11, 15], [12, 13], [12, 14], [13, 15], [14, 15]
];

interface CommonDrawParams {
  ctx: CanvasRenderingContext2D;
  projected3DVertices: number[][]; 
  colors: number[][]; 
  temporalFactor: number; 
  perspectiveScale: number;
  axiomField: { strength: number; warpType: string; };
  deltaPhase: number; 
  frameCount: number;
  width: number; // Actual canvas width
  height: number; // Actual canvas height
  effectiveEntropy: number; 
  timeDilation: number; 
  projectTo2D: (v3D: number[], perspectiveScale: number) => number[];
  particlesRef: React.MutableRefObject<Particle[]>;
  drawFractalBranch: (
    ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, depth: number, maxDepth: number, color: string
  ) => void;
  resonanceTuning: number; 
}


const VisualizationMatrixPanel: React.FC<ExternalProps> = ({
  width: propWidth = 600, 
  height: propHeight = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    currentMode, 
    resonanceTuning, 
    timeDilation, 
    effectiveEntropy, 
    panelStateSetters 
  } = usePanelState(); 
  const particlesRef = useRef<Particle[]>([]);

  const axiomPulser = useMemo(() => new AxiomPulseEngine(), []);
  const tesseractRenderer = useMemo(() => new TesseractRenderer(), []);

  // Determine actual canvas size to be square, based on the smaller of width/height props
  const canvasSize = useMemo(() => Math.min(propWidth, propHeight), [propWidth, propHeight]);

  useEffect(() => {
    axiomPulser.setResonanceLevel(resonanceTuning);
  }, [resonanceTuning, axiomPulser]);

  const handleModeChange = (newMode: VisualizationMatrixMode) => {
    panelStateSetters.setCurrentMode(newMode);
    particlesRef.current = []; 
  };
  
  const projectTo2D = useCallback((v3D: number[], currentPerspectiveScale: number) => {
    const z_offset = 3 + effectiveEntropy * 1.5; 
    const perspectiveDivisor = z_offset - v3D[2];
    const pFactor = perspectiveDivisor !== 0 ? currentPerspectiveScale / perspectiveDivisor : currentPerspectiveScale * 1000; 

    // Uses canvasSize for centering, as canvas is now square
    return [
      canvasSize / 2 + v3D[0] * pFactor,
      canvasSize / 2 + v3D[1] * pFactor
    ];
  }, [canvasSize, effectiveEntropy]);

  const drawFractalBranch = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number, y: number, angle: number, length: number, depth: number, maxDepth: number, color: string
  ) => {
    if (depth > maxDepth || length < (1 - effectiveEntropy * 0.8)) return;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.3, (maxDepth - depth + 1) * 0.3 * (1 - effectiveEntropy * 0.7 + Math.random() * effectiveEntropy * 0.4));
    ctx.stroke();

    const branches = 2 + Math.floor(effectiveEntropy * 3);
    const angleSpread = (Math.PI / (2.5 + depth - effectiveEntropy)) * (1 + effectiveEntropy * 0.8);
    for (let i = 0; i < branches; i++) {
        drawFractalBranch(ctx, endX, endY, angle + (i - (branches - 1) / 2) * angleSpread * (1 + (Math.random()-0.5)*effectiveEntropy*0.5), length * (0.6 - effectiveEntropy * 0.2), depth + 1, maxDepth, color);
    }
  }, [effectiveEntropy]);

  // --- START MODE-SPECIFIC DRAW FUNCTIONS ---
  const drawSacredLattice = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, colors, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, projectTo2D } = params;
    ctx.lineWidth = 0.5 + effectiveEntropy * 1.5 + Math.sin(deltaPhase*0.5) * effectiveEntropy * 0.5;
    TESSERACT_EDGES.forEach(([i1, i2]) => {
      const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
      if (!v1 || !v2) return;
      const [x1, y1] = projectTo2D(v1, perspectiveScale); const [x2, y2] = projectTo2D(v2, perspectiveScale);
      const color = colors[i1];
      const alpha = Math.max(0.05, (color[3] !== undefined ? color[3] : 1) * (1 - effectiveEntropy * 0.8) * (0.4 + axiomField.strength * 0.6) * (0.4 + params.temporalFactor * 0.6));
      const hue = (200 + axiomField.strength * 60 + effectiveEntropy * 90) % 360;
      ctx.strokeStyle = `hsla(${hue}, 70%, ${60 + effectiveEntropy * 15}%, ${alpha})`;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
  }, [projectTo2D]); 

  const drawDimensionalBloom = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, colors, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, projectTo2D } = params;
    projected3DVertices.forEach((v3D, i) => {
      const [px, py] = projectTo2D(v3D, perspectiveScale);
      const pulseSize = (3 + effectiveEntropy * 7 + Math.sin(deltaPhase * (2 + effectiveEntropy*2) + i * 0.5) * (2 + effectiveEntropy*4)) * (1 + axiomField.strength*0.5) ;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.5, pulseSize), 0, Math.PI * 2); // Guarded by Math.max
      const hue = (colors[i][0] * 120 + effectiveEntropy * 90) % 360; 
      ctx.fillStyle = `hsla(${hue}, ${80 + effectiveEntropy*10}%, ${65 + effectiveEntropy*10}%, ${0.4 + params.temporalFactor * 0.4 - effectiveEntropy*0.1})`;
      ctx.fill();
    });
  }, [projectTo2D]);

  const drawEntropyPulse = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, deltaPhase, effectiveEntropy, projectTo2D, frameCount } = params;
    ctx.lineWidth = 0.5 + effectiveEntropy * 6;
    TESSERACT_EDGES.forEach(([i1, i2]) => {
      const v1 = projected3DVertices[i1];
      const v2 = projected3DVertices[i2];
      if (!v1 || !v2) return;
      const jitterX1 = (Math.random() - 0.5) * effectiveEntropy * 15;
      const jitterY1 = (Math.random() - 0.5) * effectiveEntropy * 15;
      const jitterX2 = (Math.random() - 0.5) * effectiveEntropy * 15;
      const jitterY2 = (Math.random() - 0.5) * effectiveEntropy * 15;
      const [x1, y1] = projectTo2D(v1, perspectiveScale * (1 + Math.sin(deltaPhase + i1*0.2) * effectiveEntropy * 0.3));
      const [x2, y2] = projectTo2D(v2, perspectiveScale * (1 + Math.sin(deltaPhase + i2*0.2) * effectiveEntropy * 0.3));
      
      const hue = (frameCount*2 + effectiveEntropy * 360 + Math.sin(deltaPhase + i1*0.5)*60) % 360;
      const alpha = Math.max(0.05, 0.9 - effectiveEntropy * 0.8 + Math.random()*effectiveEntropy*0.2);
      ctx.strokeStyle = `hsla(${hue}, 95%, ${60 + Math.random()*20}%, ${alpha})`;
      ctx.beginPath(); ctx.moveTo(x1 + jitterX1, y1 + jitterY1); ctx.lineTo(x2 + jitterX2, y2 + jitterY2); ctx.stroke();
    });
  }, [projectTo2D]);
  
  const drawFractalCascade = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, projectTo2D } = params;
    TESSERACT_EDGES.forEach(([i1, i2]) => { 
        const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
        if (!v1 || !v2) return;
        const [x1, y1] = projectTo2D(v1, perspectiveScale); const [x2, y2] = projectTo2D(v2, perspectiveScale);
        ctx.strokeStyle = `hsla(200, 70%, 50%, ${0.1 - effectiveEntropy * 0.08})`;
        ctx.lineWidth = 0.3;
        if(effectiveEntropy < 0.9) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    });
    projected3DVertices.forEach((v3D, i) => {
        const [px, py] = projectTo2D(v3D, perspectiveScale);
        const angle = Math.atan2(v3D[1], v3D[0]) + deltaPhase * (0.5 + effectiveEntropy);
        const length = (10 + axiomField.strength * 25) * (1 - effectiveEntropy*0.7);
        const maxDepth = 1 + Math.floor(axiomField.strength * 2 + effectiveEntropy * 3);
        const hue = (240 + i * 15 + effectiveEntropy * 60) % 360;
        drawFractalBranch(ctx, px, py, angle, length, 0, maxDepth, `hsla(${hue}, ${70 + effectiveEntropy*10}%, ${60 + effectiveEntropy*10}%, ${0.5 - effectiveEntropy * 0.35})`);
    });
  }, [projectTo2D, drawFractalBranch]);

  const drawAxiomaticOverlay = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, projectTo2D, frameCount, width: currentCanvasWidth, height: currentCanvasHeight } = params;
    TESSERACT_EDGES.forEach(([i1, i2]) => {
        const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
        if (!v1 || !v2) return;
        const [x1, y1] = projectTo2D(v1, perspectiveScale); const [x2, y2] = projectTo2D(v2, perspectiveScale);
        const overlayHue = (axiomField.strength * 360 + effectiveEntropy * 180 + frameCount) % 360;
        ctx.strokeStyle = `hsla(${overlayHue}, ${80 + effectiveEntropy*10}%, ${55 + Math.sin(deltaPhase*(2+effectiveEntropy))*15}%, ${0.25 + axiomField.strength * 0.5 + effectiveEntropy*0.1})`;
        ctx.lineWidth = 0.8 + axiomField.strength * 2.5 + effectiveEntropy * 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    ctx.font = `${15 + axiomField.strength * 25 + effectiveEntropy*15}px Cinzel`;
    ctx.fillStyle = `hsla(${(axiomField.strength * 360)%360}, 70%, 80%, ${0.05 + axiomField.strength * 0.2 + effectiveEntropy*0.1})`;
    ctx.textAlign = 'center';
    ctx.fillText("Ω", currentCanvasWidth/2, currentCanvasHeight/2 + 10);
  }, [projectTo2D]);
  
  const drawAethericFlow = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, axiomField, effectiveEntropy, timeDilation, projectTo2D, particlesRef, frameCount } = params;
    if (frameCount % (Math.max(1, 4 - Math.floor(effectiveEntropy*3))) === 0 && particlesRef.current.filter(p=>p.type==='generic_flow').length < (100 + effectiveEntropy*150) ) {
      const edgeIndex = Math.floor(Math.random() * TESSERACT_EDGES.length);
      const [startIdx, endIdx] = TESSERACT_EDGES[edgeIndex];
      const startNode = projected3DVertices[startIdx];
      if (startNode && projected3DVertices[endIdx]) { 
        particlesRef.current.push({
          x: startNode[0], y: startNode[1], z: startNode[2],
          vx: (projected3DVertices[endIdx][0] - startNode[0]) * (0.02 + effectiveEntropy*0.03),
          vy: (projected3DVertices[endIdx][1] - startNode[1]) * (0.02 + effectiveEntropy*0.03),
          vz: (projected3DVertices[endIdx][2] - startNode[2]) * (0.02 + effectiveEntropy*0.03),
          life: 40 + Math.random() * 60 * (1 - effectiveEntropy*0.5),
          baseLife: 40 + Math.random() * 60 * (1 - effectiveEntropy*0.5),
          color: `hsla(${(180 + axiomField.strength * 100 + effectiveEntropy * 90)%360}, 90%, 70%, 0.9)`,
          history: [], type: 'generic_flow',
          size: 1 + Math.random() * (1 + effectiveEntropy), // Added size
        });
      }
    }
    particlesRef.current.forEach(p => {
      if (p.type === 'generic_flow') {
        p.x += p.vx * timeDilation * (1 + effectiveEntropy); p.y += p.vy * timeDilation * (1 + effectiveEntropy); p.z += p.vz * timeDilation * (1 + effectiveEntropy);
        p.life -= timeDilation;
        const [px, py] = projectTo2D([p.x, p.y, p.z], perspectiveScale);
        p.history.push({x: px, y: py});
        if(p.history.length > (5 + effectiveEntropy*10)) p.history.shift();

        ctx.beginPath();
        const radius = Math.max(0.1, (p.size || 1) * (p.life / (p.baseLife || 100)) * (1 + effectiveEntropy*0.5));
        ctx.arc(px, py, Math.max(0, radius), 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `,${p.life/(p.baseLife || 100) * 0.9})`);
        ctx.fill();
        
        ctx.beginPath();
        if(p.history.length > 1) ctx.moveTo(p.history[0].x, p.history[0].y);
        for(let k=1; k<p.history.length; k++) ctx.lineTo(p.history[k].x, p.history[k].y);
        ctx.strokeStyle = p.color.replace(/,([\d.]+)\)/, `,${p.life/(p.baseLife || 100) * 0.4})`);
        ctx.lineWidth = 0.3 + effectiveEntropy*0.5;
        ctx.stroke();
      }
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  }, [projectTo2D]);

  const drawGlyphicResonance = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, projectTo2D } = params;
     TESSERACT_EDGES.forEach(([i1, i2]) => {
        const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
        if (!v1 || !v2) return;
        const [x1, y1] = projectTo2D(v1, perspectiveScale); const [x2, y2] = projectTo2D(v2, perspectiveScale);
        const resonanceFactor = 0.5 + Math.sin(deltaPhase * (3 + effectiveEntropy*2) + i1 * 0.3 + axiomField.strength * 7) * 0.5;
        ctx.lineWidth = 0.8 + resonanceFactor * 2.5 * (1 - effectiveEntropy * 0.6);
        const hue = (150 + axiomField.strength * 120 + resonanceFactor * 90 + Math.random()*effectiveEntropy*30) % 360;
        ctx.strokeStyle = `hsla(${hue}, ${90+effectiveEntropy*5}%, ${60 + resonanceFactor * 20}%, ${0.45 + resonanceFactor * 0.4 - effectiveEntropy*0.1})`;
        ctx.shadowColor = `hsla(${hue}, 90%, 70%, ${0.15 + resonanceFactor * 0.25 + effectiveEntropy*0.1})`;
        ctx.shadowBlur = 4 + resonanceFactor * 6 + effectiveEntropy*3;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  }, [projectTo2D]);

  const drawVoidEcho = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, timeDilation, projectTo2D, particlesRef, frameCount, width: currentCanvasWidth, height: currentCanvasHeight } = params;
    ctx.lineWidth = Math.max(0.1, 0.8 - effectiveEntropy * 0.7);
    TESSERACT_EDGES.forEach(([i1, i2]) => {
      if (Math.random() < effectiveEntropy * (0.25 + axiomField.strength*0.1) ) return; 
      const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
      if (!v1 || !v2) return;
      const [x1, y1] = projectTo2D(v1, perspectiveScale * (1 - effectiveEntropy*0.15));
      const [x2, y2] = projectTo2D(v2, perspectiveScale * (1 - effectiveEntropy*0.15));
      const alpha = 0.15 - effectiveEntropy * 0.12 + Math.sin(deltaPhase*1.5 + i1*0.5) * 0.08;
      ctx.strokeStyle = `hsla(220, 20%, ${25 + Math.random()*25}%, ${Math.max(0.01, alpha)})`;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    if(effectiveEntropy > 0.3 && frameCount % Math.max(1, 10 - Math.floor(effectiveEntropy*8)) === 0 && particlesRef.current.filter(p=>p.type==='void_flicker').length < 80 + effectiveEntropy*100) {
      particlesRef.current.push({
          x: Math.random()*currentCanvasWidth, y: Math.random()*currentCanvasHeight, z:0, vx:0,vy:0,vz:0,
          life: 20 + Math.random()*30 * (1-effectiveEntropy*0.8),
          baseLife: 20 + Math.random()*30 * (1-effectiveEntropy*0.8),
          color: `hsla(230, 10%, ${10 + Math.random()*20}%, 0.7)`,
          history:[], type: 'void_flicker', size: 0.5 + Math.random()*2 + effectiveEntropy*2
      });
    }
     particlesRef.current.forEach(p => {
          if (p.type === 'void_flicker') {
              p.life -= timeDilation;
              ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `,${Math.sin(p.life / (p.baseLife || 50) * Math.PI)*0.7 * (0.5 + effectiveEntropy*0.5) }`);
              ctx.beginPath(); ctx.fillRect(p.x - (p.size || 0)/2, p.y - (p.size || 0)/2, p.size || 0, p.size || 0);
          }
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  }, [projectTo2D]);

  const drawNexusPoint = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, colors, perspectiveScale, axiomField, effectiveEntropy, projectTo2D } = params;
     TESSERACT_EDGES.forEach(([i1, i2]) => {
        const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
        if (!v1 || !v2) return;
        const [x1, y1] = projectTo2D(v1, perspectiveScale); const [x2, y2] = projectTo2D(v2, perspectiveScale);
        ctx.strokeStyle = `hsla(270, ${60+effectiveEntropy*20}%, ${55+effectiveEntropy*10}%, ${0.15 + axiomField.strength * 0.35 - effectiveEntropy * 0.1})`;
        ctx.lineWidth = 0.4 + axiomField.strength * (1+effectiveEntropy);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      projected3DVertices.forEach((v3D, i) => {
        const [px, py] = projectTo2D(v3D, perspectiveScale);
        const size = (2.5 + axiomField.strength * 6 + effectiveEntropy * 3) * (1 - effectiveEntropy * 0.4);
        const hue = (colors[i][1] * 180 + 240 + effectiveEntropy*30) % 360; 
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.3, size), 0, Math.PI * 2); // Guarded by Math.max
        ctx.fillStyle = `hsla(${hue}, ${90+effectiveEntropy*5}%, ${70+effectiveEntropy*10}%, ${0.55 + axiomField.strength * 0.4 - effectiveEntropy*0.1})`;
        ctx.shadowColor = `hsla(${hue}, 90%, 75%, ${0.4+effectiveEntropy*0.3})`;
        ctx.shadowBlur = size * (2 + effectiveEntropy);
        ctx.fill();
      });
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  }, [projectTo2D]);

  const drawTemporalWeave = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, axiomField, effectiveEntropy, timeDilation, projectTo2D, particlesRef, frameCount } = params;
    if (frameCount % Math.max(1, (5 - Math.floor(effectiveEntropy*4))) === 0 && particlesRef.current.filter(p=>p.type === 'temporal_thread').length < (80 + effectiveEntropy*100) ) {
        const randVIdx = Math.floor(Math.random() * projected3DVertices.length);
        const startNode = projected3DVertices[randVIdx];
        const targetNode = projected3DVertices[(randVIdx + 1 + Math.floor(Math.random()* (3 + effectiveEntropy*3))) % projected3DVertices.length]; 
        if(startNode && targetNode) {
          particlesRef.current.push({
            x: startNode[0], y: startNode[1], z: startNode[2],
            targetX: targetNode[0], targetY: targetNode[1], targetZ: targetNode[2],
            vx:0, vy:0, vz:0, 
            life: 80 + Math.random() * 120 * (1 - effectiveEntropy*0.6),
            baseLife: 80 + Math.random() * 120 * (1 - effectiveEntropy*0.6),
            color: `hsla(${(60 + frameCount * 0.1 + axiomField.strength * 90 + effectiveEntropy*60) % 360}, 80%, 70%, 0.7)`,
            history: [], type: 'temporal_thread', size: 0.8 + Math.random() * (1 + effectiveEntropy*2)
          });
        }
      }
      particlesRef.current.forEach(p => {
        if (p.type === 'temporal_thread' && p.targetX !== undefined && p.targetY !== undefined && p.targetZ !== undefined) { 
            const speedFactor = 0.025 + effectiveEntropy * 0.03;
            p.vx = (p.targetX - p.x) * speedFactor * timeDilation;
            p.vy = (p.targetY - p.y) * speedFactor * timeDilation;
            p.vz = (p.targetZ - p.z) * speedFactor * timeDilation;
        }
        if (p.type === 'temporal_thread') {
            p.x += p.vx; p.y += p.vy; p.z += p.vz;
            p.life -= timeDilation;
            const [px, py] = projectTo2D([p.x, p.y, p.z], perspectiveScale);
            p.history.push({ x: px, y: py });
            if (p.history.length > (10 + effectiveEntropy*15)) p.history.shift();

            ctx.beginPath();
            if (p.history.length > 1) ctx.moveTo(p.history[0].x, p.history[0].y);
            for (let k = 1; k < p.history.length; k++) {
              ctx.lineTo(p.history[k].x, p.history[k].y);
            }
            ctx.strokeStyle = p.color.replace(/,([\d.]+)\)/, `,${p.life / (p.baseLife || 200) * 0.7})`);
            ctx.lineWidth = p.size || 1;
            ctx.stroke();
        }
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  }, [projectTo2D]);

  const drawMythicReflection = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, projectTo2D } = params;
     TESSERACT_EDGES.forEach(([i1, i2]) => { 
        const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
        if (!v1 || !v2) return;
        const [x1, y1] = projectTo2D(v1, perspectiveScale); const [x2, y2] = projectTo2D(v2, perspectiveScale);
        ctx.strokeStyle = `hsla(210, 80%, 70%, ${0.45 - effectiveEntropy * 0.35})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      const numReflections = 1 + Math.floor(axiomField.strength * 3 + effectiveEntropy * 4);
      for (let r = 1; r <= numReflections; r++) {
        const reflectionScale = 1 + r * (0.05 + effectiveEntropy*0.05);
        const reflectionPerspective = perspectiveScale * (1 - r * (0.03 + effectiveEntropy*0.04));
        const reflectionAlpha = (0.25 - r * (0.03 + effectiveEntropy*0.02)) * (1 - effectiveEntropy * 0.6);
        if (reflectionAlpha <= 0) continue;

        TESSERACT_EDGES.forEach(([i1, i2]) => {
          const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
          if (!v1 || !v2) return;
          const [x1_r, y1_r] = projectTo2D(v1.map(c => c * reflectionScale + Math.sin(deltaPhase * (0.5+effectiveEntropy) + r + effectiveEntropy*i1) * (0.1 + effectiveEntropy*0.2) * r), reflectionPerspective);
          const [x2_r, y2_r] = projectTo2D(v2.map(c => c * reflectionScale + Math.sin(deltaPhase * (0.5+effectiveEntropy) + r + effectiveEntropy*i2) * (0.1 + effectiveEntropy*0.2) * r), reflectionPerspective);
          ctx.strokeStyle = `hsla(${(210 + r*20 + effectiveEntropy*30)%360}, 70%, ${60 - effectiveEntropy*10}%, ${reflectionAlpha})`;
          ctx.lineWidth = Math.max(0.1, 0.5 - effectiveEntropy*0.2);
          ctx.beginPath(); ctx.moveTo(x1_r, y1_r); ctx.lineTo(x2_r, y2_r); ctx.stroke();
        });
      }
  }, [projectTo2D]);

  const drawMirrorLoop = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, projectTo2D } = params;
    TESSERACT_EDGES.forEach(([i1, i2]) => {
        const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
        if (!v1 || !v2) return;
        const [x1, y1] = projectTo2D(v1, perspectiveScale); const [x2, y2] = projectTo2D(v2, perspectiveScale);
        ctx.strokeStyle = `hsla(${(200 + axiomField.strength * 40) % 360}, 70%, 60%, ${0.6 - effectiveEntropy * 0.4})`;
        ctx.lineWidth = 1.5 + axiomField.strength * 1 - effectiveEntropy * 0.5;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    const reflectionAlpha = 0.3 - effectiveEntropy * 0.2;
    if (reflectionAlpha > 0.02) {
        projected3DVertices.forEach((v3D) => {
            const reflectedV3D = v3D.map(coord => -coord * (0.8 + effectiveEntropy*0.1));
            const reflectPhase = deltaPhase * 0.5 + axiomField.strength;
            const rX = reflectedV3D[0]*Math.cos(reflectPhase) - reflectedV3D[1]*Math.sin(reflectPhase);
            const rY = reflectedV3D[0]*Math.sin(reflectPhase) + reflectedV3D[1]*Math.cos(reflectPhase);
            const rZ = reflectedV3D[2];
            const [px, py] = projectTo2D([rX, rY, rZ], perspectiveScale * 0.9);
            const size = (1.5 + axiomField.strength * 3 + effectiveEntropy * 2) * (1 - effectiveEntropy * 0.5);
            const hue = (200 + axiomField.strength * 40 + 180 + effectiveEntropy*30) % 360;
            ctx.beginPath();
            ctx.arc(px, py, Math.max(0.2, size * 0.7), 0, Math.PI * 2); // Guarded by Math.max
            ctx.fillStyle = `hsla(${hue}, 60%, 70%, ${reflectionAlpha * 0.8})`;
            ctx.fill();
        });
    }
  }, [projectTo2D]);

  const drawMirrorShatter = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, projectTo2D, frameCount, width: currentCanvasWidth, height: currentCanvasHeight } = params;
     ctx.lineWidth = 0.8 + effectiveEntropy*0.5;
      TESSERACT_EDGES.forEach(([i1, i2]) => {
        const v1Orig = projected3DVertices[i1]; const v2Orig = projected3DVertices[i2];
        if (!v1Orig || !v2Orig) return;
        const segments = 1 + Math.floor(effectiveEntropy * (15 + axiomField.strength*10));
        for (let s = 0; s < segments; s++) {
          const t1 = s / segments;
          const t2 = (s + 1) / segments;
          const v1 = v1Orig.map((c, k) => c * (1-t1) + v2Orig[k] * t1);
          const v2 = v1Orig.map((c, k) => c * (1-t2) + v2Orig[k] * t2);
          const displacementFactor = Math.sin(deltaPhase * (2.5+effectiveEntropy) + i1 * 0.1 + s*0.05) * effectiveEntropy * (0.6 + axiomField.strength*0.4);
          const dV1 = v1.map(c => c + (Math.random() - 0.5) * displacementFactor);
          const dV2 = v2.map(c => c + (Math.random() - 0.5) * displacementFactor);
          const [x1_s, y1_s] = projectTo2D(dV1, perspectiveScale);
          const [x2_s, y2_s] = projectTo2D(dV2, perspectiveScale);
          const hue = (300 + effectiveEntropy * 90 + Math.random()*30) % 360; 
          const alpha = 0.55 - effectiveEntropy * 0.4 + Math.random()*0.1;
          ctx.strokeStyle = `hsla(${hue}, 90%, ${55 + Math.random()*15}%, ${alpha})`;
          if (Math.random() > effectiveEntropy * 0.2) { 
            ctx.beginPath(); ctx.moveTo(x1_s, y1_s); ctx.lineTo(x2_s, y2_s); ctx.stroke();
          }
        }
      });
      if (effectiveEntropy > 0.65 && frameCount % Math.max(1, 15 - Math.floor(effectiveEntropy*10)) < (2 + effectiveEntropy*2) ) { 
        ctx.fillStyle = `hsla(${Math.random()*360}, 50%, 50%, ${effectiveEntropy * 0.15})`;
        ctx.fillRect(0,0,currentCanvasWidth,currentCanvasHeight);
      }
  }, [projectTo2D]);

  const drawSymphonicPulse = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, deltaPhase, effectiveEntropy, projectTo2D, resonanceTuning } = params;
    TESSERACT_EDGES.forEach(([i1, i2]) => {
        const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
        if (!v1 || !v2) return;
        const [x1, y1] = projectTo2D(v1, perspectiveScale); const [x2, y2] = projectTo2D(v2, perspectiveScale);
        const pulseFactor = 0.5 + Math.sin(deltaPhase * (2 + resonanceTuning * 2 + effectiveEntropy*1.5) + (i1+i2)*0.1) * 0.5;
        ctx.lineWidth = 0.8 + pulseFactor * (3.5 + effectiveEntropy*2) * (1 - effectiveEntropy * 0.6);
        const hue = (120 + resonanceTuning * 180 + pulseFactor * 60 + effectiveEntropy * 45) % 360;
        const lightness = 45 + pulseFactor * 25;
        ctx.strokeStyle = `hsla(${hue}, ${80 + effectiveEntropy*10}%, ${lightness}%, ${0.35 + pulseFactor * 0.45})`;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
  }, [projectTo2D]);
  
  const drawQuantumBloom = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, effectiveEntropy, timeDilation, projectTo2D, particlesRef, frameCount } = params;
    if (frameCount % Math.max(1, 3 - Math.floor(effectiveEntropy*2)) === 0 && particlesRef.current.filter(p=>p.type === 'quantum_potential').length < (150 + effectiveEntropy*200)) {
        const randVIdx = Math.floor(Math.random() * projected3DVertices.length);
        const baseV = projected3DVertices[randVIdx];
        if (baseV) {
          for(let i=0; i < 1 + Math.floor(effectiveEntropy * 5); i++) {
            particlesRef.current.push({
              x: baseV[0] + (Math.random()-0.5)*(0.1+effectiveEntropy*0.2), y: baseV[1] + (Math.random()-0.5)*(0.1+effectiveEntropy*0.2), z: baseV[2] + (Math.random()-0.5)*(0.1+effectiveEntropy*0.2),
              vx: (Math.random()-0.5)*(0.01+effectiveEntropy*0.02), vy: (Math.random()-0.5)*(0.01+effectiveEntropy*0.02), vz: (Math.random()-0.5)*(0.01+effectiveEntropy*0.02),
              life: 25 + Math.random() * 50 * (1 - effectiveEntropy * 0.7),
              baseLife: 25 + Math.random() * 50 * (1 - effectiveEntropy * 0.7),
              color: `hsla(${(200 + Math.random()*80 + effectiveEntropy*30)%360}, 90%, 75%, 0.65)`,
              history: [], type: 'quantum_potential', size: 0.4 + Math.random()*(1+effectiveEntropy)
            });
          }
        }
      }
      particlesRef.current.forEach(p => {
        if (p.type === 'quantum_potential') {
          p.x += p.vx * timeDilation * (1+effectiveEntropy*0.5); p.y += p.vy * timeDilation * (1+effectiveEntropy*0.5); p.z += p.vz * timeDilation * (1+effectiveEntropy*0.5);
          p.life -= timeDilation;
          const [px, py] = projectTo2D([p.x, p.y, p.z], perspectiveScale);
          const alpha = p.life / (p.baseLife || 80) * 0.65;
          ctx.beginPath();
          const radius = (p.size || 1) * (0.4 + alpha*0.8);
          ctx.arc(px, py, Math.max(0.1, radius), 0, Math.PI * 2); 
          ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `,${Math.max(0,alpha * (0.7 + effectiveEntropy*0.3))})`);
          ctx.fill();
        }
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  }, [projectTo2D]);

  const drawSoulVector = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, projectTo2D } = params;
    const vectorStartIdx = 0; 
    const vectorEndIdx = 15;  
    TESSERACT_EDGES.forEach(([i1, i2]) => {
        const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
        if (!v1 || !v2) return;
        const [x1, y1] = projectTo2D(v1, perspectiveScale); const [x2, y2] = projectTo2D(v2, perspectiveScale);
        const isVectorPathSegment = (i1 === vectorStartIdx && i2 === 1) || (i1 === 1 && i2 === 3) || (i1 === 3 && i2 === 7) || (i1 === 7 && i2 === 15); 
        if (isVectorPathSegment) {
            ctx.strokeStyle = `hsla(50, 100%, ${65 + Math.sin(deltaPhase*3)*10}%, ${0.75 - effectiveEntropy * 0.5 + axiomField.strength*0.2})`;
            ctx.lineWidth = 2 + axiomField.strength * 2.5 + effectiveEntropy*1.5;
            ctx.shadowColor = `hsla(50, 100%, 70%, ${0.4 + effectiveEntropy*0.3})`;
            ctx.shadowBlur = 8 + effectiveEntropy*5;
        } else {
            ctx.strokeStyle = `hsla(240, 50%, ${40 - effectiveEntropy*10}%, ${0.12 - effectiveEntropy * 0.1})`;
            ctx.lineWidth = 0.4;
        }
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  }, [projectTo2D]);

  const drawAshfallCycle = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, perspectiveScale, effectiveEntropy, timeDilation, projectTo2D, particlesRef, frameCount, width: currentCanvasWidth, height: currentCanvasHeight } = params;
     TESSERACT_EDGES.forEach(([i1, i2]) => {
        const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
        if (!v1 || !v2) return;
        const [x1_a, y1_a] = projectTo2D(v1, perspectiveScale); const [x2_a, y2_a] = projectTo2D(v2, perspectiveScale);
        ctx.strokeStyle = `hsla(${10+effectiveEntropy*20}, ${10 + effectiveEntropy*10}%, ${15 - effectiveEntropy * 10}%, ${0.35 - effectiveEntropy * 0.25})`;
        ctx.lineWidth = 0.8 + effectiveEntropy*0.5;
        ctx.beginPath(); ctx.moveTo(x1_a, y1_a); ctx.lineTo(x2_a, y2_a); ctx.stroke();
    });
    if (frameCount % Math.max(1, 3 - Math.floor(effectiveEntropy*2)) === 0 && particlesRef.current.filter(p=>p.type === 'ember').length < (120 + effectiveEntropy*150)) {
        const randVIdx = Math.floor(Math.random() * projected3DVertices.length);
        const v = projected3DVertices[randVIdx];
        if(v) {
            particlesRef.current.push({
                x: v[0], y: v[1], z: v[2],
                vx: (Math.random() - 0.5) * (0.02 + effectiveEntropy*0.03), vy: (Math.random() * 0.02 + 0.005) * (1 + effectiveEntropy*1.5), vz: (Math.random() - 0.5) * (0.01+effectiveEntropy*0.02),
                life: 70 + Math.random() * 80 * (1-effectiveEntropy*0.5),
                baseLife: 70 + Math.random() * 80 * (1-effectiveEntropy*0.5),
                color: `hsla(${15 + Math.random()*35}, 100%, ${45 + Math.random()*20}%, 0.9)`,
                history: [], type: 'ember', size: 0.4 + Math.random() * (1.2 + effectiveEntropy*0.8)
            });
        }
    }
    particlesRef.current.forEach(p => {
        if (p.type === 'ember') {
            p.x += p.vx * timeDilation; p.y += p.vy * timeDilation; p.z += p.vz * timeDilation;
            p.life -= timeDilation;
            const [px, py] = projectTo2D([p.x, p.y, p.z], perspectiveScale);
            const alpha = p.life / (p.baseLife || 150) * 0.9;
            ctx.beginPath();
            const radius = (p.size || 1) * (0.25 + alpha*0.75);
            ctx.arc(px, py, Math.max(0.1, radius), 0, Math.PI * 2); 
            ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `,${Math.max(0,alpha)})`);
            ctx.fill();
        }
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    if (frameCount % Math.max(50, 250 - Math.floor(effectiveEntropy*180)) < (5 + effectiveEntropy*10) ) {
        const pulseProgress = (frameCount % Math.max(50, 250 - Math.floor(effectiveEntropy*180))) / (5 + effectiveEntropy*10);
        const pulseRadius = pulseProgress * Math.min(currentCanvasWidth, currentCanvasHeight) * (0.25 + effectiveEntropy*0.2);
        const pulseAlpha = Math.sin(pulseProgress * Math.PI) * (0.25 + effectiveEntropy*0.2) * (1-effectiveEntropy*0.5);
        ctx.beginPath();
        ctx.arc(currentCanvasWidth/2, currentCanvasHeight/2, Math.max(0, pulseRadius), 0, Math.PI*2);
        ctx.fillStyle = `hsla(45, 100%, ${75 + effectiveEntropy*10}%, ${pulseAlpha})`;
        ctx.fill();
    }
  }, [projectTo2D]);

  const drawStellarThread = useCallback((params: CommonDrawParams) => {
    const { ctx, projected3DVertices, colors, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, projectTo2D, particlesRef, frameCount } = params;
     if (frameCount % Math.max(2, 10 - Math.floor(effectiveEntropy*8)) === 0 && particlesRef.current.filter(p=>p.type === 'star').length < (50 + effectiveEntropy*100)) {
         particlesRef.current.push({
            x: (Math.random() * 2 - 1) * (1+effectiveEntropy*0.5), y: (Math.random() * 2 - 1)* (1+effectiveEntropy*0.5), z: (Math.random() * 2 - 1)* (1+effectiveEntropy*0.5),
            vx:0, vy:0, vz:0, life: Infinity, 
            color: `hsla(${190 + Math.random()*40}, ${20+effectiveEntropy*30}%, ${65 + Math.random()*25}%, ${0.08 + Math.random()*0.25 + effectiveEntropy*0.15})`,
            history:[], type: 'star', size: 0.15 + Math.random()*0.6 + effectiveEntropy*0.3
         });
    }
    particlesRef.current.forEach(p => {
         if (p.type === 'star') {
            const [px, py] = projectTo2D([p.x,p.y,p.z], perspectiveScale * (1.5+effectiveEntropy*0.5));
            ctx.beginPath();
            const radius = (p.size || 1) * (1 + Math.sin(deltaPhase*0.5 + p.x)*effectiveEntropy*0.3);
            ctx.arc(px, py, Math.max(0.1, radius) , 0, Math.PI*2); // Guarded
            ctx.fillStyle = p.color;
            ctx.fill();
         }
    });
    TESSERACT_EDGES.forEach(([i1, i2]) => {
        const v1 = projected3DVertices[i1]; const v2 = projected3DVertices[i2];
        if (!v1 || !v2) return;
        const [x1_st, y1_st] = projectTo2D(v1, perspectiveScale); const [x2_st, y2_st] = projectTo2D(v2, perspectiveScale);
        ctx.strokeStyle = `hsla(190, 80%, 70%, ${0.08 + axiomField.strength * 0.25 - effectiveEntropy * 0.07 + Math.random()*effectiveEntropy*0.1})`;
        ctx.lineWidth = 0.4 + effectiveEntropy*0.3;
        if(Math.random() > effectiveEntropy*0.15) { ctx.beginPath(); ctx.moveTo(x1_st, y1_st); ctx.lineTo(x2_st, y2_st); ctx.stroke(); }
    });
    projected3DVertices.forEach((v3D, i) => {
        const [px, py] = projectTo2D(v3D, perspectiveScale);
        const size = (1.8 + axiomField.strength * 3.5 + effectiveEntropy*1.5) * (1 - effectiveEntropy * 0.35);
        const hue = (190 + colors[i][2] * 60 + effectiveEntropy*30) % 360;
        ctx.fillStyle = `hsla(${hue}, 100%, ${80+effectiveEntropy*5}%, ${0.65 + axiomField.strength * 0.3 - effectiveEntropy*0.1})`;
        ctx.shadowColor = `hsla(${hue}, 100%, 85%, ${0.5+effectiveEntropy*0.2})`;
        ctx.shadowBlur = size * (2 + effectiveEntropy);
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.4,size), 0, Math.PI * 2); ctx.fill();
    });
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  }, [projectTo2D]);

  const drawHypersphereField = useCallback((params: CommonDrawParams) => {
    const { ctx, perspectiveScale, axiomField, deltaPhase, effectiveEntropy, projectTo2D, particlesRef, timeDilation, frameCount } = params;
    const sphereRadius = 0.8 + effectiveEntropy * 0.3 + Math.sin(deltaPhase * 0.8 + axiomField.strength * 2) * 0.15 * (1 - effectiveEntropy);
    const segments = 16 + Math.floor(effectiveEntropy * 8); 
    const rings = 8 + Math.floor(effectiveEntropy * 4);
    for (let i = 0; i <= rings; i++) {
      const lat = Math.PI * (-0.5 + (i / rings)); 
      const r_latitude = sphereRadius * Math.cos(lat);
      const y_latitude = sphereRadius * Math.sin(lat);
      for (let j = 0; j <= segments; j++) {
        const lon = 2 * Math.PI * (j / segments); 
        const x_coord = r_latitude * Math.cos(lon + deltaPhase * 0.2);
        const z_coord = r_latitude * Math.sin(lon + deltaPhase * 0.2);
        const v3D = [x_coord, y_latitude, z_coord];
        const [px, py] = projectTo2D(v3D, perspectiveScale * 1.2); 
        if (i > 0 && j > 0) {
          const prevLat = Math.PI * (-0.5 + ((i - 1) / rings));
          const prevR = sphereRadius * Math.cos(prevLat);
          const prevLon = 2 * Math.PI * ((j - 1) / segments);
          const prevX_sameLat = r_latitude * Math.cos(prevLon + deltaPhase * 0.2);
          const prevZ_sameLat = r_latitude * Math.sin(prevLon + deltaPhase * 0.2);
          const [prevPx_sameLat, prevPy_sameLat] = projectTo2D([prevX_sameLat, y_latitude, prevZ_sameLat], perspectiveScale * 1.2);
          const prevX_prevLat = prevR * Math.cos(lon + deltaPhase * 0.2);
          const prevZ_prevLat = prevR * Math.sin(lon + deltaPhase * 0.2);
          const [prevPx_prevLat, prevPy_prevLat] = projectTo2D([prevX_prevLat, prevR * Math.sin(prevLat), prevZ_prevLat], perspectiveScale * 1.2);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(prevPx_sameLat, prevPy_sameLat); ctx.lineTo(prevPx_prevLat, prevPy_prevLat);
          const hue = (240 + axiomField.strength * 90 + effectiveEntropy * 60 + lat * 20) % 360;
          const alpha = 0.3 + axiomField.strength * 0.4 - effectiveEntropy * 0.2;
          ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${Math.max(0.05, alpha)})`;
          ctx.lineWidth = 0.5 + effectiveEntropy * 0.8; ctx.stroke();
          if (Math.random() < effectiveEntropy * 0.05) { 
            ctx.fillStyle = `hsla(${hue}, 90%, 85%, ${0.5 + Math.random()*0.5})`;
            ctx.beginPath(); ctx.arc(px, py, Math.max(0.1, 1 + Math.random()*1.5), 0, Math.PI*2); ctx.fill();
          }
        }
      }
    }
    if (frameCount % Math.max(1, (4 - Math.floor(effectiveEntropy*3))) === 0 && particlesRef.current.filter(p=>p.type === 'sphere_surface').length < (60 + effectiveEntropy*90) ) {
        const u = Math.random(); const v = Math.random();
        const theta = 2 * Math.PI * u; const phi = Math.acos(2 * v - 1);
        const x = sphereRadius * Math.sin(phi) * Math.cos(theta);
        const y = sphereRadius * Math.sin(phi) * Math.sin(theta);
        const z_surf = sphereRadius * Math.cos(phi);
        particlesRef.current.push({
          x, y, z: z_surf,
          vx: (Math.random()-0.5)*0.005*(1+effectiveEntropy), vy: (Math.random()-0.5)*0.005*(1+effectiveEntropy), vz: (Math.random()-0.5)*0.005*(1+effectiveEntropy),
          life: 50 + Math.random()*70, baseLife: 50 + Math.random()*70,
          color: `hsla(${(240 + axiomField.strength*90 + effectiveEntropy*60)%360}, 85%, 75%, 0.8)`,
          history:[], type: 'sphere_surface', size: 0.6 + Math.random()*1.2
        });
    }
    particlesRef.current.forEach(p => {
        if (p.type === 'sphere_surface') {
            p.x += p.vx * timeDilation; p.y += p.vy * timeDilation; p.z += p.vz * timeDilation;
            p.life -= timeDilation;
            const [px, py] = projectTo2D([p.x,p.y,p.z], perspectiveScale * 1.2);
            const alpha = p.life / (p.baseLife || 120) * 0.8;
            ctx.beginPath();
            const radius = (p.size || 1) * (0.5 + alpha*0.5);
            ctx.arc(px, py, Math.max(0.1, radius), 0, Math.PI*2);
            ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `,${Math.max(0, alpha)})`);
            ctx.fill();
        }
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  }, [projectTo2D]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasSize;   // Use square canvasSize
    canvas.height = canvasSize;  // Use square canvasSize

    let frameId: number;
    let frameCount = 0;
    
    const renderLoop = () => {
      frameCount++;
      const deltaPhase = frameCount * 0.01 * timeDilation * (1 + effectiveEntropy * 0.5); 
      const { vertices: projected3DVertices, colors, temporalFactor } = tesseractRenderer.render(deltaPhase);
      const axiomField = axiomPulser.getActiveAxiomField();

      ctx.fillStyle = `rgba(15, 23, 42, ${currentMode === VisualizationMatrixMode.VoidEcho ? 0.98 : (currentMode === VisualizationMatrixMode.AshfallCycle ? 0.92 : 0.85 - effectiveEntropy * 0.1)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const basePerspectiveScale = Math.min(canvas.width, canvas.height) * (0.15 + axiomField.strength * 0.15 - effectiveEntropy * 0.1);
      const magnificationFactor = 3; 
      const currentPerspectiveScale = basePerspectiveScale * magnificationFactor;

      const commonDrawParams: CommonDrawParams = {
        ctx, projected3DVertices, colors, temporalFactor, perspectiveScale: currentPerspectiveScale, axiomField, deltaPhase, frameCount,
        width: canvas.width, height: canvas.height, effectiveEntropy, timeDilation, projectTo2D, particlesRef, drawFractalBranch, resonanceTuning
      };

      switch (currentMode) {
        case VisualizationMatrixMode.SacredLattice: drawSacredLattice(commonDrawParams); break;
        case VisualizationMatrixMode.DimensionalBloom: drawDimensionalBloom(commonDrawParams); break;
        case VisualizationMatrixMode.EntropyPulse: drawEntropyPulse(commonDrawParams); break;
        case VisualizationMatrixMode.FractalCascade: drawFractalCascade(commonDrawParams); break;
        case VisualizationMatrixMode.AxiomaticOverlay: drawAxiomaticOverlay(commonDrawParams); break;
        case VisualizationMatrixMode.AethericFlow: drawAethericFlow(commonDrawParams); break;
        case VisualizationMatrixMode.GlyphicResonance: drawGlyphicResonance(commonDrawParams); break;
        case VisualizationMatrixMode.VoidEcho: drawVoidEcho(commonDrawParams); break;
        case VisualizationMatrixMode.NexusPoint: drawNexusPoint(commonDrawParams); break;
        case VisualizationMatrixMode.TemporalWeave: drawTemporalWeave(commonDrawParams); break;
        case VisualizationMatrixMode.MythicReflection: drawMythicReflection(commonDrawParams); break;
        case VisualizationMatrixMode.MirrorLoop: drawMirrorLoop(commonDrawParams); break;
        case VisualizationMatrixMode.MirrorShatter: drawMirrorShatter(commonDrawParams); break;
        case VisualizationMatrixMode.SymphonicPulse: drawSymphonicPulse(commonDrawParams); break;
        case VisualizationMatrixMode.QuantumBloom: drawQuantumBloom(commonDrawParams); break;
        case VisualizationMatrixMode.SoulVector: drawSoulVector(commonDrawParams); break;
        case VisualizationMatrixMode.AshfallCycle: drawAshfallCycle(commonDrawParams); break;
        case VisualizationMatrixMode.StellarThread: drawStellarThread(commonDrawParams); break;
        case VisualizationMatrixMode.HypersphereField: drawHypersphereField(commonDrawParams); break;
        default: drawSacredLattice(commonDrawParams); break;
      }
      frameId = requestAnimationFrame(renderLoop);
    };

    frameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(frameId);
  }, [
      tesseractRenderer, axiomPulser, timeDilation, effectiveEntropy, currentMode, 
      canvasSize, projectTo2D, drawFractalBranch, resonanceTuning, 
      drawSacredLattice, drawDimensionalBloom, drawEntropyPulse, drawFractalCascade,
      drawAxiomaticOverlay, drawAethericFlow, drawGlyphicResonance, drawVoidEcho,
      drawNexusPoint, drawTemporalWeave, drawMythicReflection, drawMirrorLoop, 
      drawMirrorShatter, drawSymphonicPulse, drawQuantumBloom, drawSoulVector, 
      drawAshfallCycle, drawStellarThread, drawHypersphereField 
    ]); 

  return (
    <div className="visualization-matrix-panel bg-slate-950/90 backdrop-blur-md border border-indigo-600/50 rounded-xl shadow-2xl p-4 md:p-6 my-6 text-slate-100"> {/* Changed my-4 to my-6 */}
       <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
        <h2 className="text-xl md:text-2xl font-cinzel font-bold text-indigo-300 drop-shadow-[0_1px_1px_rgba(129,140,248,0.4)]">
          Visualization Matrix Δ
        </h2>
        <div className="w-full sm:w-auto">
          <ModeSelector<VisualizationMatrixMode> 
            currentMode={currentMode} 
            onSetMode={handleModeChange}
            availableModes={Object.values(VisualizationMatrixMode) as VisualizationMatrixMode[]} 
          />
        </div>
      </div>
      <div 
        className="canvas-outer-wrapper mx-auto" // Centering the square canvas container
        style={{ width: `${canvasSize}px`, height: `${canvasSize}px` }}
      >
        <canvas 
          ref={canvasRef} 
          className="block bg-black border border-slate-700 rounded-md" // block for layout, no w-full/h-full if parent sets size
          style={{ width: `${canvasSize}px`, height: `${canvasSize}px` }} // CSS display size for the canvas
          aria-label="Tesseract or Hypersphere Visualization"
          role="img"
        />
      </div>
       <div className="mt-3 text-center text-xs text-slate-400 font-mono">
        Mode: {currentMode} | Entropy: {(effectiveEntropy || 0).toFixed(3)}δ | Resonance: {(resonanceTuning || 0).toFixed(2)} | Time: {(timeDilation || 0).toFixed(1)}x
      </div>
    </div>
  );
};

export default VisualizationMatrixPanel;
