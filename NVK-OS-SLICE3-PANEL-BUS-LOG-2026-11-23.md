# NVK-AI-OS — MCNA Slice 3: Panel Bus + Orb Real-State Wiring + Honest Search/Math

**Date:** 2026-11-23 (completed ~00:30 PT, Nov 24)
**Working copy:** `~/workspace/nvk-ai-os-fix/` (HEAD b723bc4; round-3 fixes already staged, verified still present — see §6)
**Scope:** build + test only. No deploy, no git push, no spend, no cloud keys.
**Reference:** MCNA architecture `~/workspace/nvk-unified/mcna-super-agent-architecture-2026-11-23.md` §14;
OS audit `~/workspace/nvk-unified/mcna-audit-os-2026-11-23.md`;
CODEXA slice-2 reference (`~/workspace/codexa-build/lib/stores/panelBusStore.ts`,
`services/PanelBusService.ts`, `services/PanelCommandDispatcher.ts`).
House rules: `AGENTS.md` in this working copy — §1 NO GEMINI RUNTIME DEPENDENCY (nothing added),
§6 orb must reflect real execution via the event bus (no fake animation loops).

## 1. What changed

### New files (10)

| File | What it is |
|---|---|
| `lib/osPanelColors.ts` | Pure color/mood helpers mirroring CODEXA slice 2 (normalizeHue, resolveHue, NAMED_COLORS, hueFromHex, resolveColorName, inferMood with a feeling-verb requirement). |
| `lib/mathEvaluator.ts` | Pure arithmetic evaluator. Extracts a math expression from a query, evaluates it, returns `{ok:true, value, expression}` or `{ok:false, reason}`. Never invents a value. |
| `lib/duckDuckGoParser.ts` | Pure DuckDuckGo HTML parser: pairs `result__a` links with `result__snippet` text in order, strips tags, decodes entities, derives the source hostname. Returns `[]` when nothing is parseable. |
| `lib/orbStateMapping.ts` | The orb-state mapping, extracted from App.tsx so it is unit-testable: `mapRuntimeStateToOrbState`, `mapServicesEventToOrbState`, `resolveTerminalOrbState`. **CALM is never produced by any mapping.** |
| `lib/stores/osPanelBusStore.ts` | The panel state bus. Plain module + listener set (`useSyncExternalStore` hook `useOsPanelBus()`); **no zustand** (not a direct dependency). State: activePanelId, openPanelIds, panelProperties, aura, lastError. App registers a bridge (`registerOsPanelBridge`); the bus validates (dead/unknown/blocked) and delegates real windowing to App's handlers. Open/close/focus return `false` + a reason in `lastError` honestly when there is no bridge. `DEAD_PANEL_IDS` (7) + `DEAD_PANEL_REASONS`. |
| `services/OsPanelBusService.ts` | PanelBus port (`osPanelBus`) + `executePanelControl` (same action set + result shape as the Agent's `panel_control` and CODEXA's slice-2 equivalent) + `setPanelColor` + `setSeekerAura` + `panelDisplayName` + `panelExists`. |
| `services/OsPanelCommandDispatcher.ts` | Deterministic dispatcher mirroring CODEXA's: open/show, close/hide, focus, turn/set/change/make `<panel> <color>`, mood → aura; "it/this/that" = focused panel; unknown panel/color refused honestly; Buga → "There is no Buga panel in the OS — Buga glyphs live in the Glyph Composer." |
| `services/os_panel_bus_test.ts` | 24 checks: bus open/close/focus/set/aura with a fake bridge, dead/unknown refused, listPanels covers 80, dispatcher end-to-end (open Flower, turn green, mood → aura, unknown panel/color refused, Buga refused, ordinary question falls through). |
| `services/os_orb_state_test.ts` | 21 checks: all 12 real runtime states + all 11 real `NVKEvent` types map to real orb states, never CALM, never null; terminal `'complete'` → COMPLETE, `'failed'` → ERROR. |
| `services/os_search_math_test.ts` | 15 checks: DDG parser on a fixture (2 results + 1 malformed link skipped, entities decoded) and a block-page fixture → `[]`; math evaluator (`5+5` → 10, `7+8` → 15, non-math / `10/0` / empty fail honestly). |

### Edited files (11, slice-3 changes only)

