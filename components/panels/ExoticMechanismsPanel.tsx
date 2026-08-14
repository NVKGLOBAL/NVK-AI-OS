
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ExoticMechanismsPanelProps } from '../../types';
import { ExoticMechanismMode, AgentName } from '../../types';
import { AGENT_PROFILES } from '../../constants';

import { useEcho } from '../../context/EchoContext';
interface Particle {
  id: string;
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'higgs' | 'vacuum' | 'topology_node';
  rotation?: number; 
  rotationSpeed?: number;
  trail?: {x: number, y: number}[]; // For topology lines
}

const MODE_DETAILS = {
  [ExoticMechanismMode.HiggsField]: {
    title: "Higgs Field Dynamics",
    description: "Visualizing particle mass acquisition. Higher entropy intensifies field interactions.",
    icon: "ri-copper-diamond-line"
  },
  [ExoticMechanismMode.QuantumVacuum]: {
    title: "Quantum Vacuum Fluctuations",
    description: "Observing virtual particle pair creation and annihilation. Denser flux at higher entropy.",
    icon: "ri-bubble-chart-line"
  },
  [ExoticMechanismMode.SpacetimeTopology]: {
    title: "Spacetime Topology Dynamics",
    description: "Mapping the fabric of spacetime. Increased entropy reveals structural instability.",
    icon: "ri-space-ship-line"
  }
};


