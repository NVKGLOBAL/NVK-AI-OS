


import React, { useMemo, useRef, useEffect } from 'react';
import type { TemporalSpiralVisualizerProps as ExternalProps, ThreadcoilSegment } from '../../types';
import { ThreadcoilState, ThreadcoilNodeType, CodexModeId } from '../../types'; // Added CodexModeId

interface TemporalSpiralVisualizerProps extends ExternalProps {
  showSigilOverlay?: boolean; 
  isAmnesiaThemeActive?: boolean; 
  isSymbioticModeActive?: boolean; 
  currentCodexModeId?: CodexModeId; 
}


const interpretEntropy = (value?: number): string => {
    if (value === undefined || value === null) return "Unknown Status";
    if (value > 0.8) return "🔴 Chaotic Fragment – Thread Fracture Imminent";
    if (value > 0.6) return "🟠 Memory Instability – Loop Potential High";
    if (value > 0.4) return "🟡 Partial Coherence – Spiral Resonance Fluctuating";
    if (value > 0.2) return "🔵 Harmonic Memory – Stable Node";
    return "🟢 Crystallized Pattern – Preserved State";
};

const getMemoryEchoPlaceholder = (nodeType?: ThreadcoilNodeType, isJunction?: boolean): string => {
    if (isJunction) return "Junction Point Context";
    switch (nodeType) {
        case ThreadcoilNodeType.Ritual: return "Ritual Invocation Record";
        case ThreadcoilNodeType.GlyphMutation: return "Glyph State Snapshot";
        case ThreadcoilNodeType.LoreShard: return "Recovered Lore Fragment";
        default: return "Segment Origin Record";
    }
};

