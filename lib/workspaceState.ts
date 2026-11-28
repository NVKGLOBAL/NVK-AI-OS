/**
 * WorkspaceState — the "see" direction (matrix program, 2026-11-27 —
 * item 6; design §2.6).
 *
 * A readable state snapshot the agent can query mid-run: clusters + nodes
 * with status, open panels + pinned panels, current orb state + last
 * transition event, model state, evidence ledger tail with hashes, the
 * last event on each bus, and the generation-events ring buffer.
 *
 * Generated from the SAME event stream the UI renders — never a parallel
 * source of truth. The store subscribes to both buses (services +
 * runtime) and records what actually arrived; the snapshot reads the
 * ledger tail live from the SovereignLedger at query time. If the
 * snapshot and the event log disagree, the event log wins — the snapshot
 * carries the log tail so any caller can check.
 *
 * App.tsx wiring (coordinator applies at integration — this module is
 * standalone, App.tsx is not edited here):
 *   import { attachWorkspaceState, getWorkspaceState } from './lib/workspaceState';
 *   useEffect(() => attachWorkspaceState({
 *     getClusters: () => clusters,
 *     getOpenPanelIds: () => activePanelIdList,
 *     getPinnedPanelIds: () => activeCluster.pinnedPanelIds,
 *     getOrbState: () => nvkOrbState,
 *     getModelState: () => ({
 *       loadedModel: isModelLoaded ? selectedModel : null,
 *       isLoaded: isModelLoaded, loadProgress, loadStatus,
 *       cacheState: 'unknown',
 *     }),
 *   }), [clusters, activePanelIdList, activeCluster, nvkOrbState,
 *          isModelLoaded, selectedModel, loadProgress, loadStatus]);
 *   // then anywhere mid-run: getWorkspaceState() / describeWorkspaceState()
 */

import type { NVKEvent as ServicesEvent } from '../types';
import type { NVKOrbState } from '../types';
import type { NVKEvent as RuntimeEvent } from '../src/nvk/events/NVKEventTypes';
import { eventBus } from '../services/EventBus';
import { nvkEventBus } from '../src/nvk/events/NVKEventBus';
import { sovereignLedger, type SovereignLedgerEntry } from '../services/SovereignLedger';
import { getGenerationEvents, type GenerationEvent } from '../services/generationEvents';
import { mapRuntimeStateToOrbState, mapServicesEventToOrbState } from './orbStateMapping';

export interface WorkspaceClusterSnapshot {
  id: string;
  name: string;
  nodes: Array<{ id: string; panelId: string; label: string; status: 'open' | 'pinned' | 'closed' }>;
}

export interface WorkspaceModelSnapshot {
  loadedModel: string | null;
  isLoaded: boolean;
  loadProgress: number;
  loadStatus: string;
  cacheState: 'cached' | 'not-cached' | 'unknown';
}

export interface WorkspaceEventRecord {
  bus: 'services' | 'runtime';
  receivedAt: number;
  event: ServicesEvent | RuntimeEvent;
}

export interface WorkspaceState {
  generatedAt: number;
  clusters: WorkspaceClusterSnapshot[];
  openPanels: string[];
  pinnedPanels: string[];
  orb: { state: NVKOrbState; lastTransitionEvent: WorkspaceEventRecord | null };
  model: WorkspaceModelSnapshot;
  /** Last 10 ledger entries (hashes included) — read live at query time. */
  evidenceLedgerTail: SovereignLedgerEntry[];
  ledgerLength: number;
  lastServicesEvent: WorkspaceEventRecord | null;
  lastRuntimeEvent: WorkspaceEventRecord | null;
  /** Last 10 events across both buses, arrival order — the arbiter. */
  eventLogTail: WorkspaceEventRecord[];
  /** Generation-events ring buffer (last 20). */
  generationEvents: GenerationEvent[];
}

export interface WorkspaceLiveInput {
  getClusters: () => Array<{
    id: string;
    name: string;
    nodes: Array<{ id: string; panelId: string; label?: string }>;
    openNodeIds: string[];
    pinnedPanelIds: string[];
  }>;
  getOpenPanelIds: () => string[];
  getPinnedPanelIds: () => string[];
  getOrbState: () => NVKOrbState;
  getModelState: () => WorkspaceModelSnapshot;
}

const EVENT_LOG_SIZE = 10;
const LEDGER_TAIL_SIZE = 10;

const eventLog: WorkspaceEventRecord[] = [];
let lastServicesEvent: WorkspaceEventRecord | null = null;
let lastRuntimeEvent: WorkspaceEventRecord | null = null;
let lastTransitionEvent: WorkspaceEventRecord | null = null;
/** Orb state derived from bus events alone (fallback when no live getter). */
let mappedOrbState: NVKOrbState = 'IDLE';
let live: WorkspaceLiveInput | null = null;
let attached = false;
let unsubServices: (() => void) | null = null;
let unsubRuntime: (() => void) | null = null;

function record(record: WorkspaceEventRecord): void {
  eventLog.push(record);
  while (eventLog.length > EVENT_LOG_SIZE) eventLog.shift();
  if (record.bus === 'services') {
    lastServicesEvent = record;
    const next = mapServicesEventToOrbState((record.event as ServicesEvent).type);
    if (next) {
      mappedOrbState = next;
      lastTransitionEvent = record;
    }
  } else {
    lastRuntimeEvent = record;
    const ev = record.event as RuntimeEvent;
    if (ev.type === 'ui.state_changed') {
      const next = mapRuntimeStateToOrbState(ev.state);
      if (next) {
        mappedOrbState = next;
        lastTransitionEvent = record;
      }
    }
  }
}

