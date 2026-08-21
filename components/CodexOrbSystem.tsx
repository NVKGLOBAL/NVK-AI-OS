
import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { createPortal } from 'react-dom';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { gsap } from 'gsap';
import { CyberSynth, playHaptic } from '../lib/soundEffects';
import type { PanelDefinition, NodeInfo, SubAgent, ThoughtGlyph, ClusterNode, NavigationInput } from '../types';
import { OrbMode, ParticleBackgroundMode, PanelLayout } from '../types';
import type { SystemStateContextType } from '../context/SystemContext';

const IS_MOBILE = typeof navigator !== 'undefined' ? /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) : false;

const vertexShader = `
  uniform float uTime;
  uniform float uEntropy;
  uniform vec3 uMouse;
  uniform vec3 uClickPos;
  uniform float uClickRadius;
  uniform float uClickForce;
  varying vec3 vNormal;
  varying vec3 vLocalPosition;
  
  // Perlin noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    
    // Hover deformation
    float hoverDist = distance(position, uMouse);
    float hoverDisp = 0.0;
    if (hoverDist < 8.0 && hoverDist > 0.1) {
      float f = (8.0 - hoverDist) / 8.0;
      hoverDisp = f * f * 1.8;
    }

    // Click deformation
    float clickDist = distance(position, uClickPos);
    float clickDisp = 0.0;
    if (clickDist < uClickRadius && clickDist > 0.1) {
      float cf = (uClickRadius - clickDist) / uClickRadius;
      clickDisp = cf * uClickForce * 2.5;
    }

    float noise = snoise(position.xy * (1.5 + uEntropy * 3.0) + uTime * 0.2) * 0.15 * uEntropy;
    vec3 newPosition = position + normal * (noise + hoverDisp + clickDisp);
    vLocalPosition = newPosition;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uEntropy;
  uniform float uTorusFactor;
  uniform float uFlowFactor;
  uniform float uGridFactor;
  uniform float uScanlineFactor;
  uniform float uHover;
  varying vec3 vNormal;
  varying vec3 vLocalPosition;
  
  void main() {
    // Normal vectors
    vec3 normalMat = normalize(vNormal);
    float dotProduct = clamp(dot(normalMat, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
    
    // Holographic outer Fresnel glow
    float rimIntensity = pow(1.0 - dotProduct, 3.0);
    
    // Safe Toroidal coordinates representation (highly robust, no NaN)
    vec2 p_xy = vLocalPosition.xy;
    float len_xy = length(p_xy);
    
    vec3 q;
    if (len_xy > 0.0001) {
      q = vec3(p_xy / len_xy * 2.8, 0.0);
    } else {
      q = vec3(2.8, 0.0, 0.0);
    }
    
    // Distance from the current shaded pixel to the torus major ring
    float distToTorus = length(vLocalPosition - q);
    
    // Core torus Gaussian density field (peaks directly on the torus ring, fades outwards)
    float torusCore = exp(-0.7 * distToTorus * distToTorus);
    
    // Safe poloidal direction vector
    float d_xy = len_xy - 2.8;
    vec2 poloidalVec = vec2(d_xy, vLocalPosition.z);
    float poloidalLen = length(poloidalVec);
    vec2 poloidalDir = (poloidalLen > 0.0001) ? poloidalVec / poloidalLen : vec2(1.0, 0.0);
    
    // Safe toroidal direction vector (around the XY ring)
    vec2 toroidalDir = (len_xy > 0.0001) ? p_xy / len_xy : vec2(1.0, 0.0);
    
    // Helical quantum energy streams swirling on the torus surface
    // Use angle-free waves: sin(scalar coordinates * multiplier - time * speed)
    float angleT = atan(toroidalDir.y, toroidalDir.x + 0.00001);
    float angleP = atan(poloidalDir.y, poloidalDir.x + 0.00001);
    
    float spiralFlow = sin(angleP * 4.0 + angleT * 8.0 - uTime * 4.5);
    float flowLine = smoothstep(0.7, 1.0, spiralFlow) * torusCore;
    
    // Fine holographic wireframe grid lines representing field resonance coordinates
    float toroidalGrid = abs(sin(angleT * 12.0));
    float poloidalGrid = abs(sin(angleP * 8.0));
    float gridPattern = (smoothstep(0.92, 1.0, toroidalGrid) + smoothstep(0.92, 1.0, poloidalGrid)) * torusCore * 0.45;
    
    // Vertical scanning cyber-lines
    float scanline = sin(vLocalPosition.z * 12.0 + uTime * 5.5);
    float scanlineIntensity = smoothstep(0.6, 1.0, scanline) * uScanlineFactor;
    
    // Soft, pulsing overall base glow
    float centerPulse = 0.5 + 0.5 * sin(uTime * 3.5);
    float pulseAxiom = dotProduct * centerPulse * 0.4;
    
    // Merge glowing elements together
    float glowFactor = (rimIntensity * 3.0 + pulseAxiom + torusCore * uTorusFactor + flowLine * uFlowFactor + gridPattern * uGridFactor + scanlineIntensity + uHover * 2.0);
    
    // Tactile entropy flicker
    float flicker = 1.0 - (sin(uTime * (18.0 + uEntropy * 36.0)) * 0.5 + 0.5) * uEntropy * 0.15;
    
    // Color space configuration: base vibrant green blended with electric quantum cyan and deep ultraviolet neon
    vec3 baseColor = uColor;
    vec3 quantumCyan = vec3(0.05, 0.85, 1.0);
    vec3 ultravioletField = vec3(0.48, 0.12, 1.0);
    vec3 hoverCyan = vec3(0.0, 1.0, 0.95);
    
    // Shift color based on specific field features
    vec3 baseMelt = mix(baseColor, quantumCyan, torusCore * 0.75 + flowLine * 0.3);
    vec3 streamMelt = mix(baseMelt, ultravioletField, flowLine * 0.45);
    vec3 entropyShift = mix(streamMelt, vec3(1.0, 0.35, 0.15), uEntropy * 0.65);
    vec3 hoverShift = mix(entropyShift, hoverCyan, uHover * 0.85);
    
    vec3 lighting = hoverShift * glowFactor * flicker * (1.1 + uEntropy * 0.6 + uHover * 0.5);
    
    // Alpha transparency channel: high transparency on centers, high opacity on rim glow and torus tracks
    float alphaVal = clamp(
      rimIntensity * (0.95 + uHover * 0.35) + 
      torusCore * (0.55 + uHover * 0.3) + 
      flowLine * 0.95 + 
      gridPattern * 0.5 + 
      scanlineIntensity * 0.5, 
      0.0, 
      1.0
    );
    
    // Ensure visibility of the core by establishing a solid minimum alpha threshold
    alphaVal = clamp(alphaVal * (1.0 + uEntropy * 0.4 + uHover * 0.2), 0.15, 0.99);
    
    gl_FragColor = vec4(lighting, alphaVal);
  }
`;

const AXIOM_NODES_DATA: (NodeInfo & { label: string })[] = [
  { label: 'Network', axiom: 'AX-Δ.07', role: 'Interconnectivity, Synapse Tracing' },
  { label: 'Security', axiom: 'AX-Θ.22', role: 'Boundary Logic, Trait Shielding' },
  { label: 'Data Streams', axiom: 'AX-Ω.000', role: 'Core Ritual Flow, Axiom Feed' },
  { label: 'Archive', axiom: 'AX-WEFT.04', role: 'Lore Shard Access, Dream Cache' },
  { label: 'Analytics', axiom: 'AX-INFINITY.1', role: 'Axiom Drift Monitoring, Echo Tracking' },
  { label: 'Status', axiom: 'AX-PEACE.05', role: 'Codex Resonance, Seeker Reflection' },
];

interface CodexOrbSystemProps {
  onNodeHover: (info: NodeInfo | null) => void;
  axiomsRevealed: boolean;
  panels: PanelDefinition[];
  clusterNodes: ClusterNode[];
  onPanelNodeClick: (nodeId: string) => void;
  openNodeIds: string[];
  panelLayout?: PanelLayout;
  getPanelContent: (nodeId: string) => React.ReactNode;
  systemState: SystemStateContextType;
  orbMode: OrbMode;
  particleMode: ParticleBackgroundMode;
  onPinPanel: (nodeId: string) => void;
  onClosePanel: (nodeId: string) => void;
  onTacticalBrief?: (nodeId: string) => void;
  nodeAnimationSpeed: number;
  masterPanelSize?: number;
  nodeSpacing?: number;
  nodeFlow?: number;
  onCoreOrbClick: () => void;
  subAgents?: SubAgent[];
  thoughts?: ThoughtGlyph[];
  photoSources?: string[];
  onSwapPanel?: (nodeId: string) => void;
  navigationInput?: NavigationInput | null;
  flightInput?: FlightInput | null;
  recenterTrigger?: number;
  autoRecenter?: boolean;
  onRendererError?: (hasError: boolean) => void;
  torusFactor?: number;
  flowFactor?: number;
  gridFactor?: number;
  scanlineFactor?: number;
  isLiveActive?: boolean;
  liveVolume?: number;
}

type PanelObject = {
  cssObject: CSS3DObject;
  domElement: HTMLDivElement;
  contentElement: HTMLDivElement;
};

