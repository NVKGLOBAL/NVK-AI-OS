
import React, { useMemo, useContext, useState, useEffect } from 'react';
import type { IDriftInterpretationDB } from '../../types'; // Changed to DB type
import { DriftNarratorContext } from '../../context/DriftNarratorContext'; 

interface MeaningPulseGraphProps {
  glyphSymbol: string | null; // Still use glyphSymbol for display consistency, but use ID for fetch
}

const MeaningPulseGraph: React.FC<MeaningPulseGraphProps> = ({ glyphSymbol }) => {
  const driftService = useContext(DriftNarratorContext); 
  const [driftData, setDriftData] = useState<IDriftInterpretationDB[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!glyphSymbol || !driftService) { // Check for glyphSymbol before fetching
      setDriftData([]);
      return;
    }

    setIsLoading(true);
    // Note: DriftNarratorService's getDriftHistoryForGlyph expects the glyph's unique ID (node.id) for DB lookup,
    // but the MeaningPulseGraph is often keyed by glyphSymbol (node.label or node.glyphId).
    // This might require an adjustment in how glyphs are identified or fetched if glyphSymbol is not unique or not the DB key.
    // For now, assuming glyphSymbol is what the service can use or that the service maps it internally.
    // A better approach would be to pass the glyph's unique ID (e.g., GlyphMutationNode.id) to this component.
    // Let's assume for now the service's getDriftHistoryForGlyph can handle a symbol string (label).
    driftService.getDriftHistoryForGlyph(glyphSymbol) // This might need to change to use glyphNode.id
        .then(data => {
            setDriftData(data.map(d => ({...d, timestamp: new Date(d.timestamp)}))); // Ensure timestamp is Date object
            setIsLoading(false);
        })
        .catch(error => {
            console.error(`Error fetching drift history for ${glyphSymbol}:`, error);
            setDriftData([]);
            setIsLoading(false);
        });
  }, [glyphSymbol, driftService]);
  
  const getPulseStyle = (drift: IDriftInterpretationDB) => {
    const baseSize = 6 + (drift.driftScore * 8); 
    const pulseSize = baseSize + (drift.entropy * 5); 
    
    let className = 'stable-pulse';
    let animation = 'stablePulse 3s infinite';

    if (drift.entropy > 0.7) {
      className = 'chaotic-pulse';
      animation = `chaosPulse ${1 + (drift.entropy/50)}s infinite`;
    } else if (drift.entropy > 0.4) {
      className = 'volatile-pulse';
      animation = `volatilePulse ${2 + (drift.entropy/30)}s infinite`;
    }
    return { size: Math.max(4, pulseSize), className, animation };
  };

  if (!glyphSymbol) {
    return (
        <div className="meaning-pulse p-3 bg-slate-800/60 rounded-lg border border-slate-700/70 shadow-inner mt-3">
            <h3 className="text-xs font-mono text-slate-400 uppercase mb-1.5 tracking-wider">Semantic Trajectory</h3>
            <div className="h-32 flex items-center justify-center text-slate-500 italic text-xs">
                No glyph selected for trajectory analysis.
            </div>
        </div>
    );
  }
  
  if (isLoading) {
    return (
        <div className="meaning-pulse p-3 bg-slate-800/60 rounded-lg border border-slate-700/70 shadow-inner mt-3">
            <h3 className="text-xs font-mono text-slate-400 uppercase mb-1.5 tracking-wider">Semantic Trajectory: {glyphSymbol}</h3>
            <div className="h-32 flex items-center justify-center text-slate-400 italic text-xs animate-pulse">
                Loading trajectory...
            </div>
        </div>
    );
  }

  if (driftData.length === 0) {
    return (
        <div className="meaning-pulse p-3 bg-slate-800/60 rounded-lg border border-slate-700/70 shadow-inner mt-3">
            <h3 className="text-xs font-mono text-slate-400 uppercase mb-1.5 tracking-wider">Semantic Trajectory: {glyphSymbol}</h3>
            <div className="h-32 flex items-center justify-center text-slate-500 italic text-xs">
                No drift history available for this glyph.
            </div>
        </div>
    );
  }


  return (
    <div className="meaning-pulse p-3 bg-slate-800/60 rounded-lg border border-slate-700/70 shadow-inner mt-3">
      <h3 className="text-xs font-mono text-slate-400 uppercase mb-1.5 tracking-wider">Semantic Trajectory: {glyphSymbol}</h3>
      <div className="graph-container h-32 w-full relative bg-slate-700/30 rounded overflow-hidden border border-slate-600/50">
        
        {driftData.slice(0, 15).map((entry, index, arr) => { 
          const { size, className, animation } = getPulseStyle(entry);
          const denominator = arr.length > 1 ? arr.length - 1 : 1;
          const leftPercentage = arr.length > 1 ? (index / denominator) * 100 : 50; 

          const position = {
            left: `${leftPercentage}%`,
            bottom: `${entry.driftScore * 100}%`, 
          };
          
          return (
            <div 
              key={entry.id} 
              className={`pulse-point ${className} absolute rounded-full transition-all duration-500 ease-out`}
              style={{
                ...position,
                width: `${size}px`,
                height: `${size}px`,
                animation: animation,
                transform: 'translate(-50%, 50%)', 
                border: '1px solid rgba(255,255,255,0.2)'
              }}
              title={`Drift: ${entry.driftScore.toFixed(2)}, E: ${entry.entropy.toFixed(2)} @ ${new Date(entry.timestamp).toLocaleTimeString()}`}
            >
            </div>
          );
        })}
        
      </div>
      
      <div className="time-axis flex justify-between text-slate-500 text-[10px] mt-1 px-1">
        <span>Past</span>
        <span>Present</span>
      </div>
    </div>
  );
};

export default MeaningPulseGraph;
