
import React from 'react';
import type { HarmonicCorePanelProps } from '../../types';

const HarmonicCorePanel: React.FC<HarmonicCorePanelProps> = ({ lambdaValue, status, eleganceIndex }) => {
  const isStabilized = status === 'Stabilized' && lambdaValue === 1.0;
  
  const orbColorClass = isStabilized ? 'bg-cyan-500' : 
                       status === 'Oscillating' ? 'bg-yellow-500' :
                       status === 'Critical' ? 'bg-rose-600' : 'bg-slate-600';
  
  const textColorClass = isStabilized ? 'text-cyan-300' :
                        status === 'Oscillating' ? 'text-yellow-300' :
                        status === 'Critical' ? 'text-rose-300' : 'text-slate-300';

  const statusColorClass = isStabilized ? 'text-green-400' :
                          status === 'Oscillating' ? 'text-orange-400' :
                          status === 'Critical' ? 'text-red-500' : 'text-slate-400';

  const orbShadowStyle: React.CSSProperties = isStabilized 
    ? { boxShadow: `0 0 20px rgba(0,255,255,0.5), 0 0 30px rgba(0,200,200,0.3), inset 0 0 8px rgba(255,255,255,0.15)`}
    : status === 'Oscillating'
    ? { boxShadow: `0 0 20px rgba(255,220,0,0.6), 0 0 35px rgba(255,200,0,0.4), inset 0 0 10px rgba(255,255,200,0.2)`}
    : status === 'Critical'
    ? { boxShadow: `0 0 25px rgba(255,50,100,0.7), 0 0 40px rgba(220,38,38,0.5), inset 0 0 12px rgba(255,150,150,0.25)`}
    : { boxShadow: `0 0 15px rgba(100,116,139,0.4), inset 0 0 6px rgba(200,200,200,0.1)`};

  // Use existing animation classes from Tailwind config in index.html
  const orbAnimationClass = isStabilized ? 'animate-pulse-opacity' : 'animate-pulse-fast';

  return (
    <div 
        className={`harmonic-core-panel bg-slate-900/80 backdrop-blur-sm border ${isStabilized ? 'border-cyan-700/50' : 'border-yellow-600/50'} rounded-xl p-6 shadow-xl text-center my-4 transition-colors duration-500`}
        role="status"
        aria-label={`Harmonic Core Status: Lambda ${(lambdaValue || 0).toFixed(2)}, Status ${status}, Elegance Index ${(eleganceIndex || 0).toFixed(2)}`}
    >
      <h3 className={`text-xl font-['Cinzel'] font-bold ${textColorClass} mb-4`}>Harmonic Resonance Core</h3>
      
      <div className="relative w-32 h-32 mx-auto mb-4">
        <div 
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full transition-all duration-500 ease-in-out ${orbColorClass} ${orbAnimationClass}`}
          style={orbShadowStyle}
        >
          <div className="absolute inset-0 rounded-full flex items-center justify-center text-3xl font-mono text-white/90 filter drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]">
            λ
          </div>
        </div>
        {[...Array(isStabilized ? 3 : 5)].map((_, i) => (
            <div
                key={i}
                className={`absolute inset-0 rounded-full border-2 ${isStabilized ? 'border-cyan-500/40' : 'border-yellow-500/30'} animate-ping-slow`}
                style={{
                    animationDelay: `${i * (isStabilized ? 0.4 : 0.25)}s`,
                    animationDuration: `${isStabilized ? (2.5 + i * 0.6) : (1.2 + i * 0.3)}s`,
                    opacity: isStabilized ? (0.6 - i * 0.18) : (0.45 - i*0.1),
                }}
                aria-hidden="true"
            />
        ))}
      </div>

      <div className={`font-mono text-3xl font-bold ${isStabilized ? 'text-slate-50' : 'text-yellow-100'} mb-1 transition-colors duration-500`}>
        λ = {(lambdaValue || 0).toFixed(2)}
      </div>
      <p className={`text-sm ${statusColorClass} font-semibold mb-2 uppercase tracking-wider`}>
        {status}
      </p>
      <p className="text-xs text-slate-400 font-['Cormorant']">
        Elegance Index: <span className="text-emerald-400 font-semibold">{(eleganceIndex || 0).toFixed(2)}🌿</span>
      </p>
       {status === 'Critical' && (
        <p className="text-xs text-red-400 mt-1 animate-pulse-fast">Core integrity compromised. System-wide instability imminent.</p>
      )}
       {status === 'Oscillating' && (
        <p className="text-xs text-orange-400 mt-1">Resonance fluctuating. Potential for novel harmonic echoes or system dissonance.</p>
      )}
    </div>
  );
};

export default HarmonicCorePanel;