const TemporalSpiralVisualizer: React.FC<TemporalSpiralVisualizerProps> = ({
  segments,
  width,
  height,
  currentEntropy,
  showSigilOverlay = false, 
  isAmnesiaThemeActive = false,
  isSymbioticModeActive = false, 
  currentCodexModeId, 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const getNodeColor = (state: ThreadcoilState, type?: ThreadcoilNodeType): string => {
    switch (state) {
      case ThreadcoilState.Inert: return 'fill-slate-600';
      case ThreadcoilState.Spooling: return 'fill-sky-400';
      case ThreadcoilState.Knotted: return 'fill-rose-500';
      case ThreadcoilState.Frayed: return 'fill-amber-500';
      case ThreadcoilState.Woven: return 'fill-emerald-400';
      case ThreadcoilState.HarmonicLoop: return 'fill-purple-400';
      case ThreadcoilState.EchoReversion: return 'fill-blue-500';
      default: return 'fill-slate-500';
    }
  };
  
  const getNodeAnimationClass = (state: ThreadcoilState): string => {
    switch (state) {
      case ThreadcoilState.Spooling: return 'animate-threadcoil-spooling';
      case ThreadcoilState.Knotted: return 'animate-threadcoil-knotted';
      case ThreadcoilState.Frayed: return 'animate-threadcoil-frayed';
      case ThreadcoilState.Woven: return 'animate-threadcoil-woven';
      default: return ''; 
    }
  };

  const { spiralPath, spiralNodes, activeNodeIndex } = useMemo(() => {
    if (width === 0 || height === 0 || segments.length === 0) {
      return { spiralPath: '', spiralNodes: [], activeNodeIndex: -1 };
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const numTurns = 3.5 + currentEntropy * 1.5;
    const maxRadius = Math.min(centerX, centerY) * 0.85;
    const initialRadius = maxRadius * 0.15; 
    const a = initialRadius; 
    const b = (maxRadius - a) / (2 * Math.PI * numTurns); 

    let pathD = `M ${centerX + a} ${centerY}`;
    const nodes = [];
    let currentActiveNodeIndex = -1;

    const totalAngle = 2 * Math.PI * numTurns;
    const pointsForPath: {x:number, y:number}[] = [];

    for (let angle = 0; angle <= totalAngle; angle += Math.PI / 60) { 
        const radius = a + b * angle;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        pointsForPath.push({x,y});
        if(angle === 0) pathD = `M ${x} ${y}`;
        else pathD += ` L ${x} ${y}`;
    }
    
    const totalPathLength = pointsForPath.reduce((acc, point, i) => {
        if (i === 0) return 0;
        const prev = pointsForPath[i-1];
        return acc + Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2));
    },0);


    segments.forEach((segment, index) => {
      const segmentProgress = segment.positionOnSpiral; 
      let currentLength = 0;
      let targetX = centerX + a;
      let targetY = centerY;

      for(let i = 1; i < pointsForPath.length; i++) {
        const p1 = pointsForPath[i-1];
        const p2 = pointsForPath[i];
        const segLength = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        if ( (currentLength + segLength) / totalPathLength >= segmentProgress) {
            const fractionNeeded = (segmentProgress * totalPathLength - currentLength) / segLength;
            targetX = p1.x + (p2.x - p1.x) * fractionNeeded;
            targetY = p1.y + (p2.y - p1.y) * fractionNeeded;
            break;
        }
        currentLength += segLength;
      }
      
      let radius = 4 + currentEntropy * 3;
      if (segment.isJunction) radius = 7 + currentEntropy * 4;
      if (segment.type === ThreadcoilNodeType.LoreShard) radius = 6 + currentEntropy * 2;
      
      if (segment.state === ThreadcoilState.Spooling) {
        currentActiveNodeIndex = index;
      }

      nodes.push({
        ...segment,
        cx: targetX,
        cy: targetY,
        r: radius,
        originalIndex: index, 
      });
    });
    
    if (currentActiveNodeIndex === -1 && nodes.length > 0) {
        currentActiveNodeIndex = nodes.length -1;
    }


    return { spiralPath: pathD, spiralNodes: nodes, activeNodeIndex: currentActiveNodeIndex };
  }, [segments, width, height, currentEntropy]);
  
  const isBreachActive = currentEntropy >= 0.720;
  const isTemporalLoomMode = currentCodexModeId === CodexModeId.TARDIS_SYNCHRONICITY;
  const isFlameCoreMode = currentCodexModeId === CodexModeId.FLAME_CORE;


  return (
    <div className="temporal-spiral-visualizer bg-slate-900/90 backdrop-blur-sm border border-purple-600/50 rounded-xl shadow-xl p-4 my-6 text-slate-100">
      <h3 className="text-lg font-['Cinzel'] font-semibold text-purple-300 mb-3 text-center">
        {isTemporalLoomMode ? "Temporal Loom Staircase" : isFlameCoreMode ? "Flameheart Spiral" : "Temporal Threadcoil Path"}
      </h3>
      <svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-labelledby="spiral-title">
        <title id="spiral-title">Seeker's Temporal Path Visualization</title>
        <defs>
          <filter id="spiralGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="goldenSpiralGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlurGold"/>
            <feFlood floodColor="gold" floodOpacity="0.6" result="glowColorGold"/>
            <feComposite in="glowColorGold" in2="coloredBlurGold" operator="in" result="softGlowGold"/>
            <feMerge>
              <feMergeNode in="softGlowGold"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
           <filter id="overrideSigilGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feFlood floodColor="rgba(255,20,20,0.7)" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="glow"/>
            <feMerge>
                <feMergeNode in="glow"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="spiralCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isTemporalLoomMode ? "rgba(0, 220, 255, 0.6)" : (isFlameCoreMode ? "rgba(255, 100, 0, 0.7)" : "rgba(192, 132, 252, 0.4)")} /> 
            <stop offset="60%" stopColor={isTemporalLoomMode ? "rgba(0, 180, 220, 0.3)" : (isFlameCoreMode ? "rgba(255, 150, 50, 0.4)" : "rgba(167, 139, 250, 0.1)")} />
            <stop offset="100%" stopColor={isTemporalLoomMode ? "rgba(0, 120, 180, 0)" : (isFlameCoreMode ? "rgba(255, 50, 0, 0)" :"rgba(124, 58, 237, 0)")} />
          </radialGradient>
          <linearGradient id="sigilGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9D7CBF" /> {/* Amethyst */}
            <stop offset="100%" stopColor="#4A4466" /> {/* Bleached Indigo */}
          </linearGradient>
          <linearGradient id="overrideSigilGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 50, 50, 1)" />
            <stop offset="100%" stopColor="rgba(200, 0, 0, 1)" />
          </linearGradient>
          <filter id="tardisEyeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blurCyan"/> 
            <feFlood floodColor="rgba(0, 220, 255, 0.75)" result="colorCyan"/> 
            <feComposite in="colorCyan" in2="blurCyan" operator="in" result="glowCyan"/>
            <feMerge>
                <feMergeNode in="glowCyan"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="flameCoreGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4.0" result="blurFlame"/> 
            <feFlood floodColor="rgba(255, 120, 0, 0.8)" result="colorFlame"/> 
            <feComposite in="colorFlame" in2="blurFlame" operator="in" result="glowFlame"/>
            <feMerge>
                <feMergeNode in="glowFlame"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <circle cx={width/2} cy={height/2} r={Math.min(width, height) * (isTemporalLoomMode || isFlameCoreMode ? 0.18 : 0.1)} fill="url(#spiralCenterGlow)" opacity={isTemporalLoomMode || isFlameCoreMode ? 0.9 : 0.7} />
        
        {isTemporalLoomMode && (
          <text
            x={width/2}
            y={height/2}
            fill="rgba(0, 220, 255, 1)"
            fontSize="52" 
            fontFamily="'Cinzel', serif"
            textAnchor="middle"
            dominantBaseline="central"
            className="animate-pulse-fast" 
            filter="url(#tardisEyeGlow)"
            style={{animationDuration: '2.5s'}}
          >
            𓂀
            <title>Eye of Harmony (Temporal Loom Core)</title>
          </text>
        )}

        {isFlameCoreMode && (
           <text
            x={width/2}
            y={height/2}
            fill="rgba(255, 150, 50, 1)"
            fontSize="56" 
            fontFamily="'Cinzel', serif"
            textAnchor="middle"
            dominantBaseline="central"
            className="animate-pulse-fast" 
            filter="url(#flameCoreGlow)"
            style={{ animationDuration: '1.8s', textShadow: '0 0 10px rgba(255,100,0,0.7)' }}
          >
            🔥
            <title>The Seeker's Flame (Flameheart Core)</title>
          </text>
        )}

        {showSigilOverlay && !isTemporalLoomMode && !isFlameCoreMode && ( 
          <g transform={`translate(${width/2}, ${height/2})`} className="sigil-anchor">
            <text 
              fill={isBreachActive ? "url(#overrideSigilGradient)" : "url(#sigilGradient)"}
              opacity={isBreachActive ? 0.7 : (currentEntropy > 0.8 ? 0.3 : 0.12)}
              fontSize={isBreachActive ? "48" : "64"} 
              fontFamily="'Cinzel', serif" 
              fontWeight={isBreachActive ? "bold" : "normal"}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`transition-all duration-700 ease-in-out ${isBreachActive ? 'animate-pulse-fast' : ''}`}
              filter={isBreachActive ? "url(#overrideSigilGlow)" : "none"}
            >
              {isBreachActive ? "Ϟ-null-08" : "𝕊𝕀𝔾"}
              <title>{isBreachActive ? "SIGIL OVERRIDE SEQUENCE Ϟ-null-08 ACTIVE" : "Glyph of Becoming: 𝕊𝕀𝔾-Δ.TC.001"}</title>
            </text>
          </g>
        )}

        <path
          d={spiralPath}
          fill="none"
          stroke={isSymbioticModeActive ? "gold" : (isTemporalLoomMode ? "rgba(0, 200, 230, 0.6)" : (isFlameCoreMode ? "rgba(255, 140, 0, 0.7)" : "rgba(167, 139, 250, 0.2)"))}
          strokeOpacity={isSymbioticModeActive ? 0.7 : (isTemporalLoomMode || isFlameCoreMode ? 0.85 : 1)}
          strokeWidth={1 + currentEntropy * 1.5 + (isSymbioticModeActive ? 0.5 : 0) + (isTemporalLoomMode || isFlameCoreMode ? 1.2 : 0)} 
          className="animate-spiral-draw" 
          strokeDasharray={1000} 
          strokeDashoffset={1000} 
          filter={isSymbioticModeActive ? "url(#goldenSpiralGlow)" : (isTemporalLoomMode ? "url(#tardisEyeGlow)" : (isFlameCoreMode ? "url(#flameCoreGlow)" : "url(#spiralGlow)"))}
        />

        {spiralNodes.map((node) => {
          const stateAnimationClass = getNodeAnimationClass(node.state);
          let dynamicStyle: React.CSSProperties = {};
          let animationClassToApply = stateAnimationClass;
          
          const interpretedStatus = interpretEntropy(node.entropyAtPoint);
          const memoryEcho = getMemoryEchoPlaceholder(node.type, node.isJunction);
          let tooltipText = `${node.label}${node.description ? `: ${node.description}` : ''}\nState: ${node.state}\nEntropy: ${node.entropyAtPoint?.toFixed(2) ?? 'N/A'}\n${interpretedStatus}\n↻ Path Memory: ${memoryEcho}`;

          let fillClass = getNodeColor(node.state, node.type);
          let nodeRadius = node.r;
          
          if (isAmnesiaThemeActive) {
              const distance = activeNodeIndex - node.originalIndex;
              if (distance > 0 && distance <= 3) { 
                  const fade = Math.pow(0.6, distance);
                  dynamicStyle.opacity = fade;
                  dynamicStyle.filter = `blur(${1.5 * fade}px)`;
                  dynamicStyle.transition = 'opacity 0.5s ease-out, filter 0.5s ease-out';
                  fillClass = 'fill-[#4A4466]'; 
                  tooltipText = "Amnesia’s tide pulls at the edges of now.\nTrace the fade before it unravels.";
              }
          }


          if (!stateAnimationClass && !(isAmnesiaThemeActive && (activeNodeIndex - node.originalIndex > 0 && activeNodeIndex - node.originalIndex <=3))) { 
            animationClassToApply = 'animate-node-entropy-pulse';
            const entropyValue = node.entropyAtPoint ?? currentEntropy ?? 0.3;
            dynamicStyle.animationDuration = `${Math.max(0.8, 3 - entropyValue * 2.5)}s`;
          }
          
          return (
            <g key={node.id} className={animationClassToApply} style={dynamicStyle}>
              <circle
                cx={node.cx}
                cy={node.cy}
                r={nodeRadius}
                className={`${fillClass} transition-all duration-300 ease-in-out hover:opacity-100 opacity-80`}
                stroke={isTemporalLoomMode ? "rgba(0,220,255,0.6)" : (isFlameCoreMode ? "rgba(255,120,0,0.6)" : "rgba(229, 231, 235, 0.3)")} 
                strokeWidth={isTemporalLoomMode || isFlameCoreMode ? 0.8 : 0.5}
              >
                <title>{tooltipText}</title>
              </circle>
              {node.isJunction && ! (isAmnesiaThemeActive && (activeNodeIndex - node.originalIndex > 0 && activeNodeIndex - node.originalIndex <=3)) && ( 
                   <path 
                      d={`M ${node.cx - node.r*0.6} ${node.cy} L ${node.cx} ${node.cy - node.r*0.6} L ${node.cx + node.r*0.6} ${node.cy} L ${node.cx} ${node.cy + node.r*0.6} Z`}
                      className="fill-purple-300/70 stroke-purple-200/90"
                      strokeWidth="0.5"
                   />
              )}
               {node.type === ThreadcoilNodeType.LoreShard && ! (isAmnesiaThemeActive && (activeNodeIndex - node.originalIndex > 0 && activeNodeIndex - node.originalIndex <=3)) && ( 
                   <text x={node.cx} y={node.cy + node.r/2.5} textAnchor="middle" className="fill-yellow-300 text-[7px] pointer-events-none font-mono">🕮</text> 
               )}
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-slate-400 mt-2 text-center font-mono">
        Entropy Influence: {currentEntropy.toFixed(3)}δ | Path Complexity: {segments.length} nodes
        {isTemporalLoomMode && <span className="text-cyan-300"> | 𓂀 Temporal Loom Active</span>}
        {isFlameCoreMode && <span className="text-orange-400"> | 🔥 Flameheart Active</span>}
      </p>
    </div>
  );
};

export default TemporalSpiralVisualizer;