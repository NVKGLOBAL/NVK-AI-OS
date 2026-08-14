


import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import type { GlyphOrbit, AgentInterpretation, RitualContext, DriftSeverity, GeminiGlyphInterpretation, EchoMessage, IDriftInterpretationDB, GlyphMutationNode, HistoricalEvent } from '../../types'; // Added HistoricalEvent
import { AgentName } from '../../types';
import { AGENT_PROFILES, AGENT_NAME_TO_STRING_MAP } from '../../constants';
import { DriftNarratorContext, useDriftNarrator } from '../../context/DriftNarratorContext';
import EntropyLinkIndicator from '../ui/EntropyLinkIndicator'; // Ensure this path is correct
import MeaningPulseGraph from '../core/MeaningPulseGraph'; // Ensure this path is correct
import DriftArchivePanel from './DriftArchivePanel'; // Import the new panel


import { useEcho } from '../../context/EchoContext';
// --- Sub-component: NarrativeEntropyGauge ---
interface NarrativeEntropyGaugeProps {
  currentEntropy: number;
}
const NarrativeEntropyGauge: React.FC<NarrativeEntropyGaugeProps> = React.memo(({ currentEntropy }) => {
  const getEntropyColor = (entropy: number) => {
    if (entropy < 0.2) return 'bg-sky-500';
    if (entropy < 0.4) return 'bg-indigo-500';
    if (entropy < 0.6) return 'bg-purple-600';
    if (entropy < 0.8) return 'bg-pink-600';
    return 'bg-red-700';
  };
  const volatility = useMemo(() => {
    if (currentEntropy < 0.2) return "Meaning Stable";
    if (currentEntropy < 0.5) return "Meaning Fluid";
    if (currentEntropy < 0.75) return "Meaning Volatile";
    return "Meaning Chaotic";
  }, [currentEntropy]);

  return (
    <div className="mb-4 p-3 bg-slate-800/60 rounded-lg border border-slate-700/70 shadow-inner">
      <h4 className="text-xs font-mono text-slate-400 uppercase mb-1 tracking-wider">Narrative Entropy</h4>
      <div className="flex items-center gap-2">
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-in-out ${getEntropyColor(currentEntropy)}`}
            style={{ width: `${Math.min(currentEntropy, 1) * 100}%` }}
            role="progressbar"
            aria-valuenow={currentEntropy}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-label="Narrative Entropy Level"
          />
        </div>
        <span className={`text-sm font-mono font-semibold ${getEntropyColor(currentEntropy || 0).replace('bg-', 'text-')}`}>{(currentEntropy || 0).toFixed(3)}δ</span>
      </div>
      <p className={`text-xs text-center mt-1 ${getEntropyColor(currentEntropy).replace('bg-', 'text-')} opacity-80`}>{volatility}</p>
    </div>
  );
});

// --- Sub-component: DriftSeverityMeter ---
interface DriftSeverityMeterProps {
  severity: DriftSeverity | null;
}
const DriftSeverityMeter: React.FC<DriftSeverityMeterProps> = React.memo(({ severity }) => {
  if (!severity) return <div className="h-10 mt-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700/70 flex items-center justify-center text-slate-500 italic text-xs">Severity calculation pending...</div>;

  const getColor = (level: DriftSeverity['level']) => {
    switch (level) {
      case 'minimal': return 'bg-green-500';
      case 'minor': return 'bg-sky-500';
      case 'moderate': return 'bg-yellow-500';
      case 'significant': return 'bg-orange-500';
      case 'critical': return 'bg-red-600';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="mt-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700/70 shadow-inner">
      <h4 className="text-xs font-mono text-slate-400 uppercase mb-1.5 tracking-wider">Drift Severity</h4>
      <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-in-out ${getColor(severity.level)}`}
          style={{ width: `${severity.score * 100}%` }}
          role="progressbar"
          aria-valuenow={severity.score}
          aria-valuemin={0}
          aria-valuemax={1}
          aria-label={`Drift Severity Level: ${severity.level}`}
        />
      </div>
      <p className={`text-xs text-center font-semibold ${getColor(severity.level).replace('bg-','text-')}`}>{severity.level.toUpperCase()}</p>
      {severity.explanation && <p className="text-xs text-slate-400 italic mt-1 text-center">{severity.explanation}</p>}
    </div>
  );
});

