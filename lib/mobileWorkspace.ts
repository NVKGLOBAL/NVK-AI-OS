/**
 * Mobile-first redesign helpers (2026-11-27).
 *
 * Pure functions — no DOM, no React — so the redesign's decisions are
 * pinned by services/os_mobile_redesign_test.ts. The components
 * (App, NVKCommandLayer, TutorialOverlay) call these; the rules live
 * here, once.
 */
import type { WorkspaceMode } from '../types';

/**
 * Resolve the workspace mode at first load.
 *
 * Mobile-first (2026-11-27): a phone ALWAYS opens on the full-screen
 * 3D experience. The saved mode is the DESKTOP mode and is preserved
 * untouched — the phone just doesn't render it. `split` is the mode
 * NvK described on his phone (a 32vh 3D strip + desk + dock stacked),
 * so it must never be the first thing a phone shows.
 *
 * R11-3 (kept): on desktop, a saved grid/2d mode with persisted open
 * panels opens on the orb instead — the panels restore front and
 * centre with no orb in view otherwise. Legacy '3d' migrates to
 * 'immersive'; anything unknown falls back to 'immersive'.
 */
export function resolveWorkspaceMode(
  isMobile: boolean,
  saved: string | null,
  hasOpenPanels: boolean
): WorkspaceMode {
  if (isMobile) return 'immersive';
  let mode: WorkspaceMode | null = null;
  if (saved === '3d') mode = 'immersive';
  else if (saved === 'immersive' || saved === 'split' || saved === 'grid' || saved === '2d') mode = saved;
  if ((mode === 'grid' || mode === '2d') && hasOpenPanels) return 'immersive';
  return mode ?? 'immersive';
}

/**
 * Effective mode at render time. The persisted `workspaceMode` state
 * stays the desktop value; on a phone every mode except the explicit
 * '2d' renders immersive. '2d' is reachable at runtime only — the
 * WebGL crash cascade (ThreeErrorBoundary onError / the fallback
 * button) sets it — so a dead GPU can still reach the desk. A phone
 * that saved '2d' from a crash still opens immersive on the NEXT load
 * (resolveWorkspaceMode above), because the crash may have been
 * transient.
 */
export function effectiveWorkspaceMode(isMobile: boolean, mode: WorkspaceMode): WorkspaceMode {
  if (isMobile && mode !== '2d') return 'immersive';
  return mode;
}

/** The mobile hint pill persists in the same key as the 3-step tour. */
export const MOBILE_HINT_DISMISSED_KEY = 'nvk_tutorial_completed';

/** Mobile hint text (single pill, above the composer). */
export const MOBILE_HINT_TEXT = 'Tap the orb to talk — ask anything, no download needed';

/**
 * One-line live-feed overlay (mobile, above the composer). The
 * liveEvents state is unchanged from the fix round; this only formats
 * the latest event for the single compact line. Empty state is honest,
 * never a fake event.
 */
export function latestLiveEventLine(events: Array<{ time: string; text: string }>): string {
  if (events.length === 0) return 'Nothing yet — ask NVK something';
  const last = events[events.length - 1];
  return `${last.time} · ${last.text}`;
}

/**
 * Autofocus gate (2026-11-27): focusing the input on mount pops the
 * iOS keyboard on load and shrinks the viewport. Autofocus only on
 * non-touch (fine pointer, no touch support).
 */
export function shouldAutofocusInput(isCoarsePointer: boolean): boolean {
  return !isCoarsePointer;
}
