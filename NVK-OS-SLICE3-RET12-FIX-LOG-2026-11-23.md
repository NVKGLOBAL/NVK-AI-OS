# NVK-AI-OS — Slice-3 Retest #12 Fix Log

**Date:** 2026-11-23
**Working copy:** `~/workspace/nvk-ai-os-fix/` (HEAD b723bc4; round-3 + slice-3 staged)
**Scope:** build + test only. No deploy, no git push, no spend, no cloud keys.
**Live build under test:** `index-6P4l32iw.js` at https://nvkglobal.github.io/NVK-AI-OS/
**Reference:** slice-3 log `NVK-OS-SLICE3-PANEL-BUS-LOG-2026-11-23.md`; retest #12 items 11 and 13.
**CODEXA / Agent untouched:** nothing in `~/workspace/codexa-build/` or `~/workspace/nvk-agent-build/` was modified.

## 1. Failure 1 — "turn the Flower of Life green/blue/red" does nothing

### Root cause (two compounding breaks, both in the last mile)

The dispatcher, the bus and the chat path were **not** the break. Verified by
probe before changing anything (`tsx` against the working copy, fake bridge):

- `dispatchPanelCommand('turn the Flower of Life green')` → `handled: true,
  ok: true`, confirmation `"The Flower of Life is now green."`, bus
  `panelProperties.FlowerOfLifeEntropyExplorer.hue = 120` (blue → 210,
  red → 0). The exact-name match in `resolvePanelId` resolves "Flower of
  Life" to `FlowerOfLifeEntropyExplorer` (catalog name, `constants.ts:41`).
- `App.tsx` subscribes to the bus (`useOsPanelBus`, line 881), `getPanelContent`
  has `busState` in its deps, and the Flower case passes the bus hue as
  `accentHue` — so the prop **does** reach the panel.

The breaks were downstream of the prop:

1. **The visual never changes in the panel's default mode.** The Flower
   panel's default display mode is `GeoMode.Recursive` (`App.tsx:851-852`).
   Slice 3 wired `accentHue` only into `drawFlowerCircles` and
   `drawMetatronLines`. In Recursive mode the render switch calls only
   `drawRecursivePolygons` (+ `drawBackground` + particles) — neither reads
   `accentHue` (`drawRecursivePolygons` used fixed hues; `drawBackground`
   used mode-derived hues). So the bus hue was set, the prop arrived, and
   the canvas drew the identical picture — the "same dark-green rectangle"
   in all three retest screenshots (Recursive's background is green-hued,
   lightness 3–18%). Mode/Entropy were unchanged, as expected: the command
   changes hue, not mode or entropy.
2. **The confirmation was invisible at the retest's viewport.** Retest #12
   ran at a 750px viewport, and the CommandLayer starts minimized below
   768px (`isMinimized` initial state, `NVKCommandLayer.tsx`). The chat
   history — where the dispatcher's confirmation lands — is hidden while
   minimized, so the observer saw "no log line, no DOM change" for a
   command that had in fact succeeded. (The open command looked alive
   because opening a panel changes the stage + Lattice Manager visibly;
   the color command publishes no event anywhere else.)

### Fix

- `components/panels/FlowerOfLifeEntropyExplorer.tsx` — `accentHue` now
  recolors the panel in **every** mode:
  - `drawBackground` (line 115): `baseHue = resolveHue(accentHue, baseHue)`
    before the gradient is built; deps `[width, height]` → `[width, height,
    accentHue]` (line 122).
  - `drawRecursivePolygons` (line 437): `const hue = resolveHue(accentHue,
    baseHue)` and the stroke uses `hue`; deps `[]` → `[accentHue]` (line
    458). The render effect already depends on both callbacks, so it
    re-runs with the new hue. Particles and secondary hues keep their own
    colors (same scope as slice 3: primary line work + background, which
    together are the whole Recursive-mode picture).
- `lib/stores/osPanelBusStore.ts:315` — new `getFlowerAccentHue(
  panelProperties)`: the single derivation App uses for the `accentHue`
  prop, extracted so the test can assert the exact prop value without
  mounting React. Returns `null` when unset or non-numeric.
- `App.tsx:103,1642` — the Flower case now uses `getFlowerAccentHue(
  busState.panelProperties)` (same value as before, now shared with the test).
- `components/spatial/NVKCommandLayer.tsx:197-204` — auto-expand effect:
  when a new NVK reply lands while the console is minimized, the console
  expands so the answer is visible. Re-minimizing is respected until the
  next reply.

### Verification

- New test `services/os_ret12_fix_test.ts` (33 checks): the exact typed
  commands `"turn the Flower of Life green/blue/red"` through the
  dispatcher-first path assert `handled + ok + confirmation` AND bus hue
  120/210/0 AND `getFlowerAccentHue(...) === 120/210/0` (the exact prop
  the Flower panel receives); null when unset; non-numeric hue never passed
  through. All pass.
