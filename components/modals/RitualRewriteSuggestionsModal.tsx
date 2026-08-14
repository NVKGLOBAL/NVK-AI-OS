
import React from 'react';
import type { RitualRewriteSuggestionsModalProps } from '../../types';

const RitualRewriteSuggestionsModal: React.FC<RitualRewriteSuggestionsModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  isLoading,
  onApplySuggestion,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[2100] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rewrite-suggestions-title"
    >
      <div className="bg-slate-800/95 border border-sky-500/70 rounded-lg shadow-2xl p-6 w-full max-w-lg text-slate-100 transform transition-all duration-300 ease-out scale-95 group-hover:scale-100 animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
          <h2 id="rewrite-suggestions-title" className="text-xl font-cinzel text-sky-300 drop-shadow-[0_1px_1px_rgba(56,189,248,0.5)]">
            Ritual Rewrite Oracle
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-sky-300 transition-colors rounded-full p-1 -m-1"
            aria-label="Close rewrite suggestions"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="suggestions-content min-h-[200px] max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 bg-slate-900/50 p-3 rounded-md border border-slate-700">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-sky-300/70">
              <div className="animate-spin-slow rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-400 mb-3"></div>
              <p className="text-sm font-cormorant">Oracle is contemplating the weave...</p>
            </div>
          )}
          {!isLoading && suggestions && (
            <div className="whitespace-pre-wrap text-sm text-slate-200 font-cormorant leading-relaxed">
              {suggestions.split('*').map((suggestionPart, index) => {
                if (index === 0 && suggestionPart.trim() === '') return null; // Skip empty part before first asterisk
                if (suggestionPart.trim() === '') return null;
                const [titleLine, ...rationaleLines] = suggestionPart.trim().split('\n');
                const isSuggestionTitle = titleLine.toLowerCase().includes('suggestion:');
                const isRationaleTitle = titleLine.toLowerCase().includes('rationale:');

                return (
                  <div key={index} className={`my-2.5 ${index > 0 ? 'pt-2.5 border-t border-slate-700/50' : ''}`}>
                    {titleLine && (
                       <p className={`font-semibold ${isSuggestionTitle ? 'text-sky-300' : isRationaleTitle ? 'text-sky-400/80' : 'text-slate-100'}`}>
                         {isSuggestionTitle || isRationaleTitle ? titleLine : `* ${titleLine}`}
                       </p>
                    )}
                    {rationaleLines.length > 0 && (
                      <p className="text-slate-300/90 text-xs pl-3">{rationaleLines.join('\n')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!isLoading && !suggestions && (
            <p className="text-slate-500 italic text-center py-4">No suggestions available or an error occurred.</p>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
                onClick={() => suggestions && onApplySuggestion(suggestions)} // Pass all suggestions for conceptual logging
                disabled={isLoading || !suggestions || suggestions.includes("Oracle's vision is obscured")}
                className="flex-1 py-2 px-4 rounded-button bg-sky-600 hover:bg-sky-500 text-white transition-colors text-sm font-medium disabled:bg-slate-600 disabled:text-slate-400"
            >
                Consider This Path
            </button>
            <button 
                onClick={onClose}
                className="flex-1 py-2 px-4 rounded-button bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-sm font-medium"
            >
                Dismiss
            </button>
        </div>
      </div>
      {/* Add animation styles globally if not already present */}
    </div>
  );
};

export default RitualRewriteSuggestionsModal;
