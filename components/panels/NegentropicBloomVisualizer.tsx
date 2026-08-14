

import React, { useRef, useEffect, useCallback } from 'react';
import type { NegentropicBloomVisualizerProps } from '../../types';
import { useSystemState } from '../../context/SystemContext';
import { AgentName } from '../../types';
import { AGENT_PROFILES } from '../../constants';

import { useEcho } from '../../context/EchoContext';
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

interface BloomParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  opacity: number;
}

const NegentropicBloomVisualizer: React.FC<NegentropicBloomVisualizerProps> = ({ width, height }) => {
  const { addEchoMessage } = useEcho();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { negentropyLevel, isNegentropyStable, entropy: currentSystemEntropy } = useSystemState();
  const particlesRef = useRef<BloomParticle[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const mousePos = useRef({ x: -1000, y: -1000 });

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

  useEffect(() => {
    // Optional: Log panel initialization or significant state changes
    // addEchoMessage(AgentName.NegentropicBloomAgent, "Visualizer initialized.", AGENT_PROFILES[AgentName.NegentropicBloomAgent]?.colorClass);
  }, [addEchoMessage]);

  const drawPetal = useCallback((
    ctx: CanvasRenderingContext2D,
    centerX: number, centerY: number,
    angle: number,
    length: number,
    complexity: number, // 0 to 1
    baseHue: number,
    saturation: number,
    lightness: number,
    alpha: number,
    entropyFactor: number, // 0 to 1 (currentSystemEntropy)
    isStable: boolean
  ) => {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);

    const tipX = centerX + Math.cos(angle) * length;
    const tipY = centerY + Math.sin(angle) * length;

    const controlPointOffset = length * 0.6 * lerp(0.5, 1.2, complexity);
    const petalWidthFactor = lerp(0.15, 0.4, complexity) * lerp(1, 0.7, entropyFactor); // Narrower with entropy

    const cp1X = centerX + Math.cos(angle - Math.PI / 2) * controlPointOffset * petalWidthFactor + (isStable ? 0 : (Math.random() - 0.5) * 5 * entropyFactor);
    const cp1Y = centerY + Math.sin(angle - Math.PI / 2) * controlPointOffset * petalWidthFactor + (isStable ? 0 : (Math.random() - 0.5) * 5 * entropyFactor);
    const cp2X = centerX + Math.cos(angle + Math.PI / 2) * controlPointOffset * petalWidthFactor + (isStable ? 0 : (Math.random() - 0.5) * 5 * entropyFactor);
    const cp2Y = centerY + Math.sin(angle + Math.PI / 2) * controlPointOffset * petalWidthFactor + (isStable ? 0 : (Math.random() - 0.5) * 5 * entropyFactor);

    ctx.quadraticCurveTo(cp1X, cp1Y, tipX, tipY);
    ctx.quadraticCurveTo(cp2X, cp2Y, centerX, centerY);
    
    ctx.fillStyle = `hsla(${baseHue}, ${saturation}%, ${lightness}%, ${alpha})`;
    ctx.fill();

    // Edge corrosion/detail based on entropy and complexity
    if (entropyFactor > 0.5 || complexity > 0.7) {
      ctx.strokeStyle = `hsla(${baseHue + 20}, ${saturation - 10}%, ${lightness + 10}%, ${alpha * 0.5 * lerp(0.2, 1, entropyFactor)})`;
      ctx.lineWidth = lerp(0.2, 1.5, complexity * entropyFactor);
      if (entropyFactor > 0.7) {
        ctx.setLineDash([lerp(1,5,entropyFactor), lerp(1,3,entropyFactor)]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, []);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    let frameCount = 0;

    const draw = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      const t_negentropy = negentropyLevel;
      const t_entropy = currentSystemEntropy;

      // Background
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
      const bgHue = lerp(270, 180, t_negentropy); // Purple (low N) to Cyan (high N)
      bgGrad.addColorStop(0, `hsla(${bgHue}, ${lerp(40, 70, t_negentropy)}%, ${lerp(5, 15, t_negentropy)}%, 1)`);
      bgGrad.addColorStop(1, `hsla(${(bgHue + 30)%360}, ${lerp(30, 60, t_negentropy)}%, ${lerp(2, 8, t_negentropy)}%, 1)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Core
      const coreBaseRadius = lerp(8, 25, t_negentropy);
      const corePulseFactor = isNegentropyStable ? Math.sin(frameCount * 0.02 * (1 + t_negentropy)) * 0.1 : Math.sin(frameCount * 0.05 * (1 + t_negentropy)) * 0.15;
      const coreRadius = coreBaseRadius * (1 + corePulseFactor);
      const coreHue = lerp(220, 60, t_negentropy); // Blue to Yellow/Gold
      const coreLightness = lerp(50, 85, t_negentropy);
      const coreAlpha = lerp(0.6, 1.0, t_negentropy) * (1 - t_entropy * 0.4);
      
      const coreGradOuter = ctx.createRadialGradient(centerX, centerY, coreRadius * 0.5, centerX, centerY, coreRadius * 2);
      coreGradOuter.addColorStop(0, `hsla(${coreHue}, 90%, ${coreLightness + 10}%, ${coreAlpha * 0.3})`);
      coreGradOuter.addColorStop(1, `hsla(${coreHue}, 90%, ${coreLightness}%, 0)`);
      ctx.fillStyle = coreGradOuter;
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(0, coreRadius * 2), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsla(${coreHue}, 90%, ${coreLightness}%, ${coreAlpha})`;
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(0, coreRadius), 0, Math.PI * 2);
      ctx.fill();


      // Petals
      const numPetals = Math.floor(lerp(3, 13, t_negentropy));
      const petalBaseLength = lerp(30, Math.min(width, height) * 0.4, t_negentropy);
      const petalComplexity = t_negentropy; // 0 to 1

      for (let i = 0; i < numPetals; i++) {
        const angleOffset = isNegentropyStable ? 0 : (Math.sin(frameCount * 0.01 + i * 0.5) * 0.05 * (1-t_negentropy)); // Jitter if unstable
        const angle = (i / numPetals) * Math.PI * 2 + angleOffset + frameCount * 0.001 * (isNegentropyStable ? 0.5 : 1);
        
        const lengthFluctuation = isNegentropyStable ? Math.sin(frameCount * 0.03 + i * 0.7) * 0.1 : (Math.random() - 0.5) * 0.2;
        const petalLength = petalBaseLength * (1 + lengthFluctuation) * (1 - t_entropy * 0.3);
        
        const petalHue = (lerp(200, 40, t_negentropy) + i * (360 / (numPetals*2)) + frameCount*0.05) % 360;
        const petalSaturation = lerp(70, 95, t_negentropy) * (1 - t_entropy * 0.5);
        const petalLightness = lerp(50, 75, t_negentropy) * (1 - t_entropy * 0.2);
        const petalAlpha = lerp(0.3, 0.8, t_negentropy) * (1 - t_entropy * 0.6);

        drawPetal(ctx, centerX, centerY, angle, petalLength, petalComplexity, petalHue, petalSaturation, petalLightness, petalAlpha, t_entropy, isNegentropyStable);
      }

      // Particles
      if (t_negentropy > 0.4 && Math.random() < t_negentropy * 0.5) {
        for(let i=0; i < Math.floor(t_negentropy * 3); i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = lerp(0.5, 2, t_negentropy) * (1 - t_entropy * 0.5);
          particlesRef.current.push({
            x: centerX + Math.cos(angle) * coreRadius * 1.2,
            y: centerY + Math.sin(angle) * coreRadius * 1.2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 50 + Math.random() * 50,
            maxLife: 50 + Math.random() * 50,
            size: lerp(0.5, 2.5, t_negentropy),
            color: `hsla(${lerp(180, 60, t_negentropy)}, 90%, 75%, 1)`,
            opacity: 1
          });
        }
      }
      particlesRef.current = particlesRef.current.filter(p => {
        // Apply hover repulsion force
        if (mousePos.current.x >= 0 && mousePos.current.y >= 0) {
          const dx = p.x - mousePos.current.x;
          const dy = p.y - mousePos.current.y;
          const dist = Math.hypot(dx, dy);
          const repelRadius = 80;
          if (dist < repelRadius && dist > 0) {
            const force = (repelRadius - dist) / repelRadius;
            const push = force * force * 3.5;
            p.vx += (dx / dist) * push;
            p.vy += (dy / dist) * push;
          }
        }

        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.opacity = p.life / p.maxLife;
        p.size *= 0.99; // Shrink slightly
        return p.life > 0 && p.opacity > 0.01 && p.size > 0.1;
      });

      particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color.replace(/,([\d.]+)\)/, `, ${p.opacity})`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0, p.size), 0, Math.PI * 2);
        ctx.fill();
      });
      if (particlesRef.current.length > 150) {
        particlesRef.current.splice(0, particlesRef.current.length - 150);
      }


      animationFrameIdRef.current = requestAnimationFrame(draw);
    };

    animationFrameIdRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [width, height, negentropyLevel, isNegentropyStable, currentSystemEntropy, drawPetal]);

  return (
    <div className="negentropic-bloom-visualizer bg-slate-900/80 backdrop-blur-sm border border-emerald-500/50 rounded-lg p-4 shadow-xl text-slate-100">
      <h3 className="text-md font-['Cinzel'] font-semibold text-emerald-300 mb-2 text-center">
        Negentropic Bloom
      </h3>
      <canvas 
        ref={canvasRef}
        onMouseMove={(e) => updateCoordinates(e.clientX, e.clientY)}
        onMouseLeave={() => { mousePos.current = { x: -1000, y: -1000 }; }}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={() => { mousePos.current = { x: -1000, y: -1000 }; }}
        className="rounded-md border border-slate-700/50 bg-black cursor-crosshair w-full"
        aria-label="Negentropic Bloom Visualization"
      />
    </div>
  );
};

export default NegentropicBloomVisualizer;