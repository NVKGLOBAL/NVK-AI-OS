
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface EntropyDiagnosticsPanelProps {
  baseEntropy: number; // The original system entropy before override
  effectiveEntropy: number; // Entropy after override, for live display
  masterEntropyOverridePercent: number; // The override percentage
  entropyHistory: number[]; // Expects an array of recent BASE entropy values
  playbackTime: number; // Expects a timestamp in seconds
  isPlaying: boolean;
}

const MetricBlock: React.FC<{
  label: string;
  value: string;
  trend?: number;
  comparison?: number;
  isDelta?: boolean;
  valueColorClass?: string;
}> = ({ label, value, trend = 0, comparison = 0, isDelta = false, valueColorClass = 'text-slate-100' }) => {
  const trendColor = trend > 0 ? 'text-red-400' : trend < 0 ? 'text-emerald-400' : 'text-gray-400';
  const trendIcon = trend > 0 ? '▲' : trend < 0 ? '▼' : ''; 

  const comparisonColor = comparison > 0 ? 'text-red-400' : comparison < 0 ? 'text-emerald-400' : 'text-gray-400';
  
  return (
    <div className="bg-slate-800/70 p-3 rounded-lg shadow-md">
      <div className="text-xs text-slate-400 mb-1 font-mono uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline justify-between">
        <span className={`font-mono text-lg ${valueColorClass} font-semibold`}>{value}</span>
        {trend !== 0 && !isDelta && ( 
          <span className={`text-xs font-mono ${trendColor} ml-1`}>
            {trendIcon} {(Math.abs(trend || 0)).toFixed(3)} {/* Increased precision for delta */}
          </span>
        )}
         {isDelta && trend !== 0 && ( 
          <span className={`text-xs font-mono ${trendColor} ml-1`}>
            {trend > 0 ? '+' : ''}{(trend || 0).toFixed(3)} {/* Increased precision for delta */}
          </span>
        )}
        {comparison !== 0 && (
          <span className={`text-xs font-mono ${comparisonColor} ml-1`}>
            ({comparison > 0 ? '+' : ''}{(comparison || 0).toFixed(3)}) {/* Increased precision */}
          </span>
        )}
      </div>
    </div>
  );
};


