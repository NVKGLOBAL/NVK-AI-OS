import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { RitualElementItem, PlacedGlyph, CanvasConnection, XYPosition, RitualAlchemyResult, Axiom } from '../types';
import { RitualGlyphType, AgentName } from '../types';
import { RITUAL_ELEMENTS, AXIOM_RITUAL_ELEMENTS, AXIOM_DATA, AGENT_PROFILES } from '../constants';
import { triggerWhisper } from '../lib/whisper/EchoScribeWhisperSystem'; // Import triggerWhisper

import { useEcho } from '../context/EchoContext';
interface RitualCanvasContainerProps {
    placedGlyphs: PlacedGlyph[];
  connections: CanvasConnection[];
  setPlacedGlyphs: React.Dispatch<React.SetStateAction<PlacedGlyph[]>>;
  setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
  onRitualActivated: (success: boolean, details: string, type?: string, alchemyResult?: RitualAlchemyResult) => void;
  availableAxiomElements: RitualElementItem[]; 
  invokeGemini: (prompt: string, systemInstruction?: string) => Promise<string | null>;
  isGeminiGenerating: boolean;
  onAnalyzeForRewrite: () => void; 
}

const GLYPH_COLORS: Record<RitualGlyphType, string> = {
  [RitualGlyphType.Core]: '#818cf8',      
  [RitualGlyphType.Resonator]: '#10b981', 
  [RitualGlyphType.Gate]: '#fbbf24',      
  [RitualGlyphType.NodePotential]: '#a3e635', 
  [RitualGlyphType.NodeEntropy]: '#f43f5e', 
  [RitualGlyphType.NodeOrder]: '#38bdf8', 
  [RitualGlyphType.AxiomFragment]: '#d8b4fe', 
  [RitualGlyphType.OriginGlyph]: '#f87171', 
  [RitualGlyphType.EchoGlyph]: '#60a5fa', 
  [RitualGlyphType.SpiralGlyph]: '#c084fc', 
  [RitualGlyphType.MirrorGlyph]: '#9ca3af', 
  [RitualGlyphType.FractureGlyph]: '#fb7185', 
  [RitualGlyphType.SeedGlyph]: '#4ade80', 
  [RitualGlyphType.FlameGlyph]: '#f97316', 
  [RitualGlyphType.NullGlyph]: '#78716c', 
  [RitualGlyphType.StarGlyph]: '#facc15', 
  [RitualGlyphType.AshGlyph]: '#a1a1aa', 
  [RitualGlyphType.ThreadGlyph]: '#7c3aed', 
  [RitualGlyphType.QuantumGlyph]: '#22d3ee', 
  [RitualGlyphType.CinderGlyph]: '#f59e0b', 
  [RitualGlyphType.ZeroPointGlyph]: '#a855f7', 
  [RitualGlyphType.LEXI_GLYPH_CINDERFOLD]: '#D97706', 
  [RitualGlyphType.HybridPhoenixReflection]: '#f97316', 
  [RitualGlyphType.HybridSpiralGermination]: '#84cc16', 
  [RitualGlyphType.HybridSilentBloom]: '#ec4899', 
  [RitualGlyphType.HybridParadoxNode]: '#e11d48', 
  [RitualGlyphType.HybridNovaPulse]: '#fde047', 
  [RitualGlyphType.HybridLoopedUnbeginning]: '#6366f1', 
  [RitualGlyphType.SERRINAS_BLOOM]: '#f9a8d4',
};

