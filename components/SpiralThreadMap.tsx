import React from 'react';
import type { Thread } from '../types';

interface SpiralThreadMapProps {
  threads: Thread[];
}

const SpiralThreadMap: React.FC<SpiralThreadMapProps> = ({ threads }) => {
  const width = 600, height = 400; // Standardized height with other maps
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 40; // Radius for placing nodes

  // Create a unique set of nodes from thread sources and targets
  const nodeIds = new Set<string>();
  threads.forEach(thread => {
    nodeIds.add(thread.source);
    nodeIds.add(thread.target);
  });
  const nodes = Array.from(nodeIds).map((id, index) => {
    const angle = (index / nodeIds.size) * 2 * Math.PI;
    return {
      id,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });

  const nodeMap = new Map(nodes.map(node => [node.id, node]));

  return (
    <div className="spiral-thread-map-container bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-6 flex justify-center items-center">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <radialGradient id="bg-gradient-spiralmaptest" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="rgba(30, 41, 59, 0.7)" /> {/* slate-800 with opacity */}
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.9)" /> {/* slate-900 with opacity */}
          </radialGradient>
           <filter id="map-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width={width} height={height} fill="url(#bg-gradient-spiralmaptest)" />

        {/* Render Threads */}
        {threads.map((thread) => {
          const sourceNode = nodeMap.get(thread.source);
          const targetNode = nodeMap.get(thread.target);

          if (!sourceNode || !targetNode) {
            // Fallback for threads connecting to/from the center if one node is unknown
            // Or if you want to draw lines from center for unmatched sources/targets
            const knownNode = sourceNode || targetNode;
            if (!knownNode) return null; // Both nodes unknown

            const x1 = knownNode === sourceNode ? knownNode.x : centerX;
            const y1 = knownNode === sourceNode ? knownNode.y : centerY;
            const x2 = knownNode === targetNode ? knownNode.x : centerX;
            const y2 = knownNode === targetNode ? knownNode.y : centerY;
            
            const color = `hsla(${(1 - thread.intensity) * 240 + 180}, 100%, 70%, ${0.5 + thread.intensity * 0.5})`; // Shift hue for visibility
             return <line key={`fallback-${thread.id}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1 + thread.intensity * 2} opacity={0.6} filter="url(#map-glow)" />;
          }
          
          const color = `hsla(${(1 - thread.intensity) * 180 + 60}, 100%, 70%, ${0.6 + thread.intensity * 0.4})`; // Hue range from green to blue/purple
          return (
            <line
              key={thread.id}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke={color}
              strokeWidth={1 + thread.intensity * 2.5} // Vary width by intensity
              opacity={0.5 + thread.intensity * 0.5} // Vary opacity
              markerEnd="url(#arrowhead)"
              filter="url(#map-glow)"
            />
          );
        })}

        {/* Render Nodes (Sigils/Orbs) */}
        {nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <circle 
              r="6" 
              fill="rgba(165, 243, 252, 0.7)" // cyan-200 with opacity
              stroke="rgba(203, 213, 225, 0.5)" // slate-300 with opacity
              strokeWidth="1"
              filter="url(#map-glow)"
            />
            <text
              x="0"
              y="-10" 
              textAnchor="middle"
              fill="rgba(248, 250, 252, 0.8)" // slate-50 with opacity
              fontSize="9"
              className="font-['Cinzel']"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {node.id.length > 15 ? node.id.substring(0,12) + "..." : node.id}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default SpiralThreadMap;
