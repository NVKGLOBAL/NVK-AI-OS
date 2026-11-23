import React, { useState } from 'react';
import type { WorkspaceMode } from '../../types';
import type { WorkspaceConfig } from '../spatial/Workspace2D';
import { version as PACKAGE_VERSION } from '../../package.json';

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
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSaved, setTokenSaved] = useState<boolean>(() => {
    try { return !!sessionStorage.getItem('nvk_dispatch_token'); } catch { return false; }
  });
  const [tokenMsg, setTokenMsg] = useState<string | null>(null);

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