const ExoticMechanismsPanel: React.FC<ExoticMechanismsPanelProps> = ({
  currentEntropy,
  width,
  height,
}) => {
  const { addEchoMessage } = useEcho();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentMode, setCurrentMode] = useState<ExoticMechanismMode>(ExoticMechanismMode.HiggsField);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  const agentProfile = AGENT_PROFILES[AgentName.ExoticMechanismAgent];

  const handleModeChange = (newMode: ExoticMechanismMode) => {
    setCurrentMode(newMode);
    // particlesRef.current will be re-initialized by the useEffect dependent on currentMode
    addEchoMessage(
      AgentName.ExoticMechanismAgent,
      `Switched to ${MODE_DETAILS[newMode].title}. Entropy: ${(currentEntropy || 0).toFixed(3)}δ.`,
      agentProfile?.colorClass || 'text-fuchsia-300'
    );
  };

  const initializeParticles = useCallback(() => {
    const numParticles = 50 + Math.floor(currentEntropy * 100);
    const newParticles: Particle[] = [];

    for (let i = 0; i < numParticles; i++) {
      const particleType = currentMode === ExoticMechanismMode.HiggsField ? 'higgs' :
                           currentMode === ExoticMechanismMode.QuantumVacuum ? 'vacuum' : 'topology_node';
      
      let particle: Particle = {
        id: `${particleType}-${i}-${Date.now()}`,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (0.2 + currentEntropy * 0.5),
        vy: (Math.random() - 0.5) * (0.2 + currentEntropy * 0.5),
        size: 1 + Math.random() * (1 + currentEntropy * 2),
        opacity: 0.1 + Math.random() * 0.4,
        life: 100 + Math.random() * 100,
        maxLife: 100 + Math.random() * 100,
        color: 'rgba(200, 220, 255, 0.5)', // Default color
        type: particleType,
      };

      if (particleType === 'higgs') {
        particle.color = `hsla(${180 + currentEntropy * 60}, 70%, ${60 + Math.random()*20}%, ${0.3 + Math.random()*0.3})`;
        particle.vx *= 0.5; particle.vy *= 0.5; // Slower drift
      } else if (particleType === 'vacuum') {
        particle.life = 20 + Math.random() * 30 * (1 - currentEntropy * 0.8); 
        particle.maxLife = particle.life;
        particle.color = Math.random() > 0.5 ? `hsla(180, 90%, 70%, ${0.6 + Math.random()*0.4})` : `hsla(300, 90%, 70%, ${0.6 + Math.random()*0.4})`; 
        particle.size = 0.5 + Math.random() * (1 + currentEntropy * 2.5);
        particle.vx = (Math.random() - 0.5) * (0.5 + currentEntropy * 1.5); // Specific velocity for vacuum
        particle.vy = (Math.random() - 0.5) * (0.5 + currentEntropy * 1.5); // Specific velocity for vacuum
      } else if (particleType === 'topology_node') {
          const gridSize = Math.max(2, 10 + Math.floor(currentEntropy * 5)); 
          const col = i % gridSize;
          const row = Math.floor(i / gridSize);
          
          if (row >= gridSize) continue; // Ensure we don't create more nodes than fit the conceptual grid

          particle.x = (width / (gridSize + 1)) * (col + 1);
          particle.y = (height / (gridSize + 1)) * (row + 1);
          particle.vx = 0; particle.vy = 0;
          particle.life = Infinity; 
          particle.size = 1 + currentEntropy * 0.5;
          particle.color = `hsla(210, 50%, 70%, ${0.4 + (1-currentEntropy)*0.4})`;
          particle.trail = [];
      }
      newParticles.push(particle);
    }
    particlesRef.current = newParticles;
  }, [width, height, currentMode, currentEntropy]);

  useEffect(() => {
    initializeParticles();
  }, [initializeParticles]); // initializeParticles is a useCallback, its dependencies will trigger this effect.

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;
    const t_entropy = currentEntropy;

    const draw = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
      bgGrad.addColorStop(0, `hsla(230, 40%, ${10 + t_entropy * 10}%, 0.95)`);
      bgGrad.addColorStop(1, `hsla(260, 50%, ${5 + t_entropy * 5}%, 0.98)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
      
      particlesRef.current.forEach(p => {
        switch (p.type) {
          case 'higgs':
            p.x += p.vx; p.y += p.vy;
            p.life--;
            
            const lifeRatioHiggs = p.life / p.maxLife;
            p.opacity = Math.sin(lifeRatioHiggs * Math.PI) * (0.3 + t_entropy * 0.4);
            p.size = (1 + Math.sin(lifeRatioHiggs * Math.PI) * (1 + t_entropy * 2)) * p.maxLife/150;

            if (p.life <= 0 || p.x < -p.size || p.x > width + p.size || p.y < -p.size || p.y > height + p.size) {
              // Reset particle p directly
              p.x = Math.random() * width;
              p.y = Math.random() * height;
              p.vx = (Math.random() - 0.5) * (0.2 + currentEntropy * 0.5) * 0.5;
              p.vy = (Math.random() - 0.5) * (0.2 + currentEntropy * 0.5) * 0.5;
              p.size = 1 + Math.random() * (1 + currentEntropy * 2);
              p.opacity = 0.1 + Math.random() * 0.4;
              p.life = 100 + Math.random() * 100;
              p.maxLife = p.life;
              p.color = `hsla(${180 + currentEntropy * 60}, 70%, ${60 + Math.random()*20}%, ${0.3 + Math.random()*0.3})`;
            }
            ctx.fillStyle = p.color.replace(/,\s*([0-9.]+)\)/, `, ${p.opacity})`);
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.size), 0, Math.PI*2); ctx.fill();
            break;

          case 'vacuum':
            p.x += p.vx; p.y += p.vy;
            p.life--;
            p.opacity = (p.life / p.maxLife) * (0.7 + t_entropy * 0.3);
            
            if (p.life <= 0) {
              // Reset particle p directly
              p.x = Math.random() * width;
              p.y = Math.random() * height;
              p.vx = (Math.random() - 0.5) * (0.5 + currentEntropy * 1.5);
              p.vy = (Math.random() - 0.5) * (0.5 + currentEntropy * 1.5);
              p.size = 0.5 + Math.random() * (1 + currentEntropy * 2.5);
              p.life = 20 + Math.random() * 30 * (1 - t_entropy * 0.8);
              p.maxLife = p.life;
              p.color = Math.random() > 0.5 ? `hsla(180, 90%, 70%, ${0.6 + Math.random()*0.4})` : `hsla(300, 90%, 70%, ${0.6 + Math.random()*0.4})`;
              p.opacity = 0.1 + Math.random() * 0.4;
            }
            ctx.fillStyle = p.color.replace(/,\s*([0-9.]+)\)/, `, ${p.opacity})`);
            ctx.beginPath(); ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            if (p.life > p.maxLife * 0.8 || p.life < p.maxLife * 0.2) {
                ctx.shadowColor = p.color; ctx.shadowBlur = p.size * 2;
                ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
            } else {
                ctx.fill();
            }
            break;

          case 'topology_node':
            const warpFactor = t_entropy * 20 * (1 + Math.sin(p.x * 0.01 + frameCount * 0.005) * 0.5);
            p.x += (Math.random() - 0.5) * warpFactor * 0.1 + Math.sin(p.y * 0.02 + frameCount * 0.01) * t_entropy * 0.3;
            p.y += (Math.random() - 0.5) * warpFactor * 0.1 + Math.cos(p.x * 0.02 + frameCount * 0.01) * t_entropy * 0.3;
            p.x = (p.x + width * 1.1) % (width * 1.2) - width * 0.1; // Allow slight overdraw before wrapping
            p.y = (p.y + height * 1.1) % (height * 1.2) - height * 0.1;

            p.trail = p.trail || [];
            p.trail.push({x: p.x, y: p.y});
            if (p.trail.length > 5 + t_entropy * 10) p.trail.shift();

            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.size), 0, Math.PI*2); ctx.fill();
            break;
        }
      });
      
      if (currentMode === ExoticMechanismMode.SpacetimeTopology) {
        const nodes = particlesRef.current.filter(p => p.type === 'topology_node');
        const gridSize = Math.max(2, Math.floor(Math.sqrt(nodes.length)));
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const p1 = nodes[i]; const p2 = nodes[j];
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            const initialDistThreshold = (gridSize > 1 ? width / (gridSize -1) : width) * 1.5; 

            if (dist < initialDistThreshold * (1 + t_entropy * 0.5)) { 
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              const lineOpacity = 0.1 + (1 - dist / (initialDistThreshold * (1 + t_entropy * 0.5))) * (0.3 + t_entropy * 0.3);
              ctx.strokeStyle = `hsla(210, 40%, 60%, ${Math.max(0.05, lineOpacity)})`;
              ctx.lineWidth = 0.5 + (1-t_entropy)*0.5;
              if (t_entropy > 0.7 && Math.random() < t_entropy * 0.1) { 
                  ctx.setLineDash([2 + t_entropy * 5, 3 + t_entropy * 3]);
                  ctx.stroke();
                  ctx.setLineDash([]);
              } else {
                   ctx.stroke();
              }
            }
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(draw);
    };

    animationFrameIdRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [width, height, currentMode, currentEntropy, initializeParticles]);

  const currentModeDetail = MODE_DETAILS[currentMode];

  return (
    <div className="exotic-mechanisms-panel bg-slate-900/80 backdrop-blur-sm border border-fuchsia-600/50 rounded-xl shadow-2xl p-4 text-slate-100" style={{ width: `${width}px`}}>
      <h3 className="text-lg font-['Cinzel'] font-semibold text-fuchsia-300 mb-2 text-center">
        <i className={`${currentModeDetail.icon} mr-2`}></i>{currentModeDetail.title}
      </h3>
      <p className="text-xs text-fuchsia-200/80 italic text-center mb-3 h-10">
        {currentModeDetail.description}
      </p>

      <div className="mode-selector flex justify-center gap-2 mb-3">
        {Object.values(ExoticMechanismMode).map(modeName => (
          <button
            key={modeName}
            onClick={() => handleModeChange(modeName)}
            className={`px-3 py-1 text-[10px] rounded-md transition-colors border
              ${currentMode === modeName
                ? 'bg-fuchsia-500 border-fuchsia-400 text-white font-semibold'
                : 'bg-slate-700 border-slate-600 hover:bg-fuchsia-700/50 hover:border-fuchsia-500 text-slate-300'
              }`}
          >
            {modeName.replace('Dynamics','').replace('Fluctuations','').trim()}
          </button>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={width - 32} 
        height={height - 160} 
        className="rounded-md border border-slate-700/70 bg-black shadow-inner mx-auto block"
        aria-label={`Visualization of ${currentModeDetail.title}`}
      />
       <div className="mt-2 text-center text-xs text-slate-400 font-mono">
        Entropy Influence: {(currentEntropy || 0).toFixed(3)}δ
      </div>
    </div>
  );
};

export default ExoticMechanismsPanel;
