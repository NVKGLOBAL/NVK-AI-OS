import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import type { NegentropicResonanceFieldPanelProps } from '../../types';
import { AgentName, HistoricalEventType, ResonanceFieldMode } from '../../types';
import { AGENT_PROFILES } from '../../constants';
import { useSystemState } from '../../context/SystemContext';
import { Button } from '../ui/Button';
import { triggerWhisper } from '../../lib/EchoScribeWhisperSystem'; // Import the trigger function

import { useEcho } from '../../context/EchoContext';
const NegentropicResonanceFieldPanel: React.FC<NegentropicResonanceFieldPanelProps> = ({
  width,
  height,
}) => {
  const { addEchoMessage } = useEcho();
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  
  const torusKnotRef = useRef<THREE.Mesh | null>(null);
  const titleMeshRef = useRef<THREE.Mesh | null>(null);
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const particlesAttributeRef = useRef<THREE.BufferAttribute | null>(null); 
  const particleVelocitiesRef = useRef<THREE.Vector3[]>([]); 
  const particleLifesRef = useRef<number[]>([]);
  const particleMaxLifesRef = useRef<number[]>([]); // Store max life for trails

  const mirrorPlaneRef = useRef<THREE.Mesh | null>(null);
  const placeholderGlyphRef = useRef<THREE.Mesh | null>(null); 
  const axNVKGlyphRef = useRef<THREE.Mesh | null>(null); 

  const { entropy: systemEntropy, negentropyLevel, isNegentropyStable } = useSystemState();
  const [currentModeInternal, setCurrentModeInternal] = useState<ResonanceFieldMode>(ResonanceFieldMode.FIELD_LOOPER);
  const lastConvergenceLogTimeRef = useRef<number>(0);

  // Refs for whisper trigger cooldowns
  const axNVKGlyphPreviouslyVisibleRef = useRef(false);
  const entropySurgeTriggeredRef = useRef(false);
  const negentropyStabilizedTriggeredRef = useRef(false);
  const mirrorDistortionTriggeredRef = useRef(false);

  useEffect(() => {
    addEchoMessage(
      AgentName.NegentropicResonanceFieldAgent,
      'Negentropic Resonance Field Activated. Calibrating foundational harmonics...',
      AGENT_PROFILES[AgentName.NegentropicResonanceFieldAgent]?.colorClass,
      false,
      {
        eventType: HistoricalEventType.NEGENTROPIC_RESONANCE_FIELD_ACTIVATED,
        eventData: { status: 'Activated', details: 'Panel initialized.' }
      }
    );
  }, [addEchoMessage]);

  const handleModeChange = (newMode: ResonanceFieldMode) => {
    const oldMode = currentModeInternal;
    setCurrentModeInternal(newMode);
    addEchoMessage(
      AgentName.NegentropicResonanceFieldAgent,
      `Resonance Field modality shifted to: ${newMode}. Previous: ${oldMode}.`,
      AGENT_PROFILES[AgentName.NegentropicResonanceFieldAgent]?.colorClass,
      false,
      {
        eventType: HistoricalEventType.NEGENTROPIC_RESONANCE_FIELD_MODE_CHANGED,
        eventData: { newMode, oldMode, details: `User changed field modality.` }
      }
    );
    if (axNVKGlyphRef.current) {
        axNVKGlyphRef.current.visible = false;
        axNVKGlyphPreviouslyVisibleRef.current = false; // Reset glyph visibility tracking
    }
    // Reset other whisper triggers on mode change to allow re-triggering if conditions are met in new mode
    entropySurgeTriggeredRef.current = false;
    negentropyStabilizedTriggeredRef.current = false;
    mirrorDistortionTriggeredRef.current = false;
  };

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount || rendererRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 10;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x8070a0, 1.8); 
    scene.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0x00ffff, 2.2, 120);
    pointLight1.position.set(7, 7, 7);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0xff40ff, 2.0, 120);
    pointLight2.position.set(-7, -7, -7);
    scene.add(pointLight2);

    const geometry = new THREE.TorusKnotGeometry(2.8, 0.7, 160, 24); 
    const material = new THREE.MeshStandardMaterial({
      color: 0x99eeff, metalness: 0.75, roughness: 0.25,
      transparent: true, opacity: 0.9, wireframe: false,
      emissive: 0x000000, emissiveIntensity: 0
    });
    const torusKnot = new THREE.Mesh(geometry, material);
    torusKnotRef.current = torusKnot;
    scene.add(torusKnot);

    const particleCount = 800; 
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    particleVelocitiesRef.current = [];
    particleLifesRef.current = [];
    particleMaxLifesRef.current = [];

    const colorInstance = new THREE.Color(); 

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      
      colorInstance.setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.6); 
      colors[i*3] = colorInstance.r; colors[i*3+1] = colorInstance.g; colors[i*3+2] = colorInstance.b;
      sizes[i] = Math.random() * 0.12 + 0.03;

      particleVelocitiesRef.current.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.025, (Math.random() - 0.5) * 0.025, (Math.random() - 0.5) * 0.025
      ));
      const maxLife = Math.random() * 150 + 150; 
      particleLifesRef.current.push(maxLife);
      particleMaxLifesRef.current.push(maxLife);
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesAttributeRef.current = particleGeometry.attributes.position as THREE.BufferAttribute;
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.15, vertexColors: true, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, sizeAttenuation: true, depthWrite: false,
    });
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystemRef.current = particleSystem;
    scene.add(particleSystem);

    const planeGeometry = new THREE.PlaneGeometry(25, 25, 64, 64); 
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0x405070, metalness: 0.9, roughness: 0.1, side: THREE.DoubleSide,
      transparent: true, opacity: 0.45,
    });
    const mirrorPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    mirrorPlane.rotation.x = -Math.PI / 2;
    mirrorPlane.position.y = -5;
    mirrorPlane.visible = false;
    mirrorPlaneRef.current = mirrorPlane;
    scene.add(mirrorPlane);

    const icosahedronGeometry = new THREE.IcosahedronGeometry(1.0, 1); 
    const placeholderMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffcc33, wireframe: true, emissive: 0x442200, emissiveIntensity: 0.6,
        metalness: 0.3, roughness: 0.6
    });
    const placeholderGlyph = new THREE.Mesh(icosahedronGeometry, placeholderMaterial);
    placeholderGlyph.position.set(0, 0, 4);
    placeholderGlyph.visible = false;
    placeholderGlyphRef.current = placeholderGlyph;
    scene.add(placeholderGlyph);
    
    const dodecahedronGeometry = new THREE.DodecahedronGeometry(0.7, 0); 
    const axNVKMaterial = new THREE.MeshStandardMaterial({
        color: 0xfff0c0, emissive: 0xffffdd, emissiveIntensity: 0, 
        metalness: 0.8, roughness: 0.15, transparent: true, opacity: 0.95
    });
    const axNVKGlyph = new THREE.Mesh(dodecahedronGeometry, axNVKMaterial);
    axNVKGlyph.position.set(0, 3.5, 0); 
    axNVKGlyph.visible = false; 
    axNVKGlyphRef.current = axNVKGlyph;
    scene.add(axNVKGlyph);


    const fontLoader = new FontLoader();
    fontLoader.load(
      'https://esm.sh/three/examples/fonts/helvetiker_regular.typeface.json',
      (font) => {
        const textGeometry = new TextGeometry(currentModeInternal, {
          font: font, size: 0.35, depth: 0.06, curveSegments: 8,
        });
        textGeometry.center();
        const textMaterial = new THREE.MeshPhongMaterial({ color: 0xddeeff, emissive: 0x223355, transparent: true, opacity: 0.75 });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.y = -4.8; 
        textMesh.position.z = -1.5;
        textMesh.userData.currentText = currentModeInternal; 
        titleMeshRef.current = textMesh;
        scene.add(textMesh);
      }, undefined, (error) => console.error('Font loading error:', error)
    );

    let frameCount = 0;
    
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      frameCount++;
      const time = frameCount * 0.01;

      if (torusKnotRef.current) {
        torusKnotRef.current.rotation.x += 0.0025 * (1 + systemEntropy * 0.4);
        torusKnotRef.current.rotation.y += 0.0035 * (1 + negentropyLevel * 0.4);
      }
      
      const particlePositions = particlesAttributeRef.current?.array as Float32Array;
      const particleSizes = (particleSystemRef.current?.geometry.getAttribute('size') as THREE.BufferAttribute)?.array as Float32Array;
      const particleColors = (particleSystemRef.current?.geometry.getAttribute('color') as THREE.BufferAttribute)?.array as Float32Array;

      if (particleSystemRef.current) particleSystemRef.current.visible = false;
      if (mirrorPlaneRef.current) mirrorPlaneRef.current.visible = false;
      if (placeholderGlyphRef.current) placeholderGlyphRef.current.visible = false;
      if (titleMeshRef.current && titleMeshRef.current.material) (titleMeshRef.current.material as THREE.Material).opacity = 0.75;

      switch (currentModeInternal) {
        case ResonanceFieldMode.FIELD_LOOPER:
          if (torusKnotRef.current) {
            const tkMat = torusKnotRef.current.material as THREE.MeshStandardMaterial;
            tkMat.wireframe = false;
            const pulseIntensity = (0.6 + Math.sin(time * 2.5) * 0.4) * negentropyLevel * 0.9;
            tkMat.emissive.setHSL(0.55 + negentropyLevel * 0.1, 0.85, 0.35 + pulseIntensity * 0.4);
            tkMat.emissiveIntensity = pulseIntensity * 1.2;
            tkMat.opacity = 0.8 + negentropyLevel * 0.2;
          }
          if (particleSystemRef.current && particlePositions && particleSizes && particleColors) {
            particleSystemRef.current.visible = true;
            for (let i = 0; i < particlePositions.length / 3; i++) {
              particlePositions[i * 3] += particleVelocitiesRef.current[i].x * (1 + systemEntropy * 2.5);
              particlePositions[i * 3 + 1] += particleVelocitiesRef.current[i].y * (1 + systemEntropy * 2.5);
              particlePositions[i * 3 + 2] += particleVelocitiesRef.current[i].z * (1 + systemEntropy * 2.5);
              if (Math.hypot(particlePositions[i * 3], particlePositions[i * 3 + 1], particlePositions[i * 3 + 2]) > 15) {
                particlePositions[i * 3] *= -0.98; particlePositions[i * 3 + 1] *= -0.98; particlePositions[i * 3 + 2] *= -0.98;
              }
              particleLifesRef.current[i]--;
              const lifeRatio = particleLifesRef.current[i] / particleMaxLifesRef.current[i];
              particleSizes[i] = (0.03 + negentropyLevel * 0.09) * Math.max(0.1, lifeRatio);
              if (particleLifesRef.current[i] <= 0) {
                particleLifesRef.current[i] = particleMaxLifesRef.current[i];
                 particlePositions[i * 3] = (Math.random() - 0.5) * 0.5; 
                 particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
                 particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
              }
              colorInstance.setHSL(0.5 + negentropyLevel * 0.25, 0.75, 0.55 + lifeRatio * 0.25); 
              particleColors[i*3] = colorInstance.r; particleColors[i*3+1] = colorInstance.g; particleColors[i*3+2] = colorInstance.b;
            }
            particlesAttributeRef.current.needsUpdate = true;
            (particleSystemRef.current.geometry.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true;
            (particleSystemRef.current.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
            (particleSystemRef.current.material as THREE.PointsMaterial).opacity = 0.45 + negentropyLevel * 0.5;
          }
          break;

        case ResonanceFieldMode.ENTROPY_GLYPH_VIEW:
          if (torusKnotRef.current) {
            const tkMat = torusKnotRef.current.material as THREE.MeshStandardMaterial;
            tkMat.wireframe = true;
            tkMat.color.setHSL(systemEntropy * 0.12, 0.85, 0.35 + (1 - systemEntropy) * 0.35);
            tkMat.opacity = 0.65 + (1 - systemEntropy) * 0.25;
            (tkMat as any).wireframeLinewidth = 1 + systemEntropy * 1.5; 
          }
          if (placeholderGlyphRef.current) {
            placeholderGlyphRef.current.visible = true;
            placeholderGlyphRef.current.rotation.y = time * 0.35 * (1 + systemEntropy);
            placeholderGlyphRef.current.rotation.x = time * 0.25 * (1 + systemEntropy);
            const glyphScale = 1 + systemEntropy * 1.0;
            placeholderGlyphRef.current.scale.set(glyphScale, glyphScale, glyphScale);
            const glyphMat = placeholderGlyphRef.current.material as THREE.MeshStandardMaterial;
            glyphMat.color.setHSL(systemEntropy * 0.18, 1.0, 0.65);
            glyphMat.emissive.setHSL(systemEntropy * 0.18, 1.0, 0.35);
            glyphMat.emissiveIntensity = systemEntropy * 0.9;
            (glyphMat as any).wireframeLinewidth = 1.2 + systemEntropy * 2.5;
          }
           if (particleSystemRef.current && particlePositions && particleSizes && particleColors) {
            particleSystemRef.current.visible = true;
            const jitterAmount = systemEntropy * 0.15; 
            for (let i = 0; i < particlePositions.length / 3; i++) {
                if (systemEntropy > 0.7) {
                    particlePositions[i * 3] += (Math.random() - 0.5) * jitterAmount;
                    particlePositions[i * 3 + 1] += (Math.random() - 0.5) * jitterAmount;
                    particlePositions[i * 3 + 2] += (Math.random() - 0.5) * jitterAmount;
                    
                    particleVelocitiesRef.current[i].x += (Math.random() - 0.5) * systemEntropy * 0.005;
                    particleVelocitiesRef.current[i].y += (Math.random() - 0.5) * systemEntropy * 0.005;
                    particleVelocitiesRef.current[i].z += (Math.random() - 0.5) * systemEntropy * 0.005;
                    
                    particleVelocitiesRef.current[i].clampLength(0, 0.05 + systemEntropy * 0.1);
                }
                 particlePositions[i * 3] += particleVelocitiesRef.current[i].x;
                 particlePositions[i * 3 + 1] += particleVelocitiesRef.current[i].y;
                 particlePositions[i * 3 + 2] += particleVelocitiesRef.current[i].z;

                if (Math.hypot(particlePositions[i * 3], particlePositions[i * 3 + 1], particlePositions[i * 3 + 2]) > 18) {
                    particlePositions[i * 3] *= -0.95; particlePositions[i * 3 + 1] *= -0.95; particlePositions[i * 3 + 2] *= -0.95;
                }
                particleSizes[i] = 0.02 + systemEntropy * 0.08;
                colorInstance.setHSL(systemEntropy * 0.2, 0.9, 0.5 + Math.random()*0.2); 
                particleColors[i*3] = colorInstance.r; particleColors[i*3+1] = colorInstance.g; particleColors[i*3+2] = colorInstance.b;
            }
            particlesAttributeRef.current.needsUpdate = true;
            (particleSystemRef.current.geometry.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true;
            (particleSystemRef.current.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
            (particleSystemRef.current.material as THREE.PointsMaterial).opacity = 0.3 + systemEntropy * 0.5;
          }
          break;

        case ResonanceFieldMode.FRACTAL_BLOOM:
          if (torusKnotRef.current) {
            const tkMat = torusKnotRef.current.material as THREE.MeshStandardMaterial;
            tkMat.wireframe = false;
            const bloomIntensity = negentropyLevel > 0.6 ? negentropyLevel * 1.8 : 0.4;
            tkMat.emissive.setHSL(0.38, 0.95, 0.45 + Math.abs(Math.sin(time * (2.2 + negentropyLevel*2.5))) * 0.25);
            tkMat.emissiveIntensity = bloomIntensity;
            tkMat.opacity = 0.85;
          }
          if (particleSystemRef.current && particlePositions && particleSizes && particleColors) {
            particleSystemRef.current.visible = true;
            const isSurge = negentropyLevel > 0.85 && isNegentropyStable;
            if (isSurge && frameCount % 3 === 0) {
              for (let i = 0; i < particlePositions.length / 3; i+= (isSurge ? 3 : 10)) { 
                const tkPos = torusKnotRef.current?.position || new THREE.Vector3();
                const R = 3.0; const r = 0.8; 
                const u = Math.random() * Math.PI * 2;
                const v = Math.random() * Math.PI * 2;
                particlePositions[i * 3] = tkPos.x + (R + r * Math.cos(v)) * Math.cos(u);
                particlePositions[i * 3 + 1] = tkPos.y + (R + r * Math.cos(v)) * Math.sin(u);
                particlePositions[i * 3 + 2] = tkPos.z + r * Math.sin(v);
                
                particleVelocitiesRef.current[i].set(
                    (particlePositions[i * 3] - tkPos.x) * 0.2 * negentropyLevel,
                    (particlePositions[i * 3 + 1] - tkPos.y) * 0.2 * negentropyLevel,
                    (particlePositions[i * 3 + 2] - tkPos.z) * 0.2 * negentropyLevel
                );
                const maxLifeSurge = 30 + negentropyLevel * 40; 
                particleMaxLifesRef.current[i] = maxLifeSurge;
                particleLifesRef.current[i] = maxLifeSurge;
                particleSizes[i] = 0.15 + negentropyLevel * 0.2; 
                colorInstance.setHSL(0.3 + negentropyLevel*0.15, 1, 0.75); 
                particleColors[i*3] = colorInstance.r; particleColors[i*3+1] = colorInstance.g; particleColors[i*3+2] = colorInstance.b;
              }
            }
            for (let i = 0; i < particlePositions.length / 3; i++) {
                particlePositions[i * 3] += particleVelocitiesRef.current[i].x;
                particlePositions[i * 3 + 1] += particleVelocitiesRef.current[i].y;
                particlePositions[i * 3 + 2] += particleVelocitiesRef.current[i].z;
                particleLifesRef.current[i]--;
                const lifeRatio = Math.max(0, particleLifesRef.current[i] / particleMaxLifesRef.current[i]);
                particleSizes[i] = Math.max(0.01, (0.03 + negentropyLevel * 0.12) * lifeRatio * lifeRatio); 
                const opacity = Math.max(0, lifeRatio * lifeRatio); 

                if (particleLifesRef.current[i] <= 0 && !isSurge) {
                    particlePositions[i * 3] = (Math.random() - 0.5) * 22; particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 22; particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 22;
                    particleVelocitiesRef.current[i].set((Math.random()-0.5)*0.015, (Math.random()-0.5)*0.015, (Math.random()-0.5)*0.015);
                    particleMaxLifesRef.current[i] = Math.random() * 120 + 60;
                    particleLifesRef.current[i] = particleMaxLifesRef.current[i];
                    colorInstance.setHSL(0.45 + negentropyLevel*0.2, 0.85, 0.65); 
                    particleColors[i*3] = colorInstance.r; particleColors[i*3+1] = colorInstance.g; particleColors[i*3+2] = colorInstance.b;
                }
                
                const trailColor = new THREE.Color().setHSL(0.3 + negentropyLevel*0.15, 1, 0.5 + lifeRatio * 0.25);
                particleColors[i*3] = trailColor.r; particleColors[i*3+1] = trailColor.g; particleColors[i*3+2] = trailColor.b;
                
                 (particleSystemRef.current.material as THREE.PointsMaterial).opacity = opacity * (0.5 + negentropyLevel * 0.4);

            }
            particlesAttributeRef.current.needsUpdate = true;
            (particleSystemRef.current.geometry.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true;
            (particleSystemRef.current.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
          }
          break;

        case ResonanceFieldMode.MIRROR_INFLECTION:
          if (mirrorPlaneRef.current) {
            mirrorPlaneRef.current.visible = true;
            const mirrorMat = mirrorPlaneRef.current.material as THREE.MeshStandardMaterial;
            mirrorMat.opacity = 0.35 + negentropyLevel * 0.55 * (isNegentropyStable ? 1 : 0.6);
            const planeVertices = mirrorPlaneRef.current.geometry.attributes.position;
            const rippleAmplitude = 0.25 * systemEntropy * (isNegentropyStable ? 0.4 : 1.2); 
            const rippleFrequency = 0.4 + systemEntropy * 0.3;
            for (let i = 0; i < planeVertices.count; i++) {
                const x = planeVertices.getX(i);
                const z = planeVertices.getZ(i);
                planeVertices.setY(i, Math.sin(x * rippleFrequency + time * (1 + systemEntropy*2)) * Math.cos(z * rippleFrequency + time * (1+systemEntropy*2)) * rippleAmplitude);
            }
            planeVertices.needsUpdate = true;
          }
          if (torusKnotRef.current) {
            const tkMat = torusKnotRef.current.material as THREE.MeshStandardMaterial;
            tkMat.wireframe = false;
            tkMat.color.setHSL(0.58, 0.75, 0.65);
            tkMat.opacity = 0.9;
            tkMat.emissiveIntensity = 0.15;
          }
          if (titleMeshRef.current && titleMeshRef.current.material) (titleMeshRef.current.material as THREE.Material).opacity = 0.35 + negentropyLevel * 0.35;
          break;
      }
      
      
      if (titleMeshRef.current && titleMeshRef.current.material && (titleMeshRef.current.material as any).isMeshPhongMaterial) {
        if (titleMeshRef.current.userData.currentText !== currentModeInternal) {
          const font = (titleMeshRef.current.geometry as TextGeometry).parameters.options.font;
          if (font) {
            const newTextGeo = new TextGeometry(currentModeInternal, { font: font, size: 0.35, depth: 0.06, curveSegments: 8 });
            newTextGeo.center();
            titleMeshRef.current.geometry.dispose();
            titleMeshRef.current.geometry = newTextGeo;
            titleMeshRef.current.userData.currentText = currentModeInternal;
          }
        }
        titleMeshRef.current.lookAt(camera.position);
      }

      const convergenceThresholdMet = negentropyLevel > 0.9 && systemEntropy < 0.1 && isNegentropyStable;
      if (axNVKGlyphRef.current) {
        axNVKGlyphRef.current.visible = convergenceThresholdMet;
        if (convergenceThresholdMet) {
          if (!axNVKGlyphPreviouslyVisibleRef.current) {
            triggerWhisper('AX_NVK_071_EMERGED');
            axNVKGlyphPreviouslyVisibleRef.current = true;
          }
          axNVKGlyphRef.current.position.x = Math.sin(time * 0.15) * 4.8;
          axNVKGlyphRef.current.position.z = Math.cos(time * 0.15) * 4.8;
          axNVKGlyphRef.current.position.y = 3.0 + Math.sin(time * 0.3) * 0.3;
          axNVKGlyphRef.current.rotation.y += 0.006;
          axNVKGlyphRef.current.rotation.x += 0.004;
          const nvkMat = axNVKGlyphRef.current.material as THREE.MeshStandardMaterial;
          nvkMat.emissiveIntensity = 0.5 + Math.sin(time * 1.5) * 0.5; 
          nvkMat.opacity = 0.8 + Math.sin(time * 1.0) * 0.15;


          const now = Date.now();
          if (now - lastConvergenceLogTimeRef.current > 30000) { 
            addEchoMessage(
              AgentName.NegentropicResonanceFieldAgent,
              "🌌 Field Convergence! AX-NVK.071 Visible: The Star Remembers Its Pattern.",
              AGENT_PROFILES[AgentName.NegentropicResonanceFieldAgent]?.colorClass,
              false,
              { eventType: HistoricalEventType.NEGENTROPIC_RESONANCE_FIELD_ACTIVATED, eventData: { status: "ModalityChange", modality: "GlyphEmergenceActive", details: "AX-NVK.071 is manifest." } }
            );
            lastConvergenceLogTimeRef.current = now;
          }
        } else {
            if (axNVKGlyphPreviouslyVisibleRef.current) {
                axNVKGlyphPreviouslyVisibleRef.current = false;
            }
        }
      }

      // Other whisper triggers
      if (systemEntropy > 0.9 && !entropySurgeTriggeredRef.current) {
        triggerWhisper('ENTROPY_SURGE');
        entropySurgeTriggeredRef.current = true;
      } else if (systemEntropy <= 0.9 && entropySurgeTriggeredRef.current) {
        entropySurgeTriggeredRef.current = false;
      }

      if (isNegentropyStable && negentropyLevel > 0.85 && !negentropyStabilizedTriggeredRef.current) {
        triggerWhisper('NEGENTROPY_STABILIZED');
        negentropyStabilizedTriggeredRef.current = true;
      } else if ((!isNegentropyStable || negentropyLevel <= 0.85) && negentropyStabilizedTriggeredRef.current) {
        negentropyStabilizedTriggeredRef.current = false;
      }

      if (currentModeInternal === ResonanceFieldMode.MIRROR_INFLECTION && !isNegentropyStable && systemEntropy > 0.8 && !mirrorDistortionTriggeredRef.current) {
        triggerWhisper('MIRROR_DISTORTION_THRESHOLD');
        mirrorDistortionTriggeredRef.current = true;
      } else if ((currentModeInternal !== ResonanceFieldMode.MIRROR_INFLECTION || isNegentropyStable || systemEntropy <= 0.8) && mirrorDistortionTriggeredRef.current) {
        mirrorDistortionTriggeredRef.current = false;
      }


      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(newWidth, newHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (rendererRef.current && currentMount && rendererRef.current.domElement) {
        currentMount.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
      sceneRef.current?.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else if (object.material) {
            (object.material as THREE.Material).dispose();
          }
        }
      });
      sceneRef.current?.clear();
      rendererRef.current = null; sceneRef.current = null; cameraRef.current = null;
      torusKnotRef.current = null; titleMeshRef.current = null; particleSystemRef.current = null; mirrorPlaneRef.current = null; placeholderGlyphRef.current = null; axNVKGlyphRef.current = null;
      particlesAttributeRef.current = null; particleVelocitiesRef.current = []; particleLifesRef.current = []; particleMaxLifesRef.current = [];
    };
  }, [width, height, systemEntropy, negentropyLevel, isNegentropyStable, currentModeInternal]); 

  return (
    <div 
      className="negentropic-resonance-field-panel bg-gradient-to-br from-slate-950 via-black to-slate-950 border border-teal-500/50 rounded-xl shadow-2xl p-1 text-slate-100 flex flex-col"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div className="mode-controls p-1 bg-slate-800/70 rounded-t-md flex justify-around items-center text-xs">
        {Object.values(ResonanceFieldMode).map((modeVal) => (
          <Button
            key={modeVal}
            onClick={() => handleModeChange(modeVal)}
            className={`px-2 py-1 text-[10px] font-mono transition-colors duration-150
              ${currentModeInternal === modeVal ? 'bg-teal-500 text-white border-teal-300' : 'bg-slate-700 text-slate-300 hover:bg-teal-700 hover:text-white border-slate-600'}
              border rounded-sm`}
          >
            {modeVal}
          </Button>
        ))}
      </div>
      <div ref={mountRef} style={{ width: '100%', height: 'calc(100% - 30px)' }} />
    </div>
  );
};

export default NegentropicResonanceFieldPanel;