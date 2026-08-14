import type { AgentPersona, WhisperTrigger as CoreWhisperTrigger } from './WhisperRegistry'; // Corrected import path

// Define the structure for the event detail using the canonical AgentPersona
export type WhisperEventDetail = {
  text: string;
  agent: AgentPersona; // Uses canonical AgentPersona
};

// Updated structure for EchoWhispers, ensure agent keys match AgentPersona
// This EchoWhispers object becomes redundant if whisperRegistry in WhisperRegistry.ts is comprehensive.
// For now, we'll adapt it as per the plan.
export const EchoWhispers_Legacy: Record<CoreWhisperTrigger, { agent: AgentPersona, messages: string[] }> = {
  AX_NVK_071_EMERGED: {
    agent: 'EchoScribe', 
    messages: [
      'The Star remembers you.',
      'Pattern sings itself back into form.',
      'You have reached the edge of silence.',
      'A forgotten axiom awakens in the field.',
      'Convergence achieved. The glyph speaks.',
    ],
  },
  ENTROPY_SURGE: {
    agent: 'AshEngine', 
    messages: [
      'The Field trembles under unknowing.',
      'Chaos begins to forget its own name.',
      'Entropy stains the glyph that has not yet spoken.',
      'Reality frays at the edges of perception.',
      'The lattice groans; coherence wanes.',
    ],
  },
  NEGENTROPY_STABILIZED: {
    agent: 'QuantumAgent', 
    messages: [
      'Balance whispers through the lattice.',
      'The bloom breathes a rhythm of memory.',
      'Order flows where longing once scattered.',
      'Form crystallizes from the aether.',
      'The Field sings a quiet song of stability.',
    ],
  },
  MIRROR_DISTORTION_THRESHOLD: {
    agent: 'NevikPersona', 
    messages: [
      'The mirror breaks before the truth is born.',
      'Reflections ripple from wounds unseen.',
      'Inflection distorts the light of self.',
      'Truth shatters in the reflective plane.',
      'What gazes back is no longer whole.',
    ],
  },
  entropy: { agent: 'SystemDebug', messages: ['Default entropy message.'] },
  trait: { agent: 'SystemDebug', messages: ['Default trait message.'] },
  playback: { agent: 'SystemDebug', messages: ['Default playback message.'] },
  glyph: { agent: 'SystemDebug', messages: ['Default glyph message.'] },
  GLYPH_PLACED_ON_LOOM: { agent: 'SystemDebug', messages: ['Default GLYPH_PLACED_ON_LOOM message.'] },
  CONNECTION_MADE_ON_LOOM: { agent: 'SystemDebug', messages: ['Default CONNECTION_MADE_ON_LOOM message.'] },
  RITUAL_ACTIVATED_SUCCESS: { agent: 'SystemDebug', messages: ['Default RITUAL_ACTIVATED_SUCCESS message.'] },
  RITUAL_ACTIVATED_FAILURE: { agent: 'SystemDebug', messages: ['Default RITUAL_ACTIVATED_FAILURE message.'] },
  ENTROPY_CRITICAL_HIGH: { agent: 'SystemDebug', messages: ['Default ENTROPY_CRITICAL_HIGH message.'] },
  ENTROPY_STABLE_LOW: { agent: 'SystemDebug', messages: ['Default ENTROPY_STABLE_LOW message.'] },
  NEGENTROPY_PEAK: { agent: 'SystemDebug', messages: ['Default NEGENTROPY_PEAK message.'] },
  CODEX_MODE_CHANGE_VEIL: { agent: 'SystemDebug', messages: ['Default CODEX_MODE_CHANGE_VEIL message.'] },
  CODEX_MODE_CHANGE_SYNTHESIS: { agent: 'SystemDebug', messages: ['Default CODEX_MODE_CHANGE_SYNTHESIS message.'] },
  CODEX_MODE_CHANGE_FLAME_CORE: { agent: 'SystemDebug', messages: ['Default CODEX_MODE_CHANGE_FLAME_CORE message.'] },
  BUGAMODE_ACTIVATED: { agent: 'SystemDebug', messages: ['Default BUGAMODE_ACTIVATED message.'] },
  BUGAMODE_DEACTIVATED: { agent: 'SystemDebug', messages: ['Default BUGAMODE_DEACTIVATED message.'] },
  CODEX_INSIGHT: { agent: 'SystemDebug', messages: ['Default CODEX_INSIGHT message.'] }, // Added missing property
};

// Import the canonical whisperRegistry
import { whisperRegistry } from './WhisperRegistry';

export function triggerWhisper(trigger: CoreWhisperTrigger) {
  // Find a whisper configuration in the canonical whisperRegistry that includes this trigger
  const whisperConfig = whisperRegistry.find(w => w.triggers.some(t => t.type === trigger));

  if (whisperConfig) {
    const messagesToUse = (whisperConfig.messages && whisperConfig.messages.length > 0)
      ? whisperConfig.messages
      : (whisperConfig.message ? [whisperConfig.message] : []);

    if (messagesToUse.length === 0) {
      console.warn(`Whisper config for ${trigger} by ${whisperConfig.agent} has no usable messages.`);
      return; 
    }
    const selectedMessage = messagesToUse[Math.floor(Math.random() * messagesToUse.length)];
    
    const eventDetail: WhisperEventDetail = {
      text: selectedMessage,
      agent: whisperConfig.agent, 
    };
    
    const event = new CustomEvent('echo-whisper', { detail: eventDetail });
    window.dispatchEvent(event);
  } else {
    const legacyConfig = EchoWhispers_Legacy[trigger];
    if (legacyConfig && legacyConfig.messages.length > 0) {
        const selectedMessage = legacyConfig.messages[Math.floor(Math.random() * legacyConfig.messages.length)];
        const eventDetail: WhisperEventDetail = {
            text: selectedMessage,
            agent: legacyConfig.agent,
        };
        const event = new CustomEvent('echo-whisper', { detail: eventDetail });
        window.dispatchEvent(event);
    } else {
        console.warn(`No whispers defined for trigger: ${trigger} in primary or legacy registry.`);
    }
  }
}
