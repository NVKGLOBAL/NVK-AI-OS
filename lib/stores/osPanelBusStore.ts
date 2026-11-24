// lib/stores/osPanelBusStore.ts
// MCNA slice 3 — the OS panel state bus.
//
// The single source of truth for panel state the agent can read and
// write: which panels are open, each panel's writable properties
// (color/hue, aura), and which catalog entries are dead. Built as a
// plain module with a listener set (the same pattern as
// LocalModelRegistryService) — no new dependency — and exposed through
// useSyncExternalStore so App re-renders when bus state changes.
//
// The OS differs from CODEXA here: CODEXA has one active panel, the OS
// has clusters with nodes + pinned instances, and the open/close/focus
// logic lives in App.tsx closures (handleAppClick, closePanelEverywhere).
// The bus therefore does NOT reimplement windowing. App registers a
// bridge (registerOsPanelBridge) whose functions call the real App
// handlers; the bus validates (dead/unknown/blocked) and delegates.
// If no bridge is registered, open/close/focus return false honestly
// ("panel bus is not attached to the workspace yet") instead of
// pretending to open a panel.
//
// Honesty rules for this store:
// - openPanel/focusPanel return false (never throw, never fake an open)
//   for a panel that is dead, unknown, or availability-blocked.
// - A panel the agent cannot read or change is labelled 'dead' in the
//   enumeration (listPanels/getPanel) and in the navigator UI.
// - No property is ever invented: getPanel returns only what the store
//   holds; unset properties are absent, not defaulted to a plausible value.

import { useSyncExternalStore } from 'react';
import { PANEL_DEFINITIONS } from '../../constants';
import type { PanelDefinition } from '../../types';

export type OsPanelStatus = 'live' | 'dead';

/**
 * Catalog entries that cannot open. Four throw on render (they call
 * hooks that do not exist anywhere in the tree); three are blocked by
 * availability (no backing capability connected). Audit §10.3(c).
 */
export const DEAD_PANEL_IDS: ReadonlySet<string> = new Set([
  'CodexAvatarGeneratorPanel',
  'DreambloomGenesisPanel',
  'DriftArchivePanel',
  'DriftDifferentialOverlay',
  'CalendarPanel',
  'EmailPanel',
  'MessagingPanel',
]);

/** Human-readable reason per dead panel, used in refusals and badges. */
export const DEAD_PANEL_REASONS: Record<string, string> = {
  CodexAvatarGeneratorPanel: 'Avatar Projector is dead — it calls a hook that does not exist and throws on open.',
  DreambloomGenesisPanel: 'Dreambloom Genesis is dead — it calls a hook that does not exist and throws on open.',
  DriftArchivePanel: 'Drift Archive is dead — it calls a hook that does not exist and throws on open.',
  DriftDifferentialOverlay: 'Drift Differential is dead — it calls a hook that does not exist and throws on open.',
  CalendarPanel: 'Calendar is not available: No calendar connected.',
  EmailPanel: 'Secure Email is not available: No email provider connected.',
  MessagingPanel: 'Comms is not available: No messaging connector connected.',
};

export function getOsPanelStatus(id: string): OsPanelStatus | null {
  if (DEAD_PANEL_IDS.has(id)) return 'dead';
  if (PANEL_DEFINITIONS.some((p) => p.id === id)) return 'live';
  return null;
}

export function isOsPanelDead(id: string): boolean {
  return DEAD_PANEL_IDS.has(id);
}

export function findOsPanelDefinition(id: string): PanelDefinition | undefined {
  return PANEL_DEFINITIONS.find((p) => p.id === id);
}

export interface OsPanelInfo {
  id: string;
  name: string;
  open: boolean;
  status: OsPanelStatus;
  properties: Record<string, unknown>;
}

export interface OsAuraState {
  mood: string | null;
  colorName: string | null;
  hue: number | null;
  hex: string | null;
}

/**
 * The bridge App registers: the real open/close/focus implementations.
 * Each returns whether the action actually happened.
 */
export interface OsPanelBridge {
  openPanel(id: string): boolean;
  closePanel(id: string): boolean;
  focusPanel(id: string): boolean;
}

interface OsPanelBusState {
  activePanelId: string | null;
  openPanelIds: string[];
  panelProperties: Record<string, Record<string, unknown>>;
  aura: OsAuraState;
  lastError: string | null;
}

const initialState: OsPanelBusState = {
  activePanelId: null,
  openPanelIds: [],
  panelProperties: {},
  aura: { mood: null, colorName: null, hue: null, hex: null },
  lastError: null,
};

let state: OsPanelBusState = { ...initialState, aura: { ...initialState.aura }, panelProperties: {} };
let bridge: OsPanelBridge | null = null;
const listeners = new Set<() => void>();

function setState(next: OsPanelBusState): void {
  state = next;
  for (const l of listeners) {
    try {
      l();
    } catch (e) {
      console.error('OsPanelBus listener error:', e);
    }
  }
}

export function subscribeOsPanelBus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOsPanelBusSnapshot(): OsPanelBusState {
  return state;
}

/** React hook: re-renders the caller whenever bus state changes. */
export function useOsPanelBus(): OsPanelBusState {
  return useSyncExternalStore(subscribeOsPanelBus, getOsPanelBusSnapshot);
}

/** App registers its real window handlers once; the bus delegates to them. */
export function registerOsPanelBridge(b: OsPanelBridge): void {
  bridge = b;
}

export function getOsPanelBridge(): OsPanelBridge | null {
  return bridge;
}

