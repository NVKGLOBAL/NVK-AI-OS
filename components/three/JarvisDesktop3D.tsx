import React, { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera, Environment, ContactShadows, Float, Html } from '@react-three/drei';
import { AgentCore } from './AgentCore';
import * as THREE from 'three';
import { AgentCoreState, GlyphInstance, GlyphToolDefinition } from '../../types';
import { NVKSpaceBridge } from '../../integration/spaceBridge';
import { useSystemState } from '../../context/SystemContext';

interface JarvisDesktop3DProps {
  agentState: AgentCoreState;
  activeGlyphs: GlyphInstance[];
  selectedGlyphId?: string;
  onGlyphClick?: (id: string) => void;
  onCloseGlyph?: (id: string) => void;
  onExtrudeGlyph?: (glyph: GlyphInstance) => void;
  setBridge?: (bridge: NVKSpaceBridge) => void;
  onOrbClick?: () => void;
}

const OrbitingGlyph: React.FC<{
  glyph: GlyphInstance;
  index: number;
  total: number;
  isFocused: boolean;
  onClick: () => void;
}> = ({ glyph, index, total, isFocused, onClick }) => {
  const meshRef = useRef<THREE.Group>(null);
  const orbitRadius = isFocused ? 5 : 8;
  const orbitSpeed = 0.2 + (index * 0.05);
  
  useFrame((state) => {
    if (meshRef.current && !isFocused) {
      const t = state.clock.getElapsedTime() * orbitSpeed;
      const angle = (index / total) * Math.PI * 2 + t;
      meshRef.current.position.x = Math.cos(angle) * orbitRadius;
      meshRef.current.position.z = Math.sin(angle) * orbitRadius;
      meshRef.current.position.y = Math.sin(t * 0.5) * 1.5;
      meshRef.current.rotation.y += 0.01;
    } else if (meshRef.current && isFocused) {
      // Smoothly move to front center
      meshRef.current.position.lerp(new THREE.Vector3(0, 0, 8), 0.1);
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.2;
    }
  });

  return (
    <group ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh>
          <icosahedronGeometry args={[0.5, 1]} />
          <meshStandardMaterial 
            color={glyph.color} 
            emissive={glyph.color} 
            emissiveIntensity={isFocused ? 2 : 0.5}
            transparent
            opacity={0.8}
            wireframe
          />
        </mesh>
        
        {/* Holographic Label */}
        <Html position={[0, 0.8, 0]} center distanceFactor={10}>
          <div className={`px-2 py-1 rounded border backdrop-blur-md transition-all duration-500 cursor-pointer ${isFocused ? 'scale-125 border-cyan-400 bg-cyan-950/40' : 'border-white/10 bg-black/40'}`}>
            <span className={`text-[10px] font-mono whitespace-nowrap uppercase tracking-widest ${isFocused ? 'text-cyan-400' : 'text-white/60'}`}>
              {glyph.name}
            </span>
          </div>
        </Html>

        {isFocused && (
          <Html position={[4.5, 0, 0]} center distanceFactor={10}>
             <div className="w-[450px] h-[350px] bg-slate-950/90 border border-cyan-500/30 rounded-xl shadow-2xl p-4 overflow-hidden relative group">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                   <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">{glyph.name} // NODE_ALPHA</span>
                   <button onClick={(e) => { e.stopPropagation(); }} className="text-white/40 hover:text-rose-400">
                      <i className="ri-close-line"></i>
                   </button>
                </div>
                <div className="h-full overflow-y-auto custom-scrollbar">
                   {glyph.content || <div className="text-slate-500 italic p-4 text-center">Neural data stream initializing...</div>}
                </div>
             </div>
          </Html>
        )}
      </Float>
    </group>
  );
};

