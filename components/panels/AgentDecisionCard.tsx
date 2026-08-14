import React, { useState } from 'react';
import type { AgentDecisionOutput } from '../../types';
import { DisclaimerBadge } from '../ui/DisclaimerBadge';

export const AgentDecisionCard: React.FC<{ decision: AgentDecisionOutput; onAction: (action: string) => void }> = ({ decision, onAction }) => {
  const [expanded, setExpanded] = useState(false);

  // Parse safety colors
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-400 border-green-400/30 bg-green-400/5';
    if (score >= 60) return 'text-amber-400 border-amber-400/30 bg-amber-400/5';
    return 'text-red-400 border-red-400/30 bg-red-400/5';
  };

  const getRiskColor = (severity: string) => {
    switch(severity) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'LOW': default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="w-full max-w-2xl bg-[#12121A] border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl font-body relative">
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-white/50 tracking-wider uppercase">{decision.agentId}</span>
            <span className="text-xs text-white/20">•</span>
            <span className="text-xs font-mono text-white/40">{new Date(decision.timestamp || Date.now()).toLocaleTimeString()}</span>
          </div>
          <h2 className="text-lg font-display text-white font-medium leading-snug">
            {decision.summary}
          </h2>
        </div>
        <div className={`px-2.5 py-1 rounded-md border flex items-center justify-center font-mono text-sm font-bold shrink-0 ${getConfidenceColor(decision.confidence)}`}>
          {decision.confidence}%
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Primary Recommendation */}
        <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-lg p-4">
          <h3 className="text-xs font-mono tracking-widest text-[#C9A84C]/80 uppercase mb-2">Primary Recommendation</h3>
          <p className="text-white text-sm leading-relaxed">{decision.recommendation}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {decision.exportReady && (
            <button 
              onClick={() => onAction('EXPORT_BRIEF')}
              className="w-full py-2.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-colors"
            >
              Export Executive Brief (PDF)
            </button>
          )}
          {decision.alternatives?.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <h4 className="text-xs font-mono text-white/40 uppercase mb-1">Alternative Paths</h4>
              {decision.alternatives.map((alt, idx) => (
                <button
                  key={idx}
                  onClick={() => onAction(`ALTERNATIVE_${idx}`)}
                  className="w-full py-2 px-3 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 text-sm text-left transition-colors flex items-center"
                >
                  <span className="opacity-50 mr-3 text-xs">0{idx+1}</span>
                  {alt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Risks */}
        {decision.risks?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
              <h3 className="text-xs font-mono tracking-widest text-white/40 uppercase">Risk Analysis ({decision.risks.length})</h3>
              <svg className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {expanded && (
              <div className="space-y-2 mt-2">
                {decision.risks.map((risk, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded overflow-hidden">
                    <div className="p-2 border-b border-white/5 flex items-center justify-between">
                      <span className="text-xs font-medium text-white/80">{risk.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${getRiskColor(risk.severity)}`}>
                        {risk.severity}
                      </span>
                    </div>
                    <div className="p-2 text-xs text-white/60">
                      <strong className="text-white/40 mr-1">Mitigation:</strong> {risk.mitigation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data Refs & Inputs */}
        {(decision.requiredInputs?.length > 0 || decision.dataReferenced?.length > 0) && expanded && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
            {decision.requiredInputs?.length > 0 && (
              <div>
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-[#4A9EE8] mb-2">Inputs Required</h4>
                <ul className="text-xs text-white/50 space-y-1 list-disc pl-3">
                  {decision.requiredInputs.map((req, i) => <li key={i}>{req}</li>)}
                </ul>
              </div>
            )}
            {decision.dataReferenced?.length > 0 && (
              <div>
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-[#C9A84C] mb-2">Context Referenced</h4>
                <ul className="text-xs text-white/50 space-y-1 list-disc pl-3">
                  {decision.dataReferenced.map((ref, i) => <li key={i}>{ref}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Legal Disclaimer */}
        <DisclaimerBadge content={decision.rawResponse || decision.summary + " " + decision.recommendation} />
        
      </div>
    </div>
  );
};

export default AgentDecisionCard;
