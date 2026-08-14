


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { PlaybackState, HistoricalEvent } from '../types';
import { HistoricalEventType } from '../types';
// Corrected imports:
// whisperRegistry, extractTemporalWhispers, AgentWhisper are from WhisperRegistry.ts
import { whisperRegistry, extractTemporalWhispers, type AgentWhisper } from '../lib/whisper/WhisperRegistry'; 
// voiceProfiles and VoiceProfile type are from VoiceRegistry.ts
import { voiceProfiles, type VoiceProfile } from '../lib/whisper/VoiceRegistry'; 
import { VoiceEngine } from '../lib/whisper/VoiceEngine';

// Instantiate VoiceEngine once
const voiceEngine = new VoiceEngine();

export const useTemporalWhispers = (
  eventHistory: HistoricalEvent[],
  setPlaybackState: React.Dispatch<React.SetStateAction<PlaybackState>>
) => {
  const [temporalWhispers, setTemporalWhispers] = useState<AgentWhisper[]>([]);

  useEffect(() => {
    if (eventHistory.length > 0) {
      const extracted = extractTemporalWhispers(eventHistory, whisperRegistry);
      setTemporalWhispers(extracted);
    } else {
      setTemporalWhispers([]);
    }
  }, [eventHistory]);

  const playAudio = useCallback(async (whisper: AgentWhisper) => {
    if (!whisper || !whisper.message) {
      console.warn("useTemporalWhispers: playAudio called with invalid whisper object.", whisper);
      return;
    }

    let profile: VoiceProfile | undefined = voiceProfiles.find(p => p.agent === whisper.agent);
    
    if (!profile) {
      console.warn(`Voice profile not found for agent: ${whisper.agent}. Using default.`);
      profile = voiceProfiles.find(p => p.agent === 'SystemDebug'); 
    }
    
    if (!profile) { 
        console.error("Default voice profile is missing. Cannot play audio.");
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(whisper.message);
            window.speechSynthesis.speak(utterance);
        }
        return;
    }

    try {
      await voiceEngine.speak(whisper.message, profile);
    } catch (error) {
      console.error('useTemporalWhispers: Voice synthesis failed for whisper:', whisper.id, error);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        console.warn('useTemporalWhispers: Falling back to basic browser TTS.');
        try {
          const utterance = new SpeechSynthesisUtterance(whisper.message);
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn("Basic browser TTS fallback was blocked:", e);
        }
      } else {
        console.warn(`Audio Playback Error for ${whisper.agent}: ${whisper.message.substring(0, 100)}...`);
      }
    }
  }, []); 

  const seekToTime = useCallback((timestamp: number) => {
    setPlaybackState(prev => ({
      ...prev,
      currentHistoricalTime: timestamp,
      isActive: false, 
    }));
  }, [setPlaybackState]);

  return { temporalWhispers, playAudio, seekToTime };
};