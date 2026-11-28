/**
 * Key-handling tests (matrix program, 2026-11-27 — item 7; design §1a
 * row 8, spec D9).
 *
 * Rule: provider keys ride the REQUEST BODY ONLY, are sent only as the
 * upstream Authorization header, and are NEVER stored — not localStorage,
 * not sessionStorage — held in memory only for the session.
 *
 * 1. Static pins: LocalLLMContext + AuthGateway contain no read/write of
 *    key material (nvk_api_keys / nvk_hf_token) in any storage, and
 *    LocalLLMContext purges legacy stored keys on mount instead of
 *    migrating them into the session.
 * 2. Server proxy pin: server.ts takes the key from the request body,
 *    sends it only as the upstream Authorization header, and never logs
 *    or stores it.
 * 3. Non-key storage is untouched: model/provider/cloud-mode preferences
 *    (not key material) may still persist.
 *
 * Run: npx tsx services/os_key_handling_test.ts
 * (NOT yet wired into `npm test` — the coordinator wires it at integration.)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

function main() {
  console.log('Key-handling tests (item 7):');
  const ctx = read('context/LocalLLMContext.tsx');
  const gateway = read('components/ui/AuthGateway.tsx');
  const server = read('server.ts');
  const panel = read('components/panels/ModelOrchestratorPanel.tsx');

  // --- 1a. No key material read INTO state: LocalLLMContext. ---
  // The ONLY key reads allowed are inside the D9 purge effect, which
  // reads solely to detect-then-DELETE legacy keys (never to load them
  // into memory). Any read outside that block is a regression.
  const purgeStart = ctx.indexOf('// D9 purge');
  const purgeEnd = ctx.indexOf('}, []);', purgeStart);
  const keyReadRe = /(localStorage|sessionStorage)\.getItem\(['"]nvk_(api_keys|hf_token)['"]\)/g;
  let m: RegExpExecArray | null;
  let readsOutsidePurge = 0;
  while ((m = keyReadRe.exec(ctx)) !== null) {
    if (m.index < purgeStart || m.index > purgeEnd) readsOutsidePurge++;
  }
  check('LocalLLMContext reads stored keys only inside the D9 purge block', readsOutsidePurge === 0, `${readsOutsidePurge} read(s) outside the purge`);
  for (const key of ['nvk_api_keys', 'nvk_hf_token']) {
    check(
      `LocalLLMContext never writes stored key '${key}'`,
      !ctx.includes(`setItem('${key}'`) && !ctx.includes(`setItem("${key}"`),
    );
  }
  check(
    'LocalLLMContext has no sessionStorage key writes at all',
    !/sessionStorage\.setItem\(['"]nvk_/.test(ctx),
  );
  check(
    'LocalLLMContext purges legacy stored keys on mount (no silent migration)',
    ctx.includes("localStorage.removeItem('nvk_hf_token')") &&
      ctx.includes("localStorage.removeItem('nvk_api_keys')") &&
      ctx.includes("sessionStorage.removeItem('nvk_hf_token')") &&
      ctx.includes("sessionStorage.removeItem('nvk_api_keys')"),
  );
  check(
    'LocalLLMContext purge does not copy stored keys into memory',
    !ctx.includes('setHfToken(legacyToken)') && !ctx.includes('setApiKeys(JSON.parse(legacyKeys))'),
  );
  check(
    'LocalLLMContext still sends the in-memory key in the proxy request body',
    ctx.includes('apiKey: clientApiKey || undefined'),
  );

  // --- 1b. No key material in any storage: AuthGateway. ---
  for (const key of ['nvk_api_keys', 'nvk_hf_token']) {
    check(
      `AuthGateway never reads stored key '${key}'`,
      !gateway.includes(`getItem('${key}')`),
    );
    check(
      `AuthGateway never writes stored key '${key}'`,
      !gateway.includes(`setItem('${key}'`),
    );
  }
  check(
    'AuthGateway contains no localStorage key calls at all',
    !/localStorage\.(get|set|remove)Item\(['"]nvk_api_keys/.test(gateway),
  );
  check(
    'AuthGateway still hands the key to the opener (memory handoff)',
    gateway.includes("type: 'OAUTH_AUTH_SUCCESS'") && gateway.includes('token: token.trim()'),
  );
  check(
    'AuthGateway copy says memory-only, never stored',
    gateway.includes('held in memory only for this session') &&
      !gateway.includes('stored strictly in client sandbox cache storage'),
  );

  // --- 1c. ModelOrchestratorPanel: keys only via in-memory context. ---
  check(
    'ModelOrchestratorPanel stores no key material',
    !/localStorage\.(get|set)Item\(['"]nvk_(api_keys|hf_token)/.test(panel) &&
      !/sessionStorage\.(get|set)Item\(['"]nvk_(api_keys|hf_token)/.test(panel),
  );
  check(
    'ModelOrchestratorPanel receives keys via postMessage into memory state',
    panel.includes("event.data?.type === 'OAUTH_AUTH_SUCCESS'") &&
      panel.includes('setApiKeys(prev => ({ ...prev, [payloadProvider]: payloadToken }))'),
  );

  // --- 2. Server proxy: body in, Authorization header out, never stored/logged. ---
  check(
    'proxy reads the key from the request body only',
    server.includes('const { prompt, systemInstruction, provider, model, apiKey,') &&
      !/req\.headers.*apiKey|apiKey.*localStorage|apiKey.*sessionStorage/.test(server),
  );
  check(
    'proxy sends the key only as the upstream Authorization header',
    server.includes('Authorization: `Bearer ${apiKey}`'),
  );
  check(
    'proxy never logs the key',
    !/console\.(log|warn|error)\([^)]*apiKey/.test(server),
  );
  check(
    'proxy refuses a keyless call with a clean 400, no upstream call',
    server.includes('No provider key provided. Add your provider API key in Settings'),
  );

  // --- 3. Non-key preferences may still persist (not key material). ---
  check(
    'model selection preference still persists (not a key)',
    ctx.includes("localStorage.setItem('nvk_selected_model'"),
  );
  check(
    'provider/model selection in the panel is storage, not key material',
    panel.includes("localStorage.getItem(`nvk_model_${selectedProvider}`)"),
  );

  console.log(failures === 0 ? 'All key-handling checks passed.' : `${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main();
