import React, { useEffect, useState } from 'react';
import { useLocalLLM } from '../../context/LocalLLMContext';
import { taskEngine } from '../../services/TaskEngine';
import { NVKTask } from '../../types';
import { Cpu, MemoryStick, Activity, CheckCircle2, CircleDashed, Terminal, HardDrive } from 'lucide-react';

export const SystemMonitorPanel: React.FC = () => {
  const { isModelLoaded, loadProgress, selectedModel, loadStatus, selectedProvider, isCloudMode } = useLocalLLM();
  const [tasks, setTasks] = useState<NVKTask[]>([]);
  
  useEffect(() => {
    // Poll tasks for now as a simple monitor refresh
    const interval = setInterval(() => {
      setTasks([...taskEngine.getAllTasks()].sort((a, b) => b.startTime - a.startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900/90 text-cyan-50 font-mono p-6 gap-6 overflow-y-auto custom-scrollbar-none">
      
      <div className="flex flex-col gap-2 border-b border-cyan-800/50 pb-4">
        <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-5 h-5" /> NVK System Monitor
        </h2>
        <p className="text-xs text-cyan-600/80">Local Core Telemetry & Task Execution Tracker</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* ML Engine Status */}
        <div className="bg-slate-950/50 border border-cyan-900/30 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-cyan-300 font-bold uppercase tracking-wider">
            <Cpu className="w-4 h-4" /> Intelligence Core
          </div>
          <div className="text-xs text-slate-400 space-y-2">
            <div className="flex justify-between"><span>Provider:</span> <span className="text-emerald-400">{selectedProvider.toUpperCase()}</span></div>
            <div className="flex justify-between"><span>Model:</span> <span className="text-cyan-400">{selectedModel || 'None'}</span></div>
            <div className="flex justify-between"><span>Status:</span> 
              <span className={isModelLoaded ? "text-emerald-400" : "text-amber-400"}>
                {isModelLoaded ? 'ONLINE' : (loadProgress > 0 ? \`LOADING (\${Math.round(loadProgress)}%)\` : 'OFFLINE')}
              </span>
            </div>
            <div className="flex justify-between"><span>Cloud Mode:</span> <span className={isCloudMode ? "text-amber-400" : "text-slate-500"}>{isCloudMode ? 'ACTIVE' : 'INACTIVE'}</span></div>
          </div>
        </div>

        {/* Runtime Environment */}
        <div className="bg-slate-950/50 border border-cyan-900/30 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-cyan-300 font-bold uppercase tracking-wider">
            <HardDrive className="w-4 h-4" /> Node Bridge
          </div>
          <div className="text-xs text-slate-400 space-y-2">
            <div className="flex justify-between"><span>Filesystem:</span> <span className="text-emerald-400">CONNECTED</span></div>
            <div className="flex justify-between"><span>Terminal:</span> <span className="text-emerald-400">CONNECTED</span></div>
            <div className="flex justify-between"><span>Proxy Fetch:</span> <span className="text-emerald-400">CONNECTED</span></div>
            <div className="flex justify-between"><span>Execution:</span> <span className="text-emerald-400">LOCAL</span></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1 mt-4">
        <h3 className="text-sm font-bold text-cyan-500 uppercase tracking-widest border-b border-cyan-900/50 pb-2">Active Tasks</h3>
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-xs text-slate-500 italic">No tasks executed in this session.</div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className="bg-slate-800/40 border border-cyan-900/40 rounded p-3 text-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div className="font-bold text-slate-200">{task.objective}</div>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                    task.status === 'FAILED' ? 'bg-rose-500/20 text-rose-400' :
                    task.status === 'RUNNING' ? 'bg-cyan-500/20 text-cyan-400 animate-pulse' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {task.status}
                  </div>
                </div>
                
                {task.currentAction && (
                  <div className="text-slate-400 flex items-center gap-1">
                    <CircleDashed className="w-3 h-3 animate-spin" /> {task.currentAction}
                  </div>
                )}
                
                {task.evidence && task.evidence.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-cyan-900/30">
                    <div className="text-[10px] text-emerald-500 uppercase font-bold mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Evidence Recorded
                    </div>
                    {task.evidence.map((ev, idx) => (
                      <div key={idx} className="text-[10px] text-slate-400 flex gap-2">
                        <span className="text-emerald-600">[{ev.type}]</span>
                        <span>{ev.reference || 'System event'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {task.error && (
                  <div className="mt-2 pt-2 border-t border-rose-900/30 text-rose-400">
                    <span className="font-bold">Error:</span> {task.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
    </div>
  );
};
