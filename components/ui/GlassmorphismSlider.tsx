import React, { useState, useRef, useEffect } from 'react';

interface GlassmorphismSliderProps {
  opacity: number;
  onChange: (value: number) => void;
  className?: string;
  align?: 'left' | 'right';
  label?: string;
}

export const GlassmorphismSlider: React.FC<GlassmorphismSliderProps> = ({
  opacity,
  onChange,
  className = '',
  align = 'right',
  label = 'Master Transparency'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const percentage = Math.round((opacity ?? 0.8) * 100);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-6 h-6 rounded flex items-center justify-center transition-all cursor-pointer ${
          isOpen ? 'text-cyan-400 bg-white/10 ring-1 ring-cyan-500/30' : 'text-slate-500 hover:text-slate-200'
        }`}
        title="Adjust panel transparency and glassmorphism levels"
      >
        <i className="ri-contrast-drop-2-line text-xs"></i>
      </button>

      {isOpen && (
        <div 
          className={`absolute top-full mt-1.5 w-60 bg-slate-950/95 backdrop-blur-xl border border-white/15 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.9)] p-3 z-[1500] animate-fade-in ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase tracking-widest pb-1.5 border-b border-white/5 mb-2.5">
            <span className="flex items-center gap-1 font-bold">
              <i className="ri-blur-line text-cyan-400"></i> {label}
            </span>
            <span className="text-cyan-400 font-semibold bg-cyan-950/40 px-1 py-0.5 rounded leading-none">
              {percentage}%
            </span>
          </div>

          {/* Slider Row */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase">
              <span>Ghost</span>
              <span>Solid</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="ri-eye-off-line text-[10px] text-slate-600"></i>
              <input
                type="range"
                min="0.10"
                max="1.00"
                step="0.05"
                value={opacity ?? 0.8}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="flex-grow w-full h-1 bg-slate-900 rounded-full appearance-none cursor-pointer accent-cyan-500"
              />
              <i className="ri-eye-line text-[10px] text-cyan-400"></i>
            </div>
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-4 gap-1 mt-3">
            {[0.12, 0.40, 0.70, 0.95].map((presetVal) => {
              let tag = 'SOLID';
              if (presetVal === 0.12) tag = 'GHOST';
              else if (presetVal === 0.40) tag = 'GLASS';
              else if (presetVal === 0.70) tag = 'MID';

              const isActive = Math.abs(presetVal - (opacity ?? 0.8)) < 0.04;

              return (
                <button
                  key={presetVal}
                  type="button"
                  onClick={() => onChange(presetVal)}
                  className={`py-0.5 text-[8px] font-mono rounded border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 font-semibold shadow-[0_0_8px_rgba(6,182,212,0.1)]'
                      : 'bg-transparent text-slate-500 border-white/5 hover:bg-white/5 hover:text-slate-300'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Live Engine Diagnostic readout info */}
          <div className="mt-3.5 pt-2 border-t border-white/5 flex flex-col gap-0.5 font-mono text-[7.5px] text-slate-500">
            <div className="flex justify-between">
              <span>Surface Refraction:</span>
              <span className="text-slate-400">
                {(opacity ?? 0.8) === 1.0 ? '0px px' : `${Math.round(Math.max(2, (1.1 - (opacity ?? 0.8)) * 16))}px blur`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Reflection Tint:</span>
              <span className="text-slate-400">{(1.0 - (opacity ?? 0.8)).toFixed(2)} index</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
