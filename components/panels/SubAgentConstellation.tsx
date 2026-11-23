import React from 'react';
import { Users } from 'lucide-react';
import type { SubAgent } from '../../types';

interface SubAgentConstellationProps {
  subAgents: SubAgent[];
}

/**
 * A5 (nav/UX fix spec, 2026-11-22): the old panel was static theater —
 * three hardcoded agents ("Parsing ERCOT power grids...", "Calculating
 * Net Present Value...", "Generating executive presentation slides...")
 * with fabricated token counts and a hardcoded ONLINE badge for every
 * agent, and it ignored the subAgents prop entirely.
 *
 * This version renders ONLY the real spawn records: agents the user
 * spawned from the Terminal in this session, with the task they were
 * given. It starts empty. The status shown is the spawn record, not a
 * live task-engine state — live agent states arrive with workspace
 * Phase 2, and the panel says so.
 */
export const SubAgentConstellation: React.FC<SubAgentConstellationProps> = ({ subAgents }) => {
  return (
    <div className="flex flex-col h-full w-full bg-slate-950/95 text-slate-100 font-mono border border-cyan-500/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.15)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-cyan-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              <span>Sub-Agent Fleet</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                {subAgents.length} SPAWNED
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Spawn records — not live executions</div>
          </div>
        </div>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
          {subAgents.length === 0 ? 'No sub-agents spawned yet' : `${subAgents.length} agent${subAgents.length === 1 ? '' : 's'} spawned this session`}
        </div>

        {subAgents.length === 0 ? (
          <div className="text-[11px] text-slate-400 leading-relaxed p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
            No sub-agents are running. Spawn one from the Terminal:{' '}
            <span className="text-cyan-300 font-mono">spawn [name] [color] [task...]</span>
            <div className="mt-2 text-[10px] text-slate-500">
              Live agent states arrive with workspace Phase 2 — what you see here is the spawn record, not a live execution.
            </div>
          </div>
        ) : (
          subAgents.map((agent) => (
            <div
              key={agent.id}
              className="p-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl flex flex-col gap-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center border"
                    style={{ backgroundColor: `${agent.color}15`, borderColor: `${agent.color}50`, color: agent.color }}
                  >
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{agent.name}</div>
                    <div className="text-[9px] text-slate-400">Spawned from Terminal</div>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                    agent.status === 'working'
                      ? 'text-amber-400 bg-amber-950/60 border-amber-500/30'
                      : agent.status === 'complete'
                        ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'
                        : 'text-slate-400 bg-slate-900 border-slate-700'
                  }`}
                >
                  {agent.status.toUpperCase()}
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 text-[10px] text-slate-300 font-sans leading-relaxed">
                <span className="text-cyan-400 font-mono font-semibold">Task: </span>
                {agent.task}
              </div>
            </div>
          ))
        )}

        <div className="text-[9px] font-mono text-slate-600 leading-relaxed pt-1">
          Live agent states arrive with workspace Phase 2 — spawned agents show the task they were given; their status is the spawn record, not a live task-engine state.
        </div>
      </div>
    </div>
  );
};
