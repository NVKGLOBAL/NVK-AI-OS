/**
 * WorkspaceState / see direction + generation-events ring buffer tests
 * (matrix program, 2026-11-27 — item 6; design §2.6).
 *
 * 1. A scripted run publishes real events on both buses; the snapshot
 *    read mid-run cites them (open panels, orb state, last event per bus,
 *    model state, ledger tail).
 * 2. Snapshot-vs-log agreement: the snapshot's lastServicesEvent /
 *    lastRuntimeEvent / eventLogTail equal the events actually published —
 *    if they disagree, the event log wins and this test fails.
 * 3. Ring buffer: 25 real generation records keep exactly the last 20,
 *    oldest dropped, in arrival order; each record emits a services-bus
 *    GENERATION_* event.
 * 4. RuntimeObserver: the runtime side sees services-bus capability
 *    results, task completions, file changes, and panel actions.
 *
 * Run: npx tsx services/os_workspace_state_test.ts
 * (NOT yet wired into `npm test` — the coordinator wires it at integration.)
 */
import {
  attachWorkspaceState,
  detachWorkspaceState,
  clearWorkspaceEventLog,
  getWorkspaceState,
  describeWorkspaceState,
  queryWorkspaceState,
} from '../lib/workspaceState';
import {
  recordGenerationStart,
  recordGenerationComplete,
  getGenerationEvents,
  clearGenerationEvents,
  GENERATION_BUFFER_SIZE,
} from './generationEvents';
import {
  attachRuntimeObserver,
  detachRuntimeObserver,
  getRuntimeObservations,
  getLastObservationOfType,
  clearRuntimeObservations,
} from '../src/nvk/runtime/RuntimeObserver';
import { eventBus } from './EventBus';
import { nvkEventBus } from '../src/nvk/events/NVKEventBus';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

const LIVE = {
  getClusters: () => [
    {
      id: 'c1',
      name: 'Core',
      nodes: [
        { id: 'n1', panelId: 'chat', label: 'Chat' },
        { id: 'n2', panelId: 'terminal', label: 'Terminal' },
      ],
      openNodeIds: ['n1'],
      pinnedPanelIds: ['chat::n1'],
    },
  ],
  getOpenPanelIds: () => ['chat'],
  getPinnedPanelIds: () => ['chat::n1'],
  getOrbState: () => 'THINKING' as const,
  getModelState: () => ({
    loadedModel: 'gemma-3-1b-it-q4f16_1-MLC',
    isLoaded: true,
    loadProgress: 100,
    loadStatus: 'Ready',
    cacheState: 'cached' as const,
  }),
};