const PerformanceScaler: React.FC<{
  onFpsUpdate: (fps: number) => void;
  onDprUpdate: (dpr: number) => void;
  initialDpr: number;
}> = ({ onFpsUpdate, onDprUpdate, initialDpr }) => {
  const lastTime = useRef(performance.now());
  const frames = useRef(0);
  const accumulatedTime = useRef(0);
  const currentDpr = useRef(initialDpr);
  const lastScaleTime = useRef(performance.now());

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTime.current;
    lastTime.current = now;

    frames.current++;
    accumulatedTime.current += delta;

    // Calculate FPS every 30 frames (approx. 0.5s at 60fps)
    if (frames.current >= 30) {
      const fpsValue = Math.round((frames.current * 1000) / accumulatedTime.current);
      const fps = Math.min(120, Math.max(0, fpsValue));
      onFpsUpdate(fps);

      frames.current = 0;
      accumulatedTime.current = 0;

      // Adjust dpr based on FPS performance every 3 seconds to avoid visual jittering
      if (now - lastScaleTime.current > 3000) {
        if (fps < 50) {
          // Frame rate is dropping below 50 FPS: scale down quality
          if (currentDpr.current > 0.6) {
            const nextDpr = parseFloat((currentDpr.current - 0.15).toFixed(2));
            currentDpr.current = Math.max(0.6, nextDpr);
            onDprUpdate(currentDpr.current);
            lastScaleTime.current = now;
          }
        } else if (fps > 58) {
          // Perfect frame rate: scale up quality to increase fidelity, up to 1.5
          if (currentDpr.current < 1.5) {
            const nextDpr = parseFloat((currentDpr.current + 0.1).toFixed(2));
            currentDpr.current = Math.min(1.5, nextDpr);
            onDprUpdate(currentDpr.current);
            lastScaleTime.current = now;
          }
        }
      }
    }
  });

  return null;
};

const CameraController: React.FC<{
  targetDistance: number;
  setTargetDistance: React.Dispatch<React.SetStateAction<number>>;
  resetTrigger: boolean;
  setResetTrigger: React.Dispatch<React.SetStateAction<boolean>>;
  controlsRef: React.RefObject<any>;
  isMobile: boolean;
}> = ({ targetDistance, setTargetDistance, resetTrigger, setResetTrigger, controlsRef, isMobile }) => {
  const { camera } = useThree();

  useFrame(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const target = controls.target;

    // 1. Smoothly handle Reset
    if (resetTrigger) {
      const defaultPos = new THREE.Vector3(0, 0, isMobile ? 25 : 20);
      const defaultTarget = new THREE.Vector3(0, 0, 0);

      camera.position.lerp(defaultPos, 0.08);
      controls.target.lerp(defaultTarget, 0.08);
      controls.update();

      // Stop once we are very close to default
      if (camera.position.distanceTo(defaultPos) < 0.1 && controls.target.distanceTo(defaultTarget) < 0.1) {
        camera.position.copy(defaultPos);
        controls.target.copy(defaultTarget);
        setResetTrigger(false);
        // Sync targetDistance with current distance
        const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
        setTargetDistance(dir.length());
      }
      return;
    }

    // 2. Smoothly handle Zoom
    const dir = new THREE.Vector3().subVectors(camera.position, target);
    const currentDist = dir.length();
    
    // If the difference between target distance and current distance is notable, lerp it!
    if (Math.abs(currentDist - targetDistance) > 0.05) {
      const lerpedDist = THREE.MathUtils.lerp(currentDist, targetDistance, 0.12);
      dir.normalize().multiplyScalar(lerpedDist);
      camera.position.copy(target).add(dir);
      controls.update();
    }
  });

  return null;
};

