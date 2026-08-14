import React, { useRef, useState } from 'react';
import { PanelLayout, OrbMode, ParticleBackgroundMode } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CyberSynth } from '../lib/soundEffects';

interface GlobalControlHubProps {
  currentLayout: PanelLayout;
  onLayoutChange: (layout: PanelLayout) => void;
  onSynthesize: () => void;
  isSynthesizing: boolean;
  onSpawnOrbSystem?: () => void;
  masterPanelSize: number;
  nodeSpacing: number;
  nodeFlow: number;
  orbMode: OrbMode;
  particleMode: ParticleBackgroundMode;
  photoSources?: string[];
  panelOpacity?: number;
  workspaceMode?: '3d' | '2d';
  onWorkspaceModeChange?: (mode: '3d' | '2d') => void;
  torusFactor?: number;
  flowFactor?: number;
  gridFactor?: number;
  scanlineFactor?: number;
  onUpdateSettings: (settings: { 
    masterPanelSize?: number; 
    nodeSpacing?: number; 
    nodeFlow?: number;
    panelOpacity?: number;
    orbMode?: OrbMode;
    particleMode?: ParticleBackgroundMode;
    photoSources?: string[];
    torusFactor?: number;
    flowFactor?: number;
    gridFactor?: number;
    scanlineFactor?: number;
  }) => void;
  onCloseAllPanels: () => void;
  onOpenAllPanels: () => void;
}

