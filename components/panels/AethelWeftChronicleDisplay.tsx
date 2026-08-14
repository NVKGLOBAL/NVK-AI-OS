
import React from 'react';
import type { AethelWeftChronicle, AethelWeftTheme } from '../../types';

interface AethelWeftChronicleDisplayProps {
  chronicle: AethelWeftChronicle;
}

const ElementalSignatureSymbol: React.FC<{ signature: AethelWeftTheme['signature'] }> = ({ signature }) => {
  // Map signature string to actual symbol characters
  const symbols: Record<AethelWeftTheme['signature'], string> = {
    '🜂 Fire': '🜂',
    '🜄 Water': '🜄',
    '🜁 Air': '🜁',
    '🜃 Earth': '🜃',
    '🜄🜂🜁 Combined': '✨', // Example for combined
    '∅ Void': '∅',
  };
  return <span className="text-xl mr-2" title={signature}>{symbols[signature] || '?'}</span>;
};

const AethelWeftChronicleDisplay: React.FC<AethelWeftChronicleDisplayProps> = ({ chronicle }) => {
  return (
    <div className="aethel-weft-chronicle-display bg-slate-900/80 backdrop-blur-sm border border-cyan-700/50 rounded-lg p-4 shadow-lg text-slate-100">
      <h3 className="text-lg font-['Cinzel'] font-semibold text-cyan-300 mb-2 text-center border-b border-cyan-700/30 pb-2">
        Aethel-Weft Chronicle Resonance
      </h3>
      
      <div className="mb-3 text-center">
        <p className="text-sm text-cyan-100 font-['Cinzel'] tracking-wider">{chronicle.name}</p>
        <p className="text-xs text-cyan-200/80 italic mt-0.5">"{chronicle.firstVerse}"</p>
      </div>

      <div className="mb-3">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-mono text-center">Weaving Mode: <span className="text-cyan-200">{chronicle.currentWeavingMode}</span></p>
      </div>

      <h4 className="text-sm font-['Cinzel'] text-cyan-200 mb-2 mt-3 text-center">Active Thematic Anchors:</h4>
      <div className="space-y-2">
        {chronicle.activeThemes.map(theme => (
          <div key={theme.id} className={`p-2.5 rounded-md border ${theme.colorClass.replace('text-', 'border-')}/50 bg-slate-800/50`}>
            <div className="flex items-center mb-1">
              <ElementalSignatureSymbol signature={theme.signature} />
              <span className={`font-semibold font-['Cinzel'] text-sm ${theme.colorClass}`}>{theme.name}</span>
            </div>
            <p className="text-xs text-slate-300/90 font-['Cormorant'] leading-tight ml-7">{theme.narrativeFunction}</p>
            <p className="text-[10px] text-slate-400/80 ml-7 mt-0.5">Visual Echo: <em className="italic">{theme.visualDriftCue}</em></p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AethelWeftChronicleDisplay;
