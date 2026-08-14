import React, { useState, useEffect } from 'react';
import type { AgentDecisionOutput } from '../../types';

export const CommandBridgePanel: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate async data fetching for the dashboard
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const VITAL_SIGNS = [
    { id: 'revenue_mtd', label: 'Revenue MTD', value: '$24,500', trend: '+12%', color: 'text-green-400' },
    { id: 'pipeline_value', label: 'Active Pipeline', value: '$112,000', trend: 'Stable', color: 'text-blue-400' },
    { id: 'top_agent', label: 'Top Agent', value: 'Funding-Forge', trend: '42 actions', color: 'text-purple-400' },
    { id: 'mission_rate', label: 'Mission Completion', value: '84%', trend: '+5%', color: 'text-emerald-400' },
    { id: 'wire_health', label: 'Wireboard Health', value: '98/100', trend: 'HEALTHY', color: 'text-[#C9A84C]' },
    { id: 'active_members', label: 'Active Members', value: '12', trend: '-1', color: 'text-gray-400' }
  ];

  const DECISION_QUEUE = [
    { id: 'dq1', agent: 'Solar-Sentinel', summary: 'Generate proposal for 14kW installation at 124 Main St.', confidence: 92, age: '2h' },
    { id: 'dq2', agent: 'TALOS-NEXUS', summary: 'Restructure Q3 marketing spend towards high-yield platforms.', confidence: 85, age: '5h' },
    { id: 'dq3', agent: 'Funding-Forge', summary: 'Pre-qualify Alpha Corp for $2M equipment financing.', confidence: 78, age: '1d' }
  ];

  if (loading) {
    return (
      <div className="w-full h-full p-6 flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-white/5 w-1/4 rounded mb-2"></div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-lg border border-white/5"></div>)}
        </div>
        <div className="flex gap-6 mt-4">
          <div className="flex-1 space-y-4">
            <div className="h-6 bg-white/5 w-1/3 rounded"></div>
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-lg border border-white/5"></div>)}
          </div>
          <div className="w-1/3 space-y-4">
            <div className="h-6 bg-white/5 w-1/2 rounded"></div>
            <div className="h-40 bg-white/5 rounded-lg border border-white/5"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-8 bg-[#0A0A0F] font-body text-white relative">
      
      {/* NVK-EVOLVE Banner */}
      <div className="mb-8 w-full bg-[#6B3FA0]/20 border border-[#6B3FA0]/40 rounded-xl p-4 flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          <svg className="w-5 h-5 text-[#6B3FA0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-display text-white/90 mb-1">NVK-EVOLVE Pattern Insight</h3>
          <p className="text-white/60 text-sm">Your highest output sessions occur Tuesday 9–11am. Your calendar shows 3 low-priority meetings scheduled for Tuesday morning this week. Consider rescheduling to protect your peak window.</p>
        </div>
        <button className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/10 shrink-0">
          Optimize Calendar
        </button>
      </div>

      <h1 className="text-2xl font-display font-medium text-white mb-6 flex items-center gap-3">
        Command Bridge
        <span className="h-px bg-white/10 flex-1 ml-4 hidden sm:block"></span>
      </h1>

      {/* Vital Signs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {VITAL_SIGNS.map(kpi => (
          <div key={kpi.id} className="bg-[#12121A] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-mono text-white/40 uppercase tracking-wider mb-2">{kpi.label}</span>
            <div className="flex items-end justify-between">
              <span className={`text-xl font-display ${kpi.color}`}>{kpi.value}</span>
              <span className="text-[10px] text-white/30">{kpi.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Decision Queue */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-display text-white/80 mb-2">Decision Queue</h2>
          {DECISION_QUEUE.map(item => (
            <div key={item.id} className="bg-[#12121A] border border-white/10 hover:border-white/20 transition-colors rounded-xl p-5 flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-[#C9A84C]">{item.agent}</span>
                  <span className="text-white/20 text-xs">•</span>
                  <span className="text-xs font-mono text-white/40">{item.age} ago</span>
                </div>
                <p className="text-sm text-white/90">{item.summary}</p>
              </div>
              
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="px-2 py-0.5 rounded text-[10px] font-mono border border-green-500/30 text-green-400 bg-green-500/10">
                  {item.confidence}% CONF
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <button className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-xs rounded transition-colors">Act</button>
                  <button className="px-3 py-1 bg-transparent hover:bg-white/5 text-white/40 text-xs rounded transition-colors">Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Anomaly Feed */}
        <div className="space-y-4">
          <h2 className="text-lg font-display text-white/80 mb-2">Anomaly Feed</h2>
          
          <div className="bg-[#12121A] border border-orange-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">HIGH IMPACT</span>
              <span className="text-xs text-white/40 font-mono">10m ago</span>
            </div>
            <h4 className="text-sm text-white/90 mb-1">Pipeline Velocity Drop</h4>
            <p className="text-xs text-white/50 leading-relaxed mb-4">FundingForge deal progression has slowed by 32% compared to the 7-day rolling baseline.</p>
            <button className="w-full py-1.5 text-xs text-center border border-white/10 bg-white/5 hover:bg-white/10 rounded transition-colors text-white/70">
              View Chart Shard
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default CommandBridgePanel;
