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
  // Combine all items to compute precise circular curvature layout
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

  const total = items.length;
  const centerIndex = (total - 1) / 2;

  return (
    <footer className="fixed bottom-12 left-0 right-0 flex justify-center items-end z-[1100] pointer-events-none">
      <div className="flex items-end justify-center gap-2 px-6 py-3 pointer-events-auto max-w-[98vw]">
        {items.map((item, index) => {
          const dist = index - centerIndex;
          
          // Circular device bottom arc fitting (tangent-aligned polar transform, curved an additional 15% more)
          const spacing = 48; // spacing between elements
          const radius = 220; // curvature radius of circular smartwatch/device frame
          const angleRad = (dist * spacing) / radius;
          const angleDeg = 1.3225 * angleRad * (180 / Math.PI);
          // Curve upwards at the side boundaries
          const translateY = -1.3225 * (radius - radius * Math.cos(angleRad)); 

          const isOpen = item.type === 'app' && openAppIds.some(id => id.startsWith(item.id));

          return (
            <div 
              key={item.id} 
              className="relative flex flex-col items-center shrink-0 transition-all duration-300 ease-out hover:scale-110"
              style={{
                transform: `translateY(${translateY}px) rotate(${angleDeg}deg)`,
                transformOrigin: 'bottom center',
              }}
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
                  className="w-10 h-10 md:w-11 md:h-11 bg-slate-900/90 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 active:scale-95 border border-slate-700/40 hover:border-sky-500/60 shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer backdrop-blur-xl"
                  title={item.name}
                  aria-label={`Open ${item.name}`}
                >
                  <i className={`${item.icon} text-lg md:text-xl text-slate-200`}></i>
                </button>
              )}
              
              {isOpen && (
                <div 
                  className="absolute -bottom-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.9)] transition-all duration-300"
                  style={{
                    transform: `rotate(${-angleDeg}deg)`, // keep the indicator dot pointing straight down
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </footer>
  );
};
