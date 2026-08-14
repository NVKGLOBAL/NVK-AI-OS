
import React, { useState, useCallback, useEffect, useRef, useContext } from 'react';
import * as THREE from 'three';
import { useLocalLLM } from '../../context/LocalLLMContext'; 
import type { HolographicPersonaProjectorProps, Persona, VoiceProfile, VoiceEngine } from '../../types';
import { AgentName, HistoricalEventType } from '../../types';
import { ORACLE_PERSONAS, AGENT_PROFILES } from '../../constants';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { gsap } from 'gsap';

import { useEcho } from '../../context/EchoContext';
const vertexShader = `
    uniform float uTime;
    uniform float uIntensity;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
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
        vec3 pos = position;
        float noise = snoise(pos.xy * 2.5 + uTime * 0.3) * uIntensity * 0.15;
        pos += normal * noise;
        vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewPosition = -modelViewPosition.xyz;
        gl_Position = projectionMatrix * modelViewPosition;
    }
`;

const fragmentShader = `
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = 1.0 - dot(normal, viewDir);
        fresnel = pow(fresnel, 2.5);
        float scanline = sin(vViewPosition.y * 25.0 - uTime * 10.0) * 0.04 + 0.96;
        float glow = fresnel * scanline * uIntensity;
        gl_FragColor = vec4(uColor * glow, glow * 0.8);
    }
`;

