/**
 * CyberSynth: Web Audio API sound synthesis and SFX engine for NVK OS
 * Zero external assets required, highly performant, and fully customizable.
 */

let globalAudioCtx: AudioContext | null = null;
let isMutedSetting = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (isMutedSetting) return null;
  
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  
  return globalAudioCtx;
}

export const CyberSynth = {
  isMuted() {
    return isMutedSetting;
  },

  setMuted(muted: boolean) {
    isMutedSetting = muted;
    if (muted && globalAudioCtx) {
      globalAudioCtx.close().then(() => {
        globalAudioCtx = null;
      }).catch(() => {});
    }
  },

  playClick() {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      console.warn("Sound play failed", e);
    }
  },

  playWarp() {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.45;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(150, now);
      osc1.frequency.exponentialRampToValueAtTime(1200, now + duration);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(75, now);
      osc2.frequency.exponentialRampToValueAtTime(600, now + duration * 0.8);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(2500, now + duration);
      filter.Q.setValueAtTime(4.0, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.1);
      osc2.stop(now + duration + 0.1);
    } catch (e) {
      console.warn("Sound play failed", e);
    }
  },

  playBoot() {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      
      // Cybernetic triad chord sweep: C-sharp power chord
      const freqs = [138.59, 207.65, 277.18, 415.30, 554.37];
      
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = idx * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        
        // Gentle vibrato
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(6.0, now + delay);
        lfoGain.gain.setValueAtTime(freq * 0.015, now + delay);
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.linearRampToValueAtTime(0.06, now + delay + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        lfo.start(now + delay);
        osc.start(now + delay);
        
        lfo.stop(now + delay + 2.0);
        osc.stop(now + delay + 2.0);
      });
    } catch (e) {
      console.warn("Sound play failed", e);
    }
  },

  playError() {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(100, now);
      osc1.frequency.linearRampToValueAtTime(90, now + 0.5);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(102, now);
      osc2.frequency.linearRampToValueAtTime(92, now + 0.5);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn("Sound play failed", e);
    }
  },

  playHover() {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }
};

export function playHaptic(pattern: number | number[] = 20) {
  if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
    try {
      window.navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration error
    }
  }
}
