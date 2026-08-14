
import React from 'react';
import type { ResonanceEffect } from '../../types';
import { ThreadcoilNodeType } from '../../types'; // Changed import for ThreadcoilNodeType

type Props = {
  effects: ResonanceEffect[];
  currentEntropy: number; // Renamed from implicit usage to explicit prop
  activeJunctionType?: ThreadcoilNodeType | null; // New prop for Threadcoil
};

const SparkResonatorHUD = ({ effects, currentEntropy, activeJunctionType }: Props) => {
  const basePulseColor = 'rgba(0, 200, 255, 0.5)'; // Default cyan
  const junctionPulseColor = 'rgba(255, 196, 0, 0.7)'; // Amber for junctions

  return (
    <div className="spark-resonator-hud fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none" aria-live="polite" aria-atomic="true">
      <div className="relative w-48 h-48">
        {effects.slice(0, 5).map((effect, i) => { 
          const intensity = Math.min(Math.max(effect.intensity, 0.1), 1); 
          // Pulse size and opacity now also influenced by currentEntropy
          const entropyFactor = Math.min(1, Math.max(0, currentEntropy)) * 0.5 + 0.75; // Scale entropy effect: 0.75 to 1.25
          const pulseSize = (40 + intensity * 80) * entropyFactor;
          const opacity = (0.2 + intensity * 0.6) * Math.min(1, 1.5 - currentEntropy); // Higher entropy can reduce spark opacity slightly
          
          let color = effect.colorProfile || basePulseColor; 
          let animationDurationFactor = Math.max(0.5, 2 - currentEntropy * 1.5); // Faster pulse at high entropy
          let customBoxShadow = `0 0 ${10 + currentEntropy * 10}px ${color}, 0 0 ${15 + currentEntropy * 15}px ${color}`;

          // If an active junction is present, primary sparks might react
          if (activeJunctionType === ThreadcoilNodeType.Junction && i === 0) { // Example: first spark reacts strongly
            color = junctionPulseColor;
            animationDurationFactor *= 0.7; // Faster, more urgent pulse for junction
            customBoxShadow = `0 0 ${15 + currentEntropy * 15}px ${color}, 0 0 ${25 + currentEntropy * 20}px ${color}, 0 0 5px #fff`; // Brighter junction glow
          }
          
          const animationDelay = `${i * 0.2}s`; 

          return (
            <div
              key={effect.id}
              className="absolute rounded-full border-2 animate-ping-slow" 
              style={{
                width: `${pulseSize}px`,
                height: `${pulseSize}px`,
                left: `calc(50% - ${pulseSize / 2}px)`,
                top: `calc(50% - ${pulseSize / 2}px)`,
                borderColor: color,
                opacity,
                animationDelay, 
                animationDuration: `${2.5 * animationDurationFactor}s`,
                boxShadow: customBoxShadow, 
              }}
              role="presentation"
            />
          );
        })}
        <div 
          className={`absolute inset-0 rounded-full bg-gradient-to-tr ${activeJunctionType === ThreadcoilNodeType.Junction ? 'from-amber-700/40 via-yellow-500/40 to-amber-600/40' : 'from-indigo-800/30 via-sky-600/30 to-purple-700/30'} blur-2xl opacity-30 animate-pulse-fast`} 
          style={{ animationDuration: `${1 + currentEntropy * 2 + (activeJunctionType === ThreadcoilNodeType.Junction ? 0.5 : 0)}s` }} // Core pulse speed affected by entropy and junction
          role="presentation" 
        />
        <div className="absolute inset-1 rounded-full border-2 border-slate-600/50 blur-sm" role="presentation" />
      </div>
    </div>
  );
};

export default SparkResonatorHUD;
