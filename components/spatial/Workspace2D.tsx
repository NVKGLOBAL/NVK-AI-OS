import React, { useState, useEffect } from 'react';
import { 
  Terminal, Sparkles, Sliders, Layers, RefreshCw, Activity, Check, 
  Settings, Zap, Maximize2, Monitor, Eye, EyeOff, Layout, Type, Palette, Save, Play, RefreshCcw
} from 'lucide-react';
import { Cluster, PanelDefinition } from '../../types';
import { GlassmorphismSlider } from '../ui/GlassmorphismSlider';

interface Workspace2DProps {
  activeCluster: Cluster;
  updateActiveCluster: (settings: Partial<Cluster>) => void;
  active2dNodeId: string | null;
  setActive2dNodeId: (id: string | null) => void;
  handlePanelNodeClick: (id: string) => void;
  handleSwapPanel: (id: string) => void;
  handlePinPanel: (id: string) => void;
  getPanelContent: (id: string) => React.ReactNode;
  PANEL_DEFINITIONS: PanelDefinition[];
  setWorkspaceMode: (mode: '3d' | '2d') => void;
  workspaceMode: '3d' | '2d';
}

interface WorkspaceConfig {
  lowLagMode: boolean;
  theme: 'emerald' | 'cyan' | 'amber' | 'amethyst' | 'crimson' | 'cyberpunk' | 'monochrome';
  layoutType: 'tab' | 'grid' | 'stack' | 'single';
  showOrb: boolean;
  compactMode: boolean;
  customTitle: string;
  panelOpacity: number;
  bgWallpaper: 'grid' | 'dots' | 'carbon' | 'matrix' | 'eco';
  columnCount: number;
}