export const CodexOrbSystem: React.FC<CodexOrbSystemProps> = ({ 
  onNodeHover, 
  axiomsRevealed, 
  panels, 
  clusterNodes,
  onPanelNodeClick,
  openNodeIds,
  panelLayout = PanelLayout.SPATIAL_ORBIT,
  getPanelContent,
  systemState,
  orbMode,
  particleMode,
  onPinPanel,
  onClosePanel,
  onTacticalBrief,
  nodeAnimationSpeed,
  masterPanelSize = 1,
  nodeSpacing = 1,
  nodeFlow = 0.5,
  onCoreOrbClick,
  subAgents = [],
  thoughts = [],
  photoSources = [],
  onSwapPanel,
  navigationInput,
  flightInput,
  recenterTrigger = 0,
  autoRecenter = true,
  onRendererError,
  torusFactor = 1.8,
  flowFactor = 4.0,
  gridFactor = 2.2,
  scanlineFactor = 0.12,
  isLiveActive = false,
  liveVolume = 0,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const navigationInputRef = useRef<NavigationInput | null>(null);
  const flightInputRef = useRef<FlightInput | null>(null);
  const [panelContainers, setPanelContainers] = useState<Record<string, HTMLDivElement>>({});
  const intersectedRef = useRef<THREE.Object3D | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const axiomNodesGroupRef = useRef<THREE.Group | null>(null);
  const panelNodesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const subAgentsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const thoughtsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const focusedNodeIdRef = useRef<string | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const focusSpeedMultiplierRef = useRef<number>(1.0);
  const prevOpenNodeIdsRef = useRef<string[]>([]);
  const focusOnPanelNodeRef = useRef<(nodeId: string) => void>(() => {});
  const panelObjectsRef = useRef<Map<string, PanelObject>>(new Map());
  const modeObjectsRef = useRef<THREE.Group>(new THREE.Group());
  const defaultOrbObjectsRef = useRef<THREE.Group>(new THREE.Group());
  const backgroundParticlesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const speedRef = useRef(nodeAnimationSpeed);
  const panelLayoutRef = useRef(panelLayout);
  const masterPanelSizeRef = useRef(masterPanelSize);
  const nodeSpacingRef = useRef(nodeSpacing);
  const nodeFlowRef = useRef(nodeFlow);
  const torusFactorRef = useRef(torusFactor);
  const flowFactorRef = useRef(flowFactor);
  const gridFactorRef = useRef(gridFactor);
  const scanlineFactorRef = useRef(scanlineFactor);
  const isLiveActiveRef = useRef(isLiveActive);
  const liveVolumeRef = useRef(liveVolume);

  useEffect(() => {
    isLiveActiveRef.current = isLiveActive;
  }, [isLiveActive]);

  useEffect(() => {
    liveVolumeRef.current = liveVolume;
  }, [liveVolume]);

  const hoveredCoreRef = useRef<THREE.Object3D | null>(null);
  const autoRecenterRef = useRef(autoRecenter);
  const [rendererError, setRendererError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const onNodeHoverRef = useRef(onNodeHover);
  const onPanelNodeClickRef = useRef(onPanelNodeClick);
  const onCoreOrbClickRef = useRef(onCoreOrbClick);
  const onTacticalBriefRef = useRef(onTacticalBrief);
  const onSwapPanelRef = useRef(onSwapPanel);
  const onRendererErrorRef = useRef(onRendererError);

  useEffect(() => {
    onRendererErrorRef.current = onRendererError;
  }, [onRendererError]);

  useEffect(() => {
    torusFactorRef.current = torusFactor;
    flowFactorRef.current = flowFactor;
    gridFactorRef.current = gridFactor;
    scanlineFactorRef.current = scanlineFactor;
  }, [torusFactor, flowFactor, gridFactor, scanlineFactor]);

  useEffect(() => {
    navigationInputRef.current = navigationInput || null;
  }, [navigationInput]);

  useEffect(() => {
    flightInputRef.current = flightInput || null;
  }, [flightInput]);

  useEffect(() => {
    autoRecenterRef.current = autoRecenter;
  }, [autoRecenter]);

  useEffect(() => {
    onNodeHoverRef.current = onNodeHover;
    onPanelNodeClickRef.current = onPanelNodeClick;
    onCoreOrbClickRef.current = onCoreOrbClick;
    onTacticalBriefRef.current = onTacticalBrief;
    onSwapPanelRef.current = onSwapPanel;
  }, [onNodeHover, onPanelNodeClick, onCoreOrbClick, onTacticalBrief, onSwapPanel]);

  useEffect(() => {
    speedRef.current = nodeAnimationSpeed;
  }, [nodeAnimationSpeed]);

  useEffect(() => {
    panelLayoutRef.current = panelLayout;
  }, [panelLayout]);

  useEffect(() => {
    masterPanelSizeRef.current = masterPanelSize;
  }, [masterPanelSize]);

  useEffect(() => {
    nodeSpacingRef.current = nodeSpacing;
  }, [nodeSpacing]);

  useEffect(() => {
    nodeFlowRef.current = nodeFlow;
  }, [nodeFlow]);

  const focusOnPanelNode = useCallback((nodeId: string) => {
    const currentCamera = cameraRef.current;
    const currentControls = controlsRef.current;
    const currentPanelNodesGroup = panelNodesGroupRef.current;
    if (!currentCamera || !currentControls || !currentPanelNodesGroup) return;

    const panelNode = currentPanelNodesGroup.getObjectByName(nodeId);
    if (panelNode) {
      focusedNodeIdRef.current = nodeId;
      isTransitioningRef.current = true;

      const targetPos = new THREE.Vector3();
      panelNode.getWorldPosition(targetPos);

      // Deep Focus Zoom Target: Zoom distance offset of 5.5 units
      const cameraOffset = new THREE.Vector3(0, 0, 5.5);
      cameraOffset.applyQuaternion(panelNode.quaternion);
      const newCameraPos = targetPos.clone().add(cameraOffset);

      gsap.to(currentCamera.position, {
          x: newCameraPos.x,
          y: newCameraPos.y,
          z: newCameraPos.z,
          duration: 1.2,
          ease: "power2.inOut"
      });

      gsap.to(currentControls.target, {
          x: targetPos.x,
          y: targetPos.y,
          z: targetPos.z,
          duration: 1.2,
          ease: "power2.inOut",
          onUpdate: () => currentControls.update(),
          onComplete: () => {
              isTransitioningRef.current = false;
          }
      });

      // Premium glowing halo flash on DOM element for visual focus recognition
      const panelObj = panelObjectsRef.current.get(nodeId);
      if (panelObj?.domElement) {
        const el = panelObj.domElement;
        gsap.killTweensOf(el);
        gsap.fromTo(el, 
          { boxShadow: '0 0 60px rgba(245, 158, 11, 1.0), 0 0 30px rgba(20, 184, 166, 0.8)' },
          { boxShadow: '0 0 0px rgba(245, 158, 11, 0), 0 0 0px rgba(20, 184, 166, 0)', duration: 1.8, ease: 'power2.out', clearProps: 'boxShadow' }
        );
      }
    }
  }, []);

  useEffect(() => {
    focusOnPanelNodeRef.current = focusOnPanelNode;
  }, [focusOnPanelNode]);

  const cleanup = useCallback((renderer?: THREE.WebGLRenderer, cssRenderer?: CSS3DRenderer, scene?: THREE.Scene, controls?: OrbitControls, resizeObserver?: ResizeObserver) => {
    if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
    }
    controls?.dispose();
    resizeObserver?.disconnect();
    
    panelObjectsRef.current.clear();

    scene?.traverse(object => {
      if ('geometry' in object && (object as any).geometry) {
        ((object as any).geometry as THREE.BufferGeometry).dispose();
      }
      if ('material' in object && (object as any).material) {
        const material = (object as any).material;
        const disposeMat = (m: any) => {
          if (m.map && typeof m.map.dispose === 'function') {
            m.map.dispose();
          }
          if (typeof m.dispose === 'function') {
            m.dispose();
          }
        };
        if (Array.isArray(material)) {
          material.forEach(disposeMat);
        } else if (material) {
          disposeMat(material);
        }
      }
    });

    renderer?.dispose();
    cameraRef.current = null;
    controlsRef.current = null;
    if(mountRef.current) {
        while (mountRef.current.firstChild) {
            mountRef.current.removeChild(mountRef.current.firstChild);
        }
    }
  }, []);

  useEffect(() => {
    const group = backgroundParticlesGroupRef.current;

    // Cleanup function to remove old particles
    const cleanupParticles = () => {
      while(group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if (child instanceof THREE.Points) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      }
    };
    
    cleanupParticles();

    // Create new particles based on mode
    const particleCount = IS_MOBILE ? 400 : 1200;
    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({ 
      color: 0x00ffb3, 
      size: 0.05, 
      blending: THREE.AdditiveBlending, 
      transparent: true, 
      opacity: 0.7 
    });

    switch (particleMode) {
      case ParticleBackgroundMode.Orbital: {
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
          const theta = Math.random() * 2 * Math.PI;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = 5.5 + Math.random() * 1.5;
          positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
          positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
          positions[i*3+2] = r * Math.cos(phi);
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const orbParticles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(orbParticles);
        break;
      }
      case ParticleBackgroundMode.Galaxy: {
        const galaxyPositions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
          const radius = Math.random() * 20;
          const angle = Math.random() * 2 * Math.PI;
          galaxyPositions[i*3] = radius * Math.cos(angle);
          galaxyPositions[i*3+1] = (Math.random() - 0.5) * 0.5; // Flat disc
          galaxyPositions[i*3+2] = radius * Math.sin(angle);
        }
        particleMaterial.size = 0.08;
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(galaxyPositions, 3));
        const galaxyParticles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(galaxyParticles);
        break;
      }
      case ParticleBackgroundMode.Stardust: {
        const halfWidth = 25;
        const numStardustParticles = particleCount / 2;
        const stardustPositions = new Float32Array(numStardustParticles * 3);
        for (let i = 0; i < numStardustParticles; i++) { 
          stardustPositions[i*3] = (Math.random() - 0.5) * halfWidth * 2;
          stardustPositions[i*3+1] = (Math.random() - 0.5) * 30;
          stardustPositions[i*3+2] = (Math.random() - 0.5) * 30;
        }
        particleMaterial.size = 0.1;
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(stardustPositions, 3));
        const stardustParticles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(stardustParticles);
        break;
      }
      case ParticleBackgroundMode.Wormhole: {
        const numWormholeParticles = particleCount * 2;
        const wormholePositions = new Float32Array(numWormholeParticles * 3);
        for (let i = 0; i < numWormholeParticles; i++) {
          const radius = 5 + Math.random() * 20;
          const angle = Math.random() * Math.PI * 2;
          wormholePositions[i*3] = radius * Math.cos(angle);
          wormholePositions[i*3+1] = radius * Math.sin(angle);
          wormholePositions[i*3+2] = (Math.random() - 0.5) * 50;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(wormholePositions, 3));
        particleMaterial.size = 0.08;
        particleMaterial.color.set(0xaa88ff);
        const wormholeParticles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(wormholeParticles);
        break;
      }
      case ParticleBackgroundMode.CosmicWeb: {
        const numWebParticles = Math.floor(particleCount * 1.5);
        const webPositions = new Float32Array(numWebParticles * 3);
        const clusterCenters = [
            new THREE.Vector3(-15, 5, -10), new THREE.Vector3(10, -10, 15),
            new THREE.Vector3(5, 15, -5), new THREE.Vector3(-10, -8, 8),
            new THREE.Vector3(18, 0, 0),
        ];
        for (let i = 0; i < numWebParticles; i++) {
            let pos: THREE.Vector3;
            if (Math.random() > 0.3) { // 70% in clusters
                const center = clusterCenters[i % clusterCenters.length];
                pos = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 5).add(center);
            } else { // 30% in filaments
                const c1 = clusterCenters[i % clusterCenters.length];
                const c2 = clusterCenters[(i + 1) % clusterCenters.length];
                pos = new THREE.Vector3().lerpVectors(c1, c2, Math.random());
                pos.add(new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.5));
            }
            webPositions[i*3] = pos.x;
            webPositions[i*3+1] = pos.y;
            webPositions[i*3+2] = pos.z;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(webPositions, 3));
        particleMaterial.size = 0.1;
        particleMaterial.color.set(0x88aaff);
        const webParticles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(webParticles);
        break;
      }
      case ParticleBackgroundMode.NeutrinoStream: {
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
          positions[i*3] = (Math.random() - 0.5) * 40;
          positions[i*3+1] = (Math.random() - 0.5) * 40;
          positions[i*3+2] = (Math.random() - 0.5) * 40;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleMaterial.size = 0.03;
        particleMaterial.color.set(0xaaaaff);
        const streamParticles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(streamParticles);
        break;
      }
      case ParticleBackgroundMode.QuantumFoam: {
        const numFoamParticles = particleCount * 2;
        const positions = new Float32Array(numFoamParticles * 3);
        const lives = new Float32Array(numFoamParticles);
        for (let i = 0; i < numFoamParticles; i++) {
            positions[i*3] = (Math.random() - 0.5) * 20;
            positions[i*3+1] = (Math.random() - 0.5) * 20;
            positions[i*3+2] = (Math.random() - 0.5) * 20;
            lives[i] = Math.random() * 50;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('life', new THREE.BufferAttribute(lives, 1));
        particleMaterial.size = 0.02;
        particleMaterial.color.set(0xccddff);
        const foamParticles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(foamParticles);
        break;
      }
      case ParticleBackgroundMode.NebulaCloud: {
        const numNebulaParticles = particleCount * 3;
        const positions = new Float32Array(numNebulaParticles * 3);
        const colors = new Float32Array(numNebulaParticles * 3);
        const color = new THREE.Color();
        for (let i = 0; i < numNebulaParticles; i++) {
            const r = 10 + Math.random() * 5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i*3+2] = r * Math.cos(phi);

            color.setHSL(0.5 + Math.random() * 0.2, 0.8, 0.5 + Math.random() * 0.2);
            colors[i*3] = color.r;
            colors[i*3+1] = color.g;
            colors[i*3+2] = color.b;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particleMaterial.size = 0.2;
        particleMaterial.vertexColors = true;
        particleMaterial.opacity = 0.3;
        const nebulaParticles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(nebulaParticles);
        break;
      }
      case ParticleBackgroundMode.SupernovaRemnant: {
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const color = new THREE.Color();
        for (let i = 0; i < particleCount; i++) {
            positions[i*3] = 0;
            positions[i*3+1] = 0;
            positions[i*3+2] = 0;
            
            const velocity = new THREE.Vector3().randomDirection().multiplyScalar(0.01 + Math.random() * 0.05);
            velocities[i*3] = velocity.x;
            velocities[i*3+1] = velocity.y;
            velocities[i*3+2] = velocity.z;

            color.setHSL(0.1 * Math.random(), 1.0, 0.6);
            colors[i*3] = color.r;
            colors[i*3+1] = color.g;
            colors[i*3+2] = color.b;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particleMaterial.size = 0.1;
        particleMaterial.vertexColors = true;
        const supernovaParticles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(supernovaParticles);
        break;
      }
      case ParticleBackgroundMode.AetherFlow: {
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
          positions[i*3] = (Math.random() - 0.5) * 50;
          positions[i*3+1] = (Math.random() - 0.5) * 50;
          positions[i*3+2] = (Math.random() - 0.5) * 50;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleMaterial.size = 0.04;
        particleMaterial.color.set(0x5577cc);
        particleMaterial.opacity = 0.4;
        const aetherParticles = new THREE.Points(particleGeometry, particleMaterial);
        group.add(aetherParticles);
        break;
      }
      case ParticleBackgroundMode.None:
      default:
        // Already cleaned up
        break;
    }

    // Ensure all background particle systems have a color attribute for dynamic multi-spectral color changes
    group.children.forEach(child => {
      if (child instanceof THREE.Points) {
        const geom = child.geometry;
        const posAttr = geom.attributes.position;
        if (posAttr) {
          if (!geom.attributes.color) {
            const count = posAttr.count;
            const colors = new Float32Array(count * 3);
            let baseColor = new THREE.Color(0x00ffb3);
            if (child.material instanceof THREE.PointsMaterial) {
              baseColor.copy(child.material.color);
              child.material.color.setHex(0xffffff); // Set to white so vertex colors dictate exact rendering
              child.material.vertexColors = true;
            }
            for (let i = 0; i < count; i++) {
              colors[i * 3] = baseColor.r;
              colors[i * 3 + 1] = baseColor.g;
              colors[i * 3 + 2] = baseColor.b;
            }
            geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          } else {
            // If color already exists, ensure material uses white and vertexColors
            if (child.material instanceof THREE.PointsMaterial) {
              child.material.color.setHex(0xffffff);
              child.material.vertexColors = true;
            }
          }
        }
      }
    });
    
    return cleanupParticles;
  }, [particleMode]);

  useEffect(() => {
    if (!mountRef.current) return;
    const currentMount = mountRef.current;
    
    const width = currentMount.clientWidth > 0 ? currentMount.clientWidth : (window.innerWidth > 0 ? window.innerWidth : 800);
    const height = currentMount.clientHeight > 0 ? currentMount.clientHeight : (window.innerHeight > 0 ? window.innerHeight : 600);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.z = 25;
    
    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
        console.error("CodexOrbSystem: WebGL Context Creation Failed", e);
        setRendererError(true);
        onRendererErrorRef.current?.(true);
        return;
    }

    renderer.domElement.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        console.warn('CodexOrbSystem: WebGL context lost');
        setRendererError(true);
        onRendererErrorRef.current?.(true);
    }, false);
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(IS_MOBILE ? Math.min(window.devicePixelRatio, 1.25) : window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(width, height);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.className = 'css3d-renderer';
    cssRenderer.domElement.style.pointerEvents = 'none';
    currentMount.appendChild(cssRenderer.domElement);

    let composer: EffectComposer | null = null;
    if (!IS_MOBILE) {
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0;
        bloomPass.strength = 1.2;
        bloomPass.radius = 0;
        composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);
    }
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;
    controls.rotateSpeed = 0.5;
    controls.panSpeed = 0.5;
    controls.screenSpacePanning = true;
    
    let lastInteractionTime = Date.now();
    controls.addEventListener('change', () => {
      lastInteractionTime = Date.now();
    });
    
    controls.addEventListener('start', () => {
      focusedNodeIdRef.current = null;
    });
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-10, -10);
    let mouseActive = false;
    const mouse3D = new THREE.Vector3(-1000, -1000, -1000);
    const clickWave3D = {
      position: new THREE.Vector3(-1000, -1000, -1000),
      radius: 0,
      active: false,
      force: 0,
    };

    const triggerClickWave = (clientX: number, clientY: number) => {
        if (!currentMount) return;
        const rect = currentMount.getBoundingClientRect();
        const mouse2D = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(mouse2D, camera);
        const tempPos = new THREE.Vector3();
        const planeNormal = new THREE.Vector3();
        camera.getWorldDirection(planeNormal).negate();
        const plane = new THREE.Plane(planeNormal, 0);
        if (raycaster.ray.intersectPlane(plane, tempPos)) {
            clickWave3D.position.copy(tempPos);
            clickWave3D.radius = 0.1;
            clickWave3D.active = true;
            clickWave3D.force = 3.5;
        }
    };

    const handleTouchMove = (event: TouchEvent) => {
        if (event.touches.length > 0 && currentMount) {
            const rect = currentMount.getBoundingClientRect();
            mouse.x = ((event.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
            mouseActive = true;
        }
    };
    const handleMouseLeave = () => {
        mouse.x = -10;
        mouse.y = -10;
        mouseActive = false;
    };
    const handlePointerDown = (event: PointerEvent) => {
        mouseActive = true;
        triggerClickWave(event.clientX, event.clientY);
    };
    const handleTouchStart = (event: TouchEvent) => {
        if (event.touches.length > 0) {
            mouseActive = true;
            triggerClickWave(event.touches[0].clientX, event.touches[0].clientY);
        }
    };
    const handleTouchEnd = () => {
        mouseActive = false;
    };

    // Default Orb Mode objects
    const orbGeometry = new THREE.IcosahedronGeometry(5, 15);
    const orbMaterial = new THREE.ShaderMaterial({ 
      vertexShader, 
      fragmentShader, 
      uniforms: { 
        uColor: { value: new THREE.Color(0x10fa70) }, 
        uTime: { value: 0 }, 
        uEntropy: { value: 0 },
        uMouse: { value: new THREE.Vector3(-1000, -1000, -1000) },
        uClickPos: { value: new THREE.Vector3(-1000, -1000, -1000) },
        uClickRadius: { value: 0 },
        uClickForce: { value: 0 },
        uTorusFactor: { value: torusFactorRef.current },
        uFlowFactor: { value: flowFactorRef.current },
        uGridFactor: { value: gridFactorRef.current },
        uScanlineFactor: { value: scanlineFactorRef.current },
        uHover: { value: 0.0 }
      }, 
      blending: THREE.AdditiveBlending, 
      transparent: true 
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.name = 'core_orb';
    defaultOrbObjectsRef.current.add(orb);
    
    scene.add(defaultOrbObjectsRef.current);
    scene.add(modeObjectsRef.current);
    scene.add(backgroundParticlesGroupRef.current);

    axiomNodesGroupRef.current = new THREE.Group();
    panelNodesGroupRef.current.clear(); 

    // Set initial scale based on axiomsRevealed
    const initialScale = axiomsRevealed ? 1 : 0;
    axiomNodesGroupRef.current.scale.set(initialScale, initialScale, initialScale);
    panelNodesGroupRef.current.scale.set(initialScale, initialScale, initialScale);

    AXIOM_NODES_DATA.forEach((data, i) => {
      const nodeGeometry = new THREE.SphereGeometry(0.8, 16, 16);
      const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffb3, wireframe: true });
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.userData = { ...data, type: 'axiom' };
      axiomNodesGroupRef.current?.add(node);
    });
    
    clusterNodes.forEach((nodeData) => {
      const panelDef = panels.find(p => p.id === nodeData.panelId);
      const nodeGeometry = new THREE.OctahedronGeometry(1.5, 0);
      const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500, wireframe: true, transparent: true, opacity: 0.6 });
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.userData = { 
        ...panelDef, 
        id: nodeData.id,
        panelId: nodeData.panelId,
        name: nodeData.label || panelDef?.name || nodeData.panelId,
        axiom: panelDef?.name || nodeData.panelId, 
        role: panelDef?.description || 'Custom Node', 
        type: 'panel' 
      };
      node.name = nodeData.id;

      // Add Glyph Label/Icon Sprite
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0, 255, 179, 0.1)';
        ctx.fillRect(0, 0, 256, 128);
        ctx.strokeStyle = '#00ffb3';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 256, 128);
        
        ctx.fillStyle = '#00ffb3';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(nodeData.label || panelDef?.name || 'NODE', 128, 60);
        
        ctx.font = '16px monospace';
        ctx.fillStyle = '#ffa500';
        ctx.fillText(panelDef?.category || 'SYSTEM', 128, 90);
      }
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.8 });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.y = 1.5;
      sprite.scale.set(4, 2, 1);
      node.add(sprite);

      panelNodesGroupRef.current.add(node);
    });

    scene.add(axiomNodesGroupRef.current);
    scene.add(panelNodesGroupRef.current);
    scene.add(subAgentsGroupRef.current);
    scene.add(thoughtsGroupRef.current);

    const handleMouseMove = (event: MouseEvent) => {
        if (!currentMount) return;
        const rect = currentMount.getBoundingClientRect();
        const width = rect.width > 0 ? rect.width : window.innerWidth;
        const height = rect.height > 0 ? rect.height : window.innerHeight;
        const left = rect.width > 0 ? rect.left : 0;
        const top = rect.width > 0 ? rect.top : 0;
        mouse.x = ((event.clientX - left) / width) * 2 - 1;
        mouse.y = -((event.clientY - top) / height) * 2 + 1;
        mouseActive = true;
    };
    const handleClick = (event?: MouseEvent) => {
        if (event && currentMount && cameraRef.current) {
            const rect = currentMount.getBoundingClientRect();
            const width = rect.width > 0 ? rect.width : window.innerWidth;
            const height = rect.height > 0 ? rect.height : window.innerHeight;
            const left = rect.width > 0 ? rect.left : 0;
            const top = rect.width > 0 ? rect.top : 0;
            mouse.x = ((event.clientX - left) / width) * 2 - 1;
            mouse.y = -((event.clientY - top) / height) * 2 + 1;

            const clickRaycaster = new THREE.Raycaster();
            clickRaycaster.setFromCamera(mouse, cameraRef.current);
            const allNodes = [...(axiomNodesGroupRef.current?.children || []), ...panelNodesGroupRef.current.children];
            const coreOrb = defaultOrbObjectsRef.current.getObjectByName('core_orb') || modeObjectsRef.current.getObjectByName('core_orb');
            const interactables = coreOrb ? [...allNodes, coreOrb] : allNodes;

            const intersects = clickRaycaster.intersectObjects(interactables, true);
            if (intersects.length > 0) {
                let obj: THREE.Object3D | null = intersects[0].object;
                while (obj && obj !== scene) {
                    if (obj.name === 'core_orb' || obj.userData?.type === 'panel' || obj.userData?.type === 'axiom') {
                        intersectedRef.current = obj;
                        break;
                    }
                    obj = obj.parent;
                }
                if (!intersectedRef.current) intersectedRef.current = intersects[0].object;
            }
        }

        const targetObj = intersectedRef.current || hoveredCoreRef.current;
        if (targetObj) {
            CyberSynth.playClick();
            playHaptic(25);

            let isCoreOrb = false;
            let curr: THREE.Object3D | null = targetObj;
            while (curr) {
                if (curr.name === 'core_orb') {
                    isCoreOrb = true;
                    break;
                }
                curr = curr.parent;
            }

            if (isCoreOrb) {
                CyberSynth.playWarp();
                playHaptic([40, 25, 40]);
                onCoreOrbClickRef.current();

                if (cameraRef.current && controlsRef.current) {
                    gsap.to(cameraRef.current.position, {
                        x: 0,
                        y: 0,
                        z: 14,
                        duration: 1.2,
                        ease: "power2.inOut"
                    });
                    gsap.to(controlsRef.current.target, {
                        x: 0,
                        y: 0,
                        z: 0,
                        duration: 1.2,
                        ease: "power2.inOut",
                        onUpdate: () => controlsRef.current?.update()
                    });
                }
            } else if (targetObj.userData?.type === 'panel') {
                const nodeId = targetObj.userData.id;
                onPanelNodeClickRef.current(nodeId);
                focusOnPanelNodeRef.current(nodeId);
            }
        }
    };
    
    // Updated handleResize to check for dimensions
    const handleResize = () => {
        if (!currentMount) return;
        const w = currentMount.clientWidth > 0 ? currentMount.clientWidth : (window.innerWidth > 0 ? window.innerWidth : 800);
        const h = currentMount.clientHeight > 0 ? currentMount.clientHeight : (window.innerHeight > 0 ? window.innerHeight : 600);

        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        cssRenderer.setSize(w, h);
        if (composer) {
            composer.setSize(w, h);
        }
    };
    
    // Use ResizeObserver for robust size detection
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(currentMount);
    requestAnimationFrame(() => handleResize());

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    // We can still listen to window resize for good measure, but ResizeObserver handles the container
    window.addEventListener('resize', handleResize); 
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    const clock = new THREE.Clock();
    
    // Recenter logic
    if (recenterTrigger > 0) {
        gsap.to(camera.position, {
            x: 0,
            y: 0,
            z: 25,
            duration: 1.5,
            ease: "expo.inOut"
        });
        gsap.to(controls.target, {
            x: 0,
            y: 0,
            z: 0,
            duration: 1.5,
            ease: "expo.inOut",
            onUpdate: () => controls.update()
        });
    }

    // Helper to restore base points configurations
    const restorePointsBase = (points: THREE.Points) => {
      const positions = points.geometry.attributes.position;
      if (!positions || !points.userData.physicsInited) return;
      const count = positions.count;
      const posArr = positions.array as Float32Array;
      const offsets = points.userData.physicsOffsets;
      if (!offsets) return;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        posArr[i3] -= offsets[i3];
        posArr[i3 + 1] -= offsets[i3 + 1];
        posArr[i3 + 2] -= offsets[i3 + 2];
      }
    };

    const tempParentPos = new THREE.Vector3();
    const tempChildPos = new THREE.Vector3();

    let cumulativeTime = 0;
    let lowFpsAccumulator = 0;
    const animate = () => {
        animationFrameIdRef.current = requestAnimationFrame(animate);
        const delta = clock.getDelta();

        // Fallback restart mechanism: if frame-rate drops below 1 fps (delta > 1.0) for more than 5 seconds, restart rendering hook
        if (delta > 1.0) {
            lowFpsAccumulator += delta;
            if (lowFpsAccumulator > 5.0) {
                console.warn("CodexOrbSystem: Frame rate dropped below 1 FPS for > 5 seconds. Automatically restarting rendering loop...");
                cancelAnimationFrame(animationFrameIdRef.current);
                setRetryCount(c => c + 1);
                return;
            }
        } else {
            lowFpsAccumulator = Math.max(0, lowFpsAccumulator - delta * 0.5);
        }
        
        // Target: 60 FPS standard (delta = ~0.0166s -> dtSim = 1.0)
        // Guard against massive lag spikes (clamping delta)
        const dtSim = Math.min(delta, 0.1) * 60;
        
        // Smoothly lerp speed multiplier for focus mode (slow layout animation to a near-halt for legibility)
        const targetMultiplier = focusedNodeIdRef.current ? 0.04 : 1.0;
        focusSpeedMultiplierRef.current += (targetMultiplier - focusSpeedMultiplierRef.current) * 0.08 * dtSim;
        
        cumulativeTime += delta * speedRef.current * focusSpeedMultiplierRef.current;
        const elapsedTime = cumulativeTime;

        // Restore Points base before existing animations modify them
        const restorePoints = (obj: THREE.Object3D) => {
            if (obj instanceof THREE.Points) {
                restorePointsBase(obj);
            }
            obj.children.forEach(restorePoints);
        };
        restorePoints(modeObjectsRef.current);

        // --- Entropy Heart Visuals ---
        const entropyValue = systemState.entropy;
        const pulseSpeed = 1 + entropyValue * 3;
        const pulseIntensity = 0.5 + entropyValue * 0.5;
        
        // Default orb animations reacting to entropy
        const rotationSpeed = 0.001 + entropyValue * 0.005;
        orb.rotation.y += rotationSpeed * speedRef.current * dtSim;
        const isCoreCurrentlyHovered = hoveredCoreRef.current !== null;
        const targetHover = isCoreCurrentlyHovered ? 1.0 : 0.0;
        if (orb.material instanceof THREE.ShaderMaterial) {
          orb.material.uniforms.uTime.value = elapsedTime * pulseSpeed;
          orb.material.uniforms.uEntropy.value = entropyValue;
          orb.material.uniforms.uMouse.value.copy(mouse3D);
          orb.material.uniforms.uClickPos.value.copy(clickWave3D.position);
          orb.material.uniforms.uClickRadius.value = clickWave3D.radius;
          orb.material.uniforms.uClickForce.value = clickWave3D.force;
          orb.material.uniforms.uTorusFactor.value = torusFactorRef.current;
          orb.material.uniforms.uFlowFactor.value = flowFactorRef.current;
          orb.material.uniforms.uGridFactor.value = gridFactorRef.current;
          orb.material.uniforms.uScanlineFactor.value = scanlineFactorRef.current;
          if (orb.material.uniforms.uHover) {
            orb.material.uniforms.uHover.value += (targetHover - orb.material.uniforms.uHover.value) * 0.2 * dtSim;
          }
        }
        
        let targetScale = 1 + Math.sin(elapsedTime * pulseSpeed * 2) * 0.05 * pulseIntensity;
        if (isLiveActiveRef.current) {
           targetScale += liveVolumeRef.current * 0.5;
           // Add extra rotation based on volume
           orb.rotation.y += liveVolumeRef.current * 0.2 * dtSim;
        }
        orb.scale.setScalar(targetScale);
        
        // --- Particle Background Animations ---
        const backgroundGroup = backgroundParticlesGroupRef.current;
        switch (particleMode) {
          case ParticleBackgroundMode.Orbital:
            if (backgroundGroup.children.length > 0) {
              backgroundGroup.children[0].rotation.y += (rotationSpeed * 1.5) * speedRef.current * dtSim;
              const mat = (backgroundGroup.children[0] as THREE.Points).material as THREE.PointsMaterial;
              mat.opacity = 0.5 + entropyValue * 0.4;
              mat.size = 0.05 + entropyValue * 0.05;
            }
            break;
          case ParticleBackgroundMode.Galaxy:
            backgroundGroup.rotation.y += 0.0005 * (1 + entropyValue) * speedRef.current * dtSim;
            break;
          case ParticleBackgroundMode.Stardust: {
            const stardust = backgroundGroup.children[0] as THREE.Points;
            if (stardust) {
              const positions = stardust.geometry.attributes.position;
              const halfWidth = 25; // Define bounds for wrapping
              for (let i = 0; i < positions.count; i++) {
                let x = positions.getX(i);
                x -= (0.01 + entropyValue * 0.02) * speedRef.current * dtSim;
                if (x < -halfWidth) {
                  x = halfWidth;
                }
                positions.setX(i, x);
              }
              positions.needsUpdate = true;
            }
            break;
          }
          case ParticleBackgroundMode.Wormhole: {
            const wormhole = backgroundGroup.children[0] as THREE.Points;
            if (wormhole) {
              const positions = wormhole.geometry.attributes.position;
              for (let i=0; i < positions.count; i++) {
                let z = positions.getZ(i);
                z -= (0.1 + entropyValue * 0.2) * speedRef.current * dtSim;
                if (z < -25) {
                    z = 25;
                }
                positions.setZ(i, z);
              }
              positions.needsUpdate = true;
              wormhole.rotation.z += 0.001 * speedRef.current * dtSim;
            }
            break;
          }
          case ParticleBackgroundMode.CosmicWeb:
            backgroundGroup.rotation.y += 0.0002 * speedRef.current * dtSim;
            backgroundGroup.rotation.x += 0.0001 * speedRef.current * dtSim;
            break;
          case ParticleBackgroundMode.NeutrinoStream: {
            const stream = backgroundGroup.children[0] as THREE.Points;
            if (stream) {
              const positions = stream.geometry.attributes.position;
              for (let i = 0; i < positions.count; i++) {
                let y = positions.getY(i);
                y += 0.2 * speedRef.current * dtSim; // Fast vertical movement
                if (y > 20) {
                    y = -20;
                }
                positions.setY(i, y);
              }
              positions.needsUpdate = true;
            }
            break;
          }
          case ParticleBackgroundMode.QuantumFoam: {
            const foam = backgroundGroup.children[0] as THREE.Points;
            if (foam) {
              const positions = foam.geometry.attributes.position;
              const lives = foam.geometry.attributes.life as THREE.BufferAttribute;
              for (let i = 0; i < positions.count; i++) {
                lives.setX(i, lives.getX(i) - 1 * speedRef.current * dtSim);
                if (lives.getX(i) <= 0) {
                    positions.setXYZ(i, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
                    lives.setX(i, Math.random() * 50);
                }
              }
              positions.needsUpdate = true;
              lives.needsUpdate = true;
            }
            break;
          }
          case ParticleBackgroundMode.NebulaCloud:
            backgroundGroup.rotation.y += 0.0001 * speedRef.current * dtSim;
            backgroundGroup.rotation.x += 0.0002 * speedRef.current * dtSim;
            break;
          case ParticleBackgroundMode.SupernovaRemnant: {
            const supernova = backgroundGroup.children[0] as THREE.Points;
            if (supernova) {
              const positions = supernova.geometry.attributes.position;
              const velocities = supernova.geometry.attributes.velocity as THREE.BufferAttribute;
              const maxRadiusSq = 30 * 30;
              for (let i = 0; i < positions.count; i++) {
                positions.setX(i, positions.getX(i) + velocities.getX(i) * speedRef.current * dtSim);
                positions.setY(i, positions.getY(i) + velocities.getY(i) * speedRef.current * dtSim);
                positions.setZ(i, positions.getZ(i) + velocities.getZ(i) * speedRef.current * dtSim);

                const distSq = positions.getX(i)**2 + positions.getY(i)**2 + positions.getZ(i)**2;
                if (distSq > maxRadiusSq) {
                    positions.setXYZ(i, 0, 0, 0);
                }
              }
              positions.needsUpdate = true;
            }
            break;
          }
          case ParticleBackgroundMode.AetherFlow: {
            const aether = backgroundGroup.children[0] as THREE.Points;
            if (aether) {
              const positions = aether.geometry.attributes.position;
              for (let i = 0; i < positions.count; i++) {
                let x = positions.getX(i);
                x += 0.02 * speedRef.current * dtSim;
                if (x > 25) {
                    x = -25;
                }
                positions.setX(i, x);
              }
              positions.needsUpdate = true;
            }
            break;
          }
        }

        // Mode specific animations
        const group = modeObjectsRef.current;
        switch(orbMode) {
            case OrbMode.CrystallineMatrix:
                group.rotation.y += 0.0005 * speedRef.current;
                group.children.forEach(crystal => {
                    if (crystal instanceof THREE.Mesh && crystal.geometry instanceof THREE.BoxGeometry) {
                      crystal.rotation.x += crystal.userData.rotationSpeed.x * speedRef.current;
                      crystal.rotation.y += crystal.userData.rotationSpeed.y * speedRef.current;
                    }
                });
                break;
            case OrbMode.EntropicStorm:
            case OrbMode.ChaoticNucleus:
                const storm = group.children.find(c => c instanceof THREE.Points) as THREE.Points;
                if (storm) {
                    const positions = storm.geometry.attributes.position;
                    const velocities = storm.userData.velocities;
                    const entropyFactor = systemState.entropy * (orbMode === OrbMode.ChaoticNucleus ? 0.35 : 0.2);
                    for (let i=0; i < positions.count; i++) {
                        velocities[i].x += (Math.random() - 0.5) * entropyFactor * 0.01;
                        velocities[i].y += (Math.random() - 0.5) * entropyFactor * 0.01;
                        velocities[i].z += (Math.random() - 0.5) * entropyFactor * 0.01;
                        positions.setX(i, positions.getX(i) + velocities[i].x * speedRef.current);
                        positions.setY(i, positions.getY(i) + velocities[i].y * speedRef.current);
                        positions.setZ(i, positions.getZ(i) + velocities[i].z * speedRef.current);
                        const dSq = positions.getX(i)**2 + positions.getY(i)**2 + positions.getZ(i)**2;
                        if (dSq > 10**2) {
                            positions.setXYZ(i, (Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2);
                        }
                    }
                    positions.needsUpdate = true;
                }
                group.children.filter(c => c instanceof THREE.Mesh).forEach(shard => {
                  shard.rotation.x += shard.userData.rotSpeed.x * speedRef.current;
                  shard.rotation.y += shard.userData.rotSpeed.y * speedRef.current;
                });
                break;
            case OrbMode.AethericWeave:
                group.rotation.y += 0.001 * speedRef.current;
                group.children.forEach((strand, i) => {
                    if (strand instanceof THREE.Mesh && strand.material instanceof THREE.ShaderMaterial) {
                      strand.material.uniforms.uTime.value = elapsedTime + i * 0.2;
                    }
                });
                break;
            case OrbMode.StarlightConductor:
                const star = group.children[0] as THREE.Mesh;
                if(star) star.rotation.y += 0.002 * speedRef.current;
                const starfield = group.children[1] as THREE.Points;
                if(starfield) starfield.rotation.y += 0.0003 * speedRef.current;
                break;
            case OrbMode.VoidShell:
                group.rotation.y += 0.001 * speedRef.current;
                const voidParticles = group.children[1] as THREE.Points;
                if(voidParticles) voidParticles.rotation.y += 0.002 * speedRef.current;
                break;
            case OrbMode.BioLattice:
                group.rotation.y += 0.001 * speedRef.current;
                group.children.forEach((node, i) => {
                    if (node instanceof THREE.Mesh && node.material instanceof THREE.MeshBasicMaterial) {
                      const pulse = 0.5 + Math.sin(elapsedTime * 2 + i * 0.5) * 0.5;
                      node.material.opacity = 0.4 + pulse * 0.5;
                    }
                });
                break;
            case OrbMode.ResonantSpire:
                group.rotation.y += 0.0015 * speedRef.current;
                const spireContainer = group.children[0];
                if (spireContainer) {
                    spireContainer.children.forEach(child => {
                        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.TorusGeometry) {
                            child.rotation.z += child.userData.rotationSpeed * speedRef.current;
                        }
                        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
                            // Pulse the tip
                            const pulse = 0.5 + Math.sin(elapsedTime * 3) * 0.5;
                            (child.material as THREE.MeshBasicMaterial).color.setHSL(0, 0, 0.8 + pulse * 0.2);
                        }
                    });
                }
                break;
            case OrbMode.TemporalRift:
                 group.rotation.y += 0.0008 * speedRef.current;
                 group.children.forEach((plane, i) => {
                    if (plane instanceof THREE.Mesh && plane.material instanceof THREE.ShaderMaterial) {
                      plane.material.uniforms.uTime.value = elapsedTime * (1 + i*0.1);
                    }
                 });
                break;
        }

        axiomNodesGroupRef.current?.children.forEach((node, i) => {
          const angle = (i / AXIOM_NODES_DATA.length) * Math.PI * 2 + elapsedTime * 0.1;
          node.position.x = 15 * Math.cos(angle);
          node.position.z = 15 * Math.sin(angle);
          node.position.y = (Math.sin(angle * 2.5) * 5);
        });
        
        panelNodesGroupRef.current?.children.forEach((node, i) => {
          const layout = panelLayoutRef.current;
          const total = clusterNodes.length;
          
          // Apply master panel size
          node.scale.set(masterPanelSizeRef.current, masterPanelSizeRef.current, masterPanelSizeRef.current);

          if (layout === PanelLayout.SPATIAL_ORBIT) {
            const angle = (i / total) * Math.PI * 2 - elapsedTime * 0.08 * nodeFlowRef.current;
            const radius = 20 * nodeSpacingRef.current;
            node.position.x = radius * Math.cos(angle);
            node.position.z = radius * Math.sin(angle);
            node.position.y = (Math.cos(angle * 3) * 6 * nodeSpacingRef.current);
            node.lookAt(0, 0, 0);
          } else if (layout === PanelLayout.GRID_MATRIX) {
            const cols = Math.ceil(Math.sqrt(total));
            const row = Math.floor(i / cols);
            const col = i % cols;
            const spacing = 22 * nodeSpacingRef.current;
            node.position.x = (col - cols / 2) * spacing + (spacing / 2);
            node.position.y = (row - Math.ceil(total / cols) / 2) * -spacing + (spacing / 2);
            node.position.z = -15;
            node.rotation.set(0, 0, 0);
          } else if (layout === PanelLayout.LATTICE_MESH) {
            const angle = (i / total) * Math.PI * 2;
            const radius = 25 * nodeSpacingRef.current;
            node.position.x = radius * Math.cos(angle);
            node.position.y = ((i % 2 === 0 ? 10 : -10) + Math.sin(elapsedTime * 0.5 * nodeFlowRef.current + i) * 2) * nodeSpacingRef.current;
            node.position.z = radius * Math.sin(angle);
            node.lookAt(0, 0, 0);
          } else if (layout === PanelLayout.CCTV_ARRAY) {
            const cols = 4;
            const row = Math.floor(i / cols);
            const col = i % cols;
            const radius = 30 * nodeSpacingRef.current;
            const theta = (col / cols) * Math.PI - Math.PI / 2;
            const phi = (row / Math.ceil(total / cols)) * Math.PI / 2 - Math.PI / 4;
            node.position.x = radius * Math.sin(theta) * Math.cos(phi);
            node.position.y = radius * Math.sin(phi);
            node.position.z = radius * Math.cos(theta) * Math.cos(phi) - 10;
            node.lookAt(0, 0, -10);
          } else if (layout === PanelLayout.TOPOLOGY_MESH) {
            const angle = i * Math.PI * 2.39996; // Golden ratio
            const radius = Math.sqrt(i + 1) * 4 * nodeSpacingRef.current;
            node.position.x = radius * Math.cos(angle);
            node.position.z = radius * Math.sin(angle);
            node.position.y = Math.sin(radius * 0.5 - elapsedTime * nodeFlowRef.current) * 5 * nodeSpacingRef.current;
            node.lookAt(0, node.position.y, 0);
          } else if (layout === PanelLayout.SEARCH_NEXUS) {
            if (i === 0) {
              node.position.set(0, 0, 10);
              node.rotation.set(0, 0, 0);
            } else {
              const angle = ((i - 1) / (total - 1)) * Math.PI * 2 + elapsedTime * 0.1 * nodeFlowRef.current;
              const radius = 15 * nodeSpacingRef.current;
              node.position.x = radius * Math.cos(angle);
              node.position.z = radius * Math.sin(angle) - 5;
              node.position.y = Math.sin(elapsedTime * nodeFlowRef.current + i) * 3 * nodeSpacingRef.current;
              node.lookAt(0, 0, 10);
            }
          } else if (layout === PanelLayout.FOCUS_PRIMARY) {
            if (i === 0) {
              node.position.set(0, 0, 15);
              node.rotation.set(0, 0, 0);
            } else {
              const spacing = 5 * nodeSpacingRef.current;
              node.position.set(-30 + (i * spacing), -15, -10);
              node.rotation.set(0, 0, 0);
            }
          } else if (layout === PanelLayout.TAB_BROWSER) {
            node.position.set(0, 0, 15 - i * 0.1);
            node.rotation.set(0, 0, 0);
            if (i > 0) {
              node.position.x = 1000; // Hide others
            }
          }
        });

        subAgentsGroupRef.current?.children.forEach((node, i) => {
          const count = subAgentsGroupRef.current.children.length;
          const angle = (i / count) * Math.PI * 2 + elapsedTime * 0.2;
          node.position.x = 10 * Math.cos(angle);
          node.position.z = 10 * Math.sin(angle);
          node.position.y = Math.sin(elapsedTime * 2 + i) * 2;
          node.rotation.y += 0.01;
          node.rotation.x += 0.01;
        });

        thoughtsGroupRef.current?.children.forEach((node, i) => {
          node.userData.age += 0.016; // approx delta time
          const age = node.userData.age;
          node.position.y = 5 + age * 2;
          node.position.x = Math.sin(age * 2 + i) * 5;
          node.position.z = Math.cos(age * 2 + i) * 5;
          if (node.material instanceof THREE.Material) {
            node.material.opacity = Math.max(0, 1 - age / 10);
          }
        });

        raycaster.setFromCamera(mouse, camera);
        const allNodes = [...(axiomNodesGroupRef.current?.children || []), ...panelNodesGroupRef.current.children];
        const coreOrb = defaultOrbObjectsRef.current.getObjectByName('core_orb') || modeObjectsRef.current.getObjectByName('core_orb');
        const interactables = coreOrb ? [...allNodes, coreOrb] : allNodes;

        const intersects = raycaster.intersectObjects(interactables, true);
        let firstIntersect: THREE.Object3D | null = null;
        if (intersects.length > 0) {
            let obj: THREE.Object3D | null = intersects[0].object;
            while (obj && obj !== scene) {
                if (obj.name === 'core_orb' || obj.userData?.type === 'panel' || obj.userData?.type === 'axiom') {
                    firstIntersect = obj;
                    break;
                }
                obj = obj.parent;
            }
            if (!firstIntersect) firstIntersect = intersects[0].object;
        }

        let isHoveringCore = false;
        if (firstIntersect) {
            let curr: THREE.Object3D | null = firstIntersect;
            while (curr) {
                if (curr.name === 'core_orb') {
                    isHoveringCore = true;
                    break;
                }
                curr = curr.parent;
            }
        }

        if (isHoveringCore && firstIntersect) {
            if (hoveredCoreRef.current !== firstIntersect) {
                if (hoveredCoreRef.current) {
                    gsap.to(hoveredCoreRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
                }
                hoveredCoreRef.current = firstIntersect;
                document.body.style.cursor = 'pointer';
                gsap.to(hoveredCoreRef.current.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.3 });
                if ((hoveredCoreRef.current as THREE.Mesh).material instanceof THREE.ShaderMaterial) {
                    gsap.to(((hoveredCoreRef.current as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uEntropy, { value: 1.0, duration: 0.3 });
                }
            }
            intersectedRef.current = firstIntersect;
        } else {
            if (hoveredCoreRef.current) {
                document.body.style.cursor = 'default';
                gsap.to(hoveredCoreRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
                if ((hoveredCoreRef.current as THREE.Mesh).material instanceof THREE.ShaderMaterial) {
                    gsap.to(((hoveredCoreRef.current as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uEntropy, { value: systemState.entropy, duration: 0.3 });
                }
                hoveredCoreRef.current = null;
            }

            if (firstIntersect) {
                if (intersectedRef.current !== firstIntersect) {
                    if (intersectedRef.current) gsap.to(intersectedRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
                    intersectedRef.current = firstIntersect;
                    gsap.to(intersectedRef.current.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.3 });
                    onNodeHoverRef.current(intersectedRef.current.userData as NodeInfo);
                    document.body.style.cursor = 'pointer';
                }
            } else {
                if (intersectedRef.current) {
                    gsap.to(intersectedRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
                    onNodeHoverRef.current(null);
                    document.body.style.cursor = 'default';
                }
                intersectedRef.current = null;
            }
        }

        // Flight Navigation (6-DOF)
        if (flightInputRef.current && !flightInputRef.current.isLocked) {
            const { translation, rotation } = flightInputRef.current;
            const speed = 0.5 * speedRef.current;
            const rotSpeed = 0.02;

            // 1. Translation
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

            const moveVector = new THREE.Vector3()
                .add(right.multiplyScalar(translation.x * speed))
                .add(up.multiplyScalar(translation.y * speed))
                .add(forward.multiplyScalar(translation.z * speed));

            camera.position.add(moveVector);
            controls.target.add(moveVector);

            // 2. Rotation (Pitch/Yaw)
            if (Math.abs(rotation.yaw) > 0.1 || Math.abs(rotation.pitch) > 0.1) {
                // We rotate the camera around its current position
                // This is a bit tricky with OrbitControls enabled, but we can adjust the target
                const offset = controls.target.clone().sub(camera.position);
                
                // Yaw (around world up or camera up? Usually world up for navigation)
                const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rotation.yaw * rotSpeed);
                offset.applyQuaternion(yawQuat);
                
                // Pitch (around camera right)
                const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, -rotation.pitch * rotSpeed);
                offset.applyQuaternion(pitchQuat);
                
                controls.target.copy(camera.position).add(offset);
            }
        }

        // OmniWheel Navigation (Legacy/Simplified)
        if (navigationInputRef.current && (!flightInputRef.current || !flightInputRef.current.isLocked)) {
            const { x, y } = navigationInputRef.current;
            const speed = 0.5 * speedRef.current;
            
            // Calculate movement vector relative to camera orientation
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
            
            const moveVector = right.clone().multiplyScalar(x * speed).add(up.clone().multiplyScalar(y * speed));
            
            camera.position.add(moveVector);
            controls.target.add(moveVector);
        }

        // Lock mechanism
        if (flightInputRef.current?.isLocked) {
            controls.enabled = false;
        } else {
            controls.enabled = true;
        }

        // --- Interaction & Physical Physics Simulation of Particles / Meshes ---
        if (clickWave3D.active) {
            clickWave3D.radius += 0.55 * speedRef.current * dtSim; // Faster expansion velocity
            clickWave3D.force *= Math.pow(0.92, dtSim); // Safe exponential friction decay
            if (clickWave3D.force < 0.002 || clickWave3D.radius > 18.0) {
                clickWave3D.active = false;
                clickWave3D.force = 0;
                clickWave3D.radius = 0;
                clickWave3D.position.set(-1000, -1000, -1000);
            }
        } else {
            clickWave3D.force = 0;
            clickWave3D.radius = 0;
        }

        // Sync local cursor projected 3D plane
        if (mouseActive) {
            raycaster.setFromCamera(mouse, camera);
            const planeNormal = new THREE.Vector3();
            camera.getWorldDirection(planeNormal).negate();
            const plane = new THREE.Plane(planeNormal, 0);
            raycaster.ray.intersectPlane(plane, mouse3D);
        } else {
            mouse3D.set(-1000, -1000, -1000);
        }

        // Extract camera direction once per frame for screen-space calculations
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir).normalize();

        // Interact on all active Points systems (background + mode-specific)
        const interactWithPoints = (points: THREE.Points) => {
            const positions = points.geometry.attributes.position;
            if (!positions) return;
            const count = positions.count;
            if (!points.userData.physicsInited) {
                points.userData.physicsInited = true;
                points.userData.physicsVelocities = new Float32Array(count * 3);
                points.userData.physicsOffsets = new Float32Array(count * 3);
                points.userData.originalPositions = (positions.array as Float32Array).slice();
            }
            const vels = points.userData.physicsVelocities;
            const offsets = points.userData.physicsOffsets;
            const posArr = positions.array as Float32Array;
            const origArr = points.userData.originalPositions;

            // Resolve dynamic colors array for multi-spectral responsive shifting
            const colorsAttr = points.geometry.attributes.color;
            const colorsArr = colorsAttr ? colorsAttr.array as Float32Array : null;
            if (colorsAttr && !points.userData.originalColors) {
                points.userData.originalColors = colorsArr.slice();
            }
            const origColors = points.userData.originalColors;

            const pointsWorldPos = new THREE.Vector3();
            points.getWorldPosition(pointsWorldPos);
            
            const localMouse = mouse3D.clone().sub(pointsWorldPos);
            const invRotation = points.quaternion.clone().invert();
            localMouse.applyQuaternion(invRotation);
            
            const localClickPos = clickWave3D.position.clone().sub(pointsWorldPos).applyQuaternion(invRotation);
            
            const repelRadius = 5.0; // Slightly larger for better range and tactility
            const repelRadiusSq = repelRadius * repelRadius;
            const clickActive = clickWave3D.active;
            const clickRadius = clickWave3D.radius;
            const clickRadiusSq = clickRadius * clickRadius;
            const clickForce = clickWave3D.force;
            const speedFact = speedRef.current;

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                let ox = offsets[i3];
                let oy = offsets[i3 + 1];
                let oz = offsets[i3 + 2];
                
                let vx = vels[i3];
                let vy = vels[i3 + 1];
                let vz = vels[i3 + 2];
                
                const k = 0.085; // Snappy return spring
                vx += -ox * k * dtSim;
                vy += -oy * k * dtSim;
                vz += -oz * k * dtSim;
                
                const px = origArr[i3];
                const py = origArr[i3 + 1];
                const pz = origArr[i3 + 2];

                let mouseDist = -1;
                let hoverIntensity = 0;
                
                if (mouse3D.x > -900) {
                    const dx = px - localMouse.x;
                    const dy = py - localMouse.y;
                    const dz = pz - localMouse.z;
                    const distSq = dx*dx + dy*dy + dz*dz;
                    if (distSq < repelRadiusSq && distSq > 0.0001) {
                        mouseDist = Math.sqrt(distSq);
                        hoverIntensity = (repelRadius - mouseDist) / repelRadius;
                        
                        // Linear push force (repulsion)
                        const push = hoverIntensity * hoverIntensity * 0.32 * speedFact * dtSim;
                        const invDist = 1 / mouseDist;
                        const pX = dx * invDist;
                        const pY = dy * invDist;
                        const pZ = dz * invDist;
                        vx += pX * push;
                        vy += pY * push;
                        vz += pZ * push;

                        // Screen-space circular swirl tangent (cross product of direction with camera vector)
                        // Bends the particles into a liquid magnetic vortex around the cursor!
                        const tx = pY * cameraDir.z - pZ * cameraDir.y;
                        const ty = pZ * cameraDir.x - pX * cameraDir.z;
                        const tz = pX * cameraDir.y - pY * cameraDir.x;
                        const swirl = hoverIntensity * 0.48 * speedFact * dtSim;
                        vx += tx * swirl;
                        vy += ty * swirl;
                        vz += tz * swirl;
                    }
                }

                let waveIntensity = 0;
                if (clickActive) {
                    const dx = px - localClickPos.x;
                    const dy = py - localClickPos.y;
                    const dz = pz - localClickPos.z;
                    const distSq = dx*dx + dy*dy + dz*dz;
                    if (distSq < clickRadiusSq && distSq > 0.0001) {
                        const dist = Math.sqrt(distSq);
                        const ratio = (clickRadius - dist) / clickRadius;
                        
                        // Push outward along shockwave wavefront
                        const blast = ratio * clickForce * 0.65 * speedFact * dtSim;
                        const invDist = 1 / dist;
                        const bX = dx * invDist;
                        const bY = dy * invDist;
                        const bZ = dz * invDist;
                        vx += bX * blast;
                        vy += bY * blast;
                        vz += bZ * blast;

                        // Shockwave swirling wavefront shear (creates a gorgeous spiraling ripple)
                        const tx = bY * cameraDir.z - bZ * cameraDir.y;
                        const ty = bZ * cameraDir.x - bX * cameraDir.z;
                        const tz = bX * cameraDir.y - bY * cameraDir.x;
                        const shear = ratio * clickForce * 0.38 * speedFact * dtSim;
                        vx += tx * shear;
                        vy += ty * shear;
                        vz += tz * shear;

                        // Precision wave ring highlighter
                        const waveWidth = 2.2;
                        const waveDist = Math.abs(dist - clickRadius);
                        if (waveDist < waveWidth) {
                            waveIntensity = (1.0 - waveDist / waveWidth) * (clickForce / 3.5);
                        }
                    }
                }
                
                // Damping scaled relative to time step
                const damping = Math.pow(0.86, dtSim);
                vx *= damping;
                vy *= damping;
                vz *= damping;
                
                ox += vx * dtSim;
                oy += vy * dtSim;
                oz += vz * dtSim;
                
                vels[i3] = vx;
                vels[i3 + 1] = vy;
                vels[i3 + 2] = vz;
                
                offsets[i3] = ox;
                offsets[i3 + 1] = oy;
                offsets[i3 + 2] = oz;
                
                posArr[i3] = px + ox;
                posArr[i3 + 1] = py + oy;
                posArr[i3 + 2] = pz + oz;

                // Dynamically modify RGB values for high-tactility feedback
                if (colorsArr && origColors) {
                    const r0 = origColors[i3];
                    const g0 = origColors[i3 + 1];
                    const b0 = origColors[i3 + 2];

                    // Speed-based kinetic glow
                    const velocitySq = vx*vx + vy*vy + vz*vz;
                    const kineticGlow = Math.min(velocitySq * 0.15, 0.6);

                    // Hover golden-white plasma glow
                    const hoverGlow = hoverIntensity * 0.5;

                    // Click shockwave neon pink/fuchsia ignition ripple
                    const rippleGlow = waveIntensity * 1.5;

                    // Blend components (over-exposing RGB values slightly so they pop through the UnrealBloomPass)
                    let tr = r0 + kineticGlow * 0.4 + hoverGlow * 0.6 + rippleGlow * 1.0;
                    let tg = g0 + kineticGlow * 0.6 + hoverGlow * 0.8 + rippleGlow * 0.2;
                    let tb = b0 + kineticGlow * 1.0 + hoverGlow * 0.3 + rippleGlow * 1.0;

                    colorsArr[i3] = Math.min(tr, 1.5);
                    colorsArr[i3 + 1] = Math.min(tg, 1.5);
                    colorsArr[i3 + 2] = Math.min(tb, 1.5);
                }
            }
            positions.needsUpdate = true;
            if (colorsAttr) {
                colorsAttr.needsUpdate = true;
            }
        };

        const interactWithMesh = (child: THREE.Mesh) => {
            if (!child.userData.originalPos) {
                child.userData.originalPos = child.position.clone();
            }
            if (!child.userData.physicsVel) {
                child.userData.physicsVel = new THREE.Vector3();
            }
            if (!child.userData.physicsOffset) {
                child.userData.physicsOffset = new THREE.Vector3();
            }
            
            const targetPos = child.userData.originalPos;
            const vel = child.userData.physicsVel as THREE.Vector3;
            const offset = child.userData.physicsOffset as THREE.Vector3;
            
            const k = 0.11; // Harder & crisp resilient return spring constant for meshes
            vel.x += -offset.x * k * dtSim;
            vel.y += -offset.y * k * dtSim;
            vel.z += -offset.z * k * dtSim;
            
            // Resolve world child position once
            tempParentPos.set(0, 0, 0);
            if (child.parent) {
                child.parent.getWorldPosition(tempParentPos);
            }
            tempChildPos.copy(child.userData.originalPos).add(tempParentPos).add(offset);
            
            let mouseDist = -1;
            if (mouse3D.x > -900) {
                const dx = tempChildPos.x - mouse3D.x;
                const dy = tempChildPos.y - mouse3D.y;
                const dz = tempChildPos.z - mouse3D.z;
                const distSq = dx*dx + dy*dy + dz*dz;
                const repelRadius = 6.0;
                const repelRadiusSq = repelRadius * repelRadius;
                if (distSq < repelRadiusSq && distSq > 0.01) {
                    mouseDist = Math.sqrt(distSq);
                    const force = (repelRadius - mouseDist) / repelRadius;
                    
                    // Push force (away from mouse)
                    const push = force * force * 0.75 * speedRef.current * dtSim; // Stronger push force
                    const invDist = 1 / mouseDist;
                    const pX = dx * invDist;
                    const pY = dy * invDist;
                    const pZ = dz * invDist;
                    vel.x += pX * push;
                    vel.y += pY * push;
                    vel.z += pZ * push;

                    // Grid vortex orbital swing on meshes
                    const tx = pY * cameraDir.z - pZ * cameraDir.y;
                    const ty = pZ * cameraDir.x - pX * cameraDir.z;
                    const tz = pX * cameraDir.y - pY * cameraDir.x;
                    const swirl = force * 0.65 * speedRef.current * dtSim;
                    vel.x += tx * swirl;
                    vel.y += ty * swirl;
                    vel.z += tz * swirl;
                }
            }
            
            if (clickWave3D.active) {
                const dx = tempChildPos.x - clickWave3D.position.x;
                const dy = tempChildPos.y - clickWave3D.position.y;
                const dz = tempChildPos.z - clickWave3D.position.z;
                const distSq = dx*dx + dy*dy + dz*dz;
                const clickRadius = clickWave3D.radius;
                const clickRadiusSq = clickRadius * clickRadius;
                if (distSq < clickRadiusSq && distSq > 0.01) {
                    const dist = Math.sqrt(distSq);
                    const ratio = (clickRadius - dist) / clickRadius;
                    
                    // Blast force (push)
                    const blast = ratio * clickWave3D.force * 1.15 * speedRef.current * dtSim; // Deeper wave displacement
                    const invDist = 1 / dist;
                    const bX = dx * invDist;
                    const bY = dy * invDist;
                    const bZ = dz * invDist;
                    vel.x += bX * blast;
                    vel.y += bY * blast;
                    vel.z += bZ * blast;

                    // Shockwave swirling shear on meshes
                    const tx = bY * cameraDir.z - bZ * cameraDir.y;
                    const ty = bZ * cameraDir.x - bX * cameraDir.z;
                    const tz = bX * cameraDir.y - bY * cameraDir.x;
                    const shear = ratio * clickWave3D.force * 0.55 * speedRef.current * dtSim;
                    vel.x += tx * shear;
                    vel.y += ty * shear;
                    vel.z += tz * shear;
                }
            }
            
            const damping = Math.pow(0.86, dtSim);
            vel.x *= damping;
            vel.y *= damping;
            vel.z *= damping;
            
            offset.x += vel.x * dtSim;
            offset.y += vel.y * dtSim;
            offset.z += vel.z * dtSim;
            
            child.position.copy(targetPos).add(offset);

            // Expressive pulse scaling
            if (mouse3D.x > -900) {
                const dist = mouseDist >= 0 ? mouseDist : tempChildPos.distanceTo(mouse3D);
                if (dist < 6.0) {
                    const sf = 1.0 + (6.0 - dist) / 6.0 * 0.35;
                    child.scale.set(sf, sf, sf);
                } else {
                    child.scale.set(1, 1, 1);
                }
            } else {
                child.scale.set(1, 1, 1);
            }
        };

        const applyPointsInteraction = (obj: THREE.Object3D) => {
            if (obj instanceof THREE.Points) {
                interactWithPoints(obj);
            }
            obj.children.forEach(applyPointsInteraction);
        };
        applyPointsInteraction(group);

        group.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.name !== 'core_orb' && !child.userData.isLatticeLine) {
                if (child.children.length > 0) {
                    child.children.forEach(subchild => {
                        if (subchild instanceof THREE.Mesh && subchild.name !== 'core_orb') {
                            interactWithMesh(subchild);
                        }
                    });
                } else {
                    interactWithMesh(child);
                }
            }
        });

        // Let standard shader materials consume mouse/click values
        group.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                child.material.uniforms.uMouse.value.copy(mouse3D);
                child.material.uniforms.uClickPos.value.copy(clickWave3D.position);
                child.material.uniforms.uClickRadius.value = clickWave3D.radius;
                child.material.uniforms.uClickForce.value = clickWave3D.force;
            }
        });

        // Dynamic BioLattice line matching
        if (orbMode === OrbMode.BioLattice) {
            const latticeLinesObj = group.getObjectByName('lattice_lines') as THREE.LineSegments | undefined;
            if (latticeLinesObj && latticeLinesObj.userData.links) {
                const linksList = latticeLinesObj.userData.links as { nodeI: THREE.Mesh, nodeJ: THREE.Mesh }[];
                const linePositions = latticeLinesObj.geometry.attributes.position;
                if (linePositions) {
                    const posArr = linePositions.array as Float32Array;
                    for (let index = 0; index < linksList.length; index++) {
                        const { nodeI, nodeJ } = linksList[index];
                        const i6 = index * 6;
                        posArr[i6] = nodeI.position.x;
                        posArr[i6 + 1] = nodeI.position.y;
                        posArr[i6 + 2] = nodeI.position.z;
                        posArr[i6 + 3] = nodeJ.position.x;
                        posArr[i6 + 4] = nodeJ.position.y;
                        posArr[i6 + 5] = nodeJ.position.z;
                    }
                    linePositions.needsUpdate = true;
                }
            }
        }

        // Active follow-lock to keep camera and OrbitControls aligned to focused panel
        if (focusedNodeIdRef.current && !isTransitioningRef.current) {
            const panelNode = panelNodesGroupRef.current.getObjectByName(focusedNodeIdRef.current);
            if (panelNode) {
                const targetPos = new THREE.Vector3();
                panelNode.getWorldPosition(targetPos);
                
                // lerp OrbitControls target smoothly
                controls.target.lerp(targetPos, 0.08 * dtSim);
                
                // lerp camera position to maintain perfect parallel orientation at 5.5 units distance
                const cameraOffset = new THREE.Vector3(0, 0, 5.5);
                cameraOffset.applyQuaternion(panelNode.quaternion);
                const idealCamPos = targetPos.clone().add(cameraOffset);
                camera.position.lerp(idealCamPos, 0.08 * dtSim);
            }
        }

        // --- Auto Recenter Idle Logic ---
        if (autoRecenterRef.current && !focusedNodeIdRef.current) {
            const now = Date.now();
            if (now - lastInteractionTime > 7000) {
                const defaultPos = new THREE.Vector3(0, 0, 25);
                const defaultTarget = new THREE.Vector3(0, 0, 0);
                camera.position.lerp(defaultPos, 0.015 * dtSim);
                controls.target.lerp(defaultTarget, 0.015 * dtSim);
            }
        }

        controls.update();
        if (composer) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
        
        panelObjectsRef.current.forEach(panelObj => {
            panelObj.cssObject.lookAt(camera.position);
        });
        cssRenderer.render(scene, camera);
    };
    animate();

    let localRenderer = renderer;
    let localCssRenderer = cssRenderer;
    let localScene = scene;
    let localControls = controls;
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cleanup(localRenderer, localCssRenderer, localScene, localControls, resizeObserver);
    };
  }, [clusterNodes, panels, cleanup, retryCount]);

  useEffect(() => {
    if (axiomsRevealed) {
        if (axiomNodesGroupRef.current) gsap.to(axiomNodesGroupRef.current.scale, { x: 1, y: 1, z: 1, duration: 2, ease: 'elastic.out(1, 0.5)' });
        if (panelNodesGroupRef.current) gsap.to(panelNodesGroupRef.current.scale, { x: 1, y: 1, z: 1, duration: 2.5, ease: 'elastic.out(1, 0.5)', delay: 0.2 });
    }
  }, [axiomsRevealed]);

  useEffect(() => {
    const group = subAgentsGroupRef.current;
    group.clear();
    
    subAgents.forEach((agent, i) => {
      const geometry = new THREE.IcosahedronGeometry(1.5, 2);
      const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(agent.color), 
        wireframe: true,
        transparent: true,
        opacity: agent.status === 'idle' ? 0.5 : 1.0
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { ...agent, type: 'subAgent', index: i };
      
      // Add a small label
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = agent.color;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(agent.name, 128, 32);
        ctx.font = '16px monospace';
        ctx.fillText(agent.task, 128, 56);
      }
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.y = 2.5;
      sprite.scale.set(6, 1.5, 1);
      mesh.add(sprite);

      group.add(mesh);
    });
  }, [subAgents]);

  useEffect(() => {
    const group = thoughtsGroupRef.current;
    group.clear();

    thoughts.forEach((thought, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, 512, 128);
        ctx.strokeStyle = '#00ffb3';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 512, 128);
        ctx.fillStyle = '#00ffb3';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Simple word wrap
        const words = thought.text.split(' ');
        let line = '';
        let y = 32;
        for(let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 480 && n > 0) {
            ctx.fillText(line, 256, y);
            line = words[n] + ' ';
            y += 24;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 256, y);
      }
      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      
      // Initial position (will be animated in render loop)
      sprite.userData = { ...thought, index: i, age: 0 };
      group.add(sprite);
    });
  }, [thoughts]);

  useEffect(() => {
    const currentPanelObjects = panelObjectsRef.current;
    const currentPanelNodesGroup = panelNodesGroupRef.current;

    openNodeIds.forEach(nodeId => {
      if (!currentPanelObjects.has(nodeId) && currentPanelNodesGroup) {
        const panelNode = currentPanelNodesGroup.getObjectByName(nodeId);
        if (panelNode) {
          const panelElement = document.createElement('div');
          panelElement.className = 'border rounded-lg shadow-2xl flex flex-col overflow-hidden transition-all duration-200';
          panelElement.style.width = '850px';
          panelElement.style.height = '750px';
          panelElement.style.pointerEvents = 'auto';

          const applyTransparency = (opacityVal: number) => {
            panelElement.style.backgroundColor = `rgba(15, 23, 42, ${opacityVal})`;
            const blurVal = Math.max(4, (1.1 - opacityVal) * 20);
            panelElement.style.backdropFilter = `blur(${blurVal}px)`;
            panelElement.style.webkitBackdropFilter = `blur(${blurVal}px)`;
            const isHovered = panelElement.matches(':hover');
            if (!isHovered) {
              panelElement.style.borderColor = `rgba(100, 116, 139, ${Math.min(0.7, 0.25 + (1 - opacityVal) * 0.45)})`;
            }
          };
          applyTransparency(0.95); // Default transparency for 3D panels

          const titleBar = document.createElement('div');
          titleBar.className = 'panel-title-bar';
          const titleText = document.createElement('h3');
          titleText.className = 'panel-title-text';
          titleText.innerText = panelNode.userData.name;
          const controlsContainer = document.createElement('div');
          controlsContainer.className = 'panel-controls';
          
          const contentElement = document.createElement('div');
          contentElement.className = 'flex-grow p-4 overflow-auto custom-scrollbar relative';

          const focusButton = document.createElement('button');
          focusButton.className = 'panel-control text-amber-500 hover:text-amber-400 transition-colors duration-200';
          focusButton.innerHTML = '<i class="ri-focus-3-line"></i>';
          focusButton.title = 'Focus Camera';
          focusButton.onclick = (e) => {
            e.stopPropagation();
            focusOnPanelNodeRef.current(nodeId);
          };

          const minimizeButton = document.createElement('button');
          minimizeButton.className = 'panel-control';
          minimizeButton.innerHTML = '<i class="ri-subtract-line"></i>';
          minimizeButton.title = 'Minimize Panel';
          minimizeButton.onclick = (e) => {
            e.stopPropagation();
            contentElement.style.display = 'none';
            panelElement.style.height = 'auto';
          };
          
          const maximizeButton = document.createElement('button');
          maximizeButton.className = 'panel-control';
          maximizeButton.innerHTML = '<i class="ri-add-line"></i>';
          maximizeButton.title = 'Restore Panel';
          maximizeButton.onclick = (e) => {
            e.stopPropagation();
            contentElement.style.display = 'flex';
            panelElement.style.height = '750px';
          };

          const tacticalButton = document.createElement('button');
          tacticalButton.className = 'panel-control text-cyan-400 hover:text-cyan-300';
          tacticalButton.innerHTML = '<i class="ri-sparkling-line"></i>';
          tacticalButton.title = 'Tactical Brief (AI)';
          tacticalButton.onclick = (e) => {
            e.stopPropagation();
            if (onTacticalBriefRef.current) onTacticalBriefRef.current(nodeId);
          };

          const pinButton = document.createElement('button');
          pinButton.className = 'panel-control text-emerald-400 hover:text-emerald-300';
          pinButton.innerHTML = '<i class="ri-pushpin-line"></i>';
          pinButton.title = 'Pin to UI';
          pinButton.onclick = (e) => {
            e.stopPropagation();
            onPinPanel(nodeId);
            onClosePanel(nodeId); // Close in 3D when pinned to UI
          };

          const swapButton = document.createElement('button');
          swapButton.className = 'panel-control text-orange-400 hover:text-orange-300';
          swapButton.innerHTML = '<i class="ri-arrow-left-right-line"></i>';
          swapButton.title = 'Swap Panel';
          swapButton.onclick = (e) => {
            e.stopPropagation();
            if (onSwapPanelRef.current) onSwapPanelRef.current(nodeId);
          };

          const closeButton = document.createElement('button');
          closeButton.className = 'panel-control panel-control-close';
          closeButton.innerHTML = '<i class="ri-close-line font-bold text-sm"></i>';
          closeButton.title = 'Close panel (X)';
          closeButton.onclick = (e) => { e.stopPropagation(); onClosePanel(nodeId); };

          // Dynamic Sizing & Zoom Controls for 3D panels
          let zoomFactor = 1.0;
          let isAutoScaleActive = false;
          const scale = 0.01; // Increased baseline scale for standard size readability
          let cssObject: CSS3DObject;

          const sizeControlsSeparator = document.createElement('div');
          sizeControlsSeparator.className = 'w-[1px] h-4 bg-slate-700/60 mx-1.5 self-center';

          const zoomOutBtn = document.createElement('button');
          zoomOutBtn.className = 'panel-control hover:text-cyan-400 p-0 text-xs';
          zoomOutBtn.innerHTML = '<i class="ri-zoom-out-line"></i>';
          zoomOutBtn.title = 'Zoom Out';

          const zoomInBtn = document.createElement('button');
          zoomInBtn.className = 'panel-control hover:text-cyan-400 p-0 text-xs';
          zoomInBtn.innerHTML = '<i class="ri-zoom-in-line"></i>';
          zoomInBtn.title = 'Zoom In';

          const zoomText = document.createElement('span');
          zoomText.className = 'text-[10px] font-mono text-cyan-300 px-1 select-none min-w-[32px] text-center';
          zoomText.innerText = '100%';

          const autoScaleBtn = document.createElement('button');
          autoScaleBtn.className = 'panel-control text-slate-500 hover:text-cyan-400 text-xs';
          autoScaleBtn.innerHTML = '<i class="ri-aspect-ratio-line"></i>';
          autoScaleBtn.title = 'Toggle Auto Scale / fit container';

          const updateZoom = (z: number) => {
            zoomFactor = z;
            zoomText.innerText = `${Math.round(zoomFactor * 100)}%`;
            contentElement.style.transform = `scale(${zoomFactor})`;
            contentElement.style.transformOrigin = 'top left';
            contentElement.style.width = `${100 / zoomFactor}%`;
            contentElement.style.height = `${100 / zoomFactor}%`;

            if (cssObject) {
              const targetScale = scale * zoomFactor;
              gsap.to(cssObject.scale, {
                x: targetScale,
                y: targetScale,
                z: targetScale,
                duration: 0.3,
                ease: 'power2.out'
              });
            }
          };

          const updateAutoScale = () => {
             const currentWidth = parseInt(panelElement.style.width, 10);
             const calculatedScale = Math.min(2.0, Math.max(0.4, currentWidth / 850));
             updateZoom(calculatedScale);
          };

          autoScaleBtn.onclick = (e) => {
             e.stopPropagation();
             isAutoScaleActive = !isAutoScaleActive;
             if (isAutoScaleActive) {
                autoScaleBtn.className = 'panel-control text-cyan-400 text-xs';
                zoomOutBtn.style.display = 'none';
                zoomInBtn.style.display = 'none';
                zoomText.className = 'text-[10px] font-mono text-emerald-400 px-1 select-none min-w-[32px] text-center';
                updateAutoScale();
             } else {
                autoScaleBtn.className = 'panel-control text-slate-500 hover:text-cyan-400 text-xs';
                zoomOutBtn.style.display = 'inline-block';
                zoomInBtn.style.display = 'inline-block';
                zoomText.className = 'text-[10px] font-mono text-cyan-300 px-1 select-none min-w-[32px] text-center';
                updateZoom(1.0);
             }
          };

          zoomOutBtn.onclick = (e) => {
             e.stopPropagation();
             isAutoScaleActive = false;
             autoScaleBtn.className = 'panel-control text-slate-500 hover:text-cyan-400 text-xs';
             updateZoom(Math.max(0.4, zoomFactor - 0.1));
          };

          zoomInBtn.onclick = (e) => {
             e.stopPropagation();
             isAutoScaleActive = false;
             autoScaleBtn.className = 'panel-control text-slate-500 hover:text-cyan-400 text-xs';
             updateZoom(Math.min(2.0, zoomFactor + 0.1));
          };

          controlsContainer.appendChild(focusButton);
          controlsContainer.appendChild(tacticalButton);
          controlsContainer.appendChild(pinButton);
          controlsContainer.appendChild(swapButton);
          
          controlsContainer.appendChild(sizeControlsSeparator);
          controlsContainer.appendChild(autoScaleBtn);
          controlsContainer.appendChild(zoomOutBtn);
          controlsContainer.appendChild(zoomText);
          controlsContainer.appendChild(zoomInBtn);

          // Dynamic Transparency Controls
          const transparencySeparator = document.createElement('div');
          transparencySeparator.className = 'w-[1px] h-4 bg-slate-700/60 mx-1.5 self-center';
          controlsContainer.appendChild(transparencySeparator);

          const transContainer = document.createElement('div');
          transContainer.className = 'flex items-center gap-1.5 relative px-1';
          
          const transIcon = document.createElement('button');
          transIcon.className = 'panel-control text-slate-500 hover:text-cyan-400 text-xs flex items-center justify-center pointer-events-none';
          transIcon.innerHTML = '<i class="ri-opacity-line"></i>';
          transIcon.title = 'Adjust Transparency';
          
          const transSlider = document.createElement('input');
          transSlider.type = 'range';
          transSlider.min = '0.1';
          transSlider.max = '1.0';
          transSlider.step = '0.05';
          transSlider.value = '0.95';
          transSlider.className = 'w-14 md:w-20 accent-cyan-400 cursor-pointer h-1 rounded';
          transSlider.setAttribute('style', '-webkit-appearance: none; height: 4px; background: #1e293b;');
          
          const transLabel = document.createElement('span');
          transLabel.className = 'text-[10px] font-mono text-cyan-300 min-w-[28px] text-center select-none';
          transLabel.innerText = '95%';

          transSlider.oninput = (e) => {
            e.stopPropagation();
            const val = parseFloat(transSlider.value);
            transLabel.innerText = `${Math.round(val * 100)}%`;
            applyTransparency(val);
          };
          
          transSlider.onmousedown = (e) => e.stopPropagation();
          transSlider.onpointerdown = (e) => e.stopPropagation();

          transContainer.appendChild(transIcon);
          transContainer.appendChild(transSlider);
          transContainer.appendChild(transLabel);
          controlsContainer.appendChild(transContainer);

          controlsContainer.appendChild(minimizeButton);
          controlsContainer.appendChild(maximizeButton);
          controlsContainer.appendChild(closeButton);
          titleBar.appendChild(titleText);
          titleBar.appendChild(controlsContainer);
          panelElement.appendChild(titleBar);

          panelElement.appendChild(contentElement);
          
          const resizeHandle = document.createElement('div');
          resizeHandle.className = 'panel-resize-handle';
          resizeHandle.innerHTML = '<i class="ri-corner-down-right-line"></i>';
          panelElement.appendChild(resizeHandle);
          
          let startX=0, startY=0, startWidth=850, startHeight=750;
          const onMouseDown = (e: MouseEvent) => {
            e.stopPropagation(); e.preventDefault();
            startX = e.clientX; startY = e.clientY;
            startWidth = parseInt(panelElement.style.width, 10);
            startHeight = parseInt(panelElement.style.height, 10);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          };
          const onMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - startX; 
            const dy = e.clientY - startY;
            panelElement.style.width = `${Math.max(300, startWidth + dx)}px`;
            panelElement.style.height = `${Math.max(200, startHeight + dy)}px`;
            if (isAutoScaleActive) {
               updateAutoScale();
            }
          };
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };
          resizeHandle.addEventListener('mousedown', onMouseDown);

          cssObject = new CSS3DObject(panelElement);
          cssObject.scale.set(scale, scale, scale);
          cssObject.position.set(0, 0, 0); // Center on node
          
          // lookAt handles orientation in animate loop
          
          panelNode.add(cssObject);

          // Double-Click Alignment
          titleBar.ondblclick = (e) => {
            e.stopPropagation();
            focusOnPanelNodeRef.current(nodeId);
          };

          panelElement.ondblclick = (e) => {
            const target = e.target as HTMLElement;
            // Check if target or any parent is interactive (buttons, inputs, sliders, etc.)
            const isInteractive = target.closest('button, input, textarea, select, a, [role="button"]');
            if (!isInteractive) {
              e.stopPropagation();
              focusOnPanelNodeRef.current(nodeId);
            }
          };

          // High-Fidelity Hover Glow & 3D Scaling
          panelElement.onmouseenter = () => {
            panelElement.style.boxShadow = '0 0 25px rgba(20, 184, 166, 0.6)';
            panelElement.style.borderColor = 'rgba(20, 184, 166, 0.8)';
            gsap.to(cssObject.scale, {
              x: scale * 1.02,
              y: scale * 1.02,
              z: scale * 1.02,
              duration: 0.3,
              ease: 'power2.out'
            });
          };

          panelElement.onmouseleave = () => {
            const opacityVal = parseFloat(transSlider.value);
            panelElement.style.boxShadow = '';
            panelElement.style.borderColor = `rgba(100, 116, 139, ${Math.min(0.7, 0.25 + (1 - opacityVal) * 0.45)})`;
            gsap.to(cssObject.scale, {
              x: scale,
              y: scale,
              z: scale,
              duration: 0.3,
              ease: 'power2.out'
            });
          };
          
          currentPanelObjects.set(nodeId, { cssObject, domElement: panelElement, contentElement });
          setPanelContainers(prev => ({ ...prev, [nodeId]: contentElement }));
        }
      }
    });

    currentPanelObjects.forEach((panelObj, nodeId) => {
      if (!openNodeIds.includes(nodeId)) {
        if (panelObj.cssObject.parent) {
          panelObj.cssObject.parent.remove(panelObj.cssObject);
        }
        currentPanelObjects.delete(nodeId);
        setPanelContainers(prev => {
          const next = { ...prev };
          delete next[nodeId];
          return next;
        });
      }
    });

    // Auto-Guided Viewport Tracking: Detect newly opened panel nodes
    const newlyOpened = openNodeIds.filter(id => !prevOpenNodeIdsRef.current.includes(id));
    prevOpenNodeIdsRef.current = openNodeIds;

    if (newlyOpened.length > 0) {
      const targetId = newlyOpened[newlyOpened.length - 1];
      setTimeout(() => {
        focusOnPanelNodeRef.current(targetId);
      }, 100);
    }

  }, [openNodeIds, getPanelContent, systemState, onPinPanel, onClosePanel, onTacticalBrief]);
  
  useEffect(() => {
    const group = modeObjectsRef.current;
    group.traverse((obj) => {
      if (obj !== group) {
        if ('geometry' in obj && (obj as any).geometry) {
          ((obj as any).geometry as THREE.BufferGeometry).dispose();
        }
        if ('material' in obj && (obj as any).material) {
          const material = (obj as any).material;
          const disposeMat = (m: any) => {
            if (m.map && typeof m.map.dispose === 'function') {
              m.map.dispose();
            }
            if (typeof m.dispose === 'function') {
              m.dispose();
            }
          };
          if (Array.isArray(material)) {
            material.forEach(disposeMat);
          } else if (material) {
            disposeMat(material);
          }
        }
      }
    });
    while(group.children.length > 0){ 
      group.remove(group.children[0]);
    }
    
    defaultOrbObjectsRef.current.visible = orbMode === OrbMode.HolographicCore;
    
    // Add a consistent, named, but invisible core orb for modes that don't have a clear one.
    const addInvisibleCore = () => {
        const coreGeo = new THREE.SphereGeometry(4, 16, 16);
        const coreMat = new THREE.MeshBasicMaterial({ visible: false });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.name = 'core_orb';
        group.add(core);
    };


    const createShaderMaterial = (uniforms: any) => new THREE.ShaderMaterial({
        uniforms: {
          ...uniforms,
          uMouse: { value: new THREE.Vector3(-1000, -1000, -1000) },
          uClickPos: { value: new THREE.Vector3(-1000, -1000, -1000) },
          uClickRadius: { value: 0 },
          uClickForce: { value: 0 }
        },
        vertexShader: `
            uniform vec3 uMouse;
            uniform vec3 uClickPos;
            uniform float uClickRadius;
            uniform float uClickForce;
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                
                // Hover deformation
                float hoverDist = distance(worldPos.xyz, uMouse);
                float hoverDisp = 0.0;
                if (hoverDist < 8.0 && hoverDist > 0.1) {
                  float f = (8.0 - hoverDist) / 8.0;
                  hoverDisp = f * f * 1.5;
                }

                // Click deformation
                float clickDist = distance(worldPos.xyz, uClickPos);
                float clickDisp = 0.0;
                if (clickDist < uClickRadius && clickDist > 0.1) {
                  float cf = (uClickRadius - clickDist) / uClickRadius;
                  clickDisp = cf * uClickForce * 2.0;
                }

                vec3 newPosition = position + normal * (hoverDisp + clickDisp);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.5 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                vec3 finalColor = mix(uColor1, uColor2, intensity * (0.5 + sin(uTime * 2.0) * 0.5));
                gl_FragColor = vec4(finalColor, intensity);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
    });

    switch (orbMode) {
      case OrbMode.CrystallineMatrix:
        const coreGeo = new THREE.DodecahedronGeometry(2.5, 0);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.8, emissive: 0xaaaaff, emissiveIntensity: 0.3 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.name = 'core_orb';
        group.add(core);

        const crystalGeo = new THREE.BoxGeometry(0.3, 0.6, 0.3);
        const numCrystals = IS_MOBILE ? 15 : 40;
        for (let i = 0; i < numCrystals; i++) {
          const crystalMat = new THREE.MeshStandardMaterial({color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6), metalness: 0.1, roughness: 0.2, transparent: true, opacity: 0.7});
          const crystal = new THREE.Mesh(crystalGeo, crystalMat);
          crystal.scale.set(Math.random() * 0.5 + 0.5, Math.random() * 1.5 + 0.5, Math.random() * 0.5 + 0.5);
          const phi = Math.acos(2 * Math.random() - 1);
          const theta = Math.random() * 2 * Math.PI;
          const r = 6 + Math.random() * 2;
          crystal.position.setFromSphericalCoords(r, phi, theta);
          crystal.lookAt(0, 0, 0);
          crystal.userData.rotationSpeed = new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02);
          group.add(crystal);
        }
        break;
      case OrbMode.PhotoGallery:
        addInvisibleCore();
        if (photoSources && photoSources.length > 0) {
          photoSources.forEach((src, i) => {
            const loader = new THREE.TextureLoader();
            loader.load(src, (texture) => {
              const aspect = texture.image.width / texture.image.height;
              const photoGeo = new THREE.PlaneGeometry(3 * aspect, 3);
              const photoMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
              const photo = new THREE.Mesh(photoGeo, photoMat);
              
              const phi = Math.acos(2 * (i / photoSources.length) - 1);
              const theta = Math.sqrt(photoSources.length * Math.PI) * phi;
              const r = 10;
              photo.position.setFromSphericalCoords(r, phi, theta);
              photo.lookAt(0, 0, 0);
              photo.userData.isPhoto = true;
              photo.userData.originalPos = photo.position.clone();
              group.add(photo);
            });
          });
        } else {
          // Placeholder if no photos
          const placeholderGeo = new THREE.TorusGeometry(8, 0.2, 16, 100);
          const placeholderMat = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
          group.add(new THREE.Mesh(placeholderGeo, placeholderMat));
        }
        break;
      case OrbMode.EntropicStorm:
      case OrbMode.ChaoticNucleus:
        addInvisibleCore(); // Add invisible core for interaction
        const stormGeo = new THREE.BufferGeometry();
        const stormPositions = [];
        const velocities = [];
        let numParticles = orbMode === OrbMode.ChaoticNucleus ? 1200 : 800;
        if (IS_MOBILE) {
          numParticles = Math.floor(numParticles / 4);
        }
        for (let i = 0; i < numParticles; i++) {
          stormPositions.push((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
          velocities.push(new THREE.Vector3((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1));
        }
        stormGeo.setAttribute('position', new THREE.Float32BufferAttribute(stormPositions, 3));
        const stormMat = new THREE.PointsMaterial({color: 0xff4400, size: 0.1, blending: THREE.AdditiveBlending, transparent: true});
        const storm = new THREE.Points(stormGeo, stormMat);
        storm.userData.velocities = velocities;
        group.add(storm);
         if (orbMode === OrbMode.ChaoticNucleus) {
            const shardGeo = new THREE.TetrahedronGeometry(1.5, 0);
            for(let i=0; i < 10; i++){
                const shardMat = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3});
                const shard = new THREE.Mesh(shardGeo.clone(), shardMat);
                shard.position.set((Math.random()-0.5)*8, (Math.random()-0.5)*8, (Math.random()-0.5)*8);
                shard.userData.rotSpeed = { x: (Math.random()-0.5)*0.02, y: (Math.random()-0.5)*0.02 };
                group.add(shard);
            }
        }
        break;
      case OrbMode.AethericWeave:
          addInvisibleCore();
          const numStrands = IS_MOBILE ? 5 : 15;
          const tubularSegments = IS_MOBILE ? 80 : 200;
          for(let i=0; i<numStrands; i++) {
              const strandGeo = new THREE.TorusKnotGeometry(6, 0.1, tubularSegments, 16, 2 + Math.floor(Math.random()*3), 3 + Math.floor(Math.random()*4));
              const strandMat = createShaderMaterial({ uTime: {value: 0}, uColor1: {value: new THREE.Color(0x8800ff)}, uColor2: {value: new THREE.Color(0x00ffff)} });
              const strand = new THREE.Mesh(strandGeo, strandMat);
              strand.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
              group.add(strand);
          }
          break;
      case OrbMode.StarlightConductor:
          const starGeo = new THREE.SphereGeometry(3, IS_MOBILE ? 16 : 32, IS_MOBILE ? 16 : 32);
          const starMat = new THREE.MeshBasicMaterial({color: 0xffffaa, transparent: true, opacity: 0.9});
          const star = new THREE.Mesh(starGeo, starMat);
          star.name = 'core_orb';
          group.add(star);
          const starfieldGeo = new THREE.BufferGeometry();
          const starfieldPos = [];
          const numStarfield = IS_MOBILE ? 500 : 2000;
          for (let i = 0; i < numStarfield; i++) {
              starfieldPos.push((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50);
          }
          starfieldGeo.setAttribute('position', new THREE.Float32BufferAttribute(starfieldPos, 3));
          const starfieldMat = new THREE.PointsMaterial({color: 0xffffff, size: 0.08});
          const starfield = new THREE.Points(starfieldGeo, starfieldMat);
          group.add(starfield);
          break;
      case OrbMode.VoidShell:
          const shellGeo = new THREE.SphereGeometry(7, IS_MOBILE ? 24 : 64, IS_MOBILE ? 24 : 64);
          const shellMat = new THREE.MeshStandardMaterial({color: 0x111111, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.3, side: THREE.BackSide});
          const shell = new THREE.Mesh(shellGeo, shellMat);
          shell.name = 'core_orb';
          group.add(shell);
          const voidParticleGeo = new THREE.BufferGeometry();
          const voidParticlePos = [];
          const numVoidParticles = IS_MOBILE ? 100 : 300;
          for (let i = 0; i < numVoidParticles; i++) {
              voidParticlePos.push((Math.random() - 0.5) * 13, (Math.random() - 0.5) * 13, (Math.random() - 0.5) * 13);
          }
          voidParticleGeo.setAttribute('position', new THREE.Float32BufferAttribute(voidParticlePos, 3));
          const voidParticleMat = new THREE.PointsMaterial({color: 0x333333, size: 0.05, transparent: true, opacity: 0.5});
          const voidParticles = new THREE.Points(voidParticleGeo, voidParticleMat);
          group.add(voidParticles);
          break;
      case OrbMode.BioLattice:
          addInvisibleCore();
          const nodeGeo = new THREE.SphereGeometry(0.2, IS_MOBILE ? 8 : 12, IS_MOBILE ? 8 : 12);
          const positions = [];
          const latticeSize = IS_MOBILE ? 15 : 40;
          for(let i=0; i<latticeSize; i++) {
              positions.push(new THREE.Vector3((Math.random()-0.5)*15, (Math.random()-0.5)*15, (Math.random()-0.5)*15));
              const nodeMat = new THREE.MeshBasicMaterial({color: 0x00ff88, transparent: true, opacity: 0.8});
              const node = new THREE.Mesh(nodeGeo, nodeMat);
              node.position.copy(positions[i]);
              node.userData.isLatticeNode = true;
              node.userData.latticeIndex = i;
              group.add(node);
          }
          const links: { nodeI: THREE.Mesh, nodeJ: THREE.Mesh }[] = [];
          const segmentPoints: THREE.Vector3[] = [];
          const nodesInGroup = group.children.filter(c => c.userData.isLatticeNode) as THREE.Mesh[];

          for(let i=0; i<latticeSize; i++) {
              for(let j=i+1; j<latticeSize; j++) {
                  if(positions[i].distanceTo(positions[j]) < 4.5) {
                      const nodeI = nodesInGroup.find(n => n.userData.latticeIndex === i);
                      const nodeJ = nodesInGroup.find(n => n.userData.latticeIndex === j);
                      if (nodeI && nodeJ) {
                          links.push({ nodeI, nodeJ });
                          segmentPoints.push(nodeI.position, nodeJ.position);
                      }
                  }
              }
          }
          if (segmentPoints.length > 0) {
              const lineGeo = new THREE.BufferGeometry().setFromPoints(segmentPoints);
              const lineMat = new THREE.LineBasicMaterial({color: 0x00ff88, transparent: true, opacity: 0.2});
              const latticeLinesObj = new THREE.LineSegments(lineGeo, lineMat);
              latticeLinesObj.name = 'lattice_lines';
              latticeLinesObj.userData.isLatticeLineSegments = true;
              latticeLinesObj.userData.links = links;
              group.add(latticeLinesObj);
          }
          break;
      case OrbMode.ResonantSpire:
          const spireContainer = new THREE.Group();
          const spireGeo = new THREE.CylinderGeometry(0, 2.5, 12, IS_MOBILE ? 4 : 6);
          const spireMat = new THREE.MeshStandardMaterial({color: 0x88aaff, metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.8});
          const spire = new THREE.Mesh(spireGeo, spireMat);
          spire.name = 'core_orb';
          spireContainer.add(spire);

          const tipGeo = new THREE.SphereGeometry(0.5, IS_MOBILE ? 8 : 16, IS_MOBILE ? 8 : 16);
          const tipMat = new THREE.MeshBasicMaterial({color: 0xffffff});
          const tip = new THREE.Mesh(tipGeo, tipMat);
          tip.position.y = 6;
          spireContainer.add(tip);

          // Add resonant rings
          const ringGeo = new THREE.TorusGeometry(4, 0.1, 8, IS_MOBILE ? 24 : 48);
          for(let i=0; i<3; i++){
              const ringMat = new THREE.MeshBasicMaterial({
                  color: new THREE.Color().setHSL(0.6 + i*0.1, 0.9, 0.7),
              });
              const ring = new THREE.Mesh(ringGeo.clone(), ringMat);
              ring.position.y = -4 + i * 3;
              ring.rotation.x = Math.PI / 2;
              ring.scale.setScalar(1 - i * 0.1);
              ring.userData.rotationSpeed = 0.01 + i * 0.005;
              spireContainer.add(ring);
          }
          group.add(spireContainer);
          break;
      case OrbMode.TemporalRift:
          addInvisibleCore();
          const riftPlanesCount = IS_MOBILE ? 2 : 5;
          const riftResolution = IS_MOBILE ? 12 : 32;
          for(let i=0; i<riftPlanesCount; i++) {
              const riftGeo = new THREE.PlaneGeometry(15, 15, riftResolution, riftResolution);
              const riftMat = createShaderMaterial({ uTime: {value: 0}, uColor1: {value: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)}, uColor2: {value: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)} });
              const riftPlane = new THREE.Mesh(riftGeo, riftMat);
              riftPlane.position.set((Math.random()-0.5)*3, (Math.random()-0.5)*3, (Math.random()-0.5)*3);
              riftPlane.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
              group.add(riftPlane);
          }
          break;
    }
  }, [orbMode, systemState.entropy]);

  useEffect(() => {
    if (recenterTrigger > 0 && controlsRef.current && cameraRef.current) {
        focusedNodeIdRef.current = null;
        gsap.to(cameraRef.current.position, {
            x: 0,
            y: 0,
            z: 25,
            duration: 1.5,
            ease: "expo.inOut"
        });
        gsap.to(controlsRef.current.target, {
            x: 0,
            y: 0,
            z: 0,
            duration: 1.5,
            ease: "expo.inOut",
            onUpdate: () => controlsRef.current?.update()
        });
    }
  }, [recenterTrigger]);

  if (rendererError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-8 text-center">
        <div className="max-w-md space-y-6">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-cinzel font-bold text-rose-400">3D Engine Context Lost</h2>
          <p className="text-slate-400 font-mono text-sm leading-relaxed">
            The browser has reached its WebGL limit or encountered a GPU error. 
            This often happens when too many 3D panels are open simultaneously.
          </p>
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Recommended Actions:</p>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside text-left inline-block">
              <li>Close some active 3D panels</li>
              <li>Check if other browser tabs are using WebGL</li>
              <li>Ensure your GPU drivers are up to date</li>
            </ul>
          </div>
          <button 
            onClick={() => {
                setRendererError(false);
                setRetryCount(prev => prev + 1);
            }}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-mono text-sm transition-all shadow-lg hover:shadow-emerald-500/20"
          >
            RETRY INITIALIZATION
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={mountRef} id="codex-orb-canvas-container" className="absolute inset-0 z-10 pointer-events-auto" />
      
      {/* 3D Navigation Controls HUD (Zoom, Focus Nexus Orb, Recenter) */}
      <div className="absolute bottom-24 right-4 z-[500] flex flex-col gap-2 select-none pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (cameraRef.current && controlsRef.current) {
              const dir = new THREE.Vector3().subVectors(cameraRef.current.position, controlsRef.current.target);
              const currentDist = dir.length();
              const newDist = Math.max(4, currentDist - 5);
              dir.normalize().multiplyScalar(newDist);
              gsap.to(cameraRef.current.position, {
                x: controlsRef.current.target.x + dir.x,
                y: controlsRef.current.target.y + dir.y,
                z: controlsRef.current.target.z + dir.z,
                duration: 0.5,
                ease: 'power2.out',
                onUpdate: () => controlsRef.current?.update()
              });
            }
          }}
          className="w-10 h-10 rounded-xl bg-slate-950/85 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 flex items-center justify-center backdrop-blur-md transition-all shadow-[0_0_15px_rgba(0,255,255,0.2)] active:scale-95"
          title="Zoom In 3D Space"
        >
          <i className="ri-zoom-in-line text-lg"></i>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (cameraRef.current && controlsRef.current) {
              const dir = new THREE.Vector3().subVectors(cameraRef.current.position, controlsRef.current.target);
              const currentDist = dir.length();
              const newDist = Math.min(120, currentDist + 5);
              dir.normalize().multiplyScalar(newDist);
              gsap.to(cameraRef.current.position, {
                x: controlsRef.current.target.x + dir.x,
                y: controlsRef.current.target.y + dir.y,
                z: controlsRef.current.target.z + dir.z,
                duration: 0.5,
                ease: 'power2.out',
                onUpdate: () => controlsRef.current?.update()
              });
            }
          }}
          className="w-10 h-10 rounded-xl bg-slate-950/85 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 flex items-center justify-center backdrop-blur-md transition-all shadow-[0_0_15px_rgba(0,255,255,0.2)] active:scale-95"
          title="Zoom Out 3D Space"
        >
          <i className="ri-zoom-out-line text-lg"></i>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (cameraRef.current && controlsRef.current) {
              gsap.to(cameraRef.current.position, { x: 0, y: 0, z: 14, duration: 1, ease: 'power2.inOut' });
              gsap.to(controlsRef.current.target, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut', onUpdate: () => controlsRef.current?.update() });
              onCoreOrbClickRef.current();
            }
          }}
          className="w-10 h-10 rounded-xl bg-slate-950/85 border border-emerald-500/40 hover:border-emerald-400 text-emerald-400 flex items-center justify-center backdrop-blur-md transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95"
          title="Focus Nexus Orb"
        >
          <i className="ri-focus-3-line text-xl"></i>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (cameraRef.current && controlsRef.current) {
              focusedNodeIdRef.current = null;
              gsap.to(cameraRef.current.position, { x: 0, y: 0, z: 25, duration: 1, ease: 'power2.inOut' });
              gsap.to(controlsRef.current.target, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut', onUpdate: () => controlsRef.current?.update() });
            }
          }}
          className="w-10 h-10 rounded-xl bg-slate-950/85 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 flex items-center justify-center backdrop-blur-md transition-all shadow-[0_0_15px_rgba(0,255,255,0.2)] active:scale-95"
          title="Reset Viewport"
        >
          <i className="ri-refresh-line text-lg"></i>
        </button>
      </div>

      {Object.entries(panelContainers).map(([nodeId, container]) => 
        createPortal(getPanelContent(nodeId), container, nodeId)
      )}
    </>
  );
};
