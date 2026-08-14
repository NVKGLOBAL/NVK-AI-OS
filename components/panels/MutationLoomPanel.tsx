
import React, { useMemo } from 'react';
import type { GlyphMutationNode, MutationLoomState } from '../../types';
import { AgentName } from '../../types'; 
import { AGENT_PROFILES } from '../../constants';

import { useEcho } from '../../context/EchoContext';
interface MutationLoomPanelProps {
  glyphMutationNodes: GlyphMutationNode[];
  onWeaveGlyphs: (glyph1Id: string, glyph2Id: string, entropyInjection: number, traitFocus: string[]) => Promise<GlyphMutationNode | undefined>;
  mutationLoomState: MutationLoomState;
  setMutationLoomState: React.Dispatch<React.SetStateAction<MutationLoomState>>;
    isGeminiGenerating: boolean; // To disable button while Gemini is busy
}

const MutationLoomPanel: React.FC<MutationLoomPanelProps> = ({
  glyphMutationNodes,
  onWeaveGlyphs,
  mutationLoomState,
  setMutationLoomState,
  isGeminiGenerating,
}) => {
  const { addEchoMessage } = useEcho();
  const { glyph1Id, glyph2Id, isWeaving, entropyInjection, traitFocus } = mutationLoomState;

  const handleSelectGlyph = (slot: 'glyph1Id' | 'glyph2Id', id: string | null) => {
    if (slot === 'glyph1Id' && id === glyph2Id && id !== null) {
        addEchoMessage(AgentName.LoomOracle, "Cannot select the same glyph for both weaving slots.", AGENT_PROFILES[AgentName.LoomOracle]?.colorClass || 'text-yellow-400');
        return;
    }
    if (slot === 'glyph2Id' && id === glyph1Id && id !== null) {
        addEchoMessage(AgentName.LoomOracle, "Cannot select the same glyph for both weaving slots.", AGENT_PROFILES[AgentName.LoomOracle]?.colorClass || 'text-yellow-400');
        return;
    }
    setMutationLoomState(prev => ({ ...prev, [slot]: id, traitFocus: [] })); // Reset trait focus on glyph change
  };

  const handleWeave = () => {
    if (glyph1Id && glyph2Id && !isWeaving && !isGeminiGenerating) {
      onWeaveGlyphs(glyph1Id, glyph2Id, entropyInjection, traitFocus);
    } else if (isGeminiGenerating) {
        addEchoMessage(AgentName.LoomOracle, "Loom Oracle is currently communing with Gemini. Please wait.", AGENT_PROFILES[AgentName.LoomOracle]?.colorClass || 'text-yellow-400');
    }
  };
  
  const glyph1 = useMemo(() => glyphMutationNodes.find(g => g.id === glyph1Id), [glyphMutationNodes, glyph1Id]);
  const glyph2 = useMemo(() => glyphMutationNodes.find(g => g.id === glyph2Id), [glyphMutationNodes, glyph2Id]);

  const availableTraitsForFocus = useMemo(() => {
    if (!glyph1 || !glyph2) return [];
    const allTraits = [...(glyph1.traits || []), ...(glyph2.traits || [])];
    return [...new Set(allTraits)].sort();
  }, [glyph1, glyph2]);

  const handleTraitFocusChange = (trait: string) => {
    setMutationLoomState(prev => {
      const newTraitFocus = prev.traitFocus.includes(trait)
        ? prev.traitFocus.filter(t => t !== trait)
        : [...prev.traitFocus, trait];
      // Optional: Limit number of focused traits, e.g., newTraitFocus.slice(-3)
      return { ...prev, traitFocus: newTraitFocus };
    });
  };

  // Filter out already selected glyphs for the other slot
  const availableGlyphsForSlot1 = glyphMutationNodes.filter(g => g.id !== glyph2Id || !glyph2Id);
  const availableGlyphsForSlot2 = glyphMutationNodes.filter(g => g.id !== glyph1Id || !glyph1Id);


  return (
    <div className="mutation-loom-panel bg-slate-900/90 backdrop-blur-md border border-teal-600/50 rounded-xl shadow-2xl p-6 text-slate-100 my-6">
      <h3 className="text-2xl font-cinzel font-bold text-teal-300 mb-6 text-center tracking-wider drop-shadow-[0_1px_1px_rgba(100,200,200,0.4)]">
        Δ.15.14 Mutation Loom
      </h3>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* Glyph Slot 1 */}
        <div className="glyph-slot p-3 bg-slate-800/70 rounded-lg border border-slate-700/60">
          <label htmlFor="glyph1Select" className="block text-sm font-medium text-teal-400 mb-1 font-cormorant">Source Glyph Alpha</label>
          <select
            id="glyph1Select"
            value={glyph1Id || ''}
            onChange={(e) => handleSelectGlyph('glyph1Id', e.target.value || null)}
            className="w-full p-2 rounded bg-slate-700 border-slate-600 text-slate-200 text-xs focus:ring-teal-500 focus:border-teal-500 custom-scrollbar"
            disabled={isWeaving}
          >
            <option value="">Select Glyph Alpha</option>
            {availableGlyphsForSlot1.map(g => <option key={g.id} value={g.id}>{g.label} (E: {(g.entropyLevel || 0).toFixed(2)})</option>)}
          </select>
          {glyph1 && <div className="mt-2 text-xs text-slate-400">Traits: {glyph1.traits.join(', ') || 'None'}</div>}
        </div>

        {/* Weaving Controls / Visualization */}
        <div className="weave-controls flex flex-col items-center justify-center p-3 bg-slate-800/70 rounded-lg border border-slate-700/60 md:mt-6">
          <div className="text-4xl text-teal-500 mb-3 animate-pulse-opacity">
            <i className="ri-copper-diamond-fill"></i>
          </div>
          <button
            onClick={handleWeave}
            disabled={!glyph1Id || !glyph2Id || isWeaving || isGeminiGenerating}
            className="px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-cinzel tracking-wide transition-colors duration-150 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed group"
          >
            <i className={`ri-scissors-cut-fill mr-2 ${isWeaving ? 'animate-spin-slow' : 'group-hover:animate-ping-slow'}`}></i>
            {isWeaving ? 'Weaving...' : (isGeminiGenerating ? 'Oracle Busy...' : 'Weave Glyphs')}
          </button>
        </div>
        
        {/* Glyph Slot 2 */}
        <div className="glyph-slot p-3 bg-slate-800/70 rounded-lg border border-slate-700/60">
          <label htmlFor="glyph2Select" className="block text-sm font-medium text-teal-400 mb-1 font-cormorant">Source Glyph Beta</label>
          <select
            id="glyph2Select"
            value={glyph2Id || ''}
            onChange={(e) => handleSelectGlyph('glyph2Id', e.target.value || null)}
            className="w-full p-2 rounded bg-slate-700 border-slate-600 text-slate-200 text-xs focus:ring-teal-500 focus:border-teal-500 custom-scrollbar"
            disabled={isWeaving}
          >
            <option value="">Select Glyph Beta</option>
            {availableGlyphsForSlot2.map(g => <option key={g.id} value={g.id}>{g.label} (E: {(g.entropyLevel || 0).toFixed(2)})</option>)}
          </select>
          {glyph2 && <div className="mt-2 text-xs text-slate-400">Traits: {glyph2.traits.join(', ') || 'None'}</div>}
        </div>
      </div>

      {/* Advanced Controls */}
      <div className="advanced-controls mt-6 pt-4 border-t border-slate-700/50">
        <h4 className="text-sm font-cormorant text-teal-300 mb-2">Loom Harmonics (Advanced):</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
                <label htmlFor="entropyInjection" className="block text-slate-400 mb-0.5">Entropy Injection ({(entropyInjection || 0).toFixed(2)}):</label>
                <input 
                    type="range" id="entropyInjection" min="0" max="1" step="0.05" 
                    value={entropyInjection} 
                    onChange={e => setMutationLoomState(prev => ({...prev, entropyInjection: parseFloat(e.target.value)}))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                    disabled={isWeaving}
                    aria-label="Entropy Injection Level"
                />
            </div>
            <div>
                <h5 className="block text-slate-400 mb-1">Trait Focus (Max 3):</h5>
                {glyph1 && glyph2 ? (
                    availableTraitsForFocus.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto custom-scrollbar pr-1">
                        {availableTraitsForFocus.map(trait => (
                        <label key={trait} className="flex items-center space-x-1.5 cursor-pointer p-1 bg-slate-700/50 rounded hover:bg-slate-600/50">
                            <input
                            type="checkbox"
                            checked={traitFocus.includes(trait)}
                            onChange={() => handleTraitFocusChange(trait)}
                            disabled={isWeaving || (traitFocus.length >= 3 && !traitFocus.includes(trait))}
                            className="form-checkbox h-3 w-3 text-teal-500 bg-slate-600 border-slate-500 rounded focus:ring-teal-400"
                            />
                            <span className="text-slate-300">{trait}</span>
                        </label>
                        ))}
                    </div>
                    ) : (
                        <p className="text-slate-500 italic">Selected glyphs have no common or distinct traits to focus on.</p>
                    )
                ) : (
                    <p className="text-slate-500 italic">Select two glyphs to see available traits for focus.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default MutationLoomPanel;
