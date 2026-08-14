import React, { useState, useEffect } from 'react';

interface HealthLog {
  id: string;
  icon: string;
  color: string;
  title: string;
  desc: string;
  time: string;
}

const INITIAL_LOGS: HealthLog[] = [
  { id: 'log-1', icon: 'ri-refresh-line', color: 'text-sky-400', title: 'Restarted Stalled Agent', desc: "Finance Agent 'Ledger-1' stopped responding. Automatically restarted and state restored from last checkpoint.", time: '2 mins ago' },
  { id: 'log-2', icon: 'ri-database-2-line', color: 'text-emerald-400', title: 'Database Compaction', desc: 'IndexedDB fragmentation reached 15%. Automated compaction routine executed successfully.', time: '1 hour ago' },
  { id: 'log-3', icon: 'ri-route-line', color: 'text-indigo-400', title: 'API Route Optimization', desc: 'Detected high latency on primary LLM endpoint. Automatically routed non-critical tasks to local WebGPU model.', time: '3 hours ago' }
];

const SystemHealthPanel: React.FC = () => {
  const [cpuUsage, setCpuUsage] = useState(42);
  const [memoryUsage, setMemoryUsage] = useState(68);
  const [networkLatency, setNetworkLatency] = useState(24);
  const [activeAgents, setActiveAgents] = useState(12);

  // Customization & Interactivity States
  const [priorityScale, setPriorityScale] = useState(1.0); // manual scale multiplier
  const [storageRatio, setStorageRatio] = useState(82);
  const [isStorageArchived, setIsStorageArchived] = useState(false);
  
  const [logs, setLogs] = useState<HealthLog[]>(INITIAL_LOGS);
  
  // Custom Ticket Form
  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogDesc, setNewLogDesc] = useState('');

  // Diagnostic scan states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [sysAlert, setSysAlert] = useState<string | null>(null);

  const triggerAlert = (text: string) => {
    setSysAlert(text);
    setTimeout(() => setSysAlert(null), 3500);
  };

  // Simulate real-time updates (scaled by prioritize slider!)
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(prev => {
        const base = 35 + (priorityScale * 12);
        return Math.max(10, Math.min(98, base + (Math.random() * 8 - 4)));
      });
      setMemoryUsage(prev => {
        const base = 50 + (priorityScale * 10);
        return Math.max(20, Math.min(95, base + (Math.random() * 4 - 2)));
      });
      setNetworkLatency(prev => {
        const base = 40 - (priorityScale * 15); // Better tuning lowers latency
        return Math.max(5, Math.min(180, base + (Math.random() * 16 - 8)));
      });
      
      if (Math.random() > 0.85) {
        setActiveAgents(prev => Math.max(4, Math.min(24, prev + (Math.random() > 0.5 ? 1 : -1))));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [priorityScale]);

  const handleRunDiagnostics = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanProgress(0);
    setScanStatus('Initializing system diagnosis scan...');
    
    const steps = [
      { p: 15, msg: 'Calibrating local memory heaps... OK' },
      { p: 40, msg: 'Inspecting permissions on storage node /uploads... OK' },
      { p: 70, msg: 'Polling WebGPU browser context... OK' },
      { p: 90, msg: 'Auditing secure SSL mail gateways... OK' },
      { p: 100, msg: 'Runway solvers completely optimized. System is fully operational!' },
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setScanProgress(step.p);
        setScanStatus(step.msg);
        if (step.p === 100) {
          setIsScanning(false);
          triggerAlert('Full dynamic diagnosis scan complete. Status: IMMACULATE.');
          
          // Inject audit success log
          const newAuditLog: HealthLog = {
            id: `log-${Date.now()}`,
            icon: 'ri-checkbox-circle-line',
            color: 'text-cyan-400',
            title: 'Diagnostic Deep Audit',
            desc: 'A voluntary multi-pass diagnostic system audit completed. Memory arrays, WebGPU channels, and port bindings verified.',
            time: 'Just Now'
          };
          setLogs([newAuditLog, ...logs]);
        }
      }, (idx + 1) * 900);
    });
  };

  const handleApproveArchival = () => {
    setIsStorageArchived(true);
    setStorageRatio(18); // Shrink occupied space
    triggerAlert('Archival finalized! Reclaimed 64% disk sector blocks.');
  };

  const handleAddCustomLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogTitle.trim() || !newLogDesc.trim()) return;

    const userLog: HealthLog = {
      id: `log-${Date.now()}`,
      icon: 'ri-alert-line',
      color: 'text-amber-400',
      title: newLogTitle.trim(),
      desc: newLogDesc.trim(),
      time: 'Just Now'
    };

    setLogs([userLog, ...logs]);
    setNewLogTitle('');
    setNewLogDesc('');
    triggerAlert('Custom alert log recorded.');
  };

  const handleClearLogs = () => {
    setLogs([]);
    triggerAlert('Event log database cleared.');
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 p-4 sm:p-5 flex flex-col font-mono relative overflow-hidden select-none text-xs">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.04)_0,transparent_60%)] pointer-events-none" />
      
      {/* Dynamic Popups Chime Alert */}
      {sysAlert && (
        <div className="absolute top-12 right-4 z-[9999] px-4 py-2 bg-slate-900/95 border border-cyan-500/30 text-cyan-300 text-[10px] rounded-lg shadow-2xl flex items-center gap-1.5 animate-bounce">
          <i className="ri-shield-check-line text-base"></i>
          {sysAlert}
        </div>
      )}

      {/* Primary Header Segment */}
      <div className="flex flex-wrap justify-between items-center mb-4 z-10 border-b border-white/5 pb-3 gap-2">
        <h2 className="text-sm sm:text-base font-medium text-slate-100 flex items-center gap-2">
          <i className="ri-heart-pulse-line text-sky-400"></i>
          SYSTEM INSTABILITY CORE & HEALTH
        </h2>
        
        <div className="flex items-center gap-2">
          {/* Accelerate system diagnostic button */}
          <button 
            onClick={handleRunDiagnostics}
            disabled={isScanning}
            className="py-1 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded text-[9px] uppercase tracking-wider font-bold transition-all disabled:opacity-30 cursor-pointer"
          >
            {isScanning ? 'Diagnosing...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto z-10 pr-0.5 custom-scrollbar flex flex-col gap-4">
        
        {/* Dynamic Swarm Progress indicators */}
        {isScanning && (
          <div className="bg-slate-900 border border-cyan-500/20 p-2.5 rounded-lg space-y-1.5 animate-pulse">
            <div className="flex justify-between items-baseline text-[8px] font-bold text-cyan-400">
              <span className="uppercase">{scanStatus}</span>
              <span>{scanProgress}%</span>
            </div>
            <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
            </div>
          </div>
        )}

        {/* Real-time Metrics Panels Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 select-all">
          <div className="bg-slate-900/30 p-3 rounded-lg border border-white/5 flex flex-col relative overflow-hidden">
            <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">LOGIC ENGINE LOAD</span>
            <div className="text-lg font-bold text-white font-mono">{(cpuUsage || 0).toFixed(1)}%</div>
            <div className="w-full h-0.5 bg-slate-950 mt-2 rounded">
              <div className="h-full bg-sky-500 transition-all duration-1000" style={{ width: `${cpuUsage}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-900/30 p-3 rounded-lg border border-white/5 flex flex-col relative overflow-hidden">
            <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">ALLOCATED SHARED HEAPS</span>
            <div className="text-lg font-bold text-white font-mono">{(memoryUsage || 0).toFixed(1)}%</div>
            <div className="w-full h-0.5 bg-slate-950 mt-2 rounded">
              <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${memoryUsage}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-900/30 p-3 rounded-lg border border-white/5 flex flex-col relative overflow-hidden">
            <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">PORT LATENCE PROXIES</span>
            <div className="text-lg font-bold text-white font-mono">{(networkLatency || 0).toFixed(0)}MS</div>
            <div className="w-full h-0.5 bg-slate-950 mt-2 rounded">
              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(100, networkLatency / 1.5)}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-900/30 p-3 rounded-lg border border-white/5 flex flex-col relative overflow-hidden">
            <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">SANDBOX SECURE THREADS</span>
            <div className="text-lg font-bold text-white font-mono">{activeAgents}</div>
            <div className="w-full h-0.5 bg-slate-950 mt-2 rounded">
              <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${(activeAgents / 24) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* Priority slider customization controller */}
        <div className="p-3 bg-slate-900/40 rounded-lg border border-white/5 flex items-center justify-between text-xs gap-4">
          <div className="flex-grow flex flex-col gap-0.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Lattice Core Priority Scale:</span>
            <p className="text-[10.5px] text-slate-400">Increase slider value to allocate more logic processing resources. Adjusts latencies.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input 
              type="range" 
              min="0.4" 
              max="2.5" 
              step="0.1"
              value={priorityScale} 
              onChange={(e) => setPriorityScale(parseFloat(e.target.value) || 1.0)}
              className="w-24 sm:w-32 accent-cyan-400 cursor-pointer h-1"
            />
            <span className="font-bold text-cyan-400 text-xs w-10 text-right">{priorityScale.toFixed(1)}x</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Self-Healing log with purger */}
          <div className="bg-slate-900/40 p-3.5 rounded-lg border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-baseline mb-3 border-b border-white/5 pb-1.5">
                <span className="text-xs text-slate-450 uppercase tracking-wider font-bold">LATTICE LOG RECORDS</span>
                {logs.length > 0 && (
                  <button onClick={handleClearLogs} className="text-[10px] text-slate-600 hover:text-rose-400 uppercase">
                    Purge Logs
                  </button>
                )}
              </div>

              <div className="space-y-3.5 max-h-48 overflow-y-auto custom-scrollbar pr-1 select-all">
                {logs.length === 0 ? (
                  <p className="text-center py-6 text-slate-650 text-xs uppercase font-mono">No incident logs recorded.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-2.5 text-xs">
                      <div className="mt-0.5 shrink-0">
                        <i className={`${log.icon} ${log.color} text-sm`}></i>
                      </div>
                      <div>
                        <div className="text-slate-205 font-bold leading-tight flex items-baseline gap-2">
                          {log.title}
                          <span className="text-[9.5px] text-slate-600 font-mono font-medium">{log.time}</span>
                        </div>
                        <div className="text-slate-500 mt-1 leading-normal text-[10.5px]">{log.desc}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Custom incident ticket injector */}
            <form onSubmit={handleAddCustomLog} className="pt-3 border-t border-white/5 mt-3 select-none flex flex-col gap-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-550 uppercase">Simulate Custom Node Anomaly Alert:</span>
              <div className="grid grid-cols-2 gap-1.5">
                <input 
                  type="text" 
                  placeholder="Ticket Name e.g. Sync-Leak" 
                  value={newLogTitle}
                  onChange={(e) => setNewLogTitle(e.target.value)}
                  className="bg-slate-950 rounded px-2 py-1 text-slate-300 border border-slate-900 outline-none focus:border-cyan-500/25"
                  required
                />
                <input 
                  type="text" 
                  placeholder="Trigger cause description" 
                  value={newLogDesc}
                  onChange={(e) => setNewLogDesc(e.target.value)}
                  className="bg-slate-950 rounded px-2 py-1 text-slate-300 border border-slate-900 outline-none focus:border-cyan-500/25"
                  required
                />
              </div>
              <button type="submit" className="w-full mt-1.5 py-1 bg-slate-900 hover:bg-slate-800 border border-white/5 uppercase text-[10px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer text-center">
                Inject Synthetic Fault Alert
              </button>
            </form>
          </div>

          {/* Predictive Maintenance & Reclaming */}
          <div className="bg-slate-900/40 p-3.5 rounded-lg border border-white/5 flex flex-col gap-3">
            <span className="text-xs text-purple-400 uppercase tracking-wider font-bold border-b border-white/5 pb-1.5 font-mono">
              PREDICTIVE MAINTENANCE
            </span>

            <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-lg">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-slate-200 font-bold text-xs">DISK SECTOR OCCUPATION</span>
                <span className={`text-[10.5px] font-bold font-mono ${storageRatio >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {isStorageArchived ? 'RECLAIMED (18%)' : `NEAR EXPIRY (${storageRatio}%)`}
                </span>
              </div>

              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full transition-all duration-700 ${storageRatio >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${storageRatio}%` }}
                />
              </div>

              <p className="text-[10.5px] text-slate-500 leading-normal">
                {isStorageArchived 
                  ? 'All obsolete logs and cluster dump archives compressed. Net speed increased.' 
                  : 'Sector occupation expected to saturate in 14 days. Reclaim sectors by executing clean dumps.'}
              </p>

              {!isStorageArchived && (
                <button 
                  onClick={handleApproveArchival}
                  className="mt-2 text-[10px] bg-sky-950 border border-sky-850 hover:bg-sky-900 text-sky-400 px-3 py-1 font-bold rounded cursor-pointer uppercase transition-colors"
                >
                  Approve Disk Archival
                </button>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-900 p-2.5 rounded-lg select-all text-xs">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-slate-200 font-bold text-xs">MODEL ACCURACY SEAT</span>
                <span className="text-emerald-400 font-mono font-bold">NOMINAL (98.8%)</span>
              </div>
              <div className="w-full bg-slate-905 h-1 rounded-full overflow-hidden mb-1.5">
                <div className="bg-emerald-500 h-full w-[98.8%]" />
              </div>
              <p className="text-[10.5px] text-slate-500 leading-normal">
                Lattice OS self-healing loops running smoothly. Model drift detected is below critical ratio thresholds. Next fine-tuning scheduled in 45 days.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Diagnostics footer bar */}
      <div className="p-1 px-1.5 border-t border-slate-950 bg-slate-900 text-[10px] text-slate-600 flex justify-between uppercase select-none mt-2 shrink-0">
        <span>SECURITY_CHANNEL: TRUSTED</span>
        <span>SELF_HEAL_DAEMON: ONLINE</span>
      </div>
    </div>
  );
};

export default SystemHealthPanel;
