import React, { useRef, useEffect, useMemo } from 'react';
import type { CodexCommunionChamberProps, EchoMessage } from '../../types';
import { AgentName } from '../../types';
// Removed VoiceEngine and VoiceProfile imports as they are not used here for now

export const CodexCommunionChamber: React.FC<CodexCommunionChamberProps> = ({
  echoes,
  // voiceEngine, // Not needed if Obelisk handles audio
  // voiceProfiles, // Not needed if Obelisk handles audio
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredEchoes = useMemo(() => {
    return echoes.filter(
      echo => echo.source === AgentName.Seeker || echo.source === AgentName.TheCodexPersona
    ).slice(-20); // Keep it a bit shorter if it's a secondary display
  }, [echoes]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredEchoes]);

  return (
    <div className="codex-communion-chamber-display bg-slate-800/[.02] border border-purple-800/50 rounded-lg shadow-lg p-3 mt-3 text-slate-100 flex flex-col" style={{ minHeight: '200px', maxHeight: '300px' }}>
      <h4 className="text-sm font-['Cinzel'] font-semibold text-purple-300 mb-2 text-center border-b border-purple-700/40 pb-1">
        Communion Echoes
      </h4>
      
      <div className="conversation-log flex-grow overflow-y-auto custom-scrollbar-thin space-y-2 pr-1">
        {filteredEchoes.length === 0 && (
          <p className="text-slate-500 italic text-center py-3 text-xs">Awaiting dialogue...</p>
        )}
        {filteredEchoes.map((echo, index) => (
          <div key={`chamber-echo-${echo.id || index}`} className={`flex ${echo.source === AgentName.Seeker ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] p-2 rounded-md text-xs shadow ${
                echo.source === AgentName.Seeker
                  ? 'bg-indigo-600/70 text-indigo-100 rounded-br-none'
                  : 'bg-slate-600/70 text-slate-200 rounded-bl-none'
              }`}
            >
              <span className={`font-semibold block text-[10px] mb-0.5 opacity-80 ${echo.source === AgentName.Seeker ? 'text-indigo-300' : 'text-purple-400'}`}>
                {echo.source === AgentName.Seeker ? "Seeker" : "ΔΘ Codexa"}
              </span>
              <p className="whitespace-pre-wrap text-[11px] leading-snug">{echo.text}</p>
              {/* "Play Audio" button is intentionally omitted here to avoid duplication with CodexObeliskPanel */}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
