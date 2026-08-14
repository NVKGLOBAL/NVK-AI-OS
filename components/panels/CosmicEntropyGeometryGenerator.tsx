
import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { GeoMode, type CosmicEntropyGeometryGeneratorProps as ExternalProps, type Particle } from '../../types'; 
import { VisualizationMatrixMode } from '../../types';
import ModeSelector from '../core/ModeSelector'; 

// Interface matching the props passed from App.tsx
interface CosmicEntropyGeometryGeneratorProps extends ExternalProps {
  // currentGeoMode and onSetGeoMode are already in ExternalProps
}

// FIX: Define a type for the sephirot position data to help TypeScript's inference.
type SephirahPositionData = {
  id: string;
  name: string;
  x: number;
  y: number;
  baseHue: number;
};

// FIX: Define a type for fruit of life points to help TypeScript's inference.
type FruitOfLifePoint = {
    x: number;
    y: number;
    id: string;
    baseHue: number;
};


const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// Define Sephirot layout (normalized)
const SEPHIROT_LAYOUT: Record<string, {id: string, name: string, normX: number, normY: number, baseHue: number }> = {
  KETER:    { id: 'keter', name: 'Keter', normX: 0, normY: -0.9, baseHue: 0 },
  CHOKMAH:  { id: 'chokmah', name: 'Chokmah', normX: 0.35, normY: -0.65, baseHue: 240 },
  BINAH:    { id: 'binah', name: 'Binah', normX: -0.35, normY: -0.65, baseHue: 300 },
  DAAT:     { id: 'daat', name: 'Da\'at', normX: 0, normY: -0.4, baseHue: 180 }, 
  CHESED:   { id: 'chesed', name: 'Chesed', normX: 0.35, normY: -0.15, baseHue: 210 },
  GEBURAH:  { id: 'geburah', name: 'Geburah', normX: -0.35, normY: -0.15, baseHue: 0 },
  TIPHARETH:{ id: 'tiphareth', name: 'Tiphareth', normX: 0, normY: 0.1, baseHue: 60 },
  NETZACH:  { id: 'netzach', name: 'Netzach', normX: 0.35, normY: 0.55, baseHue: 120 },
  HOD:      { id: 'hod', name: 'Hod', normX: -0.35, normY: 0.55, baseHue: 30 },
  YESOD:    { id: 'yesod', name: 'Yesod', normX: 0, normY: 0.75, baseHue: 270 },
  MALKUTH:  { id: 'malkuth', name: 'Malkuth', normX: 0, normY: 0.95, baseHue: 100 },
};

const TREE_PATHS: [keyof typeof SEPHIROT_LAYOUT, keyof typeof SEPHIROT_LAYOUT][] = [
  ['KETER', 'CHOKMAH'], ['KETER', 'BINAH'], ['KETER', 'TIPHARETH'],
  ['CHOKMAH', 'BINAH'], ['CHOKMAH', 'TIPHARETH'], ['CHOKMAH', 'CHESED'],
  ['BINAH', 'TIPHARETH'], ['BINAH', 'GEBURAH'],
  ['CHESED', 'GEBURAH'], ['CHESED', 'TIPHARETH'], ['CHESED', 'NETZACH'],
  ['GEBURAH', 'TIPHARETH'], ['GEBURAH', 'HOD'],
  ['TIPHARETH', 'NETZACH'], ['TIPHARETH', 'HOD'], ['TIPHARETH', 'YESOD'],
  ['NETZACH', 'HOD'], ['NETZACH', 'YESOD'],
  ['HOD', 'YESOD'],
  ['YESOD', 'MALKUTH'],
  ['KETER', 'DAAT'], ['CHOKMAH', 'DAAT'], ['BINAH', 'DAAT'],
  ['CHESED', 'DAAT'], ['GEBURAH', 'DAAT'], ['TIPHARETH', 'DAAT']
];

const TESSERACT_VERTICES_4D = [
    [-1, -1, -1, -1], [1, -1, -1, -1], [1, 1, -1, -1], [-1, 1, -1, -1],
    [-1, -1, 1, -1], [1, -1, 1, -1], [1, 1, 1, -1], [-1, 1, 1, -1],
    [-1, -1, -1, 1], [1, -1, -1, 1], [1, 1, -1, 1], [-1, 1, -1, 1],
    [-1, -1, 1, 1], [1, -1, 1, 1], [1, 1, 1, 1], [-1, 1, 1, 1]
];

const TESSERACT_EDGES = [
    [0,1],[1,2],[2,3],[3,0], [4,5],[5,6],[6,7],[7,4], [0,4],[1,5],[2,6],[3,7],
    [8,9],[9,10],[10,11],[11,8], [12,13],[13,14],[14,15],[15,12], [8,12],[9,13],[10,14],[11,15],
    [0,8],[1,9],[2,10],[3,11], [4,12],[5,13],[6,14],[7,15]
];

const getPhaseColorHueOffset = (phase: string): number => {
    let hash = 0;
    for (let i = 0; i < phase.length; i++) {
        hash = (hash << 5) - hash + phase.charCodeAt(i);
        hash |= 0; 
    }
    return (hash % 120) - 60; 
};

