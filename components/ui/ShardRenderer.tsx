import React from 'react';
import type { ShardSpec, ShardVariant } from '../../services/shardEngine';
import { ShardSkeleton } from './ShardSkeleton';

export interface ShardRendererProps {
  /** A validated shard, or null when synthesis was unavailable. */
  shard: ShardSpec | null;
  isGenerating: boolean;
  variant: ShardVariant;
  /** Called when the user taps "Share shard". Only offered for a real shard. */
  onShare?: () => void;
  /** Real same-origin share URL returned by POST /api/share/shard, if shared. */
  shareUrl?: string | null;
}

const ChartBody: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const labels = data.labels as string[];
  const values = data.values as number[];
  const max = Math.max(...values, 1);
  return (
    <div className="space-y-1.5">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="w-24 shrink-0 truncate text-slate-300">{label}</span>
          <div className="flex-1 h-3 bg-white/5 rounded overflow-hidden">
            <div className="h-full bg-cyan-500/70 rounded" style={{ width: `${(values[i] / max) * 100}%` }} />
          </div>
          <span className="w-10 text-right font-mono text-cyan-300">{values[i]}</span>
        </div>
      ))}
    </div>
  );
};

const TableBody: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const headers = data.headers as string[];
  const rows = data.rows as string[][];
  return (
    <table className="w-full text-[11px] border-collapse">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="text-left font-bold text-cyan-300 border-b border-white/10 pb-1 pr-2">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="text-slate-300 border-b border-white/5 py-1 pr-2">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const AgentDecisionBody: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const options = data.options as { label: string; detail: string }[];
  return (
    <div className="space-y-2 text-[11px]">
      <div><span className="font-bold text-emerald-300">Decision: </span><span className="text-slate-200">{data.decision as string}</span></div>
      <div><span className="font-bold text-slate-400">Rationale: </span><span className="text-slate-300">{data.rationale as string}</span></div>
      <ul className="space-y-1">
        {options.map((o, i) => (
          <li key={i} className="text-slate-300"><span className="text-cyan-300 font-bold">{o.label}:</span> {o.detail}</li>
        ))}
      </ul>
    </div>
  );
};

const CouncilBriefBody: React.FC<{ data: Record<string, unknown> }> = ({ data }) => {
  const sections = data.sections as { heading: string; body: string }[];
  return (
    <div className="space-y-2 text-[11px]">
      {sections.map((s, i) => (
        <div key={i}>
          <div className="font-bold text-cyan-300">{s.heading}</div>
          <div className="text-slate-300 whitespace-pre-wrap">{s.body}</div>
        </div>
      ))}
    </div>
  );
};

/**
 * Renders a validated ShardSpec by variant.
 * While generating, shows the skeleton with a visible "Synthesizing shard…"
 * label. When no shard exists, shows the honest empty state — never a
 * placeholder presented as a result.
 */
export const ShardRenderer: React.FC<ShardRendererProps> = ({ shard, isGenerating, variant, onShare, shareUrl }) => {
  if (isGenerating) {
    return (
      <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2">
        <div className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold mb-1">Synthesizing shard…</div>
        <ShardSkeleton variant={variant} />
      </div>
    );
  }

  if (!shard) {
    return (
      <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] text-slate-400">
        Shard unavailable — load a local model first.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-cyan-500/30 bg-black/30 p-3 space-y-2">
      <div className="text-[11px] font-bold text-cyan-200">{shard.title}</div>
      <div className="text-[11px] text-slate-400">{shard.summary}</div>
      {shard.variant === 'chart' && <ChartBody data={shard.data} />}
      {shard.variant === 'table' && <TableBody data={shard.data} />}
      {shard.variant === 'agent-decision' && <AgentDecisionBody data={shard.data} />}
      {shard.variant === 'council-brief' && <CouncilBriefBody data={shard.data} />}
      {shard.variant === 'text-block' && (
        <div className="text-[11px] text-slate-200 whitespace-pre-wrap">{shard.data.body as string}</div>
      )}
      <div className="pt-1 flex items-center gap-2">
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="text-[10px] font-bold text-cyan-900 bg-cyan-400 hover:bg-cyan-300 px-2 py-1 rounded"
          >
            Share shard
          </button>
        )}
        {shareUrl && (
          <span className="text-[10px] font-mono text-cyan-300 break-all">{shareUrl}</span>
        )}
      </div>
      <div className="text-[9px] text-slate-500">Generated locally · {new Date(shard.generatedAt).toLocaleTimeString()}</div>
    </div>
  );
};
