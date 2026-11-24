# NVK-AI-OS — Retest #18 Orb-Tap Voice Fix Log — 2026-11-24

## The verdict that drove this fix
Retest #18 (2026-11-24 00:28–00:35 PT, bundle `index-BrDA2TZm.js`):
orb-centring PASS, panel PASS, pill PASS, Reset Viewport PASS, node-tap
PASS — **orb tap does NOT toggle voice (FAIL)**. Taps on the centred
orb's centre (×2), on the wireframe ellipsoid orb (×2) and on a solid
orb changed nothing. The Voice Command button works (click changed it
to "Listening (Click to stop)", click again stopped it). Previously
(~Nov 23) clicking the centre toggled voice — a regression.

## Root cause — TWO defects, both in `components/CodexOrbSystem.tsx`
The voice toggle itself was never broken. App's `handleCoreOrbClick`
toggles the same `isVoiceActive` state the Voice button uses
(`App.tsx:1410`, `setIsVoiceActive(prev => !prev)`), and the orb tap
calls it (`onCoreOrbClickRef.current()`, `CodexOrbSystem.tsx:1308`).
The tap never reached the toggle:

1. **The ret17 canvas-only gate dropped orb taps.** Retest #17's fix
   made the tap path canvas-only (`event.target ===
   renderer.domElement`). The orb sits at the centre of the viewport —
   exactly where DOM overlays live. An open 3D panel is an 850x750px
   `pointerEvents: auto` div (`panelElement`, line 2605) attached as a
   CSS3DObject; CSS3D has no depth occlusion against the WebGL canvas,
   so a panel behind the orb still covers it on screen. A tap on the
   orb whose topmost element was that div was silently dropped, so orb
   taps stopped toggling voice while node taps (away from the overlays)
   kept working. The pre-ret17 behaviour raycast every window
   pointerup and never had this failure.
2. **A closed panel's div stayed in the overlay, swallowing taps.**
   three's CSS3DRenderer never removes the DOM element of an object
   that leaves the scene — `renderObject` only ever appends elements,
   and display is set to `'none'` only when `object.visible === false`,
   never on scene-removal. The close path removed the CSS3DObject from
   its parent (`cssObject.parent.remove(cssObject)`) but the 850x750
   `pointerEvents: auto` div stayed in the CSS3D overlay at its last
   transform — for a focused panel, frozen over the centre of the
   screen. Invisible content, still hit-testable. This is exactly the
   retest #18 geometry: Focus NVK had just closed the System Monitor
   panel, whose elements the retest noted "remain in the DOM, not
   visible" — and every orb tap after that landed on the orphaned div.

## Fixes (this round, local only — NOT pushed, NOT deployed)
1. `components/CodexOrbSystem.tsx` — a stage tap is decided by target
   SEMANTICS, not target identity. New `isStageTap` predicate: a press
   is a UI press when it lands on (or inside) an interactive control
   (`button, input, textarea, select, a[href], [role="button"],
   [contenteditable="true"]`), or outside the stage container (the HUD
   column, Following pill, chat console, PinnedPanels, header and dock
   are all siblings of the mount, not children). Anything else inside
   the stage container — the canvas itself, the CSS3D overlay, a panel
   div's non-interactive area, a stale overlay element — is a 3D tap,
   and the raycast decides orb vs node vs nothing. All four handlers
   (`handlePointerDown`, `handlePointerUp`, `handleTouchStart`,
   `handleTouchEnd`) gate on it. HUD-button clicks (the ret17 bug) are
   still excluded: buttons are controls. The ret17 requirement is
   unchanged, only the mechanism widened.
2. `components/CodexOrbSystem.tsx` — the panel-sync cleanup now
   removes the DOM element outright on close
   (`panelObj.domElement.remove()`, in the `!openNodeIds.includes
   (nodeId)` branch of the `currentPanelObjects` cleanup loop). Only
   panels that are no longer open are touched. Panel divs keep
   `pointerEvents: auto` while open, so panels stay interactive; the
   fix removes the element, it does not disable events.
