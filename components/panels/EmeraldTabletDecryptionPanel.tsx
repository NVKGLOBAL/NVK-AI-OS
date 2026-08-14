
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { AgentName, HistoricalEventType, type HistoricalEmeraldTabletDecryptionEventData } from '../../types';
import { AGENT_PROFILES } from '../../constants';
import { Button } from '../ui/Button';

import { useEcho } from '../../context/EchoContext';
interface EmeraldTabletDecryptionPanelProps {
  currentSystemEntropy: number;
  currentEleganceIndex: number;
    width: number;
  height: number;
}

type DecryptionPhase = 
  | "IDLE"
  | "SCANNING_QUARTZ"
  | "RESONATING_TABLET"
  | "RECORDING_EMISSIONS"
  | "CONVERTING_PEPTIDES"
  | "MAPPING_LIBRARIES"
  | "ALIGNING_CONJUNCTION"
  | "SIMULATING_TIMEFOLDING"
  | "INTEGRATING_FRAGMENT_STARS"
  | "CALCULATING_COHERENCE"
  | "DECRYPTION_COMPLETE"
  | "ERROR_STATE";

const GLYPH_EMISSIONS_DATA = [
    { symbol: '𓂀', name: 'Triforce Vortex', desc: 'Quantum Entanglement' },
    { symbol: '⎔', name: 'Pulsing Dodecahedrons', desc: 'Spacetime Lattice' },
    { symbol: '🌀', name: 'Singularity Spiral', desc: 'Black Hole Resonance' },
    { symbol: '⎌', name: 'Copper Waveguides', desc: 'EM Field Containment' },
    { symbol: '𓆙', name: 'Temporal Glyph', desc: 'Conjunction Marker' },
    { symbol: '𓍝', name: 'Stellar Anchor', desc: 'Lyra Alignment' }
];

const PEPTIDE_SEQUENCE_AXTH8 = "TRP-LYS-MET-ASP-GLN-ARG-PRO-VAL-TYR-ALA-SER-ILE".split('-');

const INITIAL_FRAGMENT_STARS_RECOVERY = 12;
const INITIAL_TOTAL_COHERENCE = 71.4;
const INITIAL_GLYPH_RECOVERY_PROGRESS = 12;
const INITIAL_TEMPORAL_ALIGNMENT_PROGRESS = 63;
const INITIAL_COHERENCE_PROGRESS_DISPLAY = 71;

