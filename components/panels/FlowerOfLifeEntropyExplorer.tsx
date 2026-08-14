
import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import type { PanelDisplayMode, Particle } from '../../types';
import { GeoMode, VisualizationMatrixMode } from '../../types';
import ModeSelectorAny from '../core/ModeSelectorAny';

interface FlowerOfLifeEntropyExplorerProps {
  currentEntropy: number;
  width: number;
  height: number;
  currentDisplayMode: PanelDisplayMode;
  onSetDisplayMode: (mode: PanelDisplayMode) => void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// Helper function to get Fruit of Life points (simplified for this context)
const getFruitOfLifePoints = (centerX: number, centerY: number, R_distance: number): { x: number; y: number; id: string, baseHue: number }[] => {
    const points: { x: number; y: number; id: string, baseHue: number }[] = [];
    points.push({ x: centerX, y: centerY, id: 'center_0', baseHue: 0 }); // Central point
    for (let i = 0; i < 6; i++) { // First ring
        const angle = (i * Math.PI) / 3;
        points.push({
            x: centerX + R_distance * Math.cos(angle),
            y: centerY + R_distance * Math.sin(angle),
            id: `inner_${i}`,
            baseHue: (60 + i * 50) % 360
        });
    }
    for (let i = 0; i < 6; i++) { // Second ring
        const angle = (i * Math.PI) / 3;
        points.push({
            x: centerX + 2 * R_distance * Math.cos(angle),
            y: centerY + 2 * R_distance * Math.sin(angle),
            id: `outer_${i}`,
            baseHue: (90 + i * 50) % 360
        });
    }
    // Metatron points omitted for FoL helix, focusing on 13 core points
    return points.slice(0,13); // Ensure only 13 points (1 center + 6 inner + 6 outer)
};

const FLOWER_PATHS_BY_INDEX: [number, number][] = [
  // Center to Inner Ring
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  // Inner Ring Adjacencies
  [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1],
  // Inner to Outer Ring (Radial)
  [1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [6, 12],
  // Outer Ring Adjacencies
  [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 7],
];


const FlowerOfLifeEntropyExplorer: React.FC<FlowerOfLifeEntropyExplorerProps> = ({
  currentEntropy,
  width,
  height,
  currentDisplayMode,
  onSetDisplayMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const baseRadiusForCircles = useMemo(() => Math.min(width, height) * 0.12, [width, height]);

  const fruitOfLifePoints = useMemo(() => {
    if (width === 0 || height === 0) return [];
    return getFruitOfLifePoints(width / 2, height / 2, baseRadiusForCircles);
  }, [width, height, baseRadiusForCircles]);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, entropy: number, mode: PanelDisplayMode) => {
    const t = clamp(entropy, 0, 1);
    let baseHue: number;
    let lightnessStart: number;
    let lightnessEnd: number;

    // Mode-specific background themes
    switch (mode) {
        case GeoMode.NullShell:
        case VisualizationMatrixMode.VoidEcho:
            baseHue = lerp(240, 220, t); lightnessStart = lerp(3, 1, t); lightnessEnd = lerp(8, 3, t); break;
        case GeoMode.CrystalLogic:
            baseHue = lerp(180, 220, t); lightnessStart = lerp(10, 5, t); lightnessEnd = lerp(20, 10, t); break;
        case GeoMode.AethericWeave:
        case VisualizationMatrixMode.AethericFlow:
        case VisualizationMatrixMode.TemporalWeave:
            baseHue = lerp(200, 170, t); lightnessStart = lerp(8, 4, t); lightnessEnd = lerp(18, 8, t); break;
        case GeoMode.Recursive:
        case VisualizationMatrixMode.FractalCascade:
        case GeoMode.BioFractalPulse:
            baseHue = lerp(120, 90 - t * 60, t); lightnessStart = lerp(10, 3, t); lightnessEnd = lerp(18, 7, t); break;
        case GeoMode.OracleWhisper:
             baseHue = lerp(270, 250, t); lightnessStart = lerp(5, 2, t); lightnessEnd = lerp(12, 5, t); break;
        case GeoMode.ShieldedChaos:
             baseHue = lerp(0, 330, t); lightnessStart = lerp(8, 3, t); lightnessEnd = lerp(15, 5, t); break;
        case VisualizationMatrixMode.AshfallCycle:
            baseHue = lerp(210, 190, t); lightnessStart = lerp(15, 8, t); lightnessEnd = lerp(5, 2, t); break; // Dark, desaturated blues/greys
        default:
            baseHue = lerp(220, 300, t); lightnessStart = lerp(10, 5, t); lightnessEnd = lerp(20, 10, t); break;
    }

    const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 1.5);
    grad.addColorStop(0, `hsla(${baseHue}, 50%, ${lightnessStart}%, 1)`);
    grad.addColorStop(1, `hsla(${(baseHue + 40) % 360}, 60%, ${lightnessEnd}%, 1)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);
  
  const updateAndDrawParticles = useCallback((ctx: CanvasRenderingContext2D, entropy: number, mode: PanelDisplayMode, frameCount: number) => {
    const t = clamp(entropy, 0, 1);
    // Spawn new particles
    if (mode === GeoMode.OracleWhisper && Math.random() < 0.3 + t * 0.5) {
        particlesRef.current.push({
            x: Math.random() * width, y: Math.random() * height,
            vx: (Math.random() - 0.5) * (0.1 + t * 0.2), vy: (Math.random() - 0.5) * (0.1 + t * 0.2),
            life: 50 + Math.random() * 100, color: `hsla(${(270 + Math.random()*60)%360}, 80%, 80%, ${0.05 + Math.random()*0.15})`,
            type: 'whisper', size: 0.5 + Math.random() * (1 + t), history: []
        });
    } else if (mode === VisualizationMatrixMode.AshfallCycle && Math.random() < 0.5 + t * 0.5) {
        particlesRef.current.push({
            x: Math.random() * width, y: -10,
            vx: (Math.random() - 0.5) * (0.2 + t * 0.5), vy: 0.3 + Math.random() * (0.5 + t),
            life: 100 + Math.random() * 150, color: `hsla(${180 + Math.random()*60}, ${10 + t*10}%, ${20 + Math.random()*20}%, ${0.3 + Math.random()*0.4})`,
            type: 'ash', size: 1 + Math.random()*(2 + t*2), history: []
        });
         if (Math.random() < 0.05 + t*0.1) { // Ember
            particlesRef.current.push({
                x: Math.random() * width, y: -5,
                vx: (Math.random() - 0.5) * 0.3, vy: 0.2 + Math.random() * 0.4,
                life: 40 + Math.random() * 60, color: `hsla(${20 + Math.random()*30}, 100%, 60%, ${0.6 + Math.random()*0.3})`,
                type: 'ember', size: 1 + Math.random()*1.5, history: []
            });
        }
    } else if (mode === VisualizationMatrixMode.QuantumBloom && Math.random() < 0.6 + t*0.4) {
         particlesRef.current.push({
            x: Math.random() * width, y: Math.random() * height,
            vx: (Math.random() - 0.5) * (0.5 + t*1.5), vy: (Math.random() - 0.5) * (0.5 + t*1.5),
            life: 15 + Math.random() * 30 * (1-t*0.5), color: `hsla(${Math.random()*360}, 90%, 70%, ${0.5 + Math.random()*0.3})`,
            type: 'quantum_spark', size: 0.5 + Math.random()*(1.5 + t*2), history: []
        });
    } else if (mode === GeoMode.ShieldedChaos && Math.random() < 0.8 + t*0.2){
         particlesRef.current.push({
            x: width/2 + (Math.random()-0.5)*10, y: height/2 + (Math.random()-0.5)*10,
            vx: (Math.random() - 0.5) * (2 + t*8), vy: (Math.random() - 0.5) * (2 + t*8),
            life: 20 + Math.random()*50 * (1-t*0.6), color: `hsla(${Math.random()*60}, 90%, 60%, ${0.6 + Math.random()*0.3})`,
            type: 'chaos_core', size: 0.5 + Math.random()*(1+t*1.5), history: []
        });
    } else if (mode === GeoMode.VortexSingularity && Math.random() < 0.7 + t*0.3){
        const angle = Math.random() * Math.PI * 2;
        const dist = width * 0.4 + Math.random() * width * 0.1;
         particlesRef.current.push({
            x: width/2 + Math.cos(angle) * dist, y: height/2 + Math.sin(angle) * dist,
            vx: 0, vy: 0, // Velocity calculated dynamically
            life: 80 + Math.random()*120, color: `hsla(${(240 + t*60 + Math.random()*60)%360}, 90%, 65%, ${0.5 + Math.random()*0.3})`,
            type: 'vortex_trail', size: 0.5 + Math.random()*(1+t), history: []
        });
    }


    // Update and draw
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    particlesRef.current.forEach(p => {
        p.life--;
        if (p.type === 'whisper') {
            p.x += p.vx; p.y += p.vy;
            if (Math.random() < 0.01 + t * 0.05) { p.vx *= -1; p.vy *= -1; } // Erratic movement
            ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `,${p.life / 150 * parseFloat(p.color.match(/,([\d.]+)\)/)?.[1] || "0.1")})`);
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.size), 0, Math.PI*2); ctx.fill();
            if (Math.random() < 0.005 + t*0.01) { // Faint text
                ctx.fillStyle = `hsla(0,0%,100%,${0.05 + t*0.1})`;
                ctx.font = `${6 + t*4}px monospace`;
                ctx.fillText(String.fromCharCode(33 + Math.floor(Math.random()*94)), p.x + 5, p.y + 5);
            }
        } else if (p.type === 'ash') {
            p.x += p.vx + Math.sin(frameCount * 0.02 + p.y * 0.05) * (0.3 + t * 0.5); // Sway
            p.y += p.vy;
            ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `,${p.life / 150 * parseFloat(p.color.match(/,([\d.]+)\)/)?.[1] || "0.3")})`);
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.size), 0, Math.PI*2); ctx.fill();
        } else if (p.type === 'ember'){
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.01; // Gravity on embers
            ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `,${p.life / 100 * parseFloat(p.color.match(/,([\d.]+)\)/)?.[1] || "0.6")})`);
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.size), 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 5 + t*5; ctx.shadowColor = p.color; ctx.fill(); ctx.shadowBlur = 0;
        } else if (p.type === 'quantum_spark'){
            p.x += p.vx; p.y += p.vy;
            if (Math.random() < 0.05 + t*0.1) { // Quantum jump
                p.x = Math.random()*width; p.y = Math.random()*height;
            }
            ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `,${p.life / 50 * parseFloat(p.color.match(/,([\d.]+)\)/)?.[1] || "0.5")})`);
            ctx.beginPath(); ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size); ctx.fill();
        } else if (p.type === 'chaos_core'){
            const shieldRadius = Math.min(width,height) * 0.2 * (1 + (1-t)*0.5);
            p.x += p.vx; p.y += p.vy;
            const distFromCenter = Math.hypot(p.x - width/2, p.y - height/2);
            if (distFromCenter > shieldRadius){
                p.vx *= -0.9; p.vy *= -0.9; // Bounce
                const angle = Math.atan2(p.y - height/2, p.x - width/2);
                p.x = width/2 + Math.cos(angle) * shieldRadius;
                p.y = height/2 + Math.sin(angle) * shieldRadius;
            }
            ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `,${p.life / 80 * parseFloat(p.color.match(/,([\d.]+)\)/)?.[1] || "0.6")})`);
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.size), 0, Math.PI*2); ctx.fill();
        } else if (p.type === 'vortex_trail'){
            const dx = width/2 - p.x;
            const dy = height/2 - p.y;
            const dist = Math.hypot(dx,dy);
            if (dist < 5 + t*10) { p.life = 0; return; } // Consumed
            const angleToCenter = Math.atan2(dy,dx);
            const speed = (0.5 + t*2.5) * (1 + 50/(dist + 10));
            p.vx = Math.cos(angleToCenter) * speed + Math.sin(angleToCenter) * (0.3 + t*0.7); // Spiral pull
            p.vy = Math.sin(angleToCenter) * speed - Math.cos(angleToCenter) * (0.3 + t*0.7);
            p.x += p.vx; p.y += p.vy;
            ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `,${p.life / 200 * parseFloat(p.color.match(/,([\d.]+)\)/)?.[1] || "0.5")})`);
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.size*(1+t)),0,Math.PI*2); ctx.fill();
        }
    });
    if(particlesRef.current.length > 200 + t*300) { // Cap particles
        particlesRef.current.splice(0, particlesRef.current.length - (200+t*300));
    }
  }, [width, height]);

  const drawFlowerCircles = useCallback((
    points: { x: number; y: number }[],
    R_circle: number,
    entropy: number,
    pulse: boolean,
    frameCount: number,
    ctx: CanvasRenderingContext2D,
    opacityFactor: number = 1,
    isVoidEcho: boolean = false,
    isQuantum: boolean = false
  ) => {
    const t = clamp(entropy, 0, 1);
    points.forEach((point, idx) => {
      if (isQuantum && Math.random() < t * 0.3) return; // Chance for circle to not draw

      ctx.beginPath();
      const pulseVal = pulse ? (0.8 + Math.sin(frameCount * 0.05 * (1 + t * 2) + idx * 0.3) * 0.2) : 1;
      const circleRadius = R_circle * (1 - t * (isVoidEcho ? 0.4 : (isQuantum ? 0.2 : 0.1))) * pulseVal;
      const lineW = lerp(isQuantum ? 0.8 : 1.5, 0.5 + Math.random() * (isQuantum ? 1.5 : 2), t) * (isVoidEcho ? 0.5 : 1);
      const baseAlpha = isVoidEcho ? lerp(0.2, 0.03, t) : (isQuantum ? lerp(0.7, 0.2, t) : lerp(0.6, 0.2, t));
      const alpha = baseAlpha * opacityFactor * (pulse && isVoidEcho ? pulseVal * 0.5 + 0.5 : 1);

      let x = point.x;
      let y = point.y;
      if (entropy > 0.6 && !isVoidEcho) {
        const jitter = entropy * (isQuantum ? 10 : 5);
        x += (Math.random() - 0.5) * jitter;
        y += (Math.random() - 0.5) * jitter;
      }
      if (isQuantum && Math.random() < t * 0.1) { // Quantum position shift
          x += (Math.random() - 0.5) * R_circle * 0.5;
          y += (Math.random() - 0.5) * R_circle * 0.5;
      }

      ctx.beginPath(); 
      ctx.arc(x, y, Math.max(0, circleRadius), 0, Math.PI * 2);
      const hueRand = isQuantum ? Math.random()*360 : (Math.random() * 60);
      const hue = lerp(180, 30 + hueRand, t);
      const saturation = isQuantum ? 90 : lerp(70, 90, t);
      const lightness = isQuantum ? 70 : lerp(60, 50 + Math.random() * 10, t);

      ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
      ctx.lineWidth = lineW;

      if (entropy > 0.8 && Math.random() < 0.1 * entropy && !isVoidEcho && !isQuantum) {
        ctx.setLineDash([5 + Math.random() * 10, 5 + Math.random() * 10]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }, []);

  const drawMetatronLines = useCallback((
    points: { x: number; y: number }[],
    entropy: number,
    ctx: CanvasRenderingContext2D,
    opacityFactor: number = 1,
    isShattered: boolean = false,
    isMirrorLoop: boolean = false
  ) => {
    const t = clamp(entropy, 0, 1);
    if (t < 0.1 && opacityFactor < 0.3) return;

    const baseAlpha = lerp(0.3, 0.8, t) * opacityFactor;
    const lineW = lerp(0.8, 2.8, t);

    const connections = [];
    if (points.length === 19 || points.length > 13) { // Typical FoL derived points for Metatron
      // Inner connections (Fruit of Life to its own points)
      for (let i = 1; i <= 6; i++) { // Inner ring to center
          connections.push([0, i]);
          for (let j = i + 1; j <= 6; j++) { // Inner ring to each other
              connections.push([i, j]);
          }
      }
       // Outer ring connections
      for (let i = 7; i <= 12; i++) { // Outer ring to center
        connections.push([0, i]);
        for (let j = i + 1; j <= 12; j++) { // Outer ring to each other (selectively)
            if (Math.abs(points[i].x - points[j].x) < baseRadiusForCircles * 2.5 && Math.abs(points[i].y - points[j].y) < baseRadiusForCircles * 2.5 ) {
                 connections.push([i,j]);
            }
        }
        // Inner ring to outer ring (straight lines)
        for (let k = 1; k <=6; k++) {
            if(Math.abs(points[i].x - points[k].x) < baseRadiusForCircles * 1.5 && Math.abs(points[i].y - points[k].y) < baseRadiusForCircles * 1.5 ) {
                connections.push([i,k]);
            }
        }
      }
      // Add connections from outer layer of points (often used for Metatron's cube tips)
      if (points.length > 13) {
          for (let i = 13; i < points.length; i++) {
              for (let j = 0; j < 13; j++) { // Connect to original 13 FoL points
                  if (Math.random() < 0.3 + t*0.2) connections.push([i,j]); // Selective connection
              }
          }
      }
    } else { // General case if not standard FoL points
        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            connections.push([i,j]);
          }
        }
    }


    connections.forEach(([i,j]) => {
        if (isShattered && Math.random() < t * 0.4) return; // Chance for line to be missing

        ctx.beginPath();
        let x1 = points[i].x; let y1 = points[i].y;
        let x2 = points[j].x; let y2 = points[j].y;

        if (isShattered && t > 0.3) {
            const shatterOffset = t * 15;
            x1 += (Math.random()-0.5)*shatterOffset; y1 += (Math.random()-0.5)*shatterOffset;
            x2 += (Math.random()-0.5)*shatterOffset; y2 += (Math.random()-0.5)*shatterOffset;
        }

        ctx.moveTo(x1,y1);

        if (isMirrorLoop && Math.random() < t * 0.3) { // Loop back
            const cpx1 = x1 + (x2-x1)*0.5 + (Math.random()-0.5)*50*t;
            const cpy1 = y1 + (y2-y1)*0.5 + (Math.random()-0.5)*50*t;
            ctx.quadraticCurveTo(cpx1, cpy1, x1 + (Math.random()-0.5)*10*t, y1 + (Math.random()-0.5)*10*t);
        } else if (entropy > 0.7) {
          const segments = 3 + Math.floor(t*2);
          for (let k = 1; k <= segments; k++) {
            const prog = k / segments;
            const currentX = lerp(x1, x2, prog); const currentY = lerp(y1, y2, prog);
            if (isShattered && Math.random() < t * 0.6) {
                ctx.stroke(); ctx.beginPath();
                ctx.moveTo(currentX + (Math.random()-0.5)*5*t, currentY + (Math.random()-0.5)*5*t);
            } else {
                ctx.lineTo(currentX + (Math.random()-0.5)*2*t, currentY + (Math.random()-0.5)*2*t);
            }
          }
        } else {
          ctx.lineTo(x2, y2);
        }
        const hue = lerp(60, (isShattered ? 0 : 30) + Math.random() * 40, t);
        const saturation = 100;
        const lightness = lerp(70, 55 + Math.random() * 10, t);
        const alpha = baseAlpha * (0.5 + Math.random()*0.5);
        ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        ctx.lineWidth = lineW * (0.7 + Math.random()*0.6);
        ctx.stroke();
    });

  }, [baseRadiusForCircles]);

  const drawRecursivePolygons = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    radius: number, sides: number,
    angleOffset: number, depth: number, maxDepth: number,
    entropy: number, isBioFractal: boolean = false
  ) => {
    if (depth > maxDepth || radius < (isBioFractal ? 2.5 : 1.5)) return;

    const t = clamp(entropy, 0, 1);
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 + angleOffset;
      let currentX = x + Math.cos(angle) * radius;
      let currentY = y + Math.sin(angle) * radius;
      if (t > 0.6) {
        const jitter = radius * t * (isBioFractal ? 0.3 : 0.2);
        currentX += (Math.random() - 0.5) * jitter;
        currentY += (Math.random() - 0.5) * jitter;
      }
      points.push({ x: currentX, y: currentY });
    }

    ctx.beginPath();
    ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
    if (isBioFractal && depth > 0) { // Organic curves for bio-fractal
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const cpX = midX + (Math.random() - 0.5) * radius * 0.3 * t;
            const cpY = midY + (Math.random() - 0.5) * radius * 0.3 * t;
            ctx.quadraticCurveTo(cpX, cpY, p2.x, p2.y);
        }
    } else {
        points.forEach(p => ctx.lineTo(p.x, p.y));
    }
    ctx.closePath();

    const baseHue = isBioFractal ? lerp(100, 70, t) : lerp(200 - depth * 20, 300 + depth * 10 - t * 60, t);
    const saturation = isBioFractal ? lerp(60, 40, t) : lerp(60 + depth * 5, 80 - t * 30, t);
    const lightness = isBioFractal ? lerp(40, 30, t) : lerp(50 - depth * 4, 30 + t * 20, t);
    const alpha = lerp(0.5 - depth * 0.1, 0.1 + t * 0.2, t) * (1 - depth / (maxDepth + 1));

    ctx.strokeStyle = `hsla(${baseHue % 360}, ${saturation}%, ${lightness}%, ${clamp(alpha, 0.05, 0.8)})`;
    ctx.lineWidth = Math.max(0.5, (isBioFractal ? 3 : 2) - depth * 0.3) * (1 - t * 0.5);
    if(isBioFractal && Math.random() < t*0.1) ctx.setLineDash([2,2]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (t > 0.8 && Math.random() < t * 0.1 * depth) return;

    const newSides = Math.max(3, sides - (t > 0.5 && !isBioFractal ? 1 : 0));
    const newRadiusFactor = isBioFractal ? (0.65 + (1-t)*0.1) : (0.55 + (1 - t) * 0.15);
    const newRadius = radius * newRadiusFactor;
    const newAngleOffsetFactor = (isBioFractal ? 0.2 : 0.1) + t * 0.3;

    points.forEach((p, i) => {
      drawRecursivePolygons(ctx, p.x, p.y, newRadius, newSides, angleOffset + i * newAngleOffsetFactor + t * (Math.random()-0.5) * 0.2, depth + 1, maxDepth, entropy, isBioFractal);
    });
  }, []);

  const drawConcentricRings = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, maxR: number, numRings: number, entropy: number, frameCount: number) => {
    const t = clamp(entropy,0,1);
    for(let i=0; i<numRings; i++){
        const progress = (i / numRings + frameCount * 0.002 * (1 + t*2) * (i%2 === 0 ? 1 : -0.8)) % 1;
        const radius = progress * maxR;
        const alpha = (1 - progress) * (0.2 + (1-t)*0.6) * (0.5 + Math.sin(frameCount*0.03 + i*0.5)*0.4);
        if(alpha < 0.01) continue;
        const hue = (200 + frameCount*0.1 + i*20 + t*60)%360;
        ctx.strokeStyle = `hsla(${hue}, 80%, ${60+t*15}%, ${alpha})`;
        ctx.lineWidth = 0.5 + (1-t)*2.5 + Math.sin(frameCount*0.04 + i*0.7)*0.5*(1-t);
        ctx.beginPath(); ctx.arc(centerX,centerY,Math.max(0, radius),0,Math.PI*2); ctx.stroke();
    }
  }, []);

  const drawHypercubeProjection = useCallback((ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, angles: {xy:number,zw:number,xw:number}, entropy:number)=>{
    // Simplified tesseract vertices in 4D
    const vertices4D = [];
    for(let i=0; i<16; ++i) {
        vertices4D.push([
            (i & 1) ? 1 : -1, (i & 2) ? 1 : -1,
            (i & 4) ? 1 : -1, (i & 8) ? 1 : -1
        ]);
    }
    // Edges of a tesseract
    const edges = [ /* Simplified, e.g. only outer cube for clarity or specific edges */
        [0,1],[1,3],[3,2],[2,0], [4,5],[5,7],[7,6],[6,4], [0,4],[1,5],[2,6],[3,7], // Inner cube
        [8,9],[9,11],[11,10],[10,8], [12,13],[13,15],[15,14],[14,12], [8,12],[9,13],[10,14],[11,15], // Outer cube
        [0,8],[1,9],[2,10],[3,11],[4,12],[5,13],[6,14],[7,15] // Connecting edges
    ];

    const project = (v4d: number[]) => {
        let x=v4d[0], y=v4d[1], z=v4d[2], w=v4d[3];
        // Apply rotations
        [x,y] = [x*Math.cos(angles.xy)-y*Math.sin(angles.xy), x*Math.sin(angles.xy)+y*Math.cos(angles.xy)];
        [z,w] = [z*Math.cos(angles.zw)-w*Math.sin(angles.zw), z*Math.sin(angles.zw)+w*Math.cos(angles.zw)];
        [x,w] = [x*Math.cos(angles.xw)-w*Math.sin(angles.xw), x*Math.sin(angles.xw)+w*Math.cos(angles.xw)];
        
        const perspective = 1.5 / (4 - z - w*0.5); // Simple perspective
        return { x: cx + x * size * perspective, y: cy + y * size * perspective };
    };

    edges.forEach(([i,j])=>{
        const p1 = project(vertices4D[i]);
        const p2 = project(vertices4D[j]);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        const hue = (180 + entropy*90)%360;
        ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${0.3 - entropy*0.2})`;
        ctx.lineWidth = 1 + entropy;
        ctx.stroke();
        // Echoes
        for(let k=1; k<=2; k++){
            const echoAngleOffset = k*0.1*entropy;
            const echoSizeFactor = 1 - k*0.05*entropy;
            const p1e = project(vertices4D[i].map(c=>c*echoSizeFactor));
            const p2e = project(vertices4D[j].map(c=>c*echoSizeFactor));
            ctx.beginPath();
            ctx.moveTo(p1e.x + Math.cos(angles.xy+echoAngleOffset)*k*5, p1e.y + Math.sin(angles.xy+echoAngleOffset)*k*5);
            ctx.lineTo(p2e.x + Math.cos(angles.xy+echoAngleOffset)*k*5, p2e.y + Math.sin(angles.xy+echoAngleOffset)*k*5);
            ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${0.15 - entropy*0.1 - k*0.05})`;
            ctx.stroke();
        }
    });
  }, []);

  const drawStarlightPattern = useCallback((ctx: CanvasRenderingContext2D, points: {x:number,y:number}[], entropy:number, frameCount:number)=>{
    const t = clamp(entropy,0,1);
    points.forEach((p, idx) => {
        const size = 2 + t*3 + Math.sin(frameCount*0.03 + idx*0.5)* (1+t);
        const hue = (45 + Math.random()*30 + t*30)%360;
        ctx.fillStyle = `hsla(${hue}, 100%, ${75 + Math.random()*15}%, ${0.5 + t*0.3})`;
        ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0, size),0,Math.PI*2); ctx.fill();
        ctx.shadowBlur = Math.max(0, size*1.5); ctx.shadowColor = `hsla(${hue},100%,80%,0.5)`; ctx.fill();
    });
    ctx.shadowBlur=0;

    for(let i=0; i<points.length; i++){
        for(let j=i+1; j<points.length; j++){
            if(Math.random() > 0.1 + (1-t)*0.3) continue;
            ctx.beginPath(); ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[j].x, points[j].y);
            ctx.strokeStyle = `hsla(200, 70%, 80%, ${0.05 + Math.random()*0.1 * (1-t)})`;
            ctx.lineWidth = 0.2 + Math.random()*0.5 * (1-t);
            ctx.stroke();
        }
    }
  }, []);

  const drawVectorField = useCallback((ctx: CanvasRenderingContext2D, points: {x:number,y:number}[], entropy:number, frameCount:number)=>{
    const t = clamp(entropy,0,1);
    const noiseScale = 0.01 + t * 0.02;
    const vecLength = baseRadiusForCircles * (0.5 + t*0.8);
    points.forEach(p=>{
        // Simple noise function using sin/cos
        const angleNoise = Math.sin(p.x * noiseScale + frameCount*0.005) * Math.cos(p.y*noiseScale + frameCount*0.003) * Math.PI;
        const angle = angleNoise * (1 + t*2); // More chaotic angles with entropy
        const endX = p.x + Math.cos(angle) * vecLength;
        const endY = p.y + Math.sin(angle) * vecLength;
        ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(endX, endY);
        const hue = (150 + angle * 30 + t*90)%360;
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.3 + t*0.4})`;
        ctx.lineWidth = 0.5 + t*1.5;
        ctx.stroke();
        // Arrowhead
        const arrowSize = 3 + t*3;
        ctx.beginPath();
        ctx.moveTo(endX,endY);
        ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI/6), endY - arrowSize * Math.sin(angle - Math.PI/6));
        ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI/6), endY - arrowSize * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.3 + t*0.4})`;
        ctx.fill();
    });
  }, [baseRadiusForCircles]);

  const drawFoLDNAHelixConnections = useCallback((
    ctx: CanvasRenderingContext2D,
    points: {x: number, y: number, id: string, baseHue: number}[],
    paths: [number,number][],
    entropy: number,
    frame: number,
    isChaliceFullOverride: boolean = false // Default for FoL context
  ) => {
    if (points.length === 0) return;
    const t = clamp(entropy, 0, 1);
    
    paths.forEach(([idx1, idx2]) => {
      const s1 = points[idx1];
      const s2 = points[idx2];

      if (s1 && s2) {
        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) return;
        const angle = Math.atan2(dy, dx);

        const amplitude = lerp(8, 3 + t * 8, t) * (isChaliceFullOverride ? 1.2 : 1);
        const frequency = lerp(3, 1 + t * 3, t) * (len / 100);
        const phaseOffset = frame * 0.03 * (1 + t * 2);
        const numSegments = Math.max(10, Math.floor(len / (5 + t * 5)));
        
        const strandColorHue = ((s1.baseHue || 0) + (s2.baseHue || 0)) / 2 + lerp(0, (Math.random() - 0.5) * 60, t);
        const strandSaturation = lerp(70, 50 + t * 30, t);
        const strandLightness = lerp(60, 40 + t * 20, t);
        const strandAlpha = lerp(0.5, 0.2 + t * 0.4, t) * (isChaliceFullOverride ? 1.3 : 1);
        const strandWidth = lerp(1.5, 0.5 + t * 1.5, t) * (isChaliceFullOverride ? 1.1 : 1);

        const points1: {x: number, y: number}[] = [];
        const points2: {x: number, y: number}[] = [];

        for (let i = 0; i <= numSegments; i++) {
          const progress = i / numSegments;
          const currentX_on_path = s1.x + dx * progress;
          const currentY_on_path = s1.y + dy * progress;
          
          const sineVal = Math.sin(progress * frequency * Math.PI * 2 + phaseOffset);
          const offsetX = -amplitude * sineVal * Math.sin(angle);
          const offsetY = amplitude * sineVal * Math.cos(angle);

          points1.push({ x: currentX_on_path + offsetX, y: currentY_on_path + offsetY });
          points2.push({ x: currentX_on_path - offsetX, y: currentY_on_path - offsetY });
        }

        ctx.beginPath();
        ctx.moveTo(points1[0].x, points1[0].y);
        for(let i = 1; i < points1.length; i++) ctx.lineTo(points1[i].x, points1[i].y);
        ctx.strokeStyle = `hsla(${strandColorHue}, ${strandSaturation}%, ${strandLightness}%, ${strandAlpha})`;
        ctx.lineWidth = strandWidth;
        if (t > 0.65) ctx.setLineDash([3 + t*3, 2 + t*2]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(points2[0].x, points2[0].y);
        for(let i = 1; i < points2.length; i++) ctx.lineTo(points2[i].x, points2[i].y);
        ctx.strokeStyle = `hsla(${(strandColorHue + 20) % 360}, ${strandSaturation - 10}%, ${strandLightness - 5}%, ${strandAlpha * 0.8})`;
        ctx.lineWidth = strandWidth * 0.8;
        if (t > 0.7) ctx.setLineDash([4 + t*2, 2 + t]);
        ctx.stroke();
        ctx.setLineDash([]);

        const rungSpacing = Math.max(5, Math.floor(len / (5 + t * 10)));
        for (let i = 0; i <= numSegments; i += Math.max(1, Math.floor(numSegments / rungSpacing))) {
            if (!points1[i] || !points2[i]) continue;
            ctx.beginPath();
            ctx.moveTo(points1[i].x, points1[i].y);
            ctx.lineTo(points2[i].x, points2[i].y);
            const rungAlpha = lerp(0.3, 0.1 + t * 0.3, t) * (isChaliceFullOverride ? 1.2 : 1);
            const rungLightness = lerp(70, 50 + t * 15, t);
            ctx.strokeStyle = `hsla(${(strandColorHue + 180)%360}, ${strandSaturation - 20}%, ${rungLightness}%, ${rungAlpha})`;
            ctx.lineWidth = Math.max(0.3, strandWidth * 0.5 * (1-t*0.3));
            if (t > 0.75 && Math.random() < t*0.3) continue;
            ctx.stroke();
        }
      }
    });
  }, [width, height]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    
    let frameCount = 0;
    let hypercubeAngles = { xy: 0, zw: 0, xw: 0 };


    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);
      drawBackground(ctx, currentEntropy, currentDisplayMode);
      updateAndDrawParticles(ctx, currentEntropy, currentDisplayMode, frameCount);

      if (fruitOfLifePoints.length === 0 && 
          !(currentDisplayMode === GeoMode.Recursive || 
            currentDisplayMode === VisualizationMatrixMode.FractalCascade ||
            currentDisplayMode === GeoMode.AethericWeave ||
            currentDisplayMode === GeoMode.OracleWhisper || // Particle based
            currentDisplayMode === VisualizationMatrixMode.AshfallCycle || // Particle based
            currentDisplayMode === GeoMode.ShieldedChaos || // Particle + shield
            currentDisplayMode === GeoMode.VortexSingularity || // Particle based
            currentDisplayMode === GeoMode.HypercubeEcho // Not point based
           )) {
          animationFrameIdRef.current = requestAnimationFrame(render);
          return;
      }

      const t = clamp(currentEntropy, 0, 1);

      switch(currentDisplayMode) {
        case GeoMode.Recursive:
        case VisualizationMatrixMode.FractalCascade:
            const maxDepth = 2 + Math.floor(t * 4.5); 
            const initialRadius = Math.min(width, height) * (0.25 - t * 0.12);
            const initialSides = 3 + Math.floor(t * 3.5); 
            const rotationSpeed = 0.0005 + t * 0.001;
            drawRecursivePolygons(ctx, width/2, height/2, initialRadius, initialSides, frameCount * rotationSpeed, 0, maxDepth, currentEntropy);
            break;
        case GeoMode.BioFractalPulse:
            const maxDepthBio = 3 + Math.floor(t*3);
            const initialRadiusBio = Math.min(width,height)*(0.15 - t*0.05);
            drawRecursivePolygons(ctx, width/2, height*0.85, initialRadiusBio, 3, -Math.PI/2 + Math.sin(frameCount*0.01*(1+t))*0.1, 0, maxDepthBio, currentEntropy, true);
            break;
        case VisualizationMatrixMode.SacredLattice:
            drawFlowerCircles(fruitOfLifePoints, baseRadiusForCircles, currentEntropy, false, frameCount, ctx);
            ctx.lineWidth = lerp(0.5, 0.1 + t*0.2, t);
            ctx.strokeStyle = `hsla(200, 50%, 70%, ${lerp(0.3, 0.05 + t*0.1, t)})`;
            for(let i=0; i < fruitOfLifePoints.length; i++){
                for(let j=i+1; j < fruitOfLifePoints.length; j++){
                    const dist = Math.hypot(fruitOfLifePoints[i].x - fruitOfLifePoints[j].x, fruitOfLifePoints[i].y - fruitOfLifePoints[j].y);
                    if(dist < baseRadiusForCircles * 2.2 && dist > baseRadiusForCircles * 0.5){ 
                        ctx.beginPath();
                        ctx.moveTo(fruitOfLifePoints[i].x, fruitOfLifePoints[i].y);
                        ctx.lineTo(fruitOfLifePoints[j].x, fruitOfLifePoints[j].y);
                        ctx.stroke();
                    }
                }
            }
            break;
        case VisualizationMatrixMode.EntropyPulse:
            drawFlowerCircles(fruitOfLifePoints, baseRadiusForCircles, currentEntropy, true, frameCount, ctx); 
            if (currentEntropy > 0.2) drawMetatronLines(fruitOfLifePoints, currentEntropy, ctx, 0.7);
            break;
        case VisualizationMatrixMode.VoidEcho:
        case GeoMode.NullShell:
            const numVoidCircles = Math.max(1, Math.floor((1 - t) * (currentDisplayMode === GeoMode.NullShell ? 5 : 10) ));
            const voidPoints = currentDisplayMode === GeoMode.NullShell ? [{x:width/2, y:height/2, id:'shell_center', baseHue:0}] : fruitOfLifePoints.sort(() => 0.5 - Math.random()).slice(0, numVoidCircles);
            const voidOpacity = currentDisplayMode === GeoMode.NullShell ? 0.8 : 0.5;
            drawFlowerCircles(voidPoints, baseRadiusForCircles * (currentDisplayMode === GeoMode.NullShell ? lerp(1.5,0.8,t) : (0.5 + t * 0.3)), currentEntropy, true, frameCount, ctx, voidOpacity, true);
            if(currentDisplayMode === GeoMode.NullShell && t < 0.5) drawConcentricRings(ctx, width/2, height/2, baseRadiusForCircles*2.5, 3+Math.floor((1-t)*3), currentEntropy, frameCount);
            break;
        case GeoMode.CrystalLogic:
            // This mode was meant to draw sharp polygons from fruit of life points
            // Re-using a simplified version of recursive polygons with fewer sides / depth
            const maxDepthCrystal = 1 + Math.floor(t * 2);
            const initialRadiusCrystal = baseRadiusForCircles * (1.2 - t*0.3);
            fruitOfLifePoints.forEach(p => {
                drawRecursivePolygons(ctx, p.x, p.y, initialRadiusCrystal * (0.2 + Math.random()*0.3), 3+Math.floor(Math.random()*2), frameCount*0.01, 0, maxDepthCrystal, currentEntropy);
            });
            break;
        case GeoMode.AethericWeave:
        case VisualizationMatrixMode.AethericFlow:
        case VisualizationMatrixMode.TemporalWeave:
             drawFlowerCircles(fruitOfLifePoints, baseRadiusForCircles * 0.3, currentEntropy, false, frameCount, ctx, 0.2); // Faint nodes
             drawMetatronLines(fruitOfLifePoints, currentEntropy, ctx, 0.1); // Very faint structure
             // Re-use particles for flow lines with AethericWeave type
             if (currentDisplayMode !== VisualizationMatrixMode.TemporalWeave && Math.random() < 0.4 + t*0.3){
                const p1Idx = Math.floor(Math.random()*fruitOfLifePoints.length);
                const p2Idx = Math.floor(Math.random()*fruitOfLifePoints.length);
                if(p1Idx !== p2Idx){
                    particlesRef.current.push({
                        x: fruitOfLifePoints[p1Idx].x, y: fruitOfLifePoints[p1Idx].y,
                        vx: (fruitOfLifePoints[p2Idx].x - fruitOfLifePoints[p1Idx].x) * 0.01,
                        vy: (fruitOfLifePoints[p2Idx].y - fruitOfLifePoints[p1Idx].y) * 0.01,
                        life: 50 + Math.random()*100,
                        color: `hsla(${(180 + t*60 + Math.random()*40)%360}, 70%, 60%, ${0.4 + Math.random()*0.3})`,
                        type: 'aether_flow', size: 1 + Math.random()*(1+t), history:[]
                    });
                }
             }
            // Temporal Weave has specific particle logic in updateAndDrawParticles if needed
            break;
        case GeoMode.OracleWhisper: // Primarily particle based, handled by updateAndDrawParticles
            break; 
        case GeoMode.ShieldedChaos: // Central particles handled, draw shield boundary
            const shieldR = Math.min(width,height) * 0.2 * (1 + (1-t)*0.5);
            ctx.beginPath(); ctx.arc(width/2, height/2, Math.max(0, shieldR), 0, Math.PI*2);
            ctx.strokeStyle=`hsla(${(200 - t*60)%360}, 80%, 60%, ${0.2 + (1-t)*0.6 + Math.sin(frameCount*0.05)*0.1})`;
            ctx.lineWidth = 2 + (1-t)*5;
            ctx.setLineDash(t > 0.5 ? [5+t*5, 3+t*3] : []); ctx.stroke(); ctx.setLineDash([]);
            break;
        case GeoMode.VortexSingularity: // Particle based
            const coreR = 5 + t*15; ctx.fillStyle = `hsla(0,0%,${5+t*10}%,${0.6+t*0.3})`;
            ctx.beginPath(); ctx.arc(width/2, height/2, Math.max(0, coreR), 0, Math.PI*2); ctx.fill();
            break;
        case GeoMode.HypercubeEcho:
            hypercubeAngles.xy += 0.005 * (1+t); hypercubeAngles.zw += 0.008 * (1+t); hypercubeAngles.xw += 0.003 * (1+t);
            drawHypercubeProjection(ctx, width/2, height/2, baseRadiusForCircles*1.5, hypercubeAngles, currentEntropy);
            break;
        case GeoMode.StarlightConductor:
        case VisualizationMatrixMode.StellarThread:
            drawStarlightPattern(ctx, fruitOfLifePoints, currentEntropy, frameCount);
            break;
        case GeoMode.PhaseResonance:
            drawConcentricRings(ctx, width/2, height/2, baseRadiusForCircles*3, 5+Math.floor((1-t)*5),currentEntropy,frameCount);
            break;
        case VisualizationMatrixMode.AxiomaticOverlay:
            drawFlowerCircles(fruitOfLifePoints, baseRadiusForCircles, currentEntropy, false, frameCount, ctx);
            drawMetatronLines(fruitOfLifePoints, currentEntropy, ctx);
            fruitOfLifePoints.forEach((p,idx)=>{
                const shapeType = idx % 3;
                ctx.beginPath();
                const shapeSize = baseRadiusForCircles * (0.1 + t*0.1);
                if(shapeType === 0){ // Triangle
                    for(let k=0; k<3; k++){
                        const angle = k * Math.PI*2/3 + frameCount*0.01;
                        const sx = p.x + Math.cos(angle)*shapeSize;
                        const sy = p.y + Math.sin(angle)*shapeSize;
                        if(k===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
                    }
                } else if(shapeType === 1) { // Square
                     for(let k=0; k<4; k++){
                        const angle = k * Math.PI*2/4 + Math.PI/4 + frameCount*0.01;
                        const sx = p.x + Math.cos(angle)*shapeSize;
                        const sy = p.y + Math.sin(angle)*shapeSize;
                        if(k===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
                    }
                } else { // Hexagon
                    for(let k=0; k<6; k++){
                        const angle = k * Math.PI*2/6 + frameCount*0.01;
                        const sx = p.x + Math.cos(angle)*shapeSize;
                        const sy = p.y + Math.sin(angle)*shapeSize;
                        if(k===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
                    }
                }
                ctx.closePath();
                ctx.strokeStyle = `hsla(${(idx*30 + t*60)%360}, 70%, 70%, ${0.3+t*0.3})`;
                ctx.lineWidth = 0.5 + t;
                ctx.stroke();
            });
            break;
        case VisualizationMatrixMode.GlyphicResonance:
            drawFlowerCircles(fruitOfLifePoints, baseRadiusForCircles, currentEntropy, true, frameCount, ctx);
            drawMetatronLines(fruitOfLifePoints, currentEntropy, ctx);
            // Highlight a few lines/circles
            const resonantIdx = frameCount % fruitOfLifePoints.length;
            const pRes = fruitOfLifePoints[resonantIdx];
            if(pRes){
                ctx.beginPath(); ctx.arc(pRes.x, pRes.y, Math.max(0, baseRadiusForCircles*(1.1+t*0.2)),0,Math.PI*2);
                ctx.strokeStyle = `hsla(60,100%,70%,${0.5+t*0.3})`; ctx.lineWidth=2+t; ctx.stroke();
            }
            break;
        case VisualizationMatrixMode.NexusPoint:
            const centerPt = fruitOfLifePoints[0];
            if(centerPt) {
                drawFlowerCircles([centerPt], baseRadiusForCircles*(1.5+t*0.5), currentEntropy,true,frameCount,ctx, 1);
                fruitOfLifePoints.slice(1).forEach(p => {
                    drawFlowerCircles([p], baseRadiusForCircles*0.5,currentEntropy,false,frameCount,ctx,0.3);
                    ctx.beginPath(); ctx.moveTo(centerPt.x,centerPt.y); ctx.lineTo(p.x,p.y);
                    ctx.strokeStyle=`hsla(0,0%,70%,${0.1+t*0.1})`; ctx.lineWidth=0.5;ctx.stroke();
                });
            }
            break;
        case VisualizationMatrixMode.MythicReflection:
            drawFlowerCircles(fruitOfLifePoints, baseRadiusForCircles, currentEntropy, false, frameCount, ctx);
            drawMetatronLines(fruitOfLifePoints, currentEntropy, ctx);
            // Reflection (offset, fainter, different hue)
            const reflectedPoints = fruitOfLifePoints.map(p => ({...p, x: p.x + 20*t, y:p.y - 10*t}));
            drawFlowerCircles(reflectedPoints, baseRadiusForCircles*(1-t*0.1), currentEntropy*1.2, false, frameCount,ctx,0.4);
            drawMetatronLines(reflectedPoints, currentEntropy*1.2, ctx, 0.3);
            break;
        case VisualizationMatrixMode.MirrorLoop:
            drawFlowerCircles(fruitOfLifePoints, baseRadiusForCircles, currentEntropy, false, frameCount, ctx);
            drawMetatronLines(fruitOfLifePoints, currentEntropy, ctx, 1, false, true);
            break;
        case VisualizationMatrixMode.MirrorShatter:
            drawFlowerCircles(fruitOfLifePoints, baseRadiusForCircles, currentEntropy, false, frameCount, ctx);
            drawMetatronLines(fruitOfLifePoints, currentEntropy, ctx, 1, true);
            break;
        case VisualizationMatrixMode.SymphonicPulse:
            // Coordinated pulse for all elements
            const symphonicPulseVal = 0.5 + Math.sin(frameCount*0.03*(1+t*2)) * 0.5;
            const R_sym = baseRadiusForCircles * (0.8 + symphonicPulseVal*0.4);
            drawFlowerCircles(fruitOfLifePoints, R_sym, currentEntropy, false, frameCount, ctx, symphonicPulseVal*0.8 + 0.2);
            drawMetatronLines(fruitOfLifePoints, currentEntropy, ctx, symphonicPulseVal*0.7+0.1);
            break;
        case VisualizationMatrixMode.QuantumBloom: // Mainly particle based
             drawFlowerCircles(fruitOfLifePoints, baseRadiusForCircles, currentEntropy, true, frameCount, ctx, 1, false, true);
            break;
        case VisualizationMatrixMode.SoulVector:
            drawVectorField(ctx, fruitOfLifePoints, currentEntropy, frameCount);
            break;
        case VisualizationMatrixMode.AshfallCycle: // Particle based
            break;
        case VisualizationMatrixMode.HypersphereField:
            fruitOfLifePoints.forEach((p,idx)=>{
                const sphereSize = baseRadiusForCircles*(0.5 + Math.random()*0.8)*(1-t*0.3);
                const sphereAlpha = 0.1 + Math.random()*0.3 * (1-t);
                const sphereHue = (220 + idx*15 + t*40)%360;
                ctx.beginPath(); ctx.arc(p.x,p.y, Math.max(0, sphereSize),0,Math.PI*2);
                const grad = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(0, sphereSize));
                grad.addColorStop(0, `hsla(${sphereHue},60%,70%,${sphereAlpha*0.5})`);
                grad.addColorStop(1, `hsla(${sphereHue},60%,50%,${sphereAlpha*0.1})`);
                ctx.fillStyle = grad; ctx.fill();
            });
            break;
        case GeoMode.GlyphDNA:
            drawFlowerCircles(fruitOfLifePoints, baseRadiusForCircles, currentEntropy, false, frameCount, ctx);
            drawFoLDNAHelixConnections(ctx, fruitOfLifePoints, FLOWER_PATHS_BY_INDEX, currentEntropy, frameCount);
            break;
        case VisualizationMatrixMode.DimensionalBloom:
        default:
            drawFlowerCircles(fruitOfLifePoints, baseRadiusForCircles, currentEntropy, false, frameCount, ctx);
            drawMetatronLines(fruitOfLifePoints, currentEntropy, ctx);
            break;
      }
      
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [
    width, height, currentEntropy, fruitOfLifePoints, baseRadiusForCircles, currentDisplayMode, 
    drawRecursivePolygons, drawFlowerCircles, drawMetatronLines, drawBackground,
    drawConcentricRings, drawHypercubeProjection, drawStarlightPattern, drawVectorField,
    updateAndDrawParticles, drawFoLDNAHelixConnections // Added drawFoLDNAHelixConnections
  ]);

  const availableModes: PanelDisplayMode[] = useMemo(() => {
    const geoModes = Object.values(GeoMode);
    const vizMatrixModes = Object.values(VisualizationMatrixMode);
    const combined = [...new Set([...geoModes, ...vizMatrixModes])];
    return combined as PanelDisplayMode[];
  }, []);

  return (
    <div className="flower-of-life-explorer bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 rounded-xl shadow-2xl p-6 my-8 text-slate-100">
      <h2 className="text-2xl font-['Cinzel'] font-bold mb-1 text-center text-cyan-200 drop-shadow-[0_1px_1px_rgba(200,255,255,0.4)]">
        Geometric Entropy Explorer
      </h2>
      <ModeSelectorAny<PanelDisplayMode>
        currentMode={currentDisplayMode}
        onSetMode={onSetDisplayMode}
        availableModes={availableModes}
        modeGroupName="Visualization Style"
      />
      <div className="relative mx-auto mt-2" style={{ width: `${width}px`, height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-slate-700/30"
          aria-label="Geometric visualization reacting to entropy and selected mode"
          role="img"
        />
      </div>
       <div className="mt-3 text-center text-xs text-slate-400 font-mono">
        Mode: {currentDisplayMode} | Entropy: {(currentEntropy || 0).toFixed(3)}δ
      </div>
    </div>
  );
};

export default FlowerOfLifeEntropyExplorer;
