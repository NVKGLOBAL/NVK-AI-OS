import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { PanelDefinition } from '../../types';
import { PANEL_DEFINITIONS } from '../../constants';

interface OmniSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPanel: (panelId: string) => void;
  workspaceMode: '3d' | '2d';
  onWorkspaceModeChange: (mode: '3d' | '2d') => void;
  onCloseAllPanels: () => void;
  onOpenAllPanels: () => void;
  onTriggerAction?: (actionName: string) => void;
}

export const OmniSearchModal: React.FC<OmniSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPanel,
  workspaceMode,
  onWorkspaceModeChange,
  onCloseAllPanels,
  onOpenAllPanels,
  onTriggerAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle global shortcuts (Cmd+K / Ctrl+K / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    PANEL_DEFINITIONS.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, []);

  // System Commands
  const systemCommands = useMemo(() => {
    return [
      {
        id: 'CMD_SWITCH_3D',
        name: 'Switch to 3D Matrix Workspace',
        icon: 'ri-shape-2-line',
        category: 'System Workspace',
        description: 'Immersive 3D orbital cluster visualization.',
        action: () => onWorkspaceModeChange('3d'),
      },
      {
        id: 'CMD_SWITCH_2D',
        name: 'Switch to 2D Bento Box Workspace',
        icon: 'ri-layout-grid-line',
        category: 'System Workspace',
        description: 'Clean high-density 2D tiled layout.',
        action: () => onWorkspaceModeChange('2d'),
      },
      {
        id: 'CMD_CLOSE_ALL',
        name: 'Close All Active Panels',
        icon: 'ri-close-circle-line',
        category: 'System Actions',
        description: 'Decommission all active panels and nodes.',
        action: onCloseAllPanels,
      },
      {
        id: 'CMD_OPEN_ALL',
        name: 'Open Key System Panels',
        icon: 'ri-layout-grid-fill',
        category: 'System Actions',
        description: 'Open standard core operating panels.',
        action: onOpenAllPanels,
      },
    ];
  }, [onWorkspaceModeChange, onCloseAllPanels, onOpenAllPanels]);

  // Filtered Items
  const filteredPanels = useMemo(() => {
    const q = query.toLowerCase().trim();
    return PANEL_DEFINITIONS.filter(panel => {
      const matchCategory = selectedCategory === 'ALL' || panel.category === selectedCategory;
      const matchQuery = !q || 
        panel.name.toLowerCase().includes(q) || 
        panel.description.toLowerCase().includes(q) ||
        (panel.category && panel.category.toLowerCase().includes(q));
      return matchCategory && matchQuery;
    });
  }, [query, selectedCategory]);

  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return systemCommands;
    return systemCommands.filter(cmd => 
      cmd.name.toLowerCase().includes(q) || 
      cmd.description.toLowerCase().includes(q)
    );
  }, [query, systemCommands]);

  const totalResults = filteredPanels.length + filteredCommands.length;

  // Keyboard navigation through list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, totalResults));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalResults) % Math.max(1, totalResults));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredCommands.length) {
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          cmd.action();
          onClose();
        }
      } else {
        const panelIdx = selectedIndex - filteredCommands.length;
        const panel = filteredPanels[panelIdx];
        if (panel) {
          onSelectPanel(panel.id);
          onClose();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[6000] flex items-start justify-center pt-16 md:pt-24 px-4 bg-slate-950/80 backdrop-blur-md">
        {/* Backdrop click */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose} 
          className="absolute inset-0"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-3xl bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col max-h-[80vh] z-10"
        >
          {/* Header Search Input */}
          <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/60 gap-3">
            <i className="ri-search-line text-cyan-400 text-xl shrink-0"></i>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search panels, system actions, AI models... (e.g. Email, Voice, Logic Core)"
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm font-sans outline-none"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="text-slate-500 hover:text-slate-300 text-xs px-2 py-0.5 rounded bg-slate-800"
              >
                Clear
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-800 border border-slate-700 px-2 py-1 rounded">
              <kbd className="text-slate-300">ESC</kbd> to close
            </span>
            <button 
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-rose-600/90 hover:bg-rose-500 border border-rose-400 text-white shadow-[0_0_8px_rgba(244,63,94,0.5)] flex items-center justify-center transition-all font-bold shrink-0 ml-1"
            >
              <i className="ri-close-line text-sm font-bold"></i>
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-800/80 bg-slate-950/30 overflow-x-auto scrollbar-hide text-[11px] font-mono">
            <span className="text-slate-500 shrink-0 mr-1 uppercase text-[9px] tracking-widest">Filter:</span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedIndex(0);
                }}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
            {/* System Commands Section */}
            {filteredCommands.length > 0 && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80 px-2 mb-1.5 flex items-center gap-1.5">
                  <i className="ri-terminal-box-line"></i>
                  <span>System Workspace Commands</span>
                </div>
                <div className="space-y-1">
                  {filteredCommands.map((cmd, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <div
                        key={cmd.id}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                            : 'bg-slate-950/30 border-slate-800/60 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                            isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            <i className={cmd.icon}></i>
                          </div>
                          <div>
                            <div className="text-xs font-semibold">{cmd.name}</div>
                            <div className="text-[11px] text-slate-400">{cmd.description}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded">
                          Run Command
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Applications & Panels Section */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <i className="ri-apps-2-line text-slate-400"></i>
                  <span>Applications & Subsystems ({filteredPanels.length})</span>
                </span>
                {query && <span className="text-[9px] text-slate-500">Matching "{query}"</span>}
              </div>

              {filteredPanels.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  No panels found matching your query. Try searching for "Voice", "File", "Browser", "Logic", or "Email".
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredPanels.map((panel, idx) => {
                    const actualIdx = filteredCommands.length + idx;
                    const isSelected = selectedIndex === actualIdx;
                    return (
                      <div
                        key={panel.id}
                        onClick={() => {
                          onSelectPanel(panel.id);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(actualIdx)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-cyan-950/50 border-cyan-500 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.25)] scale-[1.01]'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl shrink-0 ${
                          isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-800/80 text-cyan-400 border border-slate-700'
                        }`}>
                          <i className={panel.icon}></i>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold truncate text-slate-100">{panel.name}</span>
                            <span className="text-[9px] font-mono text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded shrink-0">
                              {panel.category || 'Core'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{panel.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Quick Keys */}
          <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <div className="flex items-center gap-3">
              <span><kbd className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded">↑↓</kbd> Navigate</span>
              <span><kbd className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded">↵</kbd> Select</span>
            </div>
            <div>
              <span>Press <kbd className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded">⌘K</kbd> anytime to open</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
