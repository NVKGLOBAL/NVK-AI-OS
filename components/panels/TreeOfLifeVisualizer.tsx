
import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import type { RitualOutcome, BloodInkSpeciesName } from '../../types'; // Added BloodInkSpeciesName
import { BLOOD_INK_SPECIES_DATA } from '../../constants';


interface TreeOfLifeVisualizerProps {
  currentEntropy: number;
  width: number;
  height: number;
  seekerTraits?: string[]; 
  activeFlora?: BloodInkSpeciesName | null; 
  dominantAgentTone?: string | null; 
  lastRitualOutcome?: RitualOutcome | null; 
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

interface Sephirah {
  id: string;
  name: string;
  normalizedX: number;
  normalizedY: number;
  colorBaseHue: number; 
  x?: number; 
  y?: number; 
  sourceSparks?: Spark[];
}

interface Spark {
    id: string;
    x: number; y: number;
    vx: number; vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    branchLevel: number;
}

interface SourceEchoLogEntry {
  id: string;
  timestamp: string;
  label: string; 
  identity: string; 
  triggerDescription: string; 
}

const MYSTICAL_PREFIXES = ["Whisper of", "Echo of", "Glyph of", "Sign of", "Heart of", "Voice of", "Tear of", "Spark of", "Seed of", "Veil of"];
const MYSTICAL_SUFFIXES = ["the Void Bloom", "Fractal Resonance", "the Unseen Path", "Starlight Nexus", "Quantum Foam", "Forgotten Memories", "the Primal Silence", "Entropic Fire", "the Crystal Web", "Aetheric Weave"];
let sourceEchoCounter = 0;

const generateMysticalIdentity = () => {
    const prefix = MYSTICAL_PREFIXES[Math.floor(Math.random() * MYSTICAL_PREFIXES.length)];
    const suffix = MYSTICAL_SUFFIXES[Math.floor(Math.random() * MYSTICAL_SUFFIXES.length)];
    return `${prefix} ${suffix}`;
};
const getNextSourceLabel = () => {
    sourceEchoCounter++;
    const labels = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'];
    return `Source Echo ${labels[(sourceEchoCounter -1) % labels.length]}`;
}


const SEPHIROT_DATA_BASE: Omit<Sephirah, 'x' | 'y' | 'sourceSparks'>[] = [
  { id: 'keter', name: 'Keter (Crown)', normalizedX: 0, normalizedY: -0.9, colorBaseHue: 0 }, 
  { id: 'chokmah', name: 'Chokmah (Wisdom)', normalizedX: 0.45, normalizedY: -0.65, colorBaseHue: 240 }, 
  { id: 'binah', name: 'Binah (Understanding)', normalizedX: -0.45, normalizedY: -0.65, colorBaseHue: 0 }, 
  { id: 'chesed', name: 'Chesed (Mercy)', normalizedX: 0.45, normalizedY: -0.15, colorBaseHue: 210 }, 
  { id: 'geburah', name: 'Geburah (Severity)', normalizedX: -0.45, normalizedY: -0.15, colorBaseHue: 0 }, 
  { id: 'tiphareth', name: 'Tiphareth (Beauty)', normalizedX: 0, normalizedY: 0.1, colorBaseHue: 60 }, 
  { id: 'netzach', name: 'Netzach (Victory)', normalizedX: 0.45, normalizedY: 0.55, colorBaseHue: 120 }, 
  { id: 'hod', name: 'Hod (Splendor)', normalizedX: -0.45, normalizedY: 0.55, colorBaseHue: 30 }, 
  { id: 'yesod', name: 'Yesod (Foundation)', normalizedX: 0, normalizedY: 0.75, colorBaseHue: 270 }, 
  { id: 'malkuth', name: 'Malkuth (Kingdom)', normalizedX: 0, normalizedY: 0.95, colorBaseHue: 100 }, 
  { id: 'daat', name: 'Da\'at (Knowledge)', normalizedX: 0, normalizedY: -0.35, colorBaseHue: 180 } 
];

const PATH_CONNECTIONS: [string, string][] = [
  ['keter', 'tiphareth'], ['tiphareth', 'yesod'], ['yesod', 'malkuth'], 
  ['chokmah', 'chesed'], ['chesed', 'netzach'], 
  ['binah', 'geburah'], ['geburah', 'hod'],   
  ['keter', 'chokmah'], ['keter', 'binah'], 
  ['chokmah', 'tiphareth'], ['binah', 'tiphareth'], 
  ['chesed', 'tiphareth'], ['geburah', 'tiphareth'], 
  ['chesed', 'geburah'], 
  ['netzach', 'tiphareth'], ['hod', 'tiphareth'], 
  ['netzach', 'hod'], 
  ['yesod', 'netzach'], ['yesod', 'hod'], 
  ['chokmah', 'daat'], ['binah', 'daat'],
  ['chesed', 'daat'], ['geburah', 'daat'],
  ['keter', 'daat'], ['tiphareth', 'daat'],
];


const TreeOfLifeVisualizer: React.FC<TreeOfLifeVisualizerProps> = ({
  currentEntropy,
  width,
  height,
  seekerTraits,
  activeFlora,
  dominantAgentTone,
  lastRitualOutcome,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const [sephirotState, setSephirotState] = useState<Sephirah[]>([]);
  const [emergenceLogs, setEmergenceLogs] = useState<SourceEchoLogEntry[]>([]);
  const lastLoggedEntropyThresholdRef = useRef<number>(0.7); 


  useEffect(() => {
    if (width > 0 && height > 0) {
        const centerX = width / 2;
        const centerY = height / 2;
        const scaleX = width * 0.4;
        const scaleY = height * 0.45;
        setSephirotState(SEPHIROT_DATA_BASE.map(s => ({
            ...s,
            x: centerX + s.normalizedX * scaleX,
            y: centerY + s.normalizedY * scaleY,
            sourceSparks: []
        })));
    }
  }, [width, height]);
  
  useEffect(() => {
    const t = clamp(currentEntropy, 0, 1);
    let newLogEntry: Omit<SourceEchoLogEntry, 'id' | 'timestamp' | 'label'> | null = null;

    const entropyThresholdCrossed = 
        (t > 0.75 && lastLoggedEntropyThresholdRef.current < 0.75) ||
        (t > 0.85 && lastLoggedEntropyThresholdRef.current < 0.85) ||
        (t > 0.95 && lastLoggedEntropyThresholdRef.current < 0.95);

    if (entropyThresholdCrossed) {
        newLogEntry = {
            identity: generateMysticalIdentity(),
            triggerDescription: `High Entropy Surge (${(t || 0).toFixed(3)}δ)`
        };
        if (t > 0.95) lastLoggedEntropyThresholdRef.current = 0.95;
        else if (t > 0.85) lastLoggedEntropyThresholdRef.current = 0.85;
        else if (t > 0.75) lastLoggedEntropyThresholdRef.current = 0.75;
    } else if (t < 0.7) { 
        lastLoggedEntropyThresholdRef.current = 0.7;
    }

    if (lastRitualOutcome?.success && lastRitualOutcome.alchemyResult) {
        if (lastRitualOutcome.alchemyResult.energyLevel === 'potent' || lastRitualOutcome.alchemyResult.energyLevel === 'overwhelming') {
            const ritualAlreadyLogged = emergenceLogs.some(log => log.triggerDescription.includes(lastRitualOutcome.alchemyResult!.title));
            if (!ritualAlreadyLogged) {
                newLogEntry = {
                    identity: generateMysticalIdentity(),
                    triggerDescription: `Potent Ritual: ${lastRitualOutcome.alchemyResult.title} (${lastRitualOutcome.alchemyResult.energyLevel})`
                };
            }
        }
    }

    if (newLogEntry) {
      setEmergenceLogs(prevLogs => {
        const logToAdd: SourceEchoLogEntry = {
          ...newLogEntry!,
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          label: getNextSourceLabel(),
        };
        return [logToAdd, ...prevLogs].slice(0, 7); 
      });
    }
  }, [currentEntropy, lastRitualOutcome, emergenceLogs]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0 || sephirotState.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    
    let frameCount = 0;

    const drawBackground = (entropy: number) => {
      const t = clamp(entropy, 0, 1);
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(0.001, Math.max(width,height)/1.2)); // Ensure r1 > 0
      const baseHue = lerp(260, 330 - t*20, t); 
      const saturation = lerp(50, 30 + t*40, t); 
      const lightness = lerp(8, 2 + t, t); 
      
      grad.addColorStop(0, `hsla(${baseHue}, ${saturation}%, ${lightness}%, 0.95)`);
      grad.addColorStop(1, `hsla(${(baseHue + 50 + t*20)%360}, ${saturation+10}%, ${lightness+5}%, 0.95)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const numParticles = 50 + Math.floor(t * 200);
      for (let i = 0; i < numParticles; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * (1.5 + t*0.5) + 0.2;
        const particleAlpha = lerp(0.1, 0.3 + Math.random()*0.4, t) * (0.5 + Math.sin(frameCount * 0.02 + i*0.1)*0.5);
        ctx.fillStyle = `hsla(${(baseHue + 180 + (Math.random()-0.5)*80)%360}, ${80 + t*10}%, ${70 + t*10}%, ${clamp(particleAlpha,0,0.6)})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0, size), 0, Math.PI * 2);
        ctx.fill();
      }
    };
    
