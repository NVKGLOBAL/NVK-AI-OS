import React, { useEffect, useRef, useState } from 'react';
import type { EchoMessage } from '../types';
import type { WhisperEventDetail } from '../lib/whisper/EchoScribeWhisperSystem'; 
import { VoiceEngine } from '../lib/whisper/VoiceEngine'; 
import { voiceProfiles, type VoiceProfile } from '../lib/whisper/VoiceRegistry'; 
import type { AgentPersona } from '../lib/whisper/WhisperRegistry'; 

interface EchoScribePanelProps {
  echoes: EchoMessage[]; 
}

export const EchoScribePanel: React.FC<EchoScribePanelProps> = ({ echoes }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeWhisperText, setActiveWhisperText] = useState<string | null>(null);
  const whisperTimeoutRef = useRef<number | null>(null);
  const voiceEngineRef = useRef<VoiceEngine | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false); // State to track if user enabled audio

  useEffect(() => {
    if (typeof window !== 'undefined') {
      voiceEngineRef.current = new VoiceEngine();
    }
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0; 
    }
  }, [echoes]);

  useEffect(() => {
    const handleWhisper = (event: Event) => {
      const customEvent = event as CustomEvent<WhisperEventDetail>; 
      
      if (whisperTimeoutRef.current) {
        clearTimeout(whisperTimeoutRef.current);
      }
      setActiveWhisperText(customEvent.detail.text); 
      
      if (audioEnabled && voiceEngineRef.current) { // Only speak if audio is enabled
        const persona = customEvent.detail.agent;
        const textToSpeak = customEvent.detail.text;

        const profile = voiceProfiles.find(p => p.agent === persona) || 
                        voiceProfiles.find(p => p.agent === 'SystemDebug'); 

        if (profile) {
          voiceEngineRef.current.speak(textToSpeak, profile)
            .catch(err => {
              console.error("TTS Error in EchoScribePanel:", err.message || err);
              // Basic fallback if VoiceEngine fails for some reason (e.g. specific voice error)
              if (typeof window !== 'undefined' && window.speechSynthesis && !String(err).includes("Speech synthesis not supported")) {
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                window.speechSynthesis.speak(utterance);
              }
            });
        } else if (typeof window !== 'undefined' && window.speechSynthesis) {
          console.warn(`No voice profile for ${persona} or VoiceEngine not ready. Using default browser TTS.`);
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          window.speechSynthesis.speak(utterance);
        }
      }

      whisperTimeoutRef.current = window.setTimeout(() => {
        setActiveWhisperText(null);
      }, 7000); 
    };

    window.addEventListener('echo-whisper', handleWhisper);

    return () => {
      window.removeEventListener('echo-whisper', handleWhisper);
      if (whisperTimeoutRef.current) {
        clearTimeout(whisperTimeoutRef.current);
      }
    };
  }, [audioEnabled]);

  return (
    <div className="echo-scribe-panel bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-4 flex flex-col h-[450px]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-['Cinzel'] font-semibold text-slate-200">Echo Scribe Log</h3>
        <button
          onClick={() => {
            if (!audioEnabled) {
              // The first user interaction is required to enable audio context
              voiceEngineRef.current?.speak('', voiceProfiles.find(p => p.agent === 'SystemDebug') || voiceProfiles[0]);
            }
            setAudioEnabled(prev => !prev);
          }}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            audioEnabled
              ? 'bg-red-600/80 hover:bg-red-500/80 text-white'
              : 'bg-green-600/80 hover:bg-green-500/80 text-white'
          }`}
          title={audioEnabled ? 'Disable Audio Whispers' : 'Enable Audio Whispers'}
        >
          <i className={`ri-volume-${audioEnabled ? 'mute' : 'up'}-line mr-1`}></i>
          {audioEnabled ? 'Mute' : 'Audio'}
        </button>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-grow overflow-y-auto custom-scrollbar pr-2 -mr-2"
      >
        {echoes.map((echo) => (
          <div key={echo.id} className={`text-xs mb-2 p-1.5 rounded-sm ${echo.isAutoEcho ? 'bg-slate-800/40' : 'bg-transparent'}`}>
            <span className={`font-bold ${echo.colorClass}`}>{echo.source}:</span>
            <span className="text-slate-200 ml-1.5">{echo.text}</span>
          </div>
        ))}
      </div>
      {activeWhisperText && (
        <div className="whisper-display mt-2 p-2 border-t-2 border-fuchsia-500/50 bg-fuchsia-900/30 rounded-b-md">
            <p className="text-sm italic text-fuchsia-200 animate-pulse-fast">{activeWhisperText}</p>
        </div>
      )}
    </div>
  );
};
