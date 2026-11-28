/**
 * Generation-events ring buffer (matrix program, 2026-11-27 — item 6).
 *
 * Adopted from the NVK Agent's v0.1.4 pattern
 * (nvk-agent-build/src/intelligence/pipeline.ts): stage/generation events
 * are ephemeral, so a panel that mounts AFTER a run would otherwise see
 * nothing. This buffer is the durable record — the last 20 generations,
 * in memory only, never leaving the device.
 *
 * Fed ONLY by real generation start/progress/complete calls from
 * LocalLLMContext.generateText (local model, cloud proxy, free gateway,
 * Ollama). Every record also publishes a GENERATION_* event on the
 * services bus, so the orb, the feed, and the resonance visualizer read
 * the same event stream the buffer records — never a parallel source of
 * truth, and never a timer. Visualizer components are NOT touched here;
 * they read this buffer through getGenerationEvents().
 */

import { eventBus } from './EventBus';

export type GenerationStatus = 'started' | 'progress' | 'complete' | 'failed';

export interface GenerationEvent {
  id: string;
  at: number;
  /** 'local' | 'cloud' | 'gateway' | 'ollama' — which generateText path ran. */
  provider: string;
  /** Model id when known, else null. Never fabricated. */
  modelId: string | null;
  status: GenerationStatus;
  elapsedMs: number;
  /** Characters produced so far (0 until completion — no per-token stream). */
  charsProduced: number;
  /** Measured tokens/sec when the path can measure it, else null. */
  tokensPerSecond: number | null;
}

export const GENERATION_BUFFER_SIZE = 20;

const buffer: GenerationEvent[] = [];
const byId = new Map<string, GenerationEvent>();

function push(entry: GenerationEvent): void {
  buffer.push(entry);
  byId.set(entry.id, entry);
  while (buffer.length > GENERATION_BUFFER_SIZE) {
    const dropped = buffer.shift();
    if (dropped) byId.delete(dropped.id);
  }
}

/** Last 20 generation events, oldest first. A copy — callers cannot mutate the buffer. */
export function getGenerationEvents(): GenerationEvent[] {
  return [...buffer];
}

/** Test/maintenance only: empties the buffer. Never called by production code. */
export function clearGenerationEvents(): void {
  buffer.length = 0;
  byId.clear();
}

export function recordGenerationStart(provider: string, modelId: string | null): GenerationEvent {
  const entry: GenerationEvent = {
    id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    provider,
    modelId,
    status: 'started',
    elapsedMs: 0,
    charsProduced: 0,
    tokensPerSecond: null,
  };
  push(entry);
  eventBus.publish({
    type: 'GENERATION_STARTED',
    generationId: entry.id,
    provider,
    model: modelId,
  });
  return entry;
}

export function recordGenerationProgress(
  generationId: string,
  charsProduced: number,
  startedAt: number,
): GenerationEvent | null {
  const entry = byId.get(generationId);
  if (!entry) return null;
  entry.status = 'progress';
  entry.charsProduced = charsProduced;
  entry.elapsedMs = Date.now() - startedAt;
  eventBus.publish({
    type: 'GENERATION_PROGRESS',
    generationId,
    charsProduced,
    elapsedMs: entry.elapsedMs,
  });
  return entry;
}

export function recordGenerationComplete(
  generationId: string,
  opts: { charsProduced: number; startedAt: number; tokensPerSecond?: number | null; success: boolean },
): GenerationEvent | null {
  const entry = byId.get(generationId);
  if (!entry) return null;
  entry.status = opts.success ? 'complete' : 'failed';
  entry.charsProduced = opts.charsProduced;
  entry.elapsedMs = Date.now() - opts.startedAt;
  entry.tokensPerSecond = opts.tokensPerSecond ?? null;
  eventBus.publish({
    type: 'GENERATION_COMPLETED',
    generationId,
    provider: entry.provider,
    model: entry.modelId,
    elapsedMs: entry.elapsedMs,
    charsProduced: entry.charsProduced,
    tokensPerSecond: entry.tokensPerSecond,
    success: opts.success,
  });
  return entry;
}