- The canvas-level change (background + polygon hues) is verified by build
  + the prop derivation above; the **pixel check is owed to the live
  retest** (see §4).

## 2. Failure 2 — math / search / general Q&A give silence with no model loaded

### Root cause (three distinct breaks, one visibility break)

Probed the runtime in node (`tsx`, no server, no model) before changing
anything:

- `"what is 7+8?"` → runtime `complete`, `"Computed locally: 15"`. The
  math path itself works — the reply existed but sat in the minimized
  chat history (same visibility break as Failure 1). The task still
  requires a deterministic chat-path answer with no model, so math is now
  intercepted before the runtime (below).
- `"search the web for the current price of gold"` → runtime `failed`,
  `"Web search failed: Failed to parse URL from /api/proxy?url=..."`.
  `web.search` depends on `web.fetch` (`services/CapabilityRegistry.ts:326`),
  which calls the same-origin `/api/proxy` endpoint. **There is no server
  on the static GitHub Pages deploy**, so every search fails. The error
  reached the chat as a failure message, not as results and not as a clean
  "I cannot search" statement.
- `"what is the capital of France?"` → runtime `failed`, `"Calculation
  unavailable: no arithmetic expression found in ..."`. `IntentEngine`'s
  calculation rule fired on **any** `"what is ..."` question, routing a
  general question to the calculator. A confusing error, not an answer.
