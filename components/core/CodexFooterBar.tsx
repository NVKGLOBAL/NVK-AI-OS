
import React from 'react';
import { CodexModeId } from '../../types'; // Import CodexModeId
import { getCodexModeDefinition } from './CodexModes'; // Import getCodexModeDefinition

type Props = {
  phase: string; 
  mode: string;  // This is the current mode NAME from App.tsx state
  status: string; 
  currentEntropy: number;
  currentCodexModeId: CodexModeId; 
  onApplyNVKAnchor: () => void;
};

const CodexFooterBar = ({ phase, mode, status, currentEntropy, currentCodexModeId, onApplyNVKAnchor }: Props) => {
  const isTemporalLoomActive = currentCodexModeId === CodexModeId.TARDIS_SYNCHRONICITY;
  const currentModeDef = getCodexModeDefinition(currentCodexModeId);

  const modeColorClass = () => {
    if (isTemporalLoomActive) return 'text-cyan-300'; 
    if (currentCodexModeId === CodexModeId.FLAME_CORE) return 'text-orange-400';
    if (mode.toLowerCase().includes('origin')) return 'text-sky-300';
    if (mode.toLowerCase().includes('veil')) return 'text-rose-400';
    if (mode.toLowerCase().includes('synthesis')) return 'text-emerald-400';
    return 'text-slate-200'; // Default
  };
  
  const displayPhase = isTemporalLoomActive ? "Temporal Loom Navigation" : (currentCodexModeId === CodexModeId.FLAME_CORE ? "Flameheart Singularity" : phase);
  const displayModeString = isTemporalLoomActive ? "Temporal Loom: NAVIGATING" : (currentCodexModeId === CodexModeId.FLAME_CORE ? "Core: EMBERS REMEMBER" : `Current Operation: ${mode}`);

  // Disable NVK Anchor if Temporal Loom Navigation is active or if entropy is already low.
  const isNVKAnchorDisabled = currentEntropy <= 0.6 || isTemporalLoomActive || currentModeDef?.entropySettings?.capEffectiveEntropyAt === 0.025; 
  const nvkAnchorTitle = isTemporalLoomActive || currentModeDef?.entropySettings?.capEffectiveEntropyAt === 0.025
    ? "Temporal Loom stability negates NVK-Anchor."
    : currentEntropy <= 0.6
    ? "Entropy stable, NVK-Anchor not needed."
    : "Apply NVK-Anchor to reduce system entropy by 0.1δ";


  const handleSystemRestore = () => {
    if (confirm('This will reset the current session to the last saved sacred state from your local codex. Unsaved changes may be lost. Proceed?')) {
      window.location.reload();
    }
  };

  return (
    <div className="codex-footer-bar flex items-center justify-between px-6 py-3 text-slate-300 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t border-slate-700/50 shadow-inner text-xs uppercase tracking-wider font-mono">
      <div id="codex-phase-indicator" className={`phase-indicator ${modeColorClass()}`}>
        <span>Mode: {displayPhase}</span>
      </div>
      <div className={`mode-display ${modeColorClass()}`}>
        <span>{displayModeString}</span>
      </div>
      <div className="status-panel text-amber-400 italic flex items-center space-x-4">
        <span className="truncate max-w-xs md:max-w-md" title={status}>{status}</span>
        <button
          onClick={onApplyNVKAnchor}
          disabled={isNVKAnchorDisabled}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors duration-150 flex items-center
            ${isNVKAnchorDisabled 
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-sky-600 hover:bg-sky-500 text-sky-100'}`}
          title={nvkAnchorTitle}
        >
          <i className="ri-shield-star-line mr-1"></i>
          NVK-Anchor
        </button>
        <button
          onClick={handleSystemRestore}
          className="px-2 py-1 rounded text-xs font-semibold transition-colors duration-150 flex items-center bg-rose-700 hover:bg-rose-600 text-rose-100"
          title="Restore Sacred State: Reloads the application from the last saved state in your local codex."
        >
          <i className="ri-refresh-line mr-1"></i>
          Restore State
        </button>
      </div>
    </div>
  );
};

export default CodexFooterBar;