export const JarvisDesktop3D: React.FC<JarvisDesktop3DProps> = ({ 
  agentState,
  activeGlyphs,
  selectedGlyphId,
  onGlyphClick,
  onExtrudeGlyph,
  setBridge,
  onOrbClick
}) => {
  const sceneRef = useRef<THREE.Scene>(null);
  const coreRef = useRef<any>(null);
  const { isMobile, performanceTier } = useSystemState();
  const bridgeCreated = useRef(false);

  // Dynamic performance scaling states
  const [localPerformanceTier, setLocalPerformanceTier] = useState<'low' | 'high'>(performanceTier === 'low' ? 'low' : 'high');
  const [dpr, setDpr] = useState<number>(performanceTier === 'low' ? 0.75 : 1.25);
  const [fps, setFps] = useState<number>(60);

  // Smooth zoom and reset states
  const controlsRef = useRef<any>(null);
  const lastKnownDistance = useRef<number>(isMobile ? 25 : 20);
  const [targetDistance, setTargetDistance] = useState<number>(isMobile ? 25 : 20);
  const [resetTrigger, setResetTrigger] = useState<boolean>(false);

  // Sync with initial system performance tier changes
  useEffect(() => {
    setLocalPerformanceTier(performanceTier === 'low' ? 'low' : 'high');
    setDpr(performanceTier === 'low' ? 0.75 : 1.25);
    setTargetDistance(isMobile ? 25 : 20);
  }, [performanceTier, isMobile]);

  const handleDprUpdate = (newDpr: number) => {
    setDpr(newDpr);
    // If resolution falls below 1.0x dpr, automatically turn off heavy visual components to keep frame rate high
    if (newDpr < 1.0 && localPerformanceTier === 'high') {
      setLocalPerformanceTier('low');
    } else if (newDpr >= 1.0 && localPerformanceTier === 'low' && performanceTier !== 'low') {
      setLocalPerformanceTier('high');
    }
  };

  // Use a ref to keep track of the latest props without triggering effect re-runs
  const latestProps = useRef({ agentState, activeGlyphs, selectedGlyphId, onExtrudeGlyph });
  useEffect(() => {
    latestProps.current = { agentState, activeGlyphs, selectedGlyphId, onExtrudeGlyph };
  });

  useEffect(() => {
    if (sceneRef.current && setBridge && !bridgeCreated.current) {
      // Mocked agent core controls for the bridge
      const agentCoreControls = {
        get state() { return latestProps.current.agentState },
        setCoreState: (s: any) => console.log(`[CORE] Forced State Change: ${s}`)
      };

      const glyphControls = {
        extrudeGlyph: (def: GlyphToolDefinition) => {
          const id = `glyph-${Date.now()}`;
          const newGlyph: GlyphInstance = {
            id,
            name: def.name,
            color: def.color || '#00E5FF',
            type: 'glyph',
            toolDefinition: def
          };
          latestProps.current.onExtrudeGlyph?.(newGlyph);
          return id;
        },
        getAllGlyphs: () => latestProps.current.activeGlyphs,
        getFocusedGlyphs: () => latestProps.current.activeGlyphs.filter(g => g.id === latestProps.current.selectedGlyphId)
      };

      const bridge = new NVKSpaceBridge(sceneRef.current, agentCoreControls, glyphControls);
      setBridge(bridge);
      bridgeCreated.current = true;
    }
  }, [sceneRef.current, !!setBridge]); // Minimal dependencies to prevent loops

  return (
    <div 
      className="fixed inset-0 z-0 bg-slate-950 select-none"
      onDoubleClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'CANVAS' || target.classList.contains('bg-slate-950')) {
          setResetTrigger(true);
        }
      }}
    >
      {/* High-Tech Diagnostic HUD for performance scaling telemetry */}
      <div className="absolute top-[68px] left-4 z-10 font-mono text-[10px] text-cyan-400/80 bg-slate-950/80 border border-cyan-500/20 rounded px-2.5 py-1.5 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center gap-3 select-none transition-all duration-300 hover:text-cyan-400 hover:border-cyan-500/40">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${fps >= 55 ? 'bg-emerald-500 animate-pulse' : fps >= 40 ? 'bg-amber-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
          <span>{fps} FPS</span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div>DPR: {dpr.toFixed(2)}x</div>
        <div className="w-px h-3 bg-white/10" />
        <div className="uppercase">TIER: {localPerformanceTier}</div>
      </div>

      {/* 3D Navigation Control Pad */}
      <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2.5 select-none md:bottom-28">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setTargetDistance(prev => Math.max(8, prev - 4));
          }}
          className="w-9 h-9 rounded-lg bg-slate-950/85 border border-cyan-500/20 hover:border-cyan-400/60 text-cyan-400/80 hover:text-cyan-300 flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:shadow-[0_0_12px_rgba(6,182,212,0.25)] active:scale-95 shadow-lg"
          title="Zoom In"
        >
          <i className="ri-add-line text-lg"></i>
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setTargetDistance(prev => Math.min(isMobile ? 55 : 35, prev + 4));
          }}
          className="w-9 h-9 rounded-lg bg-slate-950/85 border border-cyan-500/20 hover:border-cyan-400/60 text-cyan-400/80 hover:text-cyan-300 flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:shadow-[0_0_12px_rgba(6,182,212,0.25)] active:scale-95 shadow-lg"
          title="Zoom Out"
        >
          <i className="ri-subtract-line text-lg"></i>
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setResetTrigger(true);
          }}
          className="w-9 h-9 rounded-lg bg-slate-950/85 border border-cyan-500/20 hover:border-cyan-400/60 text-cyan-400/80 hover:text-cyan-300 flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:shadow-[0_0_12px_rgba(6,182,212,0.25)] active:scale-95 shadow-lg"
          title="Reset Viewport"
        >
          <i className="ri-refresh-line text-base"></i>
        </button>
      </div>

      <Canvas shadows={localPerformanceTier !== 'low'} dpr={dpr} onCreated={({ scene }) => { (sceneRef.current as any) = scene; }}>
        <PerspectiveCamera makeDefault position={[0, 0, isMobile ? 25 : 20]} fov={isMobile ? 65 : 50} />
        <OrbitControls 
          ref={controlsRef}
          enablePan={false} 
          enableZoom={true} 
          minDistance={8} 
          maxDistance={isMobile ? 55 : 35}
          enableDamping={true}
          dampingFactor={0.08}
          rotateSpeed={isMobile ? 1.4 : 0.9}
          zoomSpeed={isMobile ? 1.5 : 1.1}
          onChange={() => {
            if (controlsRef.current && !resetTrigger) {
              const controls = controlsRef.current;
              const dir = new THREE.Vector3().subVectors(controls.object.position, controls.target);
              const dist = dir.length();
              lastKnownDistance.current = dist;
              setTargetDistance(dist);
            }
          }}
        />

        <Suspense fallback={null}>
          <PerformanceScaler 
            onFpsUpdate={setFps} 
            onDprUpdate={handleDprUpdate} 
            initialDpr={performanceTier === 'low' ? 0.75 : 1.25}
          />
          <CameraController 
            targetDistance={targetDistance}
            setTargetDistance={setTargetDistance}
            resetTrigger={resetTrigger}
            setResetTrigger={setResetTrigger}
            controlsRef={controlsRef}
            isMobile={isMobile}
          />
          <Stars radius={100} depth={50} count={localPerformanceTier === 'low' ? 150 : 3000} factor={4} saturation={0} fade speed={1} />
          {localPerformanceTier !== 'low' ? (
            <Environment preset="city" />
          ) : (
            <directionalLight intensity={1.5} position={[10, 10, 10]} />
          )}
          <ambientLight intensity={0.2} />
          
          <AgentCore state={agentState} onOrbClick={onOrbClick} />

          {activeGlyphs.map((glyph, index) => (
            <OrbitingGlyph 
              key={glyph.id}
              glyph={glyph}
              index={index}
              total={activeGlyphs.length}
              isFocused={selectedGlyphId === glyph.id}
              onClick={() => onGlyphClick?.(glyph.id)}
            />
          ))}

          {localPerformanceTier !== 'low' && (
            <ContactShadows position={[0, -10, 0]} opacity={0.4} scale={40} blur={2} far={15} />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};
