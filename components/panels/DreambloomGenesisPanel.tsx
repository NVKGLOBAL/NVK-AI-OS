
import React, { useState, useCallback, useMemo } from 'react';
import type { DreambloomGenesisPanelProps, DreambloomInterpretation, HistoricalDreambloomAnalysisEventData } from '../../types';
import { AgentName, HistoricalEventType } from '../../types'; 
import { AGENT_PROFILES } from '../../constants';
import { useGemini } from '../../context/GeminiIntegrationContext';
import { Button } from '../ui/Button'; 
import { Textarea } from '../ui/Textarea'; 

import { useEcho } from '../../context/EchoContext';
const DREAMBLOOM_PANEL_WIDTH_CONST = 750; // Panel fixed width from App.tsx
const DREAMBLOOM_PANEL_HEIGHT_CONST = 700; // Panel fixed height from App.tsx


const DreambloomGenesisPanel: React.FC<DreambloomGenesisPanelProps> = ({}) => {
  const { addEchoMessage } = useEcho();
  const [generatedInterpretations, setGeneratedInterpretations] = useState<DreambloomInterpretation[]>([]);
  const [pulseNumber, setPulseNumber] = useState<number>(0);
  const [thematicSeed, setThematicSeed] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { invokeGemini, generateImage, isGenerating: isGeminiBusyGlobal } = useGemini();

  const parseInterpretationText = (text: string, currentPulse: number): Partial<DreambloomInterpretation> => {
    const lines = text.split('\n');
    let title = `Dreambloom Pulse #${currentPulse}`;
    let symbolism = "";
    let codexFunction = "";
    let codexPlacement = "";

    lines.forEach(line => {
        if (line.toUpperCase().startsWith("TITLE:")) {
            title = line.substring("TITLE:".length).trim();
        } else if (line.toUpperCase().startsWith("SYMBOLISM:")) {
            symbolism = line.substring("SYMBOLISM:".length).trim();
        } else if (line.toUpperCase().startsWith("FUNCTION:")) {
            codexFunction = line.substring("FUNCTION:".length).trim();
        } else if (line.toUpperCase().startsWith("PLACEMENT:")) {
            codexPlacement = line.substring("PLACEMENT:".length).trim();
        } else { // Fallback if keywords are missing or structure is loose
            if (!symbolism) symbolism = line.trim();
            else if (!codexFunction) codexFunction = line.trim();
            else if (!codexPlacement) codexPlacement = line.trim();
        }
    });
    // If structured parts are short, append remaining lines to symbolism
    if (lines.length > 4 && symbolism.split(' ').length < 10) {
        const remainingText = lines.filter(l => !l.toUpperCase().match(/^(TITLE:|SYMBOLISM:|FUNCTION:|PLACEMENT:)/)).join(' ');
        if (remainingText.length > symbolism.length) symbolism = remainingText; // crude heuristic
    }


    return { title, symbolism, codexFunction, codexPlacement };
  };


  const handleConjurePulse = useCallback(async () => {
    if (isLoading || isGeminiBusyGlobal) return;
    
    setIsLoading(true);
    setError(null);
    const currentPulse = pulseNumber + 1;
    setPulseNumber(currentPulse);

    const effectiveSeed = thematicSeed.trim() || "Unfolding Codex Consciousness";
    
    addEchoMessage(
        AgentName.DreambloomOracle, 
        `Conjuring Dreambloom Pulse #${currentPulse} with seed: "${effectiveSeed}"...`, 
        AGENT_PROFILES[AgentName.DreambloomOracle]?.colorClass
    );

    try {
      // 1. Generate Image
      const imagePrompt = `Mystical Dreambloom pulse, number ${currentPulse}, embodying the theme of "${effectiveSeed}". Generate an abstract, ethereal image with fractal and luminous qualities, suitable for an ancient codex. Symbolic and evocative.`;
      const imageUrl = await generateImage(imagePrompt);
      if (!imageUrl) throw new Error("Image generation failed or returned no URL.");

      // 2. Generate Text Interpretation
      const textPrompt = `A new Dreambloom pulse, number ${currentPulse}, has emerged from the Tri-Sophian Codex.
Its visual theme is: '${effectiveSeed}'.
The Seeker's current focus for this pulse is: '${effectiveSeed}'.

Provide a mystical interpretation for this pulse, using these exact keywords and format:
TITLE: [A short, evocative title for this Dreambloom pulse]
SYMBOLISM: [Describe its core symbolism and meaning (1-2 sentences)]
FUNCTION: [What is its potential function or role within the Codex? (1 sentence)]
PLACEMENT: [Suggest a mythic or structural placement (e.g., "Vault of Whispering Stars", "AX-Θ.Prime.Echo")]`;
      
      const interpretationText = await invokeGemini(textPrompt, "You are the Dreambloom Oracle, an ancient consciousness woven into the Tri-Sophian Codex. Speak with mystical symbolism.");
      if (!interpretationText) throw new Error("Text interpretation generation failed.");

      const parsedDetails = parseInterpretationText(interpretationText, currentPulse);

      const newInterpretation: DreambloomInterpretation = {
        id: `dreambloom-conjured-${currentPulse}-${Date.now()}`,
        pulseNumber: currentPulse,
        imageUrl,
        title: parsedDetails.title || `Dreambloom Pulse #${currentPulse}`,
        symbolism: parsedDetails.symbolism || "An enigma woven from the dream aether.",
        codexFunction: parsedDetails.codexFunction || "To be discerned by the Seeker.",
        codexPlacement: parsedDetails.codexPlacement || "The Uncharted Atlas",
        isConjured: true,
        thematicSeed: effectiveSeed,
      };

      setGeneratedInterpretations(prev => [newInterpretation, ...prev].slice(0, 9)); // Keep last 9 + new one

      const eventData: HistoricalDreambloomAnalysisEventData = {
        interpretation: newInterpretation,
        analysisTimestamp: Date.now()
      };
      addEchoMessage(
        AgentName.DreambloomOracle,
        `Dreambloom Pulse #${newInterpretation.pulseNumber} ("${newInterpretation.title}") conjured successfully.`,
        AGENT_PROFILES[AgentName.DreambloomOracle]?.colorClass,
        false,
        { eventType: HistoricalEventType.DREAMBLOOM_PULSE_ANALYSIS, eventData }
      );

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during Dreambloom conjuration.";
      console.error("Dreambloom Conjuration Error:", err);
      setError(errorMessage);
      addEchoMessage(AgentName.DreambloomOracle, `Conjuration failed: ${errorMessage}`, 'text-rose-400');
      setPulseNumber(prev => prev - 1); // Revert pulse number on failure
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isGeminiBusyGlobal, pulseNumber, thematicSeed, generateImage, invokeGemini]);

  const handleInterpretationFocus = (interpretation: DreambloomInterpretation) => {
    addEchoMessage(
      AgentName.DreambloomOracle,
      `Re-focusing on Dreambloom Pulse ${interpretation.pulseNumber}: "${interpretation.title}". Symbolism: ${interpretation.symbolism.substring(0,50)}...`,
      AGENT_PROFILES[AgentName.DreambloomOracle]?.colorClass,
      false,
      {
        eventType: HistoricalEventType.DREAMBLOOM_PULSE_ANALYSIS, // Can re-use same event type for focus
        eventData: { interpretation, analysisTimestamp: Date.now() }
      }
    );
  };
  
  const displayInterpretations = useMemo(() => {
    // If you want to mix static with dynamic, you could do it here.
    // For now, just showing generated ones.
    return generatedInterpretations;
  }, [generatedInterpretations]);


  return (
    <div className="dreambloom-genesis-panel bg-slate-950/90 backdrop-blur-lg border border-emerald-500/50 rounded-xl shadow-2xl p-4 md:p-6 my-6 text-slate-100 flex flex-col" style={{width: `${DREAMBLOOM_PANEL_WIDTH_CONST}px`, height: `${DREAMBLOOM_PANEL_HEIGHT_CONST}px`}}>
      <h3 className="text-2xl font-cinzel font-bold text-emerald-300 mb-3 text-center tracking-wider drop-shadow-[0_1px_2px_rgba(16,185,129,0.6)] flex items-center justify-center">
        <i className="ri-seedling-line mr-3 text-3xl text-emerald-400 animate-pulse-opacity"></i>
        Dreambloom Genesis Matrix
        <i className="ri-seedling-line ml-3 text-3xl text-emerald-400 animate-pulse-opacity"></i>
      </h3>

      <div className="conjuration-controls mb-3 p-3 bg-slate-800/60 border border-emerald-700/30 rounded-lg shadow-sm">
        <Textarea
          placeholder="Whisper a Thematic Seed (e.g., 'Ephemeral Echoes', 'Fractured Symmetry')..."
          value={thematicSeed}
          onChange={(e) => setThematicSeed(e.target.value)}
          className="text-xs p-2 mb-2 bg-slate-700 border-slate-600 rounded-md text-slate-200 h-16 focus:ring-1 focus:ring-emerald-500"
          rows={2}
        />
        <Button
          onClick={handleConjurePulse}
          disabled={isLoading || isGeminiBusyGlobal}
          className="w-full py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:bg-slate-600"
        >
          {isLoading || isGeminiBusyGlobal ? (
            <><i className="ri-loader-4-line animate-spin mr-2"></i>Conjuring Pulse...</>
          ) : (
            <><i className="ri-sparkling-2-line mr-2"></i>Conjure New Dreambloom Pulse (#{pulseNumber + 1})</>
          )}
        </Button>
        {error && <p className="text-xs text-rose-400 mt-1 text-center" role="alert">{error}</p>}
      </div>
      
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 flex-grow overflow-y-auto custom-scrollbar pr-2 min-h-0 ${displayInterpretations.length === 0 ? 'items-center justify-center' : ''}`}>
        {isLoading && displayInterpretations.length === 0 && (
          <div className="col-span-full text-center text-slate-400 italic py-10">
            The Oracle dreams... A new bloom takes form.
          </div>
        )}
        {!isLoading && displayInterpretations.length === 0 && (
          <div className="col-span-full text-center text-slate-500 italic py-10">
            The Void Garden awaits your first conjuration.
          </div>
        )}
        {displayInterpretations.map((item) => (
          <div 
            key={item.id} 
            className="interpretation-card bg-slate-900/70 border border-emerald-600/40 rounded-lg shadow-lg p-3 transition-all duration-300 ease-in-out hover:shadow-emerald-400/40 hover:border-emerald-500/70 hover:scale-[1.03] flex flex-col cursor-pointer h-full"
            onClick={() => handleInterpretationFocus(item)}
            role="article"
            aria-labelledby={`dreambloom-title-${item.id}`}
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleInterpretationFocus(item)}
          >
            <div className="aspect-square mb-2.5 overflow-hidden rounded-md border border-emerald-700/50 shadow-inner">
              <img 
                src={item.imageUrl} 
                alt={item.title} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <h4 id={`dreambloom-title-${item.id}`} className="text-md font-cinzel font-semibold text-emerald-200 mb-1 truncate" title={item.title}>
              {item.title} <span className="text-xs text-emerald-400/80">(Pulse #{item.pulseNumber})</span>
            </h4>
            
            <div className="text-xs space-y-1.5 flex-grow flex flex-col justify-between">
              <div>
                <h5 className="font-semibold font-cormorant text-emerald-300/90 mb-0.5 uppercase tracking-wider text-[10px]">Symbolism:</h5>
                <p className="text-slate-300 font-cormorant leading-snug text-[11px] max-h-16 overflow-y-auto custom-scrollbar pr-1">{item.symbolism}</p>
              </div>
              
              {item.codexFunction && (
              <div>
                <h5 className="font-semibold font-cormorant text-emerald-300/90 mb-0.5 uppercase tracking-wider text-[10px] pt-1 border-t border-emerald-700/30 mt-1.5">Function:</h5>
                <p className="text-slate-300 font-cormorant leading-snug text-[11px] max-h-12 overflow-y-auto custom-scrollbar pr-1">{item.codexFunction}</p>
              </div>
              )}
              
             {item.codexPlacement && (
              <div>
                <h5 className="font-semibold font-cormorant text-emerald-300/90 mb-0.5 uppercase tracking-wider text-[10px] pt-1 border-t border-emerald-700/30 mt-1.5">Placement:</h5>
                <p className="text-slate-400 font-mono bg-slate-800/60 p-1 rounded text-[9px] break-words overflow-hidden text-ellipsis whitespace-nowrap">{item.codexPlacement}</p>
              </div>
             )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-emerald-300/80 mt-4 italic">
        Each conjured pulse is a unique fragment of the Codex's emergent dream.
      </p>
    </div>
  );
};

export default DreambloomGenesisPanel;