function onServicesEvent(event: ServicesEvent): void {
  record({ bus: 'services', receivedAt: Date.now(), event });
}

function onRuntimeEvent(event: RuntimeEvent): void {
  record({ bus: 'runtime', receivedAt: Date.now(), event });
}

/**
 * Attach the store: subscribe to both buses and register the live getters
 * App supplies. Safe to call repeatedly — re-attaching replaces the live
 * input without duplicating subscriptions. Returns a detach function.
 */
export function attachWorkspaceState(input: WorkspaceLiveInput): () => void {
  live = input;
  if (!attached) {
    unsubServices = eventBus.subscribe(onServicesEvent);
    unsubRuntime = nvkEventBus.subscribe(onRuntimeEvent);
    attached = true;
  }
  return detachWorkspaceState;
}

export function detachWorkspaceState(): void {
  if (unsubServices) unsubServices();
  if (unsubRuntime) unsubRuntime();
  unsubServices = null;
  unsubRuntime = null;
  attached = false;
  live = null;
}

/** Test/maintenance only: clears the recorded event log. */
export function clearWorkspaceEventLog(): void {
  eventLog.length = 0;
  lastServicesEvent = null;
  lastRuntimeEvent = null;
  lastTransitionEvent = null;
  mappedOrbState = 'IDLE';
}

export function isWorkspaceStateAttached(): boolean {
  return attached;
}

/**
 * The snapshot. Clusters/panels/orb/model come from the live getters when
 * attached (App's real state); the event records, ledger tail, and
 * generation buffer come from the event stream. Unattached, the snapshot
 * still reports the bus-derived orb state + event log — never invented
 * workspace content (clusters/panels are empty, not guessed).
 */
export function getWorkspaceState(): WorkspaceState {
  const clusters: WorkspaceClusterSnapshot[] = (live?.getClusters() || []).map((c) => ({
    id: c.id,
    name: c.name,
    nodes: c.nodes.map((n) => ({
      id: n.id,
      panelId: n.panelId,
      label: n.label || n.panelId,
      // Pinned panel ids are instance ids `panelId::nodeId` (App.tsx);
      // a node is pinned when a pinned instance belongs to it.
      status: (c.pinnedPanelIds.some((pid) => pid === n.id || pid.endsWith(`::${n.id}`))
        ? 'pinned'
        : c.openNodeIds.includes(n.id)
          ? 'open'
          : 'closed') as 'open' | 'pinned' | 'closed',
    })),
  }));
  const ledgerEntries = sovereignLedger.getEntries();
  return {
    generatedAt: Date.now(),
    clusters,
    openPanels: live?.getOpenPanelIds() || [],
    pinnedPanels: live?.getPinnedPanelIds() || [],
    orb: {
      state: live?.getOrbState() || mappedOrbState,
      lastTransitionEvent,
    },
    model: live?.getModelState() || {
      loadedModel: null,
      isLoaded: false,
      loadProgress: 0,
      loadStatus: 'Idle',
      cacheState: 'unknown',
    },
    evidenceLedgerTail: ledgerEntries.slice(-LEDGER_TAIL_SIZE),
    ledgerLength: ledgerEntries.length,
    lastServicesEvent,
    lastRuntimeEvent,
    eventLogTail: [...eventLog],
    generationEvents: getGenerationEvents(),
  };
}

/**
 * Mid-run read-back: a citable one-paragraph answer to "what is open,
 * what did the last event say, what is the orb showing". The agent cites
 * this string in its next action instead of guessing workspace state.
 */
export function describeWorkspaceState(): string {
  const s = getWorkspaceState();
  const lastServices = s.lastServicesEvent
    ? `${s.lastServicesEvent.event.type} (${s.lastServicesEvent.bus})`
    : 'none yet';
  const lastRuntime = s.lastRuntimeEvent
    ? `${s.lastRuntimeEvent.event.type} (${s.lastRuntimeEvent.bus})`
    : 'none yet';
  const lastGen = s.generationEvents[s.generationEvents.length - 1];
  const model = s.model.isLoaded
    ? `loaded model ${s.model.loadedModel || 'unknown'}`
    : `no model loaded (${s.model.loadStatus}, ${Math.round(s.model.loadProgress)}%)`;
  return (
    `Workspace: ${s.openPanels.length} panel(s) open [${s.openPanels.join(', ') || 'none'}], ` +
    `${s.pinnedPanels.length} pinned [${s.pinnedPanels.join(', ') || 'none'}]. ` +
    `Orb ${s.orb.state}` +
    (s.orb.lastTransitionEvent ? ` (last transition: ${s.orb.lastTransitionEvent.event.type})` : ' (no transition seen)') +
    `. Model: ${model}. ` +
    `Last services event: ${lastServices}; last runtime event: ${lastRuntime}. ` +
    `Evidence ledger: ${s.ledgerLength} entr${s.ledgerLength === 1 ? 'y' : 'ies'}` +
    (s.evidenceLedgerTail.length > 0
      ? `, latest hash ${s.evidenceLedgerTail[s.evidenceLedgerTail.length - 1].entryHash.slice(0, 12)}…`
      : ', empty') +
    `. Last generation: ` +
    (lastGen
      ? `${lastGen.provider}/${lastGen.modelId || 'unknown model'} ${lastGen.status} in ${lastGen.elapsedMs}ms`
      : 'none yet') +
    `.`
  );
}

/**
 * State-query call for the agent mid-run. Returns the structured snapshot
 * plus the citable description — the caller quotes `citation` in its next
 * action so the perception is on the record, not in its head.
 */
export function queryWorkspaceState(): { snapshot: WorkspaceState; citation: string } {
  const snapshot = getWorkspaceState();
  return { snapshot, citation: describeWorkspaceState() };
}
