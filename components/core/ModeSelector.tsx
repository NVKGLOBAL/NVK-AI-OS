
import React from 'react';
import type { GeoMode, VisualizationMatrixMode } from '../../types';

// Generic Mode type that encompasses both GeoMode and VisualizationMatrixMode
type AnyDisplayMode = GeoMode | VisualizationMatrixMode;

interface ModeSelectorProps<T extends AnyDisplayMode> {
  currentMode: T;
  onSetMode: (mode: T) => void;
  availableModes: T[];
  modeGroupName?: string; // Optional title for the mode group
}

const ModeSelector = <T extends AnyDisplayMode>({ 
  currentMode, 
  onSetMode, 
  availableModes,
  modeGroupName = "Display Mode"
}: ModeSelectorProps<T>) => {
  return (
    <div className="mode-selector-container my-3">
      {modeGroupName && <label className="block text-xs font-mono text-slate-400 mb-1.5 text-center">{modeGroupName}</label>}
      <div className="mode-selector flex flex-wrap justify-center gap-1.5 p-1.5 bg-slate-800/60 rounded-md border border-slate-700/60 shadow-sm">
        {availableModes.map(mode => (
          <button
            key={mode}
            onClick={() => onSetMode(mode)}
            className={`px-2.5 py-1 text-[10px] md:text-xs rounded-md transition-all duration-150 ease-in-out border focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-slate-800
              ${currentMode === mode
                ? 'bg-indigo-500 border-indigo-400 text-white font-semibold shadow-md transform scale-105 focus:ring-indigo-300'
                : 'bg-slate-700 border-slate-600 hover:bg-slate-600/80 hover:border-slate-500 text-slate-300 hover:text-slate-100 focus:ring-indigo-400'
              }`}
            aria-pressed={currentMode === mode}
            title={`Activate ${mode} mode`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;
