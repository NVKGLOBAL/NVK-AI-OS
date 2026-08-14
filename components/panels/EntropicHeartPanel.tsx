
import React from 'react';
import type { EntropicHeartPanelProps } from '../../types';

const EntropicHeartPanel: React.FC<EntropicHeartPanelProps> = ({ currentEntropy }) => {
  const getEntropyColor = (entropy: number): string => {
    if (entropy < 0.15) return 'bg-cyan-500'; // Calm
    if (entropy < 0.3) return 'bg-sky-500';
    if (entropy < 0.45) return 'bg-indigo-500';
    if (entropy < 0.6) return 'bg-purple-600';
    if (entropy < 0.75) return 'bg-pink-600';
    return 'bg-red-700'; // Volatile
  };

  const getPulseGaugeStyle = (entropy: number): React.CSSProperties => {
    const circumference = 2 * Math.PI * 45; // Assuming radius of 45 for the gauge track
    const dashoffset = circumference * (1 - Math.min(entropy, 1)); // Cap entropy at 1 for gauge
    return {
      strokeDasharray: `${circumference}`,
      strokeDashoffset: `${dashoffset}`,
      transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.5s ease-out',
    };
  };
  
  const orbColor = getEntropyColor(currentEntropy);
  const orbShadowIntensity = Math.min(currentEntropy * 1.5, 1); // Cap shadow intensity

  return (
    <div className="entropic-heart-panel bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-2xl text-center my-8">
      <h3 className="text-xl font-['Cinzel'] font-bold text-slate-100 mb-6">Entropic Heart Monitor</h3>
      
      <div className="relative w-48 h-48 mx-auto mb-6">
        {/* Pulse Gauge Ring (SVG) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Track */}
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="rgba(71, 85, 105, 0.5)" // slate-700 with opacity
            strokeWidth="6"
          />
          {/* Fill */}
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={orbColor.replace('bg-', 'text-').slice(0,-4)+'-500'} // Convert bg to text color for stroke
            strokeWidth="6"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={getPulseGaugeStyle(currentEntropy)}
          />
        </svg>

        {/* Central Orb */}
        <div 
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full transition-all duration-500 ease-in-out ${orbColor}`}
          style={{
            boxShadow: `0 0 ${10 + orbShadowIntensity * 25}px ${orbColor.replace('bg-','shadow-').slice(0,-4)+'-500'}, inset 0 0 10px rgba(255,255,255,0.1)`,
            animation: currentEntropy > 0.6 ? `pulse-opacity ${1.5 - currentEntropy}s infinite` : 'none'
          }}
        >
          {/* Inner glare */}
          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-white/10 rounded-full blur-md"></div>
        </div>
      </div>

      <div className="font-mono text-3xl font-bold text-slate-50">
        {(currentEntropy || 0).toFixed(3)}<span className="text-xl text-slate-400">δ</span>
      </div>
      <p className="text-sm text-slate-400 mt-1 font-['Cormorant']">
        {currentEntropy < 0.15 && "System Stable. Low Fluctuation."}
        {currentEntropy >= 0.15 && currentEntropy < 0.45 && "Minor Entropic Drift Detected."}
        {currentEntropy >= 0.45 && currentEntropy < 0.75 && "Significant Entropic Pressure. Caution Advised."}
        {currentEntropy >= 0.75 && "Critical Entropy Levels! System Integrity Unstable."}
      </p>
      {/* Placeholder for NVK Resonance FX and Threshold Alert - to be implemented later */}
    </div>
  );
};

export default EntropicHeartPanel;