async function main() {
  console.log('WorkspaceState / see-direction tests (item 6):');
  clearWorkspaceEventLog();
  clearGenerationEvents();
  clearRuntimeObservations();

  // --- 1. Scripted run: publish real events, read the snapshot mid-run. ---
  attachWorkspaceState(LIVE);
  attachRuntimeObserver();

  // The runtime observes capability work on the services bus.
  eventBus.publish({ type: 'TASK_STARTED', taskId: 'task-1' });
  eventBus.publish({ type: 'ACTION_STARTED', actionId: 'a1', description: 'calculate 2+2' });
  nvkEventBus.publish({ type: 'intent.detected', intent: 'calculate', prompt: '2+2' });
  nvkEventBus.publish({ type: 'ui.state_changed', state: 'THINKING' });
  eventBus.publish({ type: 'ACTION_COMPLETED', actionId: 'a1' });
  eventBus.publish({ type: 'TASK_COMPLETED', taskId: 'task-1' });
  eventBus.publish({ type: 'FILE_CREATED', path: '/notes/answer.md' });
  eventBus.publish({ type: 'APP_SPAWNED', appId: 'terminal' });

  // Mid-run read-back: the agent asks what is open / what happened last.
  const { snapshot, citation } = queryWorkspaceState();
  check('snapshot lists the open panel', snapshot.openPanels.includes('chat'));
  check('snapshot lists the pinned panel', snapshot.pinnedPanels.includes('chat::n1'));
  check(
    'snapshot cluster node status comes from live state',
    snapshot.clusters[0]?.nodes.find((n) => n.id === 'n1')?.status === 'pinned',
  );
  check('snapshot orb state comes from live state', snapshot.orb.state === 'THINKING');
  check(
    'snapshot model state comes from live state',
    snapshot.model.isLoaded && snapshot.model.loadedModel === 'gemma-3-1b-it-q4f16_1-MLC',
  );
  check(
    'citation names the open panel, orb, and last events',
    citation.includes('chat') && citation.includes('THINKING') && citation.includes('APP_SPAWNED'),
    citation,
  );

  // --- 2. Snapshot-vs-log agreement: the snapshot must cite what the log says. ---
  check(
    'last services event in snapshot is the last published services event',
    snapshot.lastServicesEvent?.event.type === 'APP_SPAWNED',
    JSON.stringify(snapshot.lastServicesEvent?.event),
  );
  check(
    'last runtime event in snapshot is the last published runtime event',
    snapshot.lastRuntimeEvent?.event.type === 'ui.state_changed',
    JSON.stringify(snapshot.lastRuntimeEvent?.event),
  );
  check(
    'event log tail ends with the same events, in arrival order',
    snapshot.eventLogTail.length > 0 &&
      snapshot.eventLogTail[snapshot.eventLogTail.length - 1].event.type === 'APP_SPAWNED',
  );
  check(
    'orb last-transition event is a real bus event',
    snapshot.orb.lastTransitionEvent !== null &&
      ['TASK_STARTED', 'ACTION_STARTED', 'ACTION_COMPLETED', 'TASK_COMPLETED', 'APP_SPAWNED', 'FILE_CREATED'].includes(
        snapshot.orb.lastTransitionEvent.event.type as string,
      ),
    JSON.stringify(snapshot.orb.lastTransitionEvent?.event),
  );
  check(
    'describeWorkspaceState cites the same last events as the snapshot',
    describeWorkspaceState().includes('APP_SPAWNED') &&
      describeWorkspaceState().includes('ui.state_changed'),
  );

  // --- 2b. RuntimeObserver: the runtime sees services-bus work as it
  // happens. Checked HERE, before the ring-buffer flood below (25
  // generations = 50 bus events would evict these from the last-50 log).
  const obs = getRuntimeObservations();
  check(
    'runtime observed the capability + task + file + panel events',
    ['TASK_STARTED', 'ACTION_STARTED', 'ACTION_COMPLETED', 'TASK_COMPLETED', 'FILE_CREATED', 'APP_SPAWNED'].every(
      (t) => obs.some((o) => o.event.type === t),
    ),
  );
  check(
    'last observation of FILE_CREATED names the real path',
    (getLastObservationOfType('FILE_CREATED')?.event as { path?: string } | undefined)?.path ===
      '/notes/answer.md',
  );

  // --- 3. Ring buffer: 25 generations keep exactly the last 20. ---
  const seenBusEvents: string[] = [];
  const unsub = eventBus.subscribe((e) => {
    if (e.type.startsWith('GENERATION_')) seenBusEvents.push(e.type);
  });
  const ids: string[] = [];
  for (let i = 1; i <= 25; i++) {
    const gen = recordGenerationStart('local', 'gemma-3-1b-it-q4f16_1-MLC');
    ids.push(gen.id);
    recordGenerationComplete(gen.id, {
      charsProduced: i,
      startedAt: gen.at,
      tokensPerSecond: null,
      success: true,
    });
  }
  unsub();
  const buf = getGenerationEvents();
  check(
    `ring buffer holds exactly the last ${GENERATION_BUFFER_SIZE}`,
    buf.length === GENERATION_BUFFER_SIZE,
    `got ${buf.length}`,
  );
  check(
    'ring buffer dropped the oldest 5 and kept arrival order',
    buf[0].id === ids[5] && buf[buf.length - 1].id === ids[24] && buf[0].charsProduced === 6,
    `first=${buf[0]?.charsProduced} last=${buf[buf.length - 1]?.charsProduced}`,
  );
  check(
    'every generation emitted start + complete on the services bus',
    seenBusEvents.filter((t) => t === 'GENERATION_STARTED').length === 25 &&
      seenBusEvents.filter((t) => t === 'GENERATION_COMPLETED').length === 25,
    `saw ${seenBusEvents.length} generation bus events`,
  );
  check(
    'snapshot generation buffer matches the ring buffer',
    getWorkspaceState().generationEvents.length === GENERATION_BUFFER_SIZE,
  );
  check('tokensPerSecond stays null (never fabricated)', buf.every((g) => g.tokensPerSecond === null));

  // --- 4. RuntimeObserver still sees the generation events (last 50). ---
  check(
    'observer saw the generation events too',
    getRuntimeObservations().some((o) => o.event.type === 'GENERATION_COMPLETED'),
  );

  detachWorkspaceState();
  detachRuntimeObserver();

  console.log(failures === 0 ? 'All workspace-state checks passed.' : `${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