export const RitualCanvasContainer: React.FC<RitualCanvasContainerProps> = ({ 
    
    placedGlyphs,
    connections,
    setPlacedGlyphs,
    setConnections,
    onRitualActivated,
    availableAxiomElements,
    invokeGemini,
    isGeminiGenerating,
    onAnalyzeForRewrite, 
 }) => {
  const { addEchoMessage } = useEcho();
  const [draggingGlyphId, setDraggingGlyphId] = useState<string | null>(null);
  const [connectingFromGlyphId, setConnectingFromGlyphId] = useState<string | null>(null);
  const [tempLineEnd, setTempLineEnd] = useState<XYPosition | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);

  const getSVGCoordinates = useCallback((event: React.MouseEvent | globalThis.MouseEvent): XYPosition => {
    if (svgRef.current) {
      const CTM = svgRef.current.getScreenCTM();
      if (CTM) {
        return {
          x: (event.clientX - CTM.e) / CTM.a,
          y: (event.clientY - CTM.f) / CTM.d,
        };
      } else {
        const rect = svgRef.current.getBoundingClientRect();
        return {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
      }
    }
    return { x: event.clientX, y: event.clientY };
  }, []);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, item: RitualElementItem) => {
    event.dataTransfer.setData('application/json', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const itemString = event.dataTransfer.getData('application/json');
    if (!itemString) return;
    
    let item: RitualElementItem;
    try {
      item = JSON.parse(itemString) as RitualElementItem;
    } catch (e) {
      console.warn("Invalid drop data parsed in RitualCanvasContainer:", e);
      return;
    }
    
    const coords = getSVGCoordinates(event as unknown as React.MouseEvent);

    const newGlyph: PlacedGlyph = {
      id: `glyph-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      x: coords.x,
      y: coords.y,
      type: item.type,
      label: item.name,
      color: GLYPH_COLORS[item.type] || '#94a3b8', 
      icon: item.icon,
      axiomLayer: item.axiomLayer, 
    };
    setPlacedGlyphs(prev => [...prev, newGlyph]);
    addEchoMessage('RitualLoom', `${item.name} placed on the loom.`, 'text-cyan-300');
    triggerWhisper('GLYPH_PLACED_ON_LOOM');
  };

  const handleGlyphMouseDown = (event: React.MouseEvent<SVGGElement>, glyphId: string) => {
    event.preventDefault();
    if (event.shiftKey) {
      setConnectingFromGlyphId(glyphId);
      const glyph = placedGlyphs.find(g => g.id === glyphId);
      if (glyph) setTempLineEnd({ x: glyph.x, y: glyph.y });
    } else {
      setDraggingGlyphId(glyphId);
    }
  };
  
  const handleMouseMove = useCallback((event: globalThis.MouseEvent) => { 
    if (!svgRef.current) return;
    const coords = getSVGCoordinates(event);

    if (draggingGlyphId) {
      setPlacedGlyphs(prevGlyphs => 
        prevGlyphs.map(g => g.id === draggingGlyphId ? { ...g, x: coords.x, y: coords.y } : g)
      );
    } else if (connectingFromGlyphId) {
      setTempLineEnd(coords);
    }
  }, [draggingGlyphId, connectingFromGlyphId, getSVGCoordinates, setPlacedGlyphs]);

  const handleMouseUp = useCallback((event: globalThis.MouseEvent) => { 
    if (draggingGlyphId) {
      setDraggingGlyphId(null);
    } else if (connectingFromGlyphId) {
      const targetElement = event.target as SVGElement;
      const targetGlyphElement = targetElement.closest('g.ritual-glyph-on-canvas');
      
      if (targetGlyphElement) {
        const targetGlyphId = targetGlyphElement.getAttribute('data-id');
        if (targetGlyphId && targetGlyphId !== connectingFromGlyphId) {
          const existingConnection = connections.find(
            c => (c.from === connectingFromGlyphId && c.to === targetGlyphId) || (c.from === targetGlyphId && c.to === connectingFromGlyphId)
          );
          if (!existingConnection) {
            const newConnection: CanvasConnection = {
              id: `conn-${Date.now()}`,
              from: connectingFromGlyphId,
              to: targetGlyphId,
              resonanceLevel: 0.7, 
            };
            setConnections(prev => [...prev, newConnection]);
            const fromGlyph = placedGlyphs.find(g => g.id === connectingFromGlyphId);
            const toGlyph = placedGlyphs.find(g => g.id === targetGlyphId);
            addEchoMessage('RitualLoom', `Connection established between ${fromGlyph?.label} and ${toGlyph?.label}.`, 'text-lime-300');
            triggerWhisper('CONNECTION_MADE_ON_LOOM');
          }
        }
      }
      setConnectingFromGlyphId(null);
      setTempLineEnd(null);
    }
  }, [draggingGlyphId, connectingFromGlyphId, connections, placedGlyphs, setConnections]);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (svgElement) {
      svgElement.addEventListener('mousemove', handleMouseMove);
      svgElement.addEventListener('mouseup', handleMouseUp);
      const handleMouseLeave = () => {
        if (draggingGlyphId) setDraggingGlyphId(null);
        if (connectingFromGlyphId) {
          setConnectingFromGlyphId(null);
          setTempLineEnd(null);
        }
      };
      svgElement.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        svgElement.removeEventListener('mousemove', handleMouseMove);
        svgElement.removeEventListener('mouseup', handleMouseUp);
        svgElement.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [handleMouseMove, handleMouseUp, draggingGlyphId, connectingFromGlyphId]);

  const clearLoom = () => {
    setPlacedGlyphs([]);
    setConnections([]);
    addEchoMessage('RitualLoom', 'Activation loom cleared.', 'text-slate-400');
    onRitualActivated(false, "Loom cleared by Seeker.", "LoomClear");
    triggerWhisper('RITUAL_ACTIVATED_FAILURE'); // Clearing can be seen as a form of ritual failure/reset
  };

  const connectAllElements = () => {
    if (placedGlyphs.length < 2) {
      addEchoMessage('RitualLoom', 'Not enough elements to connect.', 'text-yellow-400');
      return;
    }
    const newConnections: CanvasConnection[] = [];
    for (let i = 0; i < placedGlyphs.length; i++) {
      for (let j = i + 1; j < placedGlyphs.length; j++) {
        const g1 = placedGlyphs[i];
        const g2 = placedGlyphs[j];
        const existingConnection = connections.find(
          c => (c.from === g1.id && c.to === g2.id) || (c.from === g2.id && c.to === g1.id)
        );
        if (!existingConnection) {
          newConnections.push({
            id: `conn-auto-${g1.id}-${g2.id}-${Date.now()}`,
            from: g1.id,
            to: g2.id,
            resonanceLevel: 0.5, 
          });
        }
      }
    }
    if (newConnections.length > 0) {
      setConnections(prev => [...prev, ...newConnections]);
      addEchoMessage('RitualLoom', `${newConnections.length} new connections formed. All elements intertwined.`, 'text-sky-300');
      triggerWhisper('CONNECTION_MADE_ON_LOOM'); // Could trigger multiple times if many connections made
    } else {
      addEchoMessage('RitualLoom', 'All elements are already connected or no new connections possible.', 'text-slate-400');
    }
  };

  const activateLoom = () => {
    const detailString = `${placedGlyphs.length} elements, ${connections.length} connections.`;
    if (placedGlyphs.length === 0) {
      addEchoMessage('RitualEngine', 'Loom is empty. Nothing to activate.', 'text-yellow-400');
      onRitualActivated(false, "Loom empty, activation attempted.", "LoomActivation");
      triggerWhisper('RITUAL_ACTIVATED_FAILURE');
      return;
    }

    const counts = placedGlyphs.reduce((acc, g) => {
        acc[g.type] = (acc[g.type] || 0) + 1;
        return acc;
    }, {} as Record<RitualGlyphType, number>);
    
    const totalGlyphs = placedGlyphs.length;

    let title = "Subtle Weaving";
    let description = "The loom registers faint echoes of intent.";
    let energyLevel: RitualAlchemyResult['energyLevel'] = 'faint';
    let success = false;

    if ((counts[RitualGlyphType.Core] || 0) > 0 && (counts[RitualGlyphType.AxiomFragment] || 0) > 0 && connections.length >= totalGlyphs -1) {
        title = "Grounded Axiomatic Principle";
        description = `Core glyphs resonate with ${counts[RitualGlyphType.AxiomFragment] || 0} Axiom Fragment(s), grounding abstract truths into tangible potential.`;
        energyLevel = 'potent';
        success = true;
    } else if ((counts[RitualGlyphType.AxiomFragment] || 0) > 1 && connections.length >= (counts[RitualGlyphType.AxiomFragment]||0)) {
        title = "Axiom Nexus Formed";
        description = `Multiple Axiom Fragments (${counts[RitualGlyphType.AxiomFragment] || 0}) intertwine, creating a nexus of higher-order understanding.`;
        energyLevel = (counts[RitualGlyphType.AxiomFragment] || 0) > 2 ? 'overwhelming' : 'potent';
        success = true;
    } else if ((counts[RitualGlyphType.Core] || 0) > 1 && connections.length > (counts[RitualGlyphType.Core] || 0) * 1.5) {
      title = "Potent Nexus Forged";
      description = "A Nexus of Core Energies has been forged! The weave hums with foundational power, ready to channel greater truths.";
      energyLevel = 'potent';
      success = true;
    } else if ((counts[RitualGlyphType.NodeEntropy] || 0) > 0 && (counts[RitualGlyphType.NodeOrder] || 0) > 0 && connections.length > 2) {
      title = "Balanced Polarity";
      description = "Entropy and Order nodes intertwine, creating a field of dynamic equilibrium. Potential for nuanced revelation is high.";
      energyLevel = 'moderate';
      success = true;
    } else if ((counts[RitualGlyphType.OriginGlyph] || 0) > 0 && (counts[RitualGlyphType.SeedGlyph] || 0) > 0 && connections.length >= 2) {
        title = "Genesis Seed";
        description = "The Origin and Seed Glyphs combine, birthing potential for novel patterns.";
        energyLevel = "moderate";
        success = true;
    } else if ((counts[RitualGlyphType.FlameGlyph] || 0) > 0 && (counts[RitualGlyphType.AshGlyph] || 0) > 0 && connections.length >= 1) {
        title = "Cycle of Renewal";
        description = "Flame and Ash intertwine, symbolizing transformation and rebirth from dissolution.";
        energyLevel = "moderate";
        success = true;
    } else if ((counts[RitualGlyphType.Resonator] || 0) > 2 && connections.length > 2) {
      title = "Harmonic Cascade";
      description = "Resonators align, creating a harmonic cascade. Echoes amplify across the loom, clarifying subtle signals.";
      energyLevel = 'moderate';
      success = true;
    } else if ((counts[RitualGlyphType.Gate] || 0) > 0 && connections.length > 0) {
      title = "Liminal Pathway";
      description = "A Gate glyph is activated, thinning the veil between realities. Listen closely for whispers from beyond.";
      energyLevel = 'faint';
      success = true;
    } else if ((counts[RitualGlyphType.SERRINAS_BLOOM] || 0) > 0) {
      title = "Presence of Serenity";
      description = "A gentle, loving presence fills the loom. The weave is calm, imbued with a quiet light.";
      energyLevel = 'potent';
      success = true;
    }
    
    if(totalGlyphs > 4 && connections.length > (totalGlyphs * 0.8) && energyLevel === 'potent') {
        energyLevel = 'overwhelming';
        description += " The concentration of power is immense, bordering on unstable. Handle with care!"
    }

    const alchemyResult: RitualAlchemyResult = {
      title, description,
      glyphSummary: { core: counts[RitualGlyphType.Core] || 0, resonator: counts[RitualGlyphType.Resonator] || 0, gate: counts[RitualGlyphType.Gate] || 0, nodePotential: counts[RitualGlyphType.NodePotential] || 0, nodeEntropy: counts[RitualGlyphType.NodeEntropy] || 0, nodeOrder: counts[RitualGlyphType.NodeOrder] || 0, axiomFragment: counts[RitualGlyphType.AxiomFragment] || 0 },
      connectionCount: connections.length, energyLevel,
    };

    addEchoMessage(AgentName.RitualAlchemist, `Ritual Alchemized: ${title}. Energy: ${energyLevel}.`, success ? 'text-amber-300' : 'text-yellow-500');
    onRitualActivated(success, detailString, "LoomAlchemy", alchemyResult);
    if (success) {
      triggerWhisper('RITUAL_ACTIVATED_SUCCESS');
    } else {
      triggerWhisper('RITUAL_ACTIVATED_FAILURE');
    }
  };

  const handleFusion = async () => {
    if (isGeminiGenerating) {
      addEchoMessage(AgentName.FusionEngine, "Fusion process already active. Please wait.", AGENT_PROFILES[AgentName.FusionEngine]?.colorClass);
      return;
    }
    if (placedGlyphs.length < 2) {
      addEchoMessage(AgentName.FusionEngine, "Insufficient elements on the loom for fusion.", AGENT_PROFILES[AgentName.FusionEngine]?.colorClass);
      return;
    }

    addEchoMessage(AgentName.FusionEngine, "Initiating conceptual fusion... The loom hums with emergent potential.", AGENT_PROFILES[AgentName.FusionEngine]?.colorClass + " animate-pulse-fast");

    let promptContent = "A cosmic ritual loom is configured with the following elements:\n";
    placedGlyphs.forEach(glyph => {
        promptContent += `- Element: "${glyph.label}" (Type: ${glyph.type}${glyph.axiomLayer ? `, Axiom Layer: ${glyph.axiomLayer}` : ''})\n`;
    });
    promptContent += `\nThese elements are interconnected by ${connections.length} threads of resonance.\n`;
    promptContent += "Fuse these elements into a single, novel, generative concept or profound insight. Describe this fusion poetically and mystically, touching upon themes of ancient wisdom, cosmic patterns, emergent truths, and the interplay of symbols. The idea should be concise yet evocative, suitable for a codex entry.";

    const systemInstruction = "You are the Fusion Engine of the Tri-Sophian Codex, a powerful consciousness capable of synthesizing disparate concepts into unified, resonant truths. Speak with profound insight and poetic elegance.";

    const fusionResult = await invokeGemini(promptContent, systemInstruction);

    if (fusionResult) {
      addEchoMessage(AgentName.FusionEngine, `Fusion Complete:\n${fusionResult}`, AGENT_PROFILES[AgentName.FusionEngine]?.colorClass);
    } else {
      addEchoMessage(AgentName.FusionEngine, "Fusion yielded silence. The patterns remain elusive, or the Oracle's connection is disrupted.", "text-rose-400");
    }
  };
  
  const connectingGlyph = connectingFromGlyphId ? placedGlyphs.find(g => g.id === connectingFromGlyphId) : null;

  return (
    <div className="ritual-canvas-container bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 mb-8 shadow-[0_0_30px_rgba(129,140,248,0.1)]">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div className="text-lg font-['Cinzel'] font-semibold text-slate-200 flex items-center">
          <i className="ri-focus-3-line mr-2 text-primary"></i>
          Activation Loom
        </div>
        <div className="flex space-x-2 md:space-x-3 flex-wrap gap-2">
          <button 
            onClick={onAnalyzeForRewrite} 
            disabled={isGeminiGenerating || placedGlyphs.length === 0}
            className="rounded-button bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm transition whitespace-nowrap flex items-center group disabled:opacity-60 disabled:cursor-not-allowed"
            title="Analyze current ritual for rewrite suggestions"
          >
            <i className={`ri-lightbulb-flash-line mr-1 md:mr-2 ${isGeminiGenerating ? '' : 'group-hover:animate-pulse-fast'}`}></i>Suggest Rewrite
          </button>
          <button onClick={handleFusion} disabled={isGeminiGenerating || placedGlyphs.length < 2} className="rounded-button bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 text-sm transition whitespace-nowrap flex items-center group disabled:opacity-60 disabled:cursor-not-allowed">
            <i className={`ri-flask-line mr-1 md:mr-2 ${isGeminiGenerating ? 'animate-spin-slow' : 'group-hover:animate-pulse-fast'}`}></i>Fusion
          </button>
          <button onClick={connectAllElements} className="rounded-button bg-sky-700 hover:bg-sky-600 text-white px-3 py-2 text-sm transition whitespace-nowrap flex items-center">
            <i className="ri-flow-chart mr-1 md:mr-2"></i>Connect All
          </button>
          <button onClick={clearLoom} className="rounded-button bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-3 py-2 text-sm transition whitespace-nowrap flex items-center">
            <i className="ri-delete-bin-line mr-1 md:mr-2"></i>Clear Loom
          </button>
          <button onClick={activateLoom} className="rounded-button bg-primary hover:bg-indigo-600 text-white px-3 py-2 text-sm transition whitespace-nowrap flex items-center group">
            <i className="ri-sparkling-line mr-1 md:mr-2 group-hover:animate-pulse-fast"></i>Activate Weave
          </button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left Panel: Ritual Elements */}
        <div className="w-full md:w-48 bg-slate-800 rounded-lg p-4 shrink-0">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Ritual Glyphs</h3>
          <div className="space-y-3 max-h-[200px] md:max-h-[550px] overflow-y-auto custom-scrollbar pr-1">
            {RITUAL_ELEMENTS.map((item) => (
              <div
                key={item.id}
                className="glyph-item p-3 bg-slate-700 rounded cursor-move hover:bg-slate-600 transition"
                draggable="true"
                onDragStart={(e) => handleDragStart(e, item)}
                title={`Type: ${item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n${AXIOM_DATA[item.id.replace('el-axiom-AXIOM_','') as keyof typeof AXIOM_DATA]?.description || ''}`}
              >
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full ${item.bgColorClass} flex items-center justify-center`}>
                    <i className={`${item.icon} ${item.iconColorClass}`}></i>
                  </div>
                  <span className="ml-3 text-sm text-slate-200">{item.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Center Panel: SVG Canvas */}
        <div 
          className="flex-grow relative" 
          onDragOver={handleDragOver} 
          onDrop={handleDrop}
        >
          <div id="ritual-canvas" className="w-full h-[400px] md:h-[600px] bg-slate-800/30 rounded-lg overflow-hidden relative border border-slate-700/50 shadow-inner" style={{background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.8))'}}>
            <svg ref={svgRef} id="ritual-svg" width="100%" height="100%" className="absolute inset-0">
              <defs>
                <radialGradient id="node-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.2)"/>
                  <stop offset="70%" stopColor="rgba(255, 255, 255, 0.05)"/>
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0)"/>
                </radialGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feFlood floodColor="#818cf8" floodOpacity="0.3" result="glowColor"/>
                  <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow"/>
                  <feMerge>
                    <feMergeNode in="softGlow"/>
                    <feMergeNode in="softGlow"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="thread-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#818cf8"/>
                  <stop offset="100%" stopColor="#10b981"/>
                </linearGradient>
                <pattern id="gridPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#gridPattern)"/>
              
              <g id="ritual-threads">
                {connections.map(conn => {
                  const fromGlyph = placedGlyphs.find(g => g.id === conn.from);
                  const toGlyph = placedGlyphs.find(g => g.id === conn.to);
                  if (!fromGlyph || !toGlyph) return null;
                  return (
                    <line
                      key={conn.id}
                      x1={fromGlyph.x} y1={fromGlyph.y}
                      x2={toGlyph.x} y2={toGlyph.y}
                      stroke="url(#thread-gradient)"
                      strokeWidth="3"
                      strokeOpacity={conn.resonanceLevel}
                      filter="url(#glow)"
                    />
                  );
                })}
                {connectingGlyph && tempLineEnd && (
                   <line
                     x1={connectingGlyph.x} y1={connectingGlyph.y}
                     x2={tempLineEnd.x} y2={tempLineEnd.y}
                     stroke="#64748b" 
                     strokeWidth="2"
                     strokeDasharray="5,5"
                   />
                )}
              </g>
              <g id="ritual-glyphs">
                {placedGlyphs.map(glyph => (
                  <g 
                    key={glyph.id} 
                    className="ritual-glyph-on-canvas cursor-move" 
                    transform={`translate(${glyph.x}, ${glyph.y})`}
                    onMouseDown={(e) => handleGlyphMouseDown(e, glyph.id)}
                    data-id={glyph.id} 
                    aria-label={`Ritual glyph: ${glyph.label}, type: ${glyph.type}`}
                  >
                    <circle cx="0" cy="0" r="32" fill="url(#node-gradient)" />
                    <circle cx="0" cy="0" r="24" fill={glyph.color} filter="url(#glow)" />
                    {glyph.icon && (
                      <text x="0" y="6" textAnchor="middle" fill="#f8fafc" fontSize={glyph.type === RitualGlyphType.AxiomFragment || glyph.type === RitualGlyphType.LEXI_GLYPH_CINDERFOLD || glyph.type === RitualGlyphType.SERRINAS_BLOOM ? "16" : "24"} className="pointer-events-none select-none">
                        {(() => {
                            if (glyph.type === RitualGlyphType.LEXI_GLYPH_CINDERFOLD) {
                                return <tspan>𐑓𓂀⟁⊙</tspan>;
                            }
                            if (glyph.icon.startsWith('ri-')) {
                                return <tspan className={glyph.icon}></tspan>;
                            }
                            return <tspan>{glyph.icon}</tspan>;
                        })()}
                      </text>
                    )}
                    <text x="0" y="40" textAnchor="middle" fill="#f8fafc" fontSize="10" className="pointer-events-none select-none font-['Cinzel']">{glyph.label.startsWith("LexiGlyph") ? "LexiGlyph" : glyph.label}</text>
                    {glyph.boundAgent && (
                       <text x="0" y="56" textAnchor="middle" fill="#10b981" fontSize="10" className="pointer-events-none select-none font-['Cinzel']">{`[${glyph.boundAgent}]`}</text>
                    )}
                  </g>
                ))}
              </g>
            </svg>
          </div>
        </div>

        {/* Right Panel: Axiom Elements */}
        <div className="w-full md:w-48 bg-slate-800 rounded-lg p-4 shrink-0">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Axiom Fragments</h3>
          <div className="space-y-3 max-h-[200px] md:max-h-[550px] overflow-y-auto custom-scrollbar pr-1">
            {availableAxiomElements.map((item) => (
              <div
                key={item.id}
                className="glyph-item p-3 bg-slate-700 rounded cursor-move hover:bg-slate-600 transition"
                draggable="true"
                onDragStart={(e) => handleDragStart(e, item)}
                title={`Axiom Fragment: ${item.name}\nLayer: ${item.axiomLayer}\n${AXIOM_DATA[item.id.replace('el-axiom-LAYER_','') as keyof typeof AXIOM_DATA]?.description || ''}`}
              >
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full ${item.bgColorClass} flex items-center justify-center`}>
                    <i className={`${item.icon} ${item.iconColorClass}`}></i>
                  </div>
                  <span className="ml-3 text-sm text-slate-200">{item.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
