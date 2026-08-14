
import React from 'react';

interface BugaGlyphCodexPanelProps {
  width: number;
  height: number;
}

const BugaGlyphCodexPanel: React.FC<BugaGlyphCodexPanelProps> = ({ width, height }) => {
  return (
    <div 
      className="buga-glyph-codex-panel-placeholder bg-slate-900/80 backdrop-blur-md border border-lime-500/50 rounded-xl shadow-2xl p-4 text-slate-100 my-4 flex flex-col"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <h3 className="text-lg font-['Cinzel'] font-bold text-lime-200 mb-2 text-center">
        Buga Glyphic Codex (Placeholder)
      </h3>
      <div className="flex-grow flex items-center justify-center text-center text-slate-400 italic">
        <p>This panel will display detailed information about Buga Glyphs and their corresponding peptide structures.</p>
        <p>The interactive elements for Buga Glyphs are now part of the unified Glyph Composer panel when Buga Mode is active.</p>
      </div>
    </div>
  );
};

export default BugaGlyphCodexPanel;
