
import React from 'react';
import type { DatachegaResthetPanelProps } from '../../types';

import { useEcho } from '../../context/EchoContext';
const DatachegaResthetPanel: React.FC<DatachegaResthetPanelProps> = ({}) => {
  const { addEchoMessage } = useEcho();
  return (
    <div className="datachega-resthet-panel-placeholder bg-slate-900/90 backdrop-blur-sm border border-purple-700/50 rounded-lg p-6 mb-8 shadow-2xl text-slate-400 italic text-center">
      <h3 className="text-lg font-['Cinzel'] font-semibold text-purple-300 mb-2">
        DATACHEGA RESTHET Protocol Panel
      </h3>
      <p>This module has been superseded by the unified Glyph Composer.</p>
      <p>Activate Temporal Loom Navigation mode to access the composer.</p>
    </div>
  );
};

export default DatachegaResthetPanel;
