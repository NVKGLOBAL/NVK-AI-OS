import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  GitMerge, CheckCircle2, Circle, Clock, Play, Pause, RefreshCw, 
  ChevronRight, Sparkles, AlertCircle, ArrowUpRight, BarChart3, Database, Shield 
} from 'lucide-react';
import { NVKWorkflow } from '../../types';

interface WorkflowWorkspaceProps {
  workflow?: NVKWorkflow;
  onUpdateWorkflow?: (wf: NVKWorkflow) => void;
}

export const WorkflowWorkspace: React.FC<WorkflowWorkspaceProps> = ({
  workflow: initialWorkflow,
  onUpdateWorkflow
}) => {
  const [workflow, setWorkflow] = useState<NVKWorkflow>(() => {
    if (initialWorkflow) return initialWorkflow;
    return {
      id: `wf-default`,
      title: 'Commercial Solar Opportunity Radar — Texas (ERCOT)',
      status: 'running',
      progress: 60,
      currentAction: 'Ranking high-yield commercial rooftop sites (>750 kW)...',
      nextAction: 'Synthesize outreach targets & utility interconnect ratings',
      tasks: [
        { id: 't1', title: 'Identify Target Texas Logistics & Industrial Hubs', status: 'completed', detail: 'DFW Logistics Corridor & West Texas Energy Parks mapped' },
        { id: 't2', title: 'Evaluate Local Utility Tariffs & ERCOT Peak Tariffs', status: 'completed', detail: 'Oncor, CenterPoint, and AEP Texas rate structures parsed' },
        { id: 't3', title: 'Analyze Rooftop/Land Solar Yield (>750 kW installations)', status: 'active', detail: 'Estimated 2.1 MWp aggregate capacity identified' },
        { id: 't4', title: 'Rank High-ROI Commercial Opportunities (PPA vs Capex)', status: 'pending', detail: 'Targeting 3.8-year payback horizon' },
        { id: 't5', title: 'Synthesize Executive Siting & Opportunity Report', status: 'pending', detail: 'Generating exportable dataset and brief' }
      ],
      outputArtifact: {
        type: 'solar_targets',
        title: 'Texas Commercial Solar Target Matrix (ERCOT)',
        data: {
          region: 'Texas, USA',
          topHubs: [
            { name: 'Alliance DFW Logistics Hub', capacity: '1.8 MWp', estimatedRoi: '24.2%', paybackYears: 3.4, utility: 'Oncor' },
            { name: 'San Antonio South Industrial Park', capacity: '950 kWp', estimatedRoi: '21.5%', paybackYears: 4.1, utility: 'CPS Energy' },
            { name: 'Houston Ship Channel Distribution Terminal', capacity: '2.4 MWp', estimatedRoi: '26.8%', paybackYears: 3.2, utility: 'CenterPoint' }
          ],
          incentives: ['30% Federal ITC (Section 48)', 'Texas Property Tax Abatement (Ch. 312)', 'MACRS Accelerated Depreciation']
        }
      }
    };
  });

  const toggleTaskStatus = (taskId: string) => {
    setWorkflow(prev => {
      const updatedTasks = prev.tasks.map(t => {
        if (t.id === taskId) {
          const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
          return { ...t, status: nextStatus as any };
        }
        return t;
      });
      const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
      const progress = Math.round((completedCount / updatedTasks.length) * 100);
      const updated = { ...prev, tasks: updatedTasks, progress };
      onUpdateWorkflow?.(updated);
      return updated;
    });
  };

  const handleTogglePlayPause = () => {
    setWorkflow(prev => {
      const nextStatus = prev.status === 'running' ? 'paused' : 'running';
      const updated = { ...prev, status: nextStatus as any };
      onUpdateWorkflow?.(updated);
      return updated;
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/95 text-slate-100 font-mono border border-cyan-500/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.15)]">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-cyan-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
            <GitMerge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              <span>{workflow.title}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                workflow.status === 'running' ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 animate-pulse' : 'bg-amber-950/60 border border-amber-500/40 text-amber-400'
              }`}>
                {workflow.status.toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">NVK Persistent Task Orchestration</div>
          </div>
        </div>

        <button
          onClick={handleTogglePlayPause}
          className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-200 text-[10px] uppercase flex items-center gap-1.5 transition-all"
        >
          {workflow.status === 'running' ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
          {workflow.status === 'running' ? 'Pause' : 'Resume'}
        </button>
      </div>

      {/* Progress Metric Header */}
      <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" /> Live Workflow Completion
          </span>
          <span className="text-cyan-400 font-bold">{workflow.progress}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <motion.div 
            className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${workflow.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
          <div className="truncate max-w-[70%]">
            <span className="text-slate-500 uppercase">Current:</span> <span className="text-cyan-300">{workflow.currentAction}</span>
          </div>
          <div className="text-slate-500">
            {workflow.tasks.filter(t => t.status === 'completed').length} / {workflow.tasks.length} Completed
          </div>
        </div>
      </div>

      {/* Main Task Checklist */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
          Execution Pipeline Stages
        </div>
        {workflow.tasks.map((task, idx) => (
          <div
            key={task.id}
            onClick={() => toggleTaskStatus(task.id)}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
              task.status === 'completed'
                ? 'bg-slate-900/30 border-emerald-500/20 text-slate-300'
                : task.status === 'active'
                ? 'bg-cyan-950/30 border-cyan-500/50 text-cyan-100 shadow-[0_0_15px_rgba(0,229,255,0.1)]'
                : 'bg-slate-900/40 border-slate-800 text-slate-400'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {task.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : task.status === 'active' ? (
                <div className="w-4 h-4 rounded-full border-2 border-cyan-400 flex items-center justify-center animate-spin">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </div>
              ) : (
                <Circle className="w-4 h-4 text-slate-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium flex items-center justify-between">
                <span className={task.status === 'completed' ? 'line-through text-slate-400' : ''}>
                  {idx + 1}. {task.title}
                </span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                  {task.status}
                </span>
              </div>
              {task.detail && (
                <p className="text-[10px] text-slate-400 mt-1 font-sans">{task.detail}</p>
              )}
            </div>
          </div>
        ))}

        {/* Live Output Artifact Box */}
        {workflow.outputArtifact && (
          <div className="mt-4 p-3 bg-slate-900/80 border border-cyan-500/30 rounded-xl">
            <div className="flex items-center justify-between text-xs text-cyan-300 font-bold uppercase mb-2">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" /> {workflow.outputArtifact.title}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                LIVE DATASET
              </span>
            </div>

            {workflow.outputArtifact.type === 'solar_targets' && (
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {workflow.outputArtifact.data.topHubs.map((hub: any, i: number) => (
                    <div key={i} className="bg-slate-950/90 border border-cyan-500/20 rounded-lg p-2 text-[10px]">
                      <div className="font-semibold text-slate-200 truncate">{hub.name}</div>
                      <div className="text-cyan-400 font-bold mt-1">Cap: {hub.capacity}</div>
                      <div className="text-emerald-400 font-mono">Est ROI: {hub.estimatedRoi}</div>
                      <div className="text-slate-500 text-[9px]">Utility: {hub.utility}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
