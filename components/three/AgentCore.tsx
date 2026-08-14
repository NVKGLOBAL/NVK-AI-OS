import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Text, Icosahedron, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion-3d';
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
  color = '#00E5FF', 
  size = 1.0,
  onOrbClick
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const coreRef = useRef<THREE.Group>(null);
  
  const { performanceTier } = useSystemState();

  const baseColor = useMemo(() => new THREE.Color(color), [color]);
  
  // State-specific visual properties
  const stateConfig = useMemo(() => {
    switch (state) {
      case 'listening': return { color: '#00E5FF', distort: 0.4, speed: 4, intensity: 2 };
      case 'thinking': return { color: '#7B61FF', distort: 0.6, speed: 6, intensity: 3 };
      case 'speaking': return { color: '#FFD700', distort: 0.3, speed: 2, intensity: 2.5 };
      case 'creating': return { color: '#FFD700', distort: 0.8, speed: 8, intensity: 4 };
      case 'error': return { color: '#FF3B3B', distort: 1.0, speed: 10, intensity: 5 };
      default: return { color: '#00E5FF', distort: 0.2, speed: 1.5, intensity: 1 };
    }
  }, [state]);

  const particleCount = performanceTier === 'low' ? 300 : 1000;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const phi = Math.acos(-1 + (2 * i) / particleCount);
        const theta = Math.sqrt(particleCount * Math.PI) * phi;
        const radius = 1.2 + Math.random() * 0.2;
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
        if (state === 'thinking') coreRef.current.rotation.y += 0.02;
    }

    if (particlesRef.current) {
        particlesRef.current.rotation.y -= 0.003;
        if (state === 'thinking') {
            particlesRef.current.rotation.y -= 0.01;
            particlesRef.current.scale.setScalar(1 + Math.sin(t * 10) * 0.05);
        } else {
            particlesRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.02);
        }
    }

    if (meshRef.current) {
        const pulse = 1 + Math.sin(t * (state === 'speaking' ? 8 : 2)) * 0.05;
        meshRef.current.scale.setScalar(size * pulse);
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
      {/* Central Volumetric Nucleus */}
      <Icosahedron ref={meshRef} args={[size, performanceTier === 'low' ? 2 : 4]}>
        <MeshDistortMaterial
          color={stateConfig.color}
          emissive={stateConfig.color}
          emissiveIntensity={stateConfig.intensity}
          distort={stateConfig.distort}
          speed={stateConfig.speed}
          roughness={0}
          metalness={1}
          transparent
          opacity={0.9}
        />
      </Icosahedron>

      {/* Particle Cloud / Lattice */}
      <Points ref={particlesRef} positions={positions}>
        <PointMaterial
          transparent
          vertexColors={false}
          color={stateConfig.color}
          size={0.02}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>

      {/* Internal Core Light */}
      <pointLight 
        intensity={stateConfig.intensity * 2} 
        distance={5} 
        color={stateConfig.color} 
      />

      {/* Floating State Indicators */}
      {state === 'listening' && (
         <Text
           position={[0, size + 0.8, 0]}
           fontSize={0.15}
           color={stateConfig.color}
           font="/fonts/Inter-Bold.woff"
           anchorX="center"
         >
           LISTENING...
         </Text>
      )}
    </group>
  );
};
