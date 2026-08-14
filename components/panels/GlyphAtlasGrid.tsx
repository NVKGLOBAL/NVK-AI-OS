
import React from 'react';
import type { GlyphAtlasGridProps } from '../../types'; // Assuming path

import { useEcho } from '../../context/EchoContext';
const GlyphAtlasGrid: React.FC<GlyphAtlasGridProps> = ({ width = 750, height = 600 }) => {
  const { addEchoMessage } = useEcho();
  // Example glyph data - replace with actual data source if available
  const exampleGlyphs = Array.from({ length: 64 }).map((_, index) => ({
    id: `glyph_ex_${index}`,
    symbol: `G${index + 1}`, // Placeholder symbol
    name: `Ancient Symbol ${index + 1}`,
    description: `A glyph of unknown origin, resonating with primal energies.`,
    category: ['Cosmic', 'Elemental', 'Temporal', 'Abstract'][index % 4],
    discovered: Math.random() > 0.3, // Simulating some glyphs as discovered
  }));

  return (
    <div 
      className="glyph-atlas-grid-panel bg-slate-900/80 backdrop-blur-sm border border-stone-500/50 rounded-lg p-4 md:p-6 shadow-lg text-slate-100"
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-labelledby="glyph-atlas-title"
    >
      <h3 id="glyph-atlas-title" className="text-xl md:text-2xl font-cinzel font-semibold text-stone-300 mb-4 text-center">
        <i className="ri-grid-fill mr-2"></i>Glyph Atlas Grid
      </h3>
      <div 
        className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 md:gap-3 overflow-y-auto custom-scrollbar pr-1" 
        style={{ maxHeight: `${height - 80}px` }}
        role="grid"
      >
        {exampleGlyphs.map((glyph, index) => (
          <div 
            key={glyph.id} 
            className={`aspect-square border rounded-md flex flex-col items-center justify-center p-1.5 transition-all duration-200 ease-in-out
                        ${glyph.discovered 
                          ? 'bg-slate-800/60 border-stone-600/70 hover:bg-stone-700/60 hover:border-stone-500 cursor-pointer' 
                          : 'bg-slate-900/50 border-slate-700/50 opacity-60 cursor-not-allowed'
                        }`}
            title={glyph.discovered ? `${glyph.name}: ${glyph.description}` : `${glyph.name} (Undiscovered)`}
            role="gridcell"
            aria-label={glyph.discovered ? glyph.name : `${glyph.name}, undiscovered`}
            tabIndex={glyph.discovered ? 0 : -1}
            onClick={() => glyph.discovered && addEchoMessage && addEchoMessage('GlyphAtlasAgent', `Interacting with glyph: ${glyph.name}`, 'text-stone-300')}
            onKeyPress={(e) => glyph.discovered && e.key === 'Enter' && addEchoMessage && addEchoMessage('GlyphAtlasAgent', `Interacting with glyph: ${glyph.name}`, 'text-stone-300')}
          >
            <span 
                className={`text-2xl md:text-3xl font-glyph ${glyph.discovered ? 'text-stone-200' : 'text-stone-600'}`}
                aria-hidden="true"
            >
                {glyph.symbol}
            </span>
            {glyph.discovered && (
                 <span className="text-[8px] md:text-[9px] text-stone-400 mt-0.5 truncate w-full text-center">{glyph.name.split(' ')[0]}</span>
            )}
          </div>
        ))}
      </div>
      {addEchoMessage && (
        <p className="text-xs text-slate-500 mt-3 text-center font-mono">
          {`Atlas interactions are ${addEchoMessage ? 'logged' : 'not logged'}. Discovered: ${exampleGlyphs.filter(g => g.discovered).length}/${exampleGlyphs.length}`}
        </p>
      )}
    </div>
  );
};

export default GlyphAtlasGrid;
