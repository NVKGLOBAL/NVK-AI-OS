import React from 'react';
import type { PanelDefinition } from '../types';
import { useIsMobile } from '../lib/useIsMobile';

interface DockProps {
  apps: PanelDefinition[];
  openAppIds: string[];
  onAppClick: (appId: string) => void;
  onOpenSearch?: () => void;
}

export const Dock: React.FC<DockProps> = ({ 
  apps, 
  openAppIds, 
  onAppClick,
  onOpenSearch,
}) => {
  // Mobile-first redesign (2026-11-27): the 12-icon row is gone on a
  // phone — it ate the bottom of the stage and, per the phone diagnosis
  // (2026-11-27), hid the orb behind the dock. One "Apps" button (the
  // existing App Library launcher icon) opens the panel picker as a
  // sheet. Top-right, below the header, so the orb's centre is never
  // covered by default chrome. The full dock renders only on ≥sm.
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div
        className="fixed right-3 z-[1100]"
        style={{ top: 'calc(108px + env(safe-area-inset-top, 0px))' }}
      >
        <button
          onClick={onOpenSearch}
          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shadow-[0_0_14px_rgba(6,182,212,0.25)] transition-all cursor-pointer"
          title="Apps — open the panel picker"
          aria-label="Apps — open the panel picker"
        >
          <i className="ri-apps-2-fill text-xl"></i>
        </button>
      </div>
    );
  }
  // Combine all items into one flat row. (Was a circular "smartwatch
  // arc" polar transform: it lifted the end buttons clean off the
  // visible strip — the strip's overflow-x-auto clips anything above its
  // top edge — making App Library, Codex Explorer, Nexus Terminal and
  // Pricing pointer-unreachable. Flat row, same strip, same S5
  // narrow-screen horizontal scroll.)
  const items = React.useMemo(() => {
    const list = [];
    if (onOpenSearch) {
      list.push({ id: 'launcher', type: 'launcher', name: 'App Library', icon: 'ri-apps-2-fill' });
    }
    apps.forEach(app => {
      list.push({ id: app.id, type: 'app', name: app.name, icon: app.icon, data: app });
    });
    return list;
  }, [apps, onOpenSearch]);

  return (
    <footer className="dock-container fixed left-0 right-0 flex justify-center items-end z-[1100] pointer-events-none" style={{ bottom: 'calc(3rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* S5: the dock scrolls horizontally on narrow screens instead of
          overflowing off the right edge. */}
      <div className="flex items-end justify-center gap-2 px-6 py-3 pointer-events-auto max-w-[98vw] overflow-x-auto custom-scrollbar">
        {items.map((item) => {
          // P1: App passes the one derived active-panel set (panel ids),
          // so this is an exact match — not a prefix match.
          const isOpen = item.type === 'app' && openAppIds.includes(item.id);

          return (
            <div 
              key={item.id} 
              className="relative flex flex-col items-center shrink-0 transition-all duration-300 ease-out hover:scale-110"
            >
              {item.type === 'launcher' ? (
                <button
                  onClick={onOpenSearch}
                  className="w-11 h-11 md:w-12 md:h-12 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/80 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 group cursor-pointer backdrop-blur-xl"
                  title="App Library (⌘K)"
                >
                  <i className="ri-apps-2-fill text-xl text-cyan-300 group-hover:scale-110 transition-transform"></i>
                </button>
              ) : (
                <button
                  id={`dock-app-${item.id}`}
                  onClick={() => onAppClick(item.id)}
                  className="w-11 h-11 md:w-11 md:h-11 bg-slate-900/90 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 active:scale-95 border border-slate-700/40 hover:border-sky-500/60 shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer backdrop-blur-xl"
                  title={item.name}
                  aria-label={`Open ${item.name}`}
                >
                  <i className={`${item.icon} text-lg md:text-xl text-slate-200`}></i>
                </button>
              )}
              
              {isOpen && (
                <div 
                  className="absolute -bottom-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.9)] transition-all duration-300"
                />
              )}
            </div>
          );
        })}
      </div>
    </footer>
  );
};
