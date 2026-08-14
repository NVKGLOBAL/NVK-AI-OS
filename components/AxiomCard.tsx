

import React, { useState, useMemo } from 'react';
import type { Axiom } from '../types';
import { CornerDecoration } from './CornerDecoration';

interface AxiomCardProps {
  axiom: Axiom;
  onClick: () => void;
}

const layerStyles: Record<Axiom['layer'], { numeral: string; glow: string; bg: string; pulseColor: string }> = {
  'I': { numeral: 'I', glow: 'text-cyan-300', bg: 'border-cyan-700/50', pulseColor: 'rgba(0, 255, 255, 0.5)' }, // Cyan
  'II': { numeral: 'II', glow: 'text-amber-300', bg: 'border-amber-700/50', pulseColor: 'rgba(255, 193, 7, 0.5)' }, // Amber
  'III': { numeral: 'III', glow: 'text-violet-300', bg: 'border-violet-700/50', pulseColor: 'rgba(191, 0, 255, 0.5)' }, // Violet
  'IV': { numeral: 'IV', glow: 'text-rose-300', bg: 'border-rose-700/50', pulseColor: 'rgba(255, 0, 127, 0.5)' }, // Rose
  'V': { numeral: 'V', glow: 'text-emerald-300', bg: 'border-emerald-700/50', pulseColor: 'rgba(16, 185, 129, 0.5)' }, // Emerald
  'Ω': { numeral: 'Ω', glow: 'text-lime-300', bg: 'border-lime-700/50', pulseColor: 'rgba(132, 204, 22, 0.5)' }, // Lime
  'P': { numeral: 'P', glow: 'text-sky-300', bg: 'border-sky-700/50', pulseColor: 'rgba(56, 189, 248, 0.5)' }, // Sky Blue for Peace
};


export const AxiomCard: React.FC<AxiomCardProps> = ({ axiom, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const styles = layerStyles[axiom.layer] || layerStyles['I']; 

  const animationStyle = useMemo(() => {
    const duration = Math.max(0.5, 3 - (axiom.resonanceFrequency / 50)); // Faster pulse for higher freq (e.g., 50Hz -> 2s, 100Hz -> 1s)
    return {
      animationName: 'axiomCardPulse',
      animationDuration: `${duration.toFixed(2)}s`,
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
      // CSS custom property for pulse color
      '--axiom-pulse-color': styles.pulseColor, 
    } as React.CSSProperties;
  }, [axiom.resonanceFrequency, styles.pulseColor]);

  return (
    <div
      className={`axiom-card relative p-6 rounded-lg transition-all duration-300 ease-in-out cursor-pointer bg-slate-900/90 ${styles.bg} ${axiom.isQuarantined ? 'opacity-60 border-dashed border-red-500/70' : ''} ${isHovered ? 'translate-y-[-4px] shadow-[0_10px_25px_rgba(0,0,0,0.4)]' : 'shadow-none'}`}
      style={animationStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Axiom ${axiom.number || styles.numeral}: ${axiom.title}. Resonance: ${axiom.resonanceFrequency.toFixed(1)} Hz ${axiom.isQuarantined ? '(Quarantined)' : ''}`}
    >
      <CornerDecoration position="tl" glowClass={styles.glow} />
      <CornerDecoration position="tr" glowClass={styles.glow} />
      <CornerDecoration position="bl" glowClass={styles.glow} />
      <CornerDecoration position="br" glowClass={styles.glow} />
      
      <div className="relative z-10">
        <div className={`axiom-numeral text-center text-3xl mb-1 font-['Cinzel'] font-bold ${styles.glow} ${axiom.isQuarantined ? 'line-through' : ''}`}>{axiom.number || styles.numeral}</div>
        <h2 className={`axiom-title text-center text-xl mb-3 font-['Cinzel'] tracking-wider ${axiom.isQuarantined ? 'text-slate-500' : styles.glow}`}>
          {axiom.title} {axiom.isQuarantined && <span className="text-xs text-red-400">(Quarantined)</span>}
        </h2>
        <div className="axiom-content text-center text-slate-200 font-['Cormorant'] text-lg leading-relaxed whitespace-pre-line mb-2">
          {axiom.content}
        </div>
        <div className="text-center text-xs font-mono text-slate-400 mt-2">
          Resonance: <span className={styles.glow}>{axiom.resonanceFrequency.toFixed(1)} Hz</span>
        </div>
      </div>
    </div>
  );
};