3. Behaviour decision (stated, per the brief): orb tap vs node tap
   precedence is unchanged from the pre-regression behaviour — the
   raycast decides. A tap that hits the core orb (direct hit, or the
   6.5-unit proximity fallback) toggles voice ONLY and does not move
   the camera (R10-1); a tap on a panel node focuses it; a tap on an
   axiom node opens its panel. A tap on an App-level PinnedPanel
   (a sibling of the mount, not a child) is a UI press, not a 3D tap —
   the panel in front wins, which is the sane reading; the orb behind
   an open panel is reached by closing the panel or Focus NVK.
4. `services/os_ret17_focus_test.ts` — extended with ret18
   orb-tap-voice cases (9 new checks): the core-orb branch calls
   `onCoreOrbClick`; closing a panel removes its CSS3D DOM element;
   the cleanup only touches panels no longer open; panel divs keep
   `pointerEvents: auto`; App wires the orb tap to the same voice
   state the button uses; plus a live three.js geometry check that the
   classifier sees the orb — a centre tap passes through the origin, a
   tap on the orb rim passes at tangent distance 5 (< the 6.5 fallback
   threshold; the core orb is a radius-5 sphere at the origin), and a
   tap aimed well outside the orb does not fall back to the core.
5. One stale comment corrected in `handlePointerDown` ("only the WebGL
   canvas itself may start a tap") to match the new predicate.

## What the previous attempt left, and what this round did
A first attempt at this fix (2026-11-24 ~00:47 PT) edited
`CodexOrbSystem.tsx` (the `isStageTap` predicate + the
`domElement.remove()` cleanup) and `os_ret17_focus_test.ts` (ret18-aware
ret17 checks), then errored out on a truncated model output before
verifying or logging. This round assessed that state first: both fixes
were present and correct in the files, and the ret17 test passed. The
work this round was the missing remainder — the stale comment, the
orb-tap-voice test cases, lint + full suite + build verification, and
this log. No re-diagnosis was needed; the first attempt's diagnosis
(the gate + the orphaned div) held up against the code and the retest
geometry. No relay wiring or other feature was touched.

## Verification
- Extended test alone (`npx tsx services/os_ret17_focus_test.ts`):
  **26/26 PASS** — 17 ret17 checks + 9 new ret18 checks. (One check
  failed on the first run: my regex window for the `domElement.remove`
  pin was 400 chars and the explanatory comment in the code is ~650;
  widened the window to 1200 — the code was right, the test was
  too tight.)
- `npm run lint` (tsc --noEmit): clean, exit 0.
- `npm test` (full suite, dev server running for the evidence test):
  **all 12 suites pass, exit 0** — axiom mapping, evidence (real
  execution/ledger), gate, panel bus, orb state, search+math, ret12,
  slice-7 planner, slice-11 vault, slice-6 hierarchy, ret14, ret17+ret18.
- `npm run build`: passes (25.18s). New bundle
  `index-DAKhqzHa.js` (replaces `index-BrDA2TZm.js`); `dist/index.html`
  references it. Bundle check: all 11 `killTweensOf` calls and the
  `domElement.remove()` fix are present in the built
  `CodexOrbSystem-BSsArICr.js` chunk.
- Dev server stopped after the test run. NOTHING pushed to GitHub,
  NOTHING deployed — deploy is the main agent's call after review.

## What is NOT fixed by this round
- The ~28 'Cannot find name' identifiers in lazily-mounted panels.
- The TEMPORARY diagnostic trap still live in dist/index.html.
- The app does not auto-enter the workspace or auto-load a model.
- Phone layout unverified; iPhone crash at 100% load unresolved.
- The Flower panel in Recursive mode shows overlapping squares/diamonds,
  not literal circles (a rendering-mode note, not a defect).

## Next: live retest #19 (after deploy)
- Orb tap toggles voice: tap the centred orb → Voice button flips to
  "Listening (Click to stop)" (or "Voice: On"); tap again → stops.
  Also tap while a panel is open over the orb's edge and after Focus
  NVK closes a panel — the orphaned-div case must not recur.
- Node taps still focus: tap a labelled node (e.g. Trait Gates) →
  its panel opens + "Following:" pill appears.
- Focus NVK still centres: after a panel follow, Focus NVK → the
  bright orb ends centred, the focused panel stays closed, no pill.
- Reset Viewport still works after a panel follow.
