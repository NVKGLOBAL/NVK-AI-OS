import React, { useState } from 'react';
import { CodexModeId } from '../types';
import type { HeaderProps } from '../types';
import { version as PACKAGE_VERSION } from '../package.json';
import { useIsMobile } from '../lib/useIsMobile';

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
  onSeedDream,
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
  onTraceThreadcoil,
  onReEnterJunction,
  onExtractSigil,
  isBugaModeActive, 
  onToggleBugaMode,
  nodeAnimationSpeed,
  onSetNodeAnimationSpeed,
  onInitiateShatterpointTrace,
  interfaceActive,
  workspaceMode = 'immersive',
  onWorkspaceModeChange,
  onOpenSearch,
  onOpenCoreControls,
  onOpenSettings,
  onOpenTutorial,
}) => {
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const [isCodexModeMenuOpen, setIsCodexModeMenuOpen] = useState(false);
  const [isOracleMenuOpen, setIsOracleMenuOpen] = useState(false); 
  const [isEnvPopoverOpen, setIsEnvPopoverOpen] = useState(false);
  // Mobile-first redesign (2026-11-27): on a phone the header is only
  // the logo mark + wordmark + ONE menu button. Search, the mode pill
  // and the four menus live in the sheet below. Desktop is unchanged.
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

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
    <header className="relative bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 top-0 z-[1200] shrink-0 select-none" style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top, 0px))' }}>
      {/* R11-1: the round-2 `overflow-hidden` backstop is REMOVED. It
          clipped the header's own absolutely-positioned dropdown menus
          (Environment / Codex Modes / Oracle AI / System) — see the
          z-index note below.
          Menu test (2026-11-23): the Environment popover opened but its
          left ~40% was hidden behind the Flower of Life floating panel,
          so the Master Chaos slider thumb could not be grabbed. The
          header was z-50, below the floating panels (z-1090) and the
          chat console (z-[1095]). The header is now z-[1200] — above
          every panel and the chat console — so its dropdowns and
          popovers always render on top. The header sits at the top of
          the screen and never overlaps the chat console, so raising it
          covers nothing it should not.
          (Environment / Codex Mode / Oracle AI / System extend below the
          header box — with overflow-hidden they were invisible), and any
          content extending above the header box would be cut the same way.
          The horizontal-scrollbar protection now comes from the row
          fixes alone (full-width row, min-w-0 search, shrink-0 pill) —
          retest #11 confirmed no horizontal scrollbar with them. The
          header is `relative` so its z-[1200] actually takes effect (z-index
          without position was a no-op). */}
      {/* Mobile-first redesign (2026-11-27): compact phone header —
          logo mark + wordmark + ONE menu button. The full row below is
          desktop-only (hidden md:flex). */}
      <div className="w-full flex md:hidden items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 shrink-0 rounded-lg bg-cyan-500/15 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)]" aria-hidden="true">
            <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
              <path d="M6.5 1.5 L12 11 H1 Z" stroke="#22d3ee" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-sm font-bold tracking-wider text-slate-100 font-mono flex items-center gap-1.5">
            NVK OS <span className="text-[10px] text-cyan-400/80 font-normal">v{PACKAGE_VERSION}</span>
          </h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center transition-all shrink-0 cursor-pointer"
          title="Menu"
          aria-label="Open menu"
        >
          <i className="ri-menu-line text-lg"></i>
        </button>
      </div>

      {/* Mobile menu sheet — search, mode pill and the four menus. */}
      {isMobile && isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[1290]" onClick={closeMobileMenu} aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-0 z-[1300] max-h-[82dvh] bg-slate-950 border-t border-cyan-500/40 rounded-t-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-center pt-2 pb-1 shrink-0" aria-hidden="true">
              <div className="w-10 h-1 rounded-full bg-slate-600" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-800 shrink-0">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">Menu</span>
              <button
                onClick={closeMobileMenu}
                className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shrink-0 cursor-pointer"
                title="Close menu"
                aria-label="Close menu"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-3 space-y-4 font-mono text-xs custom-scrollbar" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
              <button
                onClick={() => { onOpenSearch(); closeMobileMenu(); }}
                className="w-full min-h-[44px] bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-300 flex items-center gap-2 cursor-pointer"
              >
                <i className="ri-search-line text-cyan-400"></i>
                <span>Search panels, AI commands...</span>
              </button>

              {onWorkspaceModeChange && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Workspace mode</div>
                  <div className="flex items-center bg-slate-900/90 border border-slate-800/90 rounded-full p-0.5">
                    <button
                      onClick={() => { onWorkspaceModeChange('split'); closeMobileMenu(); }}
                      className={`flex-1 px-2 py-1 min-h-[44px] rounded-full text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${workspaceMode === 'split' ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/80 font-bold' : 'text-slate-400'}`}
                    >
                      3D Split
                    </button>
                    <button
                      onClick={() => { onWorkspaceModeChange('immersive'); closeMobileMenu(); }}
                      className={`flex-1 px-2 py-1 min-h-[44px] rounded-full text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${workspaceMode === 'immersive' ? 'bg-purple-500/25 text-purple-300 border border-purple-400/80 font-bold' : 'text-slate-400'}`}
                    >
                      3D Universe
                    </button>
                    <button
                      onClick={() => { onWorkspaceModeChange('grid'); closeMobileMenu(); }}
                      className={`flex-1 px-2 py-1 min-h-[44px] rounded-full text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${workspaceMode === 'grid' || workspaceMode === '2d' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/80 font-bold' : 'text-slate-400'}`}
                    >
                      3D Desk
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Environment</div>
                <div className="space-y-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-400">Master Chaos:</span>
                      <span className="text-red-400">{isMasterEntropyLocked ? "LOCKED" : (displayEntropyValue ?? 0).toFixed(1)}</span>
                    </div>
                    <input type="range" min="-10" max="10" step="0.1" value={isMasterEntropyLocked ? 0 : (masterEntropyOverride ?? 0)} onChange={(e) => onSetMasterEntropyOverride(Number(e.target.value))} disabled={isMasterEntropyLocked} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-400">Master Order:</span>
                      <span className="text-emerald-400">{isMasterNegentropyLocked ? "LOCKED" : (masterNegentropyLevel ?? 5).toFixed(1)}</span>
                    </div>
                    <input type="range" min="0" max="10" step="0.1" value={isMasterNegentropyLocked ? 5 : (masterNegentropyLevel ?? 5)} onChange={(e) => onSetMasterNegentropyLevel(Number(e.target.value))} disabled={isMasterNegentropyLocked} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-400">Node Flow Speed:</span>
                      <span className="text-cyan-400">{(nodeAnimationSpeed ?? 0).toFixed(2)}x</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={nodeAnimationSpeed} onChange={(e) => onSetNodeAnimationSpeed(Number(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                  </div>
                  <button onClick={onToggleAshfall} className={`px-3 py-2 min-h-[44px] rounded border text-[11px] ${showAshfall ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    Ashfall: {showAshfall ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Codex Mode</div>
                <div className="bg-slate-900 border border-purple-500/30 rounded-xl py-1 max-h-64 overflow-y-auto custom-scrollbar">
                  {availableModesForSwitching.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => { activateCodexMode(mode.id); closeMobileMenu(); }}
                      className={`w-full text-left px-3 py-2 min-h-[44px] transition flex items-center gap-2 ${currentCodexModeId === mode.id ? 'text-amber-300 bg-amber-500/15 font-bold border-l-2 border-amber-400' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      <i className={`${mode.icon} ${currentCodexModeId === mode.id ? 'text-amber-400' : 'text-slate-500'}`}></i>
                      <span className="truncate">{mode.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Oracle AI</div>
                <button onClick={() => { onContextualOracleQuery(); closeMobileMenu(); }} className="w-full text-left px-3 py-2 min-h-[44px] text-teal-300 bg-slate-900 border border-fuchsia-500/30 rounded-xl transition flex items-center gap-2">
                  <i className="ri-compass-3-line text-teal-400"></i> Contextual Query
                </button>
                <p className="px-1 pt-2 text-[10px] text-slate-500 leading-relaxed">
                  One insight from the real workspace state, generated by the loaded model.
                </p>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">System</div>
                <div className="bg-slate-900 border border-slate-700 rounded-xl py-1">
                  <button onClick={() => { onOpenAllPanels(); closeMobileMenu(); }} className="w-full text-left px-3 py-2 min-h-[44px] text-cyan-300 hover:bg-slate-800 transition flex items-center gap-2">
                    <i className="ri-layout-grid-fill text-cyan-400"></i> Open All Panels
                  </button>
                  <button onClick={() => { onCloseAllPanels(); closeMobileMenu(); }} className="w-full text-left px-3 py-2 min-h-[44px] text-rose-300 hover:bg-slate-800 transition flex items-center gap-2">
                    <i className="ri-close-circle-line text-rose-400"></i> Close All Panels
                  </button>
                  <div className="my-1 border-t border-slate-800"></div>
                  <button onClick={() => { onToggleBugaMode(); closeMobileMenu(); }} className={`w-full text-left px-3 py-2 min-h-[44px] transition flex items-center gap-2 ${isBugaModeActive ? 'text-lime-300 bg-lime-950/30' : 'text-slate-300 hover:bg-slate-800'}`}>
                    <i className="ri-test-tube-line text-lime-400"></i> Buga Sphere Mode
                  </button>
                  <button onClick={() => { onToggleAuditMode(); closeMobileMenu(); }} className={`w-full text-left px-3 py-2 min-h-[44px] transition flex items-center gap-2 ${isAuditing ? 'text-cyan-300 bg-cyan-950/30' : 'text-slate-300 hover:bg-slate-800'}`}>
                    <i className="ri-search-eye-line text-cyan-400"></i> Recursive Audit
                  </button>
                  <div className="my-1 border-t border-slate-800"></div>
                  <button onClick={() => { onOpenCoreControls?.(); closeMobileMenu(); }} className="w-full text-left px-3 py-2 min-h-[44px] text-cyan-300 hover:bg-slate-800 transition flex items-center gap-2">
                    <i className="ri-bubble-chart-line text-cyan-400"></i> Core Controls
                  </button>
                  <button onClick={() => { onOpenSettings?.(); closeMobileMenu(); }} className="w-full text-left px-3 py-2 min-h-[44px] text-slate-300 hover:bg-slate-800 transition flex items-center gap-2">
                    <i className="ri-settings-3-line text-slate-400"></i> Settings
                  </button>
                  <button onClick={() => { onOpenTutorial?.(); closeMobileMenu(); }} className="w-full text-left px-3 py-2 min-h-[44px] text-slate-300 hover:bg-slate-800 transition flex items-center gap-2">
                    <i className="ri-question-line text-slate-400"></i> First-run tour
                  </button>
                  <div className="my-1 border-t border-slate-800"></div>
                  <button onClick={() => { onInitiateShatterpointTrace(); closeMobileMenu(); }} className="w-full text-left px-3 py-2 min-h-[44px] text-rose-300 hover:bg-slate-800 transition flex items-center gap-2">
                    <i className="ri-focus-3-line text-rose-400"></i> Shatterpoint Trace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="w-full hidden md:flex items-center justify-between gap-3 flex-nowrap">
        
        {/* Brand & Status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* R11-1: the logo mark is an inline SVG triangle, not the
                text glyph "Δ". The body font is Orbitron (not loaded —
                falls back to system sans), so the Δ glyph's metrics came
                from whatever fallback font rendered it; a glyph's visual
                apex can exceed its line box and read as "cut" at the top.
                An SVG has deterministic geometry: the apex can never be
                clipped by font metrics. shrink-0 keeps flex from
                squeezing the 28px box. */}
            <div className="w-7 h-7 shrink-0 rounded-lg bg-cyan-500/15 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)]" aria-hidden="true">
              <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
                <path d="M6.5 1.5 L12 11 H1 Z" stroke="#22d3ee" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-slate-100 font-mono flex items-center gap-1.5">
                NVK OS <span className="text-[10px] text-cyan-400/80 font-normal">v{PACKAGE_VERSION}</span>
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
          className="flex-1 min-w-0 max-w-md min-h-[44px] bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 hover:border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-all flex items-center justify-between shadow-inner group cursor-pointer"
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
          <div className="flex items-center shrink-0 bg-slate-900/90 border border-slate-800/90 rounded-full p-0.5 shadow-lg overflow-x-auto max-w-full">
            <button
              onClick={() => onWorkspaceModeChange('split')}
              className={`px-2.5 sm:px-3 py-1 min-h-[44px] rounded-full text-[9px] sm:text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                workspaceMode === 'split'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/80 font-bold shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="3D Split Mode: Dedicated 3D Orb Stage on Top, Tool Panel on Bottom"
            >
              <i className="ri-layout-row-line text-cyan-400"></i>
              <span className="inline">3D Split</span>
            </button>
            <button
              onClick={() => onWorkspaceModeChange('immersive')}
              className={`px-2.5 sm:px-3 py-1 min-h-[44px] rounded-full text-[9px] sm:text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                workspaceMode === 'immersive' || workspaceMode === '3d'
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-400/80 font-bold shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="3D Immersive Mode: Full-screen 3D Spatial Universe"
            >
              <i className="ri-shape-2-line text-purple-400"></i>
              <span className="inline">3D Universe</span>
            </button>
            <button
              onClick={() => onWorkspaceModeChange('grid')}
              className={`px-2.5 sm:px-3 py-1 min-h-[44px] rounded-full text-[9px] sm:text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                workspaceMode === 'grid' || workspaceMode === '2d'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/80 font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="3D Desk Grid: High-density workspace with live 3D Core Stage"
            >
              <i className="ri-layout-grid-line text-emerald-400"></i>
              <span className="hidden sm:inline">3D Desk</span>
              <span className="sm:hidden">Desk</span>
            </button>
          </div>
        )}

        {/* Right Menu Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Environment Controls Popover */}
          <div className="relative">
            <button
              onClick={() => setIsEnvPopoverOpen(!isEnvPopoverOpen)}
              className="px-2.5 py-1.5 min-h-[44px] rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-all flex items-center gap-1.5"
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
                  <span className="text-slate-500">Ashfall is a real overlay. No Sigil overlay exists — its toggle was removed.</span>
                </div>
              </div>
            )}
          </div>

          {/* Codex Modes Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCodexModeMenuOpen(!isCodexModeMenuOpen)}
              className="px-2.5 py-1.5 min-h-[44px] rounded-lg bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 text-xs font-mono transition-all flex items-center gap-1.5"
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
              className="px-2.5 py-1.5 min-h-[44px] rounded-lg bg-fuchsia-900/40 hover:bg-fuchsia-900/60 border border-fuchsia-500/40 text-fuchsia-200 text-xs font-mono transition-all flex items-center gap-1.5"
            >
              <i className="ri-sparkling-2-line text-fuchsia-400"></i>
              <span className="hidden md:inline">Oracle AI</span>
              <i className={`ri-arrow-down-s-line text-xs transform transition-transform ${isOracleMenuOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOracleMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl shadow-2xl bg-slate-900 border border-fuchsia-500/30 py-1 z-50 font-mono text-xs">
                <button onClick={() => { onContextualOracleQuery(); setIsOracleMenuOpen(false); }} className="w-full text-left px-3 py-2 text-teal-300 hover:bg-slate-800 transition flex items-center gap-2">
                  <i className="ri-compass-3-line text-teal-400"></i> Contextual Query
                </button>
                <div className="px-3 py-2 text-[10px] text-slate-500 leading-relaxed">
                  One insight from the real workspace state, generated by the loaded model. The cloud-oracle, voice-amplify and auto-echo entries had no backing and were removed.
                </div>
              </div>
            )}
          </div>

          {/* System Menu */}
          <div className="relative">
            <button
              onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
              className="px-2.5 py-1.5 min-h-[44px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-all flex items-center gap-1.5"
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
                <button onClick={() => { onOpenCoreControls?.(); setIsSystemMenuOpen(false); }} className="w-full text-left px-3 py-2 text-cyan-300 hover:bg-slate-800 transition flex items-center gap-2">
                  <i className="ri-bubble-chart-line text-cyan-400"></i> Core Controls
                </button>
                <button onClick={() => { onOpenSettings?.(); setIsSystemMenuOpen(false); }} className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 transition flex items-center gap-2">
                  <i className="ri-settings-3-line text-slate-400"></i> Settings
                </button>
                <button onClick={() => { onOpenTutorial?.(); setIsSystemMenuOpen(false); }} className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 transition flex items-center gap-2">
                  <i className="ri-question-line text-slate-400"></i> First-run tour
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
