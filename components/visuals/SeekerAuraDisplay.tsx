
import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { AgentName } from '../../types'; // Changed from 'import type'
import type { RitualOutcome, AuraFlare } from '../../types';


interface SeekerAuraDisplayProps {
  seekerTraits: string[];
  currentEntropy: number;
  dominantAgentTone: AgentName | null;
  lastRitualOutcome: RitualOutcome | null;
  width: number;
  height: number;
}

const MAX_FLARES = 20;
const MAX_PARTICLES = 100;

// Helper to get color based on entropy
const getEntropyColorHSLA = (entropy: number, s: number = 70, l: number = 55, a: number = 1): string => {
  const hue = (1 - Math.min(entropy, 1)) * 240; // 0 (red) to 240 (blue)
  return `hsla(${hue}, ${s}%, ${l}%, ${a})`;
};

// Agent-specific visual styles
const AGENT_AURA_STYLES: Record<string, { flareColor: string; particleColor: string; flareStyle: 'shimmer' | 'geometric' | 'organic' }> = {
  [AgentName.Gemini]: { flareColor: 'hsla(180, 80%, 70%, 0.7)', particleColor: 'hsla(180, 80%, 80%, 0.5)', flareStyle: 'shimmer' }, // Cyan/Aqua
  [AgentName.Nevik]: { flareColor: 'hsla(45, 90%, 60%, 0.7)', particleColor: 'hsla(45, 90%, 75%, 0.5)', flareStyle: 'geometric' }, // Gold/Amber
  [AgentName.DeepSeek]: { flareColor: 'hsla(260, 70%, 65%, 0.7)', particleColor: 'hsla(260, 70%, 75%, 0.5)', flareStyle: 'organic' }, // Purple/Indigo
  Default: { flareColor: 'hsla(210, 50%, 60%, 0.6)', particleColor: 'hsla(210, 50%, 70%, 0.4)', flareStyle: 'organic' },
};