// FIX: Explicitly type the return value of the function.
const getFruitOfLifePoints = (centerX: number, centerY: number, R_distance: number): FruitOfLifePoint[] => {
    const points: FruitOfLifePoint[] = [];
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


const CosmicEntropyGeometryGenerator: React.FC<CosmicEntropyGeometryGeneratorProps> = ({ 
  currentEntropy,
  currentPhase,
  chaliceStatus,
  width,
  height,
  currentGeoMode,
  onSetGeoMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const hypercubeRotationRef = useRef({xy:0, xz:0, xw:0, yz:0, yw:0, zw:0});

  const sephirotPositions = useMemo(() => {
    // FIX: Ensure a consistently typed object is returned to avoid type inference issues with Object.values.
    const positions: Record<string, SephirahPositionData> = {};
    if (width === 0 || height === 0) {
      return positions;
    }
    const centerX = width / 2;
    const centerY = height / 2;
    const scaleX = width * 0.42; 
    const scaleY = height * 0.42;
    Object.values(SEPHIROT_LAYOUT).forEach((s: typeof SEPHIROT_LAYOUT[string]) => {
      positions[s.id] = { 
        id: s.id,
        name: s.name,
        x: centerX + s.normX * scaleX, 
        y: centerY + s.normY * scaleY,
        baseHue: s.baseHue,
      };
    });
    return positions;
  }, [width, height]);

  const initializeParticles = useCallback(() => {
    particlesRef.current = [];
    const numParticlesBase = 50;
    const entropyFactor = 1 + currentEntropy * 2;

    switch(currentGeoMode) {
        case GeoMode.AethericWeave:
            particlesRef.current = Array.from({ length: Math.floor(numParticlesBase * 0.8 * entropyFactor) }, () => {
                const life = 50 + Math.random() * 100;
                return {
                    x: Math.random() * width, y: Math.random() * height,
                    vx: (Math.random() - 0.5) * (0.5 + currentEntropy), vy: (Math.random() - 0.5) * (0.5 + currentEntropy),
                    life: life, 
                    baseLife: life,
                    size: Math.random() * 1.5 + 0.5,
                    color: `hsla(${(180 + currentEntropy * 60 + Math.random()*40)%360}, 70%, 60%, ${0.3 + Math.random()*0.3})`,
                    type: 'aetherPoint', history: []
                };
            });
            break;
        case GeoMode.OracleWhisper: 
            particlesRef.current = Array.from({ length: Math.floor(numParticlesBase * 1.5 * entropyFactor) }, () => ({
                x: Math.random() * width, y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.1, vy: (Math.random() - 0.5) * 0.1,
                life: Infinity, size: Math.random() * 1.2 + 0.3,
                color: `hsla(${(270 + Math.random()*60)%360}, 80%, 75%, ${0.1 + Math.random()*0.2 + currentEntropy*0.1})`,
                type: 'whisper', history: []
            }));
            break;
        case GeoMode.ShieldedChaos:
             particlesRef.current = Array.from({length: Math.floor(numParticlesBase * 2 * entropyFactor)}, () => {
                const life = 30 + Math.random()*70 * (1-currentEntropy*0.5);
                return {
                    x: width/2, y: height/2,
                    vx: (Math.random()-0.5) * (2 + currentEntropy*6),
                    vy: (Math.random()-0.5) * (2 + currentEntropy*6),
                    life: life, 
                    baseLife: life,
                    size: Math.random()*2 + 0.5,
                    color: `hsla(${(Math.random()*60)%360}, 90%, 55%, ${0.5 + Math.random()*0.3})`,
                    type: 'chaosSpark', history: []
                };
              });
            break;
        case GeoMode.VortexSingularity:
            particlesRef.current = Array.from({length: Math.floor(numParticlesBase * 2.5 * entropyFactor)}, () => {
                const life = 80 + Math.random()*100;
                return {
                    angle: Math.random()*Math.PI*2,
                    dist: Math.random() * Math.min(width,height)*0.45 + Math.min(width,height)*0.02,
                    speed: 0.005 + Math.random()*0.015 + currentEntropy*0.025,
                    life: life, 
                    baseLife: life,
                    size: Math.random()*1.5 + 0.2,
                    x:0, y:0, vx:0, vy:0, // x,y will be calculated
                    color: `hsla(${(240 + currentEntropy*60 + Math.random()*50)%360}, 90%, 60%, ${0.4 + Math.random()*0.4})`,
                    type: 'vortexParticle', history: []
                };
              });
            break;
        case GeoMode.StarlightConductor:
            // FIX: Explicitly type the iteration variable `s`
            particlesRef.current = Object.values(sephirotPositions).map((s: SephirahPositionData) => ({
                x: s.x, y: s.y, vx:0, vy:0, life:Infinity, size: 4 + Math.random()*3 + currentEntropy*2,
                color: `hsla(${(s.baseHue + 30)%360}, 90%, 80%, ${0.7 + currentEntropy*0.2})`,
                type: 'starNode', id: s.id, history: []
            }));
            break;
         case GeoMode.ChaliceFountain:
            particlesRef.current = Array.from({ length: Math.floor(numParticlesBase * 1.2 * entropyFactor) }, () => {
                const life = 80 + Math.random() * 100;
                return {
                    x: width / 2, y: height * 0.85,
                    vx: (Math.random() - 0.5) * (0.8 + currentEntropy*1.5), 
                    vy: -(1.5 + Math.random() * 1.5 + (chaliceStatus === 'Overflowing' ? 1 : 0)), 
                    life: life, 
                    baseLife: life,
                    size: Math.random() * 2 + 1,
                    color: `hsla(${(180 + Math.random()*60)%360}, 80%, 70%, ${0.5 + Math.random()*0.3})`,
                    type: 'fountainDrop', history: []
                };
            });
            break;
        default: 
            const initialOpacity = 0.05 + Math.random()*0.2;
            particlesRef.current = Array.from({ length: Math.floor(numParticlesBase * 0.5 * entropyFactor) }, () => ({
                x: Math.random() * width, y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.08 * (1 + currentEntropy * 1.5), vy: (Math.random() - 0.5) * 0.08 * (1 + currentEntropy * 1.5),
                life: Infinity, size: Math.random() * 1.3 + 0.1,
                color: `hsla(${(220 + currentEntropy * 60)%360}, 50%, 70%, 1)`, 
                opacity: initialOpacity, 
                type: 'ambient', history: []
            }));
    }
  }, [width, height, currentEntropy, currentGeoMode, sephirotPositions, chaliceStatus]);

  useEffect(() => {
    initializeParticles();
  }, [initializeParticles]); 


  const drawTreeBase = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase: string, chalice: string) => {
    if (Object.keys(sephirotPositions).length === 0) return;
    const t = clamp(entropy,0,1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const isChaliceFull = chalice === 'Full' || chalice === 'Overflowing';

    TREE_PATHS.forEach(pathKeys => {
      const s1Node = SEPHIROT_LAYOUT[pathKeys[0]];
      const s2Node = SEPHIROT_LAYOUT[pathKeys[1]];
      if (!s1Node || !s2Node) return; // Should not happen if SEPHIROT_LAYOUT and TREE_PATHS are correct
      const s1 = sephirotPositions[s1Node.id];
      const s2 = sephirotPositions[s2Node.id];
      if (s1 && s2) {
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        
        const isDaatPath = s1Node.id === 'daat' || s2Node.id === 'daat';
        const pathAlpha = isDaatPath ? lerp(0.25, 0.08, t) : lerp(0.45, 0.18, t); 
        const pathHue = (s1.baseHue + s2.baseHue) / 2 + lerp(0, (Math.random() - 0.5) * 70, t) + phaseHueOffset;
        const pathSaturation = lerp(55, 25 + t * 45, t);
        const pathLightness = lerp(45, 30 + t * 25, t);
        
        ctx.strokeStyle = `hsla(${pathHue % 360}, ${pathSaturation}%, ${pathLightness}%, ${pathAlpha})`;
        ctx.lineWidth = lerp(2.0, 0.4 + t * 2.0, t) * (isChaliceFull ? 1.25 : 1);

        if (t > 0.6) { 
             const cp1x = s1.x + (s2.x - s1.x) * 0.33 + (Math.random() - 0.5) * 55 * t;
             const cp1y = s1.y + (s2.y - s1.y) * 0.33 + (Math.random() - 0.5) * 55 * t;
             const cp2x = s1.x + (s2.x - s1.x) * 0.66 + (Math.random() - 0.5) * 55 * t;
             const cp2y = s1.y + (s2.y - s1.y) * 0.66 + (Math.random() - 0.5) * 55 * t;
             ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, s2.x, s2.y);
        } else {
            ctx.lineTo(s2.x, s2.y);
        }
        if (t > 0.7 && Math.random() < t*0.25) { /* Skip stroke for fragmentation */ }
        else if (t > 0.5 || isDaatPath) { 
            const dashLength = isDaatPath ? lerp(4.5, 9 + t*9, t) : lerp(2.5, 6 + t*12, t);
            const gapLength = isDaatPath ? lerp(3.5, 6 + t*7, t) : lerp(2.5, 4 + t*6, t);
            ctx.setLineDash([dashLength, gapLength]);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            ctx.stroke();
        }
      }
    });

    // FIX: Explicitly type `sephirah` to resolve 'unknown' type errors.
    Object.values(sephirotPositions).forEach((sephirah: SephirahPositionData) => {
      const baseRadius = Math.min(width, height) * (sephirah.id === 'daat' ? 0.022 : 0.03); 
      const radius = baseRadius * lerp(1.15, 0.55 + Math.random() * 0.75, t);
      const hue = (sephirah.baseHue + lerp(0, (Math.random() - 0.5) * 75, t) + phaseHueOffset) % 360;
      const saturation = lerp(80, 55 + Math.random() * 45, t);
      const lightness = sephirah.id === 'keter' ? lerp(95, 75, t) : sephirah.id === 'binah' ? lerp(20, 30 + t*10, t) : lerp(60, 35 + Math.random()*40, t);
      const alpha = sephirah.id === 'daat' ? lerp(0.55, 0.25, t) : lerp(0.9, 0.45 + Math.random() * 0.55, t);

      const glowIntensity = isChaliceFull ? 1.6 : 1.1;
      const glowRadius = radius * lerp(1.6, 1.15 + Math.sin(frame * 0.035 + sephirah.baseHue * 0.12) * 0.35, t) * glowIntensity; 
      const glowAlpha = alpha * lerp(0.45, 0.18 + t * 0.35, t);
      const r0_glow = Math.max(0, radius * 0.55);
      const r1_glow = Math.max(r0_glow, glowRadius);

      const gradGlow = ctx.createRadialGradient(sephirah.x, sephirah.y, r0_glow, sephirah.x, sephirah.y, r1_glow);
      gradGlow.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness + 12}%, ${glowAlpha})`);
      gradGlow.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`);
      
      ctx.fillStyle = gradGlow;
      ctx.beginPath();
      ctx.arc(sephirah.x, sephirah.y, Math.max(0, r1_glow), 0, Math.PI * 2); // Ensure radius is non-negative
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sephirah.x, sephirah.y, Math.max(0, radius), 0, Math.PI * 2); // Ensure radius is non-negative
      ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
      ctx.fill();
    });
  }, [sephirotPositions, width, height]); 

  const drawDNAHelixConnections = useCallback((
    ctx: CanvasRenderingContext2D,
    // FIX: Explicitly type `sephirotMap` parameter.
    sephirotMap: Record<string, SephirahPositionData>,
    entropy: number,
    frame: number,
    chaliceInput?: string // Made chaliceStatus optional
  ) => {
    if (Object.keys(sephirotMap).length === 0) return;
    const t = clamp(entropy, 0, 1);
    const isChaliceFull = chaliceInput === 'Full' || chaliceInput === 'Overflowing';

    TREE_PATHS.forEach(pathKeys => {
      const s1Node = SEPHIROT_LAYOUT[pathKeys[0]];
      const s2Node = SEPHIROT_LAYOUT[pathKeys[1]];
      if (!s1Node || !s2Node) return;
      const s1 = sephirotMap[s1Node.id];
      const s2 = sephirotMap[s2Node.id];

      if (s1 && s2) {
        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) return;
        const angle = Math.atan2(dy, dx);

        const amplitude = lerp(8, 3 + t * 8, t) * (isChaliceFull ? 1.2 : 1); // Helix width
        const frequency = lerp(3, 1 + t * 3, t) * (len / 100); // Number of twists
        const phaseOffset = frame * 0.03 * (1 + t * 2);
        const numSegments = Math.max(10, Math.floor(len / (5 + t * 5))); // Density of points along helix
        
        const strandColorHue = (s1.baseHue + s2.baseHue) / 2 + lerp(0, (Math.random() - 0.5) * 60, t);
        const strandSaturation = lerp(70, 50 + t * 30, t);
        const strandLightness = lerp(60, 40 + t * 20, t);
        const strandAlpha = lerp(0.5, 0.2 + t * 0.4, t) * (isChaliceFull ? 1.3 : 1);
        const strandWidth = lerp(1.5, 0.5 + t * 1.5, t) * (isChaliceFull ? 1.1 : 1);

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

        // Draw strands
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

        // Draw rungs
        const rungSpacing = Math.max(5, Math.floor(len / (5 + t * 10))); // Fewer rungs at high entropy
        for (let i = 0; i <= numSegments; i += Math.max(1, Math.floor(numSegments / rungSpacing))) {
            if (!points1[i] || !points2[i]) continue;
            ctx.beginPath();
            ctx.moveTo(points1[i].x, points1[i].y);
            ctx.lineTo(points2[i].x, points2[i].y);
            const rungAlpha = lerp(0.3, 0.1 + t * 0.3, t) * (isChaliceFull ? 1.2 : 1);
            const rungLightness = lerp(70, 50 + t * 15, t);
            ctx.strokeStyle = `hsla(${(strandColorHue + 180)%360}, ${strandSaturation - 20}%, ${rungLightness}%, ${rungAlpha})`;
            ctx.lineWidth = Math.max(0.3, strandWidth * 0.5 * (1-t*0.3));
            if (t > 0.75 && Math.random() < t*0.3) continue; // Chance for rung to be missing
            ctx.stroke();
        }
      }
    });
  }, [width, height]);


  const drawFractalBranch = useCallback((
    rctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, depth: number, maxDepth: number, entropy: number, baseHue: number, phase: string
  ) => {
    if (depth > maxDepth || length < 0.8) return;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    const t = clamp(entropy, 0, 1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const lineWidth = Math.max(0.6, (1 - depth / maxDepth) * (2.2 + t * 2.8));
    const alpha = Math.max(0.12, (1 - depth / maxDepth) * (0.75 - t * 0.4));
    
    rctx.beginPath();
    rctx.moveTo(x, y);
    rctx.lineTo(endX, endY);
    rctx.strokeStyle = `hsla(${(baseHue + phaseHueOffset + (Math.random() -0.5)*25*t)%360}, ${75 - t*25}%, ${65 - depth*5 - t*12}%, ${alpha})`;
    rctx.lineWidth = lineWidth;
    rctx.lineCap = 'round';
    rctx.stroke();

    const numBranches = depth === 0 ? 2 + Math.floor(t * 2.5) : 1 + Math.floor(t * 1.8); 
    const angleSpread = Math.PI / (3.8 + depth) * (1 + t * 1.3); 

    for (let i = 0; i < numBranches; i++) {
      if (entropy > 0.75 && Math.random() < entropy * 0.3 && depth > 0) continue; 
      const newAngle = angle + (i - (numBranches - 1) / 2) * angleSpread * (1 + (Math.random() - 0.5) * t * 0.45);
      const newLength = length * (0.72 + (Math.random() * 0.12) - t * 0.18);
      drawFractalBranch(rctx, endX, endY, newAngle, newLength, depth + 1, maxDepth, entropy, (baseHue + i * 12 + Math.random()*18*t + phaseHueOffset) % 360, phase);
    }
  }, []);
  
  const drawRecursiveMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase: string) => {
    if (Object.keys(sephirotPositions).length === 0) return;
    const t = clamp(entropy,0,1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const maxDepthRecursive = 1 + Math.floor(t * 5.5); 
    const initialLengthRecursive = Math.min(width, height) * (0.1 - t * 0.05); 
    const initialAngleRecursive = frame * 0.0018 * (1 + t * 0.45);
    const baseHue = (lerp(180, 300, t) + phaseHueOffset)%360;

    // FIX: Explicitly type `sephirah` to resolve 'unknown' type errors.
    Object.values(sephirotPositions).forEach((sephirah: SephirahPositionData, index) => {
        if(!sephirah) return;
        if(sephirah.id === 'daat' && t < 0.45) return; 

        const numRootsRecursive = 1 + Math.floor(t * 2.2);
        for(let i=0; i < numRootsRecursive; i++) {
           drawFractalBranch(
              ctx, sephirah.x, sephirah.y,
              initialAngleRecursive + (i * Math.PI*2 / numRootsRecursive) + (index * 0.7), 
              initialLengthRecursive * (sephirah.id === 'keter' ? 1.25 : 1.05), 
              0, maxDepthRecursive, entropy, (baseHue + sephirah.baseHue/4.5)%360, phase
           );
        }
    });
  }, [drawFractalBranch, width, height, sephirotPositions]);

  const drawCrystalLogicMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase: string, chalice: string) => {
    const minSides = 3;
    const maxSides = 9;
    const t = clamp(entropy, 0, 1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const isChaliceFull = chalice === 'Full' || chalice === 'Overflowing';
    const sidesToUse = Math.floor(lerp(maxSides, minSides, t));
    const effectiveSides = Math.max(minSides, sidesToUse);
    const effectiveInitialRotation = frame * 0.0009 * (1 + t * 1.3);
    
    // FIX: Explicitly type `sephirah` to resolve 'unknown' type errors.
    Object.values(sephirotPositions).forEach((sephirah: SephirahPositionData) => {
        if(!sephirah) return;
        let currentRadius = Math.min(width,height) * (0.033 + t*0.033) * (isChaliceFull ? 1.12 : 1);
        if(sephirah.id === 'daat' && t < 0.55) return;

        const maxDepth = 1 + Math.floor(t * 2.8);
        
        for (let depth = 0; depth < maxDepth; depth++) {
            if (currentRadius < 2.2) break;
            const rotation = effectiveInitialRotation + depth * 0.13 * (1 + t); 
            const hue = ((sephirah.baseHue + phaseHueOffset + depth * 22 + lerp(0,33,t)))%360;
            
            const points = [];
            for (let i = 0; i < effectiveSides; i++) {
                const angle = (i / effectiveSides) * Math.PI * 2 + rotation;
                let pX = sephirah.x + Math.cos(angle) * currentRadius;
                let pY = sephirah.y + Math.sin(angle) * currentRadius;
                if (t > 0.45) { 
                    pX += (Math.random() - 0.5) * currentRadius * t * 0.18;
                    pY += (Math.random() - 0.5) * currentRadius * t * 0.18;
                }
                points.push({x: pX, y: pY});
            }

            ctx.beginPath();
            ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
            points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath();

            const saturation = lerp(75 - depth*6, 90 - t*30, t);
            const lightness = lerp(55 - depth*4, 30 + t*18, t);
            const alpha = lerp(0.65 - depth * 0.13, 0.18 + t*0.33, t) * (1 - depth / (maxDepth + 1));
            
            ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${clamp(alpha, 0.04, 0.8)})`;
            ctx.lineWidth = Math.max(0.35, (1.9 - depth * 0.28) * (1 - t*0.65) * (isChaliceFull ? 1.18 : 1));
            ctx.stroke();
            
            if (t > 0.3 && depth < maxDepth -1) { 
                const fillAlpha = lerp(0.015, 0.06 + t*0.12, t) * (1 - depth/(maxDepth+1)) * (isChaliceFull ? 1.35 : 1);
                ctx.fillStyle = `hsla(${hue}, ${saturation-12}%, ${lightness-6}%, ${clamp(fillAlpha, 0, 0.3)})`;
                ctx.fill();
            }
            currentRadius *= (0.62 - t * 0.18); 
        }
    });
  }, [width, height, sephirotPositions]);

  const drawAethericWeaveMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase:string) => {
    const t = clamp(entropy, 0, 1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    particlesRef.current.forEach((p: Particle) => {
        if (p.type !== 'aetherPoint') return;
        p.x += p.vx * (1 + t*0.5); p.y += p.vy * (1 + t*0.5);
        if(p.x < 0 || p.x > width) p.vx *= -1;
        if(p.y < 0 || p.y > height) p.vy *= -1;
        
        p.history = p.history || [];
        p.history.push({x: p.x, y: p.y});
        if (p.history.length > 10 + t*15) p.history.shift();

        ctx.beginPath();
        if(p.history.length > 1) ctx.moveTo(p.history[0].x, p.history[0].y);
        for(let k=1; k<p.history.length; k++) ctx.lineTo(p.history[k].x, p.history[k].y);
        const pathHue = (180 + phaseHueOffset + t*60 + (p.size > 1 ? 30 : 0))%360;
        ctx.strokeStyle = `hsla(${pathHue}, 70%, ${60 + t*10}%, ${0.2 + p.size*0.1 - t*0.1})`;
        ctx.lineWidth = p.size * (0.5 + t*0.3);
        ctx.stroke();
    });
    // Connections
    for(let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
            const p1 = particlesRef.current[i]; const p2 = particlesRef.current[j];
            if (p1.type !== 'aetherPoint' || p2.type !== 'aetherPoint') continue;
            const dist = Math.hypot(p1.x-p2.x, p1.y-p2.y);
            if (dist < 80 + t*40) {
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
                const connHue = (200 + phaseHueOffset - t*50)%360;
                ctx.strokeStyle = `hsla(${connHue}, 60%, 70%, ${0.05 + (1 - dist/(80+t*40))*0.2 * (1-t*0.5)})`;
                ctx.lineWidth = 0.3 + (1 - dist/(80+t*40))*0.8;
                ctx.stroke();
            }
        }
    }
  }, [width, height]);

  const drawNullShellMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase: string, chalice: string) => {
    const t = clamp(entropy,0,1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const isChaliceFull = chalice === 'Full' || chalice === 'Overflowing';
    const centerX = width/2; const centerY = height/2;
    const shellRadius = Math.min(width,height)*0.4;

    // Shell
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(0, shellRadius), 0, Math.PI*2);
    const shellHue = (240 + phaseHueOffset - t*30)%360;
    const shellAlpha = 0.03 + (1-t)*0.1 + (isChaliceFull ? 0.05 : 0);
    ctx.strokeStyle = `hsla(${shellHue}, 40%, 60%, ${shellAlpha})`;
    ctx.lineWidth = 1 + (1-t)*2 + (isChaliceFull ? 1 : 0);
    ctx.stroke();

    // Cracks
    if (t > 0.3) {
        const numCracks = Math.floor(t*10);
        for(let i=0; i<numCracks; i++) {
            const angle = Math.random()*Math.PI*2;
            const startR = shellRadius * (0.8 + Math.random()*0.2);
            const crackLength = shellRadius * (0.1 + t*0.3*Math.random());
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(angle)*startR, centerY + Math.sin(angle)*startR);
            for(let j=0; j<3; j++) { // Jagged segments
                ctx.lineTo(centerX + Math.cos(angle + (Math.random()-0.5)*0.3*t) * (startR - crackLength*(j+1)/3), 
                           centerY + Math.sin(angle + (Math.random()-0.5)*0.3*t) * (startR - crackLength*(j+1)/3));
            }
            ctx.strokeStyle = `hsla(0, 0%, ${15 + t*15}%, ${0.2 + t*0.5})`;
            ctx.lineWidth = 0.5 + t*1.5;
            ctx.stroke();
        }
    }
    if (!isChaliceFull) {
        const voidPulseRadius = shellRadius * 0.5 * Math.abs(Math.sin(frame*0.01 + t*2));
        const voidAlpha = 0.05 + t*0.1 * Math.abs(Math.sin(frame*0.015));
        const voidGrad = ctx.createRadialGradient(centerX,centerY,0, centerX,centerY,voidPulseRadius);
        voidGrad.addColorStop(0, `hsla(0,0%,5%,${voidAlpha})`);
        voidGrad.addColorStop(1, `hsla(0,0%,10%,0)`);
        ctx.fillStyle = voidGrad;
        ctx.beginPath(); ctx.arc(centerX,centerY,Math.max(0, voidPulseRadius),0,Math.PI*2); ctx.fill();
    } else { 
        const innerGlowRadius = shellRadius * (0.3 + Math.abs(Math.sin(frame*0.02))*0.15);
        const innerGlow = ctx.createRadialGradient(centerX,centerY,0, centerX,centerY,Math.max(0, innerGlowRadius));
        const chaliceHue = (60 + phaseHueOffset)%360; 
        innerGlow.addColorStop(0, `hsla(${chaliceHue}, 90%, 70%, 0.2)`);
        innerGlow.addColorStop(1, `hsla(${chaliceHue}, 80%, 60%, 0)`);
        ctx.fillStyle = innerGlow;
        ctx.beginPath(); ctx.arc(centerX,centerY,Math.max(0, innerGlowRadius),0,Math.PI*2); ctx.fill();
    }
  }, [width, height]);

  const drawBioFractalPulseMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase:string) => {
    const t = clamp(entropy,0,1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const maxDepthBio = 2 + Math.floor(t * 4);
    const initialLengthBio = Math.min(width,height)*(0.05 + (1-t)*0.08);
    const rootX = width/2;
    const rootY = height * (0.9 - t*0.1); 
    
    const numRoots = 1 + Math.floor((1-t)*2); 
    for(let i=0; i<numRoots; i++) {
        const angle = -Math.PI/2 + (i - (numRoots-1)/2) * (0.2 + t*0.3);
        const baseHue = (120 + phaseHueOffset + (Math.random()-0.5)*30*t)%360; 
        drawFractalBranch(ctx, rootX, rootY, angle, initialLengthBio, 0, maxDepthBio, entropy, baseHue, phase);
    }
    const pulseRadius = Math.min(width,height)*0.1 * Math.abs(Math.sin(frame*0.02 + t*2));
    const pulseAlpha = 0.1 + (1-t)*0.2 * Math.abs(Math.sin(frame*0.025 + t));
    const pulseGrad = ctx.createRadialGradient(rootX, rootY, 0, rootX, rootY, Math.max(0, pulseRadius));
    const pulseHue = (100 + phaseHueOffset)%360;
    pulseGrad.addColorStop(0, `hsla(${pulseHue}, 80%, 60%, ${pulseAlpha})`);
    pulseGrad.addColorStop(1, `hsla(${pulseHue}, 70%, 50%, 0)`);
    ctx.fillStyle = pulseGrad;
    ctx.beginPath(); ctx.arc(rootX, rootY, Math.max(0, pulseRadius), 0, Math.PI*2); ctx.fill();

  }, [width, height, drawFractalBranch]);

   const drawOracleWhisperFieldMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase: string, chalice: string) => {
    const t = clamp(entropy,0,1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const isChaliceFull = chalice === 'Full' || chalice === 'Overflowing';

    particlesRef.current.forEach((p: Particle) => {
        if (p.type !== 'whisper') return;
        p.x += p.vx * (1 + t*0.3); p.y += p.vy * (1 + t*0.3);
        if(p.x < 0 || p.x > width) p.vx *= -1;
        if(p.y < 0 || p.y > height) p.vy *= -1;
        
        const particleHue = (270 + phaseHueOffset + Math.sin(frame*0.005 + p.x*0.01)*30)%360;
        const particleLightness = 75 + Math.sin(frame*0.01 + p.y*0.01)*10;
        let particleAlphaString = p.color.match(/hsla\([^,]+,[^,]+,[^,]+,([\d.]+)\)/)?.[1] || "0.2";
        let particleAlpha = (parseFloat(particleAlphaString) * (1 + t*0.5)) * (isChaliceFull ? 1.3 : 1);
        
        const radiusCalc = p.size*(1 + t*0.8 + Math.sin(frame*0.02 + p.x*0.02 + p.y*0.01)*0.3);
        ctx.fillStyle = `hsla(${particleHue}, 80%, ${particleLightness}%, ${clamp(particleAlpha, 0.05, 0.5)})`;
        ctx.beginPath(); 
        ctx.arc(p.x,p.y, Math.max(0.1, radiusCalc),0,Math.PI*2); // Guarded radius
        ctx.fill();

        if (t < 0.4 && Math.random() < 0.0005 * (1-t) && isChaliceFull) { 
            ctx.font = `${6 + t*4}px Cinzel, serif`;
            ctx.fillStyle = `hsla(0,0%,100%,${0.05 + Math.random()*0.15})`;
            const words = ["ECHO", "VEIL", "TRUTH", "FLUX", "DREAM", "PATH"];
            ctx.fillText(words[Math.floor(Math.random()*words.length)], p.x + 5, p.y + 5);
        }
    });
  }, [width, height]);

  const drawShieldedChaosMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase:string, chalice: string) => {
    const t = clamp(entropy,0,1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const isChaliceFull = chalice === 'Full' || chalice === 'Overflowing';
    const centerX = width/2; const centerY = height/2;
    const shieldRadius = Math.min(width,height)*0.35 * (1 + (1-t)*0.1) * (isChaliceFull ? 1.1 : 1);

    particlesRef.current.forEach((p: Particle) => {
        if (p.type !== 'chaosSpark') return;
        p.x += p.vx; p.y += p.vy;
        p.life--;
        const distFromCenter = Math.hypot(p.x - centerX, p.y - centerY);
        if (distFromCenter > shieldRadius * 0.8) { 
            p.vx *= -0.8; p.vy *= -0.8;
            p.x = centerX + (p.x - centerX) / distFromCenter * shieldRadius * 0.78;
            p.y = centerY + (p.y - centerY) / distFromCenter * shieldRadius * 0.78;
        }
        if (p.life <= 0) { 
            p.x = centerX; p.y = centerY;
            p.vx = (Math.random()-0.5)*(2 + t*6); p.vy = (Math.random()-0.5)*(2 + t*6);
            p.life = 30 + Math.random()*70 * (1-t*0.5);
        }
        const sparkHue = (phaseHueOffset + t*90 + p.life*2)%360;
        ctx.fillStyle = `hsla(${sparkHue}, 90%, 60%, ${0.6 * (p.life/((p.baseLife || 1) === 0 ? 1 : (p.baseLife || 1) )) + t*0.1})`;
        ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0, p.size*(1+t*0.5)),0,Math.PI*2); ctx.fill();
    });

    const numLayers = 3 + Math.floor((1-t)*4);
    for(let i=0; i<numLayers; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(0, shieldRadius * (1 - i*0.05*(1-t))), 0, Math.PI*2);
        const shieldHue = (200 + phaseHueOffset - t*40)%360;
        const shieldAlpha = 0.05 + (1-t)*0.15 - i*0.02 + (isChaliceFull ? 0.05 : 0);
        ctx.strokeStyle = `hsla(${shieldHue}, 70%, ${70-i*5}%, ${shieldAlpha})`;
        ctx.lineWidth = 1 + (1-t)*2.5 - i*0.3 + (isChaliceFull ? 0.5 : 0);
        if (t > 0.6 && i > 0) ctx.setLineDash([5+t*5, 3+t*3]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
  }, [width, height]);

  const drawVortexSingularityMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase: string) => {
    const t = clamp(entropy,0,1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const centerX = width/2; const centerY = height/2;

    particlesRef.current.forEach((p:Particle) => {
        if (p.type !== 'vortexParticle') return;
        p.angle! += p.speed! * (1 + t*2);
        p.dist! -= p.speed! * (20 + t*80) * (p.dist! / (Math.min(width,height)*0.45)); 
        if(p.dist! < 1 + t*3) { 
            p.dist = Math.random() * Math.min(width,height)*0.45 + Math.min(width,height)*0.02;
            p.angle = Math.random()*Math.PI*2;
            p.life = 80 + Math.random()*100;
        }
        p.life!--;
        if(p.life! <= 0) { 
            p.dist = Math.random() * Math.min(width,height)*0.45 + Math.min(width,height)*0.02;
            p.angle = Math.random()*Math.PI*2;
            p.life = 80 + Math.random()*100;
        }
        p.x = centerX + Math.cos(p.angle!) * p.dist!;
        p.y = centerY + Math.sin(p.angle!) * p.dist!;

        const particleHue = (240 + phaseHueOffset + t*60 + p.dist!*0.2)%360;
        const particleAlpha = 0.5 * (p.life!/ (p.baseLife || 1)) * (1 - p.dist!/(Math.min(width,height)*0.47));
        ctx.fillStyle = `hsla(${particleHue}, 90%, 65%, ${clamp(particleAlpha,0.05,0.7)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.size*(1+t*0.5)),0,Math.PI*2); ctx.fill();
    });
    const coreRadius = 5 + t*15;
    const coreGrad = ctx.createRadialGradient(centerX,centerY,0,centerX,centerY,Math.max(0, coreRadius));
    coreGrad.addColorStop(0, `hsla(0,0%,${5+t*10}%,${0.8+t*0.2})`);
    coreGrad.addColorStop(1, `hsla(0,0%,0%,0)`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath(); ctx.arc(centerX,centerY,Math.max(0, coreRadius*1.5),0,Math.PI*2); ctx.fill();
  }, [width, height]);

  const drawHypercubeEchoMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase: string) => {
    const t = clamp(entropy,0,1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const scale = Math.min(width,height)*0.2 * (1 + t*0.1);
    
    hypercubeRotationRef.current.xy += 0.003 * (1+t); hypercubeRotationRef.current.zw += 0.005 * (1+t);
    hypercubeRotationRef.current.xz += 0.002 * (1+t); hypercubeRotationRef.current.yw = hypercubeRotationRef.current.xy * 0.5;

    const project = (vertex4D: number[], wRot: number = hypercubeRotationRef.current.xw) => {
        let x = vertex4D[0], y = vertex4D[1], z = vertex4D[2], w_coord = vertex4D[3]; 
        [x,y] = [x*Math.cos(hypercubeRotationRef.current.xy)-y*Math.sin(hypercubeRotationRef.current.xy), x*Math.sin(hypercubeRotationRef.current.xy)+y*Math.cos(hypercubeRotationRef.current.xy)];
        [z,w_coord] = [z*Math.cos(hypercubeRotationRef.current.zw)-w_coord*Math.sin(hypercubeRotationRef.current.zw), z*Math.sin(hypercubeRotationRef.current.zw)+w_coord*Math.cos(hypercubeRotationRef.current.zw)];
        [x,z] = [x*Math.cos(hypercubeRotationRef.current.xz)-z*Math.sin(hypercubeRotationRef.current.xz), x*Math.sin(hypercubeRotationRef.current.xz)+z*Math.cos(hypercubeRotationRef.current.xz)];
        
        const perspective = 1 / (3 - w_coord + t*0.5); 
        return { x: width/2 + x*scale*perspective, y: height/2 + y*scale*perspective };
    };

    const numEchoes = 1 + Math.floor(t*4);
    for (let e=0; e < numEchoes; e++) {
        const echoAlpha = 0.4 * (1 - e/numEchoes) * (1 - t*0.5);
        const echoScale = 1 - e * 0.05 * t;
        const echoWRot = hypercubeRotationRef.current.xw + e * 0.1 * t;

        TESSERACT_EDGES.forEach(([i,j]) => {
            const v1 = TESSERACT_VERTICES_4D[i].map(c => c*echoScale);
            const v2 = TESSERACT_VERTICES_4D[j].map(c => c*echoScale);
            const p1 = project(v1, echoWRot);
            const p2 = project(v2, echoWRot);
            ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y);
            const edgeHue = (180 + phaseHueOffset + e*20 - t*30)%360;
            ctx.strokeStyle = `hsla(${edgeHue}, 70%, 60%, ${echoAlpha})`;
            ctx.lineWidth = Math.max(0.2, (1.5 - e*0.2) * (1-t*0.7));
            ctx.stroke();
        });
    }
  }, [width, height]);

  const drawStarlightConductorMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase: string, chalice: string) => {
    const t = clamp(entropy,0,1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const isChaliceFull = chalice === 'Full' || chalice === 'Overflowing';

    particlesRef.current.forEach((p: Particle) => {
        if(p.type !== 'starNode') return;
        const starHueMatch = p.color.match(/hsla\((\d+)/);
        const starHue = starHueMatch ? starHueMatch[1] : "60";
        ctx.fillStyle = p.color.replace(/,\s*([\d.]+)\)/, `, ${0.7 + Math.sin(frame*0.05 + parseInt(starHue)*0.1)*0.2 * (1+t*0.5)})`);
        const size = p.size * (1 + t*0.3) * (isChaliceFull ? 1.15 : 1);
        ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0, size),0,Math.PI*2); ctx.fill();
        const grad = ctx.createRadialGradient(p.x,p.y,0, p.x,p.y,Math.max(0, size*2.5));
        grad.addColorStop(0, `hsla(${starHue}, 90%, 85%, ${0.3+t*0.2})`);
        grad.addColorStop(1, `hsla(${starHue}, 80%, 70%, 0)`);
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0, size*2.5),0,Math.PI*2); ctx.fill();
    });

    for(let i=0; i < particlesRef.current.length; i++) {
        for (let j=i+1; j < particlesRef.current.length; j++) {
            const p1 = particlesRef.current[i], p2 = particlesRef.current[j];
            if(p1.type !== 'starNode' || p2.type !== 'starNode') continue;
            if (Math.random() > 0.3 + (1-t)*0.5) continue; 
            
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            const conductorHue = (60 + phaseHueOffset + t*40)%360;
            const conductorAlpha = 0.05 + Math.random()*0.15 * (1-t*0.8) * (isChaliceFull ? 1.5 : 1);
            ctx.strokeStyle = `hsla(${conductorHue}, 100%, 80%, ${conductorAlpha})`;
            ctx.lineWidth = 0.2 + Math.random()*0.8 * (1-t*0.7);
            ctx.stroke();
        }
    }
  }, []);

  const drawPhaseResonanceRingsMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase: string, chalice: string) => {
    const t = clamp(entropy,0,1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const isChaliceFull = chalice === 'Full' || chalice === 'Overflowing';
    const centerX = width/2, centerY = height/2;
    const numRings = 5 + Math.floor((1-t)*7) + (isChaliceFull ? 2 : 0);
    const maxRingRadius = Math.min(width,height)*0.45;

    for(let i=0; i<numRings; i++) {
        const ringProgress = (i / numRings + frame * 0.002 * (1 + t*1.5)) % 1;
        const radius = ringProgress * maxRingRadius;
        const alpha = (1 - ringProgress) * (0.3 + (1-t)*0.5) * (0.5 + Math.sin(frame*0.03 + i*0.5)*0.4);
        if (alpha < 0.01) continue;

        const ringHue = (phaseHueOffset + i*30 + t*60 + frame*0.1)%360;
        ctx.strokeStyle = `hsla(${ringHue}, 80%, ${65 + t*10}%, ${alpha})`;
        ctx.lineWidth = 1 + (1-t)*3 + Math.sin(frame*0.04 + i*0.7)*0.5 * (1-t) + (isChaliceFull ? 0.5 : 0);
        ctx.beginPath(); ctx.arc(centerX,centerY,Math.max(0, radius),0,Math.PI*2); ctx.stroke();

        if (t > 0.5 && Math.random() < t*0.1) { 
            const distAngle = Math.random()*Math.PI*2;
            const distRadius = radius + (Math.random()-0.5)*20*t;
            ctx.beginPath();
            ctx.arc(centerX + Math.cos(distAngle)*10*t, centerY + Math.sin(distAngle)*10*t, Math.max(0, distRadius), 0, Math.PI*2);
            ctx.strokeStyle = `hsla(${(ringHue+90)%360}, 70%, 50%, ${alpha*0.5})`;
            ctx.lineWidth *= 0.5;
            ctx.stroke();
        }
    }
  }, [width, height]);

  const drawChaliceFountainMode = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frame: number, phase: string, chalice: string) => {
    const t = clamp(entropy,0,1);
    const phaseHueOffset = getPhaseColorHueOffset(phase);
    const isChaliceFull = chalice === 'Full' || chalice === 'Overflowing';
    const isChaliceEmpty = chalice === 'Empty';
    const chaliceColorFactor = isChaliceFull ? 1.2 : (isChaliceEmpty ? 0.5 : 1);

    const chaliceBaseY = height * 0.9;
    const chaliceWidth = width * 0.25 * chaliceColorFactor;
    const chaliceHeight = height * 0.12 * chaliceColorFactor;
    ctx.fillStyle = `hsla(${(20 + phaseHueOffset - t*10)%360}, 50%, ${30 - t*10}%, 0.8)`;
    ctx.beginPath();
    ctx.ellipse(width/2, chaliceBaseY, chaliceWidth/2, chaliceHeight/2, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = `hsla(${(40 + phaseHueOffset)%360}, 60%, ${45 - t*10}%, 0.9)`; 
    ctx.fillRect(width/2 - chaliceWidth/2.2, chaliceBaseY - chaliceHeight/1.8, chaliceWidth/1.1, chaliceHeight/3);


    particlesRef.current.forEach((p: Particle) => {
        if(p.type !== 'fountainDrop') return;
        p.vy += 0.05 * (1+t*0.5); 
        p.vx *= 0.99; 
        p.x += p.vx; p.y += p.vy;
        p.life--;
        if(p.life! <= 0 || p.y > height*0.95) { 
            p.x = width/2 + (Math.random()-0.5)*chaliceWidth*0.3; p.y = height * 0.85;
            p.vx = (Math.random()-0.5)*(0.8 + t*1.5 + (isChaliceFull ? 0.5 : 0));
            p.vy = -(1.5 + Math.random()*1.5 + (isChaliceFull ? 1.2 : (isChaliceEmpty ? -0.5 : 0.5)));
            p.life = 80 + Math.random()*100 * chaliceColorFactor;
        }
        const dropHue = (180 + phaseHueOffset + Math.sin(p.y*0.02)*30 + t*30)%360;
        const dropAlpha = clamp(0.3 + (p.life!/(p.baseLife || 1))*0.6 * (1-t*0.3) * chaliceColorFactor, 0.1, 0.8);
        ctx.fillStyle = `hsla(${dropHue}, 80%, 70%, ${dropAlpha})`;
        ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0, p.size*(0.5+t*0.5 + (isChaliceFull ? 0.2 : 0))),0,Math.PI*2); ctx.fill();
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

    const renderLoop = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      const baseBgHue = 260;
      const bgGrad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width,height)/1.5);
      bgGrad.addColorStop(0, `hsla(${baseBgHue - currentEntropy*30}, 50%, ${lerp(10,3,currentEntropy)}%, 0.98)`);
      bgGrad.addColorStop(1, `hsla(${(baseBgHue + 40 - currentEntropy*30)%360}, 60%, ${lerp(18,8,currentEntropy)}%, 0.99)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0,0,width,height);

      particlesRef.current.forEach(p => {
          if(p.type === 'ambient') {
            p.x += p.vx; p.y += p.vy;
            if(p.x < 0 || p.x > width) p.vx *= -1;
            if(p.y < 0 || p.y > height) p.vy *= -1;
            const particleHue = (baseBgHue + 180 + (Math.random()-0.5)*60)%360;
            const finalAlpha = (p.opacity || 0.1) * (1 - currentEntropy * 0.7); 
            ctx.fillStyle = `hsla(${particleHue}, 70%, 70%, ${clamp(finalAlpha, 0, 1)})`;
            ctx.fillRect(p.x,p.y,p.size,p.size);
          }
      });
      
      switch(currentGeoMode) {
        case GeoMode.Recursive: drawRecursiveMode(ctx, currentEntropy, frameCount, currentPhase); break;
        case GeoMode.CrystalLogic: drawCrystalLogicMode(ctx, currentEntropy, frameCount, currentPhase, chaliceStatus); break;
        case GeoMode.AethericWeave: drawAethericWeaveMode(ctx, currentEntropy, frameCount, currentPhase); break;
        case GeoMode.NullShell: drawNullShellMode(ctx, currentEntropy, frameCount, currentPhase, chaliceStatus); break;
        case GeoMode.BioFractalPulse: drawBioFractalPulseMode(ctx, currentEntropy, frameCount, currentPhase); break;
        case GeoMode.OracleWhisper: drawOracleWhisperFieldMode(ctx, currentEntropy, frameCount, currentPhase, chaliceStatus); break;
        case GeoMode.ShieldedChaos: drawShieldedChaosMode(ctx, currentEntropy, frameCount, currentPhase, chaliceStatus); break;
        case GeoMode.VortexSingularity: drawVortexSingularityMode(ctx, currentEntropy, frameCount, currentPhase); break;
        case GeoMode.HypercubeEcho: drawHypercubeEchoMode(ctx, currentEntropy, frameCount, currentPhase); break;
        case GeoMode.StarlightConductor: drawStarlightConductorMode(ctx, currentEntropy, frameCount, currentPhase, chaliceStatus); break;
        case GeoMode.PhaseResonance: drawPhaseResonanceRingsMode(ctx, currentEntropy, frameCount, currentPhase, chaliceStatus); break;
        case GeoMode.ChaliceFountain: drawChaliceFountainMode(ctx, currentEntropy, frameCount, currentPhase, chaliceStatus); break;
        case GeoMode.GlyphDNA: 
          drawTreeBase(ctx, currentEntropy, frameCount, currentPhase, chaliceStatus); 
          drawDNAHelixConnections(ctx, sephirotPositions, currentEntropy, frameCount, chaliceStatus);
          break;
        default:
          drawTreeBase(ctx, currentEntropy, frameCount, currentPhase, chaliceStatus); 
      }

      animationFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [
      width, height, currentEntropy, currentPhase, chaliceStatus, currentGeoMode, 
      sephirotPositions, // Added for DNA Helix
      drawTreeBase, drawRecursiveMode, drawCrystalLogicMode, drawAethericWeaveMode,
      drawNullShellMode, drawBioFractalPulseMode, drawOracleWhisperFieldMode,
      drawShieldedChaosMode, drawVortexSingularityMode, drawHypercubeEchoMode,
      drawStarlightConductorMode, drawPhaseResonanceRingsMode, drawChaliceFountainMode,
      drawDNAHelixConnections // Added new function
    ]);

  const availableModes = Object.values(GeoMode);

  return (
    <div className="cosmic-geometry-panel bg-slate-950/80 backdrop-blur-sm border border-indigo-600/50 rounded-xl shadow-2xl p-4 md:p-6 my-8 text-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-2">
        <h2 className="text-xl md:text-2xl font-['Cinzel'] font-bold text-indigo-300 drop-shadow-[0_1px_1px_rgba(129,140,248,0.4)]">
          Cosmic Entropy Geometry
        </h2>
        <div className="w-full sm:w-auto">
         <ModeSelector<GeoMode> 
            currentMode={currentGeoMode} 
            onSetMode={onSetGeoMode}
            availableModes={availableModes}
            modeGroupName="Geometry Visualization Mode" 
          />
        </div>
      </div>
      <div className="relative mx-auto bg-slate-950/60 rounded-lg border border-slate-700/80 shadow-inner" style={{ width: `${width}px`, height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-slate-700/30"
          aria-label="Cosmic geometry visualization reacting to entropy and system phase"
          role="img"
        />
      </div>
       <div className="mt-3 text-center text-xs text-slate-400 font-mono">
        Phase: {currentPhase} | Entropy: {(currentEntropy || 0).toFixed(3)}δ | Chalice: {chaliceStatus}
      </div>
    </div>
  );
};

export default CosmicEntropyGeometryGenerator;