export const GlobalControlHub: React.FC<GlobalControlHubProps> = ({
  currentLayout,
  onLayoutChange,
  onSynthesize,
  isSynthesizing,
  onSpawnOrbSystem,
  masterPanelSize,
  nodeSpacing,
  nodeFlow,
  panelOpacity,
  orbMode,
  particleMode,
  photoSources,
  workspaceMode = '3d',
  onWorkspaceModeChange,
  onUpdateSettings,
  onCloseAllPanels,
  onOpenAllPanels,
  torusFactor = 1.8,
  flowFactor = 4.0,
  gridFactor = 2.2,
  scanlineFactor = 0.12,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMuted, setIsMuted] = useState(CyberSynth.isMuted());

  const toggleSound = () => {
    const nextMuted = !isMuted;
    CyberSynth.setMuted(nextMuted);
    setIsMuted(nextMuted);
    if (!nextMuted) {
      CyberSynth.playClick();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Background media removed
  };

  return (
    <div className={`fixed bottom-20 md:bottom-4 right-4 z-[1200] flex flex-col-reverse items-end gap-2`}>
      <button
        onClick={() => {
          setIsCollapsed(!isCollapsed);
          CyberSynth.playClick();
        }}
        className="bg-black/80 backdrop-blur-md border border-cyan-500/30 p-2 md:p-3 rounded-full text-cyan-400 shadow-[0_0_15px_rgba(0,255,179,0.2)] hover:bg-cyan-500/10 transition-all"
        title={isCollapsed ? "Open Control Hub" : "Close Control Hub"}
      >
        <i className={`ri-settings-3-line text-lg md:text-xl ${!isCollapsed ? 'rotate-90' : ''} transition-transform duration-300`}></i>
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="border rounded-lg p-3 md:p-4 flex flex-col gap-3 md:gap-4 shadow-[0_0_15px_rgba(0,255,179,0.1)] w-[calc(100vw-32px)] md:w-64 max-h-[60vh] md:max-h-[80vh] overflow-y-auto scrollbar-hide"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${panelOpacity ?? 0.8})`,
              backdropFilter: `blur(${Math.max(4, (1.1 - (panelOpacity ?? 0.8)) * 20)}px)`,
              WebkitBackdropFilter: `blur(${Math.max(4, (1.1 - (panelOpacity ?? 0.8)) * 20)}px)`,
              borderColor: `rgba(6, 182, 212, ${Math.min(0.6, 0.2 + (1 - (panelOpacity ?? 0.8)) * 0.45)})`
            }}
          >
            <div 
              className="text-cyan-400 font-mono text-xs uppercase tracking-widest border-b border-cyan-500/30 pb-2 flex justify-between items-center sticky top-0 z-10 w-full"
              style={{
                backgroundColor: `rgba(0, 0, 0, ${Math.min(0.95, (panelOpacity ?? 0.8) * 1.1)})`
              }}
            >
              <span className="flex items-center gap-1.5">
                Global Control Hub
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`p-1 rounded hover:bg-cyan-500/10 text-[11px] flex items-center justify-center transition-colors cursor-pointer ${isMuted ? 'text-red-400' : 'text-cyan-400'}`}
                  title={isMuted ? "Unmute Sound" : "Mute Sound"}
                >
                  <i className={isMuted ? "ri-volume-mute-line" : "ri-volume-up-line"}></i>
                </button>
              </span>
              <i className="ri-settings-3-line animate-pulse-slow"></i>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="text-slate-400 font-mono text-[10px] uppercase">Lattice Engine</div>
              <div className="grid grid-cols-2 gap-1 bg-slate-900/50 border border-slate-700 p-0.5 rounded">
                <button
                  type="button"
                  onClick={() => onWorkspaceModeChange?.('3d')}
                  className={`py-1 text-[10px] font-mono rounded tracking-wider uppercase transition-all ${
                    workspaceMode === '3d'
                      ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  3D Matrix
                </button>
                <button
                  type="button"
                  onClick={() => onWorkspaceModeChange?.('2d')}
                  className={`py-1 text-[10px] font-mono rounded tracking-wider uppercase transition-all ${
                    workspaceMode === '2d'
                      ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Eco 2D
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-slate-400 font-mono text-[10px] uppercase">Projection Engine</div>
              <select 
                value={currentLayout}
                onChange={(e) => onLayoutChange(e.target.value as PanelLayout)}
                className="bg-slate-900/50 border border-slate-700 text-cyan-300 font-mono text-xs p-1 rounded outline-none focus:border-cyan-500 transition-colors w-full"
              >
                {Object.values(PanelLayout).map(layout => (
                  <option key={layout} value={layout}>{layout}</option>
                ))}
              </select>
            </div>

            {/* Visual Modes */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <div className="text-slate-400 font-mono text-[9px] uppercase">Orb Mode</div>
                <select 
                  value={orbMode}
                  onChange={(e) => onUpdateSettings({ orbMode: e.target.value as OrbMode })}
                  className="bg-slate-900/50 border border-slate-700 text-purple-300 font-mono text-[10px] p-1 rounded outline-none focus:border-purple-500 transition-colors w-full"
                >
                  {Object.values(OrbMode).map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-slate-400 font-mono text-[9px] uppercase">Particles</div>
                <select 
                  value={particleMode}
                  onChange={(e) => onUpdateSettings({ particleMode: e.target.value as ParticleBackgroundMode })}
                  className="bg-slate-900/50 border border-slate-700 text-emerald-300 font-mono text-[10px] p-1 rounded outline-none focus:border-emerald-500 transition-colors w-full"
                >
                  {Object.values(ParticleBackgroundMode).map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Panel Controls */}
            <div className="flex gap-2">
              <button 
                onClick={onOpenAllPanels}
                className="flex-1 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] py-1.5 rounded transition-all flex items-center justify-center gap-1"
              >
                <i className="ri-layout-grid-line"></i> Open All
              </button>
              <button 
                onClick={onCloseAllPanels}
                className="flex-1 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 font-mono text-[10px] py-1.5 rounded transition-all flex items-center justify-center gap-1"
              >
                <i className="ri-close-circle-line"></i> Close All
              </button>
            </div>

            {/* New Sliders */}
            <div className="flex flex-col gap-3 border-t border-slate-800 pt-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
                  <span>Master Panel Size</span>
                  <span className="text-purple-400">{(masterPanelSize || 1.0).toFixed(2)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="4" 
                  step="0.1"
                  value={masterPanelSize}
                  onChange={(e) => onUpdateSettings({ masterPanelSize: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 bg-slate-800 h-1 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {orbMode === OrbMode.PhotoGallery && (
                <div className="flex flex-col gap-2 border-t border-slate-800 pt-2">
                  <div className="text-slate-400 font-mono text-[9px] uppercase">Photo Gallery Nodes</div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = 'image/*';
                        input.onchange = (e: any) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const urls = Array.from(e.target.files).map(f => URL.createObjectURL(f as File));
                            onUpdateSettings({ photoSources: [...(photoSources || []), ...urls] });
                          }
                        };
                        input.click();
                      }}
                      className="flex-1 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-400 font-mono text-[9px] py-1 rounded transition-all flex items-center justify-center gap-1"
                    >
                      <i className="ri-image-add-line"></i> Add Photos
                    </button>
                    {photoSources && photoSources.length > 0 && (
                      <button 
                        onClick={() => onUpdateSettings({ photoSources: [] })}
                        className="bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 font-mono text-[9px] px-2 rounded transition-all"
                        title="Clear Photos"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    )}
                  </div>
                  {photoSources && photoSources.length > 0 && (
                    <div className="text-[8px] font-mono text-slate-500 italic">
                      {photoSources.length} photos active
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
                  <span>Node Spacing</span>
                  <span className="text-emerald-400">{(nodeSpacing || 1.0).toFixed(2)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="3" 
                  step="0.1"
                  value={nodeSpacing}
                  onChange={(e) => onUpdateSettings({ nodeSpacing: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 bg-slate-800 h-1 rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
                  <span>Panel Opacity</span>
                  <span className="text-cyan-400">{(panelOpacity || 0.8).toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.05"
                  value={panelOpacity}
                  onChange={(e) => onUpdateSettings({ panelOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 bg-slate-800 h-1 rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
                  <span>Node Flow</span>
                  <span className="text-orange-400">{(nodeFlow || 0.5).toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="0.1"
                  value={nodeFlow}
                  onChange={(e) => onUpdateSettings({ nodeFlow: parseFloat(e.target.value) })}
                  className="w-full accent-orange-500 bg-slate-800 h-1 rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-800/60 pt-2.5">
                <div className="text-cyan-400 font-mono text-[9px] uppercase tracking-wide">Toroidal Field Tuning</div>
                
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase">
                    <span>Torus Core Intensity</span>
                    <span className="text-cyan-400">{(torusFactor).toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="5" 
                    step="0.1"
                    value={torusFactor}
                    onChange={(e) => {
                      onUpdateSettings({ torusFactor: parseFloat(e.target.value) });
                      CyberSynth.playClick();
                    }}
                    className="w-full accent-cyan-400 bg-slate-800 h-0.5 rounded-full appearance-none cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase">
                    <span>Swirl Flow Strength</span>
                    <span className="text-purple-400">{(flowFactor).toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    step="0.2"
                    value={flowFactor}
                    onChange={(e) => {
                      onUpdateSettings({ flowFactor: parseFloat(e.target.value) });
                      CyberSynth.playClick();
                    }}
                    className="w-full accent-purple-400 bg-slate-800 h-0.5 rounded-full appearance-none cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase">
                    <span>Holo coordinate Grid</span>
                    <span className="text-emerald-400">{(gridFactor).toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="6" 
                    step="0.1"
                    value={gridFactor}
                    onChange={(e) => {
                      onUpdateSettings({ gridFactor: parseFloat(e.target.value) });
                      CyberSynth.playClick();
                    }}
                    className="w-full accent-emerald-400 bg-slate-800 h-0.5 rounded-full appearance-none cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase">
                    <span>Cyber Scanlines</span>
                    <span className="text-pink-400">{(scanlineFactor * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.05"
                    value={scanlineFactor}
                    onChange={(e) => {
                      onUpdateSettings({ scanlineFactor: parseFloat(e.target.value) });
                      CyberSynth.playClick();
                    }}
                    className="w-full accent-pink-400 bg-slate-800 h-0.5 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={onSynthesize}
                disabled={isSynthesizing}
                className="bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-500/50 text-cyan-300 font-mono text-xs py-2 px-4 rounded transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSynthesizing ? (
                  <><i className="ri-loader-4-line animate-spin"></i> Synthesizing...</>
                ) : (
                  <><i className="ri-brain-line"></i> Intelligence Synthesis</>
                )}
              </button>

              {onSpawnOrbSystem && (
                <button
                  onClick={onSpawnOrbSystem}
                  className="bg-purple-900/30 hover:bg-purple-800/50 border border-purple-500/50 text-purple-300 font-mono text-xs py-2 px-4 rounded transition-all flex items-center justify-center gap-2"
                >
                  <i className="ri-add-circle-line"></i> Spawn Orb System
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
