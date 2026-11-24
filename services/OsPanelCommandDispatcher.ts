// services/OsPanelCommandDispatcher.ts
// MCNA slice 3 — the command dispatcher for the OS panel bus.
//
// Parses a user utterance (typed chat or voice transcript — the same
// function serves both paths) into a panel command and executes it
// through the panel_control execution path (OsPanelBusService), never by
// touching React state directly. Mirrors CODEXA's slice-2 dispatcher
// (same command shapes, same confirmation wording) so a user who learns
// the commands in one system can use them in the other.
//
// This is a deterministic intent parser, not a model call: every pattern
// is a fixed rule, every outcome is a bus result, and anything it does
// not recognize returns handled: false so the utterance goes to the
// runtime as before. It never invents a panel, a color, or a mood:
// unknown panels, unknown colors, and the (nonexistent) Buga panel are
// reported honestly with a reason.
//
// Command shapes (whole utterance, case-insensitive):
//   open/show <panel>            -> openPanel
//   close/hide <panel> | close   -> closePanel (no target = active panel)
//   focus <panel>                -> focusPanel
//   turn/set/change/make <panel> <color>  -> set color (name or #hex)
//   I'm feeling <mood> / I feel <mood>    -> mood -> seeker aura + confirm
// "it / this / that" as a panel target means the currently focused panel.

import { executePanelControl, setPanelColor, setSeekerAura, panelDisplayName } from './OsPanelBusService';
import { getOsPanelBusSnapshot, listOsPanels } from '../lib/stores/osPanelBusStore';
import { inferMood, resolveColorName } from '../lib/osPanelColors';

export interface PanelCommandResult {
  handled: boolean;
  ok?: boolean;
  action?: string;
  panelId?: string;
  confirmation?: string;
  reason?: string;
  /** Inferred mood, when the command was a mood -> aura command. */
  mood?: string;
}

interface PanelResolution {
  id: string | null;
  ambiguous?: string[];
}

function normalizePhrase(phrase: string): string {
  let p = phrase.trim().toLowerCase();
  p = p.replace(/^the\s+/, '');
  p = p.replace(/\s+panel\s*$/, '');
  return p.trim();
}

/** Resolve a panel phrase ("Flower of Life", "flower", "Seeker Aura") to
 * a catalog id. Exact name/id wins; otherwise a unique substring or
 * all-words match wins; multiple matches are ambiguous (never guessed). */
export function resolvePanelId(phrase: string): PanelResolution {
  const norm = normalizePhrase(phrase);
  if (norm.length === 0) return { id: null };
  const panels = listOsPanels();

  const exactId = panels.find((p) => p.id.toLowerCase() === norm);
  if (exactId) return { id: exactId.id };
  const exactName = panels.find((p) => p.name.toLowerCase() === norm);
  if (exactName) return { id: exactName.id };

  const words = norm.split(/\s+/).filter(Boolean);
  const candidates = panels.filter((p) => {
    const name = p.name.toLowerCase();
    const id = p.id.toLowerCase();
    if (name.includes(norm) || id.includes(norm)) return true;
    return words.length > 0 && words.every((w) => name.includes(w) || id.includes(w));
  });
  const unique = [...new Map(candidates.map((c) => [c.id, c])).values()];
  if (unique.length === 1) return { id: unique[0].id };
  if (unique.length > 1) return { id: null, ambiguous: unique.map((c) => c.name) };
  return { id: null };
}

/** "it / this / that" means the currently focused panel (or none). */
function resolveTarget(phrase: string): { id: string | null; reason?: string } {
  const norm = normalizePhrase(phrase);
  if (norm === 'it' || norm === 'this' || norm === 'that' || norm === 'this panel') {
    const active = getOsPanelBusSnapshot().activePanelId;
    if (!active) return { id: null, reason: 'No panel is open — open a panel first.' };
    return { id: active };
  }
  const res = resolvePanelId(phrase);
  if (res.id) return { id: res.id };
  if (res.ambiguous) {
    return { id: null, reason: `"${phrase}" matches more than one panel (${res.ambiguous.join(', ')}) — please be more specific.` };
  }
  return { id: null, reason: `I couldn't find a panel called "${phrase}".` };
}

function wordsOf(utterance: string): string[] {
  return utterance.trim().split(/\s+/).filter(Boolean);
}