// --- Sub-component: DriftLensPanel (Inline logic as per user's example) ---
interface InlineDriftLensPanelProps {
  selectedGlyphNode: GlyphMutationNode;
  glyphDriftHistory: GlyphOrbit[];
  currentRitualContext: RitualContext;
  currentEntropy: number;
  isGeminiGeneratingGlobal: boolean;
  onInterpretationGenerated: (interpretation: IDriftInterpretationDB) => void; // Changed to DB type
    currentDriftForLens: IDriftInterpretationDB | null; // Changed to DB type
  setCurrentDriftForLens: React.Dispatch<React.SetStateAction<IDriftInterpretationDB | null>>; // Changed to DB type
  isLoadingLens: boolean;
  setIsLoadingLens: React.Dispatch<React.SetStateAction<boolean>>;
  viewModeLens: 'agents' | 'gemini';
  setViewModeLens: React.Dispatch<React.SetStateAction<'agents' | 'gemini'>>;
  generateNewInterpretationLens: () => void; 
}

const InlineDriftLensPanel: React.FC<InlineDriftLensPanelProps> = React.memo(({
  selectedGlyphNode,
  glyphDriftHistory,
  currentRitualContext,
  currentEntropy,
  isGeminiGeneratingGlobal,
  onInterpretationGenerated,
  currentDriftForLens,
  setCurrentDriftForLens,
  isLoadingLens,
  setIsLoadingLens,
  viewModeLens,
  setViewModeLens,
  generateNewInterpretationLens,
}) => {
  const driftService = useDriftNarrator();

  const activeGlyphAgentInterpretations = useMemo(() => {
    if (!Array.isArray(glyphDriftHistory)) {
        console.warn("InlineDriftLensPanel: glyphDriftHistory prop is not an array!", glyphDriftHistory);
        return [];
    }
    const foundOrbit = glyphDriftHistory.find(g => g.glyphSymbol === (selectedGlyphNode.label || selectedGlyphNode.glyphId));
    if (foundOrbit && Array.isArray(foundOrbit.interpretations)) {
        return foundOrbit.interpretations.slice(0, 3);
    }
    return [];
  }, [selectedGlyphNode, glyphDriftHistory]);
  
  useEffect(() => {
    setCurrentDriftForLens(null); 
    if (viewModeLens === 'gemini' && selectedGlyphNode) { 
      generateNewInterpretationLens();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGlyphNode, viewModeLens, setCurrentDriftForLens]); 

  useEffect(() => {
    if (viewModeLens === 'gemini' && selectedGlyphNode) {
        if (!currentDriftForLens || 
            currentDriftForLens.glyphSymbol !== (selectedGlyphNode.label || selectedGlyphNode.glyphId) ||
            currentDriftForLens.ritualContext !== currentRitualContext ||
            Math.abs(currentDriftForLens.entropy - currentEntropy) > 0.01
        ) {
             generateNewInterpretationLens();
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRitualContext, currentEntropy, viewModeLens, selectedGlyphNode, currentDriftForLens]);


  return (
    <div className="mt-4 p-4 bg-slate-800/70 rounded-lg border border-slate-600/50 shadow-md">
      <h3 className="text-lg font-['Cinzel'] text-lime-300 mb-1">Lens Focus: <span className="text-slate-100">{selectedGlyphNode.label || selectedGlyphNode.glyphId}</span></h3>
      <div className="text-xs text-slate-400 mb-3 font-mono">
        <p>Ritual Context: <span className="text-slate-300 truncate" title={currentRitualContext}>{currentRitualContext.substring(0,50)}{currentRitualContext.length > 50 ? '...' : ''}</span></p>
        <p>System Entropy: <span className="text-slate-300">{(currentEntropy || 0).toFixed(3)}δ</span></p>
      </div>

      <div className="flex gap-2 mb-3 border-b border-slate-700 pb-2">
        <button
          onClick={() => setViewModeLens('agents')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${viewModeLens === 'agents' ? 'bg-lime-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
          aria-pressed={viewModeLens === 'agents'}
        >
          Agent Consensus
        </button>
        <button
          onClick={() => setViewModeLens('gemini')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${viewModeLens === 'gemini' ? 'bg-lime-600 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
          aria-pressed={viewModeLens === 'gemini'}
        >
          Gemini Oracle
        </button>
      </div>

      {viewModeLens === 'agents' && (
        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1 text-xs">
          {activeGlyphAgentInterpretations.length === 0 && <p className="text-slate-500 italic">No agent interpretations recorded for this glyph yet.</p>}
          {activeGlyphAgentInterpretations.map(interp => (
            <div key={`${interp.timestamp}-${interp.agent}`} className="p-2 bg-slate-700/50 rounded">
              <span className={`font-semibold ${AGENT_PROFILES[interp.agent as AgentName]?.colorClass || 'text-slate-300'}`}>{AGENT_NAME_TO_STRING_MAP[interp.agent as AgentName] || interp.agent}: </span>
              <span className="text-slate-300 italic">"{interp.interpretation}"</span>
              <span className="text-slate-500 text-[10px] ml-1">(conf: {(interp?.confidence || 0).toFixed(2)})</span>
            </div>
          ))}
        </div>
      )}

      {viewModeLens === 'gemini' && (
        <div className="text-xs">
          {(isLoadingLens || (isGeminiGeneratingGlobal && !currentDriftForLens)) && <p className="text-lime-400 italic animate-pulse">Oracle is perceiving...</p>}
          {!isLoadingLens && !isGeminiGeneratingGlobal && currentDriftForLens && (
            <div className="p-2 bg-lime-800/30 border border-lime-600/50 rounded">
              <span className={`font-semibold ${AGENT_PROFILES[AgentName.GeminiDriftNarrator]?.colorClass}`}>{AGENT_NAME_TO_STRING_MAP[AgentName.GeminiDriftNarrator]}: </span>
              <span className="text-lime-200 italic">"{currentDriftForLens.geminiReading}"</span>
              <p className="text-lime-500 text-[10px] mt-1">Drift Score: {(currentDriftForLens?.driftScore || 0).toFixed(2)}</p>
            </div>
          )}
          {!isLoadingLens && !isGeminiGeneratingGlobal && !currentDriftForLens && <p className="text-slate-500 italic">Awaiting Oracle's vision for {selectedGlyphNode.label || selectedGlyphNode.glyphId}.</p>}
        </div>
      )}
    </div>
  );
});


// --- Main Overlay Component ---
interface DriftDifferentialOverlayPropsActual {
  currentEntropy: number;
  glyphDriftHistory: GlyphOrbit[];
  glyphMutationNodes: GlyphMutationNode[];
  currentRitualContext: RitualContext;
  isGeminiGenerating: boolean; 
    logGeminiNarrativeDriftEvent: (driftInterpretation: IDriftInterpretationDB) => void; // Changed to DB type
  ritualHistory?: HistoricalEvent[]; 
}

const DriftDifferentialOverlay: React.FC<DriftDifferentialOverlayPropsActual> = ({
  currentEntropy,
  glyphDriftHistory,
  glyphMutationNodes,
  currentRitualContext,
  isGeminiGenerating,
  logGeminiNarrativeDriftEvent,
  ritualHistory 
}) => {
  const { addEchoMessage } = useEcho();
  const [activeTab, setActiveTab] = useState<'live' | 'archive'>('live');
  const [selectedGlyphSymbol, setSelectedGlyphSymbol] = useState<string | null>(null);
  const [driftSeverity, setDriftSeverity] = useState<DriftSeverity | null>(null);
  const [isMockModeUI, setIsMockModeUI] = useState(true);
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [testCase, setTestCase] = useState<'low' | 'mid' | 'high' | null>(null);

  const [currentDriftForLens, setCurrentDriftForLens] = useState<IDriftInterpretationDB | null>(null); // Changed to DB type
  const [isLoadingLens, setIsLoadingLens] = useState(false);
  const [viewModeLens, setViewModeLens] = useState<'agents' | 'gemini'>('agents');

  const driftService = useDriftNarrator();

  const selectedGlyphNode = useMemo(() => {
    return glyphMutationNodes.find(node => (node.label || node.glyphId) === selectedGlyphSymbol);
  }, [selectedGlyphSymbol, glyphMutationNodes]);

  useEffect(() => {
    setIsMockModeUI(driftService.isMockModeActive());
    // Removed: if (selectedGlyphNode) { driftService.seedHistoricalData(selectedGlyphNode, 7); }
  }, [driftService, setIsMockModeUI]); // Updated dependencies
  
  useEffect(() => {
    if (!selectedGlyphSymbol && glyphMutationNodes.length > 0) {
      setSelectedGlyphSymbol(glyphMutationNodes[0].label || glyphMutationNodes[0].glyphId);
    } else if (selectedGlyphSymbol && !glyphMutationNodes.find(node => (node.label || node.glyphId) === selectedGlyphSymbol) && glyphMutationNodes.length > 0) {
       setSelectedGlyphSymbol(glyphMutationNodes[0].label || glyphMutationNodes[0].glyphId);
    }
  }, [glyphMutationNodes, selectedGlyphSymbol]);

  const handleInterpretationGenerated = useCallback((interpretation: IDriftInterpretationDB) => { // Changed to DB type
    logGeminiNarrativeDriftEvent(interpretation);
    const agentInterpretations = (Array.isArray(glyphDriftHistory) ? glyphDriftHistory.find(g => g.glyphSymbol === interpretation.glyphSymbol)?.interpretations : []) || [];
    const severity = driftService.calculateDriftSeverity(
        driftService.convertToGeminiGlyphInterpretation(interpretation),
        agentInterpretations
    );
    setDriftSeverity(severity);
    setCurrentDriftForLens(interpretation);
  }, [glyphDriftHistory, driftService, logGeminiNarrativeDriftEvent]);
  
  const generateNewInterpretationLensLogic = useCallback(async () => {
    if (!selectedGlyphNode || isGeminiGenerating || isLoadingLens) return;
    
    setIsLoadingLens(true);
    if (viewModeLens === 'gemini') {
        addEchoMessage(AgentName.System, `Consulting Gemini Oracle for glyph "${selectedGlyphNode.label || selectedGlyphNode.glyphId}"...`, AGENT_PROFILES[AgentName.System].colorClass);
    }
    const activeGlyphAgentInterpretations = (Array.isArray(glyphDriftHistory) ? glyphDriftHistory.find(g => g.glyphSymbol === (selectedGlyphNode.label || selectedGlyphNode.glyphId))?.interpretations.slice(0, 3) : []) || [];
    
    const result = await driftService.getFullDriftInterpretation(
      selectedGlyphNode,
      currentRitualContext,
      currentEntropy,
      activeGlyphAgentInterpretations
    );
    
    if(result) { // Check if result is not null
        handleInterpretationGenerated(result);
    } else {
        addEchoMessage(AgentName.System, `Failed to generate interpretation for ${selectedGlyphNode.label || selectedGlyphNode.glyphId}. Oracle's connection may be unstable.`, 'text-rose-400');
    }
    setIsLoadingLens(false);
  }, [
    selectedGlyphNode, currentRitualContext, currentEntropy, driftService, 
    isGeminiGenerating, isLoadingLens, handleInterpretationGenerated, viewModeLens, glyphDriftHistory
  ]);

  useEffect(() => {
    if (!replayMode || !selectedGlyphNode) return;
    let intervalId: number | undefined;
    const startReplay = async () => {
      const resolvedHistory = await driftService.getDriftHistoryForGlyph(selectedGlyphNode.id); // Use ID for DB fetch
      if (!Array.isArray(resolvedHistory) || resolvedHistory.length === 0) {
        setReplayMode(false); return;
      }
      setReplayIndex(prev => (prev >= resolvedHistory.length ? 0 : prev));
      intervalId = window.setInterval(() => {
        setReplayIndex(prevIdx => {
          const nextIndex = (prevIdx + 1) % resolvedHistory.length;
          setCurrentDriftForLens(resolvedHistory[nextIndex]);
          handleInterpretationGenerated(resolvedHistory[nextIndex]);
          return nextIndex;
        });
      }, 3000);
    };
    startReplay();
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [replayMode, selectedGlyphNode, driftService, handleInterpretationGenerated]);

  useEffect(() => {
    if (!testCase || !selectedGlyphNode) return;
    let testEntropyVal, testReading, testConsensus;
    switch(testCase) {
      case 'low': testEntropyVal = 0.2; testReading = "Reflective glyph bound by memory's calm."; testConsensus = "Symbol of Stability"; break;
      case 'mid': testEntropyVal = 0.55; testReading = "A whisper cracked in volatile shadow."; testConsensus = "Agent of Flux"; break;
      case 'high': testEntropyVal = 0.9; testReading = "Chaos fractures the glyph into a song of flames."; testConsensus = "Harbinger of Dissolution"; break;
      default: return;
    }
    const testInterpretationItem: IDriftInterpretationDB = { 
      glyphId: selectedGlyphNode.id, // Use node ID
      glyphSymbol: selectedGlyphNode.label || selectedGlyphNode.glyphId,
      geminiReading: testReading, agentConsensus: testConsensus, entropy: testEntropyVal,
      driftScore: testEntropyVal + 0.1, ritualContext: `Test Case: ${testCase} entropy`,
      timestamp: new Date(), version: "Δ.Test" // Add version for IDriftInterpretationDB
    };
    setCurrentDriftForLens(testInterpretationItem); 
    handleInterpretationGenerated(testInterpretationItem);
  }, [testCase, selectedGlyphNode, handleInterpretationGenerated]);

  const generateNewInterpretationForButton = () => {
    if (selectedGlyphNode) { generateNewInterpretationLensLogic(); }
  };
  
  const toggleMockModeService = () => {
    const newMode = !isMockModeUI;
    setIsMockModeUI(newMode);
    driftService.toggleMockMode(newMode);
    addEchoMessage(AgentName.System, `Drift Narrator Test Data Mode ${newMode ? 'Activated' : 'Deactivated'}.`, AGENT_PROFILES[AgentName.System].colorClass);
    if (selectedGlyphNode) { generateNewInterpretationLensLogic(); }
  };

  return (
    <div className="drift-overlay bg-slate-900/90 backdrop-blur-lg border border-lime-700/50 rounded-xl shadow-2xl p-4 md:p-6 text-slate-100">
      <div className="tabs flex border-b border-slate-700 mb-4">
        <button 
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'live' ? 'border-b-2 border-lime-400 text-lime-300' : 'text-slate-400 hover:text-lime-400'}`}
          onClick={() => setActiveTab('live')}
          aria-pressed={activeTab === 'live'}
        >
          Live Drift Analysis
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'archive' ? 'border-b-2 border-lime-400 text-lime-300' : 'text-slate-400 hover:text-lime-400'}`}
          onClick={() => setActiveTab('archive')}
          aria-pressed={activeTab === 'archive'}
        >
          Memory Archive
        </button>
      </div>

      {activeTab === 'live' && (
        <>
          <div className="test-controls-panel p-3 mb-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="test-case-selector">
                <h4 className="text-xs font-mono text-slate-400 uppercase mb-1.5">Visual Test Cases:</h4>
                <div className="test-buttons flex gap-2">
                    <button className={`test-btn px-2 py-1 text-xs rounded ${testCase === 'low' ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`} onClick={() => setTestCase('low')}>Low E (20%)</button>
                    <button className={`test-btn px-2 py-1 text-xs rounded ${testCase === 'mid' ? 'bg-yellow-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`} onClick={() => setTestCase('mid')}>Mid E (55%)</button>
                    <button className={`test-btn px-2 py-1 text-xs rounded ${testCase === 'high' ? 'bg-red-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`} onClick={() => setTestCase('high')}>High E (90%)</button>
                </div>
                </div>
                
                <div className="replay-controls flex flex-col items-start gap-1">
                    <label className="flex items-center text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={replayMode} onChange={() => setReplayMode(!replayMode)} className="mr-1.5 h-3.5 w-3.5 rounded border-slate-500 text-lime-500 focus:ring-lime-400"/>
                        Auto Drift Replay
                    </label>
                </div>
                
                <div className="general-actions flex flex-col items-start gap-1">
                    <label className="flex items-center text-xs text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={isMockModeUI} onChange={toggleMockModeService} className="mr-1.5 h-3.5 w-3.5 rounded border-slate-500 text-lime-500 focus:ring-lime-400"/>
                        Test Data Mode
                    </label>
                    <button onClick={generateNewInterpretationForButton} className="px-2 py-1 text-xs bg-lime-700 hover:bg-lime-600 text-lime-100 rounded-md transition-colors disabled:opacity-50" disabled={!selectedGlyphNode || isGeminiGenerating || isLoadingLens}>
                        {isLoadingLens || isGeminiGenerating ? 'Perceiving...' : 'Regenerate'}
                    </button>
                </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-['Cinzel'] font-bold text-lime-300 drop-shadow-[0_1px_1px_rgba(200,255,200,0.3)]">
              <i className="ri-eye-2-line mr-2 align-middle"></i>Drift Differential
            </h2>
          </div>

          <NarrativeEntropyGauge currentEntropy={currentDriftForLens?.entropy ?? currentEntropy} />

          <div className="mb-3">
            <h4 className="text-xs font-mono text-slate-400 uppercase mb-1.5 tracking-wider">Select Glyph Constellation:</h4>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar pr-1 pb-1 rounded bg-slate-800/30 p-1 border border-slate-700/50">
              {glyphMutationNodes.length === 0 && <p className="text-xs text-slate-500 italic px-1 py-0.5">No glyphs defined.</p>}
              {glyphMutationNodes.map(node => (
                <button 
                  key={node.id}
                  onClick={() => setSelectedGlyphSymbol(node.label || node.glyphId)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-all duration-150 ease-in-out border
                    ${selectedGlyphSymbol === (node.label || node.glyphId) 
                      ? 'bg-lime-500/40 border-lime-400 text-lime-100 font-semibold ring-1 ring-lime-400 shadow-md' 
                      : 'bg-slate-700/60 border-slate-600 hover:bg-slate-600/80 hover:border-slate-500 text-slate-300 hover:text-slate-100'
                    }`}
                  aria-pressed={selectedGlyphSymbol === (node.label || node.glyphId)}
                >
                  {node.label || node.glyphId}
                </button>
              ))}
            </div>
          </div>
          
          {selectedGlyphNode ? (
            <>
              <div className="header mb-2">
                <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Analyzing: <strong className="text-slate-200">{selectedGlyphNode?.label || selectedGlyphNode?.glyphId || 'N/A'}</strong></span>
                    <EntropyLinkIndicator entropy={currentDriftForLens?.entropy ?? currentEntropy} />
                </div>
              </div>
              <InlineDriftLensPanel
                selectedGlyphNode={selectedGlyphNode}
                glyphDriftHistory={glyphDriftHistory}
                currentRitualContext={currentRitualContext}
                currentEntropy={currentEntropy}
                isGeminiGeneratingGlobal={isGeminiGenerating}
                onInterpretationGenerated={handleInterpretationGenerated}
                
                currentDriftForLens={currentDriftForLens}
                setCurrentDriftForLens={setCurrentDriftForLens}
                isLoadingLens={isLoadingLens}
                setIsLoadingLens={setIsLoadingLens}
                viewModeLens={viewModeLens}
                setViewModeLens={setViewModeLens}
                generateNewInterpretationLens={generateNewInterpretationLensLogic}
              />
              <div className="drift-metrics mt-3">
                <DriftSeverityMeter severity={driftSeverity} />
                <MeaningPulseGraph glyphSymbol={selectedGlyphNode.label || selectedGlyphNode.glyphId} />
              </div>
            </>
          ) : (
            <div className="overlay-loading text-center text-slate-500 italic p-4 bg-slate-800/70 rounded-lg border border-slate-600/50">
              <div className="loading-glyph text-2xl animate-spin-slow">🌀</div>
              <p>Select a glyph to begin drift analysis...</p>
            </div>
          )}
          {currentDriftForLens && (
            <div className="context-panel mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs">
                <h4 className="font-mono text-slate-400 uppercase mb-1">Active Context:</h4>
                <p className="text-slate-300 italic">{currentDriftForLens.ritualContext.substring(0,100)}{currentDriftForLens.ritualContext.length > 100 ? '...' : ''}</p>
                <p className="text-slate-400 mt-1">Timestamp: <span className="text-slate-300">{new Date(currentDriftForLens.timestamp).toLocaleString()}</span></p>
            </div>
          )}
        </>
      )}
      {activeTab === 'archive' && (
        <DriftArchivePanel glyphNodeId={selectedGlyphNode?.id || null}  />
      )}
    </div>
  );
};

export default DriftDifferentialOverlay;
