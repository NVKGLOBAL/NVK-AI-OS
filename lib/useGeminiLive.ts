import { useState, useRef, useCallback } from 'react';

export function useGeminiLive({ onToolCall }: { onToolCall?: (toolCall: any, sendResponse: (res: any) => void) => void } = {}) {
  const [isActive, setIsActive] = useState(false);
  const [volume, setVolume] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const stopLive = useCallback(() => {
    setIsActive(false);
    setVolume(0);
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const startLive = useCallback(async () => {
    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/live-ws?voice=Zephyr`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputAudioCtx;
      nextStartTimeRef.current = 0;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputAudioCtx;
        
        const source = inputAudioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(inputAudioCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          setVolume(isNaN(rms) ? 0 : rms * 10);

          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
              let s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          const bytes = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          ws.send(JSON.stringify({ audio: base64 }));
        };
      } catch (micErr) {
        console.warn("Microphone access denied or unavailable. Voice input disabled, but AI can still speak.", micErr);
      }

      ws.onopen = () => { ws.send(JSON.stringify({ text: "System is online. Please greet the user warmly as NVK." })); };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.toolCall) {
            if (onToolCall) {
                onToolCall(msg.toolCall, (res) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ toolResponse: res }));
                    }
                });
            }
        }
        if (msg.text) {
            // TTS Fallback if audio is not generated
            if (typeof speechSynthesis !== "undefined") {
               const u = new SpeechSynthesisUtterance(msg.text);
               u.voice = speechSynthesis.getVoices().find(v => v.name.includes("Zephyr") || v.name.includes("Google UK English Male") || v.name.includes("Google US English")) || null;
               speechSynthesis.speak(u);
            }
        }
        if (msg.audio) {
            const binary = atob(msg.audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const pcm16 = new Int16Array(bytes.buffer);
            
            const audioBuffer = outputAudioCtx.createBuffer(1, pcm16.length, 24000);
            const channelData = audioBuffer.getChannelData(0);
            for (let i = 0; i < pcm16.length; i++) {
              channelData[i] = pcm16[i] / 32768.0;
            }

            const sourceNode = outputAudioCtx.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(outputAudioCtx.destination);

            const currentTime = outputAudioCtx.currentTime;
            const startTime = Math.max(nextStartTimeRef.current, currentTime);
            sourceNode.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;
            
            setVolume(0.5); 
            setTimeout(() => setVolume(0), audioBuffer.duration * 1000);
        }
        if (msg.interrupted) {
            nextStartTimeRef.current = 0;
        }
        if (msg.status === 'closed') {
            stopLive();
        }
      };
      
      ws.onerror = (evt: Event) => {
        console.warn("Client WebSocket connection closed or errored.");
        stopLive();
      };

      ws.onclose = () => stopLive();
      
      setIsActive(true);
    } catch (err: any) {
      console.warn("Live API start failure:", err?.message || err);
      stopLive();
    }
  }, [stopLive, onToolCall]);

  const sendText = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text }));
    }
  }, []);

  const toggleLive = useCallback(() => {
    if (isActive) {
      stopLive();
    } else {
      startLive();
    }
  }, [isActive, stopLive, startLive]);

  return {
    isActive,
    volume,
    startLive,
    toggleLive,
    stopLive,
    sendText
  };
}
