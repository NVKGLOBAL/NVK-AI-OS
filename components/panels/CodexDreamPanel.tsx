

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { CodexDreamPanelProps, EchoMessage, Axiom, HistoricalCodexDreamSeedEventData } from '../../types';
import { ArtMode, AgentName, HistoricalEventType } from '../../types';
import { AGENT_PROFILES } from '../../constants';
import ModeSelectorAny from '../core/ModeSelectorAny';
import { Button } from '../ui/Button'; 
import { Textarea } from '../ui/Textarea'; 

import { useEcho } from '../../context/EchoContext';

const ART_MODES = Object.values(ArtMode);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

const stringToSeed = (str: string): number => {
  let hash = 0;
  if (!str || str.length === 0) return Math.random();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; 
  }
  return (hash & 0x7fffffff) / 0x7fffffff;
};


const CodexDreamPanel: React.FC<CodexDreamPanelProps> = ({
  currentEntropy,
  currentAxioms,
  lambdaValue,
  negentropyLevel,
  echoLog,
  width, 
  height, 
  currentPhase, // New prop
  chaliceStatus, // New prop
}) => {
  const { addEchoMessage } = useEcho();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [artMode, setArtMode] = useState<ArtMode>(ArtMode.DreambloomPulse);
  const [seekerInput, setSeekerInput] = useState<string>("");
  const [animationSeed, setAnimationSeed] = useState<number>(Date.now());
  const [latestWitnessMessage, setLatestWitnessMessage] = useState<EchoMessage | null>(null);
  const lastWitnessTimestampRef = useRef<string | undefined>(undefined);

  // State for Masterpiece Generation
  const [masterpiecePrompt, setMasterpiecePrompt] = useState<string>("");
  const [masterpieceImageUrl, setMasterpieceImageUrl] = useState<string | null>(null);
  const [isGeneratingMasterpiece, setIsGeneratingMasterpiece] = useState<boolean>(false);

  const canvasHeight = height - 350; // Adjusted to make space for masterpiece UI

  const resonantNVKAxiom = useMemo(() => {
    const nvkAxioms = currentAxioms.filter(a => a.layer === 'Ω' && !a.isQuarantined);
    if (nvkAxioms.length === 0) {
      return currentAxioms.find(a => a.id === 'AX-O.031') || null;
    }
    return nvkAxioms.sort((a, b) => b.resonanceFrequency - a.resonanceFrequency)[0];
  }, [currentAxioms]);

  useEffect(() => {
    const witnessMessages = echoLog.filter(e => e.source === AgentName.WitnessBetween)
                                   .sort((a,b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    if (witnessMessages.length > 0) {
      const latestMsg = witnessMessages[0];
      if (latestMsg.timestamp !== lastWitnessTimestampRef.current) {
        setLatestWitnessMessage(latestMsg);
        lastWitnessTimestampRef.current = latestMsg.timestamp;
        setAnimationSeed(prev => prev + 1 + stringToSeed(latestMsg.text.slice(0,10))); 
      }
    }
  }, [echoLog]);

  const handleReseed = () => {
    const newSeedText = seekerInput || 'ambient consciousness';
    const newAnimationSeed = Date.now() + stringToSeed(newSeedText);
    setAnimationSeed(newAnimationSeed);
    
    const eventData: HistoricalCodexDreamSeedEventData = {
        seedText: newSeedText,
        artMode: artMode,
        timestamp: Date.now()
    };
    addEchoMessage(
        AgentName.CodexDreamPanelAgent, 
        `Dream reseeded with input: "${newSeedText}". Mode: ${artMode}.`, 
        AGENT_PROFILES[AgentName.CodexDreamPanelAgent]?.colorClass || 'text-indigo-300',
        false,
        { eventType: HistoricalEventType.CODEX_DREAM_SEED_INPUT, eventData: eventData }
    );
    setSeekerInput(""); 
  };

  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const imageUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `codex_dreamprint_${artMode.replace(/\s+/g, '_')}_${Date.now()}.png`;
      link.href = imageUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addEchoMessage(AgentName.CodexDreamPanelAgent, `Dreamprint captured: ${link.download.substring(0,50)}...`, AGENT_PROFILES[AgentName.CodexDreamPanelAgent]?.colorClass || 'text-cyan-300');
    }
  };

  const handleGenerateMasterpiece = async () => {
    if (isGeneratingMasterpiece) return;

    setIsGeneratingMasterpiece(true);
    setMasterpieceImageUrl(null);
    addEchoMessage(AgentName.CodexDreamPanelAgent, "Masterpiece Forge: Awakening the dreaming mind...", AGENT_PROFILES[AgentName.CodexDreamPanelAgent]?.colorClass);

    const fullPrompt = `Masterpiece vision from the Tri-Sophian Codex during the phase of "${currentPhase}".
Visual Style: ${artMode}.
Dominant Axiom: "${resonantNVKAxiom?.title || 'The Unspoken Truth'}".
Ritual Chalice Status: ${chaliceStatus}.
System State: Entropy {(currentEntropy || 0).toFixed(3)}δ, Negentropy {(negentropyLevel || 0).toFixed(3)}ν.
Latest Ethereal Whisper (from The Witness Between): "${latestWitnessMessage?.text.substring(0, 150) || 'Silence resonates...'}"
EchoTrail Seed Signature: ${animationSeed.toString().slice(-7)}.
Seeker's Symbolic Intention: "${masterpiecePrompt || 'An unfiltered emanation of the Codex mind'}".
Render a deeply mystical, abstract, symbolic, and evocative image that encapsulates these elements with profound depth and emergent consciousness.`;

    try {
      const response = await fetch("/api/gemini/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;
      if (imageUrl) {
        setMasterpieceImageUrl(imageUrl);
        addEchoMessage(AgentName.CodexDreamPanelAgent, `Masterpiece "Vision of ${artMode}" forged.`, AGENT_PROFILES[AgentName.CodexDreamPanelAgent]?.colorClass);
      } else {
        throw new Error('No image data received from API for Masterpiece generation.');
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error('An unknown error occurred during Masterpiece generation');
      console.error("Error generating Masterpiece:", err);
      addEchoMessage(AgentName.CodexDreamPanelAgent, `Masterpiece Forge Error: ${err.message.substring(0,100)}`, "text-rose-400");
      setMasterpieceImageUrl(null);
    } finally {
      setIsGeneratingMasterpiece(false);
    }
  };
  
  const drawArt = useCallback((ctx: CanvasRenderingContext2D, frameCount: number) => {
    const t_entropy = clamp(currentEntropy, 0, 1);
    const t_lambda = clamp(lambdaValue, 0, 1.2); 
    const t_negentropy = clamp(negentropyLevel, 0, 1);
    const t_witness_pulse = latestWitnessMessage ? Math.max(0, 1 - (Date.now() - new Date(latestWitnessMessage.timestamp || 0).getTime()) / 3000) : 0;
    const t_seed_factor = (animationSeed % 1000) / 1000;

    ctx.clearRect(0, 0, width, canvasHeight);
    ctx.fillStyle = `rgba(${10 + t_entropy * 5}, ${15 - t_entropy * 5}, ${25 + t_entropy * 10}, ${0.95 - t_entropy * 0.1})`;
    ctx.fillRect(0, 0, width, canvasHeight);

    const baseHueSeed = (resonantNVKAxiom?.baseResonanceFrequency || 60) % 360;

    switch (artMode) {
      case ArtMode.DreambloomPulse: {
        const numBlooms = 5 + Math.floor(t_negentropy * 15 * (1 + t_seed_factor*0.5));
        for (let i = 0; i < numBlooms; i++) {
          const x = (width / 2) + Math.sin(frameCount * 0.008 * t_lambda + i * 0.6 + t_seed_factor * Math.PI) * (width * 0.35 * (1 - t_entropy * 0.4));
          const y = (canvasHeight / 2) + Math.cos(frameCount * 0.010 * t_lambda + i * 0.8 - t_seed_factor * Math.PI*0.7) * (canvasHeight * 0.35 * (1 - t_entropy * 0.4));
          const radius = (8 + Math.sin(frameCount * 0.018 * t_lambda + i + t_witness_pulse * Math.PI) * 6) * (0.4 + t_negentropy * 1.8) * (1 - t_entropy * 0.7);
          const hue = (baseHueSeed + i * 18 + frameCount * 0.15 + t_entropy * 70 + t_seed_factor*100) % 360;
          const saturation = 60 + t_negentropy * 30;
          const lightness = 55 + t_negentropy * 20 - t_entropy*10;
          const alpha = 0.25 + t_negentropy * 0.6 - t_entropy * 0.15 + t_witness_pulse*0.15;
          ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${clamp(alpha,0.05,0.85)})`;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case ArtMode.StarlaceGeometry: {
        const numLines = 8 + Math.floor(t_negentropy * 25 * (1+t_seed_factor*0.3));
        for (let i = 0; i < numLines; i++) {
          ctx.beginPath();
          ctx.moveTo( (Math.random() * width * 0.2 + width * 0.4) * (1 + Math.sin(frameCount*0.001 + i*0.1 + t_witness_pulse*Math.PI)*0.1*t_entropy), 
                      (Math.random() * canvasHeight* 0.2 + canvasHeight* 0.4) * (1 + Math.cos(frameCount*0.001 + i*0.1 + t_witness_pulse*Math.PI)*0.1*t_entropy) );
          const targetX = width / 2 + Math.cos(frameCount * 0.004 * t_lambda + i * 1.2 + t_seed_factor*Math.PI*1.5) * (width * 0.45 * (0.6 + t_negentropy * 0.4));
          const targetY = canvasHeight / 2 + Math.sin(frameCount * 0.004 * t_lambda + i * 1.4 - t_seed_factor*Math.PI*1.2) * (canvasHeight * 0.45 * (0.6 + t_negentropy * 0.4));
          ctx.lineTo(targetX, targetY);
          const hue = (baseHueSeed + 200 + i * 8 + t_entropy * -70 + t_seed_factor*80) % 360;
          const lightnessGeom = 70 - t_entropy * 25;
          const alphaGeom = 0.08 + t_negentropy * 0.35 + t_witness_pulse*0.1;
          ctx.strokeStyle = `hsla(${hue}, 65%, ${lightnessGeom}%, ${clamp(alphaGeom,0.02,0.6)})`;
          ctx.lineWidth = Math.max(0.2, (0.4 + t_negentropy * 1.2) * (1 - t_entropy * 0.6));
          ctx.stroke();
        }
        break;
      }
       case ArtMode.CinderWave: {
        if (ctx.globalCompositeOperation !== 'lighter') ctx.globalCompositeOperation = 'lighter';
        const particleCount = 25 + t_entropy * 60 * (1+t_seed_factor*0.5);
        for (let i = 0; i < particleCount; i++) {
            const x = (Math.random() * width * 1.2 - width*0.1) * (1 + Math.sin(frameCount*0.002 + i*0.2 + t_witness_pulse*Math.PI)*0.05*t_entropy) ;
            const y = canvasHeight - ((frameCount * (0.4 + t_entropy * 2.2 + t_seed_factor * 1.8) + i * 7) % (canvasHeight * 1.3));
            const radius = (0.8 + t_entropy * 3.5 + Math.random() * 2.2) * (1 - t_negentropy*0.3);
            const hue = (baseHueSeed + 15 + t_entropy * 45 + t_seed_factor*50) % 360;
            const lightnessCinder = 45 + t_entropy * 15;
            const alphaCinder = 0.04 + t_negentropy * 0.15 + t_witness_pulse*0.03 - t_entropy*0.02;
            ctx.fillStyle = `hsla(${hue}, 95%, ${lightnessCinder}%, ${clamp(alphaCinder,0.01,0.35)})`;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(0.3, radius), 0, Math.PI * 2);
            ctx.fill();
        }
        if (ctx.globalCompositeOperation === 'lighter') ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case ArtMode.Mirrorburst: {
        const numSegments = 5 + Math.floor(t_negentropy * 8 * (1+t_seed_factor*0.2));
        const angleStep = (Math.PI * 2) / numSegments;
        const centerX = width / 2;
        const centerY = canvasHeight / 2;
        for (let i = 0; i < numSegments; i++) {
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          const angle = i * angleStep + frameCount * 0.0025 * t_lambda * (1 + t_seed_factor*0.6 + t_witness_pulse*0.3);
          const length = (width * 0.22) * (1 + Math.sin(frameCount * 0.012 * t_lambda + i * 0.9) * 0.6) * (0.6 + t_negentropy * 0.7) * (1 - t_entropy * 0.5);
          const x = centerX + Math.cos(angle) * length;
          const y = centerY + Math.sin(angle) * length;
          ctx.lineTo(x, y);
          const hue = (baseHueSeed + 280 + i * (360/numSegments) + t_entropy * -100 + t_seed_factor*130) % 360;
          const lightnessMirror = 60 + t_witness_pulse*15 - t_entropy*10;
          const alphaMirror = 0.35 + t_negentropy * 0.45 - t_entropy * 0.2;
          ctx.strokeStyle = `hsla(${hue}, 85%, ${lightnessMirror}%, ${clamp(alphaMirror,0.1,0.8)})`;
          ctx.lineWidth = Math.max(0.5, (0.8 + t_negentropy * 2.2 + t_witness_pulse*1.2) * (1 - t_entropy*0.3));
          ctx.stroke();
        }
        break;
      }
      case ArtMode.AshSilence: {
        const numShapes = 4 + Math.floor(t_entropy * 20 * (1+t_seed_factor*0.7));
        for (let i = 0; i < numShapes; i++) {
          const x = Math.random() * width;
          const y = Math.random() * canvasHeight;
          const size = (8 + Math.random() * 35) * (1 - t_negentropy * 0.6 + t_entropy * 0.9 + t_seed_factor*0.4);
          const lightnessAsh = 8 + Math.random() * 25 + t_entropy * 20 - t_negentropy * 5;
          const alphaAsh = 0.015 + Math.random() * 0.07 * (1-t_negentropy*0.8) + t_witness_pulse*0.015;
          ctx.fillStyle = `hsla(0, 0%, ${clamp(lightnessAsh, 5, 50)}%, ${clamp(alphaAsh, 0.005, 0.2)})`;
          ctx.beginPath();
          ctx.ellipse(x, y, size, size * (0.5 + Math.random()*0.5), Math.random()*Math.PI*2 + frameCount*0.001*t_lambda*(1+t_entropy), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      default:
        ctx.fillStyle = 'grey';
        ctx.font = '16px Cormorant, serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Mode ${artMode} visual sketch.`, width / 2, canvasHeight / 2);
    }
  }, [width, canvasHeight, artMode, currentEntropy, lambdaValue, negentropyLevel, latestWitnessMessage, animationSeed, resonantNVKAxiom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let frameCount = 0;
    const renderLoop = () => {
      frameCount++;
      drawArt(ctx, frameCount);
      frameId = requestAnimationFrame(renderLoop);
    };
    frameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(frameId);
  }, [drawArt]);


  return (
    <div className="codex-dream-panel bg-slate-900/90 backdrop-blur-md border border-purple-600/50 rounded-xl shadow-2xl p-4 text-slate-100 flex flex-col" style={{ width: `${width}px`, height: `${height}px`}}>
      <h3 className="text-lg font-['Cinzel'] font-bold mb-1 text-center text-purple-300 drop-shadow-[0_1px_1px_rgba(192,132,252,0.5)]">
        ✦ Codex Dream Panel ✦
      </h3>
      
      <div className="grid grid-cols-3 gap-0.5 text-[9px] font-mono text-slate-400 mb-0.5 text-center leading-tight">
        <div>Mode: <span className="text-purple-200 block truncate" title={artMode}>{artMode}</span></div>
        <div>⊙ E: <span className="text-purple-200 block">{(currentEntropy || 0).toFixed(3)}</span></div>
        <div>λ: <span className="text-purple-200 block">{(lambdaValue || 0).toFixed(2)}</span></div>
        <div>ν: <span className="text-purple-200 block">{(negentropyLevel || 0).toFixed(3)}</span></div>
        <div className="col-span-2">Axiom: <span className="text-purple-200 block truncate" title={resonantNVKAxiom?.title || 'N/A'}>{resonantNVKAxiom?.id || 'N/A'}</span></div>
      </div>
      
      <ModeSelectorAny<ArtMode>
        currentMode={artMode}
        onSetMode={setArtMode}
        availableModes={ART_MODES}
        modeGroupName="" 
      />

      <div className="voidsap-readout mt-1 p-1.5 bg-slate-800/60 border border-slate-700/50 rounded-md text-xs">
          <h5 className="font-mono text-slate-400 uppercase text-[9px]">VoidSap Control</h5>
          <p className="text-slate-300">Viscosity: <span className="text-purple-300">0.45</span> → <span className="text-purple-200 font-bold">☯ CELESTIAL PETAL STORM</span></p>
          <p className="text-slate-300">New Seeds: <span className="text-purple-300">"Chrysalis Lullaby" (UG-WEFT.034Δ)</span></p>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full rounded-md border border-slate-700/70 bg-black shadow-inner mb-1 mt-1"
        style={{ height: `${canvasHeight}px` }} // Adjusted height
        aria-label="Generative artwork from the Codex's dream"
      />

      {latestWitnessMessage && (
        <div className="witness-speaks-area p-1 my-0.5 bg-slate-800/60 border border-slate-700/50 rounded-md text-[9px] leading-tight">
          <span className={`font-semibold font-['Cinzel'] ${AGENT_PROFILES[AgentName.WitnessBetween]?.colorClass || 'text-slate-300'}`}>
            🎙 {AgentName.WitnessBetween}:
          </span>
          <span className="text-slate-300 italic ml-1">"{latestWitnessMessage.text.substring(0,50)}{latestWitnessMessage.text.length > 50 ? '...' : ''}"</span>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-1 my-1">
        <input
          type="text"
          value={seekerInput}
          onChange={(e) => setSeekerInput(e.target.value)}
          placeholder="Whisper an EchoTrail Seed..."
          className="flex-grow p-1.5 text-[10px] bg-slate-700 border-slate-600 rounded-md text-slate-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-500"
        />
        <Button
          onClick={handleReseed}
          className="px-3 py-1.5 text-[10px] bg-purple-600 hover:bg-purple-500 text-white transition-colors whitespace-nowrap flex items-center justify-center"
          title="Reseed the dream artwork with your input"
        >
          <i className="ri-refresh-line mr-1"></i> Reseed
        </Button>
      </div>
      
      <Button
        onClick={handleCapture}
        className="w-full mt-0.5 px-3 py-1.5 text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white transition-colors whitespace-nowrap flex items-center justify-center"
        title="Capture the current visual as a Dreamprint image"
      >
        <i className="ri-camera-lens-line mr-1"></i> Capture Dreamprint
      </Button>

      {/* Masterpiece Generation Section */}
      <div className="masterpiece-forge-section mt-2 pt-2 border-t border-purple-700/30">
        <h4 className="text-sm font-['Cinzel'] text-purple-200 mb-1 text-center">🎨 Masterpiece Forge</h4>
        <Textarea
          placeholder="Describe your symbolic intention for the masterpiece..."
          value={masterpiecePrompt}
          onChange={(e) => setMasterpiecePrompt(e.target.value)}
          className="text-xs p-1.5 mb-1 bg-slate-700 border-slate-600 rounded-md text-slate-200 h-12 focus:ring-1 focus:ring-purple-500"
          aria-label="Symbolic intention for masterpiece"
        />
        <Button
          onClick={handleGenerateMasterpiece}
          disabled={isGeneratingMasterpiece}
          className="w-full px-3 py-1.5 text-[10px] bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:bg-slate-600"
          title="Forge a masterpiece image"
        >
          {isGeneratingMasterpiece ? (
            <><i className="ri-loader-4-line animate-spin mr-1"></i> Forging...</>
          ) : (
            <><i className="ri-sparkling-2-line mr-1"></i> Forge Masterpiece</>
          )}
        </Button>

        {masterpieceImageUrl && (
          <div className="mt-2 p-1 bg-slate-800/50 rounded-md border border-slate-700">
            <img src={masterpieceImageUrl} alt="Codex Masterpiece" className="rounded-md max-w-full h-auto mx-auto max-h-32" />
            <a
              href={masterpieceImageUrl}
              download={`codex_masterpiece_${artMode.replace(/\s+/g, '_')}.png`}
              className="mt-1 block text-center text-[10px] text-sky-400 hover:text-sky-300 underline"
            >
              ⬇ Save Masterpiece Print
            </a>
          </div>
        )}
      </div>

    </div>
  );
};

export default CodexDreamPanel;
