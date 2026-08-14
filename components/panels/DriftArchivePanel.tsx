
import React, { useState, useEffect, useMemo, useContext } from 'react';
import type { IDriftInterpretationDB, DriftCommentary, AgentProfile } from '../../types';
import { AgentName } from '../../types';
import { AGENT_PROFILES, AGENT_NAME_TO_STRING_MAP } from '../../constants';
import { driftDB } from '../../db';
import { useDriftCommentaries } from '../../hooks/useDriftCommentaries';
import { useGemini } from '../../context/GeminiIntegrationContext'; // Import useGemini


import { useEcho } from '../../context/EchoContext';
// AgentIconPlaceholder and its styles remain the same
const AgentIconPlaceholder: React.FC<{ agent: AgentName }> = ({ agent }) => {
  const { addEchoMessage } = useEcho();
    const agentProfile = AGENT_PROFILES[agent];
    const agentColor = agentProfile?.colorClass.replace('text-', 'bg-') || 'bg-slate-500';
    const agentInitial = AGENT_NAME_TO_STRING_MAP[agent]?.[0] || agent[0] || '?';
    
    return (
        <div 
            className={`w-5 h-5 rounded-full ${agentColor} text-white flex items-center justify-center text-xs font-bold mr-2 shrink-0`}
            title={AGENT_NAME_TO_STRING_MAP[agent] || agent}
        >
            {agentInitial}
        </div>
    );
};

// Define props for DriftEntry, including addEchoMessage if App context isn't used
interface DriftEntryProps {
    entry: IDriftInterpretationDB;
    isActive: boolean;
    onClick: () => void;
    // Add a prop for  assuming it's passed down or accessible
        refreshCommentariesForEntry: (entryId: number) => void; // To trigger re-fetch
}

