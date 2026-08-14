import type { VoiceProfile } from './VoiceRegistry';
import type { AgentPersona } from './WhisperRegistry'; // Import AgentPersona for type checking clarity

export class VoiceEngine {
  private audioContext: AudioContext | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private voicesLoadedPromise: Promise<void> | null = null;
  private activeAudioObject: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if (window.AudioContext || (window as any).webkitAudioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (window.speechSynthesis) {
        this.voicesLoadedPromise = new Promise((resolve) => {
          const load = () => {
            this.availableVoices = window.speechSynthesis.getVoices();
            if (this.availableVoices.length > 0) {
              resolve();
            } else {
              // Fallback if onvoiceschanged isn't supported or voices are slow to load
              setTimeout(load, 100);
            }
          };
          // Check if voices are already loaded
          if (window.speechSynthesis.getVoices().length > 0) {
            load();
          } else if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = load;
          } else {
            // Fallback for browsers that don't support onvoiceschanged (rare)
             console.warn("VoiceEngine: onvoiceschanged not supported, using timeout for voice loading.");
             setTimeout(load, 250); // Wait a bit and try
          }
        });
      } else {
        console.warn("VoiceEngine: SpeechSynthesis API not supported by this browser.");
        this.voicesLoadedPromise = Promise.resolve(); // Resolve immediately if not supported
      }
    }
  }

  private async _webSpeechSynthesis(text: string, profile: VoiceProfile): Promise<void> {
    await this.voicesLoadedPromise;

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        reject(new Error("Speech synthesis not supported."));
        return;
      }

      window.speechSynthesis.cancel(); // Cancel any ongoing speech

      const utterance = new SpeechSynthesisUtterance(text);

      if (profile.params.voiceName) {
        const selectedVoice = this.availableVoices.find(voice => voice.voiceURI === profile.params.voiceName || voice.name === profile.params.voiceName);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        } else {
          // console.warn(`VoiceEngine: VoiceName "${profile.params.voiceName}" not found for agent ${profile.agent}. Using browser default.`);
        }
      }

      let rate = profile.params.rate ?? 1;
      let pitch = profile.params.pitch ?? 1;

      // Apply cadence style modifications
      switch (profile.cadenceStyle) {
        case 'oracular': rate *= 0.85; pitch *= 0.9; break;
        case 'staccato': rate *= 1.25; pitch *= 1.15; break;
        case 'fractured':
          // Use base rate/pitch from profile if defined, otherwise default to 1
          rate = (profile.params.rate ?? 1) + (Math.random() - 0.5) * 0.3;
          pitch = (profile.params.pitch ?? 1) + (Math.random() - 0.5) * 0.4;
          break;
        case 'standard': default: break;
      }

      // Apply distortion effects if present
      if (profile.effects?.distortion?.amount && profile.effects.distortion.amount > 0) {
        const distAmount = profile.effects.distortion.amount;
        // Further modify pitch and rate based on distortion
        pitch += (Math.random() - 0.5) * (0.5 * distAmount); // Max +/- 0.25 for amount=1
        rate += (Math.random() - 0.5) * (0.4 * distAmount);  // Max +/- 0.2 for amount=1
        // If distortion is high, can also slightly increase overall rate for a "strained" effect
        if (distAmount > 0.5) rate *= (1 + (distAmount - 0.5) * 0.2);
      }
      
      // Specific override for NevikPersona
      if (profile.agent === 'NevikPersona') {
        rate = (profile.params.rate ?? 0.9) + (Math.random() * 0.3 - 0.15); // Range around base
        pitch = (profile.params.pitch ?? 0.85) + (Math.random() * 0.4 - 0.2); // Range around base
      }


      utterance.pitch = Math.max(0.1, Math.min(2, pitch));
      utterance.rate = Math.max(0.1, Math.min(2, rate));
      utterance.volume = profile.params.volume ?? 1;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        const errorMsg = event.error === 'not-allowed'
          ? "Speech synthesis restricted (not-allowed). Click anywhere on the page to interact first or check browser autoplay restrictions."
          : `Speech synthesis error: ${event.error}`;
        console.warn("VoiceEngine: SpeechSynthesisUtterance:", errorMsg);
        reject(new Error(errorMsg));
      };

      window.speechSynthesis.speak(utterance);

      // Handle delay effect
      if (profile.effects?.delay?.count && profile.effects.delay.count > 0) {
        for (let i = 0; i < profile.effects.delay.count; i++) {
          setTimeout(() => {
            const echoUtterance = new SpeechSynthesisUtterance(text);
            if (utterance.voice) echoUtterance.voice = utterance.voice; // Use the same voice if selected
            // Slightly alter pitch/rate for echoes to make them sound different
            let echoPitch = utterance.pitch + (Math.random() - 0.5) * 0.1 * (i + 1);
            let echoRate = utterance.rate * (1 - 0.05 * (i + 1)); // Slightly slower
            echoUtterance.pitch = Math.max(0.1, Math.min(2, echoPitch));
            echoUtterance.rate = Math.max(0.1, Math.min(2, echoRate));
            // Decrease volume for echoes
            echoUtterance.volume = Math.max(0, utterance.volume * Math.pow(profile.effects!.delay!.feedbackGain || 0.5, i + 1));
            if (echoUtterance.volume > 0.05) { // Don't speak if volume is too low
                window.speechSynthesis.speak(echoUtterance);
            }
          }, (profile.effects.delay.time || 200) * (i + 1));
        }
      }
      // Placeholder for reverb
      if (profile.effects?.reverb?.mix && profile.effects.reverb.mix > 0) {
        // console.warn(`VoiceEngine: True reverb for agent ${profile.agent} (webspeech) is not implemented.`);
      }

    });
  }

  private async _externalHttpTtsSynthesis(text: string, apiUrl: string): Promise<void> {
    // Stop any currently playing external audio
    if (this.activeAudioObject) {
        this.activeAudioObject.pause();
        // No need to revokeObjectURL here, it's done in onended/onerror
        this.activeAudioObject = null;
    }
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }), // Assuming the API expects {"text": "..."}
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[VoiceEngine] External TTS request failed (${response.status}): ${errorBody}`);
        throw new Error(`External TTS request failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      // More robust check for audio types
      if (!blob.type.startsWith('audio/')) { 
          console.warn(`[VoiceEngine] Received unexpected blob type: ${blob.type}. Attempting to play anyway.`);
      }
      const audioUrl = URL.createObjectURL(blob);
      
      return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        this.activeAudioObject = audio; // Store reference to the current audio
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl); // Clean up blob URL
            if (this.activeAudioObject === audio) this.activeAudioObject = null;
            resolve();
        };
        audio.onerror = (e) => {
            URL.revokeObjectURL(audioUrl); // Clean up blob URL
            if (this.activeAudioObject === audio) this.activeAudioObject = null;
            console.error("[VoiceEngine] Error playing external TTS audio:", e);
            reject(new Error("Error playing fetched audio."));
        };
        audio.play().catch(e => { // Catch play promise rejection
            URL.revokeObjectURL(audioUrl); // Clean up blob URL
            if (this.activeAudioObject === audio) this.activeAudioObject = null;
            console.error("[VoiceEngine] Audio play() promise rejected:", e);
            reject(new Error("Audio playback was prevented."));
        });
      });

    } catch (err) {
      console.error(`[VoiceEngine] Error during external TTS synthesis:`, err);
      throw err; // Re-throw to be caught by the caller
    }
  }

  public async speak(text: string, profile: VoiceProfile): Promise<void> {
    // Stop any currently playing audio/speech before starting new one
    if (this.activeAudioObject) { // If an external audio is playing, stop it.
        this.activeAudioObject.pause();
        if (this.activeAudioObject.src.startsWith('blob:')) {
           URL.revokeObjectURL(this.activeAudioObject.src); // Clean up previous blob URL
        }
        this.activeAudioObject = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) { // If web speech is playing, stop it.
        window.speechSynthesis.cancel();
    }

    switch (profile.engine) {
      case 'webspeech':
        return this._webSpeechSynthesis(text, profile);
      case 'external_http_tts':
        if (!profile.apiUrl) {
          console.error(`VoiceEngine: Missing apiUrl for external_http_tts profile ID ${profile.id}`);
          return Promise.reject(new Error("Missing apiUrl for external TTS."));
        }
        return this._externalHttpTtsSynthesis(text, profile.apiUrl);
      default:
        // Ensure profile.engine is properly typed or cast if necessary for logging
        const engineType = (profile as any).engine || 'unknown';
        console.error(`VoiceEngine: Unknown speech engine "${engineType}" for profile ID ${profile.id}`);
        return Promise.reject(new Error("Unknown speech engine."));
    }
  }
}
