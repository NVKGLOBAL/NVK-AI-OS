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

## Retest #16 — DONE 2026-11-23 23:11–23:19 PT: 3 of 4 PASS
1. FLAMECORE — PASS. Spheres stay visible after 5s (still visible after
   ~2 minutes), no vanishing, no black centre, no "Following:" pill.
   (Caveat: switching brought the Logic Web panel to the front/centre,
   so the panel layout changed even though the spheres stayed in frame.)
2. OriginState — PASS (qualified). Centre is not a solid black disc;
   Flower of Life panel in the centre, a bright teal wireframe sphere
   peeking at the panel's left edge, background not blacked out. (The
   orb itself is not visible in the exact centre because the Flower
   panel covers it — also true at initial load.)
3. Environment menu — PASS. Popover fully visible on top of the Flower
   panel; Master Chaos slider thumb fully visible and not covered.
   The header z-[1200] fix works.
4. Focus NVK — FAIL (partial). The follow-lock clearing WORKS (the pill
   disappeared immediately and stayed gone). But the camera did NOT
   return to the orb: the Resonance Dashboard panel remained centred and
   filling the centre, the background stayed black, no orb visible in
   the centre (a bright green sphere only at the far right edge).

## Focus NVK follow-up fix (this round, after retest #16)
Root cause: the focused panel is a DOM overlay (PinnedPanel, z-1090)
that covers the centre of the screen. No camera move can reveal the orb
while it is open — the camera tween to (0,0,14) is irrelevant because
the panel is a DOM element on top of the canvas, not a 3D object. The
follow-lock is a one-shot tween (no per-frame follow), so clearing it
was never going to move the panel.
Fix: Focus NVK now also closes the focused panel (via `onClosePanel`,
which is App's `closePanelEverywhere` — it removes the node from
`openNodeIds` and its pinned instances, unmounting the overlay) so the
orb is actually visible. The panel re-opens by clicking its node again.
File: `components/CodexOrbSystem.tsx` (the Focus NVK onClick captures
`focusedNodeIdRef.current` before clearing it, then calls
`onClosePanel(focusedId)`).
Verification: tsc clean; build passes (new bundle `index-sgYcF8O9.js`).
Push + live retest #17 owed.

## Retest #17 — DONE 2026-11-23 23:59 – 2026-11-24 00:02 PT: panel PASS, orb-centring FAIL
1919px, single tab, no scrolling. The panel-close half WORKED: the
centre-covering "NVK System Monitor" panel closed (visually gone) and
no "Following:" pill remained. The camera half FAILED: before the click
the bright green wireframe orb was fully visible at about x=1310, y=440;
after the Focus NVK camera tween it ended at about x=1745, y=415 — far
right edge, right half clipped off-screen, ~785px right of viewport
centre (960, 499). Focus NVK moved the orb FARTHER from centre, not
toward it. The smaller teal sphere inside the particle ring ended at
about x=1205, y=425; the diffuse green particle ring itself was roughly
centred (about 960, 530).

## Retest #17 root cause — FOUND + FIXED locally 2026-11-24 (NO push, NO deploy)
The tween DESTINATION was never wrong: the orb really is at the origin
(`core_orb`, IcosahedronGeometry(5) in `defaultOrbObjectsRef`, plus the
radius-1.5 core in `modeObjectsRef`, both at (0,0,0)), and Focus NVK
tweens to (0,0,14) looking at (0,0,0). The camera was HIJACKED after
Focus NVK's tween by a second, longer tween. Two compounding defects,
both in `components/CodexOrbSystem.tsx`:
1. The window-level tap handlers fired on HUD-button clicks.
   `handlePointerDown` / `handlePointerUp` (and the touch equivalents)
   are window listeners. React's `stopPropagation` on the button's
   `click` does not stop the native pointerup, and pointerup fires
   BEFORE click. So clicking Focus NVK first ran `handleTapOrClick`
   at the button's screen position (bottom-right corner), whose raycast
   hit a panel node (nodes carry 4x2 label sprites — big targets) and
   started `focusOnPanelNode`'s 1.2s camera tween. The button's onClick
   then started Focus NVK's 1.0s tween to the origin WITHOUT killing
   the tap's tween.
