
import React from 'react';
import type { TraitGate } from '../../types';

type Props = {
  gates: TraitGate[];
  onAttemptUnlock: (gateId: string) => void;
};

const TraitGatePanel: React.FC<Props> = ({ gates, onAttemptUnlock }) => {
  return (
    <div className="trait-gate-panel p-4 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-md text-slate-100 space-y-4 max-h-[60vh] overflow-y-auto">
      <h3 className="text-xl font-bold text-indigo-300 font-cinzel sticky top-0 bg-slate-900/80 backdrop-blur-sm py-2 z-10">🔐 Trait Gates Monitor</h3>
      {gates.length === 0 && <p className="text-slate-400 italic text-center py-4">No trait gates currently active.</p>}
      {gates.map((gate) => (
        <div 
          key={gate.id} 
          className={`p-4 border rounded-md ${gate.unlocked ? 'border-emerald-500/70 bg-slate-800/60' : 'border-rose-600/70 bg-slate-800/40'} shadow-lg transition-all duration-300 ease-in-out`}
          role="region"
          aria-labelledby={`gate-title-${gate.id}`}
        >
          <div className="flex justify-between items-center mb-2">
            <span id={`gate-title-${gate.id}`} className="text-md text-slate-300 font-cinzel">Glyph Link: <span className="font-semibold text-slate-100">{gate.glyphId}</span></span>
            <span 
              className={`text-xs px-3 py-1 rounded-full font-semibold tracking-wider ${gate.unlocked ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500' : 'bg-rose-600/30 text-rose-300 border border-rose-500'}`}
              aria-live="polite"
            >
              {gate.unlocked ? 'UNLOCKED' : 'LOCKED'}
            </span>
          </div>
          <div className="text-sm mb-3">
            <p className="text-slate-400 mb-1">Required Traits:</p>
            {gate.requiredTraits.length === 0 && <span className="italic text-slate-500 ml-3">None</span>}
            <ul className="list-disc list-inside ml-3 text-slate-300 space-y-0.5">
              {gate.requiredTraits.map((trait, i) => (
                <li key={i} className="text-slate-300">{trait}</li>
              ))}
            </ul>
          </div>
          {!gate.unlocked && (
            <button
              onClick={() => onAttemptUnlock(gate.id)}
              className="mt-2 w-full px-4 py-2 text-sm rounded-button bg-indigo-600 hover:bg-indigo-500 text-indigo-50 transition-all duration-150 ease-in-out flex items-center justify-center group focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              aria-label={`Attempt to unlock gate for glyph ${gate.glyphId}`}
              disabled={gate.unlocked}
            >
              <i className="ri-key-2-fill mr-2 group-hover:animate-pulse"></i>
              Attempt Unlock
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default TraitGatePanel;
