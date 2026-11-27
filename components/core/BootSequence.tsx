import React, { useState, useEffect, useRef } from 'react';
import { version as PACKAGE_VERSION } from '../../package.json';

interface BootSequenceProps {
  onComplete: () => void;
}

type StepResult = { label: string; detail: string; ok: boolean };

/**
 * F1 (nav/UX fix spec, 2026-11-22): the old boot sequence printed
 * scripted log lines on a 400 ms timer and never checked anything. Each
 * step below runs a REAL check and reports its real result. A Skip button
 * is always available. First-load-only is enforced by App (nvk_boot_seen).
 */
async function checkSavedWorkspace(): Promise<StepResult> {
  try {
    const cluster = localStorage.getItem('nvk_cluster_v1');
    const settings = localStorage.getItem('nvk_settings_v1');
    let clusters = 0;
    if (cluster) {
      const parsed = JSON.parse(cluster);
      clusters = Array.isArray(parsed) ? parsed.length : 0;
    }
    return {
      label: 'Saved workspace',
      detail: cluster || settings ? `${clusters} cluster(s) restored` : 'no saved workspace — starting fresh',
      ok: true,
    };
  } catch {
    return { label: 'Saved workspace', detail: 'saved data unreadable — starting fresh', ok: false };
  }
}

async function checkModelCache(): Promise<StepResult> {
  try {
    if (!('caches' in window)) {
      return { label: 'Model cache', detail: 'Cache API unavailable in this browser', ok: false };
    }
    const names = await caches.keys();
    let onnx = 0;
    for (const name of names) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      onnx += keys.filter((r) => r.url.includes('.onnx')).length;
    }
    return {
      label: 'Model cache',
      detail: onnx > 0 ? `${onnx} model file(s) cached — load will be fast` : 'no model cached yet — first load downloads weights',
      ok: true,
    };
  } catch {
    return { label: 'Model cache', detail: 'cache probe failed', ok: false };
  }
}

async function checkServer(): Promise<StepResult> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
    return {
      label: 'Local server',
      detail: res.ok
        ? 'reachable — dispatch, export and cloud proxy available'
        : `responded ${res.status} — local mode only`,
      ok: res.ok,
    };
  } catch {
    return {
      label: 'Local server',
      detail: 'not running — local mode only (dispatch, export and cloud proxy unavailable)',
      ok: false,
    };
  }
}

function checkWorkspaceMode(): StepResult {
  try {
    const saved = localStorage.getItem('nvk_workspace_mode');
    const valid = ['immersive', 'split', 'grid', '2d'];
    if (!saved) return { label: 'Workspace mode', detail: 'defaulting to Immersive', ok: true };
    if (saved === '3d') return { label: 'Workspace mode', detail: 'legacy "3d" migrated to Immersive', ok: true };
    return valid.includes(saved)
      ? { label: 'Workspace mode', detail: `restored: ${saved}`, ok: true }
      : { label: 'Workspace mode', detail: `unknown "${saved}" — defaulting to Immersive`, ok: false };
  } catch {
    return { label: 'Workspace mode', detail: 'unreadable — defaulting to Immersive', ok: false };
  }
}

const BOOT_STEPS: (() => Promise<StepResult> | StepResult)[] = [
  checkSavedWorkspace,
  checkModelCache,
  checkServer,
  checkWorkspaceMode,
];

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [lines, setLines] = useState<StepResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    (async () => {
      for (const step of BOOT_STEPS) {
        if (cancelled.current) return;
        const result = await step();
        if (cancelled.current) return;
        setLines((prev) => [...prev, result]);
        setProgress((prev) => prev + 100 / BOOT_STEPS.length);
      }
      if (!cancelled.current) {
        setIsReady(true);
        setProgress(100);
      }
    })();
    return () => {
      cancelled.current = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center text-cyan-500 font-mono overflow-hidden cursor-default select-none">
      <div className="w-full max-w-2xl p-8 relative">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

        {/* Logo Area */}
        <div className="flex flex-col items-center mb-6">
          <div className="text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-700 mb-2 font-['Orbitron']">
            NVK OS
          </div>
          <div className="text-xs tracking-[0.5em] text-cyan-600 uppercase">Angelic Business Operations</div>
        </div>

        {/* F4: the first screen explains what NVK is */}
        <div className="mb-6 text-center">
          <p className="text-sm md:text-base text-cyan-200 leading-relaxed">
            This is <span className="font-bold text-cyan-300">NVK</span> — your agent, inside the orb.
            It runs in your browser, shows its work in 3D, and records what it does.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 text-left">
            <div className="border border-cyan-500/30 rounded-lg p-3">
              <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Instant answers</div>
              <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">The Free Cloud Gateway answers instantly — no download, no account. A local model is optional.</div>
            </div>
            <div className="border border-cyan-500/30 rounded-lg p-3">
              <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Evidence ledger</div>
              <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">Every action is recorded with a hash you can verify — never auto-approved.</div>
            </div>
            <div className="border border-cyan-500/30 rounded-lg p-3">
              <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Panels &amp; clusters</div>
              <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">Your tools live as nodes around the orb. Click one to open it.</div>
            </div>
          </div>
        </div>

        {/* Terminal Log — real check results */}
        <div className="h-32 overflow-hidden mb-6 border-l-2 border-cyan-900/50 pl-4 relative">
          <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black to-transparent z-10"></div>
          <div className="flex flex-col justify-end h-full">
            {lines.map((line, i) => (
              <div key={i} className="text-sm md:text-base mb-1 opacity-80">
                <span className={line.ok ? 'text-emerald-400 mr-2' : 'text-amber-400 mr-2'}>[{line.ok ? 'OK' : '!!'}]</span>
                <span className="text-cyan-500">{line.label}: </span>
                <span className={i === lines.length - 1 ? 'text-cyan-300 font-bold' : 'text-cyan-500'}>{line.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Bar — derived from completed checks, not a timer */}
        <div className="w-full h-1 bg-cyan-900/30 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Interaction Buttons */}
        <div className="h-16 flex items-center justify-center gap-4">
          {isReady ? (
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-cyan-900/20 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500 hover:text-black hover:border-cyan-400 transition-all duration-200 font-['Cinzel'] tracking-widest uppercase text-lg shadow-[0_0_15px_rgba(6,182,212,0.2)] group"
            >
              <span className="group-hover:animate-pulse">Launch Workspace</span>
            </button>
          ) : (
            <span className="text-xs text-cyan-700 animate-pulse">SYSTEM BOOTING...</span>
          )}
          <button
            onClick={onComplete}
            className="px-5 py-3 bg-transparent border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all duration-200 tracking-widest uppercase text-sm"
          >
            Skip
          </button>
        </div>

        {/* Footer Metadata — F8: one version source */}
        <div className="absolute bottom-2 left-0 w-full text-center text-[10px] text-cyan-900">
          NVK OS | ETHICAL &amp; TRANSPARENT | v{PACKAGE_VERSION}
        </div>
      </div>
    </div>
  );
};

export default BootSequence;