export const Workspace2D: React.FC<Workspace2DProps> = ({
  activeCluster,
  updateActiveCluster,
  active2dNodeId,
  setActive2dNodeId,
  handlePanelNodeClick,
  handleSwapPanel,
  handlePinPanel,
  getPanelContent,
  PANEL_DEFINITIONS,
  setWorkspaceMode,
  workspaceMode
}) => {
  // Load config from localStorage if present
  const [config, setConfig] = useState<WorkspaceConfig>(() => {
    const defaults: WorkspaceConfig = {
      lowLagMode: false,
      theme: 'emerald',
      layoutType: 'tab',
      showOrb: true,
      compactMode: false,
      customTitle: 'NVK OS ECO-LATTICE',
      panelOpacity: 0.90,
      bgWallpaper: 'grid',
      columnCount: 2
    };

    try {
      const saved = localStorage.getItem('nvk_2d_workspace_config');
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("Storage restricted or unreadable:", e);
    }
    return defaults;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(config.customTitle);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [isEditingTitleInline, setIsEditingTitleInline] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpenOnMobile, setIsMenuOpenOnMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-persist setup changes
  const updateConfig = (newSettings: Partial<WorkspaceConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...newSettings };
      try {
        localStorage.setItem('nvk_2d_workspace_config', JSON.stringify(next));
      } catch (e) {
        // Safe fail
      }
      return next;
    });
  };

  // Trigger alert messages
  const showAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 3000);
  };

  // Theme styling helpers
  const themeClasses = {
    emerald: {
      accent: 'emerald',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      borderActive: 'border-emerald-500/80',
      bgActive: 'bg-emerald-950/20',
      shadow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      glowRing: 'shadow-[0_0_30px_#10b981]',
      gradient: 'from-emerald-600 via-green-400 to-emerald-500',
    },
    cyan: {
      accent: 'cyan',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      borderActive: 'border-cyan-500/80',
      bgActive: 'bg-cyan-950/20',
      shadow: 'shadow-[0_0_12px_rgba(6,182,212,0.25)]',
      glowRing: 'shadow-[0_0_30px_#06b6d4]',
      gradient: 'from-cyan-600 via-sky-400 to-cyan-500',
    },
    amber: {
      accent: 'amber',
      text: 'text-amber-500',
      border: 'border-amber-500/30',
      borderActive: 'border-amber-500/80',
      bgActive: 'bg-amber-950/20',
      shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      glowRing: 'shadow-[0_0_30px_#f59e0b]',
      gradient: 'from-amber-600 via-yellow-400 to-amber-500',
    },
    amethyst: {
      accent: 'purple',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      borderActive: 'border-purple-500/80',
      bgActive: 'bg-purple-950/20',
      shadow: 'shadow-[0_0_12px_rgba(168,85,247,0.25)]',
      glowRing: 'shadow-[0_0_30px_#a855f7]',
      gradient: 'from-purple-600 via-fuchsia-400 to-purple-500',
    },
    crimson: {
      accent: 'red',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      borderActive: 'border-rose-500/80',
      bgActive: 'bg-rose-950/20',
      shadow: 'shadow-[0_0_12px_rgba(244,63,94,0.25)]',
      glowRing: 'shadow-[0_0_30px_#f43f5e]',
      gradient: 'from-rose-600 via-red-400 to-rose-500',
    },
    cyberpunk: {
      accent: 'pink',
      text: 'text-pink-400',
      border: 'border-pink-500/30',
      borderActive: 'border-cyan-400',
      bgActive: 'bg-pink-950/20',
      shadow: 'shadow-[0_0_12px_rgba(236,72,153,0.3)]',
      glowRing: 'shadow-[0_0_30px_#ec4899]',
      gradient: 'from-pink-600 via-fuchsia-400 to-cyan-500',
    },
    monochrome: {
      accent: 'slate',
      text: 'text-slate-200',
      border: 'border-slate-800/80',
      borderActive: 'border-slate-200',
      bgActive: 'bg-slate-900/50',
      shadow: 'shadow-[0_0_12px_rgba(241,245,249,0.1)]',
      glowRing: 'shadow-[0_0_20px_#f1f5f9]',
      gradient: 'from-slate-700 via-slate-500 to-slate-400',
    }
  }[config.theme];

  const currentTheme = config.theme;

  // Fall back to clean tabbed layout on mobile devices instead of cramming vertical grids
  const effectiveLayoutType = isMobile 
    ? (config.layoutType === 'grid' || config.layoutType === 'stack' ? 'tab' : config.layoutType) 
    : config.layoutType;

  // Selected Node logic
  const selectedNodeId = activeCluster.openNodeIds.includes(active2dNodeId || '') 
    ? active2dNodeId! 
    : activeCluster.openNodeIds[0];

  const currentActiveNode = activeCluster.nodes.find(n => n.id === selectedNodeId);

  // Generate high-performance dynamic customizable translucent card styles
  const getCardStyle = (nodeId?: string) => {
    if (config.lowLagMode) return {};
    
    // Resolve RGB color channels for color styling borders safely
    const rgbColors: Record<string, string> = {
      emerald: '16, 185, 129',
      cyan: '6, 182, 212',
      amber: '245, 158, 11',
      amethyst: '168, 85, 247',
      crimson: '244, 63, 94',
      cyberpunk: '236, 72, 153',
      monochrome: '148, 163, 184'
    };
    
    const colorVal = rgbColors[config.theme] || '16, 185, 129';
    let bgOpacity = activeCluster.panelOpacity ?? config.panelOpacity ?? 0.80;
    if (nodeId && activeCluster.panelOpacities && activeCluster.panelOpacities[nodeId] !== undefined) {
      bgOpacity = activeCluster.panelOpacities[nodeId];
    }
    const blurPx = Math.max(2, (1.1 - bgOpacity) * 16);
    
    return {
      backgroundColor: `rgba(2, 6, 23, ${bgOpacity})`,
      backdropFilter: `blur(${blurPx}px)`,
      WebkitBackdropFilter: `blur(${blurPx}px)`,
      borderColor: `rgba(${colorVal}, 0.25)`
    };
  };

  return (
    <div 
      className={`absolute inset-0 bg-slate-950 overflow-hidden flex flex-col select-none z-10 transition-colors duration-300 ${
        config.compactMode ? 'text-[11px]' : 'text-xs'
      }`}
    >
      {/* Dynamic Customizable Wallpaper Overlay Backing */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.09] transition-all duration-500">
        {config.bgWallpaper === 'grid' && (
          <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
        )}
        {config.bgWallpaper === 'dots' && (
          <div className="w-full h-full bg-[radial-gradient(rgba(255,255,255,0.12)_1.5px,transparent_1.5px)] bg-[size:24px_24px]" />
        )}
        {config.bgWallpaper === 'carbon' && (
          <div className="w-full h-full bg-[linear-gradient(45deg,#000_25%,transparent_25%),linear-gradient(-45deg,#000_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#000_75%),linear-gradient(-45deg,transparent_75%,#000_75%)] bg-[size:10px_10px]" />
        )}
        {config.bgWallpaper === 'matrix' && (
          <div className="w-full h-full bg-[linear-gradient(rgba(16,185,129,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.12)_1px,transparent_1px)] bg-[size:20px_20px] after:content-['0110101_NVK_OS_LATTICE_ACTIVE_SYSSTATE_LOAD_OK'] after:absolute after:bottom-4 after:right-4 after:font-mono after:text-[7px] after:text-emerald-500/20" />
        )}
        {config.bgWallpaper === 'eco' && (
          <div className="w-full h-full bg-slate-950" />
        )}
      </div>

      {/* Alert Notification */}
      {alertMsg && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[5000] bg-slate-900 border border-cyan-500 px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.4)] text-[9px] font-mono uppercase text-cyan-400 flex items-center gap-2">
          <Zap className="w-3 h-3 animate-bounce" /> {alertMsg}
        </div>
      )}

      {/* Main Bar / Header */}
      <div 
        className={`flex justify-between items-center bg-black/95 px-4 h-12 shrink-0 z-[1100] border-b ${
          config.lowLagMode ? 'border-slate-800' : themeClasses.border
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full bg-${themeClasses.accent}-500 ${config.lowLagMode ? '' : 'animate-pulse'} ${config.lowLagMode ? '' : themeClasses.shadow}`} />
          {isEditingTitleInline ? (
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={() => {
                setIsEditingTitleInline(false);
                const titleVal = editingTitle.trim() || 'NVK OS ECO-LATTICE';
                setEditingTitle(titleVal);
                updateConfig({ customTitle: titleVal });
                showAlert("Workspace Title Updated");
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingTitleInline(false);
                  const titleVal = editingTitle.trim() || 'NVK OS ECO-LATTICE';
                  setEditingTitle(titleVal);
                  updateConfig({ customTitle: titleVal });
                  showAlert("Workspace Title Updated");
                } else if (e.key === 'Escape') {
                  setEditingTitle(config.customTitle);
                  setIsEditingTitleInline(false);
                }
              }}
              className="bg-slate-900 border border-cyan-500/50 text-cyan-300 font-mono text-[10px] md:text-xs rounded px-2 py-0.5 outline-none max-w-[150px] sm:max-w-[200px]"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[10px] md:text-xs font-semibold uppercase tracking-widest ${themeClasses.text}`}>
                {config.customTitle} // SAFE WORKSPACE
              </span>
              <button 
                onClick={() => {
                  setIsEditingTitleInline(true);
                }}
                className="p-1 text-slate-500 hover:text-white transition-all text-[10px] cursor-pointer"
                title="Edit Title"
              >
                <i className="ri-pencil-line"></i>
              </button>
            </div>
          )}
        </div>
        
        {/* Quick Customizer buttons and Mode Toggles */}
        <div className="flex items-center gap-2.5">
          {/* Quick theme circles inside header */}
          <div className="hidden sm:flex items-center gap-1.5 border-r border-white/5 pr-3 mr-2">
            {(['emerald', 'cyan', 'amber', 'amethyst', 'crimson', 'cyberpunk', 'monochrome'] as const).map(t => (
              <button
                key={t}
                onClick={() => {
                  updateConfig({ theme: t });
                  showAlert(`Theme set to ${t.toUpperCase()}`);
                }}
                className={`w-3 h-3 rounded-full border transition-all ${
                  t === 'emerald' ? 'bg-emerald-500 border-emerald-400' :
                  t === 'cyan' ? 'bg-cyan-500 border-cyan-400' :
                  t === 'amber' ? 'bg-amber-500 border-amber-300' :
                  t === 'amethyst' ? 'bg-purple-500 border-purple-400' :
                  t === 'crimson' ? 'bg-rose-500 border-rose-400' :
                  t === 'cyberpunk' ? 'bg-pink-500 border-pink-400' :
                  'bg-slate-300 border-slate-200'
                } ${config.theme === t ? 'scale-125 ring-2 ring-white/50' : 'opacity-60 hover:opacity-100'}`}
                title={`Swap theme color to ${t}`}
              />
            ))}
          </div>

          {/* Quick Performance Toggle Icon */}
          <button
            onClick={() => {
              const lag = !config.lowLagMode;
              updateConfig({ lowLagMode: lag });
              showAlert(lag ? "Low Lag Mode: ACTIVE (Disabled Heavy Animations/Blurs)" : "Low Lag Mode: INACTIVE (Full Quality)");
            }}
            className={`px-2 py-1 rounded border font-mono text-[8.5px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
              config.lowLagMode 
                ? 'bg-amber-950/50 border-amber-500/50 text-amber-400 animate-pulse' 
                : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
            }`}
            title="Toggle Low Lag Ultra High Frame Rate Economy Rendering"
          >
            <Zap className="w-3 h-3" />
            <span className="hidden md:inline">{config.lowLagMode ? "Lag-Free ON" : "Lag-Free OFF"}</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          {isMobile && (
            <button
              onClick={() => setIsMenuOpenOnMobile(!isMenuOpenOnMobile)}
              className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1 border ${
                isMenuOpenOnMobile 
                  ? 'bg-emerald-500/15 border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold' 
                  : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:text-white'
              }`}
              title="Toggle Subsystem Menu"
            >
              <Layout className="w-4 h-4" />
              <span className="text-[9px] font-mono leading-none">DIRECTORY</span>
            </button>
          )}

          {/* Configuration Menu Toggle */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded transition-all cursor-pointer ${
              isSettingsOpen ? 'bg-slate-800 text-white border border-cyan-400/40' : 'text-slate-400 hover:text-white'
            }`}
            title="Desk Preferences & Layout Panel"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Switch matrix mode button */}
          <button
            onClick={() => {
              setWorkspaceMode('3d');
              showAlert("Powering Up 3D WebGL Matrix...");
            }}
            className={`px-3 py-1 font-mono text-[9px] uppercase font-bold rounded tracking-widest transition-all cursor-pointer border ${themeClasses.text} ${themeClasses.border} hover:bg-white/5`}
          >
            Activate 3D Matrix
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-grow w-full overflow-hidden flex flex-col md:flex-row gap-3 p-3 min-h-0 relative">
        
        {/* Scrim Backdrop for mobile subsystems menu */}
        {isMobile && isMenuOpenOnMobile && (
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[1400] transition-opacity duration-300 cursor-pointer"
            onClick={() => setIsMenuOpenOnMobile(false)}
          />
        )}
        
        {/* PREFERENCES PANEL SLIDEOUT (Drawer OVER overlay) */}
        {isSettingsOpen && (
          <div className="absolute top-3 right-3 bottom-3 w-[calc(100%-24px)] sm:w-72 bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 z-[2000] p-4 flex flex-col gap-4 shadow-2xl overflow-y-auto animate-fade-in">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 animate-fade-in">
              <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> Customize 2D Desk
              </span>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-500 hover:text-white text-xs font-mono cursor-pointer"
              >
                CLOSE
              </button>
            </div>

            {/* Performance Controls */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase">LAG-FREE PROFILE</span>
              <div 
                className={`p-2.5 rounded-lg border cursor-pointer hover:bg-slate-800/40 transition-all ${
                  config.lowLagMode ? 'border-amber-500/50 bg-amber-950/10 shadow-[0_0_8px_rgba(245,158,11,0.15)]' : 'border-white/5'
                }`}
                onClick={() => {
                  updateConfig({ lowLagMode: !config.lowLagMode });
                  showAlert(!config.lowLagMode ? "Lag-Free ON (Maximum Processing Economy)" : "Lag-Free OFF (Standard Assets)");
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-white font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> ULTRA-LOW LAG
                  </span>
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${config.lowLagMode ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-700'}`}>
                    {config.lowLagMode && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                  </div>
                </div>
                <p className="text-[8.5px] text-slate-400 leading-normal font-mono">
                  Deactivates coordinate glow, particle clusters, vector orbit loops, and active blur filtering to yield absolute maximum frame-rate.
                </p>
              </div>
            </div>

            {/* Themes presets */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1"><Palette className="w-3 h-3" /> System Visual Color theme</span>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/40 border border-white/5 rounded-lg">
                {(['emerald', 'cyan', 'amber', 'amethyst', 'crimson', 'cyberpunk', 'monochrome'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => updateConfig({ theme: t })}
                    className={`py-1 font-mono text-[8.5px] uppercase font-bold rounded border text-center transition-all ${
                      config.theme === t 
                        ? 'bg-slate-850 text-white border-white font-bold' 
                        : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {t === 'cyberpunk' ? 'CYBER' : t === 'monochrome' ? 'MONO' : t.slice(0,4).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallpaper Selection */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1"><Layers className="w-3 h-3" /> Canvas Wallpaper Backing</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/40 border border-white/5 rounded-lg">
                {[
                  { id: 'grid', label: 'GRAPH' },
                  { id: 'dots', label: 'DOTS' },
                  { id: 'carbon', label: 'WEAVE' },
                  { id: 'matrix', label: 'CODE' },
                  { id: 'eco', label: 'SOLID' }
                ].map(wp => (
                  <button
                    key={wp.id}
                    onClick={() => {
                      updateConfig({ bgWallpaper: wp.id as any });
                      showAlert(`Wallpaper backing set to ${wp.label}`);
                    }}
                    className={`py-1 font-mono text-[8px] uppercase rounded border transition-all ${
                      config.bgWallpaper === wp.id
                        ? 'bg-slate-850 text-white border-white font-bold'
                        : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {wp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="flex flex-col gap-1.5 p-1.5 bg-slate-950/20 border border-white/5 rounded-lg">
              <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
                <span>Panel glass opacity</span>
                <span className="text-cyan-400">{(activeCluster.panelOpacity ?? config.panelOpacity ?? 0.8).toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0.10" 
                max="1.00" 
                step="0.05"
                value={activeCluster.panelOpacity ?? config.panelOpacity ?? 0.8}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateConfig({ panelOpacity: val });
                  updateActiveCluster({ panelOpacity: val });
                }}
                className="w-full accent-cyan-500 bg-slate-950 h-1.5 rounded-full appearance-none cursor-pointer"
              />
            </div>

            {/* Layout Options */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1"><Layout className="w-3 h-3" /> Layout Deck mode</span>
              <div className="grid grid-cols-4 gap-1 bg-slate-950 p-0.5 rounded border border-white/5">
                {[
                  { id: 'tab', label: 'TAB' },
                  { id: 'grid', label: 'GRID' },
                  { id: 'stack', label: 'STACK' },
                  { id: 'single', label: 'SINGLE' }
                ].map(l => (
                  <button
                    key={l.id}
                    onClick={() => {
                      updateConfig({ layoutType: l.id as any });
                      showAlert(`Layout deck mode set: ${l.label.toUpperCase()}`);
                    }}
                    className={`py-1 font-mono text-[8.5px] uppercase rounded transition-all ${
                      config.layoutType === l.id 
                        ? 'bg-slate-800 text-white font-bold' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <p className="text-[8px] text-slate-400 font-mono italic leading-snug">
                {config.layoutType === 'grid' && "Provides horizontal multi-column side-by-side diagnostic cards."}
                {config.layoutType === 'tab' && "Standard tabbed sheets focusing on a single active subsystem."}
                {config.layoutType === 'stack' && "A vertically stacked diagnostic log frame."}
                {config.layoutType === 'single' && "Maximizes focused diagnostic panel to 100% space."}
              </p>
            </div>

            {/* Grid Columns option (only visible if layoutType is grid) */}
            {config.layoutType === 'grid' && (
              <div className="flex flex-col gap-1.5 border-t border-white/5 pt-1.5">
                <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1">Grid Split Columns</span>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-0.5 rounded border border-white/5">
                  {[1, 2, 3].map(cols => (
                    <button
                      key={cols}
                      onClick={() => {
                        updateConfig({ columnCount: cols });
                        showAlert(`Grid configured to show ${cols} column(s)`);
                      }}
                      className={`py-0.5 font-mono text-[8.5px] rounded transition-all ${
                        (config.columnCount ?? 2) === cols
                          ? 'bg-slate-850 text-white font-bold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {cols} COL
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Font scaling */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1"><Type className="w-3 h-3" /> Screen Font density</span>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-300 uppercase">Micro Compact Layout</span>
                <input 
                  type="checkbox"
                  checked={config.compactMode}
                  onChange={(e) => updateConfig({ compactMode: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500"
                />
              </div>
            </div>

            {/* Spinning vector core toggle */}
            <div className="flex flex-col gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1"><Monitor className="w-3 h-3" /> Vector Core View</span>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-300 uppercase">Show 2D Core Orb</span>
                <input 
                  type="checkbox"
                  checked={config.showOrb}
                  onChange={(e) => updateConfig({ showOrb: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500"
                />
              </div>
            </div>

            {/* Save Status / confirmation button */}
            <button
              onClick={() => {
                setIsSettingsOpen(false);
                showAlert("Configurations Loaded & Saved");
              }}
              className="mt-auto py-2 bg-slate-800 hover:bg-slate-700 border border-white/15 rounded text-[10px] font-mono uppercase text-white font-semibold transition-all cursor-pointer"
            >
              Apply Grid Schema
            </button>
          </div>
        )}

        {/* Left column: Lattice Subsystems Directory */}
        <div 
          className={
            isMobile
              ? `absolute left-3 top-14 bottom-3 z-[1500] w-[280px] flex flex-col border rounded-xl select-none p-4 gap-3 ${
                  config.lowLagMode ? 'border-slate-800 bg-slate-950' : 'border-slate-900 bg-slate-950/95 backdrop-blur-xl shadow-[0_0_35px_rgba(0,0,0,0.8)]'
                } transition-all duration-350 overflow-y-auto custom-scrollbar ${
                  isMenuOpenOnMobile 
                    ? 'translate-x-0 opacity-100' 
                    : '-translate-x-[115%] opacity-0 pointer-events-none'
                }`
              : `hidden md:flex w-[320px] shrink-0 flex-col border rounded-xl select-none p-3 gap-3 ${
                  config.lowLagMode ? 'border-slate-800 bg-slate-950' : 'border-slate-900 bg-slate-950/80 backdrop-blur'
                } md:max-h-full overflow-y-auto custom-scrollbar`
          }
        >
          {/* Spinning 2D Green Vector Core orb */}
          {config.showOrb && (
            <div className={`flex flex-col items-center justify-center p-4 rounded-lg bg-black/55 border select-none ${config.lowLagMode ? 'border-slate-900' : 'border-slate-900/60'}`}>
              <div className="relative w-24 h-24 flex items-center justify-center select-none">
                {/* Ping rings - disabled if in lowLagMode to save massive GPU layout cycles */}
                {!config.lowLagMode && (
                  <>
                    <div className={`absolute inset-0 rounded-full border border-${themeClasses.accent}-500/10 animate-ping`} style={{ animationDuration: '3.5s' }} />
                    <div className="absolute inset-2.5 rounded-full border border-dashed border-cyan-500/10 animate-spin" style={{ animationDuration: '24s' }} />
                    <div className="absolute inset-4 rounded-full border border-purple-500/10 animate-pulse" style={{ animationDuration: '1.2s' }} />
                  </>
                )}
                {/* Glowing core pulsing central circle */}
                <div 
                  className={`absolute inset-5.5 rounded-full bg-gradient-to-tr ${themeClasses.gradient} flex flex-col items-center justify-center border border-white/40 cursor-pointer group active:scale-95 transition-all duration-300 ${
                    config.lowLagMode ? '' : themeClasses.glowRing + ' animate-pulse'
                  }`}
                >
                  <i className="ri-shield-flash-line text-slate-950 text-base group-hover:scale-110 transition-transform"></i>
                  <span className="text-[6.5px] font-bold tracking-widest text-slate-950 font-mono leading-none mt-1">NVK CORE</span>
                </div>
              </div>
              
              <div className={`text-[9px] font-mono uppercase tracking-widest mt-3 flex items-center gap-1.5 leading-none ${themeClasses.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full bg-${themeClasses.accent}-400 inline-block ${config.lowLagMode ? '' : 'animate-pulse'}`} />
                {activeCluster.name}
              </div>
              {activeCluster.layout && (
                <div className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                  Cluster Mode: {activeCluster.layout}
                </div>
              )}
            </div>
          )}
          
          {/* List of sub-agent nodes for toggle */}
          <div className="flex flex-col gap-2">
            <div className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-1 px-1">Lattice Subsystems</div>
            <div className="flex flex-col gap-1.5">
              {activeCluster.nodes.map(node => {
                const isOpen = activeCluster.openNodeIds.includes(node.id);
                const panelIdBase = node.panelId.split('::')[0];
                const panelDef = PANEL_DEFINITIONS.find(p => p.id === panelIdBase);
                const iconClass = panelDef?.icon || 'ri-cpu-line';
                
                return (
                  <button
                    key={node.id}
                    onClick={() => {
                      handlePanelNodeClick(node.id);
                      if (isMobile) {
                        setIsMenuOpenOnMobile(false);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all text-left group cursor-pointer ${
                      isOpen 
                        ? `bg-${themeClasses.accent}-950/20 ${themeClasses.borderActive} ${themeClasses.text} ${config.lowLagMode ? '' : themeClasses.shadow}`
                        : 'bg-slate-900/40 border-slate-900/80 text-slate-400 border-transparent hover:border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                        isOpen ? `bg-${themeClasses.accent}-500/20 ${themeClasses.text}` : 'bg-slate-800/50 text-slate-400'
                      }`}>
                        <i className={`${iconClass} text-xs`}></i>
                      </div>
                      <div className="flex flex-col leading-none">
                        <span className="text-[10px] font-mono tracking-wide font-medium">{node.label}</span>
                        <span className="text-[7.5px] font-mono text-slate-600 uppercase mt-0.5">{panelDef?.category || 'Utility'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? `bg-${themeClasses.accent}-400` : 'bg-slate-800'}`}></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right workspace view (Interactive customizable panel container) */}
        <div 
          className={`flex-grow h-full min-h-0 flex flex-col overflow-hidden border rounded-xl relative p-2 md:p-3 ${
            config.lowLagMode ? 'border-slate-800 bg-slate-950' : 'border-slate-900 bg-slate-950/30'
          }`}
        >
          {activeCluster.openNodeIds.length === 0 ? (
            /* Subsystems empty state */
            <div className="flex-grow w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-950/50 rounded-lg border border-slate-900/65">
              <div className={`w-12 h-12 rounded-full border border-dashed flex items-center justify-center animate-spin mb-3 ${themeClasses.border} ${themeClasses.text}`}>
                <i className="ri-donut-chart-line text-lg animate-pulse" />
              </div>
              <h4 className="text-xs font-mono uppercase text-slate-300 tracking-widest leading-none">All Subsystems Suspended</h4>
              <p className="text-[8.5px] font-mono text-slate-500 max-w-xs mt-2 leading-relaxed">
                Click on the circular items in the Lattice Subsystems menu on the left back-panel to instantiate active diagnostic nodes.
              </p>
            </div>
          ) : effectiveLayoutType === 'grid' ? (
            /* DYNAMIC SIDE-BY-SIDE SPLIT GRID VIEW (Extremely customizable low-lag arrangement!) */
            <div className="flex-grow w-full overflow-hidden flex flex-col md:flex-row gap-3 min-h-0">
              {activeCluster.openNodeIds.slice(0, config.columnCount ?? 2).map((nodeId, idx) => {
                const node = activeCluster.nodes.find(n => n.id === nodeId);
                const panelIdBase = node?.panelId.split('::')[0];
                const panelDef = PANEL_DEFINITIONS.find(p => p.id === panelIdBase);
                if (!node) return null;

                return (
                  <div 
                    key={nodeId} 
                    className="flex-1 overflow-hidden flex flex-col rounded-xl border transition-all duration-300"
                    style={getCardStyle(nodeId)}
                  >
                    {/* Panel Header */}
                    <div className="flex justify-between items-center bg-slate-900/60 border-b border-slate-950 px-3 py-1.5 select-none shrink-0">
                      <div className="flex items-center gap-2">
                        <i className={`${panelDef?.icon || 'ri-cpu-line'} text-xs ${themeClasses.text}`}></i>
                        <span className="font-mono text-[9px] uppercase text-slate-200 tracking-widest">{node.label}</span>
                        <span className="text-[7px] font-mono text-slate-600 bg-slate-950 px-1 py-0.5 rounded leading-none">SPLIT-GRID #{idx+1}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <GlassmorphismSlider 
                          opacity={activeCluster.panelOpacities?.[nodeId] ?? activeCluster.panelOpacity ?? 0.8}
                          onChange={(val) => {
                            const newOpacities = {
                              ...(activeCluster.panelOpacities || {}),
                              [nodeId]: val
                            };
                            updateActiveCluster({ panelOpacities: newOpacities });
                          }}
                          align="right"
                        />
                        <button
                          onClick={() => handleSwapPanel(nodeId)}
                          title="Swap Panel Content"
                          className="text-slate-500 hover:text-emerald-400 cursor-pointer"
                        >
                          <i className="ri-swap-line text-[10px]"></i>
                        </button>
                        <button
                          onClick={() => updateActiveCluster({ openNodeIds: activeCluster.openNodeIds.filter(pid => pid !== nodeId) })}
                          className="w-5 h-5 rounded-full bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-400/80 flex items-center justify-center shadow-[0_0_6px_rgba(244,63,94,0.4)] transition-all font-bold shrink-0 ml-1 cursor-pointer"
                          title="Close Subsystem"
                        >
                          <i className="ri-close-line text-xs font-bold"></i>
                        </button>
                      </div>
                    </div>
                    {/* Content Area */}
                    <div 
                      style={{ opacity: activeCluster.panelOpacities?.[nodeId] ?? activeCluster.panelOpacity ?? 0.8 }}
                      className="flex-grow overflow-y-auto p-3 custom-scrollbar bg-slate-950/40 relative min-h-0 text-slate-300"
                    >
                      {getPanelContent(nodeId)}
                    </div>
                  </div>
                );
              })}
              {/* Grid cap indicator */}
              {activeCluster.openNodeIds.length > (config.columnCount ?? 2) && (
                <div className="p-2 border border-dashed border-white/5 rounded-xl bg-slate-900/20 text-center font-mono text-[8px] text-slate-500 flex flex-col justify-center items-center gap-1 shrink-0 md:w-20">
                  <span>+{activeCluster.openNodeIds.length - (config.columnCount ?? 2)} MORE</span>
                  <button 
                    onClick={() => updateConfig({ layoutType: 'tab' })}
                    className="px-1.5 py-0.5 bg-slate-800 text-slate-400 hover:text-white rounded cursor-pointer transition-colors"
                  >
                    TAB VIEW
                  </button>
                </div>
              )}
            </div>
          ) : effectiveLayoutType === 'single' ? (
            /* MAXIMIZED SINGLE VIEW */
            (() => {
              const nodeId = selectedNodeId || activeCluster.openNodeIds[0];
              const node = activeCluster.nodes.find(n => n.id === nodeId);
              const panelIdBase = node?.panelId.split('::')[0];
              const panelDef = PANEL_DEFINITIONS.find(p => p.id === panelIdBase);
              if (!node) return null;

            return (
              <div 
                className="flex-grow w-full overflow-hidden flex flex-col rounded-xl border transition-all duration-300"
                style={getCardStyle(nodeId)}
              >
                {/* Panel Header */}
                <div className="flex justify-between items-center bg-slate-900/60 border-b border-slate-950 px-3 py-1.5 select-none shrink-0">
                  <div className="flex items-center gap-2">
                    <i className={`${panelDef?.icon || 'ri-cpu-line'} text-xs ${themeClasses.text}`}></i>
                    <span className="font-mono text-[9px] uppercase text-slate-200 tracking-widest">{node.label}</span>
                    <span className="text-[7.5px] font-mono text-cyan-400 bg-cyan-950/40 px-1 py-0.5 rounded leading-none uppercase font-semibold">100% FOCUS</span>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <GlassmorphismSlider 
                      opacity={activeCluster.panelOpacities?.[nodeId] ?? activeCluster.panelOpacity ?? 0.8}
                      onChange={(val) => {
                        const newOpacities = {
                          ...(activeCluster.panelOpacities || {}),
                          [nodeId]: val
                        };
                        updateActiveCluster({ panelOpacities: newOpacities });
                      }}
                      align="right"
                    />
                      <button
                        onClick={() => handleSwapPanel(nodeId)}
                        title="Swap Panel Content"
                        className="text-slate-500 hover:text-emerald-400 cursor-pointer"
                      >
                        <i className="ri-swap-line text-[11px]" />
                      </button>
                      <button
                        onClick={() => updateActiveCluster({ openNodeIds: activeCluster.openNodeIds.filter(pid => pid !== nodeId) })}
                        className="w-5 h-5 rounded-full bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-400/80 flex items-center justify-center shadow-[0_0_6px_rgba(244,63,94,0.4)] transition-all font-bold shrink-0 ml-1 cursor-pointer"
                        title="Close Subsystem"
                      >
                        <i className="ri-close-line text-xs font-bold" />
                      </button>
                    </div>
                  </div>
                  {/* Content Area */}
                  <div 
                    style={{ opacity: activeCluster.panelOpacities?.[nodeId] ?? activeCluster.panelOpacity ?? 0.8 }}
                    className="flex-grow overflow-y-auto p-3 custom-scrollbar bg-slate-950/40 relative min-h-0 text-slate-300"
                  >
                    {getPanelContent(nodeId)}
                  </div>
                </div>
              );
            })()
          ) : effectiveLayoutType === 'tab' ? (
            /* TABBED BED MODE */
            <div 
              className="flex-grow w-full overflow-hidden flex flex-col border rounded-xl min-h-0 transition-all duration-300"
              style={getCardStyle(selectedNodeId || undefined)}
            >
              {/* Tab Selector bar */}
              <div className="flex justify-between items-center border-b border-slate-950 p-1 bg-slate-900/30 gap-2">
                <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1">
                  {activeCluster.openNodeIds.map(nodeId => {
                    const node = activeCluster.nodes.find(n => n.id === nodeId);
                    const panelIdBase = node?.panelId.split('::')[0];
                    const panelDef = PANEL_DEFINITIONS.find(p => p.id === panelIdBase);
                    
                    const isSelected = selectedNodeId === nodeId;
                    
                    return (
                      <button
                        key={nodeId}
                        onClick={() => setActive2dNodeId(nodeId)}
                        className={`px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider border rounded flex items-center gap-1.5 select-none transition-all cursor-pointer whitespace-nowrap ${
                          isSelected 
                            ? `bg-${themeClasses.accent}-500/10 ${themeClasses.borderActive} ${themeClasses.text} ${config.lowLagMode ? '' : themeClasses.shadow} font-semibold`
                            : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <i className={panelDef?.icon || 'ri-cpu-line'}></i>
                        <span>{node?.label || 'Subsystem'}</span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateActiveCluster({ openNodeIds: activeCluster.openNodeIds.filter(pid => pid !== nodeId) });
                          }}
                          className="hover:text-red-400 transition-colors cursor-pointer text-xs ml-1"
                        >
                          <i className="ri-close-line" />
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center pr-2 shrink-0">
                  <GlassmorphismSlider 
                    opacity={activeCluster.panelOpacities?.[selectedNodeId ?? ''] ?? activeCluster.panelOpacity ?? 0.8}
                    onChange={(val) => {
                      if (!selectedNodeId) return;
                      const newOpacities = {
                        ...(activeCluster.panelOpacities || {}),
                        [selectedNodeId]: val
                      };
                      updateActiveCluster({ panelOpacities: newOpacities });
                    }}
                    align="right"
                  />
                </div>
              </div>
              
              {/* Selected panel container */}
              {(() => {
                if (!currentActiveNode) return null;
                const panelIdBase = currentActiveNode.panelId.split('::')[0];
                const panelDef = PANEL_DEFINITIONS.find(p => p.id === panelIdBase);
                
                return (
                  <div className="flex-grow overflow-hidden flex flex-col relative min-h-0">
                    {/* Header bar */}
                    <div className="flex justify-between items-center bg-slate-900/60 border-b border-slate-900 px-3 py-1.5 select-none shrink-0">
                      <div className="flex items-center gap-2">
                        <i className={`${panelDef?.icon || 'ri-cpu-line'} text-xs ${themeClasses.text}`}></i>
                        <span className="font-mono text-[9px] uppercase text-slate-200 tracking-widest">{currentActiveNode.label}</span>
                        <span className="text-[7.5px] font-mono text-slate-600 bg-slate-950 px-1 py-0.5 rounded leading-none uppercase font-semibold">NODE {currentActiveNode.id}</span>
                      </div>
                      
                      <div className="flex items-center gap-2.5">
                        <GlassmorphismSlider 
                          opacity={activeCluster.panelOpacities?.[selectedNodeId] ?? activeCluster.panelOpacity ?? 0.8}
                          onChange={(val) => {
                            const newOpacities = {
                              ...(activeCluster.panelOpacities || {}),
                              [selectedNodeId]: val
                            };
                            updateActiveCluster({ panelOpacities: newOpacities });
                          }}
                          alignment="right"
                        />
                        <button
                          onClick={() => handleSwapPanel(selectedNodeId)}
                          title="Swap Panel Content"
                          className="text-slate-500 hover:text-emerald-400 cursor-pointer"
                        >
                          <i className="ri-swap-line text-[11px]" />
                        </button>
                        <button
                          onClick={() => handlePinPanel(selectedNodeId)}
                          title="Pin Panel"
                          className="text-slate-500 hover:text-emerald-400 cursor-pointer"
                        >
                          <i className="ri-pushpin-line text-[11px]" />
                        </button>
                        <button
                          onClick={() => updateActiveCluster({ openNodeIds: activeCluster.openNodeIds.filter(pid => pid !== selectedNodeId) })}
                          className="w-5 h-5 rounded-full bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-400/80 flex items-center justify-center shadow-[0_0_6px_rgba(244,63,94,0.4)] transition-all font-bold shrink-0 ml-1 cursor-pointer"
                          title="Close Subsystem"
                        >
                          <i className="ri-close-line text-xs font-bold" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Content container */}
                    <div 
                      style={{ opacity: activeCluster.panelOpacities?.[selectedNodeId] ?? activeCluster.panelOpacity ?? 0.8 }}
                      className="flex-grow overflow-y-auto p-3 custom-scrollbar bg-slate-950/40 relative min-h-0 text-slate-300"
                    >
                      {getPanelContent(selectedNodeId)}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* STACKED LIST MODE */
            <div className="flex-grow w-full overflow-y-auto pr-1 flex flex-col gap-3 custom-scrollbar min-h-0">
              {activeCluster.openNodeIds.map(nodeId => {
                const node = activeCluster.nodes.find(n => n.id === nodeId);
                const panelIdBase = node?.panelId.split('::')[0];
                const panelDef = PANEL_DEFINITIONS.find(p => p.id === panelIdBase);
                
                if (!node) return null;
                
                return (
                  <div 
                    key={nodeId} 
                    className="w-full border rounded-xl flex flex-col overflow-hidden min-h-[300px] transition-all duration-300"
                    style={getCardStyle(nodeId)}
                  >
                    {/* Header bar */}
                    <div className="flex justify-between items-center bg-slate-900/60 border-b border-slate-900 px-3 py-1.5 select-none shrink-0 border-transparent">
                      <div className="flex items-center gap-2">
                        <i className={`${panelDef?.icon || 'ri-cpu-line'} text-xs ${themeClasses.text}`}></i>
                        <span className="font-mono text-[9px] uppercase text-slate-200 tracking-widest">{node.label}</span>
                        <span className="text-[7.5px] font-mono text-slate-600 bg-slate-950 px-1 py-0.5 rounded leading-none uppercase font-semibold">NODE {node.id}</span>
                      </div>
                      
                      <div className="flex items-center gap-2.5">
                        <GlassmorphismSlider 
                          opacity={activeCluster.panelOpacities?.[nodeId] ?? activeCluster.panelOpacity ?? 0.8}
                          onChange={(val) => {
                            const newOpacities = {
                              ...(activeCluster.panelOpacities || {}),
                              [nodeId]: val
                            };
                            updateActiveCluster({ panelOpacities: newOpacities });
                          }}
                          align="right"
                        />
                        <button
                          onClick={() => handleSwapPanel(nodeId)}
                          title="Swap Panel"
                          className="text-slate-500 hover:text-emerald-400 cursor-pointer"
                        >
                          <i className="ri-swap-line text-[11px]" />
                        </button>
                        <button
                          onClick={() => handlePinPanel(nodeId)}
                          title="Pin Panel"
                          className="text-slate-500 hover:text-emerald-400 cursor-pointer"
                        >
                          <i className="ri-pushpin-line text-[11px]" />
                        </button>
                        <button
                          onClick={() => updateActiveCluster({ openNodeIds: activeCluster.openNodeIds.filter(pid => pid !== nodeId) })}
                          className="w-5 h-5 rounded-full bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-400/80 flex items-center justify-center shadow-[0_0_6px_rgba(244,63,94,0.4)] transition-all font-bold shrink-0 ml-1 cursor-pointer"
                          title="Close Panel"
                        >
                          <i className="ri-close-line text-xs font-bold" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Content container */}
                    <div 
                      style={{ opacity: activeCluster.panelOpacities?.[nodeId] ?? activeCluster.panelOpacity ?? 0.8 }}
                      className="flex-grow p-3 bg-slate-950/40 relative text-slate-300"
                    >
                      {getPanelContent(nodeId)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
