import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera, ContactShadows, Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SentinelShard } from '../../types';

interface OrbitNodeProps {
  shard: SentinelShard;
  isActive: boolean;
  onClick: () => void;
}

const OrbitNode: React.FC<OrbitNodeProps> = ({ shard, isActive, onClick }) => {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const elapsed = state.clock.getElapsedTime();
      
      if (!isActive) {
        // Move along concentric ring path based on angle & speed
        const currentAngle = shard.angle + elapsed * shard.speed * 0.1;
        meshRef.current.position.x = Math.cos(currentAngle) * shard.orbitRadius;
        meshRef.current.position.z = Math.sin(currentAngle) * shard.orbitRadius;
        meshRef.current.position.y = Math.sin(elapsed + shard.orbitRadius) * 0.4;
        meshRef.current.rotation.y += 0.01;
      } else {
        // Linear interpolation to front center for focused Shard
        const targetPos = new THREE.Vector3(0, 1.5, shard.orbitRadius - 2);
        meshRef.current.position.lerp(targetPos, 0.1);
        meshRef.current.rotation.y = Math.sin(elapsed * 0.5) * 0.3;
      }
    }
  });

  return (
    <group ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
        <mesh>
          <sphereGeometry args={[isActive ? 0.6 : 0.4, 16, 16]} />
          <meshStandardMaterial
            color={shard.color}
            emissive={shard.color}
            emissiveIntensity={isActive ? 2.5 : 0.6}
            transparent
            opacity={0.85}
            wireframe
          />
        </mesh>

        <pointLight distance={3} intensity={isActive ? 6 : 1.5} color={shard.color} />

        {/* Holographic Interactive 3D/2D tag */}
        <Html position={[0, 0.9, 0]} center distanceFactor={12}>
          <div 
            className={`px-2 py-1 rounded border backdrop-blur-md transition-all duration-300 font-mono text-[9px] select-none text-center cursor-pointer pointer-events-auto uppercase tracking-wider ${
              isActive 
                ? 'scale-110 border-cyan-400 bg-cyan-950/75 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.4)]' 
                : 'border-white/10 bg-slate-900/50 text-white/75 hover:bg-slate-900/80 hover:text-white'
            }`}
          >
            <div className="font-semibold text-[8px] opacity-60 mb-[1px]">{shard.kind}</div>
            <div>{shard.name}</div>
          </div>
        </Html>
      </Float>
    </group>
  );
};

interface RingProps {
  radius: number;
  color: string;
}

const ConcurrencyRing: React.FC<RingProps> = ({ radius, color }) => {
  const points = useMemo(() => {
    const pts = [];
    const segments = 120;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    return pts;
  }, [radius]);

  return (
    <line>
      <bufferGeometry attach="geometry" setFromPoints={points} />
      <lineBasicMaterial attach="material" color={color} opacity={0.15} transparent linewidth={1} />
    </line>
  );
};

// Synaptic coordination links bridging coordinates
interface SynapticConnectionProps {
  source: SentinelShard;
  target: SentinelShard;
}

const SynapticWireConnection: React.FC<SynapticConnectionProps> = ({ source, target }) => {
  const lineRef = useRef<THREE.Line>(null);

  useFrame((state) => {
    if (!lineRef.current) return;
    const elapsed = state.clock.getElapsedTime();

    // Recompute current positions
    const srcAngle = source.angle + elapsed * source.speed * 0.1;
    const tgtAngle = target.angle + elapsed * target.speed * 0.1;

    const srcPos = new THREE.Vector3(
      Math.cos(srcAngle) * source.orbitRadius,
      Math.sin(elapsed + source.orbitRadius) * 0.4,
      Math.sin(srcAngle) * source.orbitRadius
    );

    const tgtPos = new THREE.Vector3(
      Math.cos(tgtAngle) * target.orbitRadius,
      Math.sin(elapsed + target.targetId ? target.orbitRadius : target.orbitRadius) * 0.4,
      Math.sin(tgtAngle) * target.orbitRadius
    );

    // Update geometry point indices
    const positions = new Float32Array([
      srcPos.x, srcPos.y, srcPos.z,
      tgtPos.x, tgtPos.y, tgtPos.z
    ]);

    lineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry attach="geometry" />
      <lineBasicMaterial
        attach="material"
        color="#F59E0B"
        opacity={0.65}
        transparent
        dashSize={0.2}
        gapSize={0.1}
      />
    </line>
  );
};

interface OrbitProps {
  shards: SentinelShard[];
  activeId?: string;
  onSelectShard: (id: string) => void;
  connections: Array<{ sourceId: string; targetId: string }>;
}

export const Orbit: React.FC<OrbitProps> = ({ shards, activeId, onSelectShard, connections }) => {
  const rings = [4, 7, 10];

  const connectionsToRender = useMemo(() => {
    return connections.map(conn => {
      const source = shards.find(s => s.id === conn.sourceId);
      const target = shards.find(s => s.id === conn.targetId);
      if (source && target) {
        return { id: `${conn.sourceId}-${conn.targetId}`, source, target };
      }
      return null;
    }).filter(Boolean) as Array<{ id: string; source: SentinelShard; target: SentinelShard }>;
  }, [connections, shards]);

  return (
    <div className="w-full h-full bg-slate-950 rounded-xl border border-white/5 relative overflow-hidden">
      <Canvas dpr={[1, 1.5]}>
        <PerspectiveCamera makeDefault position={[0, 8, 16]} fov={55} />
        <OrbitControls 
          enablePan={false}
          enableZoom={true}
          minDistance={6}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.1} 
        />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <Stars radius={100} depth={50} count={1200} factor={4} saturation={0.5} fade speed={1.5} />

        {rings.map((radius) => (
          <ConcurrencyRing key={radius} radius={radius} color="#00E5FF" />
        ))}

        {shards.map((shard) => (
          <OrbitNode
            key={shard.id}
            shard={shard}
            isActive={activeId === shard.id}
            onClick={() => onSelectShard(shard.id)}
          />
        ))}

        {connectionsToRender.map((conn) => (
          <SynapticWireConnection
            key={conn.id}
            source={conn.source}
            target={conn.target}
          />
        ))}

        <ContactShadows position={[0, -4, 0]} opacity={0.6} scale={25} blur={1.5} far={10} />
      </Canvas>

      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30">
        <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-400">
          ● REALTIME WEBGPU SYNAP LAYER
        </span>
      </div>
    </div>
  );
};
