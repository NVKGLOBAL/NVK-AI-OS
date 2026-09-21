
import React, { useState, useMemo } from 'react';
import type { PanelDefinition } from '../../types';

interface PanelLauncherProps {
  panels: PanelDefinition[];
  onPanelSelect: (panelId: string) => void;
}

const PanelLauncher: React.FC<PanelLauncherProps> = ({ panels, onPanelSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAndGroupedPanels = useMemo(() => {
    const filtered = panels.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.reduce((acc, panel) => {
      const category = panel.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(panel);
      return acc;
    }, {} as Record<string, PanelDefinition[]>);
  }, [panels, searchTerm]);

  const sortedCategories = Object.keys(filteredAndGroupedPanels).sort((a, b) => {
    // Optional: Define a specific order for categories
    const categoryOrder = ['Core Systems', 'Ritual & Weaving', 'Interfaces & Consoles', 'Advanced Diagnostics', 'Visualizers', 'Lore & Archives', 'Experimental'];
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA > -1 && indexB > -1) return indexA - indexB;
    if (indexA > -1) return -1;
    if (indexB > -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="panel-launcher p-2 sm:p-4 h-full flex flex-col">
      <h3 className="text-xs sm:text-base font-mono uppercase tracking-widest font-semibold text-sky-300 mb-1.5 sm:mb-3 text-center">
        Panel Directory
      </h3>
      <input
        type="text"
        placeholder="Search panels..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-1 px-2.5 mb-2 text-[10px] sm:text-xs bg-slate-800/70 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors duration-200 font-mono"
        aria-label="Search Panels"
      />
      <a
        href="https://www.nvkglobal.com"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full text-center p-1 px-2 mb-2 text-[10px] sm:text-xs rounded-md bg-purple-600/90 hover:bg-purple-500 text-white font-mono tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5"
      >
        <i className="ri-global-line"></i>
        NVK NEXUS
      </a>
      <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 -mr-1">
        {sortedCategories.length === 0 && (
          <p className="text-center text-slate-500 italic mt-4 text-[10px]">No panels match search.</p>
        )}
        {sortedCategories.map(category => (
          <div key={category} className="mb-3">
            <h4 className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-sky-400 mb-1.5 border-b border-sky-700/50 pb-0.5">
              {category}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredAndGroupedPanels[category].sort((a, b) => a.name.localeCompare(b.name)).map(panel => (
                <button
                  key={panel.id}
                  onClick={() => onPanelSelect(panel.id)}
                  className="panel-entry flex items-center p-2 rounded-md bg-slate-800/50 hover:bg-sky-800/40 border border-transparent hover:border-sky-600 transition-all duration-200 text-left w-full"
                  title={panel.description}
                >
                  <i className={`${panel.icon} text-2xl text-sky-400 mr-3 flex-shrink-0`}></i>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-100 truncate">{panel.name}</div>
                    <div className="text-xs text-slate-400 truncate">{panel.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PanelLauncher;
