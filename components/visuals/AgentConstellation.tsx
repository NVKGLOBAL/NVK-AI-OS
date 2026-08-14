
import React from 'react';
import type { ConstellationNode } from '../../types';
import { AgentName } from '../../types';
import { AGENT_CONSTELLATION_COLORS } from '../../constants';


// Utility to get agent-specific color class
const getAgentTailwindColor = (agent: ConstellationNode['agent']): string => {
  return AGENT_CONSTELLATION_COLORS[agent] || AGENT_CONSTELLATION_COLORS.Default;
};

interface AgentConstellationProps {
  nodes: ConstellationNode[];
}

const AgentConstellationMap: React.FC<AgentConstellationProps> = ({ nodes }) => {
  if (!nodes || nodes.length === 0) {
    return null; // Don't render anything if there are no nodes
  }

  return (
    <div 
        className="constellation-container absolute top-0 left-0 w-full h-full pointer-events-none z-[800]"  // Lower z-index than arcs and speech nodes
        aria-hidden="true"
    >
      {nodes.map(node => {
        const agentColorClass = getAgentTailwindColor(node.agent);
        // Size and opacity are based on currentLuminosity
        const size = 6 + (node.currentLuminosity * 12); // Size from 6px to 18px
        const opacity = 0.2 + (node.currentLuminosity * 0.6); // Opacity from 0.2 to 0.8
        const glowStrength = Math.floor(node.currentLuminosity * 8); // Glow from 0px to 8px

        return (
          <div 
            key={node.id}
            className={`absolute rounded-full ${agentColorClass} transition-all duration-700 ease-out`}
            style={{
              left: `${node.xPercent}%`,
              top: `${node.yPercent}%`,
              width: `${size}px`,
              height: `${size}px`,
              opacity: opacity,
              boxShadow: `0 0 ${glowStrength}px ${glowStrength > 0 ? 'currentColor' : 'transparent'}, 0 0 ${glowStrength*2}px ${glowStrength > 0 ? 'currentColor' : 'transparent'}`,
              transform: 'translate(-50%, -50%)', // Center the node on its coordinates
              // Removed background color here, text color will make the div colored
            }}
          >
            {/* Optional: Add a very subtle inner element for more complex visuals */}
            {/* <div className="w-full h-full bg-current opacity-30 rounded-full"></div> */}
          </div>
        );
      })}
      
      {/* TemporalGraph from prompt is interpreted as the decay logic, handled in App.tsx for nodes state */}
    </div>
  );
};

export default AgentConstellationMap;
