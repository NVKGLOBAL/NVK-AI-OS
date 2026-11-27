/**
 * Live-feed text mapping (fix round, 2026-11-27).
 *
 * The orb's "Live — what NVK just did" feed renders events from TWO
 * buses, and both were dead for different reasons:
 *
 * - services/EventBus (`eventBus`, NVKEvent from types.ts): the feed
 *   subscribes to it, but NOTHING in the codebase ever published to it
 *   — no `.publish(` call existed anywhere. The chat paths now publish
 *   here (see NVKCommandLayer: catalog answers, brain answers, panel
 *   commands, search/math answers, executed runs).
 * - src/nvk/events/NVKEventBus (`nvkEventBus`, NVKEvent from
 *   NVKEventTypes.ts): the runtime DOES publish here (IntentEngine
 *   intent.detected, Planner plan.created, CapabilityRegistry
 *   artifact.created) — but the feed never subscribed to this bus.
 *   The feed now subscribes to both.
 *
 * These two mappers are the ONLY place bus events become feed text.
 * They are pure functions so the mapping is unit-testable, and they
 * never invent: an event type with no mapping renders its raw type,
 * and `ui.state_changed` renders nothing (the orb already shows orb
 * state — the feed would just repeat it).
 */
import type { NVKEvent } from '../types';
import type { NVKEvent as RuntimeNVKEvent } from '../src/nvk/events/NVKEventTypes';

/**
 * Feed text for an event on services/EventBus. Preserves the wording
 * the previous round shipped for the types it already handled
 * (ACTION_STARTED, APP_SPAWNED, TASK_STARTED, TASK_COMPLETED,
 * TASK_FAILED) and adds the missing ones (ACTION_COMPLETED,
 * ACTION_FAILED, MODEL_LOADING, WEB_REQUEST_STARTED, FILE_CREATED,
 * TASK_VERIFIED) instead of falling through to the raw type.
 */
export function liveEventText(e: NVKEvent): string {
  switch (e.type) {
    case 'ACTION_STARTED': return `Processing: ${e.description}`;
    case 'ACTION_COMPLETED': return `Done: ${e.actionId}`;
    case 'ACTION_FAILED': return `Failed: ${e.actionId} — ${e.error}`;
    case 'APP_SPAWNED': return `Launched ${e.appId}`;
    case 'TASK_STARTED': return `Task initiated: ${e.taskId}`;
    case 'TASK_COMPLETED': return `Verification complete: ${e.taskId}`;
    case 'TASK_FAILED': return `Task failed: ${e.error}`;
    case 'MODEL_LOADING': return `Loading model: ${e.progress}%`;
    case 'WEB_REQUEST_STARTED': return `Web request: ${e.url}`;
    case 'FILE_CREATED': return `File created: ${e.path}`;
    case 'TASK_VERIFIED': return `Verified: ${e.taskId}`;
    default: return e.type;
  }
}

/**
 * Feed text for an event on src/nvk/events/NVKEventBus (the runtime's
 * bus). Returns null for `ui.state_changed` — orb-state noise the feed
 * must not repeat. Callers skip nulls.
 */
export function runtimeEventText(e: RuntimeNVKEvent): string | null {
  switch (e.type) {
    case 'intent.detected': return `Intent: ${e.intent}`;
    case 'plan.created': return `Plan created: ${e.taskId} (${e.steps.length} steps)`;
    case 'tool.started': return `Tool started: ${e.tool}`;
    case 'tool.completed': return `Tool done: ${e.tool}`;
    case 'artifact.created': return `Created ${e.artifactId}`;
    case 'task.completed': return `Task complete: ${e.taskId}`;
    case 'task.failed': return `Task failed: ${e.taskId} — ${String(e.error)}`;
    case 'ui.state_changed': return null;
    default: return (e as { type: string }).type;
  }
}
