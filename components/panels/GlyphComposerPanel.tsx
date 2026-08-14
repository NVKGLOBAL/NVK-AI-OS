
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { GlyphComposerPanelProps as ExternalProps, ComposerGlyph, PlacedComposerGlyph, HistoricalDatachegaRitualSavedEventData, GrimoireRitualEntry, PlacedGlyphData, BugaGlyph } from '../../types';
import { AgentName, ComposerGlyphCategory, HistoricalEventType, BugaGlyphCategory } from '../../types';
import { AGENT_PROFILES, GLYPH_CATEGORIES_DATA, BUGA_GLYPH_LIBRARY, SEPARATOR_GLYPH_DATA, BUGA_GLYPH_PEPTIDE_SEQUENCE } from '../../constants';
import { Textarea } from '../ui/Textarea'; 
import { Button } from '../ui/Button';

import { useEcho } from '../../context/EchoContext';
const GLYPH_COMPOSER_PANEL_WIDTH_CONST = 750; 
const GLYPH_COMPOSER_PANEL_HEIGHT_CONST = 850;

const GRIMOIRE_STORAGE_KEY = 'codexGrimoireRituals';

type BugaSlot = (BugaGlyph & { canvasId?: string }) | null;

interface GlyphComposerPanelProps extends ExternalProps {
    isBugaModeActive: boolean;
}


// Sub-component for editing selected glyph parameters
const GlyphParametersEditor: React.FC<{
  selectedGlyph: PlacedComposerGlyph;
  onUpdateParameter: (canvasId: string, param: keyof PlacedComposerGlyph, value: any) => void;
}> = ({ selectedGlyph, onUpdateParameter }) => {
  const [amplitude, setAmplitude] = useState(selectedGlyph.amplitude ?? 1.0);
  const [phaseOffset, setPhaseOffset] = useState(selectedGlyph.phaseOffset ?? 0);
  const [resonanceBand, setResonanceBand] = useState(selectedGlyph.resonanceBand ?? "Standard Harmonic Field");

  useEffect(() => {
    setAmplitude(selectedGlyph.amplitude ?? 1.0);
    setPhaseOffset(selectedGlyph.phaseOffset ?? 0);
    setResonanceBand(selectedGlyph.resonanceBand ?? "Standard Harmonic Field");
  }, [selectedGlyph]);

  const handleAmplitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAmplitude(val);
    onUpdateParameter(selectedGlyph.canvasId, 'amplitude', val);
  };

  const handlePhaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPhaseOffset(val);
    onUpdateParameter(selectedGlyph.canvasId, 'phaseOffset', val);
  };
  
  const handleBandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setResonanceBand(val);
    onUpdateParameter(selectedGlyph.canvasId, 'resonanceBand', val);
  };

  return (
    <div className="glyph-parameters-editor bg-slate-700/30 p-2.5 rounded-md border border-slate-600/50 mt-2">
      <h5 className="text-xs font-cinzel text-fuchsia-300 mb-1.5">Tune: {selectedGlyph.name}</h5>
      <div className="space-y-1.5 text-xs">
        <div>
          <label htmlFor={`amp-${selectedGlyph.canvasId}`} className="block text-slate-400 text-[10px] mb-0.5">Amplitude: {(amplitude || 0).toFixed(2)}</label>
          <input type="range" id={`amp-${selectedGlyph.canvasId}`} min="0.1" max="2.0" step="0.05" value={amplitude} onChange={handleAmplitudeChange} className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"/>
        </div>
        <div>
          <label htmlFor={`phase-${selectedGlyph.canvasId}`} className="block text-slate-400 text-[10px] mb-0.5">Phase Offset (deg): {phaseOffset}°</label>
          <input type="range" id={`phase-${selectedGlyph.canvasId}`} min="0" max="360" step="1" value={phaseOffset} onChange={handlePhaseChange} className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"/>
        </div>
        <div>
          <label htmlFor={`band-${selectedGlyph.canvasId}`} className="block text-slate-400 text-[10px] mb-0.5">Resonance Band:</label>
          <input type="text" id={`band-${selectedGlyph.canvasId}`} value={resonanceBand} onChange={handleBandChange} className="w-full p-1 text-[10px] bg-slate-600 border border-slate-500 rounded-sm text-slate-200 focus:ring-1 focus:ring-fuchsia-500 placeholder-slate-400"/>
        </div>
      </div>
    </div>
  );
};