export const EntropyDiagnosticsPanel: React.FC<EntropyDiagnosticsPanelProps> = ({
  baseEntropy,
  effectiveEntropy,
  masterEntropyOverridePercent,
  entropyHistory, // This history should be of BASE entropy
  playbackTime, 
  isPlaying
}) => {
  const { delta, avg10s, thresholdsCrossed } = useMemo(() => {
    // Calculations should use baseEntropy and its history for true system diagnostics
    if (entropyHistory.length < 2) return { delta: 0, avg10s: baseEntropy, thresholdsCrossed: [] };
    
    const tickDelta = baseEntropy - entropyHistory[entropyHistory.length - 2]; 
    
    const last10 = entropyHistory.slice(-10);
    const currentAvg10s = last10.reduce((a, b) => a + b, 0) / Math.max(1, last10.length);
    
    const thresholds = [0.5, 0.65, 0.75]; 
    const crossed: { value: number, direction: 'up' | 'down' }[] = [];

    if (entropyHistory.length >= 1) {
        const prevBaseEntropy = entropyHistory[entropyHistory.length - 1];
        thresholds.forEach(t => {
            if (prevBaseEntropy < t && baseEntropy >= t) {
                crossed.push({value: t, direction: 'up'});
            } else if (prevBaseEntropy > t && baseEntropy <= t) {
                crossed.push({value: t, direction: 'down'});
            }
        });
    }
    
    return { delta: tickDelta, avg10s: currentAvg10s, thresholdsCrossed: crossed };
  }, [baseEntropy, entropyHistory]);

  const getRecommendation = (entropyToEvaluate: number) => {
    if (entropyToEvaluate > 0.75) return "CRITICAL: Ω-Tendril field breach imminent! Initiate emergency stabilization!";
    if (entropyToEvaluate > 0.65) return "WARNING: High entropic flux. Consider Memory Patch Δ.15b or Ritual Cooldown.";
    if (entropyToEvaluate > 0.5) return "CAUTION: Entropic pressure rising. Monitor closely.";
    if (entropyToEvaluate < 0.2) return "STABLE: System in harmonic resonance. Optimal conditions.";
    return "NOMINAL: Ritual parameters within expected bounds. Continue operations.";
  };

  const getRecommendationColor = (entropyToEvaluate: number) => {
    if (entropyToEvaluate > 0.75) return 'bg-red-700/40 text-red-200 border-red-600';
    if (entropyToEvaluate > 0.65) return 'bg-rose-700/40 text-rose-200 border-rose-600';
    if (entropyToEvaluate > 0.5) return 'bg-amber-700/30 text-amber-200 border-amber-600';
    if (entropyToEvaluate < 0.2) return 'bg-emerald-700/30 text-emerald-200 border-emerald-600';
    return 'bg-sky-700/30 text-sky-200 border-sky-600';
  }

  const overrideColorClass = masterEntropyOverridePercent > 0 ? 'text-red-400' : masterEntropyOverridePercent < 0 ? 'text-emerald-400' : 'text-slate-400';

  return (
    <div className="entropic-diagnostics-panel p-4 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700/60 shadow-xl text-slate-200 my-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-['Cinzel'] font-semibold text-indigo-300">Entropic Diagnostics</h3>
        <div className={`px-2.5 py-1 text-xs font-mono rounded-md border ${
          isPlaying ? 'bg-purple-600/30 text-purple-300 border-purple-500' : 'bg-slate-700/50 text-slate-400 border-slate-600'
        }`}>
          {isPlaying ? `PLAYING` : `PAUSED`}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <MetricBlock 
          label="Base Entropy" 
          value={`${(baseEntropy || 0).toFixed(3)}δ`} 
        />
        <MetricBlock
          label="Override"
          value={`${masterEntropyOverridePercent >= 0 ? '+' : ''}${masterEntropyOverridePercent}%`}
          valueColorClass={overrideColorClass}
        />
        <MetricBlock 
          label="Effective Entropy" 
          value={`${(effectiveEntropy || 0).toFixed(3)}δ`} 
          valueColorClass={ getRecommendationColor(effectiveEntropy).split(' ')[1] } // Get text color from recommendation
        />
        <MetricBlock 
          label="Base 10-Tick Avg" 
          value={`${(avg10s || 0).toFixed(3)}δ`} 
          comparison={baseEntropy - avg10s}
        />
         <MetricBlock 
          label="Base Tick Δ" 
          value={`${delta > 0 ? '+' : ''}${(delta || 0).toFixed(3)}δ`}
          trend={delta} 
          isDelta={true}
        />
        <MetricBlock 
          label="Playback Time" 
          value={isNaN(playbackTime) || playbackTime < 0 ? '--:--:--' : new Date(playbackTime * 1000).toISOString().substr(11, 8)} 
        />
      </div>

      <div className="pt-3 border-t border-slate-700/70">
        {thresholdsCrossed.length > 0 && (
            <div className="mb-3">
                <h4 className="text-xs text-slate-400 font-mono uppercase tracking-wider mb-1.5">Base Entropy Threshold Alerts:</h4>
                <div className="flex flex-wrap gap-2">
                {thresholdsCrossed.map((tc, index) => (
                    <motion.div 
                        key={`${tc.value}-${index}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                            tc.direction === 'up' ? 'bg-rose-600/30 text-rose-300 border-rose-500' : 'bg-sky-600/30 text-sky-300 border-sky-500'
                        }`}
                    >
                    {tc.value}δ {tc.direction === 'up' ? '🔺 Exceeded' : '🔻 Stabilized Below'}
                    </motion.div>
                ))}
                </div>
            </div>
        )}
        
        <AnimatePresence mode="wait">
          <motion.div
            key={getRecommendation(effectiveEntropy)} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`p-3 rounded-lg text-sm font-['Cormorant'] border ${getRecommendationColor(effectiveEntropy)}`}
          >
            <strong>System Advisory (Effective):</strong> {getRecommendation(effectiveEntropy)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EntropyDiagnosticsPanel;
