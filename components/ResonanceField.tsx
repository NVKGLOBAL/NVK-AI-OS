

import React from 'react';
import type { ResonanceEffect } from '../types';

interface ResonanceFieldProps {
  effects: ResonanceEffect[];
}

export const ResonanceField: React.FC<ResonanceFieldProps> = ({ effects }) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg font-semibold text-slate-200 font-['Cinzel']">Active Resonance Effects</div>
        <div className="flex space-x-3">
          <button className="rounded-button bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-sm transition whitespace-nowrap flex items-center">
            <i className="ri-filter-3-line mr-1"></i>Filter
          </button>
          <button className="rounded-button bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-sm transition whitespace-nowrap flex items-center">
            <i className="ri-refresh-line mr-1"></i>Refresh
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {effects.map((effect) => (
          <div key={effect.id} className={`bg-slate-800 rounded p-4 border-l-4 ${effect.borderColorClass}`}>
            <div className="flex justify-between">
              <div className={`${effect.textColorClass} text-sm uppercase tracking-wider font-['Cinzel']`}>{effect.source}</div>
              <div className="text-slate-400 text-sm">{effect.time}</div>
            </div>
            <div className="text-slate-200 mt-1 font-['Cormorant']">{effect.text}</div>
            <div className="flex justify-between items-center mt-3">
              <div className="text-xs text-slate-400">Intensity: <span className={effect.valueColorClass}>{(effect?.intensity || 0).toFixed(2)}</span></div>
              <div className="text-xs text-slate-400">Duration: <span className={effect.valueColorClass}>{effect.duration}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};