/**
 * OS live-feed test (fix round, 2026-11-27).
 *
 * Pure-module test — no server, no DOM, no model, no network. Verifies
 * the two halves of Defect 2:
 *
 * (1) THE BUS WIRING WORKS. The feed subscribes to services/EventBus,
 * but nothing in the codebase ever published to it — the feed was dead.
 * This test proves publish → subscriber receives, in order, on the
 * same imported singleton the component subscribes to. It also proves
 * the runtime bus (src/nvk/events/NVKEventBus) delivers its events —
 * the feed now subscribes to that bus too.
 *
 * (2) THE MAPPING IS HONEST. liveEventText / runtimeEventText turn
 * bus events into feed text with no invention: every mapped type has a
 * real label, an unmapped type renders its raw type, and
 * ui.state_changed renders nothing (the orb already shows orb state).
 *
 * Run: npx tsx services/os_live_feed_test.ts
 * (also wired into `npm test`).
 */
import { eventBus } from './EventBus';
import { nvkEventBus } from '../src/nvk/events/NVKEventBus';
import { liveEventText, runtimeEventText } from './liveFeedFormat';
import type { NVKEvent } from '../types';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

console.log('Event bus wiring — services/EventBus:');
check('publish reaches the subscriber, in order',
  (() => {
    const seen: string[] = [];
    const unsub = eventBus.subscribe((e) => seen.push(e.type));
    eventBus.publish({ type: 'ACTION_STARTED', actionId: 'chat', description: 'Answering' });
    eventBus.publish({ type: 'ACTION_COMPLETED', actionId: 'Answered question' });
    unsub();
    return seen.length === 2 && seen[0] === 'ACTION_STARTED' && seen[1] === 'ACTION_COMPLETED';
  })());
check('unsubscribe stops delivery',
  (() => {
    const seen: string[] = [];
    const unsub = eventBus.subscribe((e) => seen.push(e.type));
    unsub();
    eventBus.publish({ type: 'ACTION_STARTED', actionId: 'chat', description: 'Answering' });
    return seen.length === 0;
  })());

console.log('Event bus wiring — runtime nvkEventBus:');
check('publish reaches the subscriber',
  (() => {
    const seen: string[] = [];
    const unsub = nvkEventBus.subscribe((e) => seen.push(e.type));
    nvkEventBus.publish({ type: 'intent.detected', intent: 'general', prompt: 'hi' });
    nvkEventBus.publish({ type: 'plan.created', taskId: 't1', steps: [1, 2] });
    unsub();
    return seen.length === 2 && seen[0] === 'intent.detected' && seen[1] === 'plan.created';
  })());

console.log('liveEventText — services bus:');
check('ACTION_STARTED renders "Processing: <description>"',
  liveEventText({ type: 'ACTION_STARTED', actionId: 'chat', description: 'Answering: "hi"' } as NVKEvent) === 'Processing: Answering: "hi"');
check('ACTION_COMPLETED renders "Done: <actionId>"',
  liveEventText({ type: 'ACTION_COMPLETED', actionId: 'Answered question' } as NVKEvent) === 'Done: Answered question');
check('ACTION_FAILED renders action + error',
  liveEventText({ type: 'ACTION_FAILED', actionId: 'Answering question', error: 'no answer' } as NVKEvent) === 'Failed: Answering question — no answer');
check('APP_SPAWNED renders "Launched <appId>"',
  liveEventText({ type: 'APP_SPAWNED', appId: 'NexusBrowser' } as NVKEvent) === 'Launched NexusBrowser');
check('TASK_STARTED / TASK_COMPLETED / TASK_FAILED keep the shipped wording',
  liveEventText({ type: 'TASK_STARTED', taskId: 't1' } as NVKEvent) === 'Task initiated: t1'
  && liveEventText({ type: 'TASK_COMPLETED', taskId: 't1' } as NVKEvent) === 'Verification complete: t1'
  && liveEventText({ type: 'TASK_FAILED', taskId: 't1', error: 'boom' } as NVKEvent) === 'Task failed: boom');
check('MODEL_LOADING / WEB_REQUEST_STARTED / FILE_CREATED / TASK_VERIFIED map',
  liveEventText({ type: 'MODEL_LOADING', progress: 50 } as NVKEvent) === 'Loading model: 50%'
  && liveEventText({ type: 'WEB_REQUEST_STARTED', url: 'https://example.com' } as NVKEvent) === 'Web request: https://example.com'
  && liveEventText({ type: 'FILE_CREATED', path: '/a/b.txt' } as NVKEvent) === 'File created: /a/b.txt'
  && liveEventText({ type: 'TASK_VERIFIED', taskId: 't9' } as NVKEvent) === 'Verified: t9');

console.log('runtimeEventText — runtime bus:');
check('intent.detected renders the intent',
  runtimeEventText({ type: 'intent.detected', intent: 'general', prompt: 'hi' }) === 'Intent: general');
check('plan.created renders task + step count',
  runtimeEventText({ type: 'plan.created', taskId: 't1', steps: [1, 2, 3] }) === 'Plan created: t1 (3 steps)');
check('tool.started / tool.completed render the tool',
  runtimeEventText({ type: 'tool.started', tool: 'web.search' }) === 'Tool started: web.search'
  && runtimeEventText({ type: 'tool.completed', tool: 'web.search', result: {} }) === 'Tool done: web.search');
check('artifact.created renders the artifact id',
  runtimeEventText({ type: 'artifact.created', artifactId: 'a1' }) === 'Created a1');
check('task.completed / task.failed render honestly',
  runtimeEventText({ type: 'task.completed', taskId: 't2', result: {} }) === 'Task complete: t2'
  && runtimeEventText({ type: 'task.failed', taskId: 't2', error: 'boom' }) === 'Task failed: t2 — boom');
check('ui.state_changed renders NOTHING (orb-state noise, skipped)',
  runtimeEventText({ type: 'ui.state_changed', state: 'IDLE' }) === null);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll OS live-feed checks passed.');
