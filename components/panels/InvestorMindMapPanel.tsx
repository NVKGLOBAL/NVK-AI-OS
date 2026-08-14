import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Network, Zap, Car, ShoppingCart, Cloud, BrainCircuit } from 'lucide-react';

interface NodeData {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  x: number;
  y: number;
  details: string[];
}

interface EdgeData {
  source: string;
  target: string;
}

const NODES: NodeData[] = [
  { id: 'core', label: 'NVK CORE', icon: <BrainCircuit size={32} />, color: '#00ffb3', x: 0, y: 0, details: ['Brain of the Ecosystem', 'AI Decision Engine', 'Living Interface'] },
  { id: 'hardware', label: 'Consumer Hardware', icon: <Cpu size={24} />, color: '#00ccff', x: -300, y: -150, details: ['NVK Horizon', 'NVK Time', 'NVK Vision'] },
  { id: 'energy', label: 'Energy Infrastructure', icon: <Zap size={24} />, color: '#ffcc00', x: -350, y: 150, details: ['Solar Integration', 'Battery Storage', 'Smart Grid'] },
  { id: 'mobility', label: 'Mobility', icon: <Car size={24} />, color: '#ff3366', x: -100, y: 300, details: ['EV Ecosystem', 'Micro-mobility', 'Autonomy'] },
  { id: 'commerce', label: 'Commerce Ecosystem', icon: <ShoppingCart size={24} />, color: '#aa00ff', x: 250, y: 200, details: ['Marketplace', 'Subscriptions', 'Enterprise'] },
  { id: 'cloud', label: 'Cloud & Media', icon: <Cloud size={24} />, color: '#3366ff', x: 300, y: -100, details: ['AI Compute', 'Personal Cloud', 'Creator Platform'] },
  { id: 'ai_layer', label: 'AI Intelligence', icon: <Network size={24} />, color: '#00ff66', x: 100, y: -250, details: ['Personal Jarvis', 'Agent Marketplace', 'Decision Engine'] },
];

const EDGES: EdgeData[] = [
  { source: 'core', target: 'hardware' },
  { source: 'core', target: 'energy' },
  { source: 'core', target: 'mobility' },
  { source: 'core', target: 'commerce' },
  { source: 'core', target: 'cloud' },
  { source: 'core', target: 'ai_layer' },
  { source: 'hardware', target: 'ai_layer' },
  { source: 'cloud', target: 'ai_layer' },
  { source: 'mobility', target: 'energy' }
];

export const InvestorMindMapPanel: React.FC = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="w-full h-full bg-[#0a0a0c] text-white flex flex-col relative overflow-hidden font-mono selection:bg-cyan-500/30">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 z-20 pointer-events-none flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,179,0.8)]">
            NVK GLOBAL
          </h1>
          <p className="text-slate-400 text-sm tracking-wider uppercase mt-1">
            Ecosystem Strategic Vision
          </p>
        </div>
        <div className="flex gap-4 items-center">
            <div className="text-xs text-cyan-500/70 border border-cyan-500/30 px-3 py-1 rounded-full bg-cyan-950/30 shadow-[0_0_15px_rgba(0,255,179,0.1)]">
                CONFIDENTIAL / INVESTOR DECK
            </div>
        </div>
      </div>

      {/* Mind Map Canvas */}
      <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
        <motion.div 
          className="w-full h-full flex items-center justify-center relative"
          drag
          dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
          style={{ scale: zoom }}
        >
          {/* Edges */}
          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            {EDGES.map((edge, i) => {
              const source = NODES.find(n => n.id === edge.source);
              const target = NODES.find(n => n.id === edge.target);
              if (!source || !target) return null;
              return (
                <motion.line 
                  key={i}
                  x1={source.x} y1={source.y}
                  x2={target.x} y2={target.y}
                  stroke="url(#gradient)"
                  strokeWidth="2"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.4 }}
                  transition={{ duration: 1.5, delay: i * 0.1 }}
                />
              );
            })}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00ffb3" stopOpacity="1" />
                <stop offset="100%" stopColor="#00ccff" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>

          {/* Nodes */}
          <div className="relative w-0 h-0">
            {NODES.map((node, i) => {
              const isActive = activeNode === node.id;
              const isDimmed = activeNode !== null && !isActive;

              return (
                <motion.div
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: isDimmed ? 0.3 : 1 }}
                  transition={{ type: 'spring', delay: i * 0.1 + 0.5, bounce: 0.4 }}
                  className="absolute pointer-events-auto"
                  style={{ 
                    left: node.x, 
                    top: node.y,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isActive ? 50 : 10
                  }}
                  onMouseEnter={() => setActiveNode(node.id)}
                  onMouseLeave={() => setActiveNode(null)}
                >
                  <div className={`
                    flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border transition-all duration-300
                    ${isActive ? 'bg-slate-900/90 border-cyan-400 scale-110 shadow-[0_0_30px_rgba(0,255,179,0.4)]' : 'bg-slate-900/60 border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800/80 hover:shadow-[0_0_15px_rgba(0,255,179,0.2)]'}
                    backdrop-blur-md cursor-pointer
                  `}
                  style={{ minWidth: '180px' }}
                  >
                    <div 
                      className="p-3 rounded-full flex items-center justify-center"
                      style={{ 
                        backgroundColor: `${node.color}15`,
                        color: node.color,
                        boxShadow: isActive ? `0 0 20px ${node.color}40` : 'none'
                      }}
                    >
                      {node.icon}
                    </div>
                    <span className="text-sm font-semibold tracking-wider text-center" style={{ color: isActive ? node.color : '#e2e8f0' }}>
                      {node.label}
                    </span>

                    <AnimatePresence>
                      {isActive && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="flex flex-col gap-1 w-full mt-2 border-t border-slate-700/50 pt-2 overflow-hidden"
                        >
                          {node.details.map((detail, idx) => (
                            <div key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                              <span className="text-cyan-500 mt-[2px] opacity-70">▸</span>
                              <span>{detail}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 right-6 z-20 flex gap-2">
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="w-10 h-10 bg-slate-800/80 border border-slate-700 rounded-lg hover:border-cyan-500/50 hover:text-cyan-400 transition-colors flex items-center justify-center backdrop-blur-md">
          -
        </button>
        <button onClick={() => setZoom(1)} className="px-4 h-10 bg-slate-800/80 border border-slate-700 rounded-lg hover:border-cyan-500/50 hover:text-cyan-400 transition-colors flex items-center justify-center backdrop-blur-md font-mono text-sm">
          RESET
        </button>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="w-10 h-10 bg-slate-800/80 border border-slate-700 rounded-lg hover:border-cyan-500/50 hover:text-cyan-400 transition-colors flex items-center justify-center backdrop-blur-md">
          +
        </button>
      </div>

      {/* Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
    </div>
  );
};
