import React, { useState, useEffect } from 'react';
import type { WorkspaceMode } from '../../types';
import type { WorkspaceConfig } from '../spatial/Workspace2D';
import { version as PACKAGE_VERSION } from '../../package.json';
import { generatePairingCode } from '../../services/relayAdapter';
import {
  RELAY_DESKTOP_ID,
  RELAY_PERMISSIONS,
  DEFAULT_PAIRING_PERMISSIONS,
  PAIRING_CODE_TTL_MS,
  pairingSecondsLeft,
  type RelayPermission,
} from '../../services/relaySettings';

interface SettingsPanelProps {
  deskConfig: WorkspaceConfig;
  onDeskConfigChange: (next: WorkspaceConfig) => void;
  workspaceMode: WorkspaceMode;
  onWorkspaceModeChange: (mode: WorkspaceMode) => void;
  onResetWorkspace: () => void;
  onOpenModelPanel: () => void;
  modelLoaded: boolean;
  modelId: string | null;
  onOpenTutorial: () => void;
  // Sprint 8 relay (phone control) — the client itself lives in App;
  // the panel only edits settings and drives it through these callbacks.
  relayRunning: boolean;
  relayError: string | null;
  relayLastContact: number | null;
  relayTokenSet: boolean;
  onRelayTokenSave: (token: string, remember: boolean) => void;
  onRelayTokenClear: () => void;
  onRelayRegisterPairing: (code: string) => Promise<Record<string, unknown>>;
  onRelayDisconnectAll: () => Promise<Record<string, unknown>>;
  onRelayToggleRunning: () => void;
}

const MODES: { id: WorkspaceMode; label: string; desc: string }[] = [
  { id: 'immersive', label: 'Immersive', desc: 'Full 3D orb stage' },
  { id: 'split', label: 'Split', desc: '3D stage + 2D desk' },
  { id: 'grid', label: 'Grid', desc: '2D desk, bento grid' },
  { id: '2d', label: '2D Desk', desc: '2D desk only' },
];

const THEMES = ['emerald', 'cyan', 'amber', 'amethyst', 'crimson', 'cyberpunk', 'monochrome'] as const;
const WALLPAPERS = [
  { id: 'grid', label: 'GRAPH' },
  { id: 'dots', label: 'DOTS' },
  { id: 'carbon', label: 'WEAVE' },
  { id: 'matrix', label: 'CODE' },
  { id: 'eco', label: 'SOLID' },
] as const;
const LAYOUTS = [
  { id: 'tab', label: 'TAB' },
  { id: 'grid', label: 'GRID' },
  { id: 'stack', label: 'STACK' },
  { id: 'single', label: 'SINGLE' },
] as const;

