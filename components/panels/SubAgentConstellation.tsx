import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Sparkles, Activity, ShieldCheck, Play, Pause, RefreshCcw, 
  Send, Database, Search, Palette, Cpu, CheckCircle2 
} from 'lucide-react';

interface AgentNode {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'syncing' | 'idle';
  activity: string;
  tokensProcessed: number;
  icon: any;
  color: string;
}

export const SubAgentConstellation: React.FC = () => {
  const [agents, setAgents] = useState<AgentNode[]>([
    {
      id: 'ag-research',
      name: 'Agent[RESEARCH]',
      role: 'Autonomous Web & Document Indexer',
      status: 'active',
      activity: 'Parsing ERCOT power grids and commercial rooftop solar datasets...',
      tokensProcessed: 14200,
      icon: Search,
      color: '#00E5FF'
    },
    {
      id: 'ag-data',
      name: 'Agent[DATA]',
      role: 'Mathematical Synthesizer & Financial Modeler',
      status: 'active',
      activity: 'Calculating Net Present Value (NPV) & 30% ITC amortizations...',
      tokensProcessed: 28450,
      icon: Database,
      color: '#A855F7'
    },
    {
      id: 'ag-creative',
      name: 'Agent[CREATIVE]',
      role: '3D Spatial Narrative & Artifact Architect',
      status: 'active',
      activity: 'Generating executive presentation slides & spatial nodes...',
      tokensProcessed: 9810,
      icon: Palette,
      color: '#F59E0B'
    }
  ]);

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
              <span>Autonomous Sub-Agent Fleet</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                ORBITING NVK CORE
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Distributed Multi-Node Telemetry</div>
          </div>
        </div>
      </div>

      {/* Main Agent Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
          Active Specialized Agents (3 Nodes Connected)
        </div>

        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <div 
              key={agent.id}
              className="p-3 bg-slate-900/50 border border-cyan-500/20 rounded-xl hover:border-cyan-500/40 transition-all flex flex-col gap-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center border"
                    style={{ backgroundColor: `${agent.color}15`, borderColor: `${agent.color}50`, color: agent.color }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{agent.name}</div>
                    <div className="text-[9px] text-slate-400">{agent.role}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 text-[10px] text-slate-300 font-sans leading-relaxed">
                <span className="text-cyan-400 font-mono font-semibold">Activity: </span>
                {agent.activity}
              </div>

              <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-850">
                <span>Neural Stream: <strong className="text-slate-300">{agent.tokensProcessed.toLocaleString()} tokens</strong></span>
                <span className="text-cyan-400">Sync with NVK Orb: 100%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
