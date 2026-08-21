import React from 'react';
import type { PanelDefinition } from '../types';

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
  return (
    <footer className="fixed bottom-4 left-0 right-0 flex justify-center items-end z-[1100] pointer-events-none">
      <div className="dock-container pointer-events-auto bg-slate-950/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-1.5 md:gap-2.5 px-3 py-1.5 mx-auto max-w-[98vw] overflow-x-auto custom-scrollbar-none">
        
        {/* Quick App Launcher Button */}
        {onOpenSearch && (
          <>
            <div className="relative flex flex-col items-center shrink-0">
              <button
                onClick={onOpenSearch}
                className="w-10 h-10 md:w-11 md:h-11 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/80 rounded-xl flex items-center justify-center transition-all duration-200 transform hover:-translate-y-1 focus:outline-none shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 group cursor-pointer"
                title="App Library / Command Palette (⌘K)"
              >
                <i className="ri-apps-2-fill text-xl text-cyan-300 group-hover:scale-110 transition-transform"></i>
              </button>
            </div>
            <div className="w-[1px] h-6 bg-slate-800 shrink-0 mx-0.5"></div>
          </>
        )}

        {apps.map(app => {
          const isOpen = openAppIds.some(id => id.startsWith(app.id));
          return (
            <div key={app.id} className="relative flex flex-col items-center shrink-0">
              <button
                id={`dock-app-${app.id}`}
                onClick={() => onAppClick(app.id)}
                className="w-9 h-9 md:w-11 md:h-11 bg-slate-800/60 rounded-xl flex items-center justify-center transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:bg-slate-700/90 focus:outline-none focus:ring-2 focus:ring-sky-400 active:scale-95 border border-slate-600/30 hover:border-sky-500/50 shadow-lg cursor-pointer"
                title={app.name}
                aria-label={`Open ${app.name}`}
              >
                <i className={`${app.icon} text-lg md:text-xl text-slate-200`}></i>
              </button>
              {isOpen && (
                <div className="absolute -bottom-1 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              )}
            </div>
          );
        })}
      </div>
    </footer>
  );
};
