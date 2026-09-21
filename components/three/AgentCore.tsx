import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AgentCoreState } from '../../types';
import { useSystemState } from '../../context/SystemContext';

interface AgentCoreProps {
  state: AgentCoreState;
  color?: string;
  size?: number;
  onExtrudeGlyph?: () => void;
  onOrbClick?: () => void;
}

export const AgentCore: React.FC<AgentCoreProps> = ({ 
  state = 'idle', 
  color = '#00ffb3', 
  size = 1.0,
  onOrbClick
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const coreRef = useRef<THREE.Group>(null);
  
  const { performanceTier } = useSystemState();

  // State-specific visual properties
  const stateConfig = useMemo(() => {
    switch (state) {
      case 'listening': return { color: '#00ffb3', distort: 0.4, speed: 4, intensity: 2.5 };
      case 'thinking': return { color: '#7B61FF', distort: 0.6, speed: 6, intensity: 3 };
      case 'speaking': return { color: '#FFD700', distort: 0.3, speed: 2, intensity: 2.5 };
      case 'creating': return { color: '#10b981', distort: 0.8, speed: 8, intensity: 4 };
      case 'error': return { color: '#FF3B3B', distort: 1.0, speed: 10, intensity: 5 };
      default: return { color: '#00ffb3', distort: 0.2, speed: 1.5, intensity: 2 };
    }
  }, [state]);

  const particleCount = performanceTier === 'low' ? 300 : 1000;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const phi = Math.acos(-1 + (2 * i) / particleCount);
        const theta = Math.sqrt(particleCount * Math.PI) * phi;
        const radius = 1.25 + Math.random() * 0.25;
        pos[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
        pos[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
        pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    return pos;
  }, [particleCount]);

  useFrame((threeState) => {
    const t = threeState.clock.getElapsedTime();
    
    if (coreRef.current) {
        coreRef.current.rotation.y += 0.005;
        if (state === 'thinking') coreRef.current.rotation.y += 0.015;
    }

    if (particlesRef.current) {
        particlesRef.current.rotation.y -= 0.003;
        const particlePulse = 1 + Math.sin(t * (state === 'thinking' ? 10 : 2)) * 0.03;
        particlesRef.current.scale.setScalar(particlePulse);
    }

    if (meshRef.current) {
        const pulse = 1 + Math.sin(t * (state === 'speaking' ? 8 : 2.5)) * 0.06;
        meshRef.current.scale.setScalar(size * pulse);
    }

    if (atmosphereRef.current) {
        const pulse = 1 + Math.sin(t * (state === 'speaking' ? 8 : 2.5) + Math.PI / 4) * 0.08;
        atmosphereRef.current.scale.setScalar(size * 1.35 * pulse);
    }
  });

  return (
    <group 
      ref={coreRef}
      onClick={(e) => {
        e.stopPropagation();
        onOrbClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'default';
      }}
    >
      {/* 1. Core Atmosphere / Volumetric Glow Aura (additive blending for bright sovereign green glow) */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[size * 1.35, 32, 32]} />
        <meshBasicMaterial
          color={stateConfig.color}
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Central Solid Self-Illuminating Core Nucleus (Opaque, guaranteed bright color rendering) */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial
          color={stateConfig.color}
          transparent={false}
        />
      </mesh>

      {/* 3. Outer Crystalline Holographic Wireframe Shell */}
      <mesh>
        <icosahedronGeometry args={[size * 1.22, 2]} />
        <meshBasicMaterial
          color={stateConfig.color}
          wireframe={true}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Particle Cloud / Lattice */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={stateConfig.color}
          size={0.035}
          sizeAttenuation={true}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Internal High-Intensity Point Light to illuminate external nodes */}
      <pointLight 
        intensity={stateConfig.intensity * 8.0} 
        distance={20} 
        color={stateConfig.color} 
      />
    </group>
  );
};