const GlyphComposerPanel: React.FC<GlyphComposerPanelProps> = ({  isBugaModeActive }) => {
  const { addEchoMessage } = useEcho();
  const [placedGlyphs, setPlacedGlyphs] = useState<PlacedComposerGlyph[]>([]);
  const [selectedGlyphCanvasId, setSelectedGlyphCanvasId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [currentEntropyVisual, setCurrentEntropyVisual] = useState({ chaos: 0.8, harmony: 0.2 });
  const [currentProbability, setCurrentProbability] = useState(0.1);
  const [ritualName, setRitualName] = useState(isBugaModeActive ? "Buga Peptide Synthesis" : "Untitled Harmonic Sequence");
  const [seekerIntention, setSeekerIntention] = useState<string>(isBugaModeActive ? "Simulating bioharmonic key KNKNTTTTRSRSIIMIQHQHPPPP" : "");

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasWidth = GLYPH_COMPOSER_PANEL_WIDTH_CONST / 2.5; 
  const canvasHeight = GLYPH_COMPOSER_PANEL_HEIGHT_CONST * 0.45; 
  const canvasCenter = { x: canvasWidth / 2, y: canvasHeight / 2 }; 
  const coreRadius = 30; 
  const ringRadii = [65, 100, 135]; 
  const bugaRingRadius = Math.min(canvasCenter.x, canvasCenter.y) * 0.85;

  const ALL_BUGA_ELEMENTS_ORDERED = useMemo(() => {
    return [...SEPARATOR_GLYPH_DATA, ...BUGA_GLYPH_LIBRARY].sort((a,b) => a.position - b.position);
  }, []);

  const [bugaSequenceSlots, setBugaSequenceSlots] = useState<BugaSlot[]>(new Array(ALL_BUGA_ELEMENTS_ORDERED.length).fill(null));

  const activeCodingGlyphsInBuga = useMemo(() => {
    return bugaSequenceSlots.filter(s => s && s.type === 'coding') as BugaGlyph[];
  }, [bugaSequenceSlots]);

  const bugaSlotPositions = useMemo(() => {
    const positions: Record<number, {x: number, y: number, angle: number, type: 'coding' | 'separator'}> = {};
    const totalPositions = ALL_BUGA_ELEMENTS_ORDERED.length; 
    ALL_BUGA_ELEMENTS_ORDERED.forEach((item, index) => {
        const angle = (index / totalPositions) * 2 * Math.PI - (Math.PI / 2); 
        positions[item.position] = { 
            x: canvasCenter.x + bugaRingRadius * Math.cos(angle),
            y: canvasCenter.y + bugaRingRadius * Math.sin(angle),
            angle,
            type: item.type
        };
    });
    return positions;
  }, [ALL_BUGA_ELEMENTS_ORDERED, bugaRingRadius, canvasCenter.x, canvasCenter.y]);

  // Effect to reset states when Buga mode changes
  useEffect(() => {
    setPlacedGlyphs([]);
    setBugaSequenceSlots(new Array(ALL_BUGA_ELEMENTS_ORDERED.length).fill(null));
    setSelectedGlyphCanvasId(null);
    setIsSimulating(false);
    setSimulationStep(0);
    setCurrentEntropyVisual({ chaos: 0.8, harmony: 0.2 });
    setCurrentProbability(0.1);
    if (isBugaModeActive) {
      setRitualName("Buga Peptide Synthesis");
      setSeekerIntention("Simulating bioharmonic key KNKNTTTTRSRSIIMIQHQHPPPP");
    } else {
      setRitualName("Untitled Harmonic Sequence");
      setSeekerIntention("");
    }
  }, [isBugaModeActive, ALL_BUGA_ELEMENTS_ORDERED.length]);


  const handleGlyphClick = (event: React.MouseEvent, canvasId: string) => {
    if (isBugaModeActive) return;
    event.stopPropagation();
    setSelectedGlyphCanvasId(prevId => prevId === canvasId ? null : canvasId);
  };
  
  const handleCanvasClick = () => {
    if (isBugaModeActive) return; 
    setSelectedGlyphCanvasId(null); 
  };

  const updateGlyphParameter = (canvasId: string, param: keyof PlacedComposerGlyph, value: any) => {
    if (isBugaModeActive) return;
    setPlacedGlyphs(prevGlyphs =>
      prevGlyphs.map(glyph =>
        glyph.canvasId === canvasId ? { ...glyph, [param]: value } : glyph
      )
    );
  };
  
  const selectedGlyphDetails = !isBugaModeActive ? placedGlyphs.find(g => g.canvasId === selectedGlyphCanvasId) : null;

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, glyph: ComposerGlyph | BugaGlyph, isBugaGlyphFlag: boolean) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ ...glyph, isBugaGlyph: isBugaGlyphFlag }));
  };

  const handleDragOver = (event: React.DragEvent<SVGSVGElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<SVGSVGElement>) => {
    event.preventDefault();
    const dataString = event.dataTransfer.getData('application/json');
    if (!dataString || !svgRef.current) return;
    
    let droppedItemData: (ComposerGlyph | BugaGlyph) & { isBugaGlyph: boolean };
    try {
      droppedItemData = JSON.parse(dataString) as (ComposerGlyph | BugaGlyph) & { isBugaGlyph: boolean };
    } catch (e) {
      console.warn("Invalid drop data parsed in GlyphComposerPanel:", e);
      return;
    }
    
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const { x: svgX, y: svgY } = svgPoint.matrixTransform(ctm.inverse());

    if (droppedItemData.isBugaGlyph && isBugaModeActive) { // Ensure Buga drop only in Buga mode
        const bugaGlyph = droppedItemData as BugaGlyph;
        let closestSlotIndex = -1;
        let minDistanceToSlot = Infinity;
        const SNAP_THRESHOLD_BUGA = 20;

        ALL_BUGA_ELEMENTS_ORDERED.forEach((slotTemplate, index) => {
            const slotPos = bugaSlotPositions[slotTemplate.position];
            if (slotPos) {
                const dist = Math.hypot(svgX - slotPos.x, svgY - slotPos.y);
                // Check type compatibility for placement (coding vs separator)
                if (dist < minDistanceToSlot && dist < SNAP_THRESHOLD_BUGA && slotTemplate.type === bugaGlyph.type) {
                    minDistanceToSlot = dist;
                    closestSlotIndex = index;
                }
            }
        });
        
        if (closestSlotIndex !== -1 && !bugaSequenceSlots[closestSlotIndex]) { 
            const slotTemplate = ALL_BUGA_ELEMENTS_ORDERED[closestSlotIndex];
            setBugaSequenceSlots(prevSlots => {
                const newSlots = [...prevSlots];
                newSlots[closestSlotIndex] = { ...bugaGlyph, canvasId: `buga-${bugaGlyph.id}-${Date.now()}` };
                return newSlots;
            });
            addEchoMessage(AgentName.GlyphComposerAgent, `${bugaGlyph.id} (Type: ${bugaGlyph.type}) placed in Buga slot P${slotTemplate.position}.`, AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass);
        } else if (closestSlotIndex !== -1 && bugaSequenceSlots[closestSlotIndex]) {
            addEchoMessage(AgentName.GlyphComposerAgent, `Buga slot P${ALL_BUGA_ELEMENTS_ORDERED[closestSlotIndex].position} is already occupied.`, 'text-yellow-400');
        } else if (closestSlotIndex !== -1 && bugaSequenceSlots[closestSlotIndex]?.type !== bugaGlyph.type) {
             addEchoMessage(AgentName.GlyphComposerAgent, `Cannot place ${bugaGlyph.type} glyph in a ${bugaSequenceSlots[closestSlotIndex]?.type} slot.`, 'text-orange-400');
        }


    } else if (!droppedItemData.isBugaGlyph && !isBugaModeActive) { // DATACHEGA Mode Drop
        const glyph = droppedItemData as ComposerGlyph;
        let closestRing = -1;
        let minDistance = Infinity;
        const SNAP_THRESHOLD = 25; 

        ringRadii.forEach((radius, index) => {
          const dist = Math.abs(Math.sqrt((svgX - canvasCenter.x) ** 2 + (svgY - canvasCenter.y) ** 2) - radius);
          if (dist < minDistance && dist < SNAP_THRESHOLD) { 
            minDistance = dist;
            closestRing = index;
          }
        });
        
        if (closestRing === -1) {
            const distToCenter = Math.sqrt((svgX - canvasCenter.x) ** 2 + (svgY - canvasCenter.y) ** 2);
            if (distToCenter < coreRadius * 0.8) { 
                 const newPlacedGlyph: PlacedComposerGlyph = {
                    ...glyph,
                    canvasId: `placed-${glyph.id}-${Date.now()}`,
                    x: canvasCenter.x,
                    y: canvasCenter.y,
                    ring: -1, 
                    sequenceOrder: 0, 
                    amplitude: 1.0, phaseOffset: 0, resonanceBand: "Core Harmonic",
                };
                setPlacedGlyphs(prev => [...prev, newPlacedGlyph]);
                addEchoMessage(AgentName.GlyphComposerAgent, `${glyph.name} placed into Core Node.`, AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass);
                return;
            }
        }

        if (closestRing !== -1) {
          const angle = Math.atan2(svgY - canvasCenter.y, svgX - canvasCenter.x);
          const ring = closestRing;
          const glyphsOnRing = placedGlyphs.filter(g => g.ring === ring).length;

          const newPlacedGlyph: PlacedComposerGlyph = {
            ...glyph,
            canvasId: `placed-${glyph.id}-${Date.now()}`,
            x: canvasCenter.x + ringRadii[ring] * Math.cos(angle),
            y: canvasCenter.y + ringRadii[ring] * Math.sin(angle),
            ring: ring,
            sequenceOrder: glyphsOnRing, 
            amplitude: 1.0, 
            phaseOffset: 0, 
            resonanceBand: "Standard Harmonic Field",
          };
          setPlacedGlyphs(prev => [...prev, newPlacedGlyph]);
          addEchoMessage(AgentName.GlyphComposerAgent, `${glyph.name} placed on Ring ${ring + 1}.`, AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass);
        }
    }
  };

  const initiateSimulation = () => {
    if (isSimulating) return;
    if (!isBugaModeActive && placedGlyphs.length === 0) {
        addEchoMessage(AgentName.GlyphComposerAgent, 'Canvas is empty. Place glyphs to initiate sequence.', 'text-yellow-400');
        return;
    }
    if (isBugaModeActive && bugaSequenceSlots.every(slot => slot === null)) {
        addEchoMessage(AgentName.GlyphComposerAgent, 'Buga track is empty. Place Buga glyphs to initiate synthesis.', 'text-yellow-400');
        return;
    }

    setIsSimulating(true);
    setSimulationStep(0);
    
    if (isBugaModeActive) {
        const filledCodingSlots = bugaSequenceSlots.filter(s => s && s.type === 'coding').length;
        const harmonyFromSlots = filledCodingSlots * 0.015; 
        setCurrentEntropyVisual({ chaos: Math.max(0.1, 0.7 - harmonyFromSlots), harmony: Math.min(0.9, 0.3 + harmonyFromSlots) });
        setCurrentProbability(0.1 + harmonyFromSlots * 2);
    } else {
        const initialChaos = 0.8 - (placedGlyphs.reduce((sum, g) => sum + (g.amplitude || 1), 0) / Math.max(1, placedGlyphs.length)) * 0.1;
        setCurrentEntropyVisual({ chaos: Math.max(0.1, initialChaos), harmony: 1 - Math.max(0.1, initialChaos) });
        setCurrentProbability(0.1 + (placedGlyphs.length * 0.02)); 
    }
    addEchoMessage(AgentName.GlyphComposerAgent, `Initiating "${ritualName}" sequence simulation... Intention: "${seekerIntention || 'None specified'}"`, AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass);
  };

  const clearCanvas = () => {
    setPlacedGlyphs([]);
    setBugaSequenceSlots(new Array(ALL_BUGA_ELEMENTS_ORDERED.length).fill(null));
    setSelectedGlyphCanvasId(null);
    setIsSimulating(false);
    setSimulationStep(0);
    setCurrentEntropyVisual({ chaos: 0.8, harmony: 0.2 });
    setCurrentProbability(0.1);
    if (isBugaModeActive) {
        setRitualName("Buga Peptide Synthesis");
        setSeekerIntention("Simulating bioharmonic key KNKNTTTTRSRSIIMIQHQHPPPP");
    } else {
        setRitualName("Untitled Harmonic Sequence");
        setSeekerIntention("");
    }
    addEchoMessage(AgentName.GlyphComposerAgent, 'Composition canvas cleared.', AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass);
  };

  const saveToGrimoire = () => {
    if (isBugaModeActive) {
         addEchoMessage(AgentName.GlyphComposerAgent, 'Buga Mode sequences are archetypal, not saved to personal Grimoire.', AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass, false);
        return;
    }
    if (placedGlyphs.length === 0) {
        addEchoMessage(AgentName.GlyphComposerAgent, 'Cannot save an empty ritual to Grimoire.', AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass, false);
        return;
    }

    const ritualToSave: GrimoireRitualEntry = {
        ritualId: `grimoire-${Date.now()}-${Math.random().toString(16).slice(2,8)}`,
        ritualName: ritualName || "Untitled Harmonic Sequence",
        placedGlyphsData: placedGlyphs.map(pg => ({
            id: pg.id, 
            name: pg.name,
            category: pg.category,
            symbol: pg.symbol,
            x: pg.x,
            y: pg.y,
            ring: pg.ring,
            sequenceOrder: pg.sequenceOrder,
            amplitude: pg.amplitude, 
            phaseOffset: pg.phaseOffset,
            resonanceBand: pg.resonanceBand,
        })),
        connectionCount: 0, 
        intention: seekerIntention || "Not specified",
        timestamp: Date.now(),
        resonanceSnapshot: {
            probability: currentProbability,
            harmony: currentEntropyVisual.harmony,
            chaos: currentEntropyVisual.chaos,
        },
    };

    try {
        const existingGrimoire = JSON.parse(localStorage.getItem(GRIMOIRE_STORAGE_KEY) || '[]') as GrimoireRitualEntry[];
        existingGrimoire.push(ritualToSave);
        localStorage.setItem(GRIMOIRE_STORAGE_KEY, JSON.stringify(existingGrimoire));
        
        addEchoMessage(
            AgentName.GlyphComposerAgent, 
            `Ritual "${ritualToSave.ritualName}" saved to Grimoire.`, 
            AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass,
            false,
            { eventType: HistoricalEventType.DATACHEGA_RITUAL_SAVED, eventData: ritualToSave }
        );
    } catch (error) {
        console.error("Failed to save ritual to Grimoire:", error);
        addEchoMessage(
            AgentName.GlyphComposerAgent, 
            `Error saving ritual "${ritualToSave.ritualName}" to Grimoire.`, 
            'text-rose-400',
            false
        );
    }
  };

  useEffect(() => {
    let timerId: number | undefined; 
    const totalSteps = isBugaModeActive ? activeCodingGlyphsInBuga.length : placedGlyphs.length;

    if (isSimulating && simulationStep < totalSteps + 2) { 
      timerId = window.setTimeout(() => { 
        setSimulationStep(prev => prev + 1);
        if (totalSteps > 0 && simulationStep < totalSteps) {
            const progress = (simulationStep + 1) / totalSteps;
            if (isBugaModeActive) {
                const currentBugaGlyph = activeCodingGlyphsInBuga[simulationStep]; 
                if (currentBugaGlyph) {
                    let harmonyChange = 0.02;
                    if (currentBugaGlyph.chargeType === 'basic') harmonyChange += 0.01;
                    if (currentBugaGlyph.predictedFold === 'PPII_helix') harmonyChange += 0.015;
                    if (currentBugaGlyph.id === 'G15') harmonyChange += 0.1; 

                    setCurrentEntropyVisual(prev => ({
                        chaos: Math.max(0.05, prev.chaos - harmonyChange * 0.8),
                        harmony: Math.min(0.95, prev.harmony + harmonyChange),
                    }));
                    setCurrentProbability(prev => Math.min(0.98, prev + 0.03 * harmonyChange * 5));
                }
            } else { 
                const avgAmplitude = placedGlyphs.reduce((sum, g) => sum + (g.amplitude || 1), 0) / Math.max(1, placedGlyphs.length);
                const phases = placedGlyphs.map(g => (g.phaseOffset || 0) % 360);
                const avgPhase = phases.reduce((sum, p) => sum + p, 0) / Math.max(1, phases.length);
                const phaseVariance = phases.reduce((sum, p) => sum + Math.pow(p - avgPhase, 2), 0) / Math.max(1, phases.length);
                const phaseStdDev = Math.sqrt(phaseVariance);
                const phaseHarmonyFactor = Math.max(0.2, 1 - (phaseStdDev / 180));
                const uniqueBands = new Set(placedGlyphs.map(g => g.resonanceBand?.toLowerCase().trim() || "default"));
                const bandSynergyFactor = uniqueBands.size <= Math.max(1, placedGlyphs.length / 3) ? 1.15 : (uniqueBands.size <= Math.max(2, placedGlyphs.length / 2) ? 1.0 : 0.85);

                setCurrentEntropyVisual({
                    chaos: Math.max(0.05, 0.8 - 0.75 * progress * avgAmplitude * bandSynergyFactor * phaseHarmonyFactor ),
                    harmony: Math.min(0.95, 0.2 + 0.75 * progress * avgAmplitude * bandSynergyFactor * phaseHarmonyFactor ),
                });
                setCurrentProbability(Math.min(0.98, 0.05 + 0.93 * progress * avgAmplitude * bandSynergyFactor * phaseHarmonyFactor));
            }
        }

        if (simulationStep >= totalSteps) { 
            if (simulationStep === totalSteps) { 
                addEchoMessage(AgentName.GlyphComposerAgent, 'Sequence processing... Core integrating resonance.', AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass);
            } else if (simulationStep === totalSteps + 1) { 
                addEchoMessage(AgentName.GlyphComposerAgent, `Sequence "${ritualName}" simulation complete. Outcome Probability: ${((currentProbability || 0)*100).toFixed(1)}%. Harmony: ${((currentEntropyVisual?.harmony || 0)*100).toFixed(0)}%.`, AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass);
                setIsSimulating(false);
            }
        }
      }, isBugaModeActive ? 100 : 350); 
    } else if (isSimulating && totalSteps === 0 && simulationStep < 2) { 
        timerId = window.setTimeout(() => { 
             setSimulationStep(prev => prev + 1);
             if (simulationStep === 0) {
                 addEchoMessage(AgentName.GlyphComposerAgent, 'Core pulse initiated on empty canvas...', AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass);
             } else if (simulationStep === 1) {
                  addEchoMessage(AgentName.GlyphComposerAgent, 'Empty sequence "simulation" complete. No harmonic shift.', AGENT_PROFILES[AgentName.GlyphComposerAgent]?.colorClass);
                  setIsSimulating(false);
             }
        }, 500);
    }
    return () => {
        if (timerId !== undefined) {
            window.clearTimeout(timerId); 
        }
    };
  }, [isSimulating, simulationStep, placedGlyphs, isBugaModeActive, ritualName, currentEntropyVisual.harmony, currentProbability, bugaSequenceSlots, activeCodingGlyphsInBuga]);

  const getBugaGlyphColorClasses = (glyph: BugaGlyph, isActive: boolean, isProcessed: boolean): string => {
    if (glyph.type === 'separator') {
        return isActive ? 'text-lime-200 bg-lime-800/70 border-lime-500' : 
               'text-slate-400 bg-slate-700/60 border-slate-600';
    }
    // Coding Glyphs
    let baseColor = 'text-slate-300 bg-slate-800/50 border-slate-700';
    switch (glyph.chargeType) {
      case 'basic': baseColor = 'text-sky-300 bg-sky-900/60 border-sky-700'; break;
      case 'polar': baseColor = 'text-emerald-300 bg-emerald-900/60 border-emerald-700'; break;
      case 'nonpolar': baseColor = 'text-amber-300 bg-amber-900/60 border-amber-700'; break;
      default: baseColor = 'text-gray-400 bg-gray-800/60 border-gray-700'; break;
    }
    
    if (isActive) {
        if (glyph.id === 'G15') return 'text-yellow-100 bg-red-700/80 border-red-500 ring-2 ring-red-400'; 
        return `${baseColor.split(' ')[0]} ${baseColor.split(' ')[1].replace('/60', '/80')} border-yellow-400 ring-1 ring-yellow-300`;
    }
    if (isProcessed) {
        return `${baseColor.split(' ')[0]} ${baseColor.split(' ')[1].replace('/60', '/70')} border-lime-600`;
    }
    return baseColor;
  };
  
  const isBugaLegConnectionActive = (targetGlyphId: string): boolean => {
    if (!isSimulating || !isBugaModeActive) return false;

    const currentlyProcessingCodingGlyphIndex = bugaSequenceSlots.findIndex(
        (slot, index) => slot?.type === 'coding' && index === simulationStep
    );
    if (currentlyProcessingCodingGlyphIndex === -1 && simulationStep >= bugaSequenceSlots.filter(s=>s?.type === 'coding').length) {
        
        const lastCodingGlyph = bugaSequenceSlots.slice().reverse().find(s => s?.type === 'coding');
        if (!lastCodingGlyph) return false;

        const targetSeparator = SEPARATOR_GLYPH_DATA.find(s => s.id === targetGlyphId);
        if (!targetSeparator) return false;
        
        const nextSeparatorAfterTarget = SEPARATOR_GLYPH_DATA.find(s => s.position > targetSeparator.position);
        const lastCodingGlyphPosition = ALL_BUGA_ELEMENTS_ORDERED.find(el => el.id === lastCodingGlyph.id)?.position;

        if (lastCodingGlyphPosition && lastCodingGlyphPosition > targetSeparator.position && 
            (!nextSeparatorAfterTarget || lastCodingGlyphPosition < nextSeparatorAfterTarget.position)) {
            return true;
        }
        return false;
    }

    const currentCodingGlyph = bugaSequenceSlots[currentlyProcessingCodingGlyphIndex];
    if (!currentCodingGlyph || currentCodingGlyph.type !== 'coding') return false;
    
    const targetIsSeparator = SEPARATOR_GLYPH_DATA.some(s => s.id === targetGlyphId);
    if (targetIsSeparator) {
        const targetSeparator = SEPARATOR_GLYPH_DATA.find(s => s.id === targetGlyphId)!;
        const currentCodingGlyphOriginalPosition = ALL_BUGA_ELEMENTS_ORDERED.find(el => el.id === currentCodingGlyph.id)?.position;
        if (!currentCodingGlyphOriginalPosition) return false;

        const nextSeparatorAfterTargetIndex = SEPARATOR_GLYPH_DATA.findIndex(s => s.position > targetSeparator.position);
        const nextSeparatorAfterTarget = nextSeparatorAfterTargetIndex !== -1 ? SEPARATOR_GLYPH_DATA[nextSeparatorAfterTargetIndex] : { position: 31 }; 

        return currentCodingGlyphOriginalPosition > targetSeparator.position && currentCodingGlyphOriginalPosition < nextSeparatorAfterTarget.position;

    } else { 
        return currentCodingGlyph.id === targetGlyphId;
    }
  };

  const currentBugaPeptideDisplay = useMemo(() => {
    if (!isBugaModeActive) return BUGA_GLYPH_PEPTIDE_SEQUENCE; 
    return bugaSequenceSlots
        .map(slot => slot && slot.type === 'coding' ? slot.aminoAcid || '_' : null)
        .filter(aa => aa !== null)
        .join('');
  }, [isBugaModeActive, bugaSequenceSlots]);

  const panelBorderColor = isBugaModeActive ? 'border-lime-500/50' : 'border-fuchsia-600/50';
  const panelTitleColor = isBugaModeActive ? 'text-lime-300' : 'text-fuchsia-300';
  const panelTitleShadow = isBugaModeActive ? 'drop-shadow-[0_1px_1px_rgba(132,204,22,0.4)]' : 'drop-shadow-[0_1px_1px_rgba(217,70,239,0.4)]';

  return (
    <div className={`glyph-composer-panel bg-slate-950/80 backdrop-blur-xl ${panelBorderColor} rounded-xl shadow-2xl p-4 text-slate-100 my-4 flex flex-col`} style={{ width: `${GLYPH_COMPOSER_PANEL_WIDTH_CONST}px`, height: `${GLYPH_COMPOSER_PANEL_HEIGHT_CONST}px`}}>
      <div className="flex justify-between items-center mb-1">
        <h3 className={`text-2xl font-['Cinzel'] font-bold ${panelTitleColor} tracking-wider ${panelTitleShadow}`}>
          Glyph Composer: {isBugaModeActive ? "Buga Peptide Synthesis" : "The Harmonic Forge"}
        </h3>
      </div>
      <p className={`text-center text-xs italic ${isBugaModeActive ? 'text-lime-300/80' : 'text-fuchsia-300/80'} mb-2`}>
        Module Ω.037 :: {isBugaModeActive ? "Bio-Resonance Encoding" : "DATACHEGA RESTHET Interface"}
      </p>
      
      <input 
        type="text"
        value={ritualName}
        onChange={(e) => setRitualName(e.target.value)}
        placeholder="Ritual Sequence Name"
        className="w-full p-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:ring-1 focus:ring-fuchsia-500 placeholder-slate-500 mb-1 text-center font-cinzel"
        aria-label="Ritual Sequence Name"
        disabled={isBugaModeActive || isSimulating}
      />
      <Textarea
        value={seekerIntention}
        onChange={(e) => setSeekerIntention(e.target.value)}
        placeholder="Describe the ritual's intention..."
        className="w-full p-1.5 text-xs bg-slate-800 border border-slate-700 rounded-md text-slate-100 focus:ring-1 focus:ring-fuchsia-500 placeholder-slate-500 mb-2 h-12"
        aria-label="Ritual Intention"
        rows={2}
        disabled={isBugaModeActive || isSimulating}
      />

      <div className="flex gap-3 flex-grow" style={{ minHeight: 0 }}>
        <div className="w-1/4 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 overflow-y-auto custom-scrollbar">
           <h4 className={`text-sm font-cinzel ${isBugaModeActive ? 'text-lime-200' : 'text-fuchsia-200'} mb-2 sticky top-0 bg-slate-800/95 backdrop-blur-sm py-1 z-10`}>
            {isBugaModeActive ? "Buga Glycotheca" : "Glyph Library"}
          </h4>
          {isBugaModeActive ? (
             <div className="space-y-1">
              {[...SEPARATOR_GLYPH_DATA, ...BUGA_GLYPH_LIBRARY].map(glyphItem => (
                 <div key={glyphItem.id} draggable onDragStart={(e) => handleDragStart(e, glyphItem, true)}
                      className={`p-1.5 rounded-md text-xs cursor-grab ${getBugaGlyphColorClasses(glyphItem, false, false)} hover:ring-1 hover:ring-lime-300`}
                      title={`${glyphItem.type === 'coding' ? `${glyphItem.aminoAcidFullName} (${glyphItem.aminoAcid})` : glyphItem.description || ''} - ${glyphItem.iconicity}`}>
                   <span className="font-bold mr-1">{glyphItem.symbol || glyphItem.aminoAcid}</span> {glyphItem.id} {glyphItem.type === 'coding' ? `(${glyphItem.aminoAcid})` : `(P${glyphItem.position})`}
                   {glyphItem.type === 'coding' && <span className="text-[9px] opacity-70 ml-1">{glyphItem.binaryCode}</span>}
                 </div>
              ))}
            </div>
          ) : (
            GLYPH_CATEGORIES_DATA.map(categoryData => (
              <div key={categoryData.category} className="mb-2">
                <h5 className={`text-xs font-semibold ${categoryData.colorCode.split(' ')[1]} mb-1 flex items-center`}><i className={`${categoryData.paletteIcon} mr-1`}></i>{categoryData.category}</h5>
                {categoryData.glyphs.map(glyphItem => (
                  <div
                    key={glyphItem.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, glyphItem, false)}
                    className={`p-1.5 mb-1 rounded-md cursor-grab hover:opacity-100 opacity-80 transition-opacity text-xs ${categoryData.colorCode.replace('border-', 'bg-').replace('text-', 'text-')} hover:ring-2 ring-offset-1 ring-offset-slate-800 ${categoryData.colorCode.split(' ')[0]}`}
                    title={glyphItem.name}
                  >
                    <span className="font-bold mr-1">{glyphItem.symbol}</span> {glyphItem.name}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        
        <div className="w-1/2 bg-black/40 rounded-lg border border-slate-700 relative flex items-center justify-center p-1 overflow-hidden">
          <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} onDragOver={handleDragOver} onDrop={handleDrop} onClick={handleCanvasClick}>
            <defs>
                <radialGradient id="composerCoreGlowPanel" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={isSimulating && simulationStep > (isBugaModeActive ? bugaSequenceSlots.filter(s=>s?.type==='coding').length : placedGlyphs.length) ? "rgba(255, 220, 150, 0.9)" : "rgba(220, 200, 255, 0.7)"} /><stop offset="70%" stopColor={isSimulating && simulationStep > (isBugaModeActive ? bugaSequenceSlots.filter(s=>s?.type==='coding').length : placedGlyphs.length) ? "rgba(200, 150, 100, 0.5)" : "rgba(180, 160, 230, 0.3)"} /><stop offset="100%" stopColor={isSimulating && simulationStep > (isBugaModeActive ? bugaSequenceSlots.filter(s=>s?.type==='coding').length : placedGlyphs.length) ? "rgba(150, 100, 50, 0)" : "rgba(120, 100, 200, 0)"} /></radialGradient>
                <filter id="composerGlyphGlowPanel"><feGaussianBlur stdDeviation="2.5" result="blur" /><feColorMatrix values="1.2 0 0 0 0 0 1.2 0 0 0 0 0 1.5 0 0 0 0 0 1 0" in="blur" result="matrix" /><feComposite in="matrix" in2="SourceGraphic" operator="atop"/></filter>
                <filter id="selectedGlyphHighlight" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" /><feFlood floodColor="rgba(236, 72, 153, 0.8)" result="color" /><feComposite in="color" in2="blur" operator="in" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="copperLegGlow"><feGaussianBlur stdDeviation="1.5" result="blur" /><feColorMatrix in="blur" mode="matrix" values="1.1 0 0 0 0  0 0.8 0 0 0  0 0 0.3 0 0  0 0 0 20 -7" result="glowCopper" /><feComposite in="glowCopper" in2="SourceGraphic" operator="over" /></filter>
                <filter id="activeGlyphSurge"><feGaussianBlur stdDeviation="1" result="blur"/><feColorMatrix type="matrix" values="1.5 0 0 0 -0.1  0 1.5 0 0 -0.1  0 0 1.8 0 -0.2  0 0 0 1 0 "/></filter>
            </defs>
            {(isBugaModeActive ? [bugaRingRadius] : ringRadii).map((r, i) => <circle key={`ring-comp-${i}`} cx={canvasCenter.x} cy={canvasCenter.y} r={r} fill="none" stroke={isBugaModeActive ? "rgba(100,180,130,0.25)" : "rgba(120,100,180,0.2)"} strokeWidth="0.75" strokeDasharray={isBugaModeActive ? "3 3" : "none"} />)}
            
            <circle cx={canvasCenter.x} cy={canvasCenter.y} r={coreRadius} fill="url(#composerCoreGlowPanel)" className={`${(isSimulating && simulationStep > (isBugaModeActive ? bugaSequenceSlots.filter(s=>s?.type==='coding').length : placedGlyphs.length)) || (isBugaModeActive && isSimulating && simulationStep === bugaSequenceSlots.filter(s=>s?.type==='coding').length +1) ? 'animate-pulse-fast' : 'animate-pulse-opacity'}`} />
            <path d={`M${canvasCenter.x},${canvasCenter.y-coreRadius*0.6} L${canvasCenter.x+coreRadius*0.52},${canvasCenter.y-coreRadius*0.3} L${canvasCenter.x+coreRadius*0.52},${canvasCenter.y+coreRadius*0.3} L${canvasCenter.x},${canvasCenter.y+coreRadius*0.6} L${canvasCenter.x-coreRadius*0.52},${canvasCenter.y+coreRadius*0.3} L${canvasCenter.x-coreRadius*0.52},${canvasCenter.y-coreRadius*0.3} Z`}
                  fill={isBugaModeActive ? "rgba(60,100,80,0.7)" : "rgba(80,60,130,0.7)"} stroke={isBugaModeActive ? "rgba(180,230,200,0.4)" : "rgba(200,180,255,0.4)"} strokeWidth="1"/>
            
            {isBugaModeActive ? (
                <>
                    {bugaSequenceSlots.map((slotGlyph, slotIndex) => {
                        if (!slotGlyph) return null;
                        const targetGlyphItem = slotGlyph;
                        const slotDefinition = ALL_BUGA_ELEMENTS_ORDERED[slotIndex];
                        const pos = bugaSlotPositions[slotDefinition.position];
                        if (!pos) return null;
                        const { x: gx, y: gy, angle } = pos;

                        const shouldDrawLongCardinal = targetGlyphItem.isTargetedByLongCardinal;
                        const shouldDrawForked = targetGlyphItem.isTargetedByForkedCopper;
                        if (!shouldDrawLongCardinal && !shouldDrawForked) return null;
                        
                        const legActive = isBugaLegConnectionActive(targetGlyphItem.id);
                        
                        let strokeColor = shouldDrawLongCardinal ? "rgba(184, 104, 44, 0.5)" : "rgba(210, 130, 60, 0.45)";
                        let strokeWidth = shouldDrawLongCardinal ? 1.3 : 0.9;
                        let dashArray = "3,2";
                        let filterUrl = legActive ? "url(#copperLegGlow)" : "none";
                        let animClass = legActive ? 'animate-pulse-opacity' : '';
                        let animDuration = legActive ? '0.8s' : 'none';

                        if (legActive) {
                            strokeColor = shouldDrawLongCardinal ? "rgba(255, 160, 60, 1)" : "rgba(255, 190, 100, 0.9)"; 
                            strokeWidth = shouldDrawLongCardinal ? 2.5 : 2.0;
                            if (targetGlyphItem.chargeType === 'basic' && shouldDrawForked) {
                                strokeColor = "rgba(135, 206, 250, 0.95)";
                            }
                            dashArray = "none";
                        }

                        return (
                            <g key={`leg-to-slot-${slotIndex}`}>
                                <line x1={canvasCenter.x} y1={canvasCenter.y} x2={gx} y2={gy} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={dashArray} className={animClass} style={{animationDuration: animDuration}} filter={filterUrl}/>
                                {shouldDrawForked && (
                                    <>
                                        <line x1={gx} y1={gy} x2={gx + Math.cos(angle - Math.PI/16) * 12} y2={gy + Math.sin(angle - Math.PI/16) * 12} stroke={strokeColor} strokeWidth={strokeWidth*0.65} strokeDasharray={dashArray} className={animClass} style={{animationDuration: animDuration}} filter={filterUrl} />
                                        <line x1={gx} y1={gy} x2={gx + Math.cos(angle + Math.PI/16) * 12} y2={gy + Math.sin(angle + Math.PI/16) * 12} stroke={strokeColor} strokeWidth={strokeWidth*0.65} strokeDasharray={dashArray} className={animClass} style={{animationDuration: animDuration}} filter={filterUrl} />
                                    </>
                                )}
                            </g>
                        );
                    })}

                    {bugaSequenceSlots.map((glyphInSlot, index) => {
                        const slotDefinition = ALL_BUGA_ELEMENTS_ORDERED[index];
                        const pos = bugaSlotPositions[slotDefinition.position];
                        if (!pos) return null;
                        const { x, y } = pos;

                        if (glyphInSlot) { 
                            const isActiveGlyph = isSimulating && 
                                                (glyphInSlot.type === 'coding' && activeCodingGlyphsInBuga[simulationStep]?.id === glyphInSlot.id && ALL_BUGA_ELEMENTS_ORDERED.findIndex(el => el.id === glyphInSlot.id && el.position === slotDefinition.position) === bugaSequenceSlots.findIndex(s => s?.id === glyphInSlot.id)) ||
                                                (glyphInSlot.type === 'separator' && isBugaLegConnectionActive(glyphInSlot.id));

                            const isProcessedGlyph = isSimulating && glyphInSlot.type === 'coding' && activeCodingGlyphsInBuga.findIndex(g => g.id === glyphInSlot.id) < simulationStep;
                            
                            const colorClasses = getBugaGlyphColorClasses(glyphInSlot, isActiveGlyph, isProcessedGlyph);
                            const glyphBaseRadius = glyphInSlot.type === 'separator' ? 5 : 8;
                            const glyphRenderRadius = isActiveGlyph ? glyphBaseRadius * 1.5 : glyphBaseRadius;
                            
                            return(
                                <g key={glyphInSlot.canvasId || `slotglyph-${index}`} transform={`translate(${x}, ${y})`}>
                                    <circle r={glyphRenderRadius} className={`${colorClasses.split(' ')[1]} ${colorClasses.split(' ')[2]}`} strokeWidth={isActiveGlyph ? 1.5 : 0.8} style={{animationDuration: isActiveGlyph ? (glyphInSlot.id === 'G15' ? '0.7s' : '1s') : 'none'}} filter={isActiveGlyph ? 'url(#activeGlyphSurge)' : (isProcessedGlyph ? 'url(#composerGlyphGlowPanel)' : 'none')}/>
                                    <text textAnchor="middle" dy={glyphInSlot.type === 'separator' ? "2" : "2.5"} fontSize={glyphInSlot.type === 'separator' ? "6px" : "7.5px"} className={`${colorClasses.split(' ')[0]} font-bold pointer-events-none select-none`}>{glyphInSlot.symbol || glyphInSlot.aminoAcid}</text>
                                    <title>{glyphInSlot.id}: {glyphInSlot.type === 'coding' ? `${glyphInSlot.aminoAcidFullName} (${glyphInSlot.aminoAcid})` : glyphInSlot.description} - P{slotDefinition.position} - {glyphInSlot.iconicity}</title>
                                </g>
                            );
                        } else { 
                            return (
                                <circle key={`empty-slot-${index}`} cx={x} cy={y} r="6" fill="rgba(80,80,100,0.15)" stroke="rgba(120,120,150,0.2)" strokeWidth="0.5" strokeDasharray="2,2" />
                            );
                        }
                    })}
                </>
            ) : ( 
                placedGlyphs.map((currentGlyphItem) => { 
                    const categoryInfo = GLYPH_CATEGORIES_DATA.find(c => c.category === currentGlyphItem.category);
                    const glyphAnimOrder = currentGlyphItem.ring * 10 + currentGlyphItem.sequenceOrder; 
                    const isActiveGlyph = isSimulating && simulationStep === glyphAnimOrder; 
                    const isProcessedGlyph = isSimulating && simulationStep > glyphAnimOrder && simulationStep <= placedGlyphs.length;
                    const isSelectedGlyph = currentGlyphItem.canvasId === selectedGlyphCanvasId;
                    return (
                        <g key={currentGlyphItem.canvasId} transform={`translate(${currentGlyphItem.x}, ${currentGlyphItem.y})`} onClick={(e) => handleGlyphClick(e, currentGlyphItem.canvasId)} className="cursor-pointer">
                            {isActiveGlyph && <line x1="0" y1="0" x2={canvasCenter.x - currentGlyphItem.x} y2={canvasCenter.y - currentGlyphItem.y} stroke={categoryInfo?.colorCode.split(' ')[1] || 'rgba(220,200,255,0.5)'} strokeWidth="0.5" strokeDasharray="2,2" className="animate-pulse-fast"/>}
                            <circle r="10" fill={isProcessedGlyph ? (categoryInfo?.colorCode.replace('border-','bg-').split(' ')[0] + '/70') : (categoryInfo?.colorCode.replace('border-','bg-').split(' ')[0] + '/40')} stroke={isSelectedGlyph ? 'rgba(236, 72, 153, 0.9)' : (categoryInfo?.colorCode.split(' ')[0] || 'grey')} strokeWidth={isSelectedGlyph ? 2 : 1} className={isActiveGlyph ? 'animate-ping-slow' : ''} filter={isActiveGlyph ? 'url(#composerGlyphGlowPanel)' : (isSelectedGlyph ? 'url(#selectedGlyphHighlight)' : 'none')} />
                            <text textAnchor="middle" dy="3" fontSize="10px" fill={isActiveGlyph ? "white" : (categoryInfo?.colorCode.split(' ')[1] || 'rgba(200,200,255,0.7)')} className="font-bold pointer-events-none">{currentGlyphItem.symbol}</text>
                            <title>{currentGlyphItem.name} - {currentGlyphItem.category}\nAmp: {currentGlyphItem.amplitude?.toFixed(1) || '0.0'}, Phase: {currentGlyphItem.phaseOffset}°\nBand: {currentGlyphItem.resonanceBand}</title>
                        </g>
                    );
                })
            )}
          </svg>
        </div>
        
        <div className="w-1/4 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 overflow-y-auto custom-scrollbar">
          <h4 className={`text-sm font-cinzel ${isBugaModeActive ? 'text-lime-200' : 'text-fuchsia-200'} mb-2 sticky top-0 bg-slate-800/95 backdrop-blur-sm py-1 z-10`}>Harmonic Analysis</h4>
          <div className="text-xs space-y-1.5">
            <div>
              <label className="block text-slate-400 text-[10px] mb-0.5">{isBugaModeActive ? "Peptide Stability (Chaos/Harmony)" : "Entropy/Harmony:"}</label>
              <div className="w-full h-3 bg-slate-700 rounded-full flex overflow-hidden">
                <div className="bg-rose-500 transition-all duration-300" style={{ width: `${(currentEntropyVisual?.chaos || 0) * 100}%` }} title={`Chaos/Instability: ${((currentEntropyVisual?.chaos || 0)*100).toFixed(0)}%`}></div>
                <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${(currentEntropyVisual?.harmony || 0) * 100}%` }} title={`Harmony/Stability: ${((currentEntropyVisual?.harmony || 0)*100).toFixed(0)}%`}></div>
              </div>
            </div>
            <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">{isBugaModeActive ? "Folding Prediction Waveform" : "Harmonic Oscilloscope:"}</label>
                <div className="w-full h-8 bg-black/50 rounded border border-slate-600 flex items-center justify-center overflow-hidden">
                    <svg width="100%" height="100%" viewBox="0 0 100 25"> 
                        <path d={`M0,12.5 C${20 + currentEntropyVisual.harmony*20},${5 + currentEntropyVisual.chaos*8} ${40 - currentEntropyVisual.harmony*10},${20 - currentEntropyVisual.chaos*8} 50,12.5 S${70 + currentEntropyVisual.chaos*5},${5 + currentEntropyVisual.harmony*8} 100,${12.5 - currentEntropyVisual.harmony*3 + currentEntropyVisual.chaos*3}`} 
                              stroke={currentProbability > 0.7 ? "gold" : (currentProbability > 0.4 ? "violet" : "azure")} 
                              strokeWidth="0.8" fill="none" className="transition-all duration-300"
                        />
                    </svg>
                </div>
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] mb-0.5">{isBugaModeActive ? "Bioactivity Score %" : "Outcome Probability:"}</label>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden"> 
                <div className="bg-sky-500 transition-all duration-300 h-full" style={{ width: `${currentProbability * 100}%` }}></div>
              </div>
              <p className="text-center text-slate-300 mt-0.5 text-[10px]">{((currentProbability || 0) * 100).toFixed(1)}%</p>
            </div>
          </div>
          {!isBugaModeActive && selectedGlyphDetails && (
            <GlyphParametersEditor 
                selectedGlyph={selectedGlyphDetails}
                onUpdateParameter={updateGlyphParameter}
            />
          )}
          {!isBugaModeActive && (
            <div className="interaction-rules-placeholder bg-slate-700/30 p-2 rounded-md border border-dashed border-slate-600/50 mt-2 text-center">
              <h5 className="text-xs font-cinzel text-slate-500 mb-1">Interaction Logic</h5>
              <p className="text-[10px] text-slate-500 italic">Future Enhancement: Define connections and interaction rules between placed glyphs.</p>
            </div>
          )}
        </div>
      </div>
      
      {isBugaModeActive && (
        <div className={`peptide-output-display mt-2 p-3 bg-slate-800/70 border border-lime-600/60 rounded-lg shadow-md text-xs transition-all duration-300 ${isSimulating ? 'ring-1 ring-lime-400' : ''}`}>
            <h5 className="font-cinzel text-lime-200 text-sm mb-1.5 text-center">Decoded Peptide Sequence</h5>
            <div className="font-mono text-lime-50 break-all bg-black/40 p-2 rounded text-xs flex flex-wrap gap-x-0.5 items-center justify-center">
              {currentBugaPeptideDisplay.split('').map((aminoAcid, index) => {
                const currentSimGlyph = isSimulating && simulationStep < activeCodingGlyphsInBuga.length ? activeCodingGlyphsInBuga[simulationStep] : null;
                const thisGlyphInSequence = activeCodingGlyphsInBuga[index]; 
                
                const isCurrentAA = currentSimGlyph?.id === thisGlyphInSequence?.id;
                
                let aminoAcidColorClass = 'text-lime-100';
                if (thisGlyphInSequence) {
                   const colorClasses = getBugaGlyphColorClasses(thisGlyphInSequence, false, false);
                   aminoAcidColorClass = colorClasses.split(' ')[0];
                }
                let specialClass = '';
                if (aminoAcid === 'M' && thisGlyphInSequence?.id === 'G15') specialClass = isCurrentAA ? 'bg-red-500 text-white scale-125 font-bold mx-0.5 ring-2 ring-red-300 animate-ping-slow' : 'text-red-300 font-bold';
                else if (aminoAcid === 'P') specialClass = isCurrentAA ? 'bg-yellow-400 text-black scale-125 font-bold mx-0.5 underline decoration-wavy decoration-amber-700' : `${aminoAcidColorClass} underline decoration-amber-600/70 decoration-1`;
                else if (isCurrentAA) specialClass = 'bg-yellow-400 text-black scale-125 font-bold mx-0.5';
                else specialClass = aminoAcidColorClass;

                return (
                  <span key={index} className={`px-0.5 rounded transition-all duration-150 ${specialClass}`}>
                    {aminoAcid === '_' ? '·' : aminoAcid}
                  </span>
                );
              })}
            </div>
             <ul className="mt-1.5 list-disc list-inside text-slate-300 text-[10px] space-y-0.5 pl-3">
                <li>K, R, H (Basic AA): Potential Cell-Penetrating Peptide properties.</li>
                <li>TTTT Segment: Possible helix induction / folding resonance.</li>
                <li>PPPP C-terminus: PPII helix / protein-protein interface motif.</li>
                <li>M (Methionine): Canonical initiation codon (AUG).</li>
            </ul>
        </div>
      )}

      <div className="controls mt-auto pt-2 flex gap-2"> 
        <Button onClick={initiateSimulation} disabled={isSimulating || (isBugaModeActive ? bugaSequenceSlots.every(s=>s===null) : placedGlyphs.length === 0)} className="flex-1 py-1.5 px-3 text-xs bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-slate-600">
          <i className={`ri-play-fill mr-1 ${isSimulating ? 'animate-spin-slow' : ''}`}></i>{isSimulating ? 'Simulating...' : 'Initiate Sequence'}
        </Button>
        <Button onClick={clearCanvas} disabled={isSimulating} className="flex-1 py-1.5 px-3 text-xs bg-slate-600 hover:bg-slate-500 disabled:opacity-50">
          <i className="ri-delete-bin-2-line mr-1"></i>Clear Canvas
        </Button>
        <Button onClick={saveToGrimoire} disabled={isSimulating || (!isBugaModeActive && placedGlyphs.length === 0) || isBugaModeActive} className="flex-1 py-1.5 px-3 text-xs bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600">
          <i className="ri-save-3-line mr-1"></i>Save to Grimoire
        </Button>
      </div>
    </div>
  );
};

export default GlyphComposerPanel;
