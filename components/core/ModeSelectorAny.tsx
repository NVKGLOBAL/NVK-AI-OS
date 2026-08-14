
import React from 'react';

// Generic Mode type constraint: ensures T is a string.
type AnyGenericMode = string;

interface ModeSelectorProps<T extends AnyGenericMode> {
  currentMode: T;
  onSetMode: (mode: T) => void;
  availableModes: T[]; // Now accepts an array of strings directly
  modeGroupName?: string;
}

const ModeSelectorAny = <T extends AnyGenericMode>({ 
  currentMode, 
  onSetMode, 
  availableModes,
  modeGroupName = "Display Mode"
}: ModeSelectorProps<T>) => {
  return (
    <div className="mode-selector-container my-2"> {/* Reduced margin for tighter layout */}
      {modeGroupName && <label className="block text-xs font-mono text-slate-400 mb-1 text-center">{modeGroupName}</label>}
      <div className="mode-selector flex flex-wrap justify-center gap-1 p-1 bg-slate-800/50 rounded-md border border-slate-700/50 shadow-sm">
        {availableModes.map(mode => (
          <button
            key={mode} // Mode itself is used as key, assuming it's unique
            onClick={() => onSetMode(mode)}
            className={`px-2 py-0.5 text-[9px] md:text-[10px] rounded transition-all duration-150 ease-in-out border focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-slate-800
              ${currentMode === mode
                ? 'bg-purple-500 border-purple-400 text-white font-semibold shadow-md transform scale-105 focus:ring-purple-300'
                : 'bg-slate-700 border-slate-600 hover:bg-slate-600/80 hover:border-slate-500 text-slate-300 hover:text-slate-100 focus:ring-purple-400'
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

export default ModeSelectorAny;
