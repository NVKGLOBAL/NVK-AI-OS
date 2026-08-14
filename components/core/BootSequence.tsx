
import React, { useState, useEffect } from 'react';

interface BootSequenceProps {
  onComplete: () => void;
}

const LOG_LINES = [
  "INITIALIZING NVK CORE...",
  "VERIFYING ETHICAL FRAMEWORKS...",
  "OPTIMIZING OPERATIONAL EFFICIENCY...",
  "ESTABLISHING SECURE CONNECTIONS...",
  "LOADING BUSINESS INTELLIGENCE...",
  "SYNCING COLLABORATION TOOLS...",
  "FINALIZING TRANSPARENCY LOGS...",
  "SYSTEM READY."
];

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let lineIndex = 0;
    const lineInterval = setInterval(() => {
      if (lineIndex < LOG_LINES.length) {
        setLines(prev => [...prev, LOG_LINES[lineIndex]]);
        lineIndex++;
        setProgress(prev => prev + (100 / LOG_LINES.length));
      } else {
        clearInterval(lineInterval);
        setIsReady(true);
        setProgress(100);
      }
    }, 400); // Speed of text scroll

    return () => clearInterval(lineInterval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center text-cyan-500 font-mono overflow-hidden cursor-default select-none">
      <div className="w-full max-w-2xl p-8 relative">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-12 animate-pulse">
          <div className="text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-700 mb-2 font-['Orbitron']">
            NVK OS
          </div>
          <div className="text-xs tracking-[0.5em] text-cyan-600 uppercase">Angelic Business Operations</div>
        </div>

        {/* Terminal Log */}
        <div className="h-48 overflow-hidden mb-8 border-l-2 border-cyan-900/50 pl-4 relative">
            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black to-transparent z-10"></div>
            <div className="flex flex-col justify-end h-full">
                {lines.map((line, i) => (
                    <div key={i} className="text-sm md:text-base mb-1 opacity-80">
                        <span className="text-cyan-700 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        <span className={i === lines.length - 1 ? "text-cyan-300 font-bold" : "text-cyan-500"}>{line}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-cyan-900/30 rounded-full mb-8 overflow-hidden">
          <div 
            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Interaction Button */}
        <div className="h-16 flex items-center justify-center">
          {isReady ? (
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-cyan-900/20 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500 hover:text-black hover:border-cyan-400 transition-all duration-200 font-['Cinzel'] tracking-widest uppercase text-lg shadow-[0_0_15px_rgba(6,182,212,0.2)] group"
            >
              <span className="group-hover:animate-pulse">Launch Workspace</span>
            </button>
          ) : (
             <span className="text-xs text-cyan-700 animate-pulse">SYSTEM BOOTING...</span>
          )}
        </div>

        {/* Footer Metadata */}
        <div className="absolute bottom-2 left-0 w-full text-center text-[10px] text-cyan-900">
            NVK OS | ETHICAL & TRANSPARENT | v2.4.0
        </div>
      </div>
    </div>
  );
};

export default BootSequence;