- General Q&A falls through the IntentEngine to `run_task`, and the Planner
  routes everything else to `web.search` by default — so with no model it
  always ends at the dead proxy. There was no honest no-model reply in the
  chat path (the "no model loaded" line existed only as a Logic Core status
  and as the voice path's null-model fallback).

### Fix (new shared module `services/osNoModelAnswers.ts`, dispatcher-style intercept)

- `tryAnswerMath(utterance)` — answers only real arithmetic, as
  `"<expr> = <value>"` (`"what is 7+8?"` → `"7+8 = 15"`). Two gates so a
  date, phone number or bare year never "computes": a math framing
  (what is / calculate / compute / how much is / solve) plus
  number-operator-number, or a bare expression (`"7+8"`, `"2 * 3 + 4"`).
  A failed evaluation returns `null` (fall through), never a fabricated
  number.
- `isSearchQuestion(utterance)` — search/research/find/look-up words,
  current-price/latest/news/weather topics, or intent `web_research`.
- `answerSearchQuestion(query)` — runs the **real** `web.search`
  capability; formats real results (title, source, url, snippet, top 5)
  or an honest unavailable message naming the real failure. Never invents
  a result or a price.
- `needsNoModelReply(intent, isModelLoaded)` + `NO_MODEL_REPLY` — general
  Q&A (`run_task` / `conversation`) with no model loaded gets
  `"No model loaded — hydrate the matrix to begin. I can't answer
  questions or search the web until a model is loaded; ..."` instead of a
  proxy/calculation error. Capability discovery is not gated (works
  without a model); nothing is gated once a model is loaded.
- `src/nvk/intent/IntentEngine.ts` — the `calculation` rule now requires
  real arithmetic (number-operator-number) plus a math framing or a bare
  expression. `"what is the capital of France?"` → `run_task` (honest
  no-model reply); `"call 555-1234"` and `"The meeting is 2026-11-23"`
  are not calculations either. `"what is 7+8?"`, `"5+5"`, `"9 - 59"` still
  classify as calculation.
- `components/spatial/NVKCommandLayer.tsx:368-392` — `handleSendCommand`
  is now dispatcher → search intercept → math intercept → no-model gate →
  runtime. (Search before math: a "search for 5+5" is a search.) Deps
  gained `isModelLoaded` (stale-closure safety for the gate).
- `components/panels/NVKVoiceOrchestratorPanel.tsx:8,206-226` — the same
  math + search intercepts in `processLocalSpeechQuery` (spoken back via
  the existing modulation path). General Q&A there already had the honest
  null-model fallback (`"No local model loaded."`), unchanged.

## 3. Secondary — Logic Core / Advanced Reasoning panel body empty in Deep Focus

- **Cause:** the no-model gate renders at a fixed 850×750 (`App.tsx:1702`)
  inside a `flex flex-col items-center justify-center` box with **no
  overflow**. At a 750px-tall viewport the gate content (icon + title +
  provider toggle + paragraph + 3-card capability list + status + buttons)
  is taller than the box; the list sat below the fold, unreachable, and
  the body showed only logo/title + empty dark space.
- **Fix:** `components/panels/AdvancedReasoningPanel.tsx:89-97` — the gate
  container is now `overflow-y-auto custom-scrollbar`, and the content is
  wrapped in a `m-auto` inner div: centered when it fits, fully scrollable
  (top included) when it overflows. (`justify-center` + overflow would
  clip the top unreachable — the `m-auto` wrapper is the textbook fix.)
- **Self-inflicted bug caught by verification:** the first edit placed the
  explanatory `{/* */}` comment directly inside `return (` (before the
  `<div>`), which is not valid JSX there — fullcheck jumped to 9 errors,
  all in this file. Fixed by moving the comment inside the outer div;
  fullcheck is back to the exact 106-error baseline (see §4).

## 4. Verification

| Check | Result |
|---|---|
| New test `services/os_ret12_fix_test.ts` | **33 PASS, 0 FAIL** (failure-1 exact commands 8, math 8, search detection 5, IntentEngine 4, no-model gate 5, search honesty 3). Search check asserts the contract — real results with real titles/urls, or an honest unavailable message; never silence, never a fabricated price. |
| `npm test` (dev server on localhost:3000, 200) | **Exit 0. 113 PASS, 0 FAIL, all 7 scripts.** Existing 80 + new 33. (The 6 "FAIL" strings in the log are the gate tests' own `ACTION_FAILED` / `TASK_FAILED` fixture events + two PASS lines naming them — no real failures.) |
| `npm run lint` (`tsc --noEmit`, script scope) | **Clean, exit 0.** |
| Fullcheck (`npx tsc -p tsconfig.fullcheck.json --noEmit`) | **106 pre-existing errors, zero new** — per-file counts byte-identical to `/tmp/fullcheck-baseline.txt`. (Mid-work regression to 9 errors in AdvancedReasoningPanel — see §3 — fixed before verification.) |
| `npm run build` (audit + vite + esbuild server) | **Exit 0, 28.25s.** Dependency audit pass. New entry `dist/assets/index-CAEhrCiR.js` (1,088,848 B). New strings confirmed in the bundle: "can't search the web right now", "hydrate the matrix", "real source". |
| Round-3 + slice-3 still present | Not rebuilt; the build above is the slice-3 code + this fix only. |

## 5. Files changed

| File | Change |
|---|---|
| `lib/stores/osPanelBusStore.ts` | New `getFlowerAccentHue()` (:315). |
| `App.tsx` | Import (:103); Flower case uses the shared derivation (:1642). |
| `components/panels/FlowerOfLifeEntropyExplorer.tsx` | `accentHue` into `drawBackground` (:115, deps :122) and `drawRecursivePolygons` (:437, deps :458). |
| `services/osNoModelAnswers.ts` | **New.** `tryAnswerMath`, `isSearchQuestion`, `answerSearchQuestion`, `needsNoModelReply`, `NO_MODEL_REPLY`. |
| `src/nvk/intent/IntentEngine.ts` | `calculation` rule narrowed to real arithmetic. |
| `components/spatial/NVKCommandLayer.tsx` | Imports (:27-28); auto-expand on NVK reply (:197-204); search → math → no-model intercepts (:368-392); `isModelLoaded` in `handleSendCommand` deps. |
| `components/panels/NVKVoiceOrchestratorPanel.tsx` | Import (:8); math + search intercepts in `processLocalSpeechQuery`. |
| `components/panels/AdvancedReasoningPanel.tsx` | Gate container scrollable + `m-auto` wrapper (:89-97). |
| `services/os_ret12_fix_test.ts` | **New.** 33 checks. |
| `package.json` | `test` script appends the new suite. |

## 6. Still owed (not part of this fix)

- **Live retest after deploy (retest #13):** the pixel check that the
  Flower panel visibly changes color in its default Recursive mode
  (green/blue/red), the chat answers at desktop width
  (`"what is 7+8?"` → `15`; search → real results or the honest
  unavailable message; general question → the no-model reply), the
  auto-expand at a 750px viewport, and the Logic Core capability list
  reachable by scrolling at short heights. This fix is build + test only;
  nothing was deployed or pushed.
- **Desktop-width items retest #12 could not test** (its viewport shrank
  to 750px): orb-click, node[0], camera — **not part of this fix, not
  chased here**.
- **Search can only return real results where `/api/proxy` exists** (the
  dev server implements it, `server.ts:378`). On the static Pages deploy
  the honest outcome is the unavailable message, not results — that is by
  design until a proxy exists in front of the live site.
- **Voice STT with a real mic** is still unverified in a browser (the
  voice intercepts are wired through the same dispatcher-first path as
  the chat, test-verified at the helper level only).
- The search intercept bypasses the runtime ledger for search questions
  (same precedent as slice 3's panel-command intercept, which also
  bypasses it). If ledger coverage for searches is wanted, that is a
  separate decision.
