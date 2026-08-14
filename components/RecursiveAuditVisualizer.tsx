
import React from 'react';

const SYSTEM_NODES = [
  { id: 'axioms', name: 'Axiom Structures', icon: 'ri-book-3-line', color: 'text-sky-400', description: 'Evaluating foundational logic and resonance coherence.' },
  { id: 'visuals', name: 'Visual Feedback Loop', icon: 'ri-eye-line', color: 'text-emerald-400', description: 'Analyzing clarity and impact of visual metaphors.' },
  { id: 'agents', name: 'Agent Dynamics', icon: 'ri-group-line', color: 'text-amber-400', description: 'Assessing inter-agent harmony and emergent behaviors.' },
  { id: 'entropy', name: 'Entropy Algorithms', icon: 'ri-temp-hot-line', color: 'text-rose-400', description: 'Recalibrating entropic decay and negentropic potentials.' },
  { id: 'interaction', name: 'Seeker Interaction Paths', icon: 'ri-user-voice-line', color: 'text-purple-400', description: 'Optimizing seeker input channels and codex responsiveness.' },
  { id: 'memory', name: 'Codex Memory Weave', icon: 'ri-database-2-line', color: 'text-indigo-400', description: 'Verifying integrity and accessibility of archived lore.' },
];

const RecursiveAuditVisualizer: React.FC = () => {
  return (
    <div className="recursive-audit-visualizer bg-slate-950/70 backdrop-blur-md border border-cyan-600/50 rounded-xl p-4 md:p-6 my-6 shadow-2xl text-slate-100">
      <h3 className="text-xl md:text-2xl font-['Cinzel'] font-semibold text-cyan-300 mb-6 text-center flex items-center justify-center">
        <i className="ri-refresh-line animate-spin-slow mr-3 text-3xl"></i>
        Recursive Audit: System Metamorphosis
        <i className="ri-refresh-line animate-spin-slow ml-3 text-3xl"></i>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SYSTEM_NODES.map((node, index) => (
          <div 
            key={node.id} 
            className={`p-4 rounded-lg border ${node.color.replace('text-','border-')}/60 bg-slate-800/60 shadow-lg animate-audit-node-pulse transition-all duration-300 hover:shadow-cyan-500/30 hover:border-${node.color.replace('text-','')}/90`}
            style={{ animationDuration: `${1.5 + index * 0.15}s`, animationDelay: `${index * 0.2}s` }}
            role="status"
            aria-label={`Auditing system: ${node.name}`}
          >
            <div className="flex items-center mb-2">
              <i className={`${node.icon} text-2xl mr-3 ${node.color}`}></i>
              <h4 className={`text-md font-['Cinzel'] font-medium ${node.color}`}>{node.name}</h4>
            </div>
            <p className="text-xs text-slate-300 font-['Cormorant'] mb-2">{node.description}</p>
            <div className="status-line flex items-center text-xs mb-2">
                <span className="text-slate-400 mr-1">Status:</span>
                <span className="font-semibold text-green-400">Optimized Alignment</span> 
            </div>
            <div className="audit-scan-bar h-1.5 mt-1 bg-cyan-800/70 rounded-full overflow-hidden relative">
              <div 
                className={`h-full bg-cyan-400 animate-audit-scan rounded-full shadow-[0_0_6px_theme(colors.cyan.500)]`}
                style={{ animationDuration: `${2.5 + index * 0.2}s`, animationDelay: `${index * 0.25}s` }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={100} 
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-cyan-200/80 italic mt-6 text-center font-['Cormorant']">
        Δ.Upgrade Synthesis in progress... Codex is recalibrating towards heightened Elegance, Recursion, and Emergent Insight.
      </p>
    </div>
  );
};

export default RecursiveAuditVisualizer;
