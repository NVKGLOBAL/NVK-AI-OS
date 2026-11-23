# NVK OS — Test Report

Rewritten 2026-11-22 after the defect 1–9 fix round. The previous version of
this file claimed things that were not true; those claims are struck below and
replaced with what was actually measured. Nothing in this report is asserted
without a command that produced it.

## What ran (2026-11-22, working copy `~/workspace/nvk-ai-os-fix/`)

| Check | Command | Result |
|---|---|---|
| Lint | `npm run lint` (`tsc --noEmit`) | **PASS, exit 0** |
| Evidence test (server up) | `npm test` (server on 127.0.0.1:3000) | **PASS, exit 0** — real write, real events, real ledger entry |
| Evidence test (server down) | `NVK_TEST_API_BASE=http://127.0.0.1:3999 npm test` | **FAILS as designed, exit 1** — "server not running — start it with `npm run dev` before `npm test`" |
| Build | `npm run build` | **PASS, exit 0** — dependency audit PASS, vite build 26.52s, server bundle 25.3kb |
| Shard engine unit check | `npx tsx` stubbed `generateText` (6 cases) | **PASS 6/6** — valid spec accepted; extra key / non-JSON / null / wrong variant all return null |
| Server smoke test | curl against localhost-only server | **PASS 15/15** (see below) |

## Lint coverage — read this before trusting the PASS

`npm run lint` is `tsc --noEmit` with `tsconfig.json` include
`["src", "vite-env.d.ts", "server.ts"]`. **It does not check App.tsx,
components/, context/, or services/.** The old report's "tsc PASS (0 errors)"
was vacuous for the client tree.

A one-off full-tree check (same flags, client entry points included) found
**110 pre-existing type errors before the fix round and 100 after** — the 10
removed are exactly the errors on lines this round touched (the 2 four-arg
`generateText` calls in App.tsx, the function-as-system-prompt call in
NVKVoiceOrchestratorPanel, the 2 evidence-shape errors in NVKCommandLayer,
and the 5 errors in the deleted `services/nvkActionEngine.ts`). The remaining
100 are pre-existing errors in code this round did not touch (e.g. App.tsx
types used without imports, DriftArchivePanel, constants record gaps). They
are out of scope for this round and are NOT fixed by this report's PASS.

## Evidence test — what it actually proves now

`services/capability_evidence_test.ts` executes a real `filesystem.write`
through the TaskEngine against the running server and asserts:

- Task created QUEUED; `TASK_STARTED -> TASK_COMPLETED` published in order.
- The file was really written: downloaded back via `/api/fs/download/` and
  byte-compared with what was written.
- Exactly one new SovereignLedger entry, capability `filesystem.write`,
  with a valid 64-hex SHA-256 hash and a valid previous hash.
- Temp file deleted afterwards.

Observed run: `Event order OK: TASK_STARTED -> TASK_COMPLETED`, ledger entry
hash `5df33d52b3a0388c…`, "All evidence tests passed (real execution, real
events, real ledger)."

## Server smoke test — localhost only, 2026-11-22

Server started as `NODE_ENV=production node dist/server.cjs`, bound to
127.0.0.1:3000 (default; `NVK_HOST` opts in to another interface).

| # | Check | Result |
|---|---|---|
| 1 | POST /api/agent/dispatch, no token | **401** "Dispatch token required…" |
| 2 | Dispatch + token + `rm -rf /` | **Shield rejection, no execution**; audit line `allowed:false, reason:destructive-pattern` |
| 3 | Dispatch + token + `echo smoke-test-ok` | **Real output** `smoke-test-ok`; audit line `allowed:true` |
| 4 | POST /api/export/brief, no content | **400** "Export requires 'content'" |
| 5 | Export with content | **Real file** `brief-<id>.md` in uploads/, downloadable via returned `/api/fs/download/…`, content matches |
| 6 | POST /api/share/shard, then GET | **Real stored shard** returned; GET unknown token → **404** "Shard not found" |
| 7 | GET /api/fs/download/../../package.json | **400** "Access Denied: path escapes the uploads workspace" |
| 8 | GET /api/proxy?url=http://169.254.169.254/ | **400** "Nexus Proxy blocked: Private or loopback targets are not allowed" |
| 9 | POST /api/ai/chat, no key | **400** "No provider key provided…" |
| 10 | POST /api/ai/chat, provider `cloud_ai` | **400** "Unsupported provider… Supported: openai, anthropic" |
| 11 | POST /api/kernel/extrude | **200**, `commands: []`, honest "no extrusion engine" content |
| 12 | GET /api/voice/status | **200**, `liveVoice: false, localAvailable: true` |
| 13 | POST /api/terminal, no token | **401** |
| 14 | POST /api/terminal + token + `echo terminal-ok` | **Real output** `terminal-ok` |
| 15 | Rate limiter (export, 10/min) | **8× 200 then 429** on the 11th request in the window — limiters are live |
| — | GET /api/fs/list?path=../../ | **400** traversal denied |
| — | POST /api/browse to http://127.0.0.1:3000/api/health | **Blocked** (SSRF guard) |
| — | GET / (production static) | **200** |

## Corrections to the previous report's claims

1. **Local Image Generation (`image.generation`): NOT AVAILABLE.** The old
   report said ACTIVE & VERIFIED. The runtime registry generated a canned SVG
   with a fake model name and a "VERIFIED" label. No image model is connected.
   The registry now sets `available: false` and `execute` throws
   `IMAGE_ENGINE_NOT_CONNECTED` — matching `NVK_CAPABILITY_MATRIX.json`
   ("Not connected").
2. **Application Launch (`application.launch`): NOT AVAILABLE.** The old
   report said ACTIVE & VERIFIED. The runtime registry fabricated a random
   PID and a "successfully launched and verified" message. The browser
   sandbox cannot launch native apps. The registry now sets `available:
   false` and `execute` throws — matching the matrix ("Browser sandbox
   restriction").
3. **Typecheck "PASS (0 errors)":** only true for the files `npm run lint`
   covers (see coverage note above). The client tree has 100 pre-existing
   type errors in a one-off full-tree check.
4. **"Production Build PASS (Zero bundle warnings)":** the build passes, but
   vite reports the pre-existing chunk-size warning (several chunks > 500 kB
   after minification, e.g. `vendor-webllm` 6,002 kB). Not a failure; not zero
   warnings.

## Still true, re-verified this round

- The deterministic arithmetic routing and intent engine were not re-tested
  in this round; the old claims (3–7 above) are carried as unverified, not
  re-asserted. `web.search` still returns canned "verified" results
  regardless of what it fetches, and `calculation.math` still falls back to
  a hardcoded `'10'` on eval failure — flagged, out of scope, not fixed.
- `TaskEngine.createTask` still publishes `TASK_STARTED` while the task
  status is `QUEUED` (cosmetic, noted as A5, not blocking).

## NOT verified in this round (needs a real browser)

- No model has been loaded in a browser; local inference, the orb following
  real events, chat answers, shard synthesis end-to-end, and the Terminal
  unlock prompt UI have not been exercised in a live browser. The server
  smoke test above covers the server only. Do not claim the app works
  end-to-end until a browser pass runs.
