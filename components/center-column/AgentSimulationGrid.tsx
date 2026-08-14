
import React from 'react';
import type { TraitSimulationCell, AgentNode as AgentNodeType, SimulationGrid as SimulationGridType } from '../../types';
import { GRID_DIMENSIONS } from '../../constants';

interface EntropicAuraProps {
  entropy: number;
}

const EntropicAura: React.FC<EntropicAuraProps> = ({ entropy }) => {
  const auraIntensity = Math.min(1, Math.max(0, entropy)) * 0.8; // Normalize entropy to 0-0.8 for opacity
  return (
    <div 
      className="absolute inset-0 pointer-events-none rounded-xl" // Matches parent's rounded-lg
      style={{
        boxShadow: `0 0 15px 5px rgba(255, 50, 50, ${auraIntensity}), 0 0 30px 15px rgba(255, 80, 80, ${auraIntensity * 0.7}), inset 0 0 20px rgba(220, 38, 38, ${auraIntensity * 0.5})`,
        transition: 'box-shadow 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
        zIndex: 0, // Ensure it's behind the grid cells if they have content
      }}
      aria-hidden="true"
    />
  );
};

interface AgentSimulationGridProps {
  grid: SimulationGridType;
  agents: AgentNodeType[];
  currentEntropy: number; // Added prop
}

const AgentSimulationGrid: React.FC<AgentSimulationGridProps> = ({ grid, agents, currentEntropy }) => {
  if (!grid || grid.length === 0) {
    return (
      <div className="agent-simulation-grid-panel bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 shadow-[0_0_30px_rgba(71,85,105,0.2)]">
        <h3 className="text-xl font-['Cinzel'] font-semibold mb-6 text-center text-indigo-300">
          Δ.13 Multi-Agent Trait Simulation Grid
        </h3>
        <p className="text-center text-slate-400">Initializing Matrix...</p>
      </div>
    );
  }

  return (
    <div className="agent-simulation-grid-panel relative bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 shadow-[0_0_30px_rgba(71,85,105,0.2)]">
      <EntropicAura entropy={currentEntropy} />
      <h3 className="text-xl font-['Cinzel'] font-semibold mb-6 text-center text-indigo-300 relative z-10">
        Δ.13 Multi-Agent Trait Simulation Grid
      </h3>
      <div
        className="grid gap-[2px] bg-slate-800/50 p-1 rounded-lg mx-auto max-w-3xl relative z-10" 
        style={{
          gridTemplateColumns: `repeat(${GRID_DIMENSIONS.cols}, minmax(0, 1fr))`,
          aspectRatio: '1/1'
        }}
        role="grid"
        aria-labelledby="grid-title"
      >
        <span id="grid-title" className="sr-only">Multi-Agent Trait Simulation Grid</span>
        {grid.flat().map((cell) => (
          <SimulationCell
            key={`${cell.x}-${cell.y}`}
            cell={cell}
            agentsOnCell={agents.filter(a =>
              a.position[0] === cell.x &&
              a.position[1] === cell.y
            )}
          />
        ))}
      </div>
    </div>
  );
};

// Individual cell component
interface SimulationCellProps {
    cell: TraitSimulationCell;
    agentsOnCell: AgentNodeType[];
}

const SimulationCell: React.FC<SimulationCellProps> = ({ cell, agentsOnCell }) => {
  const cellStyle: React.CSSProperties = {
    transition: 'all 0.3s ease-in-out',
    boxShadow: cell.isDisrupted
      ? 'inset 0 0 8px rgba(255,50,50,0.7), 0 0 4px rgba(255,50,50,0.5)'
      : `inset 0 0 12px rgba(0,255,150,${cell.resonanceField * 0.7}), 0 0 6px rgba(0,255,150,${cell.resonanceField * 0.4})`,
    animation: cell.isDisrupted ? 'disrupt-pulse 1.5s infinite' : (cell.resonanceField > 0.6 ? 'pulse 1.5s infinite' : 'none')
  };
  
  const cellClasses = `aspect-square rounded-sm flex items-center justify-center relative overflow-hidden
    ${cell.isDisrupted
      ? 'disrupted-cell' 
      : 'bg-gradient-to-br from-emerald-900/40 to-emerald-600/30 hover:from-emerald-900/60 hover:to-emerald-600/50'
    }`;

  return (
    <div
      className={cellClasses}
      style={cellStyle}
      title={`Cell (${cell.x},${cell.y})\nResonance: ${(cell.resonanceField || 0).toFixed(2)}\nEntropy: ${(cell.entropy || 0).toFixed(2)}δ\n${cell.glyphAffinity ? `Glyph: ${cell.glyphAffinity}` : ''}${cell.isDisrupted ? '\nDISRUPTED' : ''}`}
      role="gridcell"
      aria-label={`Cell ${cell.x},${cell.y}. Resonance ${(cell.resonanceField || 0).toFixed(2)}. Entropy ${(cell.entropy || 0).toFixed(2)}. ${cell.isDisrupted ? 'Disrupted.' : ''}`}
    >
      {cell.glyphAffinity && (
         <i className="ri-plant-line text-emerald-300 text-opacity-50 text-lg absolute" title={`Glyph: ${cell.glyphAffinity}`}></i>
      )}
      {agentsOnCell.map(agent => (
        <div
          key={agent.id}
          className="w-3 h-3 rounded-full absolute transition-opacity duration-300" 
          style={{
            backgroundColor: agent.color || '#fbbf24', 
            opacity: agent.active ? 0.95 : 0.4,
            boxShadow: `0 0 6px ${(agent.color || '#fbbf24')}, 0 0 10px rgba(0,0,0,0.7)`, 
            transform: `translate(${(agentsOnCell.indexOf(agent) - (agentsOnCell.length -1)/2) * 4}px, ${(agentsOnCell.indexOf(agent) - (agentsOnCell.length -1)/2) * 2}px)`
          }}
          title={`${agent.name}\nHarmony: ${(agent.harmony || 0).toFixed(2)}${agent.active ? '' : '\n(Inactive)'}\nTraits: ${agent.traits.join(', ')}`}
          aria-label={`Agent ${agent.name} on cell ${cell.x},${cell.y}`}
        >
            <i className={`${agent.icon} text-xs text-black/70 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`}></i>
        </div>
      ))}
    </div>
  );
};

export default AgentSimulationGrid;