/**
 * S7 — the ONE settings surface (a panel, not a drawer war): workspace
 * mode, desk appearance, model + provider keys, dispatch token, help and
 * reset. One config store, one persistence key (nvk_settings_v1, owned
 * by App). The z-2000 desk drawer in Workspace2D is deleted.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  deskConfig,
  onDeskConfigChange,
  workspaceMode,
  onWorkspaceModeChange,
  onResetWorkspace,
  onOpenModelPanel,
  modelLoaded,
  modelId,
  onOpenTutorial,
  relayRunning,
  relayError,
  relayLastContact,
  relayTokenSet,
  onRelayTokenSave,
  onRelayTokenClear,
  onRelayRegisterPairing,
  onRelayDisconnectAll,
  onRelayToggleRunning,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSaved, setTokenSaved] = useState<boolean>(() => {
    try { return !!sessionStorage.getItem('nvk_dispatch_token'); } catch { return false; }
  });
  const [tokenMsg, setTokenMsg] = useState<string | null>(null);

  // --- Sprint 8 relay (phone control) -----------------------------------
  // The desktop token copies the dispatch-token pattern exactly:
  // sessionStorage by default, never displayed after entry, cleared
  // from the field after saving. localStorage only with the explicit
  // "remember this token" opt-in.
  const [relayTokenInput, setRelayTokenInput] = useState('');
  const [relayRememberToken, setRelayRememberToken] = useState(false);
  const [relayTokenMsg, setRelayTokenMsg] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiresAt, setPairingExpiresAt] = useState<number | null>(null);
  const [pairingRemaining, setPairingRemaining] = useState(0);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingPerms, setPairingPerms] = useState<RelayPermission[]>([...DEFAULT_PAIRING_PERMISSIONS]);
  const [relayActionMsg, setRelayActionMsg] = useState<string | null>(null);

  // Live 5-minute countdown on the pairing code; the code dies on
  // screen when it dies on the relay (single-use, 5-minute expiry).
  useEffect(() => {
    if (!pairingExpiresAt) return;
    const tick = () => {
      const left = pairingSecondsLeft(pairingExpiresAt);
      setPairingRemaining(left);
      if (left <= 0) {
        setPairingCode(null);
        setPairingExpiresAt(null);
        setPairingError('That pairing code expired — generate a new one.');
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [pairingExpiresAt]);

  const relayConfigured = deskConfig.relayEnabled
    && deskConfig.relayUrl.trim().length > 0
    && relayTokenSet;

  const saveRelayToken = () => {
    const token = relayTokenInput.trim();
    if (!token) {
      onRelayTokenClear();
      setRelayTokenMsg('Desktop token cleared.');
    } else {
      onRelayTokenSave(token, relayRememberToken);
      setRelayTokenMsg(relayRememberToken
        ? 'Token saved on this computer. Clear it any time from this panel.'
        : 'Token saved for this session only. It is never written to disk.');
    }
    setRelayTokenInput('');
  };

  const generatePairing = async () => {
    setPairingError(null);
    setRelayActionMsg(null);
    if (!relayRunning) {
      setPairingError('Start the relay first — a code can only be registered while the relay is polling.');
      return;
    }
    const code = generatePairingCode();
    let res: Record<string, unknown>;
    try {
      res = await onRelayRegisterPairing(code);
    } catch (err) {
      res = { ok: false, error: String((err as Error)?.message ?? err) };
    }
    // The code is shown ONLY when the relay accepted it. A failed
    // registration shows the error instead — never a code that is not
    // valid on the relay.
    if (res && res.ok) {
      setPairingCode(code);
      setPairingExpiresAt(Date.now() + PAIRING_CODE_TTL_MS);
      setPairingRemaining(Math.ceil(PAIRING_CODE_TTL_MS / 1000));
    } else {
      setPairingCode(null);
      setPairingExpiresAt(null);
      setPairingError(String(res?.error ?? 'Pairing registration failed.'));
    }
  };

  const disconnectAll = async () => {
    if (!window.confirm('Disconnect all phones? Every paired phone must pair again with a new code.')) return;
    setRelayActionMsg(null);
    let res: Record<string, unknown>;
    try {
      res = await onRelayDisconnectAll();
    } catch (err) {
      res = { ok: false, error: String((err as Error)?.message ?? err) };
    }
    if (res && res.ok) {
      setPairingCode(null);
      setPairingExpiresAt(null);
      setRelayActionMsg('All phones disconnected. They must pair again with a new code.');
    } else {
      setRelayActionMsg(`Disconnect failed: ${String(res?.error ?? 'the relay did not answer')}`);
    }
  };

  const togglePairingPerm = (perm: RelayPermission) => {
    setPairingPerms(prev => {
      if (perm === 'monitor') return prev.includes('monitor') ? prev : [...prev, 'monitor'];
      return prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm];
    });
  };

  const relayStatusLine = (): { text: string; tone: string } => {
    if (!deskConfig.relayEnabled) return { text: 'Relay off.', tone: 'text-slate-500' };
    if (!deskConfig.relayUrl.trim()) return { text: 'Relay enabled, but no relay URL is set — paste the relay Worker URL below.', tone: 'text-amber-400' };
    if (!relayTokenSet) return { text: 'Relay enabled, but no desktop token is saved — paste it below.', tone: 'text-amber-400' };
    if (relayError) return { text: `Relay error: ${relayError}`, tone: 'text-red-400' };
    if (relayRunning) {
      return relayLastContact
        ? { text: `Relay running — polling the relay, last contact ${new Date(relayLastContact).toLocaleTimeString()}.`, tone: 'text-emerald-400' }
        : { text: 'Relay running — polling the relay, no successful contact yet.', tone: 'text-amber-400' };
    }
    return { text: 'Relay stopped. Press Start relay to resume polling.', tone: 'text-slate-400' };
  };
  const relayStatus = relayStatusLine();

  const set = (patch: Partial<WorkspaceConfig>) => onDeskConfigChange({ ...deskConfig, ...patch });

  const saveToken = () => {
    try {
      if (tokenInput.trim()) {
        sessionStorage.setItem('nvk_dispatch_token', tokenInput.trim());
        setTokenSaved(true);
        setTokenMsg('Token saved for this session only. It is never written to disk.');
      } else {
        sessionStorage.removeItem('nvk_dispatch_token');
        setTokenSaved(false);
        setTokenMsg('Token cleared for this session.');
      }
      setTokenInput('');
    } catch {
      setTokenMsg('Session storage is unavailable — the token could not be saved.');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/95 text-slate-100 font-mono overflow-y-auto custom-scrollbar p-4 gap-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="text-sm font-bold tracking-widest uppercase text-cyan-300">Settings</div>
          <div className="text-[10px] text-slate-500">One surface — workspace, desk, model, keys, reset. NVK OS v{PACKAGE_VERSION}</div>
        </div>
      </div>

      {/* Workspace mode */}
      <section className="flex flex-col gap-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace mode</div>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => onWorkspaceModeChange(m.id)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                workspaceMode === m.id
                  ? 'bg-cyan-950/50 border-cyan-500 text-cyan-200'
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-bold">{m.label}</div>
              <div className="text-[10px] text-slate-500">{m.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Desk appearance */}
      <section className="flex flex-col gap-3 border-t border-slate-800/60 pt-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">2D desk appearance</div>
        <label className="flex flex-col gap-1 text-[10px] text-slate-500 uppercase">
          Desk title
          <input
            type="text"
            value={deskConfig.customTitle}
            onChange={(e) => set({ customTitle: e.target.value })}
            className="bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs rounded px-2 py-1.5 outline-none focus:border-cyan-500"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase">Theme</span>
          <div className="flex flex-wrap gap-1.5">
            {THEMES.map(t => (
              <button
                key={t}
                onClick={() => set({ theme: t })}
                className={`px-2.5 py-1 rounded-full border font-mono text-[10px] uppercase ${
                  deskConfig.theme === t
                    ? 'bg-slate-100 text-slate-950 border-white font-bold'
                    : 'bg-transparent text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase">Wallpaper</span>
          <div className="flex flex-wrap gap-1.5">
            {WALLPAPERS.map(wp => (
              <button
                key={wp.id}
                onClick={() => set({ bgWallpaper: wp.id as WorkspaceConfig['bgWallpaper'] })}
                className={`px-2.5 py-1 rounded border font-mono text-[10px] uppercase ${
                  deskConfig.bgWallpaper === wp.id
                    ? 'bg-slate-100 text-slate-950 border-white font-bold'
                    : 'bg-transparent text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {wp.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase">Layout</span>
          <div className="flex flex-wrap gap-1.5">
            {LAYOUTS.map(l => (
              <button
                key={l.id}
                onClick={() => set({ layoutType: l.id as WorkspaceConfig['layoutType'] })}
                className={`px-2.5 py-1 rounded border font-mono text-[10px] uppercase ${
                  deskConfig.layoutType === l.id
                    ? 'bg-slate-100 text-slate-950 border-white font-bold'
                    : 'bg-transparent text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        {deskConfig.layoutType === 'grid' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase">Grid columns</span>
            <div className="flex gap-1.5">
              {[1, 2, 3].map(cols => (
                <button
                  key={cols}
                  onClick={() => set({ columnCount: cols })}
                  className={`px-3 py-1 rounded border font-mono text-[10px] ${
                    (deskConfig.columnCount ?? 2) === cols
                      ? 'bg-slate-100 text-slate-950 border-white font-bold'
                      : 'bg-transparent text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {cols} COL
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="flex flex-col gap-1 text-[10px] text-slate-500 uppercase">
          <span className="flex justify-between"><span>Panel glass opacity</span><span className="text-cyan-400">{deskConfig.panelOpacity.toFixed(2)}</span></span>
          <input
            type="range"
            min="0.10"
            max="1.00"
            step="0.05"
            value={deskConfig.panelOpacity}
            onChange={(e) => set({ panelOpacity: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500"
          />
        </label>
        <div className="grid grid-cols-1 gap-2">
          {([
            { key: 'lowLagMode', label: 'Low-lag mode (disable heavy effects)' },
            { key: 'showOrb', label: 'Show 2D core orb on the desk' },
            { key: 'compactMode', label: 'Compact layout (smaller text)' },
          ] as const).map(row => (
            <label key={row.key} className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer">
              <span>{row.label}</span>
              <input
                type="checkbox"
                checked={deskConfig[row.key]}
                onChange={(e) => set({ [row.key]: e.target.checked } as Partial<WorkspaceConfig>)}
                className="w-4 h-4 accent-cyan-500"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Model & provider keys */}
      <section className="flex flex-col gap-2 border-t border-slate-800/60 pt-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Model &amp; provider keys</div>
        <div className="text-[11px] text-slate-300 leading-relaxed">
          {modelLoaded ? (
            <>Local model loaded: <span className="text-emerald-400 font-bold">{modelId || 'unknown'}</span></>
          ) : (
            <>No local model loaded. <span className="text-amber-400">Load one to think locally, or connect a provider.</span></>
          )}
        </div>
        <button
          onClick={onOpenModelPanel}
          className="self-start px-3 py-2 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-200 font-mono text-[11px] rounded transition-all"
        >
          Open Model Orchestrator
        </button>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Provider keys are entered in the Model Orchestrator and kept in session storage only — they are never written to disk.
        </p>
      </section>

      {/* Dispatch token — S3 recovery */}
      <section className="flex flex-col gap-2 border-t border-slate-800/60 pt-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Terminal dispatch token</div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          The Terminal and dispatch require a bearer token. {tokenSaved ? 'A token is set for this session.' : 'No token is set for this session.'}
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveToken(); }}
            placeholder="Paste dispatch token"
            autoComplete="off"
            className="flex-1 min-w-0 bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs rounded px-2 py-1.5 outline-none focus:border-cyan-500"
          />
          <button
            onClick={saveToken}
            className="px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-200 font-mono text-[11px] rounded transition-all shrink-0"
          >
            Save for session
          </button>
        </div>
        {tokenMsg && <p className="text-[10px] text-emerald-400">{tokenMsg}</p>}
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Locked out? The token was printed once when the server started. Restart the server with NVK_AGENT_TOKEN=&lt;your token&gt; to set your own, then paste it here. The token is never written to any file.
        </p>
      </section>

      {/* Phone control (relay) — Sprint 8 */}
      <section className="flex flex-col gap-2 border-t border-slate-800/60 pt-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone control (relay)</div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Control this desktop from your phone through the NVK relay. The phone never talks to this desktop directly — it queues commands on the relay, and this desktop polls for them.
        </p>

        <label className="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer">
          <span>Enable relay</span>
          <input
            type="checkbox"
            checked={deskConfig.relayEnabled ?? false}
            onChange={(e) => set({ relayEnabled: e.target.checked })}
            className="w-4 h-4 accent-cyan-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] text-slate-500 uppercase">
          Relay URL
          <input
            type="text"
            value={deskConfig.relayUrl ?? ''}
            onChange={(e) => set({ relayUrl: e.target.value })}
            placeholder="https://your-relay-worker.workers.dev"
            autoComplete="off"
            spellCheck={false}
            className="bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs rounded px-2 py-1.5 outline-none focus:border-cyan-500 normal-case"
          />
        </label>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Paste the relay Worker URL once it is deployed. Empty means not configured — no relay URL is ever hardcoded here.
        </p>

        <label className="flex flex-col gap-1 text-[10px] text-slate-500 uppercase">
          Desktop token
          <span className="flex gap-2 normal-case">
            <input
              type="password"
              value={relayTokenInput}
              onChange={(e) => setRelayTokenInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveRelayToken(); }}
              placeholder={relayTokenSet ? 'A token is saved — paste a new one to replace it' : 'Paste the desktop token'}
              autoComplete="off"
              className="flex-1 min-w-0 bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs rounded px-2 py-1.5 outline-none focus:border-cyan-500"
            />
            <button
              onClick={saveRelayToken}
              className="px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-200 font-mono text-[11px] rounded transition-all shrink-0"
            >
              Save token
            </button>
          </span>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={relayRememberToken}
            onChange={(e) => setRelayRememberToken(e.target.checked)}
            className="w-4 h-4 accent-cyan-500"
          />
          <span>Remember this token on this computer</span>
        </label>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          {relayTokenSet ? 'A desktop token is saved.' : 'No desktop token is saved.'} By default the token lives in session storage only and is forgotten when this tab closes. The token is never shown again after entry and never sent to the phone.
        </p>
        {relayTokenMsg && <p className="text-[10px] text-emerald-400">{relayTokenMsg}</p>}
        {relayTokenSet && (
          <button
            onClick={() => { onRelayTokenClear(); setRelayTokenMsg('Desktop token cleared.'); }}
            className="self-start px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[11px] rounded transition-all"
          >
            Clear saved token
          </button>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRelayToggleRunning}
            disabled={!relayConfigured}
            title={!relayConfigured ? 'Enable the relay and set the relay URL + desktop token first.' : undefined}
            className="px-3 py-2 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-200 font-mono text-[11px] rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {relayRunning ? 'Stop relay' : 'Start relay'}
          </button>
          <button
            onClick={generatePairing}
            disabled={!relayRunning}
            title={!relayRunning ? 'Start the relay first.' : undefined}
            className="px-3 py-2 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-200 font-mono text-[11px] rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate pairing code
          </button>
          <button
            onClick={disconnectAll}
            disabled={!relayRunning}
            title={!relayRunning ? 'Start the relay first.' : undefined}
            className="px-3 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/40 text-red-300 font-mono text-[11px] rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Disconnect all phones
          </button>
        </div>

        <p className={`text-[11px] leading-relaxed ${relayStatus.tone}`}>
          Status: {relayStatus.text}
        </p>
        {relayActionMsg && <p className="text-[10px] text-slate-300">{relayActionMsg}</p>}

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase">Pair this phone with</span>
          <div className="grid grid-cols-1 gap-1.5">
            {RELAY_PERMISSIONS.map(p => (
              <label key={p.id} className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pairingPerms.includes(p.id)}
                  onChange={() => togglePairingPerm(p.id)}
                  disabled={p.id === 'monitor'}
                  className="w-4 h-4 accent-cyan-500 mt-px shrink-0"
                />
                <span>
                  <span className="font-bold">{p.label}</span>
                  <span className="text-slate-500"> — {p.desc}{p.id === 'monitor' ? ' (always on)' : ''}</span>
                  {p.id === 'approve' && (
                    <span className="block text-amber-400/90 text-[10px] leading-relaxed">Approve does not work yet — approve / reject from the phone honestly report “not available” until the permission-gate grant path is wired. Ticking this box does not enable it.</span>
                  )}
                  {p.id === 'control' && (
                    <span className="block text-amber-400/90 text-[10px] leading-relaxed">Task commands (start / pause / cancel) honestly report “not available” — the relay is not wired to the task engine yet.</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            These boxes record what you intend this phone to be allowed to do. The relay grants monitor by default and the phone requests its permissions when it pairs — the register-pairing call carries only the code, so these boxes do not change what the relay grants. The phone screen as shipped pairs monitor-only, so chat from the phone needs the phone to pair with the voice permission.
          </p>
        </div>

        {pairingCode && (
          <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 p-3 flex flex-col gap-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Pairing code — desktop <span className="text-cyan-300 font-bold">{RELAY_DESKTOP_ID}</span></div>
            <div className="text-3xl font-bold tracking-[0.3em] text-cyan-200">{pairingCode}</div>
            <div className="text-[11px] text-slate-300">
              Enter this code on the phone within {Math.floor(pairingRemaining / 60)}:{String(pairingRemaining % 60).padStart(2, '0')} — one use only, then it dies.
            </div>
            <div className="text-[10px] text-slate-500 leading-relaxed">
              Intended permissions for this pairing: {pairingPerms.join(', ')}.
            </div>
          </div>
        )}
        {pairingError && <p className="text-[11px] text-red-400 leading-relaxed">{pairingError}</p>}

        <p className="text-[10px] text-slate-500 leading-relaxed">
          Relay chat calls the runtime directly. It does NOT run the panel-command dispatch in the command layer, so typed-chat panel commands are not available from the phone — relay chat is not full parity with typed chat.
        </p>
      </section>

      {/* Help + reset */}
      <section className="flex flex-col gap-2 border-t border-slate-800/60 pt-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Help &amp; reset</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenTutorial}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[11px] rounded transition-all"
          >
            Replay first-run tour
          </button>
          <button
            onClick={() => {
              if (window.confirm('Reset the workspace? This clears the saved cluster layout and desk settings and restores the defaults.')) {
                onResetWorkspace();
              }
            }}
            className="px-3 py-2 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-500/40 text-amber-300 font-mono text-[11px] rounded transition-all"
          >
            Reset workspace
          </button>
        </div>
      </section>
    </div>
  );
};
