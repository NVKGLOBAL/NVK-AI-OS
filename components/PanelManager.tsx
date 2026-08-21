import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { PanelDefinition } from '../types';
import { CyberSynth } from '../lib/soundEffects';

interface PanelManagerProps {
  pinnedPanelIds: string[];
  minimizedPanelIds: string[];
  maximizedPanelIds: string[];
  focusedPanelId: string | null;
  onToggleFocus: (instanceId: string) => void;
  onClosePanel: (instanceId: string) => void;
  onBringToFront: (instanceId: string) => void;
  onToggleMinimize: (instanceId: string) => void;
  onMinimizeAll: () => void;
  onRestoreAll: () => void;
  onCloseAll: () => void;
  onTilePanels: (mode: 'grid' | 'cols' | 'rows') => void;
  panelDefinitions: PanelDefinition[];
}

export const PanelManager: React.FC<PanelManagerProps> = ({
  pinnedPanelIds,
  minimizedPanelIds,
  maximizedPanelIds,
  focusedPanelId,
  onToggleFocus,
  onClosePanel,
  onBringToFront,
  onToggleMinimize,
  onMinimizeAll,
  onRestoreAll,
  onCloseAll,
  onTilePanels,
  panelDefinitions,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleOpen = () => {
    CyberSynth.playClick();
    setIsOpen(!isOpen);
  };

  const getPanelMeta = (instanceId: string) => {
    const [panelId] = instanceId.split('::');
    const def = panelDefinitions.find(p => p.id === panelId);
    return {
      id: instanceId,
      name: def?.name || panelId,
      icon: def?.icon || 'ri-window-line',
      isFocused: focusedPanelId === instanceId,
      isMinimized: minimizedPanelIds.includes(instanceId),
      isMaximized: maximizedPanelIds.includes(instanceId),
    };
  };

  const activePanels = pinnedPanelIds.map(getPanelMeta);

  return (
    <div className="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-[1150] flex flex-col items-center gap-2 pointer-events-none select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="pointer-events-auto bg-slate-950/90 backdrop-blur-xl border border-slate-800/80 p-3.5 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.8)] flex flex-col gap-3 min-w-[320px] max-w-[90vw]"
          >
            {/* Header / Global Actions */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <div className="flex items-center gap-2">
                <i className="ri-instance-line text-cyan-400 text-sm animate-pulse"></i>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-300 font-bold">
                  Lattice Window Controller
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-500">
                {activePanels.length} ACTIVE
              </span>
            </div>

            {/* Layout Tiling Operations */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  CyberSynth.playClick();
                  onTilePanels('grid');
                }}
                disabled={activePanels.length === 0}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-800/80 transition-all group"
                title="Tile all open panels in a balanced bento grid"
              >
                <i className="ri-layout-grid-line text-sm mb-1 group-hover:scale-110 transition-transform"></i>
                <span className="text-[8px] font-mono uppercase tracking-wider">Tile Grid</span>
              </button>

              <button
                onClick={() => {
                  CyberSynth.playClick();
                  onTilePanels('cols');
                }}
                disabled={activePanels.length === 0}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/40 text-slate-400 hover:text-purple-400 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-800/80 transition-all group"
                title="Tile panels side-by-side"
              >
                <i className="ri-layout-column-line text-sm mb-1 group-hover:scale-110 transition-transform"></i>
                <span className="text-[8px] font-mono uppercase tracking-wider">Tile Columns</span>
              </button>

              <button
                onClick={() => {
                  CyberSynth.playClick();
                  onTilePanels('rows');
                }}
                disabled={activePanels.length === 0}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-800/80 transition-all group"
                title="Tile panels vertically stacked"
              >
                <i className="ri-layout-row-line text-sm mb-1 group-hover:scale-110 transition-transform"></i>
                <span className="text-[8px] font-mono uppercase tracking-wider">Tile Rows</span>
              </button>
            </div>

            {/* Quick Multi-Window Toggles */}
            <div className="flex items-center gap-1.5 justify-between">
              <button
                onClick={() => {
                  CyberSynth.playClick();
                  onMinimizeAll();
                }}
                disabled={activePanels.length === 0}
                className="flex-1 py-1.5 px-2 bg-slate-900/40 border border-slate-800 hover:border-slate-700 hover:text-slate-300 text-slate-500 rounded text-[9px] font-mono uppercase tracking-wider transition-all disabled:opacity-40"
              >
                Minimize All
              </button>
              <button
                onClick={() => {
                  CyberSynth.playClick();
                  onRestoreAll();
                }}
                disabled={activePanels.length === 0}
                className="flex-1 py-1.5 px-2 bg-slate-900/40 border border-slate-800 hover:border-slate-700 hover:text-slate-300 text-slate-500 rounded text-[9px] font-mono uppercase tracking-wider transition-all disabled:opacity-40"
              >
                Restore All
              </button>
              <button
                onClick={() => {
                  CyberSynth.playClick();
                  onCloseAll();
                }}
                disabled={activePanels.length === 0}
                className="flex-1 py-1.5 px-2 bg-rose-600/30 border border-rose-500/60 hover:bg-rose-600 hover:text-white text-rose-300 font-bold rounded text-[9px] font-mono uppercase tracking-wider transition-all disabled:opacity-40 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
              >
                Close All
              </button>
            </div>

            {/* Lattice Nodes / Active Window List */}
            <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto custom-scrollbar border border-slate-800/40 rounded-lg p-1 bg-slate-950/50">
              {activePanels.length === 0 ? (
                <div className="text-center py-4 text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                  No Active Lattice Nodes
                </div>
              ) : (
                activePanels.map(panel => (
                  <div
                    key={panel.id}
                    onClick={() => {
                      CyberSynth.playClick();
                      onBringToFront(panel.id);
                    }}
                    className={`flex items-center justify-between p-1.5 rounded-md text-xs cursor-pointer transition-all ${
                      panel.isFocused
                        ? 'bg-amber-950/20 border border-amber-500/20 text-amber-300'
                        : 'hover:bg-slate-900/50 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Operational Status Dot */}
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        panel.isFocused
                          ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                          : (panel.isMinimized ? 'bg-slate-600' : 'bg-emerald-400 shadow-[0_0_6px_#10b981]')
                      }`} />
                      <i className={`${panel.icon} text-[10px] text-slate-500`} />
                      <span className="truncate text-[10px] font-mono font-medium tracking-wide">
                        {panel.name}
                      </span>
                    </div>

                    {/* Node Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                      {/* Focus Node Toggle */}
                      <button
                        onClick={() => {
                          CyberSynth.playClick();
                          onToggleFocus(panel.id);
                        }}
                        className={`p-1 rounded hover:bg-slate-800 text-[10px] transition-colors ${
                          panel.isFocused ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'
                        }`}
                        title={panel.isFocused ? "Exit Focus Mode" : "Focus Node"}
                      >
                        <i className="ri-focus-3-line"></i>
                      </button>

                      {/* Minimize Node Toggle */}
                      <button
                        onClick={() => {
                          CyberSynth.playClick();
                          onToggleMinimize(panel.id);
                        }}
                        className={`p-1 rounded hover:bg-slate-800 text-[10px] transition-colors ${
                          panel.isMinimized ? 'text-cyan-400' : 'text-slate-500 hover:text-cyan-400'
                        }`}
                        title={panel.isMinimized ? "Restore Node" : "Minimize Node"}
                      >
                        <i className={panel.isMinimized ? "ri-arrow-up-double-line" : "ri-subtract-line"}></i>
                      </button>

                      {/* Close Node */}
                      <button
                        onClick={() => {
                          CyberSynth.playClick();
                          onClosePanel(panel.id);
                        }}
                        className="w-5 h-5 rounded-full bg-rose-600/90 text-white hover:bg-rose-500 border border-rose-400/80 flex items-center justify-center shadow-[0_0_6px_rgba(244,63,94,0.4)] transition-all font-bold shrink-0 ml-1 cursor-pointer"
                        title="Close / Decommission Node"
                      >
                        <i className="ri-close-line text-xs font-bold"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Capsule Button */}
      <button
        onClick={handleToggleOpen}
        className={`pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg transition-all active:scale-95 ${
          isOpen
            ? 'bg-slate-900 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            : 'bg-slate-950/80 backdrop-blur-md border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
        }`}
        title="Lattice Window Controller (Panel Manager)"
      >
        <i className={`ri-instance-line text-xs ${isOpen ? 'rotate-90 text-cyan-400' : ''} transition-transform duration-300`}></i>
        <span className="text-[8px] font-mono uppercase tracking-[0.2em] font-semibold">
          Lattice Manager
        </span>
        {pinnedPanelIds.length > 0 && (
          <span className="bg-slate-800 text-cyan-400 text-[8px] font-mono px-1.5 py-0.2 rounded-full border border-slate-700">
            {pinnedPanelIds.length}
          </span>
        )}
      </button>
    </div>
  );
};
