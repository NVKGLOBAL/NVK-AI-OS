
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import type { ResonanceEnginePanelProps } from '../../types';

import { useEcho } from '../../context/EchoContext';
// --- OrbSystem 3D Visualization Component ---
interface OrbSystemProps {
  width: number;
  height: number;
}

const OrbSystem: React.FC<OrbSystemProps> = ({ width, height }) => {
  const { addEchoMessage } = useEcho();
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const [renderError, setRenderError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!mountRef.current || width <= 0 || height <= 0) return;

    const currentMount = mountRef.current;

    // Cleanup existing renderer if any
    if (rendererRef.current) {
        if (currentMount.contains(rendererRef.current.domElement)) {
            currentMount.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
    }

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.05);

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 15;

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
        console.error("OrbSystem: WebGL Init Failed", e);
        setRenderError(true);
        return;
    }
    rendererRef.current = renderer;

    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.innerHTML = ''; 
    currentMount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x4040ff, 1.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Shaders
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = vec3(modelViewMatrix * vec4(position, 1.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPosition;

      float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      void main() {
        vec3 norm = normalize(vNormal);
        float intensity = pow(0.7 - dot(norm, vec3(0,0,1.0)), 2.0);
        float fresnel = pow(1.0 + dot(normalize(vPosition), norm), 3.0);
        float noise = random(gl_FragCoord.xy * 0.01 * sin(uTime * 0.1)) * 0.2;
        vec3 color = uColor * (intensity + fresnel + noise);
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Central Orb
    const orbGeometry = new THREE.IcosahedronGeometry(3, 5);
    const orbMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor: { value: new THREE.Color(0x64c8ff) },
        uTime: { value: 0 },
      },
    });
    const centralOrb = new THREE.Mesh(orbGeometry, orbMaterial);
    scene.add(centralOrb);
    
    // Satellites
    const satellites: THREE.Mesh[] = [];
    const satelliteCount = 8;
    for (let i = 0; i < satelliteCount; i++) {
      const satelliteGeometry = new THREE.IcosahedronGeometry(0.5, 3);
      const satelliteMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uColor: { value: new THREE.Color(0xffd700) },
          uTime: { value: 0 },
        },
      });
      const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
      
      const angle = (i / satelliteCount) * Math.PI * 2;
      const orbitRadius = 6 + Math.random() * 2;
      satellite.userData = {
        orbitRadius,
        angle,
        speed: 0.2 + Math.random() * 0.3,
        yOffset: (Math.random() - 0.5) * 4,
      };
      scene.add(satellite);
      satellites.push(satellite);
    }

    const clock = new THREE.Clock();
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      (centralOrb.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
      centralOrb.rotation.x += 0.001;
      centralOrb.rotation.y += 0.002;

      satellites.forEach(satellite => {
        (satellite.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
        satellite.userData.angle += satellite.userData.speed * 0.01;
        
        satellite.position.x = satellite.userData.orbitRadius * Math.cos(satellite.userData.angle);
        satellite.position.z = satellite.userData.orbitRadius * Math.sin(satellite.userData.angle);
        satellite.position.y = Math.sin(elapsedTime * satellite.userData.speed + satellite.userData.yOffset) * 2;

        satellite.rotation.x += 0.01;
        satellite.rotation.y += 0.02;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
        if (!mountRef.current) return;
        const newWidth = currentMount.clientWidth;
        const newHeight = currentMount.clientHeight;
        if(newWidth > 0 && newHeight > 0) {
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        }
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(currentMount);

    return () => {
      resizeObserver.disconnect();
      if(animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (currentMount && renderer.domElement && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [width, height, retryCount]);

  if (renderError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4 text-center rounded-lg">
          <i className="ri-error-warning-line text-red-500 text-2xl mb-1"></i>
          <div className="text-red-400 text-[10px] font-bold mb-1 uppercase tracking-widest">Orb System Offline</div>
          <button 
            onClick={() => { setRenderError(false); setRetryCount(prev => prev + 1); }}
            className="text-[9px] py-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded border-none cursor-pointer transition-colors"
          >
            RETRY
          </button>
        </div>
      );
  }

  return <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, borderRadius: '10px', overflow: 'hidden' }} />;
};


const ResonanceEnginePanel: React.FC<ResonanceEnginePanelProps> = ({ width = 800, height = 250 }) => {
    return (
        <div className="resonance-engine-panel relative bg-slate-900/90 backdrop-blur-md border border-sky-600/50 rounded-xl shadow-2xl p-4 text-slate-100 my-6" style={{ width: `${width}px`, height: `${height}px` }}>
            <OrbSystem width={width} height={height} />
            <div className="absolute top-4 left-4 z-10 p-2 bg-black/50 rounded-lg">
                <h3 className="text-lg font-cinzel font-bold text-sky-300 tracking-wider">
                    Resonance Engine
                </h3>
            </div>
            <div className="absolute bottom-4 right-4 z-10 p-2 bg-black/50 rounded-lg text-right font-mono text-xs">
                <div className="text-sky-400">STATUS: <span className="text-green-400 font-bold">STABLE</span></div>
                <div className="text-sky-400">FREQUENCY: <span className="text-green-400 font-bold">HARMONIC</span></div>
                <p className="text-sky-300/70 mt-1">AX-PEACE.01/.05 engaged</p>
            </div>
        </div>
    );
};

export default ResonanceEnginePanel;
