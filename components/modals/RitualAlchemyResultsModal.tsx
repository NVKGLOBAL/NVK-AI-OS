
import React from 'react';
import type { RitualAlchemyResult } from '../../types';
import { RitualGlyphType } from '../../types';

interface RitualAlchemyResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: RitualAlchemyResult | null;
}

const RitualAlchemyResultsModal: React.FC<RitualAlchemyResultsModalProps> = ({ isOpen, onClose, results }) => {
  if (!isOpen || !results) return null;

  const getEnergyColor = (energy: RitualAlchemyResult['energyLevel']) => {
    switch (energy) {
      case 'faint': return 'text-sky-400';
      case 'moderate': return 'text-lime-400';
      case 'potent': return 'text-amber-400';
      case 'overwhelming': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[2000] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alchemy-results-title"
    >
      <div className="bg-slate-800/95 border border-primary rounded-lg shadow-2xl p-6 w-full max-w-md text-slate-100 transform transition-all duration-300 ease-out scale-95 group-hover:scale-100 animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
          <h2 id="alchemy-results-title" className="text-2xl font-cinzel text-primary drop-shadow-[0_1px_1px_rgba(79,70,229,0.5)]">
            Ritual Alchemized
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-primary transition-colors rounded-full p-1 -m-1"
            aria-label="Close ritual results"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="space-y-3 font-cormorant">
          <p className="text-lg font-semibold text-center text-slate-200">{results.title}</p>
          <p className="text-sm text-slate-300 leading-relaxed text-center">{results.description}</p>
          
          <div className="pt-3 border-t border-slate-700/70 text-xs">
            <h4 className="font-semibold text-slate-400 mb-1">Glyph Composition:</h4>
            <ul className="list-disc list-inside ml-4 space-y-0.5 text-slate-300">
              {results.glyphSummary.core > 0 && <li>Core Glyphs: {results.glyphSummary.core}</li>}
              {results.glyphSummary.resonator > 0 && <li>Resonators: {results.glyphSummary.resonator}</li>}
              {results.glyphSummary.gate > 0 && <li>Gates: {results.glyphSummary.gate}</li>}
              {results.glyphSummary.nodePotential > 0 && <li>Nodes of Potential: {results.glyphSummary.nodePotential}</li>}
              {results.glyphSummary.nodeEntropy > 0 && <li>Nodes of Entropy: {results.glyphSummary.nodeEntropy}</li>}
              {results.glyphSummary.nodeOrder > 0 && <li>Nodes of Order: {results.glyphSummary.nodeOrder}</li>}
            </ul>
            <p className="mt-1"><strong className="text-slate-400">Connections Woven:</strong> {results.connectionCount}</p>
          </div>

          <div className={`mt-2 text-center font-semibold text-sm p-2 rounded-md border ${getEnergyColor(results.energyLevel)} border-current/30 bg-current/10`}>
            Energy Signature: <span className="uppercase">{results.energyLevel}</span>
          </div>
        </div>

        <button 
            onClick={onClose}
            className="mt-6 w-full py-2 px-4 rounded-button bg-primary hover:bg-indigo-700 text-white transition-colors text-sm font-medium"
        >
            Acknowledge & Return to Codex
        </button>
      </div>
      {/* The <style jsx> tag was removed from here. 
          The animation class "animate-fade-in-up" now relies on a global CSS definition.
          If the animation is not defined globally, it will not work, but the TypeScript error is resolved.
          Example global CSS for the animation:
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
          }
      */}
    </div>
  );
};

export default RitualAlchemyResultsModal;