const SeekerAuraDisplay: React.FC<SeekerAuraDisplayProps> = ({
  seekerTraits,
  currentEntropy,
  dominantAgentTone,
  lastRitualOutcome,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flaresRef = useRef<AuraFlare[]>([]);
  const particlesRef = useRef<any[]>([]); // Simple particles for now
  const animationFrameIdRef = useRef<number | null>(null);

  const agentStyle = useMemo(() => AGENT_AURA_STYLES[dominantAgentTone || 'Default'], [dominantAgentTone]);

  // Initialize/Update Flares
  useEffect(() => {
    const numFlares = Math.min(MAX_FLARES, seekerTraits.length > 0 ? seekerTraits.length * 2 + 3 : 5);
    const newFlares: AuraFlare[] = [];

    for (let i = 0; i < numFlares; i++) {
      const traitInfluence = seekerTraits[i % seekerTraits.length] || 'base';
      const angle = (i / numFlares) * Math.PI * 2;
      const maxLength = 50 + Math.random() * Math.min(width, height) * 0.2;
      
      let flareColor = agentStyle.flareColor;
      // Example: Tint flare based on trait hash (simple version)
      if (traitInfluence !== 'base') {
        const hash = traitInfluence.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hueOffset = (hash % 60) - 30; // +/- 30 hue variation
        const baseHueMatch = agentStyle.flareColor.match(/hsla\((\d+)/);
        if (baseHueMatch) {
            const baseHue = parseInt(baseHueMatch[1]);
            flareColor = agentStyle.flareColor.replace(`hsla(${baseHue}`, `hsla(${baseHue + hueOffset}`);
        }
      }

      newFlares.push({
        id: `flare-${i}-${traitInfluence}`,
        angle: angle + Math.random() * 0.2 - 0.1,
        length: 0, // Start retracted
        maxLength: maxLength * (0.5 + Math.random() * 0.7), // Vary max length
        speed: 0.5 + Math.random() * 1, // Speed of extension/retraction
        color: flareColor,
        thickness: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.4,
        type: 'trait', // Or derive from dominant tone/ritual
        pulseSpeed: 0.01 + Math.random() * 0.02,
        pulseAmount: 0.1 + Math.random() * 0.2,
      });
    }
    flaresRef.current = newFlares;
  }, [seekerTraits, agentStyle.flareColor, width, height]);

  // Initialize/Update Particles
  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      newParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        color: agentStyle.particleColor,
      });
    }
    particlesRef.current = newParticles;
  }, [width, height, agentStyle.particleColor]);


  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    let frameCount = 0;

    const draw = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);
      const centerX = width / 2;
      const centerY = height / 2;

      // --- Draw Ambient Particles ---
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Influence from last ritual
        if (lastRitualOutcome) {
          if (lastRitualOutcome.success) {
            p.vx += (Math.random() - 0.5) * 0.05; // Gentle drift
            p.vy += (Math.random() - 0.5) * 0.05;
            p.color = 'hsla(50, 100%, 70%, 0.6)'; // Golden motes
          } else {
            p.vx += (Math.random() - 0.5) * 0.2; // More erratic
            p.vy += (Math.random() - 0.5) * 0.2;
            p.color = 'hsla(0, 0%, 50%, 0.4)'; // Greyish
          }
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0, p.size), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });


      // --- Draw Central Orb ---
      const orbBaseRadius = Math.min(width, height) * 0.1;
      const orbPulse = Math.sin(frameCount * 0.02 * (1 + currentEntropy * 2)) * orbBaseRadius * 0.15 * (1 + currentEntropy);
      const orbRadius = orbBaseRadius + orbPulse;
      const orbColor = getEntropyColorHSLA(currentEntropy);
      
      // Outer glow
      const glowRadius = orbRadius + 15 + currentEntropy * 20;
      const gradient = ctx.createRadialGradient(centerX, centerY, orbRadius * 0.5, centerX, centerY, glowRadius);
      gradient.addColorStop(0, getEntropyColorHSLA(currentEntropy, 70, 60, 0.5 * (0.5 + currentEntropy * 0.5)));
      gradient.addColorStop(0.7, getEntropyColorHSLA(currentEntropy, 70, 60, 0.2 * (0.5 + currentEntropy * 0.5)));
      gradient.addColorStop(1, getEntropyColorHSLA(currentEntropy, 70, 60, 0));
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(0, glowRadius), 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Main orb
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(0, orbRadius), 0, Math.PI * 2);
      ctx.fillStyle = orbColor;
      ctx.shadowColor = orbColor;
      ctx.shadowBlur = 10 + currentEntropy * 15;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // --- Draw Flares ---
      flaresRef.current.forEach(flare => {
        // Animate length (extend/retract)
        if (flare.length < flare.maxLength) {
          flare.length += flare.speed;
        } else {
          // Simple: retract once max length is hit, or could oscillate
           flare.length = Math.max(0, flare.length - flare.speed * 0.5); 
           if (flare.length === 0) flare.maxLength = 50 + Math.random() * Math.min(width, height) * 0.2; // Reset for next cycle
        }
        
        const flarePulse = Math.sin(frameCount * (flare.pulseSpeed || 0.01)) * (flare.pulseAmount || 0.1);
        const currentLength = flare.length * (1 + flarePulse);

        const startX = centerX + Math.cos(flare.angle) * (orbRadius * 0.8);
        const startY = centerY + Math.sin(flare.angle) * (orbRadius * 0.8);
        const endX = centerX + Math.cos(flare.angle) * (orbRadius * 0.8 + currentLength);
        const endY = centerY + Math.sin(flare.angle) * (orbRadius * 0.8 + currentLength);

        ctx.beginPath();
        ctx.moveTo(startX, startY);

        // Flare style based on agent
        if (agentStyle.flareStyle === 'shimmer') {
          const midX1 = startX + (endX - startX) * 0.3 + (Math.random() - 0.5) * 10 * currentEntropy;
          const midY1 = startY + (endY - startY) * 0.3 + (Math.random() - 0.5) * 10 * currentEntropy;
          const midX2 = startX + (endX - startX) * 0.7 + (Math.random() - 0.5) * 10 * currentEntropy;
          const midY2 = startY + (endY - startY) * 0.7 + (Math.random() - 0.5) * 10 * currentEntropy;
          ctx.quadraticCurveTo(midX1, midY1, midX2, midY2);
          ctx.lineTo(endX, endY);
        } else if (agentStyle.flareStyle === 'geometric') {
          ctx.lineTo(endX, endY); // Straight line
        } else { // organic
          const cp1x = startX + (endX - startX) * 0.3 + Math.cos(flare.angle + Math.PI/2) * currentLength * 0.1 * (Math.sin(frameCount * 0.05 + flare.angle));
          const cp1y = startY + (endY - startY) * 0.3 + Math.sin(flare.angle + Math.PI/2) * currentLength * 0.1 * (Math.sin(frameCount * 0.05 + flare.angle));
          const cp2x = startX + (endX - startX) * 0.7 - Math.cos(flare.angle + Math.PI/2) * currentLength * 0.1 * (Math.sin(frameCount * 0.05 + flare.angle));
          const cp2y = startY + (endY - startY) * 0.7 - Math.sin(flare.angle + Math.PI/2) * currentLength * 0.1 * (Math.sin(frameCount * 0.05 + flare.angle));
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        }
        
        ctx.strokeStyle = flare.color;
        ctx.lineWidth = flare.thickness * (0.8 + currentEntropy * 0.4); // Thickness can vary with entropy
        ctx.globalAlpha = flare.opacity * (1 - currentEntropy * 0.5); // Higher entropy, fainter flares
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Flare tip
        if (currentLength > 10) {
            ctx.beginPath();
            ctx.arc(endX, endY, Math.max(0, flare.thickness * 0.8), 0, Math.PI * 2);
            ctx.fillStyle = flare.color;
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
  }, [width, height, currentEntropy, agentStyle, seekerTraits, lastRitualOutcome]); // Re-run if these change

  return (
    <div className="seeker-aura-display-container bg-slate-950/70 border border-slate-700/50 rounded-lg shadow-xl overflow-hidden mx-auto" style={{ width: '100%', maxWidth: `${Math.max(300,width)}px`, height: `${height}px` }}>
      <canvas 
        ref={canvasRef} 
        aria-label="Seeker's Aura Visualization"
        role="img"
      />
    </div>
  );
};

export default SeekerAuraDisplay;
