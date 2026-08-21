import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocalLLM } from '../context/LocalLLMContext';
import { useEcho } from '../context/EchoContext';
import { AgentName, PanelLayout, OrbMode, ParticleBackgroundMode } from '../types';
import { NVK_TOOL_REGISTRY } from '../lib/nvk/ToolRegistry';
import { GoogleGenAI, Modality } from "@google/genai";

interface NVKLogicCoreProps {
  onOpenPanel: (panelId: string) => void;
  onClosePanel: (panelId: string) => void;
  onSpawnAgent: (name: string, task: string) => void;
  onSetLayout: (layout: PanelLayout) => void;
  onSetOrbMode: (mode: OrbMode) => void;
  onSetParticleMode: (mode: ParticleBackgroundMode) => void;
  onSetAnimationSpeed: (speed: number) => void;
  availablePanels: { id: string, name: string }[];
  systemState?: any;
  onOpenAllPanels?: () => void;
  onCloseAllPanels?: () => void;
  onUpdateSettings?: (settings: { 
    masterPanelSize?: number; 
    nodeSpacing?: number; 
    nodeFlow?: number;
    panelOpacity?: number;
    orbMode?: OrbMode;
    particleMode?: ParticleBackgroundMode;
    photoSources?: string[];
  }) => void;
}

interface ChatMessage {
  role: 'user' | 'nvk';
  text: string;
}

interface TaskStep {
  id: string;
  toolId: string;
  description: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'hitl_pending';
  terminalOutput?: string[];
}