- `src/nvk/capabilities/CapabilityRegistry.ts` — **web.search** now parses the real DuckDuckGo HTML body from `web.fetch` via `parseDuckDuckGoHtml`; real results with `verified: true`, or an honest empty list with `verified: false` + a message saying no results are shown rather than invented ones. **calculation.math** uses `evaluateMathExpression` and throws the honest reason on failure — the hardcoded `'10'` fallback is gone. The old "CONNECTED TOOLS" hardcoded block was removed (nothing in the tree depended on that text). `verify` checks the `Result: ` shape / `Array.isArray(result.results)`.
- `types.ts` — `NVKOrbState` gained `'WAITING' | 'COMPLETE'` (WAITING = blocked on the user, confirmation pending; COMPLETE = run finished successfully, transient). CALM remains a valid value but no pipeline event or command-path transition sets it anymore.
- `components/spatial/NVKCommandLayer.tsx` — `executeAndRender` success sets `resolveTerminalOrbState` (COMPLETE or ERROR from the runtime status), catch sets ERROR (old unconditional CALM removed in both); `handleSendCommand` is dispatcher-first (after adding the user message + clearing the input, so panel commands appear in chat); a handled command's confirmation is the reply with orb COMPLETE (ok) or ERROR (refused); preview-needsInput sets IDLE (was CALM); confirmation-pending sets WAITING; catch sets ERROR; `handleCancelAction` sets IDLE (was CALM); orb badge gained WAITING ("Waiting for you…", amber, ping) and COMPLETE ("Done", emerald).
- `components/panels/NVKVoiceOrchestratorPanel.tsx` — `processLocalSpeechQuery` runs the dispatcher first (after the transcript/echo lines, before "Thinking on WebGPU hardware..."): a handled command's confirmation is spoken back via `speakLocalWithModulation` and the function returns without a model call. (The CommandLayer mic writes its transcript into the input, which goes through `handleSendCommand` — so dispatcher-first there covers voice AND text; the Voice Orchestrator panel is the second voice path.)
- `App.tsx` — imports the bus + mappings; the inline `mapServicesEvent`/`mapRuntimeState` bodies replaced with calls to the shared functions; **COMPLETE → IDLE settle effect** (~2s timer; ERROR never settles on its own); **bridge registration effect** (ref-stable handlers; open calls `handleAppClick`, close closes pinned instances then the open node via `closePanelEverywhere`, focus focuses the pinned instance or opens via `handleAppClick`); **open-panel sync effect** (pinned instance panel ids + open node panel ids → `setOsOpenPanelIds`, deps `[activeCluster]`); `const busState = useOsPanelBus()` + `accentHue` (FlowerOfLifeEntropyExplorer) and `auraHueOverride` (SeekerAuraDisplay) passed in `getPanelContent` + `busState` in its deps; **dead-panel guards** at the top of `handleAppClick` and in `handlePanelNodeClick` (echo an honest message + return — node-clicks used to bypass the availability guard entirely).
- `components/CodexOrbSystem.tsx` — WAITING (amber/gold Vector3) + COMPLETE (green) added to the orb color chain.
- `components/panels/FlowerOfLifeEntropyExplorer.tsx` — optional `accentHue?: number | null` prop; `resolveHue(accentHue, fallback)` in `drawFlowerCircles` + `drawMetatronLines` (primary line work only; particles/mode secondaries keep their own hues — same scope as CODEXA slice 2).
- `components/visuals/SeekerAuraDisplay.tsx` — optional `auraHueOverride?: number | null` prop; overrides the orb + glow gradient hue when set (flares/particles keep agent-style colors).
- `components/ui/OmniSearchModal.tsx` — DEAD badge (red) + click/keyboard-Enter block for dead panels, extending the existing BLOCKED logic; the reason is the title + description line.
- `components/panels/PanelLauncher.tsx` — DEAD badge + click block for dead panels (clicking one used to mount it and throw).
- `package.json` — `test` script appends the three new tsx scripts after the existing three (order preserved).

## 2. Verification

| Check | Result |
|---|---|
| `npm run lint` (`tsc --noEmit`, script scope) | **Clean, exit 0.** |
| Fullcheck (`npx tsc -p tsconfig.fullcheck.json --noEmit`) | **106 pre-existing errors, zero new** — per-file counts byte-identical to `/tmp/fullcheck-baseline.txt` (App.tsx 35, DriftArchivePanel 11, lib/autoEcho 9, …, NVKVoiceOrchestratorPanel 4, SeekerAuraDisplay 1, CodexOrbSystem 5). No new files in the error list. |
| `npm test` (dev server on localhost:3000, 200) | **Exit 0. 80 PASS, 0 FAIL, all 6 scripts.** Existing 3/3 (axiom mapping, capability evidence, capability gate) + 3 new: bus 24 checks, orb 21 checks, search/math 15 checks. |
| `npm run build` (audit + vite + esbuild server) | **Exit 0, 27.23s.** Dependency audit: `[NVK AUDIT PASS] No prohibited AI provider dependencies found.` New entry `dist/assets/index-6P4l32iw.js` (1,086,310 B); vendor-three unchanged. Slice-3 code confirmed in the bundle ("no Buga panel in the OS", DEAD badge). |
| Round-3 fixes still present | placeGlyph 3 matches, panelsReady 2 matches, Header R11-1 comment, R11-b capability cards ("The capability list below is real: Tree-of-Thought, …"). Not rebuilt. |