/** App pushes the currently-open panel ids (pinned instances + open nodes). */
export function setOsOpenPanelIds(ids: string[]): void {
  const openPanelIds = [...new Set(ids)];
  const activePanelId =
    state.activePanelId !== null && openPanelIds.includes(state.activePanelId)
      ? state.activePanelId
      : null;
  if (
    activePanelId === state.activePanelId &&
    openPanelIds.length === state.openPanelIds.length &&
    openPanelIds.every((id, i) => id === state.openPanelIds[i])
  ) {
    return;
  }
  setState({ ...state, openPanelIds, activePanelId });
}

function deadReason(id: string): string {
  return DEAD_PANEL_REASONS[id] ?? `Panel '${id}' is dead and cannot be opened.`;
}

export function openOsPanel(id: string): boolean {
  const def = findOsPanelDefinition(id);
  if (!def) {
    setState({ ...state, lastError: `Panel '${id}' is not in the panel catalog.` });
    return false;
  }
  if (DEAD_PANEL_IDS.has(id)) {
    setState({ ...state, lastError: deadReason(id) });
    return false;
  }
  if (!bridge) {
    setState({ ...state, lastError: 'The panel bus is not attached to the workspace yet.' });
    return false;
  }
  const ok = bridge.openPanel(id);
  if (!ok) {
    setState({ ...state, lastError: `Panel '${def.name}' could not be opened.` });
    return false;
  }
  // The bus is the source of truth the agent reads: a bus-driven open
  // is visible immediately (openPanelIds), not only after App's render
  // cycle pushes the same set back through setOsOpenPanelIds (which
  // dedupes and no-ops when nothing changed).
  setState({
    ...state,
    activePanelId: id,
    openPanelIds: state.openPanelIds.includes(id) ? state.openPanelIds : [...state.openPanelIds, id],
    lastError: null,
  });
  return true;
}

export function closeOsPanel(id?: string): boolean {
  const target = id ?? state.activePanelId;
  if (target === null) {
    setState({ ...state, lastError: 'No panel is open to close.' });
    return false;
  }
  // Same validation as open/focus/set: a dead panel was never open, and
  // an unknown id is not a panel — report that instead of a fake success.
  const status = getOsPanelStatus(target);
  if (status !== 'live') {
    setState({
      ...state,
      lastError:
        status === 'dead' ? deadReason(target) : `Panel '${target}' is not in the panel catalog.`,
    });
    return false;
  }
  if (!bridge) {
    setState({ ...state, lastError: 'The panel bus is not attached to the workspace yet.' });
    return false;
  }
  const ok = bridge.closePanel(target);
  if (!ok) {
    setState({ ...state, lastError: `Panel '${target}' is not open.` });
    return false;
  }
  setState({
    ...state,
    activePanelId: state.activePanelId === target ? null : state.activePanelId,
    openPanelIds: state.openPanelIds.filter((pid) => pid !== target),
    lastError: null,
  });
  return true;
}

export function focusOsPanel(id: string): boolean {
  const status = getOsPanelStatus(id);
  if (status !== 'live') {
    setState({
      ...state,
      lastError:
        status === 'dead' ? deadReason(id) : `Panel '${id}' is not in the panel catalog.`,
    });
    return false;
  }
  if (!bridge) {
    setState({ ...state, lastError: 'The panel bus is not attached to the workspace yet.' });
    return false;
  }
  const ok = bridge.focusPanel(id);
  if (!ok) {
    setState({ ...state, lastError: `Panel '${id}' could not be focused.` });
    return false;
  }
  setState({ ...state, activePanelId: id, lastError: null });
  return true;
}

export function setOsPanelProperty(id: string, property: string, value: unknown): boolean {
  const status = getOsPanelStatus(id);
  if (status !== 'live') {
    setState({
      ...state,
      lastError:
        status === 'dead' ? deadReason(id) : `Panel '${id}' is not in the panel catalog.`,
    });
    return false;
  }
  if (typeof property !== 'string' || property.length === 0) {
    setState({ ...state, lastError: 'A property name is required to set a panel property.' });
    return false;
  }
  setState({
    ...state,
    panelProperties: {
      ...state.panelProperties,
      [id]: { ...(state.panelProperties[id] ?? {}), [property]: value },
    },
    lastError: null,
  });
  return true;
}

export function setOsAura(mood: string, colorName: string, hue: number, hex: string): void {
  setState({
    ...state,
    aura: { mood, colorName, hue, hex },
    panelProperties: {
      ...state.panelProperties,
      SeekerAuraDisplay: {
        ...(state.panelProperties['SeekerAuraDisplay'] ?? {}),
        auraMood: mood,
        auraColor: colorName,
        auraHue: hue,
      },
    },
    lastError: null,
  });
}

export function getOsPanel(id: string): OsPanelInfo | null {
  const def = findOsPanelDefinition(id);
  if (!def) return null;
  const status = getOsPanelStatus(id);
  if (status === null) return null;
  return {
    id: def.id,
    name: def.name,
    open: state.openPanelIds.includes(id),
    status,
    properties: { ...(state.panelProperties[id] ?? {}) },
  };
}

export function listOsPanels(): OsPanelInfo[] {
  return PANEL_DEFINITIONS.map((def) => {
    const status = getOsPanelStatus(def.id);
    return {
      id: def.id,
      name: def.name,
      open: state.openPanelIds.includes(def.id),
      status: status ?? 'live',
      properties: { ...(state.panelProperties[def.id] ?? {}) },
    } as OsPanelInfo;
  });
}

/** Test-only reset: restore the bus to its initial state between tests.
 * Never called by app code — the bus is a live singleton at runtime. */
export function resetOsPanelBusStore(): void {
  bridge = null;
  state = { ...initialState, aura: { ...initialState.aura }, panelProperties: {}, openPanelIds: [] };
}
