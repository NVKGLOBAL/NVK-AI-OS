
import React from 'react';
import type { GlyphVisualizationPanelProps } from '../../types';

const GlyphVisualizationPanel: React.FC<GlyphVisualizationPanelProps> = ({
  panelHeight,
  glyphData,
  pulseDetails,
  visualizationDetails,
  systemNote
}) => {
  return (
    <div
      className="glyph-visualization-panel bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/60 rounded-xl shadow-2xl p-4 text-slate-100 my-4 flex flex-col"
      style={{ height: panelHeight ? `${panelHeight}px` : 'auto' }}
    >
      <header className="text-center mb-3 border-b border-indigo-700/40 pb-2">
        <h3 className="text-xl font-cinzel font-bold text-indigo-200 drop-shadow-[0_1px_1px_rgba(129,140,248,0.5)]">
          <i className="ri-focus-3-line mr-2 text-indigo-400 animate-pulse-fast"></i>CONFIRMATION: VISUALIZATION SEQUENCE INITIATED
        </h3>
        <p className="text-xs font-mono text-indigo-300/80 tracking-wider">
          Pulse Label: {pulseDetails.label}
        </p>
      </header>

      <div className="overflow-y-auto custom-scrollbar pr-2 flex-grow" style={{ maxHeight: panelHeight ? `${panelHeight - 120}px` : 'auto' }}>
        <section className="pulse-meta-grid grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono text-slate-400 mb-3 p-2 bg-slate-800/50 border border-slate-700/40 rounded-md">
          <div><strong className="text-indigo-300">Glyph ID:</strong> {pulseDetails.glyphId}</div>
          <div><strong className="text-indigo-300">State:</strong> {pulseDetails.state}</div>
          <div><strong className="text-indigo-300">Mode:</strong> {pulseDetails.mode}</div>
          <div><strong className="text-indigo-300">Frequency:</strong> {pulseDetails.signatureFrequency}</div>
          <div><strong className="text-indigo-300">Archive Depth:</strong> {pulseDetails.shadowArchiveDepth}</div>
          <div><strong className="text-indigo-300">Traits:</strong> {pulseDetails.decryptionTraits.join(', ')}</div>
        </section>

        {/* Visualization Details */}
        <section className="mb-3 p-2 bg-slate-800/40 border border-slate-700/30 rounded-md">
          <h4 className="font-cinzel text-md font-semibold text-indigo-300 mb-1.5 flex items-center">
            <span className="text-2xl mr-2">🜂</span>VISUALIZATION: {glyphData.title}
          </h4>
          
          <div className="phase-detail ml-2 pl-2 border-l-2 border-indigo-700/30 mb-2">
            <h5 className="font-cormorant text-sm font-semibold text-slate-200">{visualizationDetails.initialPhase.title}</h5>
            <ul className="list-disc list-inside text-xs text-slate-300/90 space-y-0.5 pl-2">
              <li><strong>Form:</strong> {visualizationDetails.initialPhase.form}</li>
              <li><strong>Visual:</strong> {visualizationDetails.initialPhase.visual}</li>
              <li><strong>Animation:</strong> {visualizationDetails.initialPhase.animation}</li>
            </ul>
          </div>

          <div className="phase-detail ml-2 pl-2 border-l-2 border-indigo-700/30 mb-2">
            <h5 className="font-cormorant text-sm font-semibold text-slate-200">Sonic Profile</h5>
            <p className="text-xs text-slate-300/90">{visualizationDetails.sonicProfile.description}</p>
          </div>

          <div className="phase-detail ml-2 pl-2 border-l-2 border-indigo-700/30">
            <h5 className="font-cormorant text-sm font-semibold text-slate-200">Final Form Stabilization</h5>
            <ul className="list-disc list-inside text-xs text-slate-300/90 space-y-0.5 pl-2">
              <li>{visualizationDetails.finalForm.description}</li>
              <li><strong>Central Sigil Pulse:</strong> {visualizationDetails.finalForm.sigilPulse.join(' → ')}</li>
              <li>{visualizationDetails.finalForm.overlay}</li>
            </ul>
          </div>
        </section>

        {/* Glyph Metadata */}
        <section className="mb-3 p-2 bg-slate-800/40 border border-slate-700/30 rounded-md">
          <h4 className="font-cinzel text-md font-semibold text-indigo-300 mb-1.5 flex items-center">
             <span className="text-2xl mr-2">🔍</span>GLYPH METADATA (Stabilized Readout)
          </h4>
          <pre className="bg-black/50 p-2 rounded-sm text-xs font-mono my-1 overflow-x-auto custom-scrollbar-thin border border-slate-600/50 text-slate-300">
            <code>
{JSON.stringify({
  id: glyphData.id,
  title: glyphData.title,
  description: glyphData.description,
  resonance: glyphData.resonance,
  traits: glyphData.traits,
  linkedAxioms: glyphData.linkedAxioms,
  ritualAffinity: glyphData.ritualAffinity
}, null, 2)}
            </code>
          </pre>
        </section>

        {/* System Note */}
        <section className="mb-3 p-2 bg-slate-800/40 border border-slate-700/30 rounded-md">
          <h4 className="font-cinzel text-md font-semibold text-indigo-300 mb-1.5 flex items-center">
            <span className="text-2xl mr-2">📜</span>SYSTEM NOTE
          </h4>
          <p className="text-xs text-slate-300/90 mb-1">This glyph can now be:</p>
          <ul className="list-disc list-inside text-xs text-slate-300/90 space-y-0.5 pl-3">
            {systemNote.uses.map((use, idx) => <li key={idx}>{use}</li>)}
          </ul>
        </section>
      </div>

      <footer className="text-center mt-auto pt-2 border-t border-indigo-700/40">
        <p className="text-sm font-cormorant italic text-indigo-200/90">
          {systemNote.concludingQuote}
        </p>
      </footer>
    </div>
  );
};

export default GlyphVisualizationPanel;