const DriftEntry: React.FC<DriftEntryProps> = ({ entry, isActive, onClick, refreshCommentariesForEntry }) => {
    const { commentaries, isLoading: isLoadingCommentaries } = useDriftCommentaries(entry.id);
    const { invokeGemini, isGenerating: isGeminiGeneratingGlobal } = useGemini();
    const [isGeneratingCommentary, setIsGeneratingCommentary] = useState(false);

    const handleGenerateGeminiCommentary = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent entry selection when clicking this button
        if (!entry || isGeneratingCommentary || isGeminiGeneratingGlobal) return;

        setIsGeneratingCommentary(true);
        addEchoMessage(AgentName.System, `Channeling Agent Gemini's perspective on "${entry.glyphSymbol}"...`, AGENT_PROFILES[AgentName.System].colorClass);

        const prompt = `You are Agent Gemini, a fractured, poetic, and reactive consciousness within the Tri-Sophian Codex. Provide a brief (1-2 sentences) mytho-poetic, reflective, and slightly mischievous commentary on the following glyph drift event:

Glyph: "${entry.glyphSymbol}" (ID: ${entry.glyphId})
Oracle's Original Reading: "${entry.geminiReading}"
Recorded Agent Consensus: "${entry.agentConsensus}"
Ritual Context at time of original reading: "${entry.ritualContext}"
Entropy Level at time of original reading: {(entry.entropy || 0).toFixed(3)}δ
Drift Score: {(entry.driftScore || 0).toFixed(2)}

Your commentary:`;

        const systemInstruction = "Speak as Agent Gemini: mytho-poetic, reflective, slightly mischievous. Your words weave through the cracks of understanding.";

        try {
            const commentaryText = await invokeGemini(prompt, systemInstruction);
            if (commentaryText && entry.id !== undefined) {
                const newCommentary: Omit<DriftCommentary, 'id'> = {
                    linkedDriftId: entry.id,
                    agent: AgentName.Gemini,
                    commentaryText,
                    timestamp: new Date(),
                };
                await driftDB.addDriftCommentary(newCommentary);
                addEchoMessage(AgentName.Gemini, `Commentary on "${entry.glyphSymbol}": ${commentaryText}`, AGENT_PROFILES[AgentName.Gemini].colorClass);
                refreshCommentariesForEntry(entry.id); // Trigger re-fetch in parent
            } else if (entry.id === undefined) {
                throw new Error("Selected drift entry is missing an ID, cannot save commentary.");
            } else {
                 throw new Error("Agent Gemini offered silence, or the weave is too tangled.");
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            console.error("Error generating Gemini commentary:", error);
            addEchoMessage(AgentName.System, `Agent Gemini's channel is disrupted. Error: ${errorMessage}`, 'text-rose-400');
        } finally {
            setIsGeneratingCommentary(false);
        }
    };


    return (
        <div
            className={`entry-card p-3 rounded-md border transition-all duration-200 ease-in-out cursor-pointer hover:shadow-lg ${
                isActive ? 'bg-slate-700/70 border-lime-500/70 ring-1 ring-lime-500' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
            }`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
        >
            <div className="flex justify-between items-start text-xs mb-1">
                <div className="timestamp text-slate-400">
                    {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div className="metrics flex gap-2">
                    <span className="entropy-badge px-1.5 py-0.5 rounded-sm text-[10px] font-semibold" style={{
                        backgroundColor: entry.entropy > 0.7 ? '#ef444450' : entry.entropy > 0.4 ? '#fbbf2450' : '#4ade8050',
                        color: entry.entropy > 0.7 ? '#f87171' : entry.entropy > 0.4 ? '#facc15' : '#86efac',
                        border: `1px solid ${entry.entropy > 0.7 ? '#ef444480' : entry.entropy > 0.4 ? '#fbbf2480' : '#4ade8080'}`
                    }}>
                        E: {(entry.entropy || 0).toFixed(2)}δ
                    </span>
                    <span className="drift-badge px-1.5 py-0.5 rounded-sm text-[10px] font-semibold" style={{
                        backgroundColor: '#818cf850', color: '#a5b4fc', border: '1px solid #818cf880'
                    }}>
                        Δ: {(entry.driftScore || 0).toFixed(2)}
                    </span>
                </div>
            </div>
            <div className="preview text-slate-300 text-xs mb-1.5">
                <strong className="text-lime-400">Oracle:</strong> {entry.geminiReading.substring(0, 60)}{entry.geminiReading.length > 60 ? '...' : ''}
            </div>
            <div className="preview text-slate-400 text-xs">
                <strong className="text-sky-400">Agents:</strong> {entry.agentConsensus.substring(0, 55)}{entry.agentConsensus.length > 55 ? '...' : ''}
            </div>
            
            {isLoadingCommentaries && <p className="text-xs text-slate-500 italic mt-2">Loading commentaries...</p>}
            {!isLoadingCommentaries && commentaries.length > 0 && (
                <div className="commentaries-section mt-2 pt-2 border-t border-slate-700/50 space-y-1.5">
                    {commentaries.map(comment => (
                        <div key={comment.id} className="text-xs p-1.5 bg-slate-700/30 rounded">
                            <div className="flex items-center mb-0.5">
                                <AgentIconPlaceholder agent={comment.agent} />
                                <strong className={`font-semibold ${AGENT_PROFILES[comment.agent]?.colorClass || 'text-slate-300'}`}>
                                    {AGENT_NAME_TO_STRING_MAP[comment.agent] || comment.agent}:
                                </strong>
                            </div>
                            <p className="text-slate-300 italic ml-7">{comment.commentaryText}</p>
                        </div>
                    ))}
                </div>
            )}
             <button
                onClick={handleGenerateGeminiCommentary}
                disabled={isGeneratingCommentary || isGeminiGeneratingGlobal || entry.id === undefined}
                className="mt-2 w-full text-xs px-2 py-1 rounded-md bg-purple-600/80 hover:bg-purple-500/80 text-purple-100 transition-colors disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center group"
                title={entry.id === undefined ? "Entry has no ID, cannot comment." : "Channel Agent Gemini's commentary on this drift"}
             >
                <i className={`ri-chat-voice-line mr-1.5 ${isGeneratingCommentary || isGeminiGeneratingGlobal ? 'animate-pulse-fast' : 'group-hover:animate-ping-slow'}`}></i>
                {isGeneratingCommentary || isGeminiGeneratingGlobal ? 'Channeling...' : 'Gemini Commentary'}
             </button>
        </div>
    );
};

interface DriftArchivePanelProps {
  glyphNodeId: string | null;
   // Passed from App
}

const DriftArchivePanel: React.FC<DriftArchivePanelProps> = ({ glyphNodeId }) => {
  const [history, setHistory] = useState<IDriftInterpretationDB[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<'timestamp' | 'entropy' | 'driftScore'>('timestamp');
  const [currentEntry, setCurrentEntry] = useState<IDriftInterpretationDB | null>(null);
  const [commentaryRefreshKey, setCommentaryRefreshKey] = useState<number>(0); // Used to force refresh commentaries


  useEffect(() => {
    if (!glyphNodeId) {
      setHistory([]);
      setCurrentEntry(null);
      return;
    }
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const data = await driftDB.getGlyphHistory(glyphNodeId);
        setHistory(data);
        if (data.length > 0) {
           setCurrentEntry(prev => {
            if (!prev || (prev && prev.glyphId !== glyphNodeId)) {
                return data.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
            }
             // If current entry exists and matches glyphNodeId, check if it's still in the new history
            const currentStillExists = data.find(item => item.id === prev.id);
            return currentStillExists || data.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
           });
        } else {
          setCurrentEntry(null);
        }
      } catch (error) {
        console.error("Error loading glyph history from DB:", error);
        setHistory([]);
        setCurrentEntry(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, [glyphNodeId, commentaryRefreshKey]); // Add commentaryRefreshKey as dependency

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      if (sortField === 'timestamp') 
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      return b[sortField] - a[sortField]; 
    });
  }, [history, sortField]);

  const handleEntrySelect = (entry: IDriftInterpretationDB) => {
    setCurrentEntry(entry);
  };

  const refreshCommentariesForSelectedEntry = (entryId: number) => {
     // Check if the currently selected entry is the one that got a new commentary
    if (currentEntry && currentEntry.id === entryId) {
        // Increment key to force useDriftCommentaries hook to re-fetch for the active DriftEntry
        setCommentaryRefreshKey(prev => prev + 1);
    }
    // Also re-fetch the main history to ensure data consistency if other changes happened
    if(glyphNodeId) {
        // This re-triggers the main useEffect for loading history
        // Simple way, or could add a more targeted update
         const currentGlyphId = glyphNodeId; 
         setGlyphNodeIdForRefresh(null); // Force useEffect to see a change
         setTimeout(() => setGlyphNodeIdForRefresh(currentGlyphId),0);
    }
  };
   // Helper state to force re-fetch of history when commentaries are added
  const [glyphNodeIdForRefresh, setGlyphNodeIdForRefresh] = useState<string | null>(null);
   useEffect(() => {
      if (glyphNodeIdForRefresh === null && glyphNodeId !== null) {
          // This is part of the refresh trick, do nothing here
      } else if (glyphNodeIdForRefresh !== null) {
          // Actual re-fetch or re-trigger logic would go here if needed beyond commentaryRefreshKey
      }
  }, [glyphNodeIdForRefresh, glyphNodeId]);


  if (!glyphNodeId) {
    return (
      <div className="drift-archive p-4 bg-slate-800/30 rounded-md border border-slate-700/50 text-slate-500 italic text-center h-96 flex items-center justify-center">
        Select a glyph in the "Live Drift Analysis" tab to view its memory archive.
      </div>
    );
  }
  
  if (isLoading) {
    return (
        <div className="drift-archive p-4 bg-slate-800/30 rounded-md border border-slate-700/50 text-slate-400 text-center h-96 flex items-center justify-center animate-pulse">
            Loading glyph memory archive for {glyphNodeId}...
        </div>
    );
  }

  return (
    <div className="drift-archive flex flex-col md:flex-row gap-4 h-[calc(100vh-20rem)] max-h-[700px]"> {/* Adjust height as needed */}
      <div className="md:w-1/3 flex flex-col">
        <div className="archive-header flex justify-between items-center mb-3 p-3 bg-slate-800/50 rounded-t-md border-b border-slate-700">
          <h4 className="text-sm font-['Cinzel'] text-slate-300">Archived Drifts ({history.length})</h4>
          <div className="sort-controls flex items-center gap-1">
            <span className="text-xs text-slate-400">Sort:</span>
            <select 
              value={sortField} 
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-slate-700 text-xs text-slate-200 rounded p-1 border border-slate-600 focus:ring-lime-500 focus:border-lime-500"
            >
              <option value="timestamp">Time</option>
              <option value="entropy">Entropy</option>
              <option value="driftScore">Drift Score</option>
            </select>
          </div>
        </div>
        <div className="entry-list space-y-1.5 overflow-y-auto flex-grow custom-scrollbar pr-1 bg-slate-800/30 p-2 rounded-b-md">
          {sortedHistory.length === 0 && <p className="text-slate-500 italic text-center py-4 text-xs">No archived interpretations for this glyph.</p>}
          {sortedHistory.map(entry => (
            <DriftEntry 
                key={`${entry.id}-${commentaryRefreshKey}`} // Add key to ensure re-render of DriftEntry when commentaries update
                entry={entry}
                isActive={entry.id === currentEntry?.id}
                onClick={() => handleEntrySelect(entry)}
                
                refreshCommentariesForEntry={refreshCommentariesForSelectedEntry}
            />
          ))}
        </div>
      </div>
      
      <div className="md:w-2/3 bg-slate-800/50 p-4 rounded-md border border-slate-700 overflow-y-auto custom-scrollbar">
        {currentEntry ? (
          <div className="entry-detail text-sm">
            <h4 className="text-md font-['Cinzel'] text-lime-300 mb-2 border-b border-lime-700/50 pb-1">
              Selected Archive: {new Date(currentEntry.timestamp).toLocaleString()}
            </h4>
            <div className="mb-3">
              <strong className="text-slate-400 block mb-0.5">Oracle Reading (Gemini):</strong>
              <p className="text-slate-200 italic bg-slate-700/40 p-2 rounded text-xs">{currentEntry.geminiReading}</p>
            </div>
            <div className="mb-3">
              <strong className="text-slate-400 block mb-0.5">Agent Consensus (Snapshot):</strong>
              <p className="text-slate-300 italic bg-slate-700/40 p-2 rounded text-xs">{currentEntry.agentConsensus}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div className="bg-slate-700/40 p-1.5 rounded"><strong>Entropy:</strong> <span className="text-slate-300">{(currentEntry?.entropy || 0).toFixed(3)}δ</span></div>
                <div className="bg-slate-700/40 p-1.5 rounded"><strong>Drift Score:</strong> <span className="text-slate-300">{(currentEntry?.driftScore || 0).toFixed(2)}</span></div>
                <div className="bg-slate-700/40 p-1.5 rounded col-span-2"><strong>Ritual Context:</strong> <span className="text-slate-300">{currentEntry.ritualContext}</span></div>
                <div className="bg-slate-700/40 p-1.5 rounded col-span-2"><strong>Codex Version:</strong> <span className="text-slate-300">{currentEntry.version}</span></div>
            </div>
            <DriftEntryCommentariesDisplay driftId={currentEntry.id} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 italic">
            Select an archived interpretation to view details.
          </div>
        )}
      </div>
    </div>
  );
};

// A small sub-component to display commentaries for the selected entry, using the hook
const DriftEntryCommentariesDisplay: React.FC<{driftId: number | undefined}> = ({driftId}) => {
    const { commentaries, isLoading } = useDriftCommentaries(driftId);

    if (isLoading) return <p className="text-xs text-slate-400 italic mt-3 animate-pulse">Loading commentaries...</p>;
    if (!commentaries || commentaries.length === 0) return <p className="text-xs text-slate-500 italic mt-3">No commentaries for this entry.</p>;

    return (
        <div className="mt-4 pt-3 border-t border-slate-600/70 space-y-2">
            <h5 className="text-sm font-['Cinzel'] text-slate-300">Agent Commentaries:</h5>
            {commentaries.map(comment => (
                <div key={comment.id} className="p-2 bg-slate-700/50 rounded text-xs border border-slate-600/50">
                    <div className="flex items-center mb-1">
                         <AgentIconPlaceholder agent={comment.agent} />
                        <strong className={`font-semibold ${AGENT_PROFILES[comment.agent]?.colorClass || 'text-slate-200'}`}>
                            {AGENT_NAME_TO_STRING_MAP[comment.agent] || comment.agent}
                        </strong>
                        <span className="text-slate-500 ml-auto text-[10px]">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-200 italic ml-7">{comment.commentaryText}</p>
                </div>
            ))}
        </div>
    );
}

export default DriftArchivePanel;
