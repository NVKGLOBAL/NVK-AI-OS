/**
 * NVK-AI-OS — the relay adapter (Sprint 8, slice 4: the desktop client).
 *
 * The OS's side of the remote-control channel. It polls the relay
 * mailbox for commands from the phone, dispatches them to the OS's
 * own systems, and posts the results + the live status back.
 *
 * It is transport + wiring ONLY. The commands are executed by the
 * existing systems, never by this adapter:
 * - `chat` -> NVKRuntime.execute (the same runtime as the command
 *   layer — the intent engine, the planner, the capability registry,
 *   the evidence store, the ledger). The response message + the
 *   intent/status are posted back. (The panel commands and the
 *   no-model answers live in the command layer's handleSendCommand,
 *   which is component-local — the relay calls the runtime directly,
 *   so a relay `chat` does NOT run the panel-command dispatch. That
 *   is a known gap: wiring the panel dispatch into the relay path is
 *   a follow-up, not this slice.)
 * - `approve` / `reject` -> the OS has a permission gate (the A1
 *   follow-up made it real at the engine/registry layers), but the
 *   UI grant path was never wired (preview() has zero callers) — so
 *   these return an honest "not available" until the grant path
 *   exists. (See the nav/UX fix apply report, 2026-11-22.)
 * - `status` -> the runtime state + the diagnostics, via the
 *   getStatus function the App provides.
 * - `start-task` / `pause-task` / `cancel-task` -> an honest
 *   "not available" (the continuous task engine's relay wiring is a
 *   follow-up — never a fabricated task).
 *
 * The transport (poll, dispatch, post-result, post-status) mirrors
 * the relay repo's RelayClient (~/workspace/nvk-relay/src/relay-client.js)
 * and the Agent's adapter (~/workspace/nvk-agent-build/src/intelligence/relayAdapter.ts)
 * — the same logic, typed for this repo, so the OS stays
 * self-contained (no cross-repo import, no build-config change).
 *
 * The desktop authenticates to the relay with its desktop token
 * (X-Desktop-Token). The token lives in the OS's settings (the owner
 * types it once, on the desktop) — it is never sent to the phone.
 * The pairing code is generated here (6 digits, 5-minute expiry) and
 * shown on screen; the phone enters it once.
 */

import type { NVKRuntime } from '../nvk/runtime/NVKRuntime';

export interface RelayCommand {
  id: string;
  command: string;
  args: Record<string, unknown>;
}

export interface RelayResult {
  [key: string]: unknown;
}

export function generatePairingCode(random: () => number = Math.random): string {
  return String(100000 + Math.floor(random() * 900000));
}

// The runtime's execute, injected by the App (the live NVKRuntime
// instance, or the nvkRuntime singleton). Injected so this module is
// testable with a fake runtime and does not reach into the App.
export type ExecuteFn = (req: { input: string; sessionId: string }) => Promise<{
  taskId: string;
  intent: string;
  status: string;
  message: string;
}>;
export type GetStatusFn = () => Record<string, unknown> | null;

export async function handleChatCommand(
  execute: ExecuteFn,
  args: Record<string, unknown>,
): Promise<RelayResult> {
  const text = typeof args.text === 'string' ? args.text.trim() : '';
  if (!text) return { error: 'no text was sent' };
  const res = await execute({ input: text, sessionId: 'relay' });
  return {
    answer: res.message,
    intent: res.intent,
    status: res.status,
    taskId: res.taskId,
  };
}

export function handleApproveCommand(_args: Record<string, unknown>): RelayResult {
  return { error: 'approve is not available — the OS permission-gate grant path is not wired yet' };
}

export function handleRejectCommand(_args: Record<string, unknown>): RelayResult {
  return { error: 'reject is not available — the OS permission-gate grant path is not wired yet' };
}

export function handleTaskCommand(command: string, args: Record<string, unknown>): RelayResult {
  const taskId = typeof args.taskId === 'string' ? args.taskId : '';
  return {
    error: `task ${command} is not available — the relay task commands are not wired to the OS task engine yet`,
    taskId,
  };
}

