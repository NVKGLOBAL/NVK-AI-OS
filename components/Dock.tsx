
import React from 'react';
import type { PanelDefinition } from '../types';
import { OrbMode, ParticleBackgroundMode } from '../types';
import { OrbModeSelector } from './ui/OrbModeSelector';
import { ParticleModeSelector } from './ui/ParticleModeSelector';
import { AnimatePresence } from 'motion/react';

interface DockProps {
  apps: PanelDefinition[];
  openAppIds: string[];
  onAppClick: (appId: string) => void;
}

export const Dock: React.FC<DockProps> = ({ 
  apps, 
  openAppIds, 
  onAppClick,
}) => {
  return (
    <footer className="fixed bottom-4 left-0 right-0 flex justify-center items-end z-[1100] pointer-events-none">
      <div className="dock-container pointer-events-auto bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex items-center gap-1.5 md:gap-2.5 px-3 py-1.5 mx-auto max-w-[98vw] overflow-x-auto custom-scrollbar-none">
        {apps.map(app => {
          const isOpen = openAppIds.some(id => id.startsWith(app.id));
          return (
            <div key={app.id} className="relative flex flex-col items-center shrink-0">
              <button
                id={`dock-app-${app.id}`}
                onClick={() => onAppClick(app.id)}
                className="w-9 h-9 md:w-11 md:h-11 bg-slate-800/60 rounded-xl flex items-center justify-center transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:bg-slate-700/90 focus:outline-none focus:ring-2 focus:ring-sky-400 active:scale-95 border border-slate-600/30 hover:border-sky-500/50 shadow-lg"
                title={app.name}
                aria-label={`Open ${app.name}`}
              >
                <i className={`${app.icon} text-lg md:text-xl text-slate-200`}></i>
              </button>
              {isOpen && (
                <div className="absolute -bottom-1 w-1 h-1 bg-sky-400 rounded-full shadow-[0_0_4px_var(--color-sky-400)]" />
              )}
            </div>
          );
        })}
      </div>
    </footer>
  );
};
