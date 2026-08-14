import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, Sparkles, Sliders, ToggleLeft, Activity, Layers, Link as LinkIcon, 
  Trash2, Plus, RefreshCw, Code, RefreshCcw, Play, CheckCircle2, Volume2, VolumeX,
  FileCode, PlayCircle, LogIn, ChevronRight, HelpCircle, HardDrive, Cpu, ExternalLink
} from 'lucide-react';
import { SentinelShard, ShardKind, ModelGatewayResponse, ModelGatewayCommand } from '../../types';
import { Orbit } from './Orbit';

interface HUDProps {
  onBackToMain?: () => void;
}

export const HUD: React.FC<HUDProps> = ({ onBackToMain }) => {
  // Shard State Orchestrator
  const [shards, setShards] = useState<SentinelShard[]>([
    {
      id: 'cpu-stream',
      name: 'NVK Core CPU Stream',
      kind: 'CHART',
      content: '92.4% execution load',
      orbitRadius: 4,
      angle: 0.2,
      speed: 1.5,
      color: '#00E5FF',
      createdAt: new Date().toISOString(),
      chartData: [
        { label: '08:00', value: 42 },
        { label: '09:00', value: 65 },
        { label: '10:00', value: 78 },
        { label: '11:00', value: 92 }
      ]
    },
    {
      id: 'sys-integrity',
      name: 'Kernel System Integrity Logs',
      kind: 'NOTE',
      content: '### Sentinel Kernel v4\n*   [STATUS] Active and synchronized.\n*   [MEMORY] 12.8 GB allocated.\n*   [AEGIS] Shielding enabled.\n*   [HITL] Authorized connection streams.',
      orbitRadius: 7,
      angle: 2.1,
      speed: 0.8,
      color: '#A855F7',
      createdAt: new Date().toISOString()
    },
    {
      id: 'matrix-compiler',
      name: 'Dynamic Fluid Matrix Visualizer',
      kind: 'APP',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-cyan-400 p-4 font-mono h-screen flex flex-col justify-center items-center">
  <div class="border border-cyan-500/30 p-6 rounded-xl bg-slate-900/60 backdrop-blur-md text-center max-w-sm">
    <h2 class="text-xs uppercase tracking-[0.2em] mb-3 text-cyan-300">Fluid Matrix Accelerator</h2>
    <div class="h-24 w-48 flex items-end justify-between gap-1 mb-4 overflow-hidden" id="viz-container"></div>
    <p class="text-[9px] text-cyan-400/60 uppercase">Realtime matrix synaptic feed active</p>
    <button onclick="scramble()" class="mt-4 px-3 py-1 bg-cyan-950 border border-cyan-400/50 hover:bg-cyan-900 text-[9px] uppercase tracking-wider rounded">Scramble Lattice</button>
  </div>
  <script>
    function render() {
      const container = document.getElementById('viz-container');
      container.innerHTML = '';
      for(let i=0; i<15; i++) {
        const bar = document.createElement('div');
        const height = Math.floor(Math.random() * 80) + 10;
        bar.className = 'w-2 bg-gradient-to-t from-cyan-600 to-indigo-400 transition-all duration-300';
        bar.style.height = height + '%';
        container.appendChild(bar);
      }
    }
    render();
    setInterval(render, 1500);
    function scramble() {
      render();
    }
  </script>
</body>
</html>`,
      orbitRadius: 10,
      angle: 4.5,
      speed: 0.5,
      color: '#F59E0B',
      createdAt: new Date().toISOString()
    }
  ]);

  const [connections, setConnections] = useState<Array<{ sourceId: string; targetId: string }>>([
    { sourceId: 'cpu-stream', targetId: 'sys-integrity' }
  ]);

  // View States
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [selectedShardId, setSelectedShardId] = useState<string | undefined>('cpu-stream');

  // Interactivity Inputs
  const [gatewayPrompt, setGatewayPrompt] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai' | 'claude' | 'local'>('gemini');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Gateway Log Logs
  const [gatewayLogs, setGatewayLogs] = useState<Array<{
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    provider?: string;
    model?: string;
  }>>([
    { timestamp: new Date().toLocaleTimeString(), message: "Sentinel Multi-Provider Model Gateway Online.", type: 'success' },
    { timestamp: new Date().toLocaleTimeString(), message: "SOP-09923 validation vector ready.", type: 'info' }
  ]);

  // App Kind States
  const [appSandboxMode, setAppSandboxMode] = useState<'run' | 'code'>('run');
  const [appSourceCode, setAppSourceCode] = useState<string>('');

  // Local Voice Synthesis Settings
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
        setVoices(availableVoices);
        if (availableVoices.length > 0) {
          const premium = availableVoices.find(v => v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Premium"));
          setSelectedVoiceName(premium ? premium.name : availableVoices[0].name);
        }
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const announceAction = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (selectedVoiceName) {
        const activeVoice = voices.find(v => v.name === selectedVoiceName);
        if (activeVoice) utterance.voice = activeVoice;
      }
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Local speak engine error:", err);
    }
  }, [voiceEnabled, selectedVoiceName, voices]);

  // Fluctuating real-time CPU data state stream & updates bound target reader shards (REACTIVE STATE FLOW)
  useEffect(() => {
    const streamInterval = setInterval(() => {
      // Simulate fluctuating metrics on CPU source
      const randValue = Math.floor(Math.random() * 45) + 50; // 50 - 95

      setShards((prevShards) => {
        return prevShards.map((shard) => {
          if (shard.id === 'cpu-stream') {
            const currentData = [...(shard.chartData || [])];
            const nextLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            currentData.push({ label: nextLabel, value: randValue });
            if (currentData.length > 8) currentData.shift();

            return {
              ...shard,
              content: `${randValue}% execution load`,
              chartData: currentData
            };
          }

          // Check if this shard is bound by reactive inputs from cpu-stream
          const boundConnection = connections.find(c => c.sourceId === 'cpu-stream' && c.targetId === shard.id);
          if (boundConnection) {
            // Ripple update! Cascade state values
            if (shard.kind === 'NOTE') {
              const cleanedContent = shard.content.split('\n*   [MONITOR]')[0];
              const logLine = `\n*   [MONITOR] Auto-cascading data stream: ${randValue}% load captured at ${new Date().toLocaleTimeString()}`;
              return {
                ...shard,
                content: cleanedContent + logLine
              };
            }
            if (shard.kind === 'CHART') {
              const currentData = [...(shard.chartData || [])];
              const nextLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              currentData.push({ label: nextLabel, value: randValue - 5 });
              if (currentData.length > 8) currentData.shift();
              return {
                ...shard,
                content: `Cascaded stream value: ${randValue}%`,
                chartData: currentData
              };
            }
          }

          return shard;
        });
      });
    }, 3000);

    return () => clearInterval(streamInterval);
  }, [connections]);

  const activeShard = useMemo(() => {
    return shards.find(s => s.id === selectedShardId);
  }, [shards, selectedShardId]);

  useEffect(() => {
    if (activeShard && activeShard.kind === 'APP') {
      setAppSourceCode(activeShard.content);
    }
  }, [selectedShardId, activeShard]);

  // Execute terminal directive model routing
  const handleQueryGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatewayPrompt.trim()) return;

    setIsProcessing(true);
    const directive = gatewayPrompt;
    setGatewayPrompt('');

    // Log input launch
    setGatewayLogs(prev => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), message: `SUBMITTING EXECUTIVE DIRECTIVE: "${directive}"`, type: 'info' }
    ]);

    try {
      const response = await fetch('/api/kernel/extrude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: directive })
      });

      if (!response.ok) {
        throw new Error("Model Gateway request failed");
      }

      const data: ModelGatewayResponse = await response.json();

      setGatewayLogs(prev => [
        ...prev,
        { 
          timestamp: new Date().toLocaleTimeString(), 
          message: `Gateway routed to [${data.provider.toUpperCase()} : ${data.model}]. Reasoning: ${data.reasoning}`, 
          type: 'success',
          provider: data.provider,
          model: data.model
        }
      ]);

      if (data.content) {
        setGatewayLogs(prev => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), message: `RESP: ${data.content}`, type: 'info' }
        ]);
        announceAction(data.content);
      }

      // Resolve Command Loop (AEGIS ORCHESTRATION & STATE ACTIONS)
      if (data.commands && data.commands.length > 0) {
        data.commands.forEach((cmd: ModelGatewayCommand) => {
          setGatewayLogs(prev => [
            ...prev,
            { timestamp: new Date().toLocaleTimeString(), message: `AEGIS EXEC [${cmd.type}] with payload ID: ${cmd.payload.id || 'all'}`, type: 'success' }
          ]);

          if (cmd.type === 'SPAWN') {
            const p = cmd.payload;
            const newShard: SentinelShard = {
              id: p.id || `shard-${Date.now()}`,
              name: p.name || 'Synthesized Shard Node',
              kind: p.kind || 'NOTE',
              content: p.content || 'Dynamic content stream',
              orbitRadius: p.orbitRadius || [4, 7, 10][Math.floor(Math.random() * 3)],
              angle: Math.random() * Math.PI * 2,
              speed: p.speed || 0.6,
              color: p.color || '#F59E0B',
              chartData: p.chartData,
              createdAt: new Date().toISOString()
            };

            setShards(prev => {
              // Ensure we don't have duplicates
              const filtered = prev.filter(s => s.id !== newShard.id);
              return [...filtered, newShard];
            });
            setSelectedShardId(newShard.id);
            announceAction(`Successfully spawned a new ${newShard.kind} shard: ${newShard.name}`);
          }

          if (cmd.type === 'REMOVE') {
            const targetId = cmd.payload.id;
            if (targetId) {
              setShards(prev => prev.filter(s => s.id !== targetId));
              setConnections(prev => prev.filter(c => c.sourceId !== targetId && c.targetId !== targetId));
              if (selectedShardId === targetId) setSelectedShardId(undefined);
              announceAction(`Successfully removed shard sequence.`);
            }
          }

          if (cmd.type === 'CONNECT') {
            const { sourceId, targetId } = cmd.payload;
            if (sourceId && targetId) {
              setConnections(prev => {
                const exists = prev.some(c => c.sourceId === sourceId && c.targetId === targetId);
                if (exists) return prev;
                return [...prev, { sourceId, targetId }];
              });
              announceAction(`Synaptic wire linkage initiated between node streams.`);
            }
          }

          if (cmd.type === 'REARRANGE') {
            // Randomly reshuffle radial orbit sizes
            setShards(prev => {
              return prev.map(s => {
                const newRadius = [4, 7, 10][Math.floor(Math.random() * 3)];
                return { ...s, orbitRadius: newRadius };
              });
            });
            announceAction(`Command accepted. Rearranging radial alignment orbits.`);
          }
        });
      }

    } catch (err: any) {
      console.error(err);
      setGatewayLogs(prev => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), message: `GATEWAY ERROR: ${err.message}`, type: 'error' }
      ]);
      announceAction("Secure gateway communication failure.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSpawn = (kind: ShardKind) => {
    const id = `manual-${Date.now()}`;
    const colors = {
      'NOTE': '#A855F7',
      'CODE': '#3B82F6',
      'CHART': '#10B981',
      'WEB': '#00E5FF',
      'APP': '#F59E0B'
    };

    const newShard: SentinelShard = {
      id,
      name: `Manual Sentinel ${kind}`,
      kind,
      content: kind === 'APP' ? `<!DOCTYPE html>
<html>
<body class="bg-indigo-950 text-white p-4 font-mono">
  <h3>Custom Manual App</h3>
  <p>Modify source using code editor</p>
</body>
</html>` : kind === 'CHART' ? 'Metric dataset' : 'Manual entry summary notes...',
      orbitRadius: kind === 'APP' ? 10 : kind === 'CHART' ? 7 : 4,
      angle: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 0.5,
      color: colors[kind],
      createdAt: new Date().toISOString(),
      chartData: kind === 'CHART' ? [
        { label: 'Q1', value: 30 },
        { label: 'Q2', value: 80 },
        { label: 'Q3', value: 45 },
        { label: 'Q4', value: 95 }
      ] : undefined
    };

    setShards(prev => [...prev, newShard]);
    setSelectedShardId(id);
    announceAction(`Spawned ${kind} shard widget.`);
  };

  const handleManualDelete = (id: string) => {
    setShards(prev => prev.filter(s => s.id !== id));
    setConnections(prev => prev.filter(c => c.sourceId !== id && c.targetId !== id));
    if (selectedShardId === id) setSelectedShardId(undefined);
    announceAction("Shard deleted.");
  };

  const handleDownloadAppFile = (shard: SentinelShard) => {
    if (shard.kind !== 'APP') return;
    const blob = new Blob([shard.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${shard.name.toLowerCase().replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    announceAction("Compiled HTML file exported successfully.");
  };

  const handleResetSandboxFrame = () => {
    if (activeShard && activeShard.kind === 'APP') {
      const src = activeShard.content;
      // Scramble content briefly to trigger iframe reload
      setShards(prev => prev.map(s => {
        if (s.id === activeShard.id) {
          return { ...s, content: src };
        }
        return s;
      }));
      announceAction("Sandbox application interface reloaded.");
    }
  };

  const setHtmlCodeUpdate = (updatedCode: string) => {
    setAppSourceCode(updatedCode);
    setShards(prev => prev.map(s => {
      if (s.id === selectedShardId) {
        return { ...s, content: updatedCode };
      }
      return s;
    }));
  };

  const handleCreateManualConnection = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const exists = connections.some(c => c.sourceId === sourceId && c.targetId === targetId);
    if (exists) return;
    setConnections(prev => [...prev, { sourceId, targetId }]);
    announceAction("Synaptic wiring connection mapped.");
  };

  return (
    <div className="absolute inset-0 z-45 bg-slate-950 text-slate-100 flex flex-col md:flex-row h-full overflow-hidden select-none font-sans p-4 md:p-6 gap-4 md:gap-6">
      
      {/* LEFT PANEL: Orbital Display & Controls */}
      <div className="flex-1 flex flex-col h-full gap-4 min-w-0">
        
        {/* Workspace Sub Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950/40 rounded-lg border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-mono uppercase tracking-[0.15em] font-semibold text-white">
                NVK OS // Sentinel Spatial Workspace
              </h1>
              <p className="text-[9px] font-mono tracking-wider text-slate-400 uppercase">
                Aegis state orchestrator • SOP-09923 compliance active
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Selectors */}
            <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg p-0.5">
              <button 
                onClick={() => setViewMode('3d')}
                className={`px-3 py-1 font-mono text-[9px] uppercase tracking-wider rounded-md duration-200 ${
                  viewMode === '3d' ? 'bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                WebGL 3D
              </button>
              <button 
                onClick={() => setViewMode('2d')}
                className={`px-3 py-1 font-mono text-[9px] uppercase tracking-wider rounded-md duration-200 ${
                  viewMode === '2d' ? 'bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Glass 2D
              </button>
            </div>

            {onBackToMain && (
              <button 
                onClick={onBackToMain}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 font-mono text-[9px] uppercase tracking-wider duration-150 cursor-pointer text-slate-300"
              >
                Close Deck
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Display Area */}
        <div className="flex-1 min-h-0 relative">
          {viewMode === '3d' ? (
            <Orbit 
              shards={shards}
              activeId={selectedShardId}
              onSelectShard={(id) => setSelectedShardId(id)}
              connections={connections}
            />
          ) : (
            /* 2D Glassmorphic Review Deck Layout (Requirement 3: "Dual-pane Review Deck") */
            <div className="w-full h-full bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/10 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
              
              {/* Left Column: Shard Directory */}
              <div className="border-r border-white/5 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                  <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Core Shard Node Index
                  </span>
                  <span className="font-mono text-[9px] text-slate-500 uppercase">
                    {shards.length} ACTIVE LATTICES
                  </span>
                </div>

                <div className="flex gap-1.5 flex-wrap mb-2">
                  <button onClick={() => handleManualSpawn('NOTE')} className="px-2 py-1 bg-purple-950/40 border border-purple-500/20 text-purple-300 font-mono text-[8px] uppercase tracking-wider rounded hover:bg-purple-900/40">+ Spawn Note</button>
                  <button onClick={() => handleManualSpawn('CHART')} className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 font-mono text-[8px] uppercase tracking-wider rounded hover:bg-emerald-900/40">+ Spawn Chart</button>
                  <button onClick={() => handleManualSpawn('APP')} className="px-2 py-1 bg-amber-950/40 border border-amber-500/20 text-amber-300 font-mono text-[8px] uppercase tracking-wider rounded hover:bg-amber-900/40">+ Spawn App</button>
                </div>

                {shards.map((s) => (
                  <div 
                    key={s.id}
                    onClick={() => setSelectedShardId(s.id)}
                    className={`p-3 rounded-lg border transition-all duration-300 cursor-pointer ${
                      selectedShardId === s.id 
                        ? 'border-cyan-500/40 bg-cyan-950/20 shadow-[0_0_12px_rgba(0,229,255,0.15)]' 
                        : 'border-white/5 bg-slate-950/40 hover:border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: s.color }} />
                        <span className="font-mono font-bold text-[10px]" style={{ color: s.color }}>{s.kind}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleManualDelete(s.id); }}
                        className="p-1 hover:text-rose-400 text-slate-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <h3 className="text-xs text-white font-medium mb-1 truncate">{s.name}</h3>
                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                      <span>ORBIT RADIUS: {s.orbitRadius}R</span>
                      <span>SPEED: {s.speed}hz</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Detailed Inspector Interface */}
              <div className="p-4 bg-slate-950/40 flex flex-col min-w-0 overflow-y-auto">
                {activeShard ? (
                  <div className="flex flex-col h-full gap-4">
                    <div className="border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded font-mono text-[8px]" style={{ backgroundColor: activeShard.color + '20', color: activeShard.color }}>
                          {activeShard.kind}
                        </span>
                        <span className="font-mono text-[8px] text-slate-500 uppercase">
                          CREATED: {new Date(activeShard.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white tracking-wide">{activeShard.name}</h4>
                    </div>

                    {/* Rendering different types depending on shard kind */}
                    <div className="flex-1 min-h-0">
                      {activeShard.kind === 'NOTE' && (
                        <div className="p-3 bg-slate-900 border border-white/5 rounded-lg h-full overflow-y-auto font-mono text-[10px] text-slate-300 leading-relaxed max-h-[300px] custom-scrollbar">
                          {activeShard.content.split('\n').map((line, idx) => (
                            <div key={idx} className="mb-1">
                              {line.startsWith('###') ? (
                                <h5 className="text-xs text-cyan-400 font-semibold mb-2 mt-1 uppercase tracking-wider">{line.replace('###', '').trim()}</h5>
                              ) : line.startsWith('*') ? (
                                <div className="flex items-start gap-1">
                                  <ChevronRight className="w-3 h-3 mt-0.5 text-cyan-500 shrink-0" />
                                  <span>{line.replace('*', '').trim()}</span>
                                </div>
                              ) : (
                                <p className="opacity-75">{line}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {activeShard.kind === 'CHART' && (
                        <div className="p-4 bg-slate-900 border border-white/5 rounded-lg h-full flex flex-col gap-3">
                          <span className="font-mono text-[9px] text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                            <Activity className="w-3 h-3 animate-pulse" /> Live Telemetry Series
                          </span>
                          
                          {/* Rich Graphical SVG Grid bars and columns */}
                          <div className="flex-1 flex items-end justify-between gap-1.5 bg-slate-950 p-4 rounded border border-white/5 h-36 min-h-[140px] overflow-hidden">
                            {(activeShard.chartData || []).map((pt, idx) => {
                              const barHeight = Math.min(100, Math.max(10, pt.value));
                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                  <div className="text-[7px] font-mono font-semibold text-slate-400 mb-1">{pt.value}%</div>
                                  <div 
                                    className="w-full bg-cyan-500/80 rounded-t-sm transition-all duration-300"
                                    style={{ 
                                      height: `${barHeight}%`, 
                                      backgroundColor: activeShard.color,
                                      boxShadow: `0 0 10px ${activeShard.color}30` 
                                    }} 
                                  />
                                  <div className="text-[7px] font-mono text-slate-500 uppercase tracking-tight text-center truncate w-full">{pt.label}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {activeShard.kind === 'APP' && (
                        <div className="bg-slate-900 border border-white/5 rounded-lg h-full flex flex-col overflow-hidden relative min-h-[250px]">
                          <div className="p-2 border-b border-white/5 bg-slate-950 flex items-center justify-between">
                            <span className="font-mono text-[9px] text-amber-400 uppercase tracking-widest font-semibold flex items-center gap-1">
                              <Terminal className="w-3.5 h-3.5" /> APP COMPILE SANDBOX
                            </span>
                            <div className="flex items-center bg-slate-900 rounded border border-white/10 p-0.5">
                              <button 
                                onClick={() => setAppSandboxMode('run')}
                                className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider rounded ${
                                  appSandboxMode === 'run' ? 'bg-amber-950 text-amber-300 font-bold' : 'text-slate-500'
                                }`}
                              >
                                Live View
                              </button>
                              <button 
                                onClick={() => setAppSandboxMode('code')}
                                className={`px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider rounded ${
                                  appSandboxMode === 'code' ? 'bg-amber-950 text-amber-300 font-bold' : 'text-slate-500'
                                }`}
                              >
                                Source View
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 relative overflow-hidden bg-slate-950">
                            {appSandboxMode === 'run' ? (
                              <iframe 
                                key={activeShard.content.length} // Force reload when content changes
                                sandbox="allow-scripts" 
                                srcDoc={activeShard.content}
                                className="w-full h-full border-0 absolute inset-0 bg-slate-950"
                              />
                            ) : (
                              <textarea
                                value={appSourceCode}
                                onChange={(e) => setHtmlCodeUpdate(e.target.value)}
                                className="w-full h-full absolute inset-0 bg-slate-950 p-4 font-mono text-[10px] text-cyan-300/95 outline-none resize-none overflow-y-auto custom-scrollbar"
                              />
                            )}
                          </div>

                          <div className="p-2 bg-slate-950 border-t border-white/5 flex justify-end gap-1.5">
                            <button 
                              onClick={handleResetSandboxFrame}
                              className="px-2 py-1 bg-white/5 border border-white/10 rounded font-mono text-[8px] uppercase tracking-wider text-slate-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Reset UI Frame
                            </button>
                            <button 
                              onClick={() => handleDownloadAppFile(activeShard)}
                              className="px-2 py-1 bg-amber-600 border border-amber-500 rounded font-mono text-[8px] uppercase tracking-wider text-slate-950 font-bold hover:bg-amber-500 flex items-center gap-1 cursor-pointer"
                            >
                              <FileCode className="w-2.5 h-2.5" /> Export HTML
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-white/5 pt-3">
                      <span className="font-mono text-[8px] text-slate-500 uppercase tracking-widest block mb-2">SYNAPTIC WIRE COORDINATES</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] text-slate-400 block mb-1 font-mono uppercase">MAP AS OUTPUT SOURCE</label>
                          <select 
                            onChange={(e) => handleCreateManualConnection(activeShard.id, e.target.value)}
                            defaultValue=""
                            className="w-full bg-slate-900 border border-white/10 rounded p-1 font-mono text-[9px] text-slate-300 outline-none"
                          >
                            <option value="" disabled>SELECT TARGET ROUTE...</option>
                            {shards.filter(s => s.id !== activeShard.id).map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.kind})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[8px] text-slate-400 block mb-1 font-mono uppercase">MAP AS INPUT TARGET</label>
                          <select 
                            onChange={(e) => handleCreateManualConnection(e.target.value, activeShard.id)}
                            defaultValue=""
                            className="w-full bg-slate-900 border border-white/10 rounded p-1 font-mono text-[9px] text-slate-300 outline-none"
                          >
                            <option value="" disabled>SELECT SOURCE FEED...</option>
                            {shards.filter(s => s.id !== activeShard.id).map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.kind})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <HelpCircle className="w-8 h-8 opacity-40 mb-3 animate-bounce" />
                    <p className="font-mono text-[10px] uppercase tracking-wider">Select a Shard node to load terminal inspect specs.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* INPUT: Executive Model Gateway directive input box */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-4 border border-white/5">
          <form onSubmit={handleQueryGateway} className="flex gap-2.5">
            <div className="flex-1 flex items-center bg-slate-950 border border-white/10 rounded-lg px-3 py-1 text-slate-300 font-mono text-[10px] relative">
              <span className="text-cyan-400 font-mono font-bold mr-2 select-none uppercase">DIRECTIVE //</span>
              <input 
                type="text"
                placeholder="E.g., Spawn note detailing matrix tasks, and link cpu to integrity log"
                value={gatewayPrompt}
                onChange={(e) => setGatewayPrompt(e.target.value)}
                disabled={isProcessing}
                className="flex-1 bg-transparent py-1.5 outline-none border-none text-slate-200 placeholder-slate-600 overflow-hidden font-mono text-[10.5px]"
              />
            </div>
            
            <button 
              type="submit"
              disabled={isProcessing}
              className={`px-5 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest duration-150 transition-all flex items-center gap-2 cursor-pointer ${
                isProcessing 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' 
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.25)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isProcessing ? 'ROUTE...' : 'ROUTE ACTION'}
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT PANEL: Gateway Routing Logs & Active Wireboard Settings */}
      <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 h-full">
        
        {/* Gateway Model Selector Box */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <h2 className="font-mono text-[10px] text-slate-300 uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-cyan-400" /> Gateway Override
          </h2>
          
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[8px] text-slate-400 font-mono uppercase block mb-1">Enforce Provider Stream</label>
              <select 
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as any)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-slate-300 outline-none cursor-pointer hover:border-cyan-500/30 transition-all"
              >
                <option value="gemini">BUILT-IN CLOUD GEMINI-3.5</option>
                <option value="openai">OPENAI flagship (GPT-4o)</option>
                <option value="claude">CLAUDE reasoning (Sonnet)</option>
                <option value="local">WEBGPU local (Llama-3.2)</option>
              </select>
            </div>

            <div className="border-t border-white/5 pt-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                  LOCAL VOICE NARRATIVE
                </span>
                <input 
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setVoiceEnabled(nextVal);
                    if (nextVal) announceAction("Sentinel Speech engine loaded.");
                  }}
                  className="w-3.5 h-3.5 rounded border-white/15 bg-slate-950 text-cyan-500 cursor-pointer outline-none"
                />
              </div>
            </div>

            {voiceEnabled && voices.length > 0 && (
              <div>
                <label className="text-[8px] text-slate-400 font-mono uppercase block mb-1">Synthesizer Vector</label>
                <select 
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded p-1 font-mono text-[9px] text-slate-300 outline-none"
                >
                  {voices.map((v, i) => (
                    <option key={i} value={v.name}>{v.name} ({v.lang})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Synaptic Connections Directory Grid */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-xl p-4 border border-white/10 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5">
            <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" /> Dynamic Synapse Board
            </span>
            <span className="font-mono text-[8px] text-slate-500 uppercase">
              {connections.length} WIRES
            </span>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 custom-scrollbar pr-0.5">
            {connections.length === 0 ? (
              <p className="text-[9px] text-slate-600 font-mono italic p-3 text-center uppercase">No active coordinate paths mapped.</p>
            ) : (
              connections.map((c, i) => {
                const src = shards.find(s => s.id === c.sourceId);
                const tgt = shards.find(s => s.id === c.targetId);
                return (
                  <div key={i} className="p-2 bg-slate-950/60 border border-white/5 rounded-lg flex items-center justify-between font-mono text-[9px]">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="truncate text-cyan-400 uppercase font-semibold text-[8.5px] max-w-[80px]" title={src?.name}>{src?.name || 'Unknown'}</div>
                      <span className="text-slate-600">→</span>
                      <div className="truncate text-amber-400 uppercase font-semibold text-[8.5px] max-w-[80px]" title={tgt?.name}>{tgt?.name || 'Unknown'}</div>
                    </div>
                    <button 
                      onClick={() => setConnections(prev => prev.filter((_, idx) => idx !== i))}
                      className="px-1.5 py-0.5 bg-rose-950/40 border border-rose-500/20 text-rose-300 hover:bg-rose-900/40 rounded text-[7.5px]"
                    >
                      UNLINK
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Model Gateway Command Execution Output logs */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-xl p-4 border border-white/10 h-64 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5">
            <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 animate-pulse" /> Gateway Routing logs
            </span>
            <button 
              onClick={() => setGatewayLogs([])}
              className="font-mono text-[8px] text-slate-500 hover:text-white uppercase"
            >
              Clear Log
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-2 font-mono text-[8px] custom-scrollbar">
            {gatewayLogs.map((log, i) => (
              <div 
                key={i} 
                className={`p-1.5 rounded-md border leading-relaxed ${
                  log.type === 'error' 
                    ? 'bg-rose-950/20 border-rose-500/20 text-rose-300' 
                    : log.type === 'success' 
                    ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' 
                    : log.type === 'warning' 
                    ? 'bg-amber-950/20 border-amber-500/20 text-amber-300' 
                    : 'bg-slate-950/40 border-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5 text-[7px] text-slate-500">
                  <span>{log.timestamp}</span>
                  {log.provider && (
                    <span className="px-1 bg-white/5 rounded border border-white/10 uppercase font-semibold text-cyan-300 scale-95">
                      {log.provider}
                    </span>
                  )}
                </div>
                <div className="break-all">{log.message}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
