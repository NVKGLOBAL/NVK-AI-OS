/**
 * Orb black-frame watchdog decision (round-3 phone fix, 2026-11-27).
 *
 * RETIRED FROM THE STAGE (2026-11-27, phone retest 14:00–14:06 PT):
 * the stage no longer samples pixels or consults this module. The
 * phone retest proved the sampler wrong, not the scene — the lattice
 * visibly rendered on every fresh load while the sampler reported
 * black, because readPixels returns black on iOS WKWebView while the
 * scene renders (preserveDrawingBuffer:false). The fallback now fires
 * only on real failures (onShaderError, webglcontextlost, render
 * throw) with the diagnosable reason kept. This module stays as a
 * tested pure function (services/os_watchdog_test.ts §§1–7) in case a
 * trustworthy sampling path ever exists — it must NOT be re-wired as
 * the fallback signal on a preserveDrawingBuffer:false canvas.
 *
 * Pure logic — no DOM, no three.js — so the regression tests in
 * services/os_watchdog_test.ts exercise the exact decision the stage
 * USED to run in CodexOrbSystem.tsx.
 *
 * What the desktop check (2026-11-27, 13:42–13:44 PT) proved: the
 * first-load CSS fallback is NOT phone-specific. Desktop also showed
 * "3D preview unavailable on this device" after both hard refreshes,
 * and RETRY 3D recovered a live WebGL scene there. The watchdog was
 * falling back on transient black frames during startup/shader and
 * bloom compile — not on a real failure. So the fallback decision
 * now requires ALL of:
 *   1. the warm-up window has passed (shaders + bloom compiled),
 *   2. a trustworthy readback (gl.readPixels in the render task —
 *      drawImage from a preserveDrawingBuffer:false canvas returns
 *      black on iOS WKWebView even while the scene renders, which is
 *      the prime suspect for the iPhone RETRY loop),
 *   3. sustained black across consecutive samples (2 with the bloom
 *      composer → drop it; 2 more direct → fallback).
 * A single bright sample resets the streak. An inconclusive readback
 * is not evidence of black and never counts.
 *
 * A real failure still falls back immediately through the caller's
 * own hooks (context creation throw, webglcontextlost, or
 * renderer.debug.onShaderError) with the reason surfaced — the
 * watchdog is only for the silent-black case, where no error fires.
 */

export const WATCHDOG_WARMUP_MS = 5000;
export const WATCHDOG_BLACK_THRESHOLD = 2;

export type WatchdogAction = 'none' | 'drop-composer' | 'fallback';

export interface WatchdogState {
  streak: number;
  composerDropped: boolean;
  done: boolean;
}

export interface WatchdogSample {
  /** performance.now() at the sample. */
  nowMs: number;
  /** performance.now() value before which black samples never count. */
  armedAtMs: number;
  /** readPixels verdict for this sample. */
  isBlack: boolean;
  /** false when readPixels itself failed — inconclusive, never counts. */
  readbackOk: boolean;
  state: WatchdogState;
}

export interface WatchdogDecision {
  action: WatchdogAction;
  next: WatchdogState;
  /** Set on 'fallback' — the diagnosable reason for the fallback. */
  reason?: string;
}

export const initialWatchdogState = (): WatchdogState => ({
  streak: 0,
  composerDropped: false,
  done: false,
});

export function decideWatchdogSample(sample: WatchdogSample): WatchdogDecision {
  const { nowMs, armedAtMs, isBlack, readbackOk, state } = sample;
  if (state.done) return { action: 'none', next: state };
  // Warm-up: transient black while shaders/bloom compile never counts.
  if (nowMs < armedAtMs) {
    return { action: 'none', next: { ...state, streak: 0 } };
  }
  // Inconclusive readback is not evidence of black — ignore the sample.
  if (!readbackOk) return { action: 'none', next: state };
  if (!isBlack) return { action: 'none', next: { ...state, streak: 0 } };
  const streak = state.streak + 1;
  if (streak < WATCHDOG_BLACK_THRESHOLD) {
    return { action: 'none', next: { ...state, streak } };
  }
  if (!state.composerDropped) {
    return { action: 'drop-composer', next: { streak: 0, composerDropped: true, done: false } };
  }
  return {
    action: 'fallback',
    next: { streak: 0, composerDropped: true, done: true },
    reason:
      'Canvas black on 4 consecutive samples after warm-up (bloom composer dropped, direct render still black)',
  };
}