2. GSAP's default `overwrite:false` lets two tweens on the same
   `camera.position` / `controls.target` both write every tick, and the
   LONGER one wins the final value once the shorter ends. Focus NVK's
   tween won ticks 0–1.0s; the tap's tween then ran unopposed 1.0–1.2s
   and dragged the camera back to the panel node — a node left of the
   origin, so the orb projected far right of centre (a node at
   x≈-8..-12 puts the origin at screen x≈1745, matching the retest).
   The "Following:" pill still ended cleared, because Focus NVK's
   `setFollowedNodeId(null)` ran AFTER the tap's `setFollowedNodeId` —
   which is why the retest saw no pill despite the camera ending on a
   node. The follow-lock clearing, the panel close, and the tween
   destination were all correct; only the competing tween was wrong.
Mechanism PROVEN with the repo's own gsap + three (repro script, since
removed): tap tween 1.2s to a node at (-12,2,0), then Focus tween 1.0s
to the origin, no kill → camera ends at (-12, 2, 6.5) looking at the
node; with `killTweensOf` first → camera ends at (0,0,14) looking at
(0,0,0).

## Fix (this round, local only — NOT pushed, NOT deployed)
1. `components/CodexOrbSystem.tsx` — the tap path is canvas-only:
   `handlePointerDown`, `handlePointerUp`, `handleTouchStart`,
   `handleTouchEnd` return early unless `event.target ===
   renderer.domElement`. A press that starts on a DOM control is a UI
   press, not a 3D tap — HUD-button clicks can no longer raycast a
   panel node and start a camera tween. (`handleTouchEnd` still clears
   `mouseActive` before the gate; hover-only `handleTouchMove` /
   `handleMouseMove` are untouched — cosmetic, out of scope.)
2. `components/CodexOrbSystem.tsx` — every camera-tweening action
   kills in-flight camera tweens first (`gsap.killTweensOf` on
   `camera.position` + `controls.target`) and owns the transition
   (`isTransitioningRef`, cleared onComplete, so a user drag still
   takes over mid-tween — same discipline `focusOnPanelNode` already
   had): `focusOnPanelNode`, Focus NVK, Reset Viewport, the
   `recenterTrigger` effect. Focus NVK's panel-close + follow-clear
   behaviour is unchanged, and its destination is still (0,0,14) /
   (0,0,0).
3. New regression test `services/os_ret17_focus_test.ts` (wired into
   `npm test`): source-pins for both halves (canvas gate in all four
   handlers, kill-before-tween at all four tween sites, Focus NVK
   still closes the panel / clears follow / tweens to the origin)
   plus a live gsap+three mechanism check (no-kill → ends on the
   node; kill-first → ends at the origin). 14 checks, all PASS.

## Verification (this round)
- New test alone: 14/14 PASS.
- `npm run lint` (tsc --noEmit): clean, exit 0.
- `npm test` (with the dev server running for the evidence test, per
  the known quirk): ALL suites pass, exit 0 — axiom mapping, evidence
  (real execution/ledger), gate, panel bus, orb state, search+math,
  ret12, slice-7 planner, slice-11 vault, slice-6 hierarchy, ret14,
  ret17.
- `npm run build`: passes (1m 36s). New bundle `index-BrDA2TZm.js`
  (replaces `index-sgYcF8O9.js`). All four canvas gates confirmed
  present in the minified `CodexOrbSystem-biUbOah5.js` chunk, and
  `killTweensOf` present at every tween site.
- Dev server stopped after the test run. NOTHING pushed to GitHub,
  NOTHING deployed — deploy is the main agent's call after review.

## Next: live retest #18 (after deploy)
Click Focus NVK after a panel follow → the bright orb must end centred
in the viewport (not far right), the focused panel stays closed, no
"Following:" pill. Also spot-check Reset Viewport after a panel follow,
and confirm a plain canvas tap still focuses a panel node (the gate
must not have broken 3D tapping) and an orb tap still toggles voice.