export const HolographicPersonaProjector: React.FC<HolographicPersonaProjectorProps> = ({  addHistoricalEvent, voiceEngine, voiceProfiles }) => {
  const { addEchoMessage } = useEcho();
  const [selectedPersona, setSelectedPersona] = useState<Persona>(ORACLE_PERSONAS[0]);
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState<Array<{ source: 'Seeker' | 'Persona', text: string }>>([]);
  const [renderError, setRenderError] = useState(false);
  
  const { isModelLoaded, loadStatus, loadProgress, loadModel, generateText, isGenerating, error: llmError } = useLocalLLM();
  
  const mountRef = useRef<HTMLDivElement>(null);
  const hologramRef = useRef<THREE.Mesh>();
  const animationFrameIdRef = useRef<number | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);
  
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 2.5;

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
        console.error("HolographicPersonaProjector: WebGL Init Failed", e);
        setRenderError(true);
        return;
    }
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);
    
    const geometry = new THREE.IcosahedronGeometry(1, 4);
    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uIntensity: { value: 1.0 },
            uColor: { value: new THREE.Color(ORACLE_PERSONAS[0].glowColor) }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    
    hologramRef.current = new THREE.Mesh(geometry, material);
    scene.add(hologramRef.current);

    const clock = new THREE.Clock();
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      
      if(hologramRef.current) {
        hologramRef.current.rotation.y = elapsedTime * 0.2;
        (hologramRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;
      }
      renderer.render(scene, camera);
    };
    animate();
    
    const handleResize = () => {
        if (!mountRef.current) return;
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if(animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (currentMount && renderer.domElement.parentElement === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (hologramRef.current) {
        gsap.to((hologramRef.current.material as THREE.ShaderMaterial).uniforms.uColor.value, {
            r: new THREE.Color(selectedPersona.glowColor).r,
            g: new THREE.Color(selectedPersona.glowColor).g,
            b: new THREE.Color(selectedPersona.glowColor).b,
            duration: 0.5,
        });
    }
  }, [selectedPersona]);

  const handleActivate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    if (!isModelLoaded) {
        addEchoMessage(AgentName.SystemCore, "Local neural lattice not hydrated. Initializing download...", 'text-yellow-400');
        loadModel();
        return;
    }

    const seekerQuery = prompt.trim();
    setConversation(prev => [...prev, { source: 'Seeker', text: seekerQuery }]);
    setPrompt('');

    addEchoMessage(
      AgentName.Seeker,
      seekerQuery,
      AGENT_PROFILES[AgentName.Seeker]?.colorClass || 'text-cyan-200'
    );
    
    const result = await generateText(seekerQuery, selectedPersona.systemInstruction);

    if (result) {
        setConversation(prev => [...prev, { source: 'Persona', text: result }]);
        addEchoMessage(AgentName.TheCodexPersona, result, selectedPersona.color);
        addHistoricalEvent(HistoricalEventType.HOLOGRAPHIC_PROJECTION_ACTIVATED, {
            personaId: selectedPersona.id, personaName: selectedPersona.name, prompt: seekerQuery, response: result
        });
        
        const codexProfile = voiceProfiles.find(p => p.agent === AgentName.TheCodexPersona);
        if(codexProfile) {
            voiceEngine.speak(result, codexProfile).catch(err => console.error("TTS Error:", err));
        }
    } else {
        const errorResponse = "The persona's projection wavers and fades... The local connection was lost.";
        setConversation(prev => [...prev, { source: 'Persona', text: errorResponse }]);
        addEchoMessage(AgentName.SystemCore, `Holographic projection failed for persona ${selectedPersona.name}.`, AGENT_PROFILES[AgentName.SystemCore]?.colorClass || 'text-red-400');
    }
  }, [prompt, selectedPersona, isGenerating, isModelLoaded, loadModel, generateText, addHistoricalEvent, voiceEngine, voiceProfiles]);


  return (
    <div className="holographic-persona-projector bg-slate-950/80 backdrop-blur-md border border-sky-600/50 rounded-xl shadow-2xl p-4 text-slate-100 my-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-cinzel font-bold text-sky-300 tracking-wider">Holographic Persona Projector</h3>
          {!isModelLoaded && !llmError && (
            <span className="text-[10px] bg-slate-800 border border-sky-500/50 text-sky-400 px-2 py-1 rounded animate-pulse">
                LOCAL INFERENCE OFFLINE
            </span>
          )}
          {isModelLoaded && (
            <span className="text-[10px] bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 px-2 py-1 rounded">
                NEURAL LATTICE ACTIVE
            </span>
          )}
          {llmError && (
             <span className="text-[10px] bg-red-900/30 border border-red-500/30 text-red-400 px-2 py-1 rounded" title={llmError.message}>
                LATTICE ERROR
            </span>
          )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 flex-grow min-h-0">
        <div className="md:w-1/2 flex flex-col">
            <div ref={mountRef} className="hologram-canvas w-full h-48 bg-black/30 rounded-lg border border-slate-700/50 shadow-inner mb-3 relative overflow-hidden">
                {renderError && <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs">Hologram Visuals Offline (WebGL Limit)</div>}
                {loadStatus !== "Idle" && loadStatus !== "Ready" && loadStatus !== "Error" && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
                        <p className="text-sky-300 text-xs mb-1 px-4 text-center w-full truncate" title={loadStatus}>{loadStatus}</p>
                        <div className="w-32 bg-slate-700 rounded-full h-1">
                            <div className="bg-sky-500 h-1 rounded-full transition-all duration-200" style={{ width: `${loadProgress}%`}}></div>
                        </div>
                     </div>
                )}
                {llmError && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 px-4 text-center">
                        <i className="ri-error-warning-line text-red-500 text-2xl mb-2"></i>
                        <p className="text-red-300 text-xs mb-2">Neural Lattice Connection Failed</p>
                        <p className="text-red-400/70 text-[10px] max-h-16 overflow-y-auto">{llmError.message}</p>
                        <Button onClick={loadModel} className="mt-2 text-[10px] py-1 px-2 bg-slate-700 hover:bg-slate-600">Retry Connection</Button>
                     </div>
                )}
            </div>
            <div className="persona-selector mb-3">
                <div className="flex flex-wrap gap-2 justify-center">
                {ORACLE_PERSONAS.map(p => (
                    <button key={p.id} onClick={() => setSelectedPersona(p)}
                        className={`flex flex-col items-center p-2 rounded-md border-2 transition-all w-20 ${selectedPersona.id === p.id ? 'border-sky-400 bg-sky-900/50' : 'border-slate-700 bg-slate-800/50 hover:border-sky-500'}`}
                        title={p.name}>
                        <i className={`${p.icon} text-2xl ${p.color}`}></i>
                        <span className="text-xs mt-1">{p.name}</span>
                    </button>
                ))}
                </div>
            </div>
             <Textarea
              placeholder={isModelLoaded ? `Query ${selectedPersona.name}...` : "Initialize system to query..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleActivate(); } }}
              className="flex-grow text-sm bg-slate-800 border-slate-700 min-h-[80px]"
              disabled={isGenerating}
            />
             <Button onClick={handleActivate} disabled={isGenerating || (!isModelLoaded && loadStatus !== "Idle" && loadStatus !== "Error") || (!prompt.trim() && isModelLoaded)} className="w-full mt-2 bg-sky-600 hover:bg-sky-500">
                {!isModelLoaded ? (loadStatus === "Idle" || loadStatus === "Error" ? "Initialize Neural Lattice" : "Hydrating...") : (isGenerating ? 'Projecting...' : 'Activate Projector')}
            </Button>
        </div>

        <div className="md:w-1/2 flex flex-col bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
            <h4 className="text-sm font-cinzel text-sky-200 mb-2 border-b border-slate-600 pb-1">Communion Log</h4>
            <div className="conversation-log flex-grow overflow-y-auto custom-scrollbar-thin space-y-3 pr-2 max-h-[400px] md:max-h-none">
                {conversation.map((msg, index) => (
                    <div key={index} className={`flex ${msg.source === 'Seeker' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] p-2.5 rounded-lg text-xs shadow break-words ${msg.source === 'Seeker' ? 'bg-indigo-600/80 text-indigo-50 rounded-br-none' : 'bg-slate-700/80 text-slate-200 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={conversationEndRef}></div>
            </div>
        </div>
      </div>
    </div>
  );
};