## 3. Acceptance verification

- **Panels controllable by voice OR text through the bus** — verified by test, end to end through dispatcher + bus with a fake bridge: "open the Flower of Life panel" → opens; "turn it green" → `{color green, hue 120}` on the focused panel; "I'm feeling blue today" → aura `{mood blue, hue 210}`; close works through the dispatcher. The Flower and Seeker Aura visualizers read the bus hue in App's `getPanelContent`. Live-mic STT is NOT verified in node — needs a browser retest (mic → transcript → dispatcher → bus → panel → spoken confirmation).
- **Orb shows real states including on failure** — verified by test over the full runtime state union (12 states) and the full `NVKEvent` union (11 events): COMPLETED → COMPLETE, FAILED → ERROR, WAITING → WAITING, never CALM from any state/event, terminal `'failed'` → ERROR. The CommandLayer's two CALM overwrites are removed; App's two CALM mappings are replaced by the shared functions.
- **web.search + calculation.math honest** — verified by test (parser fixture + block page → `[]`; `7+8` → 15, never the old hardcoded `'10'`; non-math / `10/0` / empty fail honestly). Live DDG fetch is NOT verified in node — needs a browser retest (real search through the capability path).
- **Existing tests pass + lint/build pass** — see §2.

## 4. Bugs the tests caught (fixed during this slice)

1. **Runtime WAITING was mapped to IDLE** in `lib/orbStateMapping.ts` (my own earlier draft). WAITING is a real runtime state (`NVKEventTypes` `ui.state_changed`) meaning blocked on the user; collapsing it to IDLE hid the "waiting for you" signal. Fixed: WAITING → WAITING (amber orb state). The test caught it.
2. **`closeOsPanel` validated nothing** — it would report success closing a dead or nonexistent panel. Fixed: same dead/unknown validation as open/focus/set.
3. **`getOsPanel().open` did not reflect bus-driven opens** — `openPanelIds` was only App-pushed, so the bus read stale until App's render cycle. Fixed: `openOsPanel`/`closeOsPanel` maintain `openPanelIds` optimistically; App's sync effect reconciles the same set (dedupes, no-ops when unchanged).
4. **Lint TS2339 in `CapabilityRegistry.ts`** — `!evaluated.ok` does not narrow the `MathEvaluation` discriminated union under this project's non-strict tsc (no `strictNullChecks`); `evaluated.ok === false` does (verified with a minimal repro). One-word fix + a comment recording why.
5. **Voice panel `as const`** — my added `setTranscript` call widened `sender` to `string` (a third TS2345, same shape as the two pre-existing ones in that function). Fixed with `as const`; the two pre-existing errors are untouched (fullcheck still 106).

## 5. Honest flags / residuals (not fixed in slice 3)

- **Live verification still owed:** voice-panel loop with a real mic, and a real web.search through the capability path — both need a browser retest, not a node test. The bus/dispatcher/mapping logic is test-verified; the browser paths are wired (CommandLayer mic → input → dispatcher; Voice Orchestrator → dispatcher) but not live-observed.
- **Dead panels are labelled, not fixed:** the 7 dead panels (4 throw on render — CodexAvatarGeneratorPanel, DreambloomGenesisPanel, DriftArchivePanel, DriftDifferentialOverlay; 3 availability-blocked — Calendar, Email, Messaging) now refuse honestly everywhere (bus, dispatcher, both navigators, both open paths) but still do not work. The ~28 lazy-panel 'Cannot find name' errors remain in the fullcheck baseline.
- **Out of scope, unchanged:** Planner default (greetings/unknown → web.search — now honest since web.search is honest, but the routing is odd); software.generate / documents.create / filesystem.write (runtime) canned outputs; the diagnostic trap in `dist/index.html`; the lint gap (tsconfig `include` excludes App.tsx etc. — use `tsconfig.fullcheck.json` for verification).
- **No deploy/push:** the new build (`index-6P4l32iw.js`) is in the working copy only. The OS live push still waits for NvK's decision after the architecture lands + a live retest (round-3 deploy is HELD by his 2026-11-23 voice decision).
- **CODEXA / Agent untouched:** nothing in `~/workspace/codexa-build/` or `~/workspace/nvk-agent-build/` was modified.
