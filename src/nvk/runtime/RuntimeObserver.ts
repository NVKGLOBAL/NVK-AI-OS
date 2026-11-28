/**
 * RuntimeObserver — the runtime's "see" subscription (matrix program,
 * 2026-11-27 — item 6; design §2.6 point 2).
 *
 * Today the runtime only PUBLISHES on its own bus (src/nvk/events).
 * This module makes it also SUBSCRIBE to the services bus
 * (services/EventBus), so the agent's reasoning can observe capability
 * results, task completions, file changes, and panel actions as they
 * happen — not only when it asks.
 *
 * The observation log is the runtime's sense record: the last 50 services
 * events it actually saw, each stamped with arrival time. NVKRuntime (or
 * any reasoning step) reads it mid-run with getRuntimeObservations() /
 * getLastObservationOfType() and cites what it saw in its next action.
 *
 * App.tsx wiring (coordinator applies at integration — App.tsx is not
 * edited here):
 *   import { attachRuntimeObserver } from './src/nvk/runtime/RuntimeObserver';
 *   useEffect(() => attachRuntimeObserver(), []);
 * The workspace snapshot (lib/workspaceState.ts) subscribes to both buses
 * itself; this observer is the runtime-side half of the same pattern.
 */

import { eventBus } from '../../../services/EventBus';
import type { NVKEvent } from '../../../types';

export interface RuntimeObservation {
  receivedAt: number;
  event: NVKEvent;
}

const MAX_OBSERVATIONS = 50;

const observations: RuntimeObservation[] = [];
let attached = false;
let unsubscribe: (() => void) | null = null;

export function attachRuntimeObserver(): () => void {
  if (!attached) {
    unsubscribe = eventBus.subscribe((event: NVKEvent) => {
      observations.push({ receivedAt: Date.now(), event });
      while (observations.length > MAX_OBSERVATIONS) observations.shift();
    });
    attached = true;
  }
  return detachRuntimeObserver;
}

export function detachRuntimeObserver(): void {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  attached = false;
}

export function isRuntimeObserverAttached(): boolean {
  return attached;
}

/** All observations the runtime has seen, oldest first. A copy. */
export function getRuntimeObservations(): RuntimeObservation[] {
  return [...observations];
}

/** Most recent observation of one event type, or null when never seen. */
export function getLastObservationOfType(type: NVKEvent['type']): RuntimeObservation | null {
  for (let i = observations.length - 1; i >= 0; i--) {
    if (observations[i].event.type === type) return observations[i];
  }
  return null;
}

/** Test/maintenance only: empties the observation log. */
export function clearRuntimeObservations(): void {
  observations.length = 0;
}
