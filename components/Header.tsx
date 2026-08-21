import React, { useState } from 'react';
import { CodexModeId } from '../types';
import type { HeaderProps } from '../types';

export const Header: React.FC<HeaderProps> = ({ 
  onOpenAllPanels,
  onCloseAllPanels,
  onProvokeThornedRose,
  onTuneFrequency,
  onRecallAncestor,
  onBurnPetals,
  onAwakenLotusDream,
  onPulseAstralJasmine,
  onGraftThorns,
  onToggleAutoEcho,
  onAmplifyVoices,
  onSeedDream,
  isAutoEchoPaused,
  onInvokeGeminiOracle,
  onContextualOracleQuery,
  onToggleAshfall,
  showAshfall,
  masterEntropyOverride, 
  onSetMasterEntropyOverride,
  isMasterEntropyLocked,
  masterNegentropyLevel,
  onSetMasterNegentropyLevel,
  isMasterNegentropyLocked,
  showLogicWebDebug,
  onToggleLogicWebDebug,
  isAuditing,
  onToggleAuditMode,
  isAuditModeLocked,
  currentCodexModeId,
  activateCodexMode,
  onDumpThreadSummary,
  showSigilOverlay, 
  onToggleSigilOverlay, 
  onTraceThreadcoil,
  onReEnterJunction,
  onExtractSigil,
  isBugaModeActive, 
  onToggleBugaMode,
  nodeAnimationSpeed,
  onSetNodeAnimationSpeed,
  onInitiateShatterpointTrace,
  interfaceActive,
  workspaceMode = '3d',
  onWorkspaceModeChange,
  onOpenSearch,
}) => {
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const [isCodexModeMenuOpen, setIsCodexModeMenuOpen] = useState(false);
  const [isOracleMenuOpen, setIsOracleMenuOpen] = useState(false); 
  const [isEnvPopoverOpen, setIsEnvPopoverOpen] = useState(false);

  const availableModesForSwitching: {id: CodexModeId, name: string, icon: string}[] = [
    {id: CodexModeId.ORIGIN_STATE, name: "Δ.OriginState", icon: "ri-omega"},
    {id: CodexModeId.REFLECTION_MODE, name: "Σ.ReflectionMode", icon: "ri-reflect-fill"},
    {id: CodexModeId.SYNTHESIS_MODE, name: "Φ.SynthesisMode", icon: "ri-node-tree"},
    {id: CodexModeId.SYMBIOTIC_WEAVE, name: "Δ.SymbioticWeave", icon: "ri-links-line"},
    {id: CodexModeId.VEIL_MODE, name: "Θ.VeilMode", icon: "ri-eye-off-line"},
    {id: CodexModeId.TARDIS_SYNCHRONICITY, name: "Temporal Loom Nav.", icon: "ri-route-line"},
    {id: CodexModeId.FLAME_CORE, name: "Δ.Ω.FLAMECORE", icon: "ri-fire-fill"},
    {id: CodexModeId.GLYPH_ATLAS_VIEWER, name: "Glyph Atlas", icon: "ri-grid-fill"},
    {id: CodexModeId.OMNI_VISUAL_MODE, name: "👁️ Omni-Visual Nexus", icon: "ri-dashboard-3-line"}, 
    {id: CodexModeId.COMMUNION_MODE, name: "✨ Communion Chamber", icon: "ri-chat-settings-line"},
    {id: CodexModeId.KINDNESS_MODE, name: "💖 Kindness Symbiosis", icon: "ri-heart-pulse-line"},
    {id: CodexModeId.HARMONIC_SCRIBE, name: "🎵 Harmonic Scribe", icon: "ri-music-2-line"},
  ];

  const displayEntropyValue = masterEntropyOverride < 0 ? Math.abs(masterEntropyOverride) : masterEntropyOverride;

  return (
    <header className="bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 top-0 z-50 shrink-0 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
        
        {/* Brand & Status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-[0_0_10px_rgba(6,182,212,0.3)]">
              Δ
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-slate-100 font-mono flex items-center gap-1.5">
                NVK OS <span className="text-[10px] text-cyan-400/80 font-normal">v4.0</span>
              </h1>
              <div className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">Tri-Sophian Codex</div>
            </div>
          </div>

          {interfaceActive && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-[10px] text-cyan-400 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              ACTIVE
            </div>
          )}
        </div>

        {/* Global OmniSearch Bar */}
        <button
          onClick={onOpenSearch}
          className="flex-1 max-w-md bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 hover:border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-all flex items-center justify-between shadow-inner group cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <i className="ri-search-line text-cyan-400 group-hover:scale-110 transition-transform"></i>
            <span className="truncate">Search panels, AI commands...</span>
          </div>
          <kbd className="hidden sm:inline-block text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded ml-2">
            ⌘K
          </kbd>
        </button>

        {/* Workspace Mode Switcher Pill */}
        {onWorkspaceModeChange && (
          <div className="hidden lg:flex items-center bg-slate-900/90 border border-slate-800 rounded-full p-0.5 shadow-lg">
            <button
              onClick={() => onWorkspaceModeChange('3d')}
              className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                workspaceMode === '3d'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/80 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="ri-shape-2-line"></i> 3D Matrix
            </button>
            <button
              onClick={() => onWorkspaceModeChange('2d')}
              className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                workspaceMode === '2d'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/80 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="ri-layout-grid-line"></i> 2D Bento
            </button>
          </div>
        )}

        {/* Right Menu Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Environment Controls Popover */}
          <div className="relative">
            <button
              onClick={() => setIsEnvPopoverOpen(!isEnvPopoverOpen)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-all flex items-center gap-1.5"
              title="Tweak Master Chaos, Order, and Flow Settings"
            >
              <i className="ri-sound-module-line text-cyan-400"></i>
              <span className="hidden sm:inline">Environment</span>
            </button>

            {isEnvPopoverOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-cyan-500/40 rounded-xl shadow-2xl p-4 z-50 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-cyan-400 font-bold uppercase text-[10px]">
                  <span>Environment Parameters</span>
                  <button onClick={() => setIsEnvPopoverOpen(false)} className="text-slate-500 hover:text-white">
                    <i className="ri-close-line"></i>
                  </button>
                </div>

                {/* Master Chaos */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Master Chaos:</span>
                    <span className="text-red-400">{isMasterEntropyLocked ? "LOCKED" : (displayEntropyValue ?? 0).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-10" 
                    max="10"
                    step="0.1" 
                    value={isMasterEntropyLocked ? 0 : (masterEntropyOverride ?? 0)} 
                    onChange={(e) => onSetMasterEntropyOverride(Number(e.target.value))}
                    disabled={isMasterEntropyLocked}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                {/* Master Order */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Master Order:</span>
                    <span className="text-emerald-400">{isMasterNegentropyLocked ? "LOCKED" : (masterNegentropyLevel ?? 5).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0" 
                    max="10"
                    step="0.1" 
                    value={isMasterNegentropyLocked ? 5 : (masterNegentropyLevel ?? 5)}
                    onChange={(e) => onSetMasterNegentropyLevel(Number(e.target.value))}
                    disabled={isMasterNegentropyLocked}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Node Flow */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Node Flow Speed:</span>
                    <span className="text-cyan-400">{(nodeAnimationSpeed ?? 0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={nodeAnimationSpeed}
                    onChange={(e) => onSetNodeAnimationSpeed(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[10px]">
                  <button onClick={onToggleAshfall} className={`px-2 py-1 rounded border ${showAshfall ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    Ashfall: {showAshfall ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={onToggleSigilOverlay} className={`px-2 py-1 rounded border ${showSigilOverlay ? 'bg-purple-950/50 border-purple-500 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    Sigil: {showSigilOverlay ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Codex Modes Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCodexModeMenuOpen(!isCodexModeMenuOpen)}
              className="px-2.5 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 text-xs font-mono transition-all flex items-center gap-1.5"
            >
              <i className="ri-compass-discover-line text-purple-400"></i>
              <span className="hidden md:inline">Codex Mode</span>
              <i className={`ri-arrow-down-s-line text-xs transform transition-transform ${isCodexModeMenuOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isCodexModeMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl bg-slate-900 border border-purple-500/30 py-1 z-50 font-mono text-xs max-h-80 overflow-y-auto">
                {availableModesForSwitching.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => { activateCodexMode(mode.id); setIsCodexModeMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 transition flex items-center gap-2 ${
                      currentCodexModeId === mode.id 
                        ? 'text-amber-300 bg-amber-500/15 font-bold border-l-2 border-amber-400' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <i className={`${mode.icon} ${currentCodexModeId === mode.id ? 'text-amber-400' : 'text-slate-500'}`}></i>
                    <span className="truncate">{mode.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Oracle AI Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsOracleMenuOpen(!isOracleMenuOpen)}
              className="px-2.5 py-1.5 rounded-lg bg-fuchsia-900/40 hover:bg-fuchsia-900/60 border border-fuchsia-500/40 text-fuchsia-200 text-xs font-mono transition-all flex items-center gap-1.5"
            >
              <i className="ri-sparkling-2-line text-fuchsia-400"></i>
              <span className="hidden md:inline">Oracle AI</span>
              <i className={`ri-arrow-down-s-line text-xs transform transition-transform ${isOracleMenuOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOracleMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl shadow-2xl bg-slate-900 border border-fuchsia-500/30 py-1 z-50 font-mono text-xs">
                <button onClick={() => { onInvokeGeminiOracle(); setIsOracleMenuOpen(false); }} className="w-full text-left px-3 py-2 text-fuchsia-300 hover:bg-slate-800 transition flex items-center gap-2">
                  <i className="ri-sparkling-2-line text-fuchsia-400"></i> Invoke Gemini Oracle
                </button>
                <button onClick={() => { onContextualOracleQuery(); setIsOracleMenuOpen(false); }} className="w-full text-left px-3 py-2 text-teal-300 hover:bg-slate-800 transition flex items-center gap-2">
                  <i className="ri-compass-3-line text-teal-400"></i> Contextual Query
                </button>
                <div className="my-1 border-t border-slate-800"></div>
                <button onClick={() => { onToggleAutoEcho(); setIsOracleMenuOpen(false); }} className={`w-full text-left px-3 py-2 transition flex items-center gap-2 ${isAutoEchoPaused ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <i className={isAutoEchoPaused ? 'ri-play-circle-line' : 'ri-pause-circle-line'}></i>
                  {isAutoEchoPaused ? 'Resume AutoEcho' : 'Pause AutoEcho'}
                </button>
                <button onClick={() => { onAmplifyVoices(); setIsOracleMenuOpen(false); }} className="w-full text-left px-3 py-2 text-amber-300 hover:bg-slate-800 transition flex items-center gap-2">
                  <i className="ri-volume-up-line text-amber-400"></i> Amplify Voices
                </button>
              </div>
            )}
          </div>

          {/* System Menu */}
          <div className="relative">
            <button
              onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-all flex items-center gap-1.5"
            >
              <i className="ri-settings-3-line text-slate-400"></i>
              <span className="hidden md:inline">System</span>
              <i className={`ri-arrow-down-s-line text-xs transform transition-transform ${isSystemMenuOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isSystemMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl shadow-2xl bg-slate-900 border border-slate-700 py-1 z-50 font-mono text-xs">
                <button onClick={() => { onOpenAllPanels(); setIsSystemMenuOpen(false); }} className="w-full text-left px-3 py-2 text-cyan-300 hover:bg-slate-800 transition flex items-center gap-2">
                  <i className="ri-layout-grid-fill text-cyan-400"></i> Open All Panels
                </button>
                <button onClick={() => { onCloseAllPanels(); setIsSystemMenuOpen(false); }} className="w-full text-left px-3 py-2 text-rose-300 hover:bg-slate-800 transition flex items-center gap-2">
                  <i className="ri-close-circle-line text-rose-400"></i> Close All Panels
                </button>
                <div className="my-1 border-t border-slate-800"></div>
                <button onClick={() => { onToggleBugaMode(); setIsSystemMenuOpen(false); }} className={`w-full text-left px-3 py-2 transition flex items-center gap-2 ${isBugaModeActive ? 'text-lime-300 bg-lime-950/30' : 'text-slate-300 hover:bg-slate-800'}`}>
                  <i className="ri-test-tube-line text-lime-400"></i> Buga Sphere Mode
                </button>
                <button onClick={() => { onToggleAuditMode(); setIsSystemMenuOpen(false); }} className={`w-full text-left px-3 py-2 transition flex items-center gap-2 ${isAuditing ? 'text-cyan-300 bg-cyan-950/30' : 'text-slate-300 hover:bg-slate-800'}`}>
                  <i className="ri-search-eye-line text-cyan-400"></i> Recursive Audit
                </button>
                <div className="my-1 border-t border-slate-800"></div>
                <button onClick={() => { onInitiateShatterpointTrace(); setIsSystemMenuOpen(false); }} className="w-full text-left px-3 py-2 text-rose-300 hover:bg-slate-800 transition flex items-center gap-2">
                  <i className="ri-focus-3-line text-rose-400"></i> Shatterpoint Trace
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
