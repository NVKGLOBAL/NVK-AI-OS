// NVK-AI-OS — tests for the relay adapter (Sprint 8, slice 4).
// Run: npx tsx services/os_relay_adapter_test.ts
// The adapter is tested with a fake runtime execute — no live runtime,
// no relay, no network.

import assert from 'node:assert/strict';
import {
  generatePairingCode,
  handleChatCommand,
  handleApproveCommand,
  handleRejectCommand,
  handleTaskCommand,
  buildHandlers,
  OsRelayClient,
} from './relayAdapter';

// --- Pairing code -----------------------------------------------------------
for (let i = 0; i < 100; i++) {
  const code = generatePairingCode();
  assert.equal(code.length, 6, 'the pairing code is 6 digits');
  assert.match(code, /^[1-9][0-9]{5}$/, 'the pairing code never starts with 0');
}
console.log('  PASS the pairing code is 6 digits and never starts with 0');

// --- Chat ---------------------------------------------------------------------
const seen: string[] = [];
const fakeExecute = async (req: { input: string; sessionId: string }) => {
  seen.push(req.input);
  return { taskId: 'task-1', intent: 'web_research', status: 'needs_input', message: 'I need more detail to research that.' };
};
const chat = await handleChatCommand(fakeExecute, { text: 'research NVK' });
assert.deepEqual(chat, {
  answer: 'I need more detail to research that.',
  intent: 'web_research',
  status: 'needs_input',
  taskId: 'task-1',
});
assert.deepEqual(seen, ['research NVK']);
console.log('  PASS the chat handler calls the runtime execute and returns the message + intent + status');

// A null/empty text is an honest no-command.
assert.equal((await handleChatCommand(fakeExecute, { text: '   ' })).error, 'no text was sent');
assert.equal((await handleChatCommand(fakeExecute, {})).error, 'no text was sent');
console.log('  PASS empty text is an honest no-command, never a fabricated run');

// --- Approve / reject -----------------------------------------------------------
assert.match(String(handleApproveCommand({ approvalId: 'x' }).error), /not available/);
assert.match(String(handleRejectCommand({ approvalId: 'x' }).error), /not available/);
console.log('  PASS approve / reject are honestly unavailable (the grant path is not wired yet)');

// --- Tasks ---------------------------------------------------------------------
for (const cmd of ['start-task', 'pause-task', 'cancel-task']) {
  const res = handleTaskCommand(cmd, { taskId: 'task-1' });
  assert.match(String(res.error), /not available/);
  assert.equal(res.taskId, 'task-1');
}
console.log('  PASS task commands are honestly unavailable (not wired to the task engine yet)');

// --- The client ------------------------------------------------------------------
const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
const fakeFetch = (async (url: string, opts: { body: string }) => {
  const body = JSON.parse(opts.body) as Record<string, unknown>;
  calls.push({ url, body });
  if (url.endsWith('/desktop/commands')) {
    return { json: async () => ({ ok: true, commands: [{ id: 'cmd-1', command: 'chat', args: { text: 'hello' } }] }) };
  }
  return { json: async () => ({ ok: true }) };
}) as unknown as typeof fetch;

const client = new OsRelayClient({
  relayUrl: 'https://relay.example.dev',
  desktopId: 'desk-1',
  desktopToken: 'tok',
  execute: fakeExecute,
  getStatus: () => ({ orbState: 'idle', model: 'not loaded' }),
  fetchImpl: fakeFetch,
});
const polled = await client.pollOnce();
assert.equal(polled.ok, true);
assert.equal(polled.handled.length, 1);
assert.equal(polled.handled[0].ok, true);
const resultCall = calls.find((c) => c.url.endsWith('/desktop/result'));
assert.ok(resultCall, 'the result was posted');
assert.deepEqual((resultCall!.body as { result: unknown }).result, {
  answer: 'I need more detail to research that.',
  intent: 'web_research',
  status: 'needs_input',
  taskId: 'task-1',
});
const statusCall = calls.find((c) => c.url.endsWith('/desktop/status'));
assert.ok(statusCall, 'the status was posted');
assert.equal((statusCall!.body as { status: { orbState: string } }).status.orbState, 'idle');
console.log('  PASS the client polls, dispatches the chat, and posts the result + the status');

// --- The handler table -------------------------------------------------------------
const handlers = buildHandlers(fakeExecute);
for (const cmd of ['chat', 'approve', 'reject', 'start-task', 'pause-task', 'cancel-task']) {
  assert.equal(typeof handlers[cmd], 'function', `a handler exists for ${cmd}`);
}
console.log('  PASS the handler table covers the relay command set');

console.log('OS relay adapter test PASSED.');
