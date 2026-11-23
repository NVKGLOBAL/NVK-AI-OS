import React, { useState } from 'react';
import {
  Settings, Zap, Layout
} from 'lucide-react';
import { Cluster, PanelDefinition, WorkspaceMode } from '../../types';
import { GlassmorphismSlider } from '../ui/GlassmorphismSlider';
import { useIsMobile } from '../../lib/useIsMobile';
import { version as PACKAGE_VERSION } from '../../package.json';

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
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  workspaceMode: WorkspaceMode;
  /**
   * S7: the 2D desk config lives in App's single settings store
   * (nvk_settings_v1) and is edited in the Settings panel. Workspace2D
   * renders it — it no longer owns it, and the z-2000 drawer is gone.
   */
  deskConfig: WorkspaceConfig;
  onDeskConfigChange: (next: WorkspaceConfig) => void;
  /** S7: the desk Settings button opens the Settings panel. */
  onOpenSettings: () => void;
}

export interface WorkspaceConfig {
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
  workspaceMode,
  deskConfig: config,
  onDeskConfigChange,
  onOpenSettings
}) => {
  // S7: the desk config is owned by App (single settings store). This
  // component only renders it; edits go through onDeskConfigChange.
  const [editingTitle, setEditingTitle] = useState(config.customTitle);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [isEditingTitleInline, setIsEditingTitleInline] = useState(false);

  // S5: one mobile breakpoint source (shared useIsMobile hook, <768px).
  const isMobile = useIsMobile();
  const [isMenuOpenOnMobile, setIsMenuOpenOnMobile] = useState(false);

  // Persist desk-config edits through App's single settings store.
  const updateConfig = (newSettings: Partial<WorkspaceConfig>) => {
    onDeskConfigChange({ ...config, ...newSettings });
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
                const titleVal = editingTitle.trim() || 'NVK 3D OS Workspace';
                setEditingTitle(titleVal);
                updateConfig({ customTitle: titleVal });
                showAlert("Workspace Title Updated");
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingTitleInline(false);
                  const titleVal = editingTitle.trim() || 'NVK 3D OS Workspace';
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
                {config.customTitle} // SAFE WORKSPACE <span className="text-slate-500 normal-case tracking-normal">v{PACKAGE_VERSION}</span>
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

          {/* Configuration Menu Toggle — S7: opens the one Settings panel */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded transition-all cursor-pointer text-slate-400 hover:text-white"
            title="Settings — desk, workspace mode, model, keys, reset"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Switch matrix mode button */}
          <button
            onClick={() => {
              setWorkspaceMode('immersive');
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
