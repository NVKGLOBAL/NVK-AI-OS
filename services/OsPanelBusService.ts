// services/OsPanelBusService.ts
// MCNA slice 3 — OS-side execution for the slice-1 tool contract.
//
// The Agent working copy's panel_control tool (tools.ts) resolves its
// execution through a PanelBus port (attachPanelBus). This module is the
// OS implementation of that port, backed by the OS panel bus store, plus
// executePanelControl: the same action set and result shape as the
// Agent's panel_control handler (and CODEXA's slice-2 equivalent).
// The voice/text command dispatcher calls this — never the store or App
// state directly — so the tool contract is the single execution path
// for panel commands in the OS.
//
// Result shape (mirrors the Agent tool): { available, ok, panels, panel,
// reason }. available is always true here because the OS bus is attached
// at module load; a failed action returns ok: false with an honest
// reason, never a fake success.

import {
  getOsPanelBusSnapshot,
  getOsPanelStatus,
  findOsPanelDefinition,
  openOsPanel,
  closeOsPanel,
  focusOsPanel,
  setOsPanelProperty,
  setOsAura,
  getOsPanel,
  listOsPanels,
} from '../lib/stores/osPanelBusStore';
import type { OsPanelInfo } from '../lib/stores/osPanelBusStore';
import { resolveColorName } from '../lib/osPanelColors';

/** The PanelBus port shape from the slice-1 tool contract. */
export interface PanelBus {
  listPanels(): OsPanelInfo[];
  getPanel(id: string): OsPanelInfo | null;
  openPanel(id: string): boolean;
  closePanel(id: string): boolean;
  focusPanel(id: string): boolean;
  setPanelProperty(id: string, property: string, value: unknown): boolean;
}

/** The OS bus, implementing the slice-1 PanelBus port. */
export const osPanelBus: PanelBus = {
  listPanels: () => listOsPanels(),
  getPanel: (id) => getOsPanel(id),
  openPanel: (id) => openOsPanel(id),
  closePanel: (id) => closeOsPanel(id),
  focusPanel: (id) => focusOsPanel(id),
  setPanelProperty: (id, property, value) => setOsPanelProperty(id, property, value),
};

export type PanelControlAction = 'list' | 'get' | 'open' | 'close' | 'focus' | 'set';

export interface PanelControlResult {
  available: boolean;
  ok?: boolean;
  reason?: string;
  panels?: OsPanelInfo[];
  panel?: OsPanelInfo | null;
  found?: boolean;
}

/**
 * Execute a panel_control action against the OS bus. Same action set
 * and result shape as the Agent's panel_control tool handler.
 */
export function executePanelControl(
  action: PanelControlAction,
  panelId?: string,
  property?: string,
  value?: unknown
): PanelControlResult {
  if (action === 'list') {
    return { available: true, panels: listOsPanels() };
  }
  if (!panelId) {
    return { available: true, ok: false, reason: `action '${action}' requires a panelId` };
  }
  if (action === 'get') {
    const panel = getOsPanel(panelId);
    return { available: true, panel, found: panel !== null };
  }
  if (action === 'open') {
    const ok = openOsPanel(panelId);
    return { available: true, ok, reason: ok ? undefined : getOsPanelBusSnapshot().lastError ?? undefined };
  }
  if (action === 'close') {
    const ok = closeOsPanel(panelId);
    return { available: true, ok, reason: ok ? undefined : getOsPanelBusSnapshot().lastError ?? undefined };
  }
  if (action === 'focus') {
    const ok = focusOsPanel(panelId);
    return { available: true, ok, reason: ok ? undefined : getOsPanelBusSnapshot().lastError ?? undefined };
  }
  if (action === 'set') {
    if (!property) {
      return { available: true, ok: false, reason: "action 'set' requires a property" };
    }
    // A color set resolves the color name first: an unknown color fails
    // honestly instead of storing a meaningless string as a hue.
    if (property === 'color') {
      const color = typeof value === 'string' ? resolveColorName(value) : null;
      if (!color) {
        return { available: true, ok: false, reason: `Unknown color '${String(value)}' — try green, blue, red, cyan, gold, or purple.` };
      }
      const okColor = setOsPanelProperty(panelId, 'color', color.name);
      const okHue = setOsPanelProperty(panelId, 'hue', color.hue);
      const ok = okColor && okHue;
      return { available: true, ok, reason: ok ? undefined : getOsPanelBusSnapshot().lastError ?? undefined };
    }
    const ok = setOsPanelProperty(panelId, property, value);
    return { available: true, ok, reason: ok ? undefined : getOsPanelBusSnapshot().lastError ?? undefined };
  }
  return { available: true, ok: false, reason: `unknown panel_control action '${action}'` };
}

/**
 * Set a panel's color by name (or hex). Resolves the color, stores both
 * the name and the hue the visualizers read. Returns ok:false with a
 * reason for an unknown color or an unsettable panel.
 */
export function setPanelColor(panelId: string, colorName: string): { ok: boolean; reason?: string; hue?: number } {
  const color = resolveColorName(colorName);
  if (!color) {
    return { ok: false, reason: `Unknown color '${colorName}' — try green, blue, red, cyan, gold, or purple.` };
  }
  const result = executePanelControl('set', panelId, 'color', color.name);
  return { ok: result.ok === true, reason: result.reason, hue: color.hue };
}

/**
 * Set the seeker aura from a mood (already inferred) + its color.
 * The mood, color name, hue and hex are all recorded — the aura state
 * is the source of truth, and the Seeker Aura panel's properties mirror it.
 */
export function setSeekerAura(mood: string, colorName: string, hue: number, hex: string): void {
  setOsAura(mood, colorName, hue, hex);
}

/** Human-readable panel display name for confirmations (falls back to the id). */
export function panelDisplayName(panelId: string): string {
  return findOsPanelDefinition(panelId)?.name ?? panelId;
}

/** Whether a panel id exists in the catalog at all. */
export function panelExists(panelId: string): boolean {
  return getOsPanelStatus(panelId) !== null;
}
