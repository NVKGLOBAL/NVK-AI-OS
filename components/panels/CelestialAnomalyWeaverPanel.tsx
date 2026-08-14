
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { AgentName, HistoricalEventType, type CelestialAnomalyWeaverPanelProps, type HistoricalCelestialAnomalyEventData } from '../../types';
import { AGENT_PROFILES } from '../../constants';
import { Button } from '../ui/Button';

import { useEcho } from '../../context/EchoContext';
const STAR_RADIUS = 5;
const PLANET_C_RADIUS = 2.5; 
const SIBLING_PLANET_RADIUS = 1.5;
const ORBIT_SEGMENTS = 128;

const CelestialAnomalyWeaverPanel: React.FC<CelestialAnomalyWeaverPanelProps> = ({
  width,
  height,
}) => {
  const { addEchoMessage } = useEcho();
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const planetCRef = useRef<THREE.Mesh | null>(null);
  const siblingPlanetRef = useRef<THREE.Mesh | null>(null);
  const starRef = useRef<THREE.Mesh | null>(null);
  
  const [showMythicGlyphs, setShowMythicGlyphs] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.set(0, 15, 35); 
    camera.lookAt(new THREE.Vector3(0,0,0));

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
        console.error("CelestialAnomalyWeaver: WebGL Init Failed", e);
        setRenderError(true);
        return;
    }
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404060, 1);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 2, 200);
    pointLight.position.set(0, 10, 10);
    scene.add(pointLight);

    // Star (14 Herculis)
    const starGeometry = new THREE.SphereGeometry(STAR_RADIUS, 32, 32);
    const starMaterial = new THREE.MeshPhongMaterial({
      color: 0xffccaa,
      emissive: 0xffaa88,
      emissiveIntensity: 0.6,
      shininess: 50,
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    starRef.current = star;
    scene.add(star);
    
    // Planet C
    const planetCGeometry = new THREE.SphereGeometry(PLANET_C_RADIUS, 32, 32);
    const planetCMaterial = new THREE.MeshPhongMaterial({
      color: 0x6080a0, 
      shininess: 20,
    });
    const planetC = new THREE.Mesh(planetCGeometry, planetCMaterial);
    planetCRef.current = planetC;
    scene.add(planetC);

    // Sibling Planet
    const siblingPlanetGeometry = new THREE.SphereGeometry(SIBLING_PLANET_RADIUS, 32, 32);
    const siblingPlanetMaterial = new THREE.MeshPhongMaterial({ color: 0xa0a080 }); 
    const siblingPlanet = new THREE.Mesh(siblingPlanetGeometry, siblingPlanetMaterial);
    siblingPlanetRef.current = siblingPlanet;
    scene.add(siblingPlanet);

    // Orbit Paths
    const createOrbitPath = (a: number, b: number, color: number, rotationY: number = 0) => {
      const curve = new THREE.EllipseCurve(0, 0, a, b, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(ORBIT_SEGMENTS);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
      const ellipse = new THREE.Line(geometry, material);
      ellipse.rotation.x = Math.PI / 2; 
      ellipse.rotation.y = rotationY;
      return ellipse;
    };

    const orbitC = createOrbitPath(25, 20, 0x88aaff); 
    scene.add(orbitC);
    const orbitSibling = createOrbitPath(18, 15, 0xaabbaa, Math.PI / 6); 
    scene.add(orbitSibling);

    // Ghost Trajectory
    const ghostPoints = [];
    for (let i = 0; i < 50; i++) {
        ghostPoints.push(new THREE.Vector3(Math.cos(i * 0.2) * (30 + i * 0.2), 0, Math.sin(i * 0.2) * (25 + i * 0.15) + i*0.3));
    }
    const ghostCurve = new THREE.CatmullRomCurve3(ghostPoints);
    const ghostGeometry = new THREE.TubeGeometry(ghostCurve, 64, 0.1, 8, false);
    const ghostMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const ghostTrajectory = new THREE.Mesh(ghostGeometry, ghostMaterial);
    ghostTrajectory.rotation.y = Math.PI / 3;
    scene.add(ghostTrajectory);
    
    let frameCount = 0;
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      frameCount++;

      const time = Date.now() * 0.0001;

      if (planetCRef.current) {
        planetCRef.current.position.x = Math.cos(time * 0.8) * 25;
        planetCRef.current.position.z = Math.sin(time * 0.8) * 20;
        planetCRef.current.rotation.y += 0.005;
        const pulseScale = 1 + Math.sin(frameCount * 0.02) * 0.03 * (showMythicGlyphs ? 1.5 : 1);
        planetCRef.current.scale.set(pulseScale, pulseScale, pulseScale);
        (planetCRef.current.material as THREE.MeshPhongMaterial).emissive.setHex(showMythicGlyphs ? 0xff00ff : 0x000000); 
      }
      if (siblingPlanetRef.current) {
        const siblingTime = time * 1.1; 
        const siblingOrbitA = 18;
        const siblingOrbitB = 15;
        const siblingRotationY = Math.PI / 6; 

        siblingPlanetRef.current.position.x = Math.cos(siblingTime) * siblingOrbitA * Math.cos(siblingRotationY) - Math.sin(siblingTime) * siblingOrbitB * Math.sin(siblingRotationY);
        siblingPlanetRef.current.position.z = Math.cos(siblingTime) * siblingOrbitA * Math.sin(siblingRotationY) + Math.sin(siblingTime) * siblingOrbitB * Math.cos(siblingRotationY);
        siblingPlanetRef.current.rotation.y += 0.008;
      }
      if (starRef.current) {
        starRef.current.rotation.y += 0.001;
         (starRef.current.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.5 + Math.sin(frameCount * 0.01) * 0.2;
      }
      
      ghostMaterial.opacity = 0.2 + Math.sin(frameCount * 0.03) * 0.1;

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;

      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(newWidth, newHeight);
      }
    };
    
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(currentMount);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (rendererRef.current && currentMount && rendererRef.current.domElement && currentMount.contains(rendererRef.current.domElement)) {
        currentMount.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
      sceneRef.current?.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
      sceneRef.current?.clear();
      rendererRef.current = null; sceneRef.current = null; cameraRef.current = null;
      planetCRef.current = null; siblingPlanetRef.current = null; starRef.current = null;
    };
  }, [width, height, showMythicGlyphs, retryCount]); 

  // ... (Handlers: handleActivateGlyphStone, handleGazeIntoMirror)
   const handleActivateGlyphStone = () => {};
   const handleGazeIntoMirror = () => setShowMythicGlyphs(prev => !prev);

  return (
    <div className="celestial-anomaly-weaver-panel bg-slate-950/90 backdrop-blur-xl border border-indigo-600/50 rounded-xl shadow-2xl p-3 text-slate-100 flex flex-col" style={{ width: `${width}px`, height: `${height}px` }}>
      <h3 className="text-lg font-['Cinzel'] font-bold text-indigo-300 mb-2 text-center tracking-wider">
        Δ.Θ8 NVK Strategic Alignment Weaver: 14 Herculis
      </h3>
      <div className="flex-grow relative border border-indigo-500/30 rounded-md overflow-hidden bg-black">
        <div ref={mountRef} style={{ width: '100%', height: '100%' }}>
            {renderError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4 text-center">
                <i className="ri-error-warning-line text-red-500 text-2xl mb-1"></i>
                <div className="text-red-400 text-[10px] font-bold mb-1 uppercase tracking-widest">3D Anomaly Offline</div>
                <Button 
                  onClick={() => { setRenderError(false); setRetryCount(prev => prev + 1); }}
                  className="text-[9px] py-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white border-none"
                >
                  RETRY
                </Button>
              </div>
            )}
        </div>
        <div className="absolute bottom-2 left-2 p-2 bg-slate-900/70 rounded-md text-xs max-w-xs">
            <p className="text-indigo-200 italic">NVK Principle AX-Θ.008: “When strategic goals refuse alignment, the space between becomes opportunity. Their tension is not failure—it is unresolved potential in motion.”</p>
        </div>
      </div>
      <div className="controls-area flex justify-center items-center gap-2 p-1.5 mt-1 bg-slate-800/50 rounded-md border-t border-indigo-700/30 text-[10px]">
        <Button onClick={handleActivateGlyphStone} className="py-1 px-2 text-[10px] bg-sky-600 hover:bg-sky-500">
          <i className="ri-sound-module-line mr-1"></i>Activate Alignment
        </Button>
        <Button onClick={handleGazeIntoMirror} className={`py-1 px-2 text-[10px] ${showMythicGlyphs ? 'bg-purple-600 hover:bg-purple-500' : 'bg-slate-600 hover:bg-slate-500'}`}>
          <i className="ri-eye-2-line mr-1"></i>Strategic Gaze {showMythicGlyphs ? '(ON)' : '(OFF)'}
        </Button>
      </div>
    </div>
  );
};

export default CelestialAnomalyWeaverPanel;
