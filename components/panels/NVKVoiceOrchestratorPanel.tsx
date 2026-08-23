import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { AgentName } from '../../types';
import { useEcho } from '../../context/EchoContext';
import { useLocalLLM } from '../../context/LocalLLMContext';

export default function NVKVoiceOrchestratorPanel() {
  const { addEchoMessage } = useEcho();
  const {
    isModelLoaded,
    isGenerating: isLocalGenerating,
    loadProgress,
    loadStatus,
    loadModel,
    generateText,
    selectedModel,
    setSelectedModel,
    clearCache
  } = useLocalLLM();

  // Engine selection: 'webgpu' (Offline Local Brain) vs 'gemini' (Cloud Gemini Live)
  const [engineMode, setEngineMode] = useState<'webgpu' | 'gemini'>('webgpu');

  // Connection and Mute states
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Gemini Live parameters
  const [selectedVoice, setSelectedVoice] = useState('Zephyr'); // Puck, Charon, Kore, Fenrir, Zephyr
  const [selectedPersona, setSelectedPersona] = useState('nevik'); // nevik, oracle, scribe
  
  // Local WebGPU Voice Modulation parameters
  const [pitch, setPitch] = useState<number>(1.0); // 0.5 to 2.0
  const [rate, setRate] = useState<number>(1.0); // 0.7 to 1.8
  const [audioFxPreset, setAudioFxPreset] = useState<'natural' | 'cyber' | 'oracle' | 'robot'>('cyber');
  const [selectedBrowserVoice, setSelectedBrowserVoice] = useState<string>('');
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [tokensPerSec, setTokensPerSec] = useState<number>(0);

  // Transcripts
  const [transcript, setTranscript] = useState<Array<{ sender: 'user' | 'nevik', text: string, timestamp: number }>>([]);
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const [userSpeechText, setUserSpeechText] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Audio elements & Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);
  const speechRecognitionRef = useRef<any>(null);

  // Visual meter
  const [audioLevel, setAudioLevel] = useState(0);

  // Populate browser voices for local SpeechSynthesis
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        setBrowserVoices(voices);
        if (voices.length > 0 && !selectedBrowserVoice) {
          const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.lang.startsWith('en')) || voices[0];
          setSelectedBrowserVoice(preferred.name);
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedBrowserVoice]);

  // Audio cleanup
  const cleanUpAudio = useCallback(() => {
    // Stop local speech recognition
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (_) {}
      speechRecognitionRef.current = null;
    }

    // Stop recording
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (micIntervalRef.current) {
      clearInterval(micIntervalRef.current);
      micIntervalRef.current = null;
    }

    // Stop playback
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (_) {}
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setMicActive(false);
    setAudioLevel(0);
  }, []);

  const handleInterruption = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (_) {}
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCurrentSpeechText('');
  }, []);

  // Web Speech Synthesis with Pitch / Rate / Preset Modulation
  const speakLocalWithModulation = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Clear previous speech

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply voice
    if (selectedBrowserVoice && browserVoices.length > 0) {
      const v = browserVoices.find(voice => voice.name === selectedBrowserVoice);
      if (v) utterance.voice = v;
    }

    // Apply pitch & rate based on FX presets or manual sliders
    let finalPitch = pitch;
    let finalRate = rate;

    if (audioFxPreset === 'cyber') {
      finalPitch = 0.85; // Low deep cyber pitch
      finalRate = 1.05;
    } else if (audioFxPreset === 'oracle') {
      finalPitch = 1.35; // Ethereal high pitch
      finalRate = 0.95;
    } else if (audioFxPreset === 'robot') {
      finalPitch = 0.65; // Sub-bass robot
      finalRate = 1.15;
    }

    utterance.pitch = finalPitch;
    utterance.rate = finalRate;

    // Simulate audio level visualizer during TTS playback
    let levelInterval: any = null;
    utterance.onstart = () => {
      levelInterval = setInterval(() => {
        setAudioLevel(Math.floor(Math.random() * 60) + 30);
      }, 80);
    };

    utterance.onend = () => {
      if (levelInterval) clearInterval(levelInterval);
      setAudioLevel(0);
    };

    utterance.onerror = () => {
      if (levelInterval) clearInterval(levelInterval);
      setAudioLevel(0);
    };

    window.speechSynthesis.speak(utterance);
  }, [selectedBrowserVoice, browserVoices, pitch, rate, audioFxPreset]);

  // Handle local user voice input processing via WebGPU
  const processLocalSpeechQuery = useCallback(async (userText: string) => {
    if (!userText.trim()) return;
    
    setUserSpeechText(userText);
    setTranscript(prev => [...prev, { sender: 'user', text: userText, timestamp: Date.now() }].slice(-20));
    addEchoMessage(AgentName.SystemControl, `Local Voice Input: "${userText}"`, 'text-cyan-300');

    setCurrentSpeechText('Thinking on WebGPU hardware...');
    const startTime = performance.now();

    try {
      const systemContext = `You are Nevik (NVK OS Neural Intelligence), speaking naturally to the user. Keep your voice response concise, smart, clear, and direct (1-3 short sentences).`;
      const fullPrompt = `${systemContext}\nUser: ${userText}\nNevik:`;

      let tokenCount = 0;
      const responseText = await generateText(fullPrompt, () => {
        tokenCount++;
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed > 0) {
          setTokensPerSec(parseFloat((tokenCount / elapsed).toFixed(1)));
        }
      });

      const cleanResponse = responseText.replace(/User:|Nevik:|System:/gi, '').trim() || "WebGPU core active and aligned.";
      
      setCurrentSpeechText(cleanResponse);
      setTranscript(prev => [...prev, { sender: 'nevik', text: cleanResponse, timestamp: Date.now() }].slice(-20));
      
      // Speak the generated response locally with real-time modulation
      speakLocalWithModulation(cleanResponse);

    } catch (err: any) {
      console.error("WebGPU Local Voice Generation Failed:", err);
      setErrorText(`WebGPU Local Brain error: ${err.message || String(err)}`);
      setCurrentSpeechText("WebGPU inference error encountered.");
    }
  }, [generateText, addEchoMessage, speakLocalWithModulation]);

  // Start continuous Speech Recognition for WebGPU Local Voice Mode
  const startLocalSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorText("Web Speech Recognition API is not supported in this browser. Use Chrome/Edge/Arc for local speech input.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      speechRecognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setMicActive(true);
        setErrorText(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setUserSpeechText(interim);
          setAudioLevel(40 + Math.floor(Math.random() * 30));
        }

        if (final && final.trim()) {
          processLocalSpeechQuery(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error === 'not-allowed') {
          setErrorText("Microphone permission denied. Open app in new tab if sandboxed.");
        }
      };

      recognition.onend = () => {
        // Restart recognition automatically if still connected in WebGPU mode
        if (speechRecognitionRef.current && isConnected) {
          try { recognition.start(); } catch (_) {}
        } else {
          setMicActive(false);
        }
      };

      recognition.start();
    } catch (e: any) {
      console.error("Failed to start Speech Recognition:", e);
      setErrorText(`Speech input error: ${e.message || String(e)}`);
    }
  }, [isConnected, processLocalSpeechQuery]);

  // Play audio chunk continuously (Gemini mode)
  const playAudioChunk = useCallback((base64PCM: string) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const binary = window.atob(base64PCM);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);

    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;

    activeSourcesRef.current.push(source);
    
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
    };
  }, []);

  const downsampleBuffer = (buffer: Float32Array, inputSampleRate: number, outputSampleRate: number) => {
    if (inputSampleRate === outputSampleRate) return buffer;
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  const floatTo16BitPCM = (input: Float32Array) => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };

  const base64ArrayBuffer = (arrayBuffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Start capturing mic for Gemini WebSocket
  const startGeminiRecording = useCallback(async () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      source.connect(analyser);

      const inputSampleRate = ctx.sampleRate;
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(inputData, inputSampleRate, 16000);
        const pcmBuffer = floatTo16BitPCM(downsampled);
        const base64PCM = base64ArrayBuffer(pcmBuffer);

        wsRef.current.send(JSON.stringify({ audio: base64PCM }));
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      scriptProcessorRef.current = processor;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      micIntervalRef.current = window.setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const level = sum / bufferLength;
        setAudioLevel(Math.min(100, (level / 255) * 100 * 2.5));
      }, 50) as unknown as number;

      setMicActive(true);
      setErrorText(null);
    } catch (err: any) {
      console.error("Microphone access failed:", err);
      setErrorText("Microphone permission denied. Open app in a new tab if sandboxed.");
      addEchoMessage(AgentName.SystemCore, "Microphone access blocked. To establish a voice synapse in this sandboxed preview, please open the application in a new tab.", 'text-amber-400');
    }
  }, [isMuted, addEchoMessage]);

  // Connect Voice Session (WebGPU or Gemini)
  const startSession = useCallback(async () => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    setErrorText(null);

    if (engineMode === 'webgpu') {
      // Local WebGPU Mode
      if (!isModelLoaded) {
        addEchoMessage(AgentName.SystemControl, "WebGPU Brain not loaded yet. Initiating model download...", 'text-yellow-400');
        await loadModel(selectedModel);
      }

      setIsConnected(true);
      setIsConnecting(false);
      addEchoMessage(AgentName.SystemControl, "Local WebGPU Sovereign Voice Link Active. Speak naturally to converse.", 'text-emerald-400');
      
      startLocalSpeechRecognition();

    } else {
      // Gemini Live WebSocket Mode
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const loc = window.location;
      const wsProto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProto}//${loc.host}/api/live-ws?voice=${selectedVoice}&persona=${selectedPersona}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const personaLabel = selectedPersona === 'nevik' ? 'Nevik' : selectedPersona === 'oracle' ? 'Oracle' : 'Scribe';
        addEchoMessage(AgentName.SystemControl, `Connecting to real-time voice synapse (${personaLabel})...`, 'text-cyan-400');

        ws.onopen = () => {
          setIsConnected(true);
          setIsConnecting(false);
          addEchoMessage(AgentName.SystemControl, `Synaptic voice lattice established with ${personaLabel}. Begin speaking.`, 'text-emerald-400');
          startGeminiRecording();
        };

        ws.onmessage = (event) => {
          let msg: any;
          try {
            msg = JSON.parse(event.data);
          } catch (e) { return; }
          
          if (msg.error) {
            setErrorText(msg.error);
            ws.close();
          }

          if (msg.audio) playAudioChunk(msg.audio);
          if (msg.text) setCurrentSpeechText(prev => prev + " " + msg.text);
          if (msg.interrupted) handleInterruption();
        };

        ws.onclose = () => {
          setIsConnected(false);
          setIsConnecting(false);
          cleanUpAudio();
          addEchoMessage(AgentName.SystemControl, `Synaptic voice link severed.`, 'text-amber-400');
        };

        ws.onerror = () => {
          setErrorText("Network WebSocket connection failed.");
          setIsConnecting(false);
        };

      } catch (wsErr: any) {
        setErrorText(wsErr.message || "Synaptic link initialization failed.");
        setIsConnecting(false);
      }
    }
  }, [
    engineMode,
    isModelLoaded,
    selectedModel,
    loadModel,
    startLocalSpeechRecognition,
    selectedVoice,
    selectedPersona,
    isConnecting,
    isConnected,
    addEchoMessage,
    startGeminiRecording,
    playAudioChunk,
    cleanUpAudio,
    handleInterruption
  ]);

  const endSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanUpAudio();
    setIsConnected(false);
    setUserSpeechText('');
  }, [cleanUpAudio]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const getPersonaColor = () => {
    if (engineMode === 'webgpu') return 'text-cyan-300 border-cyan-400/50 shadow-cyan-500/20';
    if (selectedPersona === 'nevik') return 'text-yellow-400 border-yellow-500/30 shadow-yellow-500/10';
    if (selectedPersona === 'oracle') return 'text-violet-400 border-violet-500/30 shadow-violet-500/10';
    return 'text-amber-400 border-amber-500/30 shadow-amber-500/10';
  };

  const getPersonaGlow = () => {
    if (engineMode === 'webgpu') return 'bg-cyan-500/20 shadow-[0_0_50px_20px_rgba(6,182,212,0.25)]';
    if (selectedPersona === 'nevik') return 'bg-yellow-500/20 shadow-[0_0_50px_20px_rgba(234,179,8,0.2)]';
    if (selectedPersona === 'oracle') return 'bg-violet-500/20 shadow-[0_0_50px_20px_rgba(139,92,246,0.2)]';
    return 'bg-amber-500/20 shadow-[0_0_50px_20px_rgba(245,158,11,0.2)]';
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/90 backdrop-blur-md border border-cyan-800/50 rounded-xl p-5 font-mono text-slate-100 shadow-2xl relative overflow-y-auto">
      
      {/* Top Banner & Engine Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cyan-800/30 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs uppercase tracking-wider text-cyan-400 font-bold">NVK OS Real-Time Voice Synapse</span>
          </div>
          <h2 className="text-lg font-bold font-sans tracking-tight text-white mt-0.5">
            {engineMode === 'webgpu' ? 'Offline WebGPU Voice-to-Voice' : 'Direct Neural Cloud Communion'}
          </h2>
        </div>

        {/* Engine Mode Switcher Tabs */}
        <div className="flex bg-slate-900/90 p-1 rounded-lg border border-cyan-800/50">
          <button
            onClick={() => { if (isConnected) endSession(); setEngineMode('webgpu'); }}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              engineMode === 'webgpu' 
                ? 'bg-cyan-500 text-black shadow-md font-extrabold' 
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            <i className="ri-cpu-line mr-1.5" />
            WebGPU Local Brain
          </button>
          <button
            onClick={() => { if (isConnected) endSession(); setEngineMode('gemini'); }}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              engineMode === 'gemini' 
                ? 'bg-fuchsia-500 text-black shadow-md font-extrabold' 
                : 'text-slate-400 hover:text-fuchsia-300'
            }`}
          >
            <i className="ri-cloud-line mr-1.5" />
            Gemini Live Cloud
          </button>
        </div>
      </div>

      {/* WebGPU Model Loader Banner (if WebGPU mode and model not loaded) */}
      {engineMode === 'webgpu' && (
        <div className="mb-4 p-3 bg-slate-900/80 border border-cyan-500/30 rounded-lg">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
            <div className="flex items-center gap-2">
              <i className="ri-download-cloud-line text-cyan-400 text-lg" />
              <div>
                <div className="text-xs font-bold text-cyan-200">Local WebGPU Model Status:</div>
                <div className="text-[11px] text-slate-400">{loadStatus}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isModelLoaded || loadProgress > 0}
                className="bg-slate-950 border border-cyan-800 text-cyan-200 text-xs rounded px-2 py-1 outline-none"
              >
                <option value="gemma-3-1b-it-q4f16_1-MLC">Gemma 3 (1B) - WebGPU [1.5 GB]</option>
                <option value="SmolLM2-135M-Instruct-q0f16-MLC">SmolLM2 (135M) - Fast [300 MB]</option>
                <option value="Qwen2.5-0.5B-Instruct-q0f16-MLC">Qwen 2.5 (0.5B) [500 MB]</option>
                <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama 3.2 (1B) [1.1 GB]</option>
              </select>

              {!isModelLoaded ? (
                <Button
                  onClick={() => loadModel(selectedModel)}
                  disabled={loadProgress > 0 && loadProgress < 100}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1 h-7 font-bold"
                >
                  {loadProgress > 0 && loadProgress < 100 ? `${Math.round(loadProgress)}%` : 'Awaken Brain'}
                </Button>
              ) : (
                <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30 flex items-center gap-1">
                  <i className="ri-checkbox-circle-fill text-emerald-400" /> Loaded in WebGPU
                </span>
              )}

              <Button
                onClick={clearCache}
                variant="outline"
                className="text-[10px] text-amber-400 border-amber-800/50 hover:bg-amber-950/30 px-2 py-1 h-7"
                title="Purge WebGPU Cache if download stalls"
              >
                Purge
              </Button>
            </div>
          </div>

          {/* Download Progress Bar */}
          {loadProgress > 0 && loadProgress < 100 && (
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-cyan-900 mt-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Real-time Voice Modulation Dashboard (WebGPU Mode) */}
      {engineMode === 'webgpu' && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/50 border border-slate-800 p-3 rounded-lg text-xs">
          {/* Pitch Modulation Slider */}
          <div>
            <div className="flex justify-between text-[11px] text-cyan-400 font-bold mb-1">
              <span>Voice Pitch Shift:</span>
              <span className="text-white">{pitch.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.8"
              step="0.05"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
              <span>Deep Titan</span>
              <span>Ethereal</span>
            </div>
          </div>

          {/* Speech Speed Rate Slider */}
          <div>
            <div className="flex justify-between text-[11px] text-cyan-400 font-bold mb-1">
              <span>Speech Rate:</span>
              <span className="text-white">{rate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.8"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
              <span>Calm</span>
              <span>Rapid</span>
            </div>
          </div>

          {/* Audio FX Preset */}
          <div>
            <div className="text-[11px] text-cyan-400 font-bold mb-1">Vocal FX Resonance:</div>
            <select
              value={audioFxPreset}
              onChange={(e) => setAudioFxPreset(e.target.value as any)}
              className="w-full bg-slate-950 border border-cyan-900 text-cyan-200 text-xs rounded px-2 py-1 outline-none"
            >
              <option value="cyber">Cyber Titan (Deep Pitch)</option>
              <option value="oracle">Oracle (Ethereal High)</option>
              <option value="robot">Robotic Resonator</option>
              <option value="natural">Pure Natural Sovereign</option>
            </select>
          </div>

          {/* Browser Voice Selector */}
          <div>
            <div className="text-[11px] text-cyan-400 font-bold mb-1">Local TTS Voice:</div>
            <select
              value={selectedBrowserVoice}
              onChange={(e) => setSelectedBrowserVoice(e.target.value)}
              className="w-full bg-slate-950 border border-cyan-900 text-cyan-200 text-xs rounded px-2 py-1 outline-none truncate"
            >
              {browserVoices.map((v, i) => (
                <option key={i} value={v.name}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Core Display */}
      <div className="flex-grow flex flex-col items-center justify-center p-4 relative z-10">
        
        {/* The Communion Orb */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center rounded-full border border-slate-800 bg-slate-900/40 shadow-inner mb-5">
          
          {/* Static Ring */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/25 animate-spin duration-3000 w-full h-full" />
          
          {/* Glow backdrop based on persona */}
          <div 
            className="absolute rounded-full transition-all duration-500 mb-0"
            style={{
              width: `${70 + (audioLevel * 0.4)}%`,
              height: `${70 + (audioLevel * 0.4)}%`,
              transition: 'width 0.05s, height 0.05s',
            }}
          >
            <div className={`w-full h-full rounded-full blur-xl ${getPersonaGlow()}`} />
          </div>

          {/* Core Pulsing Ball */}
          <motion.div 
            className={`w-16 h-16 rounded-full flex items-center justify-center relative cursor-pointer border backdrop-blur-sm shadow-xl transition-colors duration-500 ${getPersonaColor()}`}
            animate={isConnected ? {
              scale: isMuted ? 1.0 : [1.0, 1.1 + (audioLevel * 0.003), 1.0],
            } : {
              scale: 1.0
            }}
            transition={{
              repeat: Infinity,
              duration: isConnected ? 1.5 : 3.0,
              ease: "easeInOut"
            }}
            onClick={isConnected ? endSession : startSession}
          >
            <i className={`ri-chat-voice-line text-3xl ${isConnected ? 'animate-pulse' : ''}`} />
          </motion.div>

          {/* Orbiting Ring */}
          <div 
            className="absolute inset-2 rounded-full border border-dashed border-cyan-400/40 animate-spin" 
            style={{ animationDuration: '10s' }}
          />

          {/* Live Meter indicators along orbital boundary */}
          <AnimatePresence>
            {isConnected && !isMuted && micActive && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                className="absolute text-cyan-400 text-[10px] bottom-3 tracking-widest font-bold uppercase"
              >
                {engineMode === 'webgpu' ? 'WEBGPU VAD MIC' : 'PCM STREAM LIVE'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Real-time speech caption & Transcript */}
        <div className="w-full max-w-xl text-center min-h-[70px] bg-slate-900/60 border border-slate-800 rounded-lg p-3 backdrop-blur-sm">
          {isConnecting && (
            <div className="flex items-center justify-center gap-2 py-2 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Initializing voice link...</span>
            </div>
          )}
          
          {!isConnected && !isConnecting && (
            <p className="text-slate-400 text-xs py-2">
              Voice Link Offline. Click <span className="text-cyan-400 font-bold">Establish Voice Communion</span> below to speak directly with the AI in real time.
            </p>
          )}

          {isConnected && !isConnecting && !currentSpeechText && !userSpeechText && (
            <p className="text-cyan-400/80 text-xs animate-pulse py-2">
              {engineMode === 'webgpu' 
                ? 'WebGPU Brain listening... Speak into microphone.' 
                : 'Listening via Gemini Live... Speak now.'}
            </p>
          )}

          {/* User Speech Display */}
          {userSpeechText && (
            <div className="text-left mb-2 pb-2 border-b border-slate-800">
              <span className="text-[10px] text-cyan-400 uppercase font-bold inline-block mr-2">You:</span>
              <span className="text-xs text-cyan-100 font-sans">{userSpeechText}</span>
            </div>
          )}

          {/* AI Response Display */}
          {currentSpeechText && (
            <div className="text-left">
              <span className="text-[10px] text-yellow-500 uppercase font-bold inline-block mr-2">Nevik AI Response:</span>
              <p className="text-xs text-yellow-100 font-sans leading-relaxed max-h-[80px] overflow-y-auto">
                {currentSpeechText}
              </p>
            </div>
          )}
        </div>

        {/* WebGPU Tokens/sec indicator */}
        {engineMode === 'webgpu' && isConnected && (
          <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
            <span>WebGPU Hardware Speed: <strong className="text-cyan-300">{tokensPerSec || 0} tokens/sec</strong></span>
            <span>Mode: <strong className="text-emerald-400">Zero Server API / Fully Local</strong></span>
          </div>
        )}

        {errorText && (
          <div className="mt-3 p-2 bg-red-950/40 border border-red-500/30 rounded text-red-300 text-xs">
            {errorText}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3 justify-center items-center mt-3">
        {isConnected ? (
          <>
            <Button 
              onClick={handleToggleMute} 
              variant="outline" 
              className={`border-cyan-800 hover:bg-slate-900/30 ${isMuted ? 'text-red-400 border-red-800' : 'text-cyan-100'}`}
            >
              <i className={`mr-2 ${isMuted ? 'ri-mic-off-line text-red-400' : 'ri-mic-line'}`} />
              {isMuted ? 'Muted' : 'Mute Mic'}
            </Button>
            
            <Button 
              onClick={endSession} 
              className="bg-red-900 hover:bg-red-800 text-white border-red-700/50"
            >
              <i className="ri-close-circle-line mr-2" />
              Disconnect
            </Button>
          </>
        ) : (
          <Button 
            onClick={startSession} 
            disabled={isConnecting}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 h-10 border border-cyan-400/30 font-bold"
          >
            <i className="ri-voiceprint-line mr-2 animate-pulse" />
            Establish Voice Communion
          </Button>
        )}
      </div>

    </div>
  );
}

