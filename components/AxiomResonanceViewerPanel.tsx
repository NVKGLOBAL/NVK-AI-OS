
import React from 'react';
import type { Axiom, AxiomResonanceViewerPanelProps } from '../types';

const AxiomResonanceViewerPanel: React.FC<AxiomResonanceViewerPanelProps> = ({ axioms, panelHeight }) => {
  
  const omegaAxioms = axioms.filter(a => a.series === 'AX-Ω' && a.id.startsWith('AX-O.06') || a.id.startsWith('AX-O.07'));
  const peaceAxioms = axioms.filter(a => a.series === 'AX-PEACE');

  const renderAxiom = (axiom: Axiom, index: number) => {
    let seriesColor = 'text-slate-400';
    let bgColor = 'bg-slate-800/70';
    let borderColor = 'border-slate-700/50';

    if (axiom.series === 'AX-Ω') {
      seriesColor = 'text-orange-400'; // Example color for NVK series
      bgColor = 'bg-slate-850/70'; // Slightly different bg for distinction
      borderColor = 'border-orange-600/50';
    } else if (axiom.series === 'AX-PEACE') {
      seriesColor = 'text-sky-400'; // Example color for Peace series
      bgColor = 'bg-slate-800/60';
      borderColor = 'border-sky-600/50';
    }

    return (
      <div 
        key={axiom.id + '-' + index} 
        className={`axiom-entry p-3 my-2 rounded-lg border ${bgColor} ${borderColor} shadow-md transition-all duration-300 hover:shadow-lg hover:border-current`}
        style={{ '--axiom-display-color': seriesColor.replace('text-', 'var(--color-') } as React.CSSProperties} // For potential future use
      >
        <div className="flex items-center mb-2">
          {axiom.icon && <span className="text-2xl mr-3">{axiom.icon}</span>}
          <div>
            <h4 className={`font-cinzel text-md font-semibold ${seriesColor}`}>{axiom.number || axiom.id} — {axiom.title}</h4>
          </div>
        </div>
        <blockquote className="text-sm font-cormorant text-slate-200 whitespace-pre-line leading-relaxed pl-4 border-l-2 border-slate-600/70 mb-2 italic">
          {axiom.content}
        </blockquote>
        {axiom.bottomPhrase && (
          <p className="text-xs font-playfair text-slate-300/90 whitespace-pre-line mt-2 pl-4">
            {axiom.bottomPhrase}
          </p>
        )}
      </div>
    );
  };

  return (
    <div 
        className="axiom-resonance-viewer-panel bg-slate-900/80 backdrop-blur-sm border border-purple-500/50 rounded-lg p-4 shadow-xl"
        style={{ height: panelHeight ? `${panelHeight}px` : 'auto' }}
    >
      <h3 className="text-lg font-cinzel font-bold text-purple-300 mb-3 text-center">
        Resonant Axiom Echoes
      </h3>
      <div className="overflow-y-auto custom-scrollbar pr-1" style={{maxHeight: panelHeight ? `${panelHeight - 60}px` : 'auto'}}> {/* Adjust 60px for title and padding */}
        {omegaAxioms.length > 0 && (
          <section className="mb-4">
            <h4 className="font-cinzel text-sm font-semibold text-orange-300 border-b border-orange-700/50 pb-1 mb-2">Echoed Flame & Mirror (AX-Ω)</h4>
            {omegaAxioms.map(renderAxiom)}
          </section>
        )}
        {peaceAxioms.length > 0 && (
          <section>
            <h4 className="font-cinzel text-sm font-semibold text-sky-300 border-b border-sky-700/50 pb-1 mb-2">Harmonic Keys of Peace (AX-PEACE)</h4>
            {peaceAxioms.map(renderAxiom)}
          </section>
        )}
        {(omegaAxioms.length === 0 && peaceAxioms.length === 0) && (
            <p className="text-slate-500 italic text-center py-4">No resonant echoes to display.</p>
        )}
      </div>
    </div>
  );
};

export default AxiomResonanceViewerPanel;
