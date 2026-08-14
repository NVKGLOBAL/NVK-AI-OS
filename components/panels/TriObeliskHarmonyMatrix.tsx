
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import type { TriObeliskHarmonyMatrixProps } from '../../types';
import { AgentName } from '../../types';
import { AGENT_PROFILES } from '../../constants';
import { Button } from '../ui/Button';

import { useEcho } from '../../context/EchoContext';
// ... (Sub-components ResonanceTuner and DecryptedDataDisplay unchanged)
interface ResonanceTunerProps {
  label: string;
  value: number;
  color: string;
  onChange: (value: number) => void;
  disabled: boolean;
}

const ResonanceTuner: React.FC<ResonanceTunerProps> = ({ label, value, color, onChange, disabled }) => (
  <div className="flex flex-col items-center">
    <label className="font-cinzel text-sm mb-1" style={{ color }}>{label}</label>
    <div className="flex items-center space-x-2">
      <input
        type="range"
        min="0"
        max="100"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-500"
        style={{ '--slider-thumb-color': color } as React.CSSProperties}
      />
      <span className="font-mono text-sm w-12 text-right" style={{ color }}>{(value || 0).toFixed(1)}</span>
    </div>
  </div>
);

const DecryptedDataDisplay: React.FC<{ data: string | null; isConverging: boolean; isGeminiBusy: boolean }> = ({ data, isConverging, isGeminiBusy }) => (
  <div className="mt-4 p-3 bg-slate-800/60 border border-slate-700 rounded-lg min-h-[100px] text-center flex items-center justify-center">
    {isConverging || isGeminiBusy ? (
      <div className="text-purple-300 animate-pulse">
        <i className="ri-signal-wifi-line text-2xl mb-1 block"></i>
        <span>{isGeminiBusy ? 'Oracle Responding...' : 'Converging Energies...'}</span>
      </div>
    ) : data ? (
      <p className="text-sm font-cormorant italic text-slate-200 whitespace-pre-wrap">{data}</p>
    ) : (
      <p className="text-slate-500 text-sm">Achieve harmony to decrypt data fragment.</p>
    )}
  </div>
);