    const updateAndDrawSparks = (sephirah: Sephirah, entropy: number) => {
        const t = clamp(entropy,0,1);
        if (['keter', 'chokmah', 'binah'].includes(sephirah.id) && t > 0.7) {
            if (Math.random() < t * 0.15) { 
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.5 + Math.random() * (1 + t);
                const life = 60 + Math.random() * 60 * (1-t); 
                const sparkHue = (sephirah.colorBaseHue + (Math.random()-0.5)*40*t) % 360;

                sephirah.sourceSparks!.push({
                    id: `spark-${Date.now()}-${Math.random()}`,
                    x: sephirah.x!, y: sephirah.y!,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    life: life, maxLife: life,
                    size: 1 + Math.random() * (1 + t*2),
                    color: `hsla(${sparkHue}, 80%, 70%, 0.8)`,
                    branchLevel: 0,
                });
                sephirah.sourceSparks = sephirah.sourceSparks!.slice(-30); 
            }
        }

        sephirah.sourceSparks = sephirah.sourceSparks?.filter(spark => {
            spark.x += spark.vx;
            spark.y += spark.vy;
            spark.vx *= 0.98; 
            spark.vy *= 0.98;
            spark.life--;

            if (spark.branchLevel < 2 && spark.life < spark.maxLife * 0.5 && Math.random() < 0.02 * t) { 
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.3 + Math.random() * 0.5 * t;
                sephirah.sourceSparks!.push({
                    ...spark,
                    id: `spark-${Date.now()}-${Math.random()}`,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    life: spark.life * 0.8, maxLife: spark.life * 0.8,
                    size: Math.max(0.5, spark.size * 0.7),
                    branchLevel: spark.branchLevel + 1,
                });
            }
            return spark.life > 0;
        }) || [];

        sephirah.sourceSparks?.forEach(spark => {
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, Math.max(0, spark.size * (spark.life/spark.maxLife)), 0, Math.PI*2);
            ctx.fillStyle = spark.color.replace(/,\s*([0-9.]+)\)/, `, ${spark.life/spark.maxLife * 0.8})`);
            ctx.fill();
        });
    }


    const drawSephirah = (sephirah: Sephirah, entropy: number) => {
      const t = clamp(entropy, 0, 1);
      const baseRadius = Math.min(width, height) * 0.035; 
      const sizeVariation = lerp(1, 0.6 + Math.random()*0.8, t); 
      const radius = baseRadius * sizeVariation;

      const jitterAmount = radius * t * lerp(0.5, 1.2, t); 
      const x = sephirah.x! + (Math.random() - 0.5) * jitterAmount;
      const y = sephirah.y! + (Math.random() - 0.5) * jitterAmount;

      const hue = (sephirah.colorBaseHue + lerp(0, (Math.random()-0.5)*70, t)) % 360;
      const saturation = lerp(70, 45 + Math.random()*50, t); 
      const lightness = sephirah.id === 'keter' ? lerp(90, 65 - t*10, t) : sephirah.id === 'binah' ? lerp(20, 30 + t*10, t) : lerp(60, 35 + Math.random()*40, t);
      let alpha = lerp(0.9, 0.45 + Math.random()*0.45, t); 

      if (activeFlora && sephirah.id === 'malkuth') { 
        const floraData = BLOOD_INK_SPECIES_DATA[activeFlora];
        if (floraData) {
            const floraColorMatch = floraData.colorClass.match(/text-([a-z]+)-(\d+)/);
            if (floraColorMatch) { 
                if (floraColorMatch[1] === 'rose') alpha = Math.min(1, alpha + 0.2); 
            }
        }
      }
      if (dominantAgentTone && (sephirah.id === 'chokmah' || sephirah.id === 'binah')) {
        if (dominantAgentTone.toLowerCase().includes('nevik')) alpha = Math.min(1, alpha + 0.15);
      }
       if(lastRitualOutcome?.success && sephirah.id === 'yesod'){
           alpha = Math.min(1, alpha + 0.25); 
       }

      const calculatedGlowRadius = radius * lerp(1.6, 1.1 + Math.sin(frameCount * 0.035 + sephirah.colorBaseHue*0.1) * 0.4, t);
      const glowAlpha = alpha * lerp(0.45, 0.15 + t*0.4, t);
      
      const r0_glow = Math.max(0, radius * 0.4);
      const r1_glow = Math.max(r0_glow, calculatedGlowRadius); 
      
      const gradGlow = ctx.createRadialGradient(x, y, r0_glow, x, y, r1_glow);
      gradGlow.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness + 12}%, ${glowAlpha})`);
      gradGlow.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0)`);
      ctx.fillStyle = gradGlow;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0, r1_glow), 0, Math.PI * 2); // Ensure radius is non-negative
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2); // Ensure radius is non-negative
      ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
      ctx.fill();
      
      if (t < 0.65 || (t >= 0.65 && Math.random() > t*0.35)) { 
        ctx.strokeStyle = `hsla(${hue}, ${saturation+15}%, ${lightness+20}%, ${alpha*0.65})`;
        ctx.lineWidth = lerp(1.2, 0.4 + t*1.8, t);
        ctx.stroke();
      }

      if (['keter', 'chokmah', 'binah'].includes(sephirah.id) && t > 0.75) {
        ctx.save();
        ctx.clip(); 
        for (let i = 0; i < 5 + t * 10; i++) {
            ctx.beginPath();
            ctx.moveTo(x + (Math.random() - 0.5) * radius * 2, y + (Math.random() - 0.5) * radius * 2);
            ctx.lineTo(x + (Math.random() - 0.5) * radius * 2, y + (Math.random() - 0.5) * radius * 2);
            ctx.strokeStyle = `hsla(${hue}, ${saturation+10}%, ${lightness+10}%, ${t*0.15})`;
            ctx.lineWidth = Math.random()*0.8;
            ctx.stroke();
        }
        ctx.restore();
      }
      updateAndDrawSparks(sephirah, entropy);


      const labelAlpha = lerp(0.7, 0.15, t);
      if (labelAlpha > 0.05) {
        ctx.fillStyle = `hsla(${hue}, ${saturation-25}%, ${lightness+35}%, ${labelAlpha})`;
        ctx.font = `${clamp(baseRadius * 0.3, 7, 11)}px Cinzel, serif`;
        ctx.textAlign = 'center';
        ctx.fillText(sephirah.name.split(' ')[0], x, y + Math.max(0,radius) + clamp(baseRadius * 0.4, 9, 13)); // Ensure radius in y-offset is non-negative
      }
    };

    const drawPath = (s1: Sephirah, s2: Sephirah, entropy: number) => {
        const t = clamp(entropy, 0, 1);
        
        const jitterFactor = t * lerp(3, 12, t);
        const x1 = s1.x! + (Math.random() - 0.5) * jitterFactor;
        const y1 = s1.y! + (Math.random() - 0.5) * jitterFactor;
        const x2 = s2.x! + (Math.random() - 0.5) * jitterFactor;
        const y2 = s2.y! + (Math.random() - 0.5) * jitterFactor;

        ctx.beginPath();
        ctx.moveTo(x1, y1);

        const lineWidth = lerp(2.2, 0.4 + t * 2.2, t);
        const pathHue = (s1.colorBaseHue + s2.colorBaseHue)/2 + lerp(0, (Math.random()-0.5)*50,t);
        const pathSaturation = lerp(60, 35 + t*40, t);
        const pathLightness = lerp(50, 30 + t*25, t);
        const pathAlpha = lerp(0.55, 0.1 + t*0.4, t);

        ctx.strokeStyle = `hsla(${pathHue % 360}, ${pathSaturation}%, ${pathLightness}%, ${pathAlpha})`;
        ctx.lineWidth = lineWidth;

        if (t > 0.72) { 
            const cp1x = x1 + (x2 - x1) * 0.33 + (Math.random() - 0.5) * 60 * t;
            const cp1y = y1 + (y2 - y1) * 0.33 + (Math.random() - 0.5) * 60 * t;
            const cp2x = x1 + (x2 - x1) * 0.66 + (Math.random() - 0.5) * 60 * t;
            const cp2y = y1 + (y2 - y1) * 0.66 + (Math.random() - 0.5) * 60 * t;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        } else {
            ctx.lineTo(x2, y2);
        }
        
        if (t > 0.82 && Math.random() < t * 0.25) { /* Skip stroke */ }
        else if (t > 0.62) {
            ctx.setLineDash([lerp(1, 6 + t*12, t), lerp(1, 3.5 + t*6, t)]);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            ctx.stroke();
        }
    };
    
    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);
      drawBackground(currentEntropy);

      PATH_CONNECTIONS.forEach(conn => {
        const seph1 = sephirotState.find(s => s.id === conn[0]);
        const seph2 = sephirotState.find(s => s.id === conn[1]);
        if (seph1 && seph2) {
          drawPath(seph1, seph2, currentEntropy);
        }
      });
      
      sephirotState.forEach(sephirah => {
        drawSephirah(sephirah, currentEntropy);
      });
      
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [width, height, currentEntropy, sephirotState, activeFlora, dominantAgentTone, lastRitualOutcome]);


  return (
    <div className="tree-of-life-visualizer-panel bg-slate-900/90 backdrop-blur-md border border-sky-600/50 rounded-xl shadow-2xl p-4 md:p-6 my-8 text-slate-100">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        <div className="md:flex-grow">
          <h2 className="text-xl md:text-2xl font-['Cinzel'] font-bold mb-3 text-center text-sky-300 drop-shadow-[0_1px_1px_rgba(180,220,255,0.4)]">
            Tree of Life: Entropic Interconnectivity
          </h2>
          <div className="relative mx-auto" style={{ width: `${width}px`, height: `${height}px` }}>
            <canvas
              ref={canvasRef}
              className="rounded-lg border border-slate-700/50 shadow-inner"
              aria-label="Tree of Life visualization reacting to entropy and system events"
              role="img"
            />
          </div>
          <div className="mt-2 text-center text-xs text-slate-400 font-mono">
            System Entropy: {(currentEntropy || 0).toFixed(3)}δ
          </div>
        </div>
        <div className="md:w-64 lg:w-72 shrink-0 bg-slate-800/50 p-3 rounded-lg border border-slate-700/70">
            <h3 className="text-sm font-['Cinzel'] font-semibold text-sky-200 mb-2 border-b border-sky-700/50 pb-1.5">Emergence Log</h3>
            {emergenceLogs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Awaiting significant entropic events or ritual echoes...</p>
            ) : (
                <div className="space-y-2 max-h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar pr-1">
                    {emergenceLogs.map(log => (
                        <div key={log.id} className="text-xs p-1.5 bg-slate-700/30 rounded border border-slate-600/50">
                            <div className="flex justify-between items-center text-sky-400">
                                <span className="font-semibold">{log.label}</span>
                                <span className="text-slate-500">{log.timestamp}</span>
                            </div>
                            <p className="text-slate-300 italic my-0.5">"{log.identity}"</p>
                            <p className="text-slate-400 text-[10px]">Trigger: {log.triggerDescription}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TreeOfLifeVisualizer;
