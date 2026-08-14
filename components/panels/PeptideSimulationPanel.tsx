
import React from 'react';
import { AgentName } from '../../types';

import { useEcho } from '../../context/EchoContext';
interface PeptideSimulationPanelProps {
    width: number;
  height: number;
}

const PeptideSimulationPanel: React.FC<PeptideSimulationPanelProps> = ({  width, height }) => {
  const { addEchoMessage } = useEcho();
  return (
    <div 
      className="peptide-simulation-panel-placeholder bg-slate-900/80 backdrop-blur-md border border-green-500/50 rounded-xl shadow-2xl p-4 text-slate-100 my-4 flex flex-col"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <h3 className="text-lg font-['Cinzel'] font-bold text-green-300 mb-3 text-center">
        Peptide Synthesis Simulation (Placeholder)
      </h3>
       <div className="flex-grow flex items-center justify-center text-center text-slate-400 italic">
        <p>This panel will visualize the folding and bio-active properties of peptide sequences designed in the Glyph Composer's Buga Mode.</p>
      </div>
    </div>
  );
};

export default PeptideSimulationPanel;