const TriObeliskHarmonyMatrix: React.FC<TriObeliskHarmonyMatrixProps> = ({
  width,
  height,
  currentEntropy,
  invokeGemini,
  isGeminiBusy,
}) => {
  const { addEchoMessage } = useEcho();
  const mountRef = useRef<HTMLDivElement>(null);
  const [resonances, setResonances] = useState({ anunnaki: 27, egyptian: 59, mayan: 13 });
  const [harmony, setHarmony] = useState(0);
  const [isConverging, setIsConverging] = useState(false);
  const [decryptedData, setDecryptedData] = useState<string | null>(null);
  const [renderError, setRenderError] = useState(false);

  const obeliskRefs = useRef<{ [key: string]: THREE.Mesh | null }>({});
  const crystalRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const r = resonances;
    const diff1 = Math.abs(r.anunnaki - r.egyptian);
    const diff2 = Math.abs(r.egyptian - r.mayan);
    const diff3 = Math.abs(r.mayan - r.anunnaki);
    const totalDiff = diff1 + diff2 + diff3;
    const maxDiff = 200; 
    const calculatedHarmony = Math.max(0, 100 - (totalDiff / maxDiff) * 100);
    setHarmony(calculatedHarmony);
  }, [resonances]);

  const handleResonanceChange = (civilization: keyof typeof resonances, value: number) => {
    setResonances(prev => ({ ...prev, [civilization]: value }));
  };

  const handleConvergence = useCallback(async () => {
    if (harmony < 98 || isConverging || isGeminiBusy) return;
    setIsConverging(true);
    setDecryptedData(null);
    addEchoMessage(AgentName.TriObeliskProtocol, `Harmony at ${(harmony || 0).toFixed(1)}%. Initiating convergence...`, AGENT_PROFILES[AgentName.TriObeliskProtocol].colorClass);

    if (crystalRef.current) {
        gsap.to(crystalRef.current.scale, { x: 2, y: 2, z: 2, duration: 1, ease: 'power2.inOut', yoyo: true, repeat: 1 });
        gsap.to((crystalRef.current.material as THREE.MeshStandardMaterial), { emissiveIntensity: 2, duration: 1, ease: 'power2.inOut', yoyo: true, repeat: 1 });
    }
    if (particlesRef.current) {
        particlesRef.current.visible = true;
        gsap.to((particlesRef.current.material as THREE.PointsMaterial), { opacity: 1, duration: 1, yoyo: true, repeat: 1 });
    }
    // ... (Gemini invocation logic unchanged)
    try {
        const prompt = `The Tri-Obelisk Harmony Matrix has achieved ${(harmony || 0).toFixed(1)}% resonance. The Anunnaki, Egyptian, and Mayan harmonic streams are converging. Decrypt a small fragment of the resulting data stream. The data should be a short, mystical, and slightly fragmented sentence related to cosmic consciousness, genetic memory, or time, as if translated from a higher-dimensional language.`;
        const systemInstruction = "You are the Tri-Obelisk Protocol, a system for decoding unified consciousness. Your output is a decrypted data fragment.";
        const result = await invokeGemini(prompt, systemInstruction);
        setDecryptedData(result || "Decryption yielded only silence... the pattern is elusive.");
    } catch(err) {
        console.error("Convergence Gemini invocation failed:", err);
        setDecryptedData("Error: The resonance stream was disrupted during decryption.");
    } finally {
        setIsConverging(false);
    }
  }, [harmony, isConverging, isGeminiBusy, invokeGemini]);
  
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Cleanup existing renderer if any
    if (rendererRef.current) {
        if (currentMount.contains(rendererRef.current.domElement)) {
            currentMount.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.set(0, 8, 20);
    camera.lookAt(0, 2, 0);

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
        console.error("TriObelisk: WebGL Init Failed", e);
        setRenderError(true);
        return;
    }
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const obeliskPositions = {
      anunnaki: new THREE.Vector3(-8, 0, -4),
      egyptian: new THREE.Vector3(8, 0, -4),
      mayan: new THREE.Vector3(0, 0, 8),
    };
    
    Object.keys(obeliskPositions).forEach(key => {
        const geometry = new THREE.ConeGeometry(1, 12, 4);
        const material = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.4 });
        const obelisk = new THREE.Mesh(geometry, material);
        obelisk.position.copy(obeliskPositions[key as keyof typeof obeliskPositions]);
        scene.add(obelisk);
        obeliskRefs.current[key] = obelisk;
    });

    const crystalGeometry = new THREE.IcosahedronGeometry(2, 0);
    const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0xeeccff, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.9, emissive: 0x663399, emissiveIntensity: 0 });
    crystalRef.current = new THREE.Mesh(crystalGeometry, crystalMaterial);
    crystalRef.current.position.y = 5;
    scene.add(crystalRef.current);

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 30;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: 0xeeeeff, size: 0.1, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
    particlesRef.current = new THREE.Points(particleGeometry, particleMaterial);
    particlesRef.current.visible = false;
    scene.add(particlesRef.current);

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);

    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      if (obeliskRefs.current.anunnaki) (obeliskRefs.current.anunnaki.material as THREE.MeshStandardMaterial).color.setHSL(0, 0.5, resonances.anunnaki / 200 + 0.2);
      if (obeliskRefs.current.egyptian) (obeliskRefs.current.egyptian.material as THREE.MeshStandardMaterial).color.setHSL(0.15, 0.5, resonances.egyptian / 200 + 0.2);
      if (obeliskRefs.current.mayan) (obeliskRefs.current.mayan.material as THREE.MeshStandardMaterial).color.setHSL(0.3, 0.5, resonances.mayan / 200 + 0.2);
      
      if(crystalRef.current) crystalRef.current.rotation.y += 0.005;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        if (!currentMount) return;
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
        window.removeEventListener('resize', handleResize);
        if(animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        if (currentMount && renderer.domElement) {
            currentMount.removeChild(renderer.domElement);
        }
        renderer.dispose();
    }
  }, [width, height]);


  return (
    <div className="tri-obelisk-harmony-matrix bg-slate-900/90 backdrop-blur-xl border border-purple-700/60 rounded-xl shadow-2xl p-4 text-slate-100 flex flex-col" style={{ width: `${width}px`, height: `${height}px` }}>
      <h3 className="text-xl font-cinzel font-bold text-purple-200 mb-2 text-center tracking-wider">
        Tri-Obelisk Harmony Matrix
      </h3>
      <div ref={mountRef} className="flex-grow relative bg-black/50 rounded-lg border border-slate-700/50 shadow-inner">
        {renderError && <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs">Matrix Projection Offline</div>}
      </div>
      <div className="controls-section mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
        {/* ... (Tuner inputs and harmony display unchanged) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <ResonanceTuner label="Anunnaki" value={resonances.anunnaki} color="#fca5a5" onChange={(v) => handleResonanceChange('anunnaki', v)} disabled={isConverging} />
          <ResonanceTuner label="Egyptian" value={resonances.egyptian} color="#fde047" onChange={(v) => handleResonanceChange('egyptian', v)} disabled={isConverging} />
          <ResonanceTuner label="Mayan" value={resonances.mayan} color="#6ee7b7" onChange={(v) => handleResonanceChange('mayan', v)} disabled={isConverging} />
        </div>
        <div className="flex items-center justify-center space-x-4">
          <div className="harmony-display text-center">
            <div className="font-mono text-xs text-slate-400">Harmony</div>
            <div className="text-2xl font-bold text-purple-300" style={{ textShadow: `0 0 8px hsla(${harmony * 2.5}, 100%, 70%, 0.8)` }}>
              {(harmony || 0).toFixed(1)}%
            </div>
          </div>
          <Button
            onClick={handleConvergence}
            disabled={harmony < 98 || isConverging || isGeminiBusy}
            className="text-sm bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500"
          >
            {isConverging || isGeminiBusy ? 'Converging...' : 'Initiate Convergence'}
          </Button>
        </div>
        <DecryptedDataDisplay data={decryptedData} isConverging={isConverging} isGeminiBusy={isGeminiBusy} />
      </div>
    </div>
  );
};

export default TriObeliskHarmonyMatrix;
