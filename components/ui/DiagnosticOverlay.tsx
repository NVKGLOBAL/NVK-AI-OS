
import React from 'react';
import type { EchoSpeechProps } from '../../types'; // Assuming EchoSpeechProps is in types
import { AgentName } from '../../types';

interface DiagnosticOverlayProps {
  activeSpeechNodes: EchoSpeechProps[];
}

const getAgentColorClass = (agent: EchoSpeechProps['agent']): string => {
  switch (agent) {
    case AgentName.DeepSeek:
      return 'bg-rose-600'; // Crimson-like
    case AgentName.Gemini:
      return 'bg-sky-400'; // Cyan-like
    case AgentName.Nevik:
      return 'bg-amber-400'; // Amber-like
    default:
      return 'bg-slate-500';
  }
};

const DiagnosticOverlay: React.FC<DiagnosticOverlayProps> = ({ activeSpeechNodes }) => {
  // Display latest 5 echoes, newest on top
  const recentEchoes = activeSpeechNodes.slice(-5).reverse();

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 p-3 rounded-lg shadow-xl max-w-xs w-full mx-auto my-6">
      <h3 className="text-amber-300 font-mono text-sm mb-2 border-b border-slate-700 pb-1">✦ Echo Resonance Tracker</h3>
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {recentEchoes.length === 0 && (
          <p className="text-xs font-mono text-slate-500 italic">No active visual echoes.</p>
        )}
        {recentEchoes.map(echo => (
          <div key={echo.id} className="flex items-center bg-slate-800/50 p-1.5 rounded">
            <span className={`w-2.5 h-2.5 mr-2 rounded-full flex-shrink-0 ${getAgentColorClass(echo.agent)}`}></span>
            <span className="text-xs font-mono text-slate-300 truncate" title={`${echo.agent}: ${echo.message}`}>
              <strong className="font-semibold">{echo.agent.substring(0,4)}:</strong> {echo.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiagnosticOverlay;
