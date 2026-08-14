
import React from 'react';
import type { Axiom } from '../types';

type Props = {
  axioms: Axiom[];
};

const CodexAxiomViewer: React.FC<Props> = ({ axioms }) => {
  return (
    <div className="codex-axiom-viewer p-4 space-y-6 overflow-y-auto max-h-[80vh] bg-gradient-to-b from-slate-800/90 to-slate-950/90 text-slate-100 rounded-lg shadow-inner border border-slate-700/50">
      {axioms.map((a) => {
        let layerColorClass = 'text-indigo-300';
        let borderColorClass = 'border-slate-600/70';
        let bgColorClass = 'bg-slate-900/70';
        let resonanceColorClass = 'text-slate-300';

        if (a.isQuarantined) {
          layerColorClass = 'text-red-500 line-through';
          borderColorClass = 'border-red-700/50 border-dashed';
          bgColorClass = 'bg-slate-800/50';
          resonanceColorClass = 'text-red-400';
        } else {
          switch (a.layer) {
            case 'I': layerColorClass = 'text-cyan-300'; borderColorClass = 'border-cyan-700/50'; bgColorClass = 'bg-cyan-950/40'; resonanceColorClass = 'text-cyan-400'; break;
            case 'II': layerColorClass = 'text-amber-300'; borderColorClass = 'border-amber-700/50'; bgColorClass = 'bg-amber-950/40'; resonanceColorClass = 'text-amber-400'; break;
            case 'III': layerColorClass = 'text-violet-300'; borderColorClass = 'border-violet-700/50'; bgColorClass = 'bg-violet-950/40'; resonanceColorClass = 'text-violet-400'; break;
            case 'IV': layerColorClass = 'text-rose-300'; borderColorClass = 'border-rose-700/50'; bgColorClass = 'bg-rose-950/40'; resonanceColorClass = 'text-rose-400'; break;
            case 'V': layerColorClass = 'text-emerald-300'; borderColorClass = 'border-emerald-700/50'; bgColorClass = 'bg-emerald-950/40'; resonanceColorClass = 'text-emerald-400'; break;
            case 'Ω': layerColorClass = 'text-lime-300'; borderColorClass = 'border-lime-700/50'; bgColorClass = 'bg-lime-950/40'; resonanceColorClass = 'text-lime-400'; break;
            default: layerColorClass = 'text-indigo-300'; resonanceColorClass = 'text-indigo-400'; break;
          }
        }
        if (a.series === 'AX-Ω') { 
            bgColorClass = 'bg-lime-950/50';
            borderColorClass = 'border-lime-600/60';
        }


        return (
          <div key={a.id} className={`p-4 border rounded-md shadow-lg backdrop-blur-sm ${borderColorClass} ${bgColorClass}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-['Cinzel']">
                {`Layer: ${a.layer} / Series: ${a.series}`}
              </div>
              <div className={`font-['Cinzel'] text-2xl ${layerColorClass}`}>
                {a.number || a.layer}
              </div>
            </div>
            <h3 className={`text-xl font-semibold font-['Cinzel'] mb-2 border-b border-slate-700 pb-2 ${a.isQuarantined ? 'text-slate-500' : 'text-slate-100'}`}>
              {a.title} {a.isQuarantined && <span className="text-xs text-red-400">(Quarantined)</span>}
            </h3>
            <p className="mt-2 text-sm text-slate-200 whitespace-pre-line leading-relaxed font-['Cormorant']">{a.content}</p>
            <div className="text-right text-xs font-mono text-slate-400 mt-3 pt-2 border-t border-slate-700/50">
              Resonance: <span className={`${resonanceColorClass} font-semibold`}>{a.resonanceFrequency.toFixed(1)} Hz</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CodexAxiomViewer;