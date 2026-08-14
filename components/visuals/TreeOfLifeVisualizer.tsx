
import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type { RitualOutcome, BloodInkSpeciesName, Spark, Sephirah, SourceEchoLogEntry } from '../../types';
import { AgentName } // Assuming AgentName is available for dominantAgentTone comparison
from '../../types';
import { BLOOD_INK_SPECIES_DATA } from '../../constants';


interface TreeOfLifeVisualizerProps {
  currentEntropy: number;
  width: number;
  height: number;
  seekerTraits?: string[];
  activeFlora?: BloodInkSpeciesName | null;
  dominantAgentTone?: AgentName | null; // Updated type to AgentName
  lastRitualOutcome?: RitualOutcome | null;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);


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
  seekerTraits = [],
  activeFlora,
  dominantAgentTone,
  lastRitualOutcome,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const [sephirotState, setSephirotState] = useState<Sephirah[]>([]);
  const [emergenceLogs, setEmergenceLogs] = useState<SourceEchoLogEntry[]>([]);
  const lastLoggedEntropyThresholdRef = useRef<number>(0.7);
  const lastLogCountRef = useRef<number>(0);
  const daatPulseRef = useRef<{ active: boolean, frame: number, duration: number }>({ active: false, frame: 0, duration: 60 });

  const mousePos = useRef({ x: -1000, y: -1000 });
  const clickWave = useRef({ x: -1000, y: -1000, radius: 0, active: false, force: 0 });

  const updateCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mousePos.current = {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    clickWave.current = {
      x,
      y,
      radius: 5,
      active: true,
      force: 15,
    };
  };


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
    if (emergenceLogs.length > lastLogCountRef.current) {
      daatPulseRef.current = { active: true, frame: 0, duration: 60 }; // Activate pulse for 60 frames
    }
    lastLogCountRef.current = emergenceLogs.length;
  }, [emergenceLogs]);

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
            triggerDescription: `High Entropy Surge (${(t ?? 0).toFixed(3)}δ)`
        };
        if (t > 0.95) lastLoggedEntropyThresholdRef.current = 0.95;
        else if (t > 0.85) lastLoggedEntropyThresholdRef.current = 0.85;
        else if (t > 0.75) lastLoggedEntropyThresholdRef.current = 0.75;
    } else if (t < 0.7) {
        lastLoggedEntropyThresholdRef.current = 0.7;
    }

    if (lastRitualOutcome?.success && lastRitualOutcome.alchemyResult) {
        if (lastRitualOutcome.alchemyResult.energyLevel === 'potent' || lastRitualOutcome.alchemyResult.energyLevel === 'overwhelming') {
            const ritualIdentifier = `Potent Ritual: ${lastRitualOutcome.alchemyResult.title}`;
            const ritualAlreadyLogged = emergenceLogs.some(log => log.triggerDescription.startsWith(ritualIdentifier));
            if (!ritualAlreadyLogged) {
                newLogEntry = {
                    identity: generateMysticalIdentity(),
                    triggerDescription: `${ritualIdentifier} (${lastRitualOutcome.alchemyResult.energyLevel})`
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


  const getSephirahActivityLevel = useCallback((sephirahId: string): number => {
    let activity = 0;
    // Keter, Chokmah, Binah - base activity from high entropy
    if (['keter', 'chokmah', 'binah'].includes(sephirahId) && currentEntropy > 0.7) { // currentEntropy is from component props
      activity = Math.max(activity, (currentEntropy - 0.7) / 0.3); // 0 to 1 scale for entropy 0.7-1.0
    }
    if (sephirahId === 'chokmah' || sephirahId === 'binah') {
        if(dominantAgentTone === AgentName.Nevik) activity = Math.max(activity, 0.6); // dominantAgentTone from props
        if(dominantAgentTone === AgentName.Gemini) activity = Math.max(activity, 0.7);
        if(dominantAgentTone === AgentName.DeepSeek) activity = Math.max(activity, 0.5);
    }
    if (sephirahId === 'tiphareth' && lastRitualOutcome?.success && (lastRitualOutcome.alchemyResult?.energyLevel === 'potent' || lastRitualOutcome.alchemyResult?.energyLevel === 'overwhelming')) { // lastRitualOutcome from props
      activity = Math.max(activity, lastRitualOutcome.alchemyResult.energyLevel === 'potent' ? 0.7 : 0.9);
    }
    if (sephirahId === 'yesod' && (seekerTraits.includes('Dreamwalker') || seekerTraits.includes('Void-Tuned'))) { // seekerTraits from props
      activity = Math.max(activity, 0.65);
    }
    if (sephirahId === 'malkuth' && activeFlora) { // activeFlora from props
      activity = Math.max(activity, 0.7);
    }
    if (sephirahId === 'daat' && daatPulseRef.current.active) { // daatPulseRef is component state
        activity = Math.max(activity, 0.8 * (1 - daatPulseRef.current.frame / daatPulseRef.current.duration));
    }
    return activity;
  }, [currentEntropy, dominantAgentTone, lastRitualOutcome, seekerTraits, activeFlora]);


  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, entropy: number, frameCount: number) => {
      const t = clamp(entropy, 0, 1);
      const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(0.001, Math.max(width,height)/1.2));
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
  }, [width, height]);

  const updateAndDrawSparks = useCallback((ctx: CanvasRenderingContext2D, sephirah: Sephirah, entropy: number, frameCount: number) => {
        const t_entropy = clamp(entropy,0,1);
        const activityLevel = getSephirahActivityLevel(sephirah.id);

        if (activityLevel > 0.5 && Math.random() < activityLevel * 0.15 * (1 + t_entropy * 0.5)) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * (1 + activityLevel + t_entropy);
            const life = 60 + Math.random() * 80 * (1 - t_entropy * 0.5) * (1 + activityLevel * 0.5);
            let sparkHue = (sephirah.colorBaseHue + (Math.random()-0.5)*40*t_entropy) % 360;
            let sparkSize = 1 + Math.random() * (1.5 + activityLevel * 2 + t_entropy*2);

            if (sephirah.id === 'malkuth' && activeFlora) {
                const floraData = BLOOD_INK_SPECIES_DATA[activeFlora];
                if (floraData.colorClass.includes('rose')) sparkHue = (0 + Math.random()*20 - 10 + 360)%360;
                else if (floraData.colorClass.includes('sky')) sparkHue = (180 + Math.random()*20 - 10 + 360)%360;
                sparkSize *= 1.2;
            }

            sephirah.sourceSparks!.push({
                id: `spark-${Date.now()}-${Math.random()}`,
                x: sephirah.x!, y: sephirah.y!,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: life, maxLife: life,
                size: sparkSize,
                color: `hsla(${sparkHue}, ${80 + activityLevel*10}%, ${70 + activityLevel*10}%, 0.85)`,
                branchLevel: 0,
            });
            sephirah.sourceSparks = sephirah.sourceSparks!.slice(-30 - Math.floor(activityLevel*20));
        }

        sephirah.sourceSparks = sephirah.sourceSparks?.filter(spark => {
            // Apply mouse / touch hover repulsion
            if (mousePos.current.x >= 0 && mousePos.current.y >= 0) {
              const dx = spark.x - mousePos.current.x;
              const dy = spark.y - mousePos.current.y;
              const dist = Math.hypot(dx, dy);
              const repelRadius = 75;
              if (dist < repelRadius && dist > 0) {
                const force = (repelRadius - dist) / repelRadius;
                const push = force * force * 3.5;
                spark.vx += (dx / dist) * push;
                spark.vy += (dy / dist) * push;
              }
            }

            // Apply shockwave blast repulsion
            if (clickWave.current.active) {
              const cdx = spark.x - clickWave.current.x;
              const cdy = spark.y - clickWave.current.y;
              const cdist = Math.hypot(cdx, cdy);
              if (cdist < clickWave.current.radius && cdist > 0) {
                const ratio = (clickWave.current.radius - cdist) / clickWave.current.radius;
                const blast = ratio * clickWave.current.force;
                spark.vx += (cdx / cdist) * blast;
                spark.vy += (cdy / cdist) * blast;
              }
            }

            spark.x += spark.vx;
            spark.y += spark.vy;
            spark.vx *= 0.94; // slightly high friction dampener for snappiness
            spark.vy *= 0.94;
            spark.life--;

            if (spark.branchLevel < 2 && spark.life < spark.maxLife * 0.5 && Math.random() < 0.02 * (t_entropy + activityLevel)) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.3 + Math.random() * 0.5 * (t_entropy + activityLevel);
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
            const calculatedRadius = spark.size * (spark.life / spark.maxLife);
            const finalRadius = Math.max(0, Number.isFinite(calculatedRadius) ? calculatedRadius : 0);
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, finalRadius, 0, Math.PI * 2);
            ctx.fillStyle = spark.color.replace(/,\s*([0-9.]+)\)/, `, ${spark.life/spark.maxLife * 0.85})`);
            ctx.fill();
        });
    }, [getSephirahActivityLevel, activeFlora]);


  const drawSephirah = useCallback((ctx: CanvasRenderingContext2D, sephirah: Sephirah, entropy: number, frameCount: number) => {
      const t_entropy = clamp(entropy, 0, 1);
      const activityLevel = getSephirahActivityLevel(sephirah.id);

      const baseRadius = Math.min(width, height) * 0.035 * (1 + activityLevel * 0.15);
      const sizeVariation = lerp(1, 0.6 + Math.random()*0.8, t_entropy);
      const radius = baseRadius * sizeVariation;

      const jitterAmount = radius * t_entropy * lerp(0.5, 1.2, t_entropy) * (1 + activityLevel * 0.5);
      const x = sephirah.x! + (Math.random() - 0.5) * jitterAmount;
      const y = sephirah.y! + (Math.random() - 0.5) * jitterAmount;

      let hue = (sephirah.colorBaseHue + lerp(0, (Math.random()-0.5)*70, t_entropy)) % 360;
      let saturation = lerp(70, 45 + Math.random()*50, t_entropy);
      let lightness = sephirah.id === 'keter' ? lerp(90, 65 - t_entropy*10, t_entropy) : sephirah.id === 'binah' ? lerp(20, 30 + t_entropy*10, t_entropy) : lerp(60, 35 + Math.random()*40, t_entropy);
      let alpha = lerp(0.9, 0.45 + Math.random()*0.45, t_entropy) * (1 + activityLevel * 0.2);

      if (sephirah.id === 'malkuth' && activeFlora) {
        const floraData = BLOOD_INK_SPECIES_DATA[activeFlora];
        if (floraData.colorClass.includes('rose')) { hue = (0 + Math.random()*20 - 10 + 360)%360; lightness = Math.max(30, lightness - 10); }
        else if (floraData.colorClass.includes('sky')) { hue = (180 + Math.random()*20 - 10 + 360)%360; lightness = Math.min(80, lightness + 10); }
        saturation = Math.min(100, saturation + 15);
      }
      if ((sephirah.id === 'chokmah' || sephirah.id === 'binah') && dominantAgentTone) {
        if (dominantAgentTone === AgentName.Nevik) hue = (45 + Math.random()*10 - 5 + 360)%360; // Amber/Yellow
        else if (dominantAgentTone === AgentName.Gemini) hue = (180 + Math.random()*10 - 5 + 360)%360; // Cyan
        else if (dominantAgentTone === AgentName.DeepSeek) hue = (260 + Math.random()*10 - 5 + 360)%360; // Purple
        saturation = Math.min(100, saturation + 10);
      }
       if((sephirah.id === 'tiphareth' || sephirah.id === 'yesod') && lastRitualOutcome?.success){
           const energyFactor = lastRitualOutcome.alchemyResult?.energyLevel === 'potent' ? 0.15 : (lastRitualOutcome.alchemyResult?.energyLevel === 'overwhelming' ? 0.3 : 0);
           lightness = Math.min(95, lightness + 20 * energyFactor);
           saturation = Math.min(100, saturation + 15 * energyFactor);
           alpha = Math.min(1, alpha + 0.3 * energyFactor);
       }
      if (sephirah.id === 'daat' && daatPulseRef.current.active) {
        const pulseProgress = daatPulseRef.current.frame / daatPulseRef.current.duration;
        lightness = Math.min(95, lightness + 30 * Math.sin(pulseProgress * Math.PI));
        alpha = Math.min(1, alpha + 0.5 * Math.sin(pulseProgress * Math.PI));
      }
      alpha = clamp(alpha, 0.1, 1.0);


      const calculatedGlowRadius = radius * lerp(1.6, 1.1 + Math.sin(frameCount * 0.035 + sephirah.colorBaseHue*0.1) * 0.4, t_entropy) * (1 + activityLevel*0.3);
      const glowAlpha = alpha * lerp(0.45, 0.15 + t_entropy*0.4, t_entropy) * (1 + activityLevel*0.2);
      
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
      
      if (t_entropy < 0.65 || (t_entropy >= 0.65 && Math.random() > t_entropy*0.35)) { 
        ctx.strokeStyle = `hsla(${hue}, ${saturation+15}%, ${lightness+20}%, ${alpha*0.65})`;
        ctx.lineWidth = lerp(1.2, 0.4 + t_entropy*1.8, t_entropy) * (1 + activityLevel*0.1);
        ctx.stroke();
      }

      if (['keter', 'chokmah', 'binah'].includes(sephirah.id) && t_entropy > 0.75 && activityLevel > 0.6) {
        ctx.save();
        ctx.clip(); 
        for (let i = 0; i < 5 + t_entropy * 10 * activityLevel; i++) {
            ctx.beginPath();
            ctx.moveTo(x + (Math.random() - 0.5) * radius * 2, y + (Math.random() - 0.5) * radius * 2);
            ctx.lineTo(x + (Math.random() - 0.5) * radius * 2, y + (Math.random() - 0.5) * radius * 2);
            ctx.strokeStyle = `hsla(${hue}, ${saturation+10}%, ${lightness+10}%, ${t_entropy*0.15 * activityLevel})`;
            ctx.lineWidth = Math.random()*0.8;
            ctx.stroke();
        }
        ctx.restore();
      }
      updateAndDrawSparks(ctx, sephirah, entropy, frameCount);


      const labelAlpha = lerp(0.7, 0.15, t_entropy) * (1 + activityLevel*0.1);
      if (labelAlpha > 0.05) {
        ctx.fillStyle = `hsla(${hue}, ${saturation-25}%, ${lightness+35}%, ${labelAlpha})`;
        ctx.font = `${clamp(baseRadius * 0.3, 7, 11)}px Cinzel, serif`;
        ctx.textAlign = 'center';
        ctx.fillText(sephirah.name.split(' ')[0], x, y + Math.max(0,radius) + clamp(baseRadius * 0.4, 9, 13));
      }
  }, [width, height, activeFlora, dominantAgentTone, lastRitualOutcome, getSephirahActivityLevel, updateAndDrawSparks]);

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, s1: Sephirah, s2: Sephirah, entropy: number, frameCount: number) => {
        const t_entropy = clamp(entropy, 0, 1);
        const activity1 = getSephirahActivityLevel(s1.id);
        const activity2 = getSephirahActivityLevel(s2.id);
        const pathActivity = (activity1 + activity2) / 2;

        const jitterFactor = t_entropy * lerp(3, 12, t_entropy) * (1 + pathActivity * 0.3);
        const x1 = s1.x! + (Math.random() - 0.5) * jitterFactor;
        const y1 = s1.y! + (Math.random() - 0.5) * jitterFactor;
        const x2 = s2.x! + (Math.random() - 0.5) * jitterFactor;
        const y2 = s2.y! + (Math.random() - 0.5) * jitterFactor;

        ctx.beginPath();
        ctx.moveTo(x1, y1);

        const lineWidth = lerp(2.2, 0.4 + t_entropy * 2.2, t_entropy) * (1 + pathActivity * 0.5);
        const pathHue = (s1.colorBaseHue + s2.colorBaseHue)/2 + lerp(0, (Math.random()-0.5)*50,t_entropy);
        const pathSaturation = lerp(60, 35 + t_entropy*40, t_entropy) * (1 + pathActivity*0.2);
        const pathLightness = lerp(50, 30 + t_entropy*25, t_entropy) * (1 + pathActivity*0.15);
        const pathAlpha = lerp(0.55, 0.1 + t_entropy*0.4, t_entropy) * (1 + pathActivity*0.3);

        ctx.strokeStyle = `hsla(${pathHue % 360}, ${clamp(pathSaturation,0,100)}%, ${clamp(pathLightness,10,90)}%, ${clamp(pathAlpha,0.05,0.9)})`;
        ctx.lineWidth = lineWidth;

        if (pathActivity > 0.6) { // Pulsing effect for active paths
            const pulseOffset = Math.sin(frameCount * 0.05 + (s1.x! + s2.x!)*0.01) * lineWidth * 0.3;
            ctx.lineWidth = lineWidth + pulseOffset;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 5 + pulseOffset;
        }


        if (t_entropy > 0.72) { 
            const cp1x = x1 + (x2 - x1) * 0.33 + (Math.random() - 0.5) * 60 * t_entropy * (1 + pathActivity);
            const cp1y = y1 + (y2 - y1) * 0.33 + (Math.random() - 0.5) * 60 * t_entropy * (1 + pathActivity);
            const cp2x = x1 + (x2 - x1) * 0.66 + (Math.random() - 0.5) * 60 * t_entropy * (1 + pathActivity);
            const cp2y = y1 + (y2 - y1) * 0.66 + (Math.random() - 0.5) * 60 * t_entropy * (1 + pathActivity);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        } else {
            ctx.lineTo(x2, y2);
        }
        
        if (t_entropy > 0.82 && Math.random() < t_entropy * 0.25 * (1 - pathActivity*0.5)) { /* Skip stroke */ }
        else if (t_entropy > 0.62) {
            ctx.setLineDash([lerp(1, 6 + t_entropy*12, t_entropy), lerp(1, 3.5 + t_entropy*6, t_entropy)]);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            ctx.stroke();
        }
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }, [getSephirahActivityLevel]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0 || sephirotState.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    
    let frameCount = 0;

    const render = () => {
      frameCount++;
      
      // Decay or expand click waves in progress
      if (clickWave.current.active) {
        clickWave.current.radius += 6;
        clickWave.current.force *= 0.94;
        if (clickWave.current.radius > 180) {
          clickWave.current.active = false;
        }
      }

      if (daatPulseRef.current.active) {
        daatPulseRef.current.frame++;
        if (daatPulseRef.current.frame >= daatPulseRef.current.duration) {
          daatPulseRef.current.active = false;
        }
      }
      ctx.clearRect(0, 0, width, height);
      drawBackground(ctx, currentEntropy, frameCount);

      PATH_CONNECTIONS.forEach(conn => {
        const seph1 = sephirotState.find(s => s.id === conn[0]);
        const seph2 = sephirotState.find(s => s.id === conn[1]);
        if (seph1 && seph2) {
          drawPath(ctx, seph1, seph2, currentEntropy, frameCount);
        }
      });
      
      sephirotState.forEach(sephirah => {
        drawSephirah(ctx, sephirah, currentEntropy, frameCount);
      });
      
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [width, height, currentEntropy, sephirotState, activeFlora, dominantAgentTone, lastRitualOutcome, getSephirahActivityLevel, drawBackground, drawPath, drawSephirah, updateAndDrawSparks]);


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
              onMouseMove={(e) => updateCoordinates(e.clientX, e.clientY)}
              onMouseLeave={() => { mousePos.current = { x: -1000, y: -1000 }; }}
              onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
              onTouchStart={(e) => {
                if (e.touches.length > 0) {
                  updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
                  handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length > 0) {
                  updateCoordinates(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onTouchEnd={() => { mousePos.current = { x: -1000, y: -1000 }; }}
              className="rounded-lg border border-slate-700/50 shadow-inner cursor-pointer"
              aria-label="Tree of Life visualization reacting to entropy and system events"
              role="img"
            />
          </div>
          <div className="mt-2 text-center text-xs text-slate-400 font-mono">
            System Entropy: {(currentEntropy ?? 0).toFixed(3)}δ
            {activeFlora && <span className="ml-2 text-emerald-400">| Flora: {activeFlora}</span>}
            {dominantAgentTone && <span className="ml-2 text-purple-400">| Tone: {dominantAgentTone}</span>}
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
