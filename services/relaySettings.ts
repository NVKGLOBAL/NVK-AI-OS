/**
 * NVK-AI-OS — relay wiring helpers (Sprint 8, slice 5: the App UI wiring).
 *
 * Pure, testable pieces of the relay Settings wiring so App.tsx and
 * SettingsPanel.tsx stay thin:
 * - the fixed desktop id ("nvk-os");
 * - the desktop-token store (sessionStorage by DEFAULT, copying the
 *   nvk_dispatch_token pattern; localStorage ONLY when the owner
 *   explicitly opts in with "remember this token on this computer");
 * - the status object the relay client posts (built ONLY from runtime
 *   state + diagnostics the App already holds — nothing invented);
 * - the 5-minute pairing-code countdown.
 *
 * Nothing here talks to the network or the runtime. The relay adapter
 * (services/relayAdapter.ts) is unchanged.
 */

export const RELAY_DESKTOP_ID = 'nvk-os';

// The desktop token authenticates this desktop to the relay
// (X-Desktop-Token). It is never sent to the phone and never displayed
// after entry.
export const RELAY_TOKEN_SESSION_KEY = 'nvk_relay_desktop_token';
export const RELAY_TOKEN_LOCAL_KEY = 'nvk_relay_desktop_token';

// The pairing code lives 5 minutes (the relay's PAIRING_CODE_TTL_MS).
export const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;

export type RelayPermission = 'monitor' | 'voice' | 'approve' | 'control';

export const RELAY_PERMISSIONS: { id: RelayPermission; label: string; desc: string }[] = [
  { id: 'monitor', label: 'Monitor', desc: 'Read status + evidence' },
  { id: 'voice', label: 'Voice', desc: 'Send chat commands' },
  { id: 'approve', label: 'Approve', desc: 'Approve / reject sensitive actions' },
  { id: 'control', label: 'Control', desc: 'Start / pause / cancel tasks' },
];

// The default pairing grants monitor only (the relay's
// DEFAULT_PERMISSIONS). Voice / approve / control are opt-in.
export const DEFAULT_PAIRING_PERMISSIONS: RelayPermission[] = ['monitor'];

export interface TokenStores {
  session?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  local?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
}

function realStores(): TokenStores {
  let session: Storage | null = null;
  let local: Storage | null = null;
  try { session = typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch { session = null; }
  try { local = typeof localStorage !== 'undefined' ? localStorage : null; } catch { local = null; }
  return { session, local };
}

function safeGet(store: Pick<Storage, 'getItem'> | null | undefined): string {
  try { return store?.getItem(RELAY_TOKEN_SESSION_KEY) || ''; } catch { return ''; }
}

/** The stored desktop token, if any — session storage first, then local. */
export function loadRelayToken(stores: TokenStores = realStores()): string {
  return safeGet(stores.session) || safeGet(stores.local);
}

/**
 * Save the desktop token. Session-only by default; localStorage only
 * when the owner explicitly opts in. The other store is cleared so no
 * stale copy survives a change of mind.
 */
export function saveRelayToken(token: string, remember: boolean, stores: TokenStores = realStores()): void {
  const trimmed = token.trim();
  if (!trimmed) return;
  try {
    if (remember) {
      stores.local?.setItem(RELAY_TOKEN_LOCAL_KEY, trimmed);
      stores.session?.removeItem(RELAY_TOKEN_SESSION_KEY);
    } else {
      stores.session?.setItem(RELAY_TOKEN_SESSION_KEY, trimmed);
      stores.local?.removeItem(RELAY_TOKEN_LOCAL_KEY);
    }
  } catch { /* storage unavailable — the token stays in memory only */ }
}

/** Forget the desktop token everywhere it could be stored. */
export function clearRelayToken(stores: TokenStores = realStores()): void {
  try { stores.session?.removeItem(RELAY_TOKEN_SESSION_KEY); } catch {}
  try { stores.local?.removeItem(RELAY_TOKEN_LOCAL_KEY); } catch {}
}

export interface RelayStatusInput {
  orbState: string;
  modelLoaded: boolean;
  modelId: string | null;
  workspaceMode: string;
  openPanelCount: number;
  subAgentCount: number;
  workflowActive: boolean;
  pendingActivitySteps: number;
  completedActivitySteps: number;
  version: string;
}

/**
 * The status the relay client posts. Every field comes from state the
 * App already holds (orb state, model state, open panels, sub-agents,
 * workflow, activity steps) — nothing is invented or sampled.
 */
export function buildRelayStatus(input: RelayStatusInput): Record<string, unknown> {
  return {
    desktopId: RELAY_DESKTOP_ID,
    orbState: input.orbState,
    model: input.modelLoaded ? (input.modelId ?? 'loaded') : 'not loaded',
    modelLoaded: input.modelLoaded,
    workspaceMode: input.workspaceMode,
    openPanels: input.openPanelCount,
    subAgents: input.subAgentCount,
    workflowActive: input.workflowActive,
    activitySteps: {
      pending: input.pendingActivitySteps,
      completed: input.completedActivitySteps,
    },
    version: input.version,
  };
}

/** Whole seconds left on a pairing code (0 once expired). */
export function pairingSecondsLeft(expiresAt: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((expiresAt - now) / 1000));
}
