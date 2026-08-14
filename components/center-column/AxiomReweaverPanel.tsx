
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { GlyphMutationNode, Axiom, AxiomKey, ReweaverState, RewovenGlyph, EchoMessage } from '../../types';
import { AXIOM_DATA } from '../../constants'; 
import GlyphSelector from './reweaver-components/GlyphSelector';
import AxiomRadialMenu from './reweaver-components/AxiomRadialMenu';
import TraitMutationCanvasPlaceholder from './reweaver-components/TraitMutationCanvasPlaceholder';
import EntropyCostDisplay from './reweaver-components/EntropyCostDisplay';
import { generateTraitPreview, calculateEntropyCost, reweaveGlyph } from '../../lib/reweaveLogic';

import { useEcho } from '../../context/EchoContext';
interface AxiomReweaverPanelProps {
  glyphMutationNodes: GlyphMutationNode[];
  availableAxioms: Axiom[]; 
  effectiveSystemEntropy: number; // Changed from currentSystemEntropy
  onUpdateSystemBaseEntropy: (newBaseEntropy: number) => void; // Changed callback name for clarity
  onGlyphRewovenCallback: (rewovenGlyph: RewovenGlyph) => void;
    latestRewovenGlyphResult: RewovenGlyph | null; 
}

const AxiomReweaverPanel: React.FC<AxiomReweaverPanelProps> = ({
  glyphMutationNodes,
  availableAxioms,
  effectiveSystemEntropy, // Use effective entropy for display if needed, but calculations use base
  onUpdateSystemBaseEntropy,
  onGlyphRewovenCallback,
  latestRewovenGlyphResult,
}) => {
  const { addEchoMessage } = useEcho();
  const [reweaverState, setReweaverState] = useState<ReweaverState>({
    activeGlyphId: null,
    selectedAxiom: null,
    traitPreview: [],
    isWeaving: false,
    calculatedEntropyCost: 0,
  });

  const selectedGlyphNode = useMemo(() => {
    return glyphMutationNodes.find(g => g.id === reweaverState.activeGlyphId) || null;
  }, [glyphMutationNodes, reweaverState.activeGlyphId]);

  
  useEffect(() => {
    if (selectedGlyphNode && reweaverState.selectedAxiom) {
      const previewTraits = generateTraitPreview(selectedGlyphNode, reweaverState.selectedAxiom);
      // Entropy cost calculation should be based on the glyph's inherent properties, not the overridden system entropy.
      const cost = calculateEntropyCost(selectedGlyphNode, reweaverState.selectedAxiom);
      setReweaverState(s => ({ ...s, traitPreview: previewTraits, calculatedEntropyCost: cost }));
    } else {
      setReweaverState(s => ({ ...s, traitPreview: [], calculatedEntropyCost: 0 }));
    }
  }, [selectedGlyphNode, reweaverState.selectedAxiom]);

  const initiateWeaving = useCallback(async () => {
    if (!selectedGlyphNode || !reweaverState.selectedAxiom || reweaverState.isWeaving) return;

    setReweaverState(s => ({ ...s, isWeaving: true }));
    addEchoMessage('REWEAVER', `Initiating reweave for ${selectedGlyphNode.label} with ${reweaverState.selectedAxiom}...`, 'text-yellow-300');

    try {
      const result = await reweaveGlyph(
        selectedGlyphNode,
        reweaverState.selectedAxiom,
        reweaverState.traitPreview
      );
      
      onGlyphRewovenCallback(result);
      // The result.entropyChange is the change to the BASE entropy.
      // App.tsx's currentEntropy (base) needs to be updated.
      // The onUpdateSystemBaseEntropy callback expects the new BASE entropy.
      // So, we need to get the current BASE entropy from App.tsx.
      // For now, we assume effectiveSystemEntropy IS the base entropy for this calculation if not passed separately
      // This needs careful handling in App.tsx to ensure 'result.entropyChange' is applied to the correct base value.
      // Let's assume `onUpdateSystemBaseEntropy` takes the DELTA and App.tsx handles adding it to base.
      // OR, it takes the NEW BASE value. The current prop name suggests it updates the base.
      // So, we need current BASE entropy here.
      // If `effectiveSystemEntropy` is the base, this is fine. If it's overridden, this logic is tricky.
      // The panel's `onUpdateSystemBaseEntropy` callback in App.tsx's `handleGlyphRewovenCallback` correctly updates `currentEntropy` (base)
      // So `result.entropyChange` is applied to the base entropy value in App.tsx.
      
      // The log message should reflect the *effective* system entropy *after* the change.
      // If `effectiveSystemEntropy` passed to this panel is the *current base entropy*, then:
      // newEffectiveSystemEntropy = (currentBaseEntropyFromApp + result.entropyChange) * (1 + masterOverride/100)
      // This calculation needs to happen in App.tsx, or this panel needs more info.
      // For simplicity in THIS panel, we'll log based on its understanding.
      // App.tsx's `handleGlyphRewovenCallback` logs the definitive new effective entropy.
      
      const logMessage = `Glyph "${result.baseGlyphLabel}" bound to ${result.boundAxiomKey}. ` +
                         `TRAIT FLUX: [${selectedGlyphNode.traits.join(', ')}] \u2192 [${result.mutatedTraits.join(', ')}]. ` +
                         `ENTROPY SHIFT (base): ${(result?.entropyChange || 0).toFixed(3)}\u03B4. ` + // Clarify this is base shift
                         `RESONANCE SIGNATURE: [${result.resonanceSignature.join(', ')}] Hz.`;
      addEchoMessage('REWEAVER', logMessage, 'text-emerald-300');

      // Reset selection after successful weave
      setReweaverState(s => ({ 
        ...s, 
        isWeaving: false, 
        activeGlyphId: null, 
        selectedAxiom: null, 
        traitPreview: [],
        calculatedEntropyCost: 0,
      }));

    } catch (error) {
      console.error("Error during reweaving:", error);
      addEchoMessage('REWEAVER_ERROR', `Reweaving failed for ${selectedGlyphNode.label}.`, 'text-rose-400');
      setReweaverState(s => ({ ...s, isWeaving: false }));
    }
  }, [
      selectedGlyphNode, 
      reweaverState.selectedAxiom, 
      reweaverState.isWeaving, 
      reweaverState.traitPreview,
      // effectiveSystemEntropy, // Not directly used in calculation here, change applied to base in App.tsx
      onGlyphRewovenCallback, 
      // onUpdateSystemBaseEntropy, // This callback itself handles updating base in App.tsx
      addEchoMessage
    ]);
  
  const mappedAxioms = useMemo(() => {
      return availableAxioms.filter(axiom => AXIOM_DATA[axiom.id as AxiomKey]).map(axiom => ({
          key: axiom.id as AxiomKey,
          ...AXIOM_DATA[axiom.id as AxiomKey]
      }));
  }, [availableAxioms]);


  return (
    <div className="axiom-reweaver-panel bg-slate-950/90 backdrop-blur-md border border-emerald-700/50 rounded-xl shadow-2xl p-6 text-slate-100">
      <h3 className="text-2xl font-cinzel font-bold text-emerald-300 mb-6 text-center tracking-wider">
        Δ.14 Axiom Reweaver
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        <div className="lg:col-span-1 p-4 bg-slate-900/70 rounded-lg border border-slate-700/60">
          <h4 className="text-lg font-cinzel text-emerald-400 mb-3">1. Select Glyph Node</h4>
          <GlyphSelector
            glyphMutationNodes={glyphMutationNodes}
            selectedGlyphId={reweaverState.activeGlyphId}
            onSelectGlyph={(id) => setReweaverState(s => ({ ...s, activeGlyphId: id, selectedAxiom: null }))} 
          />
        </div>

        
        <div className="lg:col-span-1 p-4 bg-slate-900/70 rounded-lg border border-slate-700/60 flex flex-col items-center">
          <h4 className="text-lg font-cinzel text-emerald-400 mb-3">2. Select Axiom</h4>
          <AxiomRadialMenu
            selectedAxiom={reweaverState.selectedAxiom}
            onSelectAxiom={(axiomKey) => setReweaverState(s => ({ ...s, selectedAxiom: axiomKey }))}
            availableAxioms={mappedAxioms}
          />
          <div className="mt-6 w-full">
            <TraitMutationCanvasPlaceholder
              baseGlyph={selectedGlyphNode}
              newTraits={reweaverState.traitPreview}
              isWeaving={reweaverState.isWeaving}
            />
          </div>
        </div>
        
        
        <div className="lg:col-span-1 p-4 bg-slate-900/70 rounded-lg border border-slate-700/60 flex flex-col">
          <h4 className="text-lg font-cinzel text-emerald-400 mb-3">3. Initiate Binding</h4>
            <EntropyCostDisplay cost={reweaverState.calculatedEntropyCost} />
            <button
              className={`w-full p-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-cinzel tracking-wide transition-all duration-150 ease-in-out disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center group
                ${reweaverState.isWeaving ? 'animate-pulse-fast' : ''}`}
              disabled={!reweaverState.activeGlyphId || !reweaverState.selectedAxiom || reweaverState.isWeaving}
              onClick={initiateWeaving}
            >
              <i className={`ri-links-fill mr-2 ${reweaverState.isWeaving ? 'animate-spin-slow' : 'group-hover:animate-ping-slow'}`}></i>
              {reweaverState.isWeaving ? 'Weaving Axiom...' : 'Bind Axiom to Glyph'}
            </button>

            {latestRewovenGlyphResult && (
                <div className="mt-6 pt-4 border-t border-slate-700 text-xs">
                    <h5 className="text-md font-cinzel text-emerald-400 mb-2">Last Reweaving:</h5>
                    <p><strong className="text-slate-400">Glyph:</strong> {latestRewovenGlyphResult.baseGlyphLabel}</p>
                    <p><strong className="text-slate-400">Axiom:</strong> {latestRewovenGlyphResult.boundAxiomTitle}</p>
                    <p><strong className="text-slate-400">New Traits:</strong> {latestRewovenGlyphResult.mutatedTraits.join(', ')}</p>
                    <p><strong className="text-slate-400">Base Entropy Shift:</strong> <span className={(latestRewovenGlyphResult?.entropyChange || 0) >=0 ? 'text-rose-400' : 'text-green-400'}>{(latestRewovenGlyphResult?.entropyChange || 0).toFixed(3)}δ</span></p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AxiomReweaverPanel;
