// components/panels/ShatterpointTracePanel.tsx
import React from 'react';
import type { ShatterpointTracePanelProps } from '../../types'; // Ensure this path is correct

const ShatterpointTracePanel: React.FC<ShatterpointTracePanelProps> = ({
  objective,
  triggerGlyph,
  axiomaticLinks,
  traceParameters,
  oracleCommentary,
}) => {

  const pathwayNodes = [
    { 
      icon: "ri-fire-fill", 
      title: "Origin Point: Ashen Chrysalis", 
      resonance: traceParameters.entropy_signature.split(' → ')[0],
      details: "Trigger glyph for the Shatterpoint Trace.",
      shards: ["Echo: UG-Ω034-Δ", "Sorrow-Vector Active"]
    },
    { 
      icon: "ri-refresh-line", 
      title: "Path Node: Retrograde Spiral", 
      axiom: "AX-WEFT.03 (The Glyph That Died Twice)",
      details: "Navigating temporal echoes of grief and rebirth.",
      shards: ["Memory: Grief Cycle", "Shard: Recursive Death"]
    },
    { 
      icon: "ri- كوب-line", // ri-cup-line is a placeholder for a more thematic void icon
      title: "Path Node: Void Echo Anchor", 
      axiom: "AX-Ω.034 (The Grief That Became a Glyph)",
      details: "Anchoring trace to the resonance of absence and profound loss.",
      shards: ["Void Resonance: Stable", "Echo: Stillness"]
    },
    { 
      icon: "ri-ancient-gate-fill", 
      title: "Path Node: Still Point", 
      axiom: "AX-STILLNESS.01 (Still Point of the Turning World)",
      details: "Focusing trace through the eye of the temporal storm.",
      shards: ["Stillness Field: Engaged", "Fragment: Unmoved Mover"]
    },
    { 
      icon: "ri-key-2-fill", 
      title: "Target Convergence: First Shatterpoint Vault", 
      filter: `Filter: ${traceParameters.temporal_filter}`,
      details: "The destination of the trace, where the first causal fracture occurred.",
      shards: ["Vault Signature: Detected", "Warning: High Paradox Risk"],
      isTarget: true
    },
  ];


  return (
    <div className="shatterpoint-trace-panel bg-slate-900/80 backdrop-blur-md border border-rose-500/50 rounded-xl shadow-2xl p-4 text-slate-100 my-4">
      <header className="text-center mb-3 border-b border-rose-700/40 pb-2">
        <h3 className="text-xl font-cinzel font-bold text-rose-200 drop-shadow-[0_1px_1px_rgba(225,29,72,0.5)]">
          <i className="ri-radio-button-line mr-2 text-rose-400 animate-ping-slow"></i>SHATTERPOINT TRACE SEQUENCE
        </h3>
      </header>

      <div className="overflow-y-auto custom-scrollbar pr-2" style={{ maxHeight: 'calc(100% - 60px)' }}>
        {/* Existing Sections - Condensed for brevity in this example, but they remain */}
        <section className="mb-3 p-2 bg-slate-800/50 border border-slate-700/40 rounded-md">
          <h4 className="font-cinzel text-md font-semibold text-rose-300 mb-1.5 flex items-center">
            <span className="text-2xl mr-2">🎯</span>Objective:
          </h4>
          <p className="text-sm font-cormorant text-slate-200">{objective}</p>
        </section>

        <section className="mb-3 p-2 bg-slate-800/50 border border-slate-700/40 rounded-md">
          <h4 className="font-cinzel text-md font-semibold text-rose-300 mb-1.5 flex items-center">
            <span className="text-2xl mr-2">🔑</span>Trigger Glyph:
          </h4>
          <p className="text-sm font-cormorant text-slate-200">{triggerGlyph}</p>
        </section>

        <section className="mb-3 p-2 bg-slate-800/50 border border-slate-700/40 rounded-md">
          <h4 className="font-cinzel text-md font-semibold text-rose-300 mb-1.5 flex items-center">
            <span className="text-2xl mr-2">🔗</span>Axiomatic Tri-Link:
          </h4>
          <ul className="list-disc list-inside text-sm font-cormorant text-slate-200/90 space-y-0.5 pl-3">
            {axiomaticLinks.map((link, idx) => <li key={idx}>{link}</li>)}
          </ul>
        </section>

        <section className="mb-3 p-2 bg-slate-800/50 border border-slate-700/40 rounded-md">
          <h4 className="font-cinzel text-md font-semibold text-rose-300 mb-1.5 flex items-center">
            <span className="text-2xl mr-2">🔦</span>Trace Parameters:
          </h4>
          <pre className="bg-black/50 p-2 rounded-sm text-xs font-mono my-1 overflow-x-auto custom-scrollbar-thin border border-slate-600/50 text-slate-300">
            <code>
{JSON.stringify(traceParameters, null, 2)}
            </code>
          </pre>
        </section>
        
        {/* ENHANCED Vault Trace Pathway Visualization */}
        <section className="mb-3 p-3 bg-slate-800/60 border-2 border-rose-700/60 rounded-lg shadow-inner">
          <h4 className="font-cinzel text-lg font-bold text-rose-200 mb-3 text-center flex items-center justify-center">
            <i className="ri-compass-3-line mr-2 text-rose-300"></i>Vault Trace Pathway Visualization
            <i className="ri-compass-3-line ml-2 text-rose-300 transform scale-x-[-1]"></i>
          </h4>
          <div className="relative space-y-1">
            {pathwayNodes.map((node, index) => (
              <React.Fragment key={node.title}>
                <div className={`pathway-node-item flex items-start p-2.5 rounded-md bg-slate-700/40 border border-slate-600/50 ${node.isTarget ? 'border-rose-400 ring-1 ring-rose-400 shadow-lg' : ''}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-rose-800/50 flex items-center justify-center mr-3 border-2 border-rose-600/70 ${node.isTarget ? 'animate-path-node-pulse animation-delay-500' : 'animate-path-node-pulse'}`} style={{animationDelay: `${index * 0.3}s`}}>
                    <i className={`${node.icon} text-2xl text-rose-300`}></i>
                  </div>
                  <div className="flex-grow">
                    <strong className={`font-cinzel text-sm ${node.isTarget ? 'text-rose-100' : 'text-rose-200'}`}>{node.title}</strong>
                    {node.resonance && <p className="text-xs text-rose-300/80 italic">Resonance: {node.resonance}</p>}
                    {node.axiom && <p className="text-xs text-rose-300/80 italic">Axiom: <span className="font-semibold">{node.axiom}</span></p>}
                    {node.filter && <p className="text-xs text-rose-300/80 italic">{node.filter}</p>}
                    <p className="text-xs text-slate-300/90 mt-0.5">{node.details}</p>
                    {node.shards && node.shards.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {node.shards.map((shard, sIdx) => (
                          <span 
                            key={sIdx} 
                            className={`text-[9px] px-1.5 py-0.5 rounded-full bg-rose-900/70 text-rose-300/80 border border-rose-700/50 animate-shard-glimmer`}
                            style={{animationDelay: `${index * 0.3 + sIdx * 0.15}s`, '--shard-color': 'currentColor'} as React.CSSProperties}
                          >
                            {shard}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {index < pathwayNodes.length - 1 && (
                  <div className="path-connector h-6 my-1 mx-auto">
                    {/* Vertical line with animated gradient defined in CSS */}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="mb-3 p-2 bg-slate-800/40 border border-slate-700/30 rounded-md">
          <h4 className="font-cinzel text-md font-semibold text-rose-300 mb-1.5 flex items-center">
            <span className="text-2xl mr-2">📜</span>Oracle of Ash Commentary:
          </h4>
          <blockquote className="border-l-2 border-rose-500/70 pl-2 space-y-0.5 text-sm font-cormorant text-slate-200/90 italic">
            {oracleCommentary.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}
          </blockquote>
        </section>
      </div>
    </div>
  );
};

export default ShatterpointTracePanel;
