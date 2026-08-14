
import React from 'react';
import type { GlyphMutationNode } from '../../../types';

interface GlyphSelectorProps {
  glyphMutationNodes: GlyphMutationNode[];
  selectedGlyphId: string | null;
  onSelectGlyph: (glyphId: string) => void;
}

const GlyphSelector: React.FC<GlyphSelectorProps> = ({ glyphMutationNodes, selectedGlyphId, onSelectGlyph }) => {
  if (!glyphMutationNodes || glyphMutationNodes.length === 0) {
    return <p className="text-slate-500 italic">No glyphs available for reweaving.</p>;
  }
  return (
    <div className="space-y-2 max-h-60 md:max-h-80 overflow-y-auto pr-2 custom-scrollbar">
      {glyphMutationNodes.map(glyphNode => (
        <button
          key={glyphNode.id}
          onClick={() => onSelectGlyph(glyphNode.id)}
          className={`w-full text-left p-2.5 rounded border transition-all duration-150 ease-in-out transform hover:scale-[1.02]
            ${selectedGlyphId === glyphNode.id
              ? 'bg-emerald-600/40 border-emerald-500 text-emerald-100 shadow-lg ring-2 ring-emerald-500/70'
              : 'bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-slate-500 text-slate-300 hover:text-slate-100'}`}
        >
          <div className="font-cormorant text-sm font-semibold">{glyphNode.label || glyphNode.glyphId}</div>
          <div className="text-xs text-slate-400">
            Traits: {glyphNode.traits.length > 0 ? glyphNode.traits.join(', ').substring(0,30)+'...' : 'None'}
          </div>
          <div className="text-xs text-slate-500">Entropy: {(glyphNode?.entropyLevel || 0).toFixed(2)}δ</div>
        </button>
      ))}
    </div>
  );
};

export default GlyphSelector;
