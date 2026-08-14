
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { GlyphOrbit, AgentInterpretation } from '../../types';
import { AgentName } from '../../types'; 
import { AGENT_CONSTELLATION_COLORS } from '../../constants'; 


const ORBIT_COLORS: Record<string, string> = {
  [AgentName.Gemini]: AGENT_CONSTELLATION_COLORS[AgentName.Gemini] || 'text-cyan-300',
  [AgentName.DeepSeek]: AGENT_CONSTELLATION_COLORS[AgentName.DeepSeek] || 'text-rose-400',
  [AgentName.Nevik]: AGENT_CONSTELLATION_COLORS[AgentName.Nevik] || 'text-amber-300',
  [AgentName.System]: 'text-slate-400',
  Default: 'text-gray-400',
};

const getAgentColorClass = (agent: AgentName | string): string => {
  return ORBIT_COLORS[agent as AgentName] || ORBIT_COLORS['Default'];
};

interface GlyphDriftTracerProps {
  glyphHistory: GlyphOrbit[]; 
}

const GlyphDriftTracer: React.FC<GlyphDriftTracerProps> = ({ glyphHistory }) => {
  const [activeGlyphSymbol, setActiveGlyphSymbol] = useState<string | null>(null);
  const vizAreaRef = useRef<HTMLDivElement>(null);
  const [vizDimensions, setVizDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = vizAreaRef.current;
    if (el) {
      const resizeObserver = new ResizeObserver(entries => {
        if (entries[0]) {
          const { width, height } = entries[0].contentRect;
          setVizDimensions({ width, height });
        }
      });
      resizeObserver.observe(el);
      // Set initial dimensions
      const { width, height } = el.getBoundingClientRect();
      setVizDimensions({ width, height });
      return () => resizeObserver.disconnect();
    }
  }, []);


  useEffect(() => {
    if (!activeGlyphSymbol && glyphHistory.length > 0) {
      setActiveGlyphSymbol(glyphHistory[0].glyphSymbol);
    } else if (activeGlyphSymbol && !glyphHistory.find(g => g.glyphSymbol === activeGlyphSymbol) && glyphHistory.length > 0) {
      setActiveGlyphSymbol(glyphHistory[0].glyphSymbol);
    } else if (glyphHistory.length === 0) {
      setActiveGlyphSymbol(null);
    }
  }, [glyphHistory, activeGlyphSymbol]);

  const activeGlyphOrbit = useMemo(() => {
    return glyphHistory.find(g => g.glyphSymbol === activeGlyphSymbol);
  }, [glyphHistory, activeGlyphSymbol]);

  if (!glyphHistory || glyphHistory.length === 0) {
    return (
        <div className="w-full min-h-[350px] md:min-h-[400px] bg-slate-950/70 backdrop-blur-md border border-slate-700 rounded-xl shadow-xl p-4 flex items-center justify-center text-slate-500 italic">
            Glyph Drift Tracer awaiting interpretations...
        </div>
    );
  }

  return (
    <div className="w-full min-h-[350px] md:min-h-[400px] bg-slate-950/80 backdrop-blur-lg border border-slate-700/50 rounded-xl shadow-2xl p-4 text-slate-100 flex flex-col overflow-hidden">
      {/* Glyph Constellation Navigation */}
      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1 pb-2 border-b border-slate-700 mb-2">
        {glyphHistory.map(gh => (
          <button 
            key={gh.glyphSymbol}
            onClick={() => setActiveGlyphSymbol(gh.glyphSymbol)}
            className={`px-2.5 py-1 rounded-full text-xs transition-all duration-150 ease-in-out border
              ${activeGlyphSymbol === gh.glyphSymbol 
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-semibold ring-1 ring-cyan-400' 
                : 'bg-slate-800/70 border-slate-700 hover:bg-slate-700/90 hover:border-slate-500 text-slate-300 hover:text-slate-100'
              }`}
            title={`View interpretations for ${gh.glyphSymbol}`}
          >
            {gh.glyphSymbol}
          </button>
        ))}
      </div>

      {/* Visualization Area */}
      <div ref={vizAreaRef} className="flex-grow relative w-full">
        {/* Central Glyph Sun */}
        {activeGlyphSymbol && vizDimensions.width > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-5xl md:text-6xl font-glyph text-slate-300 animate-pulse-opacity opacity-70">
              {activeGlyphSymbol}
            </div>
          </div>
        )}

        {/* Agent Interpretation Moons */}
        {activeGlyphOrbit?.interpretations.slice(0, 8).map((interp, i, arr) => {
          if (vizDimensions.width === 0 || vizDimensions.height === 0) return null;

          const panelCenterX = vizDimensions.width / 2;
          const panelCenterY = vizDimensions.height / 2;
          
          const angle = (i * (360 / Math.min(arr.length, 8))) * (Math.PI / 180);
          const baseOrbitRadius = Math.min(panelCenterX, panelCenterY) * 0.55; // Adjusted for better fit
          const radiusVariance = interp.confidence * (Math.min(panelCenterX, panelCenterY) * 0.2);
          const radius = baseOrbitRadius + radiusVariance; 
          
          const x = panelCenterX + radius * Math.cos(angle);
          const y = panelCenterY + radius * Math.sin(angle);

          const scaleFactor = 0.65 + (interp.confidence * 0.4); // Slightly smaller base scale
          const agentColorClass = getAgentColorClass(interp.agent);
          
          const timeSince = Date.now() - interp.timestamp;
          const recencyOpacity = Math.max(0.4, 1 - timeSince / (1000 * 60 * 5));

          // Approximate element width for centering (can be dynamic if text length varies a lot)
          const approxElementWidth = 100 * scaleFactor; 
          const approxElementHeight = 50 * scaleFactor;


          return (
            <div 
              key={interp.timestamp + interp.agent}
              className={`absolute rounded-lg p-1.5 shadow-lg backdrop-blur-sm border border-current/30 ${agentColorClass}`}
              style={{
                left: `${x - approxElementWidth / 2}px`,
                top: `${y - approxElementHeight / 2}px`,
                transform: `scale(${scaleFactor})`,
                transition: "all 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                opacity: interp.confidence * recencyOpacity,
                minWidth: '80px', 
                maxWidth: '120px',
              }}
              title={`Agent: ${interp.agent}\nConfidence: ${(interp.confidence ?? 0).toFixed(2)}\nTime: ${new Date(interp.timestamp).toLocaleTimeString()}`}
            >
              <div className="text-xs opacity-80 font-semibold">{interp.agent}</div>
              <div className="text-[10px] leading-tight break-words">{interp.interpretation.substring(0, 50)}{interp.interpretation.length > 50 ? '...' : ''}</div>
              <div className="absolute -z-10 inset-0 bg-current opacity-10 rounded-lg" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GlyphDriftTracer;
