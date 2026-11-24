// lib/osPanelColors.ts
// MCNA slice 3 — pure color + mood helpers for the OS panel bus.
// No React, no DOM, no store imports: every function here is unit-testable
// in node. Hue is the single color channel the visualizers accept
// (Flower of Life circles, Seeker Aura orb); saturation/lightness stay
// with each visualizer's own draw code.
//
// Mirrors the CODEXA slice-2 helpers (lib/panelColors.ts) so the two
// buses accept the same color words and moods.

/** Normalize any hue to [0, 360). */
export function normalizeHue(hue: number): number {
  if (!Number.isFinite(hue)) return 0;
  return ((hue % 360) + 360) % 360;
}

/**
 * Resolve a hue override against a computed fallback hue.
 * Returns the normalized override when one is set, else the fallback
 * (the visualizer's existing entropy/mode/random hue, unchanged).
 */
export function resolveHue(accentHue: number | null | undefined, fallbackHue: number): number {
  if (accentHue != null && Number.isFinite(accentHue)) return normalizeHue(accentHue);
  return fallbackHue;
}

export interface NamedColor {
  name: string;
  hue: number;
  hex: string;
}

/** Named hues the panel bus accepts. White/black/grey are not hues — a
 * hue override cannot express them, so they are not listed (an unknown
 * color is reported honestly instead of silently mapping to something else). */
export const NAMED_COLORS: Record<string, NamedColor> = {
  red: { name: 'red', hue: 0, hex: '#ef4444' },
  orange: { name: 'orange', hue: 30, hex: '#f97316' },
  gold: { name: 'gold', hue: 45, hex: '#f59e0b' },
  amber: { name: 'amber', hue: 45, hex: '#f59e0b' },
  yellow: { name: 'yellow', hue: 60, hex: '#eab308' },
  green: { name: 'green', hue: 120, hex: '#22c55e' },
  emerald: { name: 'emerald', hue: 150, hex: '#10b981' },
  teal: { name: 'teal', hue: 170, hex: '#14b8a6' },
  cyan: { name: 'cyan', hue: 180, hex: '#22d3ee' },
  blue: { name: 'blue', hue: 210, hex: '#3b82f6' },
  indigo: { name: 'indigo', hue: 240, hex: '#6366f1' },
  violet: { name: 'violet', hue: 270, hex: '#8b5cf6' },
  purple: { name: 'purple', hue: 270, hex: '#8b5cf6' },
  magenta: { name: 'magenta', hue: 300, hex: '#d946ef' },
  pink: { name: 'pink', hue: 320, hex: '#ec4899' },
};

/** Convert a #rrggbb hex color to its hue (0–360). Returns null when the
 * input is not a valid 6-digit hex color. */
export function hueFromHex(hex: string): number | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return normalizeHue(h);
}

/**
 * Resolve a user-supplied color word or hex code to a named color + hue.
 * Returns null for anything unrecognized — the caller reports that
 * honestly instead of guessing a color.
 */
export function resolveColorName(input: string): NamedColor | null {
  const raw = input.trim().toLowerCase();
  if (raw.length === 0) return null;
  const named = NAMED_COLORS[raw];
  if (named) return named;
  if (raw.startsWith('#')) {
    const hue = hueFromHex(raw);
    if (hue == null) return null;
    return { name: raw, hue, hex: raw.toLowerCase() };
  }
  return null;
}

export interface MoodColor {
  mood: string;
  colorName: string;
  hue: number;
  hex: string;
}

/**
 * Deterministic mood → aura color map. Keyword-based, no model call:
 * the inference is a lookup over the seeker's own words, and the
 * confirmation names the mood so the seeker can correct it.
 */
const MOOD_KEYWORDS: Array<{ keywords: string[]; mood: string; colorName: string; hue: number; hex: string }> = [
  { keywords: ['blue', 'sad', 'low', 'down', 'downcast', 'gloomy', 'melancholy', 'depressed', 'unhappy'], mood: 'blue', colorName: 'blue', hue: 210, hex: '#3b82f6' },
  { keywords: ['happy', 'joyful', 'joy', 'glad', 'cheerful', 'excited', 'elated', 'great', 'wonderful', 'amazing'], mood: 'happy', colorName: 'gold', hue: 45, hex: '#f59e0b' },
  { keywords: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'chill', 'at peace', 'centered'], mood: 'calm', colorName: 'cyan', hue: 180, hex: '#22d3ee' },
  { keywords: ['anxious', 'stressed', 'worried', 'nervous', 'tense', 'overwhelmed', 'afraid', 'scared'], mood: 'anxious', colorName: 'red', hue: 0, hex: '#ef4444' },
  { keywords: ['curious', 'wondering', 'intrigued', 'fascinated'], mood: 'curious', colorName: 'purple', hue: 270, hex: '#8b5cf6' },
  { keywords: ['awe', 'amazed', 'inspired', 'awestruck', 'wonder'], mood: 'awe', colorName: 'indigo', hue: 240, hex: '#6366f1' },
  { keywords: ['tired', 'drained', 'exhausted', 'sleepy', 'weary'], mood: 'tired', colorName: 'blue', hue: 210, hex: '#3b82f6' },
];

/**
 * Infer a mood from a feeling statement ("I'm feeling blue today",
 * "I feel anxious", "I'm so happy"). Only fires on a feeling verb
 * (feel/feeling/I'm/I am) plus a mood keyword — a color word in a
 * command ("turn the Flower of Life blue") is NOT a mood, so the
 * color command path is never hijacked by this.
 * Returns null when no feeling + mood pair is present.
 */
export function inferMood(utterance: string): MoodColor | null {
  const text = utterance.toLowerCase();
  const hasFeelingVerb =
    /\b(feel|feeling|felt)\b/.test(text) ||
    /\bi'?m\b/.test(text) ||
    /\bi am\b/.test(text);
  if (!hasFeelingVerb) return null;
  for (const entry of MOOD_KEYWORDS) {
    for (const kw of entry.keywords) {
      // Whole-word (or whole-phrase) match so "low" does not fire inside
      // "follow", and "down" does not fire inside "download".
      const pattern = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (pattern.test(text)) {
        return { mood: entry.mood, colorName: entry.colorName, hue: entry.hue, hex: entry.hex };
      }
    }
  }
  return null;
}
