// NVK-AI-OS — tests for the relay wiring helpers (Sprint 8, slice 5).
// Run: npx tsx services/os_relay_wiring_test.ts
// Pure helpers only — no live runtime, no relay, no network, no DOM.
// Storage is faked in-memory and injected; the real stores are only
// touched through the same guarded accessors the App uses.

import assert from 'node:assert/strict';
import {
  RELAY_DESKTOP_ID,
  RELAY_TOKEN_SESSION_KEY,
  RELAY_TOKEN_LOCAL_KEY,
  PAIRING_CODE_TTL_MS,
  DEFAULT_PAIRING_PERMISSIONS,
  loadRelayToken,
  saveRelayToken,
  clearRelayToken,
  buildRelayStatus,
  pairingSecondsLeft,
} from './relaySettings';

function fakeStore(): Map<string, string> & Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const map = new Map<string, string>();
  const store = map as Map<string, string> & Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  store.getItem = (k: string) => map.get(k) ?? null;
  store.setItem = (k: string, v: string) => { map.set(k, v); };
  store.removeItem = (k: string) => { map.delete(k); };
  return store;
}

// --- Desktop id ---------------------------------------------------------------
assert.equal(RELAY_DESKTOP_ID, 'nvk-os', 'the desktop id is fixed at nvk-os');
console.log('  PASS the desktop id is fixed at nvk-os');

// --- Token storage: session-only by default -------------------------------------
const session = fakeStore();
const local = fakeStore();
const stores = { session, local };

assert.equal(loadRelayToken(stores), '', 'no token is stored at first');
saveRelayToken('tok-1', false, stores);
assert.equal(session.getItem(RELAY_TOKEN_SESSION_KEY), 'tok-1', 'session-only save writes sessionStorage');
assert.equal(local.getItem(RELAY_TOKEN_LOCAL_KEY), null, 'session-only save never writes localStorage');
assert.equal(loadRelayToken(stores), 'tok-1', 'the saved token loads back');
console.log('  PASS the desktop token is session-only by default (never localStorage)');

// --- Token storage: remember opt-in ----------------------------------------------
saveRelayToken('tok-2', true, stores);
assert.equal(local.getItem(RELAY_TOKEN_LOCAL_KEY), 'tok-2', 'remember opt-in writes localStorage');
assert.equal(session.getItem(RELAY_TOKEN_SESSION_KEY), null, 'remember opt-in clears the session copy');
assert.equal(loadRelayToken(stores), 'tok-2', 'the remembered token loads back');
console.log('  PASS the remember opt-in writes localStorage and clears the session copy');

// --- Token storage: opting back out of remember -----------------------------------
saveRelayToken('tok-3', false, stores);
assert.equal(session.getItem(RELAY_TOKEN_SESSION_KEY), 'tok-3', 'opting out writes sessionStorage again');
assert.equal(local.getItem(RELAY_TOKEN_LOCAL_KEY), null, 'opting out clears the local copy');
clearRelayToken(stores);
assert.equal(loadRelayToken(stores), '', 'clear forgets the token everywhere');
assert.equal(session.getItem(RELAY_TOKEN_SESSION_KEY), null, 'clear removes the session copy');
assert.equal(local.getItem(RELAY_TOKEN_LOCAL_KEY), null, 'clear removes the local copy');
console.log('  PASS clearing the token forgets it from both stores');

// --- Pairing defaults ---------------------------------------------------------------
assert.deepEqual(DEFAULT_PAIRING_PERMISSIONS, ['monitor'], 'the default pairing grants monitor only');
assert.equal(PAIRING_CODE_TTL_MS, 5 * 60 * 1000, 'the pairing code lives 5 minutes');
assert.equal(pairingSecondsLeft(300000, 0), 300, 'the countdown starts at 300 seconds');
assert.equal(pairingSecondsLeft(300000, 299000), 1, 'the countdown reaches 1 second');
assert.equal(pairingSecondsLeft(300000, 300001), 0, 'the countdown is 0 once expired, never negative');
console.log('  PASS the pairing defaults are monitor-only with a 5-minute countdown');

// --- Status: built only from App state, nothing invented -------------------------------
const status = buildRelayStatus({
  orbState: 'THINKING',
  modelLoaded: true,
  modelId: 'qwen-0.5b',
  workspaceMode: 'immersive',
  openPanelCount: 3,
  subAgentCount: 2,
  workflowActive: true,
  pendingActivitySteps: 1,
  completedActivitySteps: 4,
  version: '0.0.1',
});
assert.deepEqual(status, {
  desktopId: 'nvk-os',
  orbState: 'THINKING',
  model: 'qwen-0.5b',
  modelLoaded: true,
  workspaceMode: 'immersive',
  openPanels: 3,
  subAgents: 2,
  workflowActive: true,
  activitySteps: { pending: 1, completed: 4 },
  version: '0.0.1',
});
const unloaded = buildRelayStatus({
  orbState: 'IDLE',
  modelLoaded: false,
  modelId: null,
  workspaceMode: '2d',
  openPanelCount: 0,
  subAgentCount: 0,
  workflowActive: false,
  pendingActivitySteps: 0,
  completedActivitySteps: 0,
  version: '0.0.1',
});
assert.equal(unloaded.model, 'not loaded', 'no model loaded is reported honestly, never a fabricated model id');
console.log('  PASS the relay status is built only from App state (orb, model, panels, agents, workflow)');

console.log('OS relay wiring test PASSED.');