export type Handlers = Record<string, (args: Record<string, unknown>) => Promise<RelayResult> | RelayResult>;

export function buildHandlers(execute: ExecuteFn): Handlers {
  return {
    chat: (args) => handleChatCommand(execute, args),
    approve: handleApproveCommand,
    reject: handleRejectCommand,
    'start-task': (args) => handleTaskCommand('start-task', args),
    'pause-task': (args) => handleTaskCommand('pause-task', args),
    'cancel-task': (args) => handleTaskCommand('cancel-task', args),
  };
}

export interface RelayClientOptions {
  relayUrl: string;
  desktopId: string;
  desktopToken: string;
  execute: ExecuteFn;
  getStatus?: GetStatusFn;
  fetchImpl?: typeof fetch;
  pollMs?: number;
}

export class OsRelayClient {
  private relayUrl: string;
  private desktopId: string;
  private desktopToken: string;
  private handlers: Handlers;
  private getStatus: GetStatusFn | null;
  private fetchImpl: typeof fetch;
  private pollMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  lastError: string | null = null;

  constructor(opts: RelayClientOptions) {
    this.relayUrl = opts.relayUrl.replace(/\/$/, '');
    this.desktopId = opts.desktopId;
    this.desktopToken = opts.desktopToken;
    this.handlers = buildHandlers(opts.execute);
    this.getStatus = opts.getStatus ?? null;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.pollMs = opts.pollMs ?? 2000;
  }

  private headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', 'X-Desktop-Token': this.desktopToken };
  }

  private async call(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await this.fetchImpl(`${this.relayUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ desktopId: this.desktopId, ...body }),
    });
    return res.json() as Promise<Record<string, unknown>>;
  }

  async registerPairing(code: string): Promise<Record<string, unknown>> {
    return this.call('/desktop/register-pairing', { code });
  }

  async pollOnce(): Promise<{ ok: boolean; error?: string; handled: Array<{ id: string; command: string; ok: boolean; error?: string }> }> {
    const res = await this.call('/desktop/commands', {});
    if (!res.ok) {
      this.lastError = String(res.error ?? 'the relay did not return commands');
      return { ok: false, error: this.lastError, handled: [] };
    }
    const handled: Array<{ id: string; command: string; ok: boolean; error?: string }> = [];
    for (const cmd of (res.commands as RelayCommand[]) || []) {
      const handler = this.handlers[cmd.command];
      if (!handler) {
        await this.call('/desktop/result', { commandId: cmd.id, result: { error: `this desktop cannot run ${cmd.command}` } });
        handled.push({ id: cmd.id, command: cmd.command, ok: false, error: 'no handler' });
        continue;
      }
      try {
        const result = await handler(cmd.args || {});
        await this.call('/desktop/result', { commandId: cmd.id, result });
        handled.push({ id: cmd.id, command: cmd.command, ok: true });
      } catch (err) {
        await this.call('/desktop/result', { commandId: cmd.id, result: { error: String((err as Error)?.message ?? err) } });
        handled.push({ id: cmd.id, command: cmd.command, ok: false, error: String((err as Error)?.message ?? err) });
      }
    }
    await this.postStatus();
    this.lastError = null;
    return { ok: true, handled };
  }

  async postStatus(): Promise<Record<string, unknown>> {
    if (!this.getStatus) return { ok: true, skipped: true };
    const status = this.getStatus();
    if (!status) return { ok: true, skipped: true };
    return this.call('/desktop/status', { status });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const tick = async (): Promise<void> => {
      if (!this.running) return;
      try {
        await this.pollOnce();
      } catch (err) {
        this.lastError = String((err as Error)?.message ?? err);
      }
      if (this.running) this.timer = setTimeout(tick, this.pollMs);
    };
    this.timer = setTimeout(tick, this.pollMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  async disconnectAll(): Promise<Record<string, unknown>> {
    return this.call('/desktop/disconnect-all', {});
  }
}

// Re-exported for the App to wire the live runtime without importing
// the runtime module twice.
export type { NVKRuntime };
