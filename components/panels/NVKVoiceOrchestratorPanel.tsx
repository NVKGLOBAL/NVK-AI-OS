import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { AgentName } from '../../types';
import { useEcho } from '../../context/EchoContext';

export default function NVKVoiceOrchestratorPanel() {
  const { addEchoMessage } = useEcho();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr'); // Puck, Charon, Kore, Fenrir, Zephyr
  const [selectedPersona, setSelectedPersona] = useState('nevik'); // nevik, oracle, scribe
  const [transcript, setTranscript] = useState<Array<{ sender: 'user' | 'nevik', text: string, timestamp: number }>>([]);
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Audio elements
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);

  // Visual meter
  const [audioLevel, setAudioLevel] = useState(0);

  const cleanUpAudio = useCallback(() => {
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

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      // Keep it open or suspend it, but clean nodes
    }
    setMicActive(false);
    setAudioLevel(0);
  }, []);

  const handleInterruption = useCallback(() => {
    console.log("Interrupting active audio playback source nodes.");
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (_) {}
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    setCurrentSpeechText('');
  }, []);

  // Play audio chunk continuously
  const playAudioChunk = useCallback((base64PCM: string) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Convert base64 to Int16 PCM array
    const binary = window.atob(base64PCM);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);

    // Convert Int16 PCM to Float32 [-1.0, 1.0]
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    // Gemini Live API returns audio at 24000Hz samplerate
    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    // Schedule seamlessly
    const currentTime = ctx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;

    activeSourcesRef.current.push(source);
    
    // Clean up played sources
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
    };
  }, []);

  // Helper functions for downsampling and conversion
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

  // Start capturing from mic
  const startRecording = useCallback(async () => {
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

      // We need 16000Hz output for Gemini Live API
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

      // Monitor sound levels for UI pulsing
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
      const isDenied = err.name === 'NotAllowedError' || err.message?.toLowerCase().includes("permission") || err.toLowerCase?.().includes("allowed") || String(err).toLowerCase().includes("allowed");
      if (isDenied) {
        setErrorText("Microphone permission denied (sandboxed frame restriction).");
        addEchoMessage(AgentName.SystemCore, "Microphone access blocked. To establish a voice synapse in this sandboxed preview, please open the application in a new tab using the 'Open in new tab' button at the top right of the screen.", 'text-amber-400');
      } else {
        setErrorText("Microphone permission denied or device not found.");
        addEchoMessage(AgentName.SystemCore, `Failed to start micro-lattice input: ${err.message || err}. Check browser settings.`, 'text-red-400');
      }
    }
  }, [isMuted, addEchoMessage]);

  // Connect to backend WebSocket
  const startSession = useCallback(async () => {
    if (isConnecting || isConnected) return;
    setIsConnecting(true);
    setErrorText(null);

    // Initialize AudioContext on user interaction
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
      addEchoMessage(AgentName.SystemControl, `Connecting to real-time voice synapse. Target archetype: ${personaLabel}...`, 'text-cyan-400');

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        addEchoMessage(AgentName.SystemControl, `Synaptic voice lattice established with ${personaLabel}. Begin speaking.`, 'text-emerald-400');
        startRecording();
      };

      ws.onmessage = (event) => {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch (e) {
          console.warn("Syntax error parsing ws.onmessage data:", e);
          return;
        }
        if (msg.error) {
          setErrorText(msg.error);
          ws.close();
        }

        if (msg.audio) {
          playAudioChunk(msg.audio);
        }

        if (msg.text) {
          // Live speaking text chunk
          setCurrentSpeechText(prev => prev + " " + msg.text);
        }

        if (msg.interrupted) {
          handleInterruption();
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        cleanUpAudio();
        addEchoMessage(AgentName.SystemControl, `Synaptic voice link severed.`, 'text-amber-400');
      };

      ws.onerror = (err) => {
        console.error("Lattice WebSocket error:", err);
        setErrorText("Network connection failed.");
        setIsConnecting(false);
      };

    } catch (wsErr: any) {
      console.error("WS error:", wsErr);
      setErrorText(wsErr.message || "Synaptic link initialization failed.");
      setIsConnecting(false);
    }
  }, [selectedVoice, selectedPersona, isConnecting, isConnected, addEchoMessage, startRecording, playAudioChunk, cleanUpAudio, handleInterruption]);

  const endSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanUpAudio();
    setIsConnected(false);
  }, [cleanUpAudio]);

  // Restart session if persona or voice changes while connected
  useEffect(() => {
    if (isConnected) {
      endSession();
      setTimeout(() => {
        startSession();
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersona, selectedVoice]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const getPersonaColor = () => {
    if (selectedPersona === 'nevik') return 'text-yellow-400 border-yellow-500/30 shadow-yellow-500/10';
    if (selectedPersona === 'oracle') return 'text-violet-400 border-violet-500/30 shadow-violet-500/10';
    return 'text-amber-400 border-amber-500/30 shadow-amber-500/10';
  };

  const getPersonaGlow = () => {
    if (selectedPersona === 'nevik') return 'bg-yellow-500/20 shadow-[0_0_50px_20px_rgba(234,179,8,0.2)]';
    if (selectedPersona === 'oracle') return 'bg-violet-500/20 shadow-[0_0_50px_20px_rgba(139,92,246,0.2)]';
    return 'bg-amber-500/20 shadow-[0_0_50px_20px_rgba(245,158,11,0.2)]';
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 backdrop-blur-md border border-cyan-800/50 rounded-xl p-5 font-mono text-slate-100 shadow-2xl relative overflow-hidden">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-cyan-800/30 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs uppercase tracking-wider text-cyan-400 font-bold">NVK OS Voice Synchronizer</span>
          </div>
          <h2 className="text-lg font-bold font-sans tracking-tight text-white mt-1">Direct Neural Communion</h2>
        </div>
        
        {/* Toggle Controls */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-cyan-500/75 uppercase mb-1">Synapse Archetype</span>
            <select 
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              className="bg-slate-900 border border-cyan-800/50 text-cyan-100 rounded px-2 py-1 outline-none"
            >
              <option value="nevik">Nevik / NVK</option>
              <option value="oracle">The Oracle</option>
              <option value="scribe">The Scribe</option>
            </select>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-cyan-500/75 uppercase mb-1">Prebuilt Vocal Cord</span>
            <select 
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="bg-slate-900 border border-cyan-800/50 text-cyan-100 rounded px-2 py-1 outline-none"
            >
              <option value="Zephyr">Zephyr (Male)</option>
              <option value="Fenrir">Fenrir (Deep Male)</option>
              <option value="Charon">Charon (Calm Male)</option>
              <option value="Kore">Kore (Warm Female)</option>
              <option value="Puck">Puck (Fast/Playful)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Core Display */}
      <div className="flex-grow flex flex-col items-center justify-center p-4 relative z-10">
        
        {/* The Communion Orb */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center rounded-full border border-slate-800 bg-slate-900/40 shadow-inner mb-6">
          
          {/* Static Ring */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/25 animate-spin duration-3000 w-full h-full" />
          
          {/* Glow backdrop based on persona */}
          <div 
            className={`absolute rounded-full transition-all duration-500 mb-0`}
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
                className="absolute text-cyan-400 text-[10px] bottom-3 tracking-widest font-bold"
              >
                PCM LIVE
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Real-time speech caption */}
        <div className="w-full max-w-xl text-center min-h-[60px] bg-slate-900/50 border border-slate-800/80 rounded-lg p-3 backdrop-blur-sm">
          {isConnecting && (
            <div className="flex items-center justify-center gap-2 py-2 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Calibrating vocal synapses...</span>
            </div>
          )}
          
          {!isConnected && !isConnecting && (
            <p className="text-slate-400 text-xs py-2">
              Synaptic channel offline. Choose your archetypal guide and select <span className="text-cyan-400">Establish Communion</span> to begin natural voice-to-voice conversation.
            </p>
          )}

          {isConnected && !isConnecting && !currentSpeechText && (
            <p className="text-cyan-400/70 text-xs animate-pulse py-2">
              Listening naturally... Speak now.
            </p>
          )}

          {currentSpeechText && (
            <div className="text-left">
              <span className="text-[10px] text-yellow-500 uppercase font-bold inline-block mr-2">Guide Transcript:</span>
              <p className="text-sm text-yellow-100 font-sans mt-1 leading-relaxed max-h-[80px] overflow-y-auto">
                {currentSpeechText}
              </p>
            </div>
          )}
        </div>

        {errorText && (
          <div className="mt-3 p-2 bg-red-950/40 border border-red-500/30 rounded text-red-300 text-xs">
            {errorText}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3 justify-center items-center mt-4">
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
              Sever Synapse
            </Button>
          </>
        ) : (
          <Button 
            onClick={startSession} 
            disabled={isConnecting}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 h-10 border border-cyan-400/30 font-bold"
          >
            <i className="ri-voiceprint-line mr-2 animate-pulse" />
            Establish Communion
          </Button>
        )}
      </div>

    </div>
  );
}
