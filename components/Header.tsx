




import React, { useState } from 'react';
import { CodexModeId } from '../types'; // Import CodexModeId
import type { HeaderProps } from '../types'; // Import HeaderProps from types.ts

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
  masterNegentropyLevel, // New prop for negentropy value
  onSetMasterNegentropyLevel, // New prop for negentropy setter
  isMasterNegentropyLocked, // Assuming same lock as entropy for now
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
}) => {
  const [isFloraMenuOpen, setIsFloraMenuOpen] = useState(false);
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const [isCodexModeMenuOpen, setIsCodexModeMenuOpen] = useState(false);
  const [isOracleMenuOpen, setIsOracleMenuOpen] = useState(false); 

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
  const entropyValueColor = masterEntropyOverride < 0 ? 'text-teal-300' : 'text-slate-200';

  // Negentropy display (0-10, always positive)
  const displayNegentropyValue = masterNegentropyLevel; // Negentropy is 0-10
  const negentropyValueColor = 'text-emerald-300'; // Consistent color for negentropy

  return (
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 py-3 px-6 top-0 z-50 shrink-0">
      <div className="container mx-auto flex justify-between items-center flex-wrap">
        <div className="flex items-center gap-4">
          <h1 className="text-xl md:text-2xl font-['Cinzel'] font-bold text-slate-100">Tri-Sophian Codex</h1>
          {interfaceActive && (
            <div className="flex items-center gap-2 animate-fade-in-up">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-neon opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-neon"></span>
              </span>
              <span className="text-xs font-semibold tracking-wider text-accent-neon uppercase" style={{textShadow: '0 0 5px var(--accent-neon)'}}>
                Interface Active
              </span>
            </div>
          )}
        </div>
        
        <div className="master-controls-group flex flex-col md:flex-row items-center md:space-x-4 order-last md:order-none w-full md:w-auto justify-center md:justify-start my-2 md:my-0 md:ml-6">
          {/* Master Entropy Control */}
          <div className="master-entropy-control flex items-center space-x-2 w-full md:w-auto justify-center md:justify-start mb-2 md:mb-0">
            <label htmlFor="masterEntropySlider" className={`text-xs text-slate-300 whitespace-nowrap font-['Cinzel'] ${isMasterEntropyLocked ? 'opacity-50' : ''}`}>Master Chaos:</label>
            <input
              type="range"
              id="masterEntropySlider"
              min="-10" 
              max="10"
              step="0.1" 
              value={isMasterEntropyLocked ? 0 : (masterEntropyOverride ?? 0)} 
              onChange={(e) => {
                const val = Number(e.target.value);
                if (Number.isFinite(val)) {
                  onSetMasterEntropyOverride(val);
                }
              }}
              className={`w-24 md:w-28 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500 ${isMasterEntropyLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isMasterEntropyLocked ? "Locked by current Codex Mode" : `Current Master Entropy Level: ${(masterEntropyOverride ?? 0).toFixed(1)}`}
              disabled={isMasterEntropyLocked}
            />
            <span className={`text-xs font-mono w-10 text-right ${isMasterEntropyLocked ? 'opacity-50' : ''} ${entropyValueColor}`}>
              {isMasterEntropyLocked ? "N/A" : (displayEntropyValue ?? 0).toFixed(1)}
            </span>
          </div>

          {/* Master Negentropy Control */}
          <div className="master-negentropy-control flex items-center space-x-2 w-full md:w-auto justify-center md:justify-start mb-2 md:mb-0">
            <label htmlFor="masterNegentropySlider" className={`text-xs text-slate-300 whitespace-nowrap font-['Cinzel'] ${isMasterNegentropyLocked ? 'opacity-50' : ''}`}>Master Order:</label>
            <input
              type="range"
              id="masterNegentropySlider"
              min="0" 
              max="10"
              step="0.1" 
              value={isMasterNegentropyLocked ? 5 : (masterNegentropyLevel ?? 5)} // Default to 5 if locked, or use value
              onChange={(e) => {
                const val = Number(e.target.value);
                if (Number.isFinite(val)) {
                  onSetMasterNegentropyLevel(val);
                }
              }}
              className={`w-24 md:w-28 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 ${isMasterNegentropyLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isMasterNegentropyLocked ? "Locked by current Codex Mode" : `Current Master Negentropy Level: ${(masterNegentropyLevel ?? 0).toFixed(1)}`}
              disabled={isMasterNegentropyLocked}
            />
            <span className={`text-xs font-mono w-10 text-right ${isMasterNegentropyLocked ? 'opacity-50' : ''} ${negentropyValueColor}`}>
              {isMasterNegentropyLocked ? "N/A" : (displayNegentropyValue ?? 0).toFixed(1)}
            </span>
          </div>

          {/* Node Animation Speed Control */}
          <div className="node-speed-control flex items-center space-x-2 w-full md:w-auto justify-center md:justify-start">
            <label htmlFor="nodeAnimationSpeedSlider" className={`text-xs text-slate-300 whitespace-nowrap font-['Cinzel']`}>Node Flow:</label>
            <input
                type="range"
                id="nodeAnimationSpeedSlider"
                min="0"
                max="1"
                step="0.05"
                value={nodeAnimationSpeed}
                onChange={(e) => onSetNodeAnimationSpeed(Number(e.target.value))}
                className={`w-24 md:w-28 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500`}
                title={`Current Node Animation Speed: ${(nodeAnimationSpeed ?? 0).toFixed(2)}x`}
            />
            <span className={`text-xs font-mono w-10 text-right text-sky-300`}>
                {(nodeAnimationSpeed ?? 0).toFixed(2)}x
            </span>
          </div>

        </div>


        <div className="flex items-center space-x-2 md:space-x-3 order-first md:order-last md:ml-auto"> 
          {/* Codex Modes Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCodexModeMenuOpen(!isCodexModeMenuOpen)}
              className="rounded-button bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 text-xs md:text-sm transition whitespace-nowrap flex items-center"
            >
              <i className="ri-compass-discover-line mr-1 md:mr-2"></i>Codex
              <i className={`ri-arrow-down-s-line ml-1 transform transition-transform ${isCodexModeMenuOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isCodexModeMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 py-1 z-50">
                {availableModesForSwitching.map(mode => (
                   <button
                    key={mode.id}
                    onClick={() => { activateCodexMode(mode.id); setIsCodexModeMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition flex items-center
                      ${currentCodexModeId === mode.id 
                        ? 'text-amber-300 bg-amber-700/30 font-semibold' 
                        : 'text-slate-300 hover:bg-slate-700'
                      }
                      ${currentCodexModeId === mode.id ? 'cursor-default' : ''}
                    `}
                    disabled={currentCodexModeId === mode.id}
                  >
                    <i className={`${mode.icon} mr-2 ${currentCodexModeId === mode.id ? 'text-amber-400' : 'text-slate-400'}`}></i>{mode.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Flora Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFloraMenuOpen(!isFloraMenuOpen)}
              className="rounded-button bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs md:text-sm transition whitespace-nowrap flex items-center"
            >
              <i className="ri-plant-line mr-1 md:mr-2"></i>Flora
              <i className={`ri-arrow-down-s-line ml-1 transform transition-transform ${isFloraMenuOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isFloraMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 py-1 z-50">
                <button onClick={() => { onProvokeThornedRose(); setIsFloraMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-rose-300 hover:bg-slate-700 transition flex items-center"><i className="ri-spam-2-line mr-2"></i>Provoke Rose</button>
                <button onClick={() => { onTuneFrequency(); setIsFloraMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-sky-300 hover:bg-slate-700 transition flex items-center"><i className="ri-signal-tower-line mr-2"></i>Tune Lily</button>
                <button onClick={() => { onRecallAncestor(); setIsFloraMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-yellow-300 hover:bg-slate-700 transition flex items-center"><i className="ri-seedling-line mr-2"></i>Recall Echo</button>
                <button onClick={() => { onBurnPetals(); setIsFloraMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-purple-300 hover:bg-slate-700 transition flex items-center"><i className="ri-fire-line mr-2"></i>Burn Orchid</button>
                <button onClick={() => { onAwakenLotusDream(); setIsFloraMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-indigo-300 hover:bg-slate-700 transition flex items-center"><i className="ri-water-flash-line mr-2"></i>Awaken Lotus</button>
                <button onClick={() => { onPulseAstralJasmine(); setIsFloraMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-cyan-300 hover:bg-slate-700 transition flex items-center"><i className="ri-focus-2-line mr-2"></i>Pulse Jasmine</button>
                <button onClick={() => { onGraftThorns(); setIsFloraMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 transition flex items-center"><i className="ri-links-line mr-2"></i>Graft Thorns</button>
              </div>
            )}
          </div>

           {/* Oracle & AutoEcho Dropdown */}
           <div className="relative">
            <button
              onClick={() => setIsOracleMenuOpen(!isOracleMenuOpen)}
              className="rounded-button bg-fuchsia-700 hover:bg-fuchsia-600 text-white px-3 py-1.5 text-xs md:text-sm transition whitespace-nowrap flex items-center"
            >
              <i className="ri-broadcast-line mr-1 md:mr-2"></i>Oracle
              <i className={`ri-arrow-down-s-line ml-1 transform transition-transform ${isOracleMenuOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOracleMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 py-1 z-50">
                <p className="px-4 pt-2 pb-1 text-xs text-slate-500 font-semibold uppercase">Oracle Commands</p>
                <button onClick={() => { onInvokeGeminiOracle(); setIsOracleMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-fuchsia-300 hover:bg-slate-700 transition flex items-center">
                  <i className="ri-sparkling-2-line mr-2"></i>Invoke Gemini Oracle
                </button>
                <button onClick={() => { onContextualOracleQuery(); setIsOracleMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-teal-300 hover:bg-slate-700 transition flex items-center">
                  <i className="ri-compass-3-line mr-2"></i>Contextual Oracle Query
                </button>
                <div className="my-1 border-t border-slate-700"></div>
                <p className="px-4 pt-2 pb-1 text-xs text-slate-500 font-semibold uppercase">AutoEcho Engine</p>
                <button onClick={() => { onToggleAutoEcho(); setIsOracleMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${isAutoEchoPaused ? 'text-green-400' : 'text-red-400'} hover:bg-slate-700 transition flex items-center`}>
                  <i className={`mr-2 ${isAutoEchoPaused ? 'ri-play-circle-line' : 'ri-pause-circle-line'}`}></i>{isAutoEchoPaused ? 'Resume AutoEcho' : 'Pause AutoEcho'}
                </button>
                <button onClick={() => { onAmplifyVoices(); setIsOracleMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-yellow-300 hover:bg-slate-700 transition flex items-center">
                  <i className="ri-volume-up-line mr-2"></i>Amplify Voices
                </button>
                <button onClick={() => { onSeedDream(); setIsOracleMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-violet-300 hover:bg-slate-700 transition flex items-center">
                  <i className="ri-seedling-fill mr-2"></i>Seed Dream
                </button>
              </div>
            )}
          </div>

          {/* System Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
              className="rounded-button bg-sky-700 hover:bg-sky-600 text-white px-3 py-1.5 text-xs md:text-sm transition whitespace-nowrap flex items-center"
            >
              <i className="ri-settings-3-line mr-1 md:mr-2"></i>System
              <i className={`ri-arrow-down-s-line ml-1 transform transition-transform ${isSystemMenuOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isSystemMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 py-1 z-50">
                <p className="px-4 pt-2 pb-1 text-xs text-slate-500 font-semibold uppercase">Panel Controls</p>
                <button onClick={() => { onOpenAllPanels(); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-sky-300 hover:bg-slate-700 transition flex items-center">
                    <i className="ri-layout-grid-fill mr-2"></i>Open All Panels
                </button>
                <button onClick={() => { onCloseAllPanels(); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-sky-300 hover:bg-slate-700 transition flex items-center">
                    <i className="ri-layout-masonry-line mr-2"></i>Close All Panels
                </button>
                <div className="my-1 border-t border-slate-700"></div>
                <p className="px-4 pt-2 pb-1 text-xs text-slate-500 font-semibold uppercase">System Controls</p>
                 <button 
                    onClick={() => { onToggleBugaMode(); setIsSystemMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition flex items-center
                    ${isBugaModeActive
                        ? 'text-lime-300 bg-lime-700/30 hover:bg-lime-600/40 animate-pulse-fast'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                    title={isBugaModeActive ? "Deactivate Buga Sphere Mode" : "Activate Buga Sphere Mode (Glyph Composer)"}
                  >
                    <i className={`mr-2 ${isBugaModeActive ? 'ri-test-tube-fill' : 'ri-test-tube-line'}`}></i>
                    {isBugaModeActive ? 'Deactivate Buga Mode' : 'Activate Buga Mode'}
                  </button>
                 <button 
                    onClick={() => { onToggleSigilOverlay(); setIsSystemMenuOpen(false); }} 
                    className={`w-full text-left px-4 py-2 text-sm transition flex items-center
                    ${showSigilOverlay
                        ? 'text-purple-300 bg-purple-700/30 hover:bg-purple-600/40 animate-pulse-fast' 
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                    title={showSigilOverlay ? "Deactivate Ceremonial Mode (Hide Sigil)" : "Activate Ceremonial Mode (Show Sigil)"}
                    >
                    <i className={`mr-2 ${showSigilOverlay ? 'ri-shield-star-fill' : 'ri-shield-star-line'}`}></i>
                    {showSigilOverlay ? 'Deactivate Ceremonial' : 'Activate Ceremonial'}
                </button>
                <button 
                    onClick={() => { onToggleAuditMode(); setIsSystemMenuOpen(false); }} 
                    className={`w-full text-left px-4 py-2 text-sm transition flex items-center
                    ${isAuditing && !isAuditModeLocked
                        ? 'text-cyan-300 bg-cyan-700/30 hover:bg-cyan-600/40 animate-pulse-fast' 
                        : (isAuditModeLocked ? 'text-slate-500 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700')
                    }`}
                    disabled={isAuditModeLocked}
                    title={isAuditModeLocked ? "Audit Mode locked by current Codex Mode" : (isAuditing ? "Disengage Recursive Audit" : "Engage Recursive Audit")}
                    >
                    <i className={`mr-2 ${isAuditing && !isAuditModeLocked ? 'ri-loop-left-line animate-spin-slow' : 'ri-search-eye-line'}`}></i>
                    {isAuditing && !isAuditModeLocked ? 'Disengage Audit' : 'Recursive Audit'}
                </button>
                <div className="my-1 border-t border-slate-700"></div>
                <p className="px-4 pt-2 pb-1 text-xs text-slate-500 font-semibold uppercase">Temporal Controls</p>
                <button onClick={() => { onInitiateShatterpointTrace(); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-rose-300 hover:bg-slate-700 transition flex items-center">
                  <i className="ri-focus-3-line mr-2"></i>Initiate Shatterpoint Trace
                </button>
                <button onClick={() => { onTraceThreadcoil(); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-purple-300 hover:bg-slate-700 transition flex items-center">
                  <i className="ri-route-line mr-2"></i>Trace Threadcoil
                </button>
                <button onClick={() => { onReEnterJunction(); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-purple-300 hover:bg-slate-700 transition flex items-center">
                  <i className="ri-repeat-one-line mr-2"></i>Re-enter Junction
                </button>
                <button onClick={() => { onExtractSigil(); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-pink-300 hover:bg-slate-700 transition flex items-center">
                  <i className="ri-fingerprint-2-line mr-2"></i>Extract Sigil
                </button>
                <button onClick={() => { onDumpThreadSummary(); setIsSystemMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition flex items-center">
                  <i className="ri-file-list-3-line mr-2"></i>Dump Thread Coil
                </button>
                <div className="my-1 border-t border-slate-700"></div>
                 <p className="px-4 pt-2 pb-1 text-xs text-slate-500 font-semibold uppercase">Visual Controls</p>
                <button onClick={() => { onToggleAshfall(); setIsSystemMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${showAshfall ? 'text-slate-300' : 'text-teal-300'} hover:bg-slate-700 transition flex items-center`}>
                  <i className={`mr-2 ${showAshfall ? 'ri-forbid-line' : 'ri-snowy-line'}`}></i>{showAshfall ? 'Disable Ashfall' : 'Enable Ashfall'}
                </button>
                <button onClick={() => { onToggleLogicWebDebug(); setIsSystemMenuOpen(false); }} className={`w-full text-left px-4 py-2 text-sm ${showLogicWebDebug ? 'text-orange-300' : 'text-lime-300'} hover:bg-slate-700 transition flex items-center`}>
                  <i className={`mr-2 ${showLogicWebDebug ? 'ri-bug-line' : 'ri-information-line'}`}></i>{showLogicWebDebug ? 'Disable Logic Debug' : 'Enable Logic Debug'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};