# NVK-AI-OS — Retest #15 / Discriminating-Test Fix Log — 2026-11-23

## The verdict that drove this fix
Retest #15 (2026-11-23 22:16–22:19 PT): Split orb PASSES, Universe sphere
FAILS — the centre is a ~250px solid black disc ringed by green particles.
The discriminating test (22:25–22:28 PT): FLAMECORE shows a bright sphere
immediately, then it VANISHES within 5 seconds; re-selecting OriginState
does not restore it.

## Root cause — FOUND by the second discriminating test (22:37–22:40 PT)
The orb is NOT removed from the scene. The CAMERA flies away.
1. Selecting a Codex Mode opens its preset panels (FLAMECORE opens
   System Health, Entropy Diagnostics, Emerald Tablet Decryption).
2. The auto-focus effect in `components/CodexOrbSystem.tsx` watches
   `openNodeIds` and flies the camera to the last newly opened panel,
   then LOCKS the camera in follow mode (the "Following: System Health"
   pill). The orb goes out of frame — the centre goes black.
3. "Focus NVK" did NOT cancel the follow lock: its onClick tweened the
   camera to (0,0,14) but never cleared `focusedNodeIdRef` /
   `followedNodeId`, so the follow pulled the camera straight back to
   the panel. "Reset Viewport" DOES clear the follow (and immediately
   restored the spheres in the test) — proving the spheres were in the
   scene the whole time.

So the two defects are (a) the auto-focus fires on mode-driven panel
opens, and (b) Focus NVK does not cancel the follow lock.

## The menu bug (separate, same night)
Menu test (22:36–22:39 PT): Codex Modes, Oracle AI and System all PASS
(fully visible). Environment FAILS: the popover opens but its left
~40–45% is hidden behind the Flower of Life floating panel, so the
Master Chaos slider thumb cannot be grabbed. The cover is the floating
panel, not the 3D canvas. Cause: the header was z-50, below the
floating panels (z-1090) and the chat console (z-[1095]).

## The Flower test (same night — NO fix needed)
Flower/entropy test (22:29–22:39 PT): PASS for both.
- "turn the Flower of Life blue" → dark navy-blue canvas, blue outlines.
  "turn the Flower of Life red" → dark reddish-brown/maroon, red outlines.
  The colour command works for real colours (green was the default, so
  the green test proved nothing — blue and red do).
- The Master Chaos slider in the Environment popover is ENABLED and
  changes the Flower entropy live (0.350δ → 0.375δ → 0.490δ as Master
  Chaos went 0.0 → 0.5 → 2.8). NOTE: it was NOT locked in the live
  session even though OriginState carries `lockMasterOverride: true` in
  source — the lock is not wired to the slider's disabled state in the
  live build. No fix needed; the slider is accessible.

## Fixes (this round)
1. `components/CodexOrbSystem.tsx` — mode-driven panel opens no longer
   trigger the camera fly-to. New `prevOrbModeRef` tracks the previous
   `orbMode`; the auto-focus effect now takes `orbMode` as a dependency
   and skips the fly-to when the mode changed since the last sync (the
   newly opened panels are mode presets, not user panel clicks). A direct
   user panel click still flies the camera to it.
2. `components/CodexOrbSystem.tsx` — Focus NVK now clears the follow
   lock (`focusedNodeIdRef.current = null; setFollowedNodeId(null);`)
   before tweening the camera to the orb, matching Reset Viewport. So
   Focus NVK actually returns the camera to the orb.
3. `components/Header.tsx` — the header is now z-[1200] (was z-50),
   above every floating panel (z-1090) and the chat console (z-[1095]),
   so its dropdowns and popovers always render on top. The header sits
   at the top of the screen and never overlaps the chat console.

## Verification
- tsc clean (exit 0).
- npm test with the dev server running: 149 PASS lines; the only
  "FAILED" matches are the tests' own log lines (ACTION_FAILED /
  TASK_FAILED events emitted by the test fixtures), not test failures.
  The evidence test needs the dev server (known quirk).
- Build passes. New bundle `index-ChEvPRJn.js` (verified in dist; the
  header carries z-[1200]).
- House rules re-read (`~/workspace/nvk-ai-os-fix/AGENTS.md`) before
  this work: no Gemini runtime dependency (untouched), no foundation
  rebuild (targeted hardening only), orb reflects real execution.

## What is NOT fixed by this round
- The ~28 'Cannot find name' identifiers in lazily-mounted panels.
- The TEMPORARY diagnostic trap still live in dist/index.html.
- The app does not auto-enter the workspace or auto-load a model.
- The camera orbit is not a crisp 1:1 rotation.
- Phone layout unverified; iPhone crash at 100% load unresolved.
- The Flower panel in Recursive mode shows overlapping squares/diamonds,
  not literal circles (a rendering-mode note, not a defect).

## Next: live retest #16
Switch to FLAMECORE → the spheres must STAY visible (camera stays on
the orb, no "Following:" pill). Switch back to OriginState → the centre
must show the orb, not a black disc. Open the Environment popover →
the Master Chaos slider thumb must be fully visible and grabbable.
Focus NVK after a panel follow → the camera must return to the orb
and the "Following:" pill must clear.