export function dispatchPanelCommand(utterance: string): PanelCommandResult {
  const text = utterance.trim();
  if (text.length === 0) return { handled: false };
  const lower = text.toLowerCase();

  // Buga: there is no Buga panel in the OS (Buga glyphs live in the
  // Glyph Composer). Say so plainly — never pretend to open one.
  if (/\bbuga\b/.test(lower)) {
    return {
      handled: true,
      ok: false,
      action: 'open',
      reason: 'There is no Buga panel in the OS — Buga glyphs live in the Glyph Composer.',
    };
  }

  // Mood -> seeker aura. Requires a feeling verb, so a color command
  // ("turn the Flower of Life blue") never lands here.
  const mood = inferMood(text);
  if (mood) {
    setSeekerAura(mood.mood, mood.colorName, mood.hue, mood.hex);
    return {
      handled: true,
      ok: true,
      action: 'aura',
      mood: mood.mood,
      confirmation: `I hear you — feeling ${mood.mood}. Your seeker aura is now ${mood.colorName}.`,
    };
  }

  const words = wordsOf(text);
  const verb = words[0]?.toLowerCase() ?? '';

  // Color set: "turn the Flower of Life green" / "set Seeker Aura to blue".
  if (['turn', 'set', 'change', 'make'].includes(verb) && words.length >= 3) {
    const colorWord = words[words.length - 1];
    let panelWords = words.slice(1, -1);
    if (panelWords[0]?.toLowerCase() === 'the') panelWords = panelWords.slice(1);
    if (panelWords[panelWords.length - 1]?.toLowerCase() === 'to') panelWords = panelWords.slice(0, -1);
    const panelPhrase = panelWords.join(' ');
    const target = resolveTarget(panelPhrase);
    if (!target.id) {
      return { handled: true, ok: false, action: 'set', reason: target.reason };
    }
    const color = resolveColorName(colorWord);
    if (!color) {
      return {
        handled: true,
        ok: false,
        action: 'set',
        panelId: target.id,
        reason: `"${colorWord}" isn't a color I can set on a panel — try green, blue, red, cyan, gold, or purple.`,
      };
    }
    const result = setPanelColor(target.id, color.name);
    if (!result.ok) {
      return { handled: true, ok: false, action: 'set', panelId: target.id, reason: result.reason };
    }
    return {
      handled: true,
      ok: true,
      action: 'set',
      panelId: target.id,
      confirmation: `The ${panelDisplayName(target.id)} is now ${color.name}.`,
    };
  }

  // Open: "open the Flower of Life panel" / "show Seeker Aura".
  if (['open', 'show', 'display'].includes(verb) && words.length >= 2) {
    const panelPhrase = words.slice(1).join(' ');
    const target = resolveTarget(panelPhrase);
    if (!target.id) {
      return { handled: true, ok: false, action: 'open', reason: target.reason };
    }
    const result = executePanelControl('open', target.id);
    if (!result.ok) {
      return { handled: true, ok: false, action: 'open', panelId: target.id, reason: result.reason ?? `The ${panelDisplayName(target.id)} could not be opened.` };
    }
    return {
      handled: true,
      ok: true,
      action: 'open',
      panelId: target.id,
      confirmation: `The ${panelDisplayName(target.id)} panel is open.`,
    };
  }

  // Close: "close the Flower of Life panel" / "close" (active panel).
  if (['close', 'hide'].includes(verb)) {
    if (words.length === 1) {
      const active = getOsPanelBusSnapshot().activePanelId;
      if (!active) {
        return { handled: true, ok: false, action: 'close', reason: 'No panel is open to close.' };
      }
      executePanelControl('close', active);
      return { handled: true, ok: true, action: 'close', panelId: active, confirmation: `Closed the ${panelDisplayName(active)} panel.` };
    }
    const panelPhrase = words.slice(1).join(' ');
    const target = resolveTarget(panelPhrase);
    if (!target.id) {
      return { handled: true, ok: false, action: 'close', reason: target.reason };
    }
    const result = executePanelControl('close', target.id);
    if (!result.ok) {
      return { handled: true, ok: false, action: 'close', panelId: target.id, reason: `The ${panelDisplayName(target.id)} panel isn't open.` };
    }
    return {
      handled: true,
      ok: true,
      action: 'close',
      panelId: target.id,
      confirmation: `Closed the ${panelDisplayName(target.id)} panel.` };
  }

  // Focus: "focus the Flower of Life panel".
  if (verb === 'focus' && words.length >= 2) {
    const panelPhrase = words.slice(1).join(' ');
    const target = resolveTarget(panelPhrase);
    if (!target.id) {
      return { handled: true, ok: false, action: 'focus', reason: target.reason };
    }
    const result = executePanelControl('focus', target.id);
    if (!result.ok) {
      return { handled: true, ok: false, action: 'focus', panelId: target.id, reason: result.reason ?? `The ${panelDisplayName(target.id)} could not be focused.` };
    }
    return {
      handled: true,
      ok: true,
      action: 'focus',
      panelId: target.id,
      confirmation: `The ${panelDisplayName(target.id)} panel is focused.`,
    };
  }

  return { handled: false };
}