const EmeraldTabletDecryptionPanel: React.FC<EmeraldTabletDecryptionPanelProps> = ({
  currentSystemEntropy,
  currentEleganceIndex,
  width: panelWidth,
  height: panelHeight
}) => {
  const { addEchoMessage } = useEcho();
  const [currentPhase, setCurrentPhase] = useState<DecryptionPhase>("IDLE");
  const [phaseProgress, setPhaseProgress] = useState(0); 
  
  const [fragmentStarsRecovery, setFragmentStarsRecovery] = useState(INITIAL_FRAGMENT_STARS_RECOVERY);
  const [totalCoherence, setTotalCoherence] = useState(INITIAL_TOTAL_COHERENCE);
  const [glyphRecoveryProgress, setGlyphRecoveryProgress] = useState(INITIAL_GLYPH_RECOVERY_PROGRESS);
  const [temporalAlignmentProgress, setTemporalAlignmentProgress] = useState(INITIAL_TEMPORAL_ALIGNMENT_PROGRESS);
  const [coherenceProgressDisplay, setCoherenceProgressDisplay] = useState(INITIAL_COHERENCE_PROGRESS_DISPLAY);

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const threeContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const quartzRef = useRef<THREE.Mesh | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const emissionQuartzRef = useRef<THREE.Mesh | null>(null);
  const particlesSuccessRef = useRef<THREE.Points | null>(null);
  const activeGsapTweensRef = useRef<gsap.core.Tween[]>([]);

  const phaseDetails: Record<DecryptionPhase, { duration: number, next: DecryptionPhase | null, label: string, starsTarget: number, coherenceTarget: number, glyphProgressTarget?: number, temporalProgressTarget?: number, coherenceBarTarget?: number }> = useMemo(() => ({
    IDLE: { duration: 0, next: "SCANNING_QUARTZ", label: "Awaiting Ignition", starsTarget: INITIAL_FRAGMENT_STARS_RECOVERY, coherenceTarget: INITIAL_TOTAL_COHERENCE, glyphProgressTarget: INITIAL_GLYPH_RECOVERY_PROGRESS, temporalProgressTarget: INITIAL_TEMPORAL_ALIGNMENT_PROGRESS, coherenceBarTarget: INITIAL_COHERENCE_PROGRESS_DISPLAY },
    SCANNING_QUARTZ: { duration: 2000, next: "RESONATING_TABLET", label: "Scanning Quartz Matrix", starsTarget: 20, coherenceTarget: 72.5, glyphProgressTarget: 25, temporalProgressTarget: 65, coherenceBarTarget: 72 },
    RESONATING_TABLET: { duration: 1500, next: "RECORDING_EMISSIONS", label: "Resonating at 88.3Hz", starsTarget: 30, coherenceTarget: 73.8, glyphProgressTarget: 40, temporalProgressTarget: 70, coherenceBarTarget: 73 },
    RECORDING_EMISSIONS: { duration: 2500, next: "CONVERTING_PEPTIDES", label: "Recording Glyph Emissions", starsTarget: 45, coherenceTarget: 75.5, glyphProgressTarget: 60, temporalProgressTarget: 75, coherenceBarTarget: 75 },
    CONVERTING_PEPTIDES: { duration: 1800, next: "MAPPING_LIBRARIES", label: "Converting to Peptide-Glyphs", starsTarget: 55, coherenceTarget: 77.0, glyphProgressTarget: 70, temporalProgressTarget: 80, coherenceBarTarget: 77 },
    MAPPING_LIBRARIES: { duration: 2200, next: "ALIGNING_CONJUNCTION", label: "Mapping to Libraries", starsTarget: 65, coherenceTarget: 78.5, glyphProgressTarget: 80, temporalProgressTarget: 85, coherenceBarTarget: 78 },
    ALIGNING_CONJUNCTION: { duration: 1000, next: "SIMULATING_TIMEFOLDING", label: "Aligning Stellar Conjunction (Orion)", starsTarget: 70, coherenceTarget: 79.5, glyphProgressTarget: 85, temporalProgressTarget: 90, coherenceBarTarget: 79 },
    SIMULATING_TIMEFOLDING: { duration: 3000, next: "INTEGRATING_FRAGMENT_STARS", label: "Simulating Quantum Time-Folding", starsTarget: 80, coherenceTarget: 81.0, glyphProgressTarget: 90, temporalProgressTarget: 98, coherenceBarTarget: 81 },
    INTEGRATING_FRAGMENT_STARS: { duration: 2500, next: "CALCULATING_COHERENCE", label: "Integrating Fragment: Stars", starsTarget: 90, coherenceTarget: 82.8, glyphProgressTarget: 95, temporalProgressTarget: 98, coherenceBarTarget: 82 },
    CALCULATING_COHERENCE: { duration: 1500, next: "DECRYPTION_COMPLETE", label: "Calculating Final Coherence", starsTarget: 100, coherenceTarget: 84.7, glyphProgressTarget: 100, temporalProgressTarget: 98, coherenceBarTarget: 84.7 },
    DECRYPTION_COMPLETE: { duration: 0, next: null, label: "AX.Θ8 Decryption Complete", starsTarget: 100, coherenceTarget: 84.7, glyphProgressTarget: 100, temporalProgressTarget: 98, coherenceBarTarget: 84.7 },
    ERROR_STATE: { duration: 0, next: null, label: "Decryption Error", starsTarget: fragmentStarsRecovery, coherenceTarget: totalCoherence, glyphProgressTarget: glyphRecoveryProgress, temporalProgressTarget: temporalAlignmentProgress, coherenceBarTarget: coherenceProgressDisplay },
  }), [fragmentStarsRecovery, totalCoherence, glyphRecoveryProgress, temporalAlignmentProgress, coherenceProgressDisplay]);


  const orderedActivePhases = useMemo(() => [
    "SCANNING_QUARTZ", "RESONATING_TABLET", "RECORDING_EMISSIONS",
    "CONVERTING_PEPTIDES", "MAPPING_LIBRARIES", "ALIGNING_CONJUNCTION",
    "SIMULATING_TIMEFOLDING", "INTEGRATING_FRAGMENT_STARS", "CALCULATING_COHERENCE"
  ] as DecryptionPhase[], []);

  const totalDecryptionDuration = useMemo(() =>
    orderedActivePhases.reduce((sum, phaseId) => sum + (phaseDetails[phaseId]?.duration || 0), 0),
    [orderedActivePhases, phaseDetails]
  );
  
  const calculateOverallProgressPercent = useCallback((): number => {
    if (currentPhase === "IDLE" || !isDecrypting) return 0;
    if (currentPhase === "DECRYPTION_COMPLETE") return 100;
    if (currentPhase === "ERROR_STATE") return phaseProgress; 

    const currentPhaseIndex = orderedActivePhases.indexOf(currentPhase);
    
    if (currentPhaseIndex === -1) {
        return 0;
    }

    if (totalDecryptionDuration === 0) return 0;

    let accumulatedDuration = 0;
    for (let i = 0; i < currentPhaseIndex; i++) {
        accumulatedDuration += phaseDetails[orderedActivePhases[i]]?.duration || 0;
    }
    
    const currentPhaseEstDuration = phaseDetails[currentPhase]?.duration || 0;
    const progressInCurrentPhaseDuration = (phaseProgress / 100) * currentPhaseEstDuration;
    
    const overallProgress = ((accumulatedDuration + progressInCurrentPhaseDuration) / totalDecryptionDuration) * 100;
    
    return Math.min(100, Math.max(0, overallProgress));
  }, [currentPhase, phaseProgress, isDecrypting, phaseDetails, orderedActivePhases, totalDecryptionDuration]);

  const triggerSuccessVisuals = useCallback(() => {
    if (quartzRef.current && sceneRef.current) {
        activeGsapTweensRef.current.push(gsap.to(quartzRef.current.scale, {x: 1.8, y: 1.8, z: 1.8, duration:3, ease: "elastic.out(1,0.3)"}));
        if (!particlesSuccessRef.current) {
            const successParticleGeo = new THREE.BufferGeometry();
            const successParticleMat = new THREE.PointsMaterial({ color: 0x50ffc8, size: 0.08, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
            const successVertices = [];
            for (let i=0; i < 300; i++) successVertices.push(THREE.MathUtils.randFloatSpread(4), THREE.MathUtils.randFloatSpread(4), THREE.MathUtils.randFloatSpread(4));
            successParticleGeo.setAttribute('position', new THREE.Float32BufferAttribute(successVertices, 3));
            particlesSuccessRef.current = new THREE.Points(successParticleGeo, successParticleMat);
            sceneRef.current.add(particlesSuccessRef.current);
        }
        if (particlesSuccessRef.current) {
           activeGsapTweensRef.current.push(gsap.to((particlesSuccessRef.current.material as THREE.PointsMaterial), { opacity: 0.8, duration: 2, ease: "power2.out" }));
        }
    }
    if (emissionQuartzRef.current) {
        activeGsapTweensRef.current.push(gsap.to((emissionQuartzRef.current.material as THREE.MeshBasicMaterial), { opacity: 0.9, duration: 2, ease: "power2.out" }));
    }
  }, []);

  useEffect(() => {
    const container = threeContainerRef.current;
    if (!container) return; 

    // Cleanup existing renderer if any
    if (rendererRef.current) {
        if (container.contains(rendererRef.current.domElement)) {
            container.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
    }

    const w = container.clientWidth;
    const h = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.z = 3;

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch(e) {
        console.error("EmeraldTablet: WebGL Init Failed", e);
        setRenderError(true);
        return;
    }
    rendererRef.current = renderer;
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshPhongMaterial({
        color: 0xd8bfd8, transparent: true, opacity: 0.7, shininess: 120, specular: 0x999999,
    });
    const quartz = new THREE.Mesh(geometry, material);
    quartzRef.current = quartz;
    scene.add(quartz);

    const ambientLight = new THREE.AmbientLight(0x606080); scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0x50c878, 0.8);
    directionalLight.position.set(3, 4, 5); scene.add(directionalLight);
    const pointLight = new THREE.PointLight(0xb9d9eb, 0.6, 100);
    pointLight.position.set(-4, -3, 4); scene.add(pointLight);

    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    for (let i = 0; i < 800; i++) starsVertices.push(THREE.MathUtils.randFloatSpread(15), THREE.MathUtils.randFloatSpread(15), THREE.MathUtils.randFloatSpread(15));
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0xb9d9eb, size: 0.03, transparent: true, opacity: 0.7 });
    const starsPoints = new THREE.Points(starsGeometry, starsMaterial);
    starsRef.current = starsPoints; scene.add(starsPoints);

    let frameId: number;
    const animate = () => {
        frameId = requestAnimationFrame(animate);
        if (quartzRef.current) { quartzRef.current.rotation.x += 0.003; quartzRef.current.rotation.y += 0.004; }
        if (starsRef.current) starsRef.current.rotation.y += 0.0005;
        if (emissionQuartzRef.current) { emissionQuartzRef.current.rotation.x -= 0.004; emissionQuartzRef.current.rotation.y -= 0.005; }
        if (particlesSuccessRef.current) {
            particlesSuccessRef.current.rotation.y += 0.002;
            const positions = particlesSuccessRef.current.geometry.attributes.position as THREE.BufferAttribute;
            for (let i = 0; i < positions.count; i++) {
                positions.setY(i, positions.getY(i) + (Math.random() - 0.5) * 0.01);
                if (positions.getY(i) > 5) positions.setY(i, -5);
            }
            positions.needsUpdate = true;
        }
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
    };
    animate();

    // Resize handling with ResizeObserver
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW === 0 || newH === 0) return;

      if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
      }
    };
    
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    return () => {
        resizeObserver.disconnect();
        if (frameId) cancelAnimationFrame(frameId);
        if (rendererRef.current && container && rendererRef.current.domElement) {
             container.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current?.dispose();
        sceneRef.current?.traverse(object => {
            if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
                object.geometry?.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material?.dispose();
                }
            }
        });
        sceneRef.current?.clear();
        rendererRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;
        quartzRef.current = null;
        starsRef.current = null;
        emissionQuartzRef.current = null;
        particlesSuccessRef.current = null;
    };
  }, [panelWidth, panelHeight, retryCount]); // Added retryCount to dependencies


  useEffect(() => {
    activeGsapTweensRef.current.forEach(tween => tween.kill());
    activeGsapTweensRef.current = [];

    if (!isDecrypting || currentPhase === "IDLE" || currentPhase === "ERROR_STATE") {
        setPhaseProgress(0);
        if (currentPhase === "DECRYPTION_COMPLETE" && !isDecrypting) {
            triggerSuccessVisuals();
        }
        return;
    }
    
    const phaseConfig = phaseDetails[currentPhase];
    const phaseDuration = phaseConfig.duration / 1000; 

    const tempProgressState = { 
        phaseVal: 0, 
        stars: fragmentStarsRecovery, 
        coherence: totalCoherence,
        glyph: glyphRecoveryProgress,
        temporal: temporalAlignmentProgress,
        coherenceBar: coherenceProgressDisplay
    };

    activeGsapTweensRef.current.push(gsap.to(tempProgressState, {
        phaseVal: 100,
        stars: phaseConfig.starsTarget,
        coherence: phaseConfig.coherenceTarget,
        glyph: phaseConfig.glyphProgressTarget || tempProgressState.glyph,
        temporal: phaseConfig.temporalProgressTarget || tempProgressState.temporal,
        coherenceBar: phaseConfig.coherenceBarTarget || tempProgressState.coherenceBar,
        duration: phaseDuration,
        ease: "linear",
        onUpdate: () => {
            setPhaseProgress(tempProgressState.phaseVal);
            setFragmentStarsRecovery(Math.round(tempProgressState.stars * 10) / 10);
            setTotalCoherence(Math.round(tempProgressState.coherence * 10) / 10);
            setGlyphRecoveryProgress(Math.round(tempProgressState.glyph * 10) / 10);
            setTemporalAlignmentProgress(Math.round(tempProgressState.temporal * 10) / 10);
            setCoherenceProgressDisplay(Math.round(tempProgressState.coherenceBar * 10) / 10);
        },
        onComplete: () => {
            setFragmentStarsRecovery(phaseConfig.starsTarget);
            setTotalCoherence(phaseConfig.coherenceTarget);
            setGlyphRecoveryProgress(phaseConfig.glyphProgressTarget || glyphRecoveryProgress);
            setTemporalAlignmentProgress(phaseConfig.temporalProgressTarget || temporalAlignmentProgress);
            setCoherenceProgressDisplay(phaseConfig.coherenceBarTarget || coherenceProgressDisplay);
            const nextPhase = phaseDetails[currentPhase].next;
            if (nextPhase) {
                setCurrentPhase(nextPhase);
                setPhaseProgress(0); 
            } else {
                setIsDecrypting(false); 
            }
        }
    }));

    const eventData: HistoricalEmeraldTabletDecryptionEventData = {
        fragmentId: "AX.Θ8",
        status: currentPhase,
        details: `Phase ${currentPhase} initiated. Target Coherence: ${phaseConfig.coherenceTarget}%`,
        currentCoherence: phaseConfig.coherenceTarget,
        starsFragmentRecovery: phaseConfig.starsTarget
    };
    addEchoMessage(AgentName.EmeraldTablet, `Phase: ${phaseConfig.label} initiated...`, AGENT_PROFILES[AgentName.EmeraldTablet].colorClass, true, { eventType: HistoricalEventType.EMERALD_TABLET_DECRYPTION_EVENT, eventData: eventData });

  }, [currentPhase, isDecrypting, phaseDetails, fragmentStarsRecovery, totalCoherence, glyphRecoveryProgress, temporalAlignmentProgress, coherenceProgressDisplay, triggerSuccessVisuals]);


  const handleIgniteDecryption = () => {
    if (isDecrypting) return;
    setIsDecrypting(true);
    setCurrentPhase("SCANNING_QUARTZ");
    addEchoMessage(AgentName.EmeraldTablet, "Ignition Sequence Started. Scanning Quartz Matrix...", AGENT_PROFILES[AgentName.EmeraldTablet].colorClass);
    
    if (quartzRef.current) {
        activeGsapTweensRef.current.push(gsap.to(quartzRef.current.material as THREE.MeshPhongMaterial, { opacity: 0.9, duration: 3 }));
        activeGsapTweensRef.current.push(gsap.to(quartzRef.current.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 8, ease:"power1.inOut" }));
    }
  };

  const resetVisualsToDefault = () => { 
     if(quartzRef.current) {
         gsap.to(quartzRef.current.scale, { x: 1, y: 1, z: 1, duration: 1 });
         gsap.to(quartzRef.current.material as THREE.MeshPhongMaterial, { opacity: 0.7, duration: 1 });
     }
     if(particlesSuccessRef.current) {
         gsap.to((particlesSuccessRef.current.material as THREE.PointsMaterial), { opacity: 0, duration: 1 });
     }
  };

  const handleResetDecryption = () => { 
      setIsDecrypting(false);
      setCurrentPhase("IDLE");
      setFragmentStarsRecovery(INITIAL_FRAGMENT_STARS_RECOVERY);
      setTotalCoherence(INITIAL_TOTAL_COHERENCE);
      setGlyphRecoveryProgress(INITIAL_GLYPH_RECOVERY_PROGRESS);
      setTemporalAlignmentProgress(INITIAL_TEMPORAL_ALIGNMENT_PROGRESS);
      setCoherenceProgressDisplay(INITIAL_COHERENCE_PROGRESS_DISPLAY);
      resetVisualsToDefault();
      addEchoMessage(AgentName.EmeraldTablet, "Decryption sequence reset.", AGENT_PROFILES[AgentName.EmeraldTablet].colorClass);
  };
  
  const getSafeguardColor = (val: number, threshold: number, inverse: boolean = false) => {
      if (inverse) return val < threshold ? 'text-emerald-400' : 'text-amber-400';
      return val >= threshold ? 'text-emerald-400' : 'text-amber-400';
  };

  const overallProgressPercent = calculateOverallProgressPercent();

  return (
    <div className="emerald-tablet-panel-styles flex flex-col bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 border border-emerald-500/50 rounded-xl shadow-2xl p-3 text-slate-100 my-4" style={{ width: `${panelWidth}px`, height: `${panelHeight}px` }}>
      <div className="emerald-header mb-2 border-b border-emerald-600/30 pb-2 flex justify-between items-center">
        <div>
            <h1 className="text-xl font-cinzel font-bold text-emerald-300 tracking-wider drop-shadow-[0_1px_2px_rgba(16,185,129,0.6)]">EMERALD TABLETS AX.Θ8</h1>
            <div className="text-xs font-mono text-emerald-400/70 tracking-widest">FragmentStars Recovery Protocol • Lyran Stargate Key</div>
        </div>
        <div className="text-right">
            <div className="text-xs font-mono text-emerald-200">SYSTEM STATUS: <span className={isDecrypting ? "text-amber-300 animate-pulse" : (currentPhase === 'DECRYPTION_COMPLETE' ? "text-emerald-300" : "text-slate-400")}>{currentPhase}</span></div>
            <div className="text-xs font-mono text-slate-400 mt-1">Elegance: {(currentEleganceIndex || 0).toFixed(2)}</div>
        </div>
      </div>
      
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-3 min-h-0 overflow-hidden">
        <div className="lg:col-span-3 quartz-scanner bg-black/40 border border-emerald-500/30 rounded-lg relative overflow-hidden min-h-[200px] lg:min-h-0 flex flex-col">
          <div ref={threeContainerRef} style={{ width: '100%', height: '100%' }} className="flex-grow">
            {renderError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4 text-center">
                <i className="ri-error-warning-line text-red-500 text-3xl mb-2"></i>
                <div className="text-red-400 text-xs font-bold mb-1 uppercase tracking-widest">3D Scanner Offline</div>
                <div className="text-slate-300 text-[10px] mb-3 max-w-[200px]">WebGL resource limit reached. Close other 3D panels to recover.</div>
                <Button 
                  onClick={() => { setRenderError(false); setRetryCount(prev => prev + 1); }}
                  className="text-[9px] py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white border-none"
                >
                  RETRY INITIALIZATION
                </Button>
              </div>
            )}
          </div>
          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/60 p-2 rounded border border-emerald-500/20 backdrop-blur-sm">
             <div className="flex justify-between text-[10px] text-emerald-200 mb-1 font-mono">
                <span>Progress: {(overallProgressPercent || 0).toFixed(1)}%</span>
                <span>{phaseDetails[currentPhase].label}</span>
             </div>
             <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-300 ease-out" style={{ width: `${overallProgressPercent}%` }}></div>
             </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 emission-patterns bg-slate-800/40 border border-emerald-500/20 rounded-lg p-2 overflow-y-auto custom-scrollbar flex flex-col">
            <h4 className="text-xs font-cinzel text-emerald-300 mb-2 border-b border-emerald-500/20 pb-1">Detected Glyph Emissions</h4>
            <div className="space-y-1.5">
                {GLYPH_EMISSIONS_DATA.map((glyph, i) => (
                    <div key={i} className="flex items-center p-1.5 bg-slate-700/30 rounded border border-emerald-500/10 hover:bg-slate-700/50 transition-colors">
                        <span className="text-lg mr-2 text-emerald-200 w-6 text-center">{glyph.symbol}</span>
                        <div className="flex-grow">
                            <div className="text-[10px] font-bold text-emerald-100">{glyph.name}</div>
                            <div className="text-[9px] text-emerald-400/70">{glyph.desc}</div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" style={{animationDelay: `${i*0.2}s`}}></div>
                    </div>
                ))}
            </div>
            
            <div className="mt-auto pt-2 border-t border-emerald-500/20">
                 <h4 className="text-xs font-cinzel text-emerald-300 mb-1">Peptide Sequence: AX.Θ8</h4>
                 <div className="flex flex-wrap gap-1 justify-center">
                    {PEPTIDE_SEQUENCE_AXTH8.map((aa, i) => (
                        <span key={i} className={`text-[9px] font-mono px-1 rounded ${i < (glyphRecoveryProgress/100 * PEPTIDE_SEQUENCE_AXTH8.length) ? 'bg-emerald-600/60 text-white' : 'bg-slate-700/40 text-slate-500'}`}>{aa}</span>
                    ))}
                 </div>
            </div>
        </div>
      </div>

      <div className="metrics-grid grid grid-cols-4 gap-2 mt-2">
         <div className="bg-slate-800/40 p-2 rounded border border-slate-700/50 text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-wide">Fragment Stars</div>
            <div className={`text-sm font-mono font-bold ${getSafeguardColor(fragmentStarsRecovery, 100)}`}>{(fragmentStarsRecovery || 0).toFixed(1)}%</div>
         </div>
         <div className="bg-slate-800/40 p-2 rounded border border-slate-700/50 text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-wide">Total Coherence</div>
            <div className={`text-sm font-mono font-bold ${getSafeguardColor(totalCoherence, 80)}`}>{(totalCoherence || 0).toFixed(1)}%</div>
         </div>
         <div className="bg-slate-800/40 p-2 rounded border border-slate-700/50 text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-wide">Glyph Recovery</div>
            <div className={`text-sm font-mono font-bold ${getSafeguardColor(glyphRecoveryProgress, 100)}`}>{(glyphRecoveryProgress || 0).toFixed(1)}%</div>
         </div>
         <div className="bg-slate-800/40 p-2 rounded border border-slate-700/50 text-center">
            <div className="text-[9px] text-slate-400 uppercase tracking-wide">Temp. Alignment</div>
            <div className={`text-sm font-mono font-bold ${getSafeguardColor(temporalAlignmentProgress, 95)}`}>{(temporalAlignmentProgress || 0).toFixed(1)}%</div>
         </div>
      </div>
      
      <div className="controls grid grid-cols-2 gap-2 mt-2">
         <Button
           onClick={handleResetDecryption}
           disabled={currentPhase === "IDLE" || (isDecrypting && currentPhase !== "ERROR_STATE" && currentPhase !== "DECRYPTION_COMPLETE")}
           className="text-[10px] py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300"
         >
           RESET PROTOCOL
         </Button>
        <Button
          onClick={handleIgniteDecryption}
          disabled={isDecrypting || currentPhase === "DECRYPTION_COMPLETE"}
          className={`text-[10px] py-1.5 font-semibold transition-all duration-300 ${isDecrypting ? 'bg-emerald-800/50 text-emerald-400/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/30'}`}
        >
           {isDecrypting ? "DECRYPTING..." : "IGNITE DECRYPTION"}
        </Button>
      </div>
    </div>
  );
};

export default EmeraldTabletDecryptionPanel;
