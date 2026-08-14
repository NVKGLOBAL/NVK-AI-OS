
import React from 'react';
import type { GlyphMutationNode } from '../../../types';

interface TraitMutationCanvasPlaceholderProps {
  baseGlyph: GlyphMutationNode | null;
  newTraits: string[];
  isWeaving: boolean;
}

const TraitMutationCanvasPlaceholder: React.FC<TraitMutationCanvasPlaceholderProps> = ({ baseGlyph, newTraits, isWeaving }) => {
  return (
    <div className={`h-48 md:h-64 bg-slate-800/60 rounded-lg border border-slate-700 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-inner
      ${isWeaving ? 'animate-pulse-fast' : ''}
    `}>
      {isWeaving && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-16 h-16 border-4 border-t-emerald-400 border-r-emerald-400 border-b-transparent border-l-transparent rounded-full animate-spin-slow"></div>
        </div>
      )}
      <div className={`transition-opacity duration-500 ${isWeaving ? 'opacity-30' : 'opacity-100'}`}>
        <h5 className="text-sm font-semibold text-emerald-400 mb-2 font-cinzel">Trait Mutation Preview</h5>
        {baseGlyph ? (
          <>
            <p className="text-xs text-slate-400 mb-1">
              Base: <span className="text-slate-300">{baseGlyph.label}</span>
            </p>
            <p className="text-xs text-slate-400 mb-1">
              Current Traits: <span className="text-slate-300">{baseGlyph.traits.join(', ') || 'None'}</span>
            </p>
            <div className="my-2">
              <i className="ri-arrow-down-s-line text-emerald-500 text-2xl"></i>
            </div>
            <p className="text-xs text-slate-400 mb-1">
              New Traits: <span className="text-emerald-300 font-semibold">{newTraits.join(', ') || 'Calculating...'}</span>
            </p>
          </>
        ) : (
          <p className="text-slate-500 italic text-xs">Select a glyph and axiom to preview mutations.</p>
        )}
      </div>
    </div>
  );
};

export default TraitMutationCanvasPlaceholder;
