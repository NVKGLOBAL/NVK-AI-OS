
import React, { useMemo } from "react";
import type { EchoRelation, EchoSpeechProps } from '../../types'; // Assuming EchoRelation uses EchoSpeechNode IDs
import { ARC_TYPE_COLORS } from "../../constants";

interface EchoArcProps {
  relations: EchoRelation[]; 
  echoes: EchoSpeechProps[]; // Full EchoSpeechProps objects for positions
}

const EchoThreadArcs: React.FC<EchoArcProps> = ({ relations, echoes }) => {
  const arcs = useMemo(() => {
    return relations.map(rel => {
      const sourceEcho = echoes.find(e => e.id === rel.sourceId);
      const targetEcho = echoes.find(e => e.id === rel.targetId);
      
      if (!sourceEcho || !targetEcho) return null;
      
      // Midpoint for control point calculation for a simple quadratic bezier
      // This creates an arc "above" the direct line between source and target
      const midX = (sourceEcho.position.x + targetEcho.position.x) / 2;
      const midY = (sourceEcho.position.y + targetEcho.position.y) / 2;
      
      // Control point calculation for curvature.
      // Offset perpendicular to the line connecting source and target.
      // The amount of offset can determine the "height" of the arc.
      const dx = targetEcho.position.x - sourceEcho.position.x;
      const dy = targetEcho.position.y - sourceEcho.position.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      // Perpendicular offset: A larger offsetFactor gives more pronounced curves
      // For short distances, a smaller offset is better.
      const offsetFactor = Math.min(80, dist * 0.3); 
      
      const controlX = midX - dy * (offsetFactor / dist); // Perpendicular X
      const controlY = midY + dx * (offsetFactor / dist); // Perpendicular Y

      return {
        id: rel.id,
        path: `M${sourceEcho.position.x},${sourceEcho.position.y} Q${controlX},${controlY} ${targetEcho.position.x},${targetEcho.position.y}`,
        type: rel.type,
        strength: rel.strength
      };
    }).filter(Boolean);
  }, [relations, echoes]);

  if (!echoes || echoes.length === 0 || !relations || relations.length === 0) {
    return null;
  }

  return (
    <svg 
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-[900]" // Ensure arcs are behind speech nodes (z-1000) but above general content
        aria-hidden="true"
    >
      <defs>
        <filter id="arc-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComponentTransfer in="blur" result="boostedBlur">
            <feFuncA type="linear" slope="0.7"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="boostedBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g>
        {arcs.map((arc) => (
          <path
            key={arc!.id}
            d={arc!.path}
            stroke={ARC_TYPE_COLORS[arc!.type]}
            strokeWidth={1 + (arc!.strength * 2)} 
            strokeDasharray={arc!.type === "reflection" ? "4,3" : "none"}
            fill="none"
            strokeOpacity={0.5 + arc!.strength * 0.4} // Dynamic opacity based on strength
            className="transition-all duration-300" // Removed hover effect from prompt as SVG is pointer-events-none
            // filter="url(#arc-glow)" // Glow can be performance intensive, enable with caution
          />
        ))}
      </g>
    </svg>
  );
}

export default EchoThreadArcs;
