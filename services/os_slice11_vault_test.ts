/**
 * OS vault test (MCNA slice 11, 2026-11-23).
 *
 * Pure-module test — no server, no DOM, no model, no network. Verifies
 * the slice-11 vault rules for the OS:
 *   (1) No fake credentials in the client: the IntegrationHubPanel no
 *       longer ships fake API keys ('xoxb-dummy-…', 'jira-usr-token-…',
 *       'ghp_autonomous_operator_secrethash') or a fake auto-generated
 *       key ('xoxhb-auto-gen-token-3000'), and no connector defaults to
 *       'connected' — nothing is connected until the user configures a
 *       real key.
 *   (2) No secret in plaintext session state: the panel's localStorage
 *       write strips the apiKey (a user-entered key lives in React state
 *       — memory — only).
 *   (3) The server holds provider credentials in environment variables
 *       (server-side), never in the client bundle.
 *
 * Run: npx tsx services/os_slice11_vault_test.ts
 * (also wired into `npm test` — it needs no server).
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name} ${detail}`);
  }
};

const panel = readFileSync(
  new URL('../components/panels/IntegrationHubPanel.tsx', import.meta.url),
  'utf8',
);

// --- 1. No fake credentials ---
check('no fake Slack key in the panel', !panel.includes('xoxb-dummy-slack-token-1128'));
check('no fake Jira key in the panel', !panel.includes('jira-usr-token-axiom-771'));
check('no fake GitHub key in the panel', !panel.includes('ghp_autonomous_operator_secrethash'));
check('no fake auto-generated key on toggle', !panel.includes('xoxhb-auto-gen-token-3000'));
check('no connector defaults to connected', !/id: '[a-z]+', name: '[^']+', type: '[^']+', status: 'connected'/.test(panel), 'a default connector is still marked connected');

// --- 2. No secret in plaintext session state ---
check(
  'the localStorage write strips the apiKey',
  /localStorage\.setItem\('nvk_hub_connectors', JSON\.stringify\(persisted\)\)/.test(panel) &&
    panel.includes("const persisted = list.map(({ apiKey: _key, ...rest }) => rest);"),
  'saveConnectors must persist a copy with apiKey removed',
);

// --- 3. Server keys are env-only (source-pinned) ---
const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
check('the server reads provider credentials from env (server-side)', /process\.env\./.test(server));
const clientHasApiKey = /OPENAI_API_KEY|ANTHROPIC_API_KEY/.test(
  readFileSync(new URL('../context/LocalLLMContext.tsx', import.meta.url), 'utf8'),
);
check('the client LLM context never references a provider API key', !clientHasApiKey);

if (failures > 0) {
  console.error(`\nSlice-11 vault test FAILED (${failures} failure(s)).`);
  process.exit(1);
}
console.log('\nSlice-11 vault test PASSED.');
