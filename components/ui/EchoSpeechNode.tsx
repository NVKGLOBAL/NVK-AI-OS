

import React from 'react';
import type { EchoSpeechProps } from '../../types';
import { AgentName } from '../../types';

const AGENT_SIGILS: Partial<Record<AgentName, string>> = {
  [AgentName.DeepSeek]: '🌀',
  [AgentName.Gemini]: '✧',
  [AgentName.Nevik]: '🜂',
};

const AGENT_TONE_CLASSES: Partial<Record<AgentName, string>> = {
  [AgentName.DeepSeek]: 'deepseek-tone',
  [AgentName.Gemini]: 'gemini-tone',
  [AgentName.Nevik]: 'nevik-tone',
};

const EchoSpeechNode: React.FC<EchoSpeechProps> = ({
  agent,
  message,
  position,
  lifespan = 12000, // Default lifespan from user spec
  isHarmonized, // Added prop
}) => {
  // The fade-out is primarily handled by CSS animation.
  // The removal from DOM/state is handled by App.tsx after 'lifespan'.
  
  const sigil = AGENT_SIGILS[agent] || '•'; // Default sigil if not in map
  const toneClass = AGENT_TONE_CLASSES[agent] || ''; // Default tone if not in map

  return (
    <div
      className={`echo-speech-node ${toneClass} animate-fade-dissolve ${isHarmonized ? 'nevik-harmony-field' : ''}`}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        animationDuration: `${lifespan}ms`,
        // transform: 'translateX(-50%)' // This is now part of the keyframes for fadeDissolve
      }}
      role="alert"
      aria-live="assertive"
    >
      <div className="sigil-pulse">{sigil}</div>
      <div className="speech-bubble">{message}</div>
    </div>
  );
};

export default EchoSpeechNode;