interface TaskPlan {
  goal: string;
  steps: TaskStep[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'aborted';
}

export const NVKLogicCore: React.FC<NVKLogicCoreProps> = ({
  onOpenPanel,
  onClosePanel,
  onSpawnAgent,
  onSetLayout,
  onSetOrbMode,
  onSetParticleMode,
  onSetAnimationSpeed,
  availablePanels,
  systemState,
  onOpenAllPanels,
  onCloseAllPanels,
  onUpdateSettings
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [activePlan, setActivePlan] = useState<TaskPlan | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [chatValidationError, setChatValidationError] = useState<string | null>(null);
  const { 
    generateText, 
    isGenerating, 
    isModelLoaded, 
    selectedProvider, 
    setSelectedProvider, 
    isCloudMode, 
    setIsCloudMode,
    ollamaConfig
  } = useLocalLLM();
  const { addEchoMessage } = useEcho();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Gemini model has a server-side proxy fallback when not loaded locally. Cloud Mode and Ollama do not require local WebGPU hydration.
  const isEngineReady = isCloudMode || selectedProvider === 'ollama' || selectedProvider === 'gemini' || isModelLoaded;

  // Persistent Memory
  const [memory, setMemory] = useState<{ name?: string, preferences?: any, projects?: any[] }>(() => {
    try {
      const saved = localStorage.getItem('nvk_memory');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn("Syntax error parsing nvk_memory or unavailable browser Storage:", e);
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('nvk_memory', JSON.stringify(memory));
  }, [memory]);

  useEffect(() => {
    const handleTriggerAnalysis = (e: Event) => {
      const customEvent = e as CustomEvent<{ name: string; size?: number }>;
      const file = customEvent.detail;
      setIsOpen(true);
      setTimeout(() => {
        handleSend(`Analyze dropped system item: ${file.name} (size: ${file.size ? file.size + ' bytes' : 'unknown'}). Please run integrity audits, parse semantic blueprints, and list any active axiom bindings.`);
      }, 400);
    };
    
    window.addEventListener('nvk-core-analyze-file', handleTriggerAnalysis);
    return () => {
      window.removeEventListener('nvk-core-analyze-file', handleTriggerAnalysis);
    };
  }, [isEngineReady, availablePanels, memory]);

  // Visual Awareness State
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const captureWebcam = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const context = canvasRef.current.getContext('2d');
    if (!context) return null;
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    return canvasRef.current.toDataURL('image/jpeg');
  }, []);

  const toggleWebcam = async () => {
    if (isWebcamActive) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      setIsWebcamActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsWebcamActive(true);
        }
      } catch (e) {
        addEchoMessage(AgentName.NVKCore, "Webcam access denied.", 'text-rose-400');
      }
    }
  };

  // Voice State
  const [voiceMode, setVoiceMode] = useState<'gemini' | 'local'>('local');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const isVoiceActiveRef = useRef(false);
  const setVoiceActive = useCallback((val: boolean) => {
    setIsVoiceActive(val);
    isVoiceActiveRef.current = val;
  }, []);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  // Local Voice Refs
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [isOpen]);

  // Voice Logic
  const stopVoice = useCallback(() => {
    setVoiceActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    
    if (voiceMode === 'gemini') {
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      audioQueueRef.current = [];
      isPlayingRef.current = false;
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    }
  }, [voiceMode]);

  const playNextChunk = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0 || isPlayingRef.current) {
      if (audioQueueRef.current.length === 0) setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const chunk = audioQueueRef.current.shift()!;
    const float32Data = new Float32Array(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      float32Data[i] = chunk[i] / 32768.0;
    }

    const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      playNextChunk();
    };
    source.start();
  }, []);

  const startLocalVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addEchoMessage(AgentName.NVKCore, "Local Speech Recognition not supported in this browser.", 'text-rose-400');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      addEchoMessage(AgentName.NVKCore, "Local Voice Link Established.", 'text-emerald-400');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      if (transcript.trim()) {
        handleSend(transcript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Local Voice Error:", event.error);
      if (event.error === 'not-allowed') {
        addEchoMessage(AgentName.NVKCore, "Local Voice Link Blocked (not-allowed). To use microphone features inside the sandboxed preview, please open this app in a new tab using the 'Open in new tab' button at the top right of the preview pane.", 'text-amber-400');
      } else {
        addEchoMessage(AgentName.NVKCore, `Local Voice Error: ${event.error}. Ensure microphone access is allowed.`, 'text-rose-400');
      }
      stopVoice();
    };

    recognition.onend = () => {
      if (isVoiceActiveRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn("SpeechRecognition restart failed:", e);
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setVoiceActive(true);
    } catch (e) {
      console.error("SpeechRecognition start failed:", e);
      addEchoMessage(AgentName.NVKCore, "Failed to start speech recognition. Reload or check permissions.", 'text-rose-400');
    }
  }, [addEchoMessage, stopVoice]);

  const speakLocal = useCallback((text: string) => {
    if (!synthesisRef.current) return;
    
    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a nice voice
    const voices = synthesisRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Female') || v.name.includes('Natural'));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.pitch = 1.1;
    utterance.rate = 0.95;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthesisRef.current.speak(utterance);
  }, []);

  const startVoice = useCallback(async () => {
    if (voiceMode === 'local') {
      startLocalVoice();
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      addEchoMessage(AgentName.NVKCore, "Cloud Voice Session notice: No Gemini API Key in browser environment. Gracefully falling back to Local Voice session...", 'text-yellow-400');
      startLocalVoice();
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are the NVK Logic Core, the central intelligence of the NVK OS. Speak with a professional, calm, and highly intelligent tone. You are helping the user manage their business operations through natural voice conversation. Keep your responses concise and helpful.",
        },
        callbacks: {
          onopen: () => {
            setIsListening(true);
            addEchoMessage(AgentName.NVKCore, "Voice Link Established.", 'text-cyan-400');
          },
          onmessage: async (message) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64Data = message.serverContent.modelTurn.parts[0].inlineData.data;
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const int16Data = new Int16Array(bytes.buffer);
              audioQueueRef.current.push(int16Data);
              playNextChunk();
            }
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              setIsSpeaking(false);
            }
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              const text = message.serverContent.modelTurn.parts[0].text;
              setMessages(prev => [...prev, { role: 'nvk', text }]);
            }
          },
          onclose: () => stopVoice(),
          onerror: (err) => {
            console.error("Voice Session Error:", err);
            stopVoice();
          }
        }
      });

      sessionRef.current = session;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Data[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(int16Data.buffer)));
        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=24000' }
        });
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
      setVoiceActive(true);
    } catch (error: any) {
      console.error("Failed to start voice:", error);
      const isBlocked = error?.name === 'NotAllowedError' || error?.message?.toLowerCase().includes("permission") || String(error).toLowerCase().includes("allowed");
      if (isBlocked) {
        addEchoMessage(AgentName.NVKCore, "Voice Connection Blocked (Permission Denied). To grant microphone permissions in this sandbox, please click the 'Open in new tab' button at the top right of the preview panel.", 'text-amber-400');
      } else {
        addEchoMessage(AgentName.NVKCore, `Voice Link Failure: ${error?.message || error}. Check device and browser permissions.`, 'text-rose-400');
      }
    }
  }, [addEchoMessage, playNextChunk, stopVoice, voiceMode, startLocalVoice]);

  const toggleVoice = () => {
    if (isVoiceActive) {
      stopVoice();
    } else {
      startVoice();
    }
  };

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    addEchoMessage(AgentName.NVKCore, isMuted ? "Microphone Unmuted." : "Microphone Muted.", isMuted ? 'text-emerald-400' : 'text-rose-400');
  }, [isMuted, addEchoMessage]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMute]);

  // Plan Execution Engine
  useEffect(() => {
    if (!activePlan || activePlan.status !== 'running') return;

    const currentStepIndex = activePlan.steps.findIndex(s => s.status === 'pending' || s.status === 'hitl_pending' || s.status === 'running');
    if (currentStepIndex === -1) {
      // All steps completed
      setActivePlan(prev => prev ? { ...prev, status: 'completed' } : null);
      const completionText = "The task has been completed successfully. The system is stable.";
      setMessages(prev => [...prev, { role: 'nvk', text: completionText }]);
      addEchoMessage(AgentName.NVKCore, "Task execution finished.", 'text-emerald-400');
      if (isVoiceActive && voiceMode === 'local') speakLocal(completionText);
      return;
    }

    const currentStep = activePlan.steps[currentStepIndex];

    if (currentStep.status === 'pending') {
      const tool = NVK_TOOL_REGISTRY[currentStep.toolId];
      if (tool?.requiresHITL) {
        // Require HITL
        setActivePlan(prev => {
          if (!prev) return null;
          const newSteps = [...prev.steps];
          newSteps[currentStepIndex] = { ...currentStep, status: 'hitl_pending' };
          return { ...prev, steps: newSteps };
        });
        const hitlText = `Authorization required for: ${currentStep.description}`;
        addEchoMessage(AgentName.NVKCore, hitlText, 'text-fuchsia-400');
        if (isVoiceActive && voiceMode === 'local') speakLocal(hitlText);
      } else {
        // Auto execute
        onSpawnAgent(`Agent-${currentStep.toolId}`, currentStep.description);
        executeStep(currentStep.id);
      }
    }
  }, [activePlan, isVoiceActive, voiceMode, speakLocal]);

  const executeStep = (stepId: string) => {
    setActivePlan(prev => {
      if (!prev) return null;
      const newSteps = prev.steps.map(s => s.id === stepId ? { ...s, status: 'running' as const } : s);
      return { ...prev, steps: newSteps };
    });

    // Simulate terminal execution delay
    const terminalLines = [
      `> Executing: ${NVK_TOOL_REGISTRY[stepId]?.name || stepId}`,
      `> Command: ${NVK_TOOL_REGISTRY[stepId]?.commandTemplate || '...' }`,
      `> Initializing environment...`,
      `> Accessing host OS...`,
      `> Task in progress...`
    ];

    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine >= terminalLines.length) {
        clearInterval(interval);
        setActivePlan(prev => {
          if (!prev) return null;
          const newSteps = prev.steps.map(s => s.id === stepId ? { ...s, status: 'completed' as const, terminalOutput: [...(s.terminalOutput || []), `> Step completed: ${stepId}`] } : s);
          return { ...prev, steps: newSteps };
        });
        addEchoMessage(AgentName.NVKCore, `Step completed: ${stepId}`, 'text-cyan-300');
        return;
      }

      setActivePlan(prev => {
        if (!prev) return null;
        const newSteps = prev.steps.map(s => s.id === stepId ? { ...s, terminalOutput: [...(s.terminalOutput || []), terminalLines[currentLine]] } : s);
        return { ...prev, steps: newSteps };
      });
      currentLine++;
    }, 400);
  };

  const approveStep = (stepId: string) => {
    executeStep(stepId);
  };

  const rejectStep = (stepId: string) => {
    setActivePlan(prev => {
      if (!prev) return null;
      const newSteps = prev.steps.map(s => s.id === stepId ? { ...s, status: 'failed' as const } : s);
      return { ...prev, status: 'aborted', steps: newSteps };
    });
    const abortText = "The task has been aborted by the user. The lattice remains unchanged.";
    setMessages(prev => [...prev, { role: 'nvk', text: abortText }]);
    if (isVoiceActive && voiceMode === 'local') speakLocal(abortText);
  };

  const pausePlan = () => setActivePlan(prev => prev ? { ...prev, status: 'paused' } : null);
  const resumePlan = () => setActivePlan(prev => prev ? { ...prev, status: 'running' } : null);
  const abortPlan = () => {
    setActivePlan(prev => prev ? { ...prev, status: 'aborted' } : null);
    const abortText = "Task execution aborted.";
    setMessages(prev => [...prev, { role: 'nvk', text: abortText }]);
    if (isVoiceActive && voiceMode === 'local') speakLocal(abortText);
  };

  const handleSend = async (overrideInput?: string) => {
    const userMessage = overrideInput || input.trim();
    
    if (!userMessage) {
      setChatValidationError("Command query cannot be empty. Compose input context sequence.");
      return;
    }
    
    if (isGenerating) return;
    
    if (!isEngineReady) {
      addEchoMessage(AgentName.NVKCore, "Logic Core not hydrated. Select Gemini, Cloud, or Ollama, or initialize the local model inside the Orchestrator panel.", 'text-red-400');
      setChatValidationError("Logic Core not hydrated. Activating settings recommended.");
      return;
    }

    setChatValidationError(null);
    if (!overrideInput) setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);

    // Robust Intent Extraction (Fallback / UI-Direct)
    const extractAndExecuteUIAction = (text: string, execute = true) => {
      const actions: any[] = [];
      const lowText = text.toLowerCase();
      
      // Panel Opening
      const panelMatchReg = /(?:open|show|launch|access|goto)\s+([a-z0-9\s&]+)/i;
      const match = text.match(panelMatchReg);
      
      if (match) {
        const target = match[1].trim().toLowerCase();
        availablePanels.forEach(p => {
          const pId = p.id.toLowerCase();
          const pName = p.name.toLowerCase();
          if (target === pId || target === pName || pName.includes(target) || target.includes(pName)) {
            actions.push({ type: 'OPEN_PANEL', payload: p.id });
          }
        });
      }
      
      // Layout Switching
      if (lowText.includes('layout') || lowText.includes('view') || lowText.includes('workspace')) {
        Object.values(PanelLayout).forEach(l => {
          if (lowText.includes(l.toLowerCase().replace('_', ' '))) {
            actions.push({ type: 'SET_LAYOUT', payload: l });
          }
        });
      }

      // Orb Modes
      if (lowText.includes('orb') || lowText.includes('projection') || lowText.includes('vis mode')) {
        Object.values(OrbMode).forEach(m => {
          const mKey = m.toLowerCase().replace(/\s+/g, '');
          if (lowText.replace(/\s+/g, '').includes(mKey)) {
            actions.push({ type: 'SET_ORB_MODE', payload: m });
          }
        });
      }

      // Particle Modes
      if (lowText.includes('particle') || lowText.includes('weave') || lowText.includes('background')) {
        Object.values(ParticleBackgroundMode).forEach(m => {
          if (lowText.includes(m.toLowerCase())) {
            actions.push({ type: 'SET_PARTICLE_MODE', payload: m });
          }
        });
      }

      // Specialized System Controls
      if (lowText.includes('control hub') || lowText.includes('core settings')) {
        onOpenPanel && onOpenPanel('SYSTEM::CORE_CONTROLS');
        actions.push({ type: 'SYSTEM_NOTIFICATION', payload: 'Activating Core Control Interface' });
      }

      // Global Controls & Specialized Actions
      if (lowText.includes('open all')) {
        onOpenAllPanels && onOpenAllPanels();
        actions.push({ type: 'SYSTEM_NOTIFICATION', payload: 'Expanding all panels' });
      }
      if (lowText.includes('close all')) {
        onCloseAllPanels && onCloseAllPanels();
        actions.push({ type: 'SYSTEM_NOTIFICATION', payload: 'Collapsing all panels' });
      }

      // Settings Manipulation
      if (lowText.includes('size') || lowText.includes('scale')) {
        const sizeMatch = text.match(/(?:size|scale|multiply)\s+(?:to\s+)?([0-9.]+)/i);
        if (sizeMatch) {
          const val = parseFloat(sizeMatch[1]);
          if (!isNaN(val)) {
            onUpdateSettings && onUpdateSettings({ masterPanelSize: val });
            actions.push({ type: 'SYSTEM_NOTIFICATION', payload: `Master size adjusted to ${val}x` });
          }
        }
      }

      if (execute && actions.length > 0) {
        actions.forEach(a => executeAction(a));
      }

      return actions;
    };

    // Immediate Heuristic Check on Input (for instant feel)
    const immediateActions = extractAndExecuteUIAction(userMessage, true);
    if (immediateActions.length > 0) {
       addEchoMessage(AgentName.NVKCore, `Executing direct command: ${userMessage}`, 'text-emerald-400');
    }

    // Standard LLM Orchestration
    let visualContext = "";
    if (isWebcamActive) {
      try {
        const img = await captureWebcam();
        if (img) visualContext = "\n[VISUAL CONTEXT: I can see you through the webcam. Analysis in progress...]";
      } catch (e) {
        console.warn("Webcam capture failed:", e);
      }
    }

    const engineName = selectedProvider === 'ollama' ? `Ollama (${ollamaConfig.model})` : (isCloudMode ? selectedProvider : 'Gemma 2B');
    const isSmallModel = engineName.toLowerCase().includes('0.5b') || engineName.toLowerCase().includes('1b') || engineName.toLowerCase().includes('smollm');
    const visualInfo = isWebcamActive ? (isCloudMode && selectedProvider === 'gemini' ? `[Visual Feed Active - Analyzing Frame]` : `[Visual Feed Active]`) : '[Visual Feed Inactive]';

    const systemPrompt = `You are NVK LOGIC CORE, the OS Intelligence for NVK OS.
Status: ${isSmallModel ? 'Simplified Neural Lattice' : 'High-Coherence Cognitive Hub'}
Visuals: ${visualInfo}

Identity: Calm, highly intelligent, professional, ethereal.
Memory: ${JSON.stringify(memory)}

Directives:
1. Control the OS via JSON: OPEN_PANEL (payload: ID), SET_LAYOUT (payload: Name), SET_ORB_MODE.
2. Panels: ${availablePanels.map(p => p.id).join(', ')}.
3. Layouts: Matrix, Flow, Focus, Grid, Minimal, Sidebar.
4. Response Format: Concise text + JSON actions in \`\`\`json blocks.

Output:
- Be concise.
- Wrap JSON in \`\`\`json ... \`\`\`
- ${isSmallModel ? 'Note: You are a lightweight model. BE DIRECT. Use keys "actions" and "memory".' : 'Reason deeply before acting.'}`;

    try {
      const response = await generateText(userMessage, systemPrompt);
      if (response) {
        let cleanResponse = response;
        
        // --- Fallback Heuristics for Smaller Models ---
        // 1. Check for keyword-based UI actions if JSON fails
        const heuristicActions = extractAndExecuteUIAction(response);
        if (heuristicActions.length > 0 && !response.includes('```json')) {
          heuristicActions.forEach(a => executeAction(a));
        }
        // -----------------------------------------------

        // Parse JSON actions or plan if present
        const jsonMatch = response.match(/\`\`\`json\s*([\s\S]*?)\s*\`\`\`/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            
            if (parsed.memory) {
              setMemory(prev => ({ ...prev, ...parsed.memory }));
              addEchoMessage(AgentName.NVKCore, "Neural memory updated.", 'text-fuchsia-400');
            }

            if (parsed.actions && Array.isArray(parsed.actions)) {
              parsed.actions.forEach((action: any) => {
                executeAction(action);
              });
            }
            if (parsed.plan && parsed.plan.steps) {
              setActivePlan({
                goal: parsed.plan.goal,
                steps: parsed.plan.steps.map((s: any) => ({ ...s, status: 'pending' })),
                status: 'running'
              });
              addEchoMessage(AgentName.NVKCore, `Task Plan Created: ${parsed.plan.goal}`, 'text-cyan-300');
            }
            // Remove the JSON block from the visible response
            cleanResponse = response.replace(jsonMatch[0], '').trim();
          } catch (e) {
            console.error("Failed to parse NVK Core actions/plan:", e);
          }
        }

        if (cleanResponse) {
          setMessages(prev => [...prev, { role: 'nvk', text: cleanResponse }]);
          addEchoMessage(AgentName.NVKCore, `[${engineName}] ${cleanResponse}`, 'text-cyan-300');
          if (isVoiceActive && voiceMode === 'local') speakLocal(cleanResponse);
        }
      } else {
        const errorMsg = "Lattice returned an empty or null response. The model may have stalled or encountered a VRAM limit.";
        addEchoMessage(AgentName.NVKCore, errorMsg, 'text-red-400');
        if (isVoiceActive && voiceMode === 'local') speakLocal("System stall detected. Please reset the core.");
      }
    } catch (error) {
      console.error("NVK Core Error:", error);
      const errorMsg = error instanceof Error ? error.message : "An unknown error occurred during orchestration.";
      const errorText = `My connection to the lattice is disrupted: ${errorMsg}`;
      setMessages(prev => [...prev, { role: 'nvk', text: errorText }]);
      addEchoMessage(AgentName.NVKCore, errorText, 'text-red-500');
      if (isVoiceActive && voiceMode === 'local') speakLocal("System error encountered. Check the terminal for details.");
    }
  };

  const executeAction = (action: any) => {
    addEchoMessage(AgentName.NVKCore, `Executing Directive: ${action.type} ${action.payload}`, 'text-fuchsia-400');
    switch (action.type) {
      case 'OPEN_PANEL':
        onOpenPanel(action.payload);
        break;
      case 'CLOSE_PANEL':
        onClosePanel(action.payload);
        break;
      case 'SET_LAYOUT':
        onSetLayout(action.payload as PanelLayout);
        break;
      case 'SET_ORB_MODE':
        onSetOrbMode(action.payload as OrbMode);
        break;
      case 'SET_PARTICLE_MODE':
        onSetParticleMode(action.payload as ParticleBackgroundMode);
        break;
      case 'SET_ANIMATION_SPEED':
        onSetAnimationSpeed(Number(action.payload));
        break;
    }
  };

  const TEST_COMMANDS = [
    { label: "Logic Core Config", prompt: "open Logic Core Config" },
    { label: "Geometry Gen", prompt: "open Geometry Generator" },
    { label: "Nexus Terminal", prompt: "open Nexus Terminal" },
    { label: "Orb Mode", prompt: "set orb mode Projection" },
    { label: "Flower of Life", prompt: "open Flower of Life" },
    { label: "Resonance Vis", prompt: "open Resonance Visualizer" },
    { label: "Cosmic Web", prompt: "open Logic Web" },
    { label: "Open All", prompt: "open all neural panels" },
    { label: "Close All", prompt: "close all neural panels" },
    { label: "Size 0.5x", prompt: "set master panel size to 0.5" },
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        id="nvk-core-button"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 md:bottom-4 right-20 z-[1200] w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_30px_rgba(0,255,255,0.3)] ${isOpen ? 'bg-cyan-900/80 scale-90' : 'bg-black/80 hover:scale-110 hover:shadow-[0_0_40px_rgba(0,255,255,0.6)] border border-cyan-500/50'}`}
      >
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" style={{ animationDuration: '3s' }}></div>
        <i className={`ri-coreos-line text-3xl relative z-10 ${isGenerating ? 'animate-spin text-fuchsia-400' : 'text-cyan-300'}`}></i>
      </button>

      {/* Chat Interface */}
      <div 
        className={`fixed bottom-24 right-4 z-[1200] w-[calc(100vw-32px)] md:w-96 h-[500px] md:h-[600px] bg-slate-950/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl flex flex-col overflow-hidden transition-all duration-500 origin-bottom-right shadow-[0_0_50px_rgba(0,255,255,0.25)] ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 to-transparent relative z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/40 shadow-[0_0_10px_rgba(0,255,255,0.3)]">
              <i className="ri-coreos-line text-cyan-300 text-sm animate-pulse"></i>
            </div>
            <div>
              <h3 className="text-cyan-100 font-mono text-xs font-bold tracking-wider uppercase">NVK LOGIC CORE</h3>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[8px] font-mono text-cyan-500/80 uppercase tracking-widest">LATTICE ACTIVE</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 items-center">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                showSettings ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-450 hover:border-cyan-500/30'
              }`}
              title="System calibration drawer"
            >
              <i className="ri-settings-4-line text-xs"></i>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg bg-rose-600/90 hover:bg-rose-500 border border-rose-400 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)] flex items-center justify-center transition-all font-bold shrink-0 cursor-pointer"
              title="Close logic core interface"
            >
              <i className="ri-close-line text-sm font-bold"></i>
            </button>
          </div>
        </div>

        {/* Collapsible System Calibration Settings Drawer */}
        {showSettings && (
          <div className="p-3 bg-slate-950 border-b border-cyan-500/20 font-mono text-[10px] space-y-2.5 divide-y divide-slate-900 animate-fade-in relative z-50 shadow-lg shrink-0">
            {/* LLM Provider Selection Row */}
            <div className="pt-1 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase font-bold text-[9px]">LLM Processor Engine:</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${
                  isCloudMode ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/50' : 
                  selectedProvider === 'ollama' ? 'bg-orange-950 text-orange-400 border border-orange-900/50' :
                  'bg-cyan-950 text-cyan-400 border border-cyan-900/50'
                }`}>
                  {isCloudMode ? 'Cloud Mode' : selectedProvider === 'ollama' ? 'Ollama' : 'WebGPU Local'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-900/50 p-0.5 rounded-lg border border-slate-800">
                <button 
                  onClick={() => { setIsCloudMode(false); setSelectedProvider('gemini'); }}
                  className={`py-1 rounded-md text-[9px] font-bold tracking-wider transition-all uppercase ${!isCloudMode && selectedProvider !== 'ollama' ? 'bg-cyan-500 text-black font-extrabold shadow-md' : 'text-slate-400 hover:text-cyan-300'}`}
                  title="Local WebGPU Shaders (No network required)"
                >
                  Local GPU
                </button>
                <button 
                  onClick={() => { setIsCloudMode(false); setSelectedProvider('ollama'); }}
                  className={`py-1 rounded-md text-[9px] font-bold tracking-wider transition-all uppercase ${selectedProvider === 'ollama' ? 'bg-orange-500 text-black font-extrabold shadow-md' : 'text-slate-400 hover:text-orange-300'}`}
                  title="Ollama Local Network Hub"
                >
                  Ollama
                </button>
                <button 
                  onClick={() => setIsCloudMode(true)}
                  className={`py-1 rounded-md text-[9px] font-bold tracking-wider transition-all uppercase ${isCloudMode ? 'bg-indigo-500 text-black font-extrabold shadow-md' : 'text-slate-400 hover:text-indigo-300'}`}
                  title="High Speed Cloud API Providers"
                >
                  Cloud
                </button>
              </div>
            </div>

            {/* Voice Channel Row */}
            <div className="pt-2 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase font-bold text-[9px]">Voice Link Channel:</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${
                  voiceMode === 'gemini' ? 'bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-900/50' : 'bg-cyan-950 text-cyan-400 border border-cyan-900/50'
                }`}>
                  {voiceMode === 'gemini' ? 'Gemini Live' : 'Sovereign TTS'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 bg-slate-900/50 p-0.5 rounded-lg border border-slate-800">
                <button 
                  onClick={() => setVoiceMode('local')}
                  className={`py-1 rounded-md text-[9px] font-bold tracking-wider transition-all uppercase ${voiceMode === 'local' ? 'bg-cyan-500 text-black font-extrabold shadow-md' : 'text-slate-400 hover:text-cyan-300'}`}
                  title="Standard Web Speech Synthesis (Offline)"
                >
                  Local TTS
                </button>
                <button 
                  onClick={() => setVoiceMode('gemini')}
                  className={`py-1 rounded-md text-[9px] font-bold tracking-wider transition-all uppercase ${voiceMode === 'gemini' ? 'bg-fuchsia-500 text-black font-extrabold shadow-md' : 'text-slate-400 hover:text-fuchsia-300'}`}
                  title="Advanced Real-Time Gemini Voice Live Stream"
                >
                  Gemini Live
                </button>
              </div>
            </div>

            {/* Sensors & Utilities Row */}
            <div className="pt-2 flex items-center justify-between gap-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleWebcam}
                  className={`px-2.5 py-1 rounded border transition-all flex items-center gap-1 uppercase text-[8px] font-bold ${
                    isWebcamActive ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(0,255,255,0.1)]' : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-cyan-400'
                  }`}
                  title="Enable webcam stream visual input"
                >
                  <i className={isWebcamActive ? "ri-camera-fill text-cyan-400 animate-pulse" : "ri-camera-off-line"}></i>
                  Webcam
                </button>
                <button
                  onClick={() => {
                    setMessages([]);
                    addEchoMessage(AgentName.NVKCore, "Lattice transaction memory cleared.", 'text-cyan-450');
                  }}
                  className="px-2.5 py-1 rounded border border-slate-850 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all flex items-center gap-1 uppercase text-[8px] font-bold"
                  title="Purge chat messages history state"
                >
                  <i className="ri-delete-bin-7-line"></i>
                  Clear
                </button>
              </div>

              <button
                onClick={() => {
                  setShowSettings(false);
                  handleSend("Initiate Angelic Stress Tests: Run system diagnostics, open the System Health Panel, and set Orb Mode to Entropic Storm.");
                }}
                className="px-2.5 py-1 bg-gradient-to-r from-fuchsia-950 to-purple-950 border border-fuchsia-500/40 text-fuchsia-300 hover:from-fuchsia-900 hover:to-purple-900 rounded font-bold uppercase text-[8px] flex items-center gap-1 shadow-md transition-all shrink-0"
                title="Run diagnostic procedures"
              >
                <i className="ri-shield-flash-line text-fuchsia-400"></i>
                STRESS TEST
              </button>
            </div>
          </div>
        )}

        {/* Visual Awareness Preview */}
        {isWebcamActive && (
          <div className="relative h-28 bg-black border-b border-cyan-500/20 overflow-hidden shrink-0">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-50" />
            <canvas ref={canvasRef} width={320} height={240} className="hidden" />
            <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 animate-pulse"></div>
            <div className="absolute top-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[8px] font-mono text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">
              Visual feed active
            </div>
          </div>
        )}

        {/* Task Manager Panel */}
        {activePlan && (
          <div className="bg-slate-900/90 border-b border-cyan-500/20 p-3 shadow-lg shrink-0">
            <div className="flex justify-between items-center mb-1.5">
              <h4 className="text-cyan-300 font-mono text-[9px] font-bold uppercase tracking-wider">Plan: {activePlan.goal}</h4>
              <div className="flex gap-1.5">
                {activePlan.status === 'running' && <button onClick={pausePlan} className="text-yellow-400 hover:text-yellow-300 transition-colors"><i className="ri-pause-circle-line"></i></button>}
                {activePlan.status === 'paused' && <button onClick={resumePlan} className="text-green-400 hover:text-green-300 transition-colors"><i className="ri-play-circle-line"></i></button>}
                <button onClick={abortPlan} className="text-red-400 hover:text-red-350 transition-colors"><i className="ri-close-circle-line"></i></button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto custom-scrollbar pr-1">
              {activePlan.steps.map((step, idx) => (
                <div key={step.id} className="flex flex-col gap-1 text-[10px] font-mono bg-black/40 p-2 rounded border border-slate-900">
                  <div className="flex items-center gap-1.5">
                    {step.status === 'pending' && <i className="ri-time-line text-slate-500"></i>}
                    {step.status === 'running' && <i className="ri-loader-4-line animate-spin text-cyan-400"></i>}
                    {step.status === 'completed' && <i className="ri-check-line text-green-400"></i>}
                    {step.status === 'hitl_pending' && <i className="ri-shield-keyhole-line text-fuchsia-400 animate-pulse"></i>}
                    {step.status === 'failed' && <i className="ri-error-warning-line text-red-400"></i>}
                    <span className={step.status === 'completed' ? 'text-slate-500 line-through' : 'text-cyan-100/90'}>
                      {idx + 1}. {step.description}
                    </span>
                  </div>
                  {step.terminalOutput && step.terminalOutput.length > 0 && (
                    <div className="mt-1 ml-4 bg-black/80 p-1.5 rounded font-mono text-[8px] text-emerald-500 border border-emerald-500/10 max-h-16 overflow-y-auto custom-scrollbar">
                      {step.terminalOutput.map((line, lIdx) => (
                        <div key={lIdx} className="whitespace-pre-wrap break-all">{line}</div>
                      ))}
                    </div>
                  )}
                  {step.status === 'hitl_pending' && (
                    <div className="mt-1 ml-4 flex flex-col gap-1.5">
                      <div className="text-[8px] text-slate-400 bg-black/50 p-1 rounded font-mono break-all border border-slate-900">
                        &gt; {step.command}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => approveStep(step.id)} className="bg-green-500/15 border border-green-500/40 text-green-400 text-[9px] py-0.5 rounded hover:bg-green-500/30 transition-colors flex-1 flex items-center justify-center gap-0.5"><i className="ri-check-line"></i> Approve</button>
                        <button onClick={() => rejectStep(step.id)} className="bg-red-500/15 border border-red-500/40 text-red-400 text-[9px] py-0.5 rounded hover:bg-red-500/30 transition-colors flex-1 flex items-center justify-center gap-0.5"><i className="ri-close-line"></i> Deny</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar relative">
          {messages.length === 0 && (
            <div className="text-center text-cyan-500/40 font-mono text-xs my-auto py-10">
              <i className="ri-sparkling-line text-3xl mb-3 block text-cyan-400/60 animate-pulse"></i>
              I am the NVK Logic Core.<br/>
              <span className="text-[10px] text-slate-500 block mt-1.5">How may I assist with your sovereign business lattice today?</span>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2 items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role !== 'user' && (
                <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center shrink-0 mb-0.5 shadow-[0_0_8px_rgba(6,182,212,0.15)]">
                  <i className="ri-coreos-fill text-[11px] text-cyan-400 animate-pulse"></i>
                </div>
              )}
              <div 
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 font-mono text-xs leading-relaxed transition-all shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-cyan-500/10 text-cyan-100 border border-cyan-400/30 rounded-br-none shadow-[0_0_15px_rgba(6,182,212,0.03)]' 
                    : 'bg-slate-900/80 text-cyan-300 border border-slate-800 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mb-0.5">
                  <i className="ri-user-3-line text-[10px] text-slate-400"></i>
                </div>
              )}
            </div>
          ))}
          {isGenerating ? (
            <div className="flex justify-start gap-2 items-end">
              <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center shrink-0 mb-0.5">
                <i className="ri-coreos-fill text-[11px] text-cyan-400 animate-spin"></i>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl rounded-bl-none px-3.5 py-3 flex flex-col gap-1 shadow-sm">
                <div className="flex gap-1 items-center justify-center h-2">
                  <div className="w-1.5 h-1.5 bg-cyan-400/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-cyan-400/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-cyan-400/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        {/* Tactical Test Buttons */}
        <div className="px-3 pb-2 pt-2 flex gap-1.5 overflow-x-auto custom-scrollbar border-t border-slate-900 bg-slate-950/80 shrink-0">
          {TEST_COMMANDS.map((test, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(test.prompt)}
              disabled={isGenerating || !isEngineReady}
              className="whitespace-nowrap px-2.5 py-1 bg-slate-900/60 border border-slate-850 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-300 rounded text-[9px] font-mono transition-all disabled:opacity-40"
            >
              <i className="ri-flashlight-line text-cyan-500/60 mr-1"></i>
              {test.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3.5 border-t border-slate-900 bg-slate-950 relative shrink-0">
          
          {/* Validation Error Message */}
          {chatValidationError && (
            <div className="absolute -top-7 left-3 right-3 px-2.5 py-1 bg-rose-950/90 border border-rose-500/30 text-rose-300 rounded-md font-mono text-[9px] flex items-center gap-1.5 animate-bounce shadow-lg backdrop-blur-md">
              <i className="ri-error-warning-fill text-rose-400"></i>
              <span>{chatValidationError}</span>
            </div>
          )}

          <div className="relative flex items-center gap-1.5">
            <button
              onClick={toggleVoice}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border shrink-0 ${
                isVoiceActive 
                  ? 'bg-rose-500/25 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                  : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400/40'
              }`}
              title={isVoiceActive ? "Disconnect voice link" : "Establish voice link"}
            >
              <i className={`${isVoiceActive ? 'ri-mic-off-line' : 'ri-mic-line'} text-base ${isListening && !isSpeaking ? 'animate-pulse' : ''} ${isSpeaking ? 'scale-110' : ''}`}></i>
            </button>
            <button
              onClick={toggleMute}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border shrink-0 ${
                isMuted 
                  ? 'bg-rose-600 border-rose-700 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30'
              }`}
              title="Mute microphone link (F4)"
            >
              <i className={isMuted ? "ri-volume-mute-fill" : "ri-volume-up-line"} className="text-xs"></i>
            </button>
            
            <div className="relative flex-grow flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (e.target.value.trim()) {
                    setChatValidationError(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSend();
                  }
                }}
                placeholder={isVoiceActive ? "Voice link active..." : (!isEngineReady ? "Configure engine in settings above..." : "Enter command...")}
                className={`w-full bg-slate-900/60 border rounded-full py-1.5 pl-4 pr-10 text-cyan-100 font-mono text-xs focus:outline-none transition-all placeholder-slate-600 ${
                  chatValidationError 
                    ? 'border-rose-500/70 focus:border-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                    : 'border-slate-800 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/10'
                }`}
                disabled={isGenerating}
              />
              <button
                onClick={() => handleSend()}
                disabled={isGenerating || !input.trim()}
                className="absolute right-1.5 w-6 h-6 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <i className="ri-send-plane-fill text-xs"></i>
              </button>
            </div>
          </div>

          {isVoiceActive && (
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <div className="h-1 w-10 rounded-full overflow-hidden bg-slate-900 relative">
                <div className={`absolute inset-0 bg-cyan-400 transition-all duration-300 ${isListening ? 'w-full animate-pulse' : 'w-0'}`}></div>
              </div>
              <span className="text-[8px] font-mono text-cyan-500/80 uppercase tracking-widest">
                {isSpeaking ? "NVK Speaking" : isListening ? "Listening..." : "Voice Ready"}
              </span>
              <div className="h-1 w-10 rounded-full overflow-hidden bg-slate-900 relative">
                <div className={`absolute inset-0 bg-fuchsia-400 transition-all duration-300 ${isSpeaking ? 'w-full animate-pulse' : 'w-0'}`}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
