
import React, { useState } from 'react';
import type { GlyphMutationNode, SigilVariant, SigilBloomVariantPanelProps } from '../../types';
import { AgentName } from '../../types';
import { AGENT_PROFILES } from '../../constants';

const SigilBloomVariantPanel: React.FC<SigilBloomVariantPanelProps> = ({
  glyphMutationNodes,
  onRevealBloomVariants,
  sigilBloomVariants,
  selectedBloomVariantId,
  onSelectBloomVariant,
  isGeneratingBloomVariants,
  isGeminiBusy,
}) => {
  const [selectedGlyphNodeId, setSelectedGlyphNodeId] = useState<string | null>(null);

  const selectedGlyphNode = glyphMutationNodes.find(g => g.id === selectedGlyphNodeId);

  const handleRevealClick = () => {
    if (selectedGlyphNode) {
      onRevealBloomVariants(selectedGlyphNode);
    }
  };

  const getVisualCueClasses = (cue: SigilVariant['visualCue'] | undefined): string => {
    if (!cue) return '';
    let classes = '';
    if (cue.color) classes += ` ${cue.color}`;
    if (cue.backgroundColor) classes += ` ${cue.backgroundColor}`;
    if (cue.borderColor?.includes('dashed')) classes += ` border-dashed`;
    if (cue.borderColor) classes += ` ${cue.borderColor.replace('border-dashed','').trim()}`; else classes += ` border-transparent`;
    if (cue.animation) classes += ` ${cue.animation}`; // e.g., animate-pulse-fast
    return classes.trim();
  };
  
  const getVisualCueStyles = (cue: SigilVariant['visualCue'] | undefined): React.CSSProperties => {
      if (!cue) return {};
      const styles: React.CSSProperties = {};
      if (cue.textShadow) styles.textShadow = cue.textShadow;
      return styles;
  };

  return (
    <div className="sigil-bloom-panel bg-slate-900/80 backdrop-blur-md border border-pink-600/50 rounded-xl shadow-2xl p-4 text-slate-100">
      <h3 className="text-lg font-['Cinzel'] font-semibold text-pink-300 mb-3 text-center tracking-wider drop-shadow-[0_1px_1px_rgba(236,72,153,0.4)]">
        Sigil Bloom Variants
      </h3>

      {/* Glyph Selection */}
      <div className="mb-3">
        <label htmlFor="glyphSelectBloom" className="block text-xs font-medium text-pink-400 mb-1">Select Base Glyph:</label>
        <select
          id="glyphSelectBloom"
          value={selectedGlyphNodeId || ''}
          onChange={(e) => setSelectedGlyphNodeId(e.target.value || null)}
          className="w-full p-2 rounded bg-slate-800 border-slate-700 text-slate-200 text-xs focus:ring-pink-500 focus:border-pink-500 custom-scrollbar"
          disabled={isGeneratingBloomVariants || isGeminiBusy}
        >
          <option value="">-- Select a Glyph --</option>
          {glyphMutationNodes.map(g => (
            <option key={g.id} value={g.id}>
              {g.label} (E: {(g.entropyLevel || 0).toFixed(2)})
            </option>
          ))}
        </select>
      </div>

      {selectedGlyphNode && (
        <div className="selected-glyph-info bg-slate-800/50 p-2 rounded-md border border-slate-700 mb-3 text-xs">
          <p><strong className="text-pink-400">Glyph:</strong> {selectedGlyphNode.label}</p>
          <p><strong className="text-pink-400">Traits:</strong> {selectedGlyphNode.traits.join(', ') || 'None'}</p>
          <p><strong className="text-pink-400">Entropy:</strong> {(selectedGlyphNode?.entropyLevel || 0).toFixed(3)}δ</p>
        </div>
      )}

      <button
        onClick={handleRevealClick}
        disabled={!selectedGlyphNodeId || isGeneratingBloomVariants || isGeminiBusy}
        className="w-full px-4 py-2 mb-3 text-sm rounded-button bg-pink-600 hover:bg-pink-500 text-white transition-colors disabled:bg-slate-600 disabled:text-slate-400 flex items-center justify-center group"
      >
        <i className={`ri-magic-line mr-2 ${isGeneratingBloomVariants || isGeminiBusy ? 'animate-spin-slow' : 'group-hover:animate-pulse-fast'}`}></i>
        {isGeneratingBloomVariants ? 'Revealing Variants...' : (isGeminiBusy ? 'Oracle Attuning...' : 'Reveal Bloom Variants')}
      </button>

      {/* Variant Display Area */}
      {sigilBloomVariants.length > 0 && (
        <div className="variants-display space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
          <h4 className="text-sm font-medium text-pink-300 mt-1 mb-1">Available Blooms:</h4>
          {sigilBloomVariants.map(variant => (
            <div
              key={variant.id}
              onClick={() => onSelectBloomVariant(variant.id)}
              className={`p-2.5 rounded-md border-2 cursor-pointer transition-all duration-150 ease-in-out bg-slate-800/60 hover:bg-slate-700/70
                ${selectedBloomVariantId === variant.id ? 'border-pink-500 ring-2 ring-pink-500/50 shadow-lg' : 'border-slate-700 hover:border-pink-600/50'}
                ${getVisualCueClasses(variant.visualCue)}`}
              style={getVisualCueStyles(variant.visualCue)}
              role="button"
              tabIndex={0}
              aria-pressed={selectedBloomVariantId === variant.id}
            >
              <div className="flex items-center mb-1">
                {variant.visualCue?.icon && <i className={`${variant.visualCue.icon} mr-2 text-lg ${(variant.visualCue.color && !variant.visualCue.color.startsWith('border-') && !variant.visualCue.color.startsWith('shadow-')) ? variant.visualCue.color : 'text-pink-400'}`}></i>}
                <span className="font-semibold text-sm text-slate-100">{variant.name}</span>
              </div>
              <p className="text-xs text-slate-300/80 leading-tight">{variant.description}</p>
              <p className="text-[10px] text-slate-500/70 mt-1">Keywords: {variant.styleKeywords.join(', ')}</p>
            </div>
          ))}
        </div>
      )}
      {isGeneratingBloomVariants && sigilBloomVariants.length === 0 && (
         <div className="text-center text-xs text-pink-400/80 italic py-2">Oracle is weaving visions...</div>
      )}
      {!isGeneratingBloomVariants && selectedGlyphNodeId && sigilBloomVariants.length === 0 && (
          <div className="text-center text-xs text-slate-500 italic py-2">No variants revealed yet for this glyph. Click "Reveal Bloom Variants".</div>
      )}

    </div>
  );
};

export default SigilBloomVariantPanel;
