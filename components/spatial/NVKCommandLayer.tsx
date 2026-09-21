import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Mic, MicOff, Send, Compass, Layers, Terminal, 
  CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, X, 
  Activity, Globe, FileText, GitMerge, Search, Cpu, RefreshCw, Volume2,
  GripHorizontal, RotateCcw, Calculator
} from 'lucide-react';
import { 
  NVKOrbState, 
  NVKAction, 
  NVKWorkflow, 
  NVKActivityStep 
} from '../../types';
import { nvkActionEngine, ProcessedNVKIntent } from '../../services/nvkActionEngine';
import { nvkRuntime } from '../../src/nvk/runtime/NVKRuntime';
import { nvkEventBus } from '../../src/nvk/events/NVKEventBus';
import { eventBus } from '../../services/EventBus';
import { NVKEvent } from '../../types';
import { useLocalLLM } from '../../context/LocalLLMContext';

interface NVKCommandLayerProps {
  orbState: NVKOrbState;
  onSetOrbState: (state: NVKOrbState) => void;
  onExecuteAction: (intent: ProcessedNVKIntent) => void;
  isVoiceActive?: boolean;
  onToggleVoice?: () => void;
  activeWorkflow?: NVKWorkflow | null;
  activitySteps?: NVKActivityStep[];
  currentStatusText?: string;
}

const SUGGESTED_COMMANDS = [
  { label: 'Show me what you can do', icon: Sparkles },
  { label: 'What is 5+5?', icon: Calculator },
  { label: 'Research NVK Global', icon: Search },
  { label: 'Create a pitch deck', icon: FileText },
  { label: 'Make a chess game', icon: Terminal },
  { label: 'Open Spotify', icon: Layers }
];

export const NVKCommandLayer: React.FC<NVKCommandLayerProps> = ({
  orbState,
  onSetOrbState,
  onExecuteAction,
  isVoiceActive = false,
  onToggleVoice,
  activeWorkflow,
  activitySteps = [],
  currentStatusText = 'Ready for instruction'
}) => {
  const { isModelLoaded, loadModel, loadStatus, generateText } = useLocalLLM();
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nvk_command_layer_pos');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      if (window.innerWidth < 768) {
        return { x: 12, y: 56 };
      }
    }
    // Default to top-left
    return { x: 24, y: 24 };
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 24,
    posY: 24
  });

  const [history, setHistory] = useState<Array<{ role: 'user' | 'nvk'; text: string; actionSummary?: string; buttons?: {label: string, action: string}[] }>>([
    {
      role: 'nvk',
      text: "I'm NVK.\nTell me what you want to accomplish.\n\nTry: \"Build something for me...\""
    }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [liveEvents, setLiveEvents] = useState<{time: string, text: string}[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const formatEvent = (e: NVKEvent) => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
      switch(e.type) {
        case 'ACTION_STARTED': return { time, text: `Processing: ${e.description}` };
        case 'APP_SPAWNED': return { time, text: `Launched ${e.appId}` };
        case 'TASK_STARTED': return { time, text: `Task initiated: ${e.taskId}` };
        case 'TASK_COMPLETED': return { time, text: `Verification complete: ${e.taskId}` };
        case 'TASK_FAILED': return { time, text: `Task failed: ${e.error}` };
        default: return { time, text: e.type };
      }
    };
    const unsub = eventBus.subscribe((e) => {
      setLiveEvents(prev => [...prev, formatEvent(e)]);
    });
    return () => unsub();
  }, []);
  const speechRecognitionRef = useRef<any>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only allow drag from header/handle
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    const newX = Math.max(10, Math.min(window.innerWidth - 320, dragStartRef.current.posX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 100, dragStartRef.current.posY + deltaY));
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        localStorage.setItem('nvk_command_layer_pos', JSON.stringify(position));
      } catch (err) {}
    }
  };

  const handleResetPosition = () => {
    const defaultPos = { x: 24, y: 24 };
    setPosition(defaultPos);
    try {
      localStorage.setItem('nvk_command_layer_pos', JSON.stringify(defaultPos));
    } catch (e) {}
  };

  // Auto focus input on mount for immediate first-turn interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Auto scroll chat history
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [history, activitySteps]);

  // Handle Speech Recognition for voice commands
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          onSetOrbState('LISTENING');
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setInputValue(transcript);
        };

        recognition.onerror = () => {
          setIsListening(false);
          onSetOrbState('IDLE');
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        speechRecognitionRef.current = recognition;
      }
    }
  }, [onSetOrbState]);

  const handleToggleListening = () => {
    if (onToggleVoice) {
      onToggleVoice();
      return;
    }

    if (speechRecognitionRef.current) {
      if (isListening) {
        speechRecognitionRef.current.stop();
        setIsListening(false);
        onSetOrbState('IDLE');
      } else {
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          console.warn("Speech recognition error:", e);
        }
      }
    }
  };

  const handleSendCommand = useCallback(async (textToSend?: string) => {
    const prompt = (textToSend || inputValue).trim();
    if (!prompt) return;

    // Add user message to history
    setHistory(prev => [...prev, { role: 'user', text: prompt }]);
    setInputValue('');

    // Trigger thinking state on NVK Orb
    onSetOrbState('THINKING');

    try {
      const runtimeResponse = await nvkRuntime.execute({
        input: prompt,
        sessionId: 'session-1'
      });

      let spawnAppId: string | undefined = undefined;
      if (runtimeResponse.intent === 'web_research') {
        spawnAppId = 'NexusBrowser';
      } else if (runtimeResponse.intent === 'document_generation') {
        spawnAppId = 'DocumentWorkspace';
      } else if (runtimeResponse.intent === 'tool_execution') {
        spawnAppId = 'NexusTerminal';
      }

      const processed: ProcessedNVKIntent = {
        interpretedAction: {
          id: runtimeResponse.taskId,
          type: runtimeResponse.intent,
          target: spawnAppId || 'System',
          label: runtimeResponse.message,
          status: runtimeResponse.status === 'complete' ? 'completed' : 'failed',
          createdAt: Date.now()
        },
        replyMessage: runtimeResponse.message,
        orbStateSequence: [
          { state: 'THINKING', delayMs: 300, statusText: 'Synthesizing...' },
          { state: 'CALM', delayMs: 1000, statusText: 'Ready.' }
        ],
        spawnAppId
      };

      let responseText = processed.replyMessage;
      if (runtimeResponse.evidence && runtimeResponse.evidence.length > 0) {
        responseText += '\n\nEvidence:\n' + runtimeResponse.evidence.map(e => `• [${e.type}] ${e.reference || JSON.stringify(e)}`).join('\n');
      }

      setHistory(prev => [...prev, { 
        role: 'nvk', 
        text: responseText,
        actionSummary: processed.interpretedAction.label
      }]);

      onSetOrbState('CALM');
      onExecuteAction(processed);

    } catch (err: any) {
      onSetOrbState('CALM');
      setHistory(prev => [...prev, { 
        role: 'nvk', 
        text: `Execution failed: ${err.message || err}` 
      }]);
    }
  }, [inputValue, onSetOrbState, onExecuteAction]);

  const handleConfirmAction = () => {
    if (!pendingConfirmation) return;
    const confirmed = { ...pendingConfirmation, requiresConfirmation: false };
    setPendingConfirmation(null);
    setHistory(prev => [...prev, { 
      role: 'nvk', 
      text: "Operation authorized by operator. Executing requested task." 
    }]);
    onSetOrbState('ACTING');
    onExecuteAction(confirmed);
  };

  const handleCancelAction = () => {
    setPendingConfirmation(null);
    setHistory(prev => [...prev, { 
      role: 'nvk', 
      text: "Operation aborted. No changes made." 
    }]);
    onSetOrbState('CALM');
  };

  const getOrbStateBadge = () => {
    switch (orbState) {
      case 'LISTENING':
        return { label: 'Listening...', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-400', ping: true };
      case 'THINKING':
        return { label: 'Thinking & Planning...', color: 'bg-purple-500/20 text-purple-300 border-purple-400', ping: true };
      case 'ACTING':
        return { label: 'Acting in 3D Space...', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400', ping: true };
      case 'DISCOVERY':
        return { label: 'Synthesizing Result', color: 'bg-amber-500/20 text-amber-300 border-amber-400', ping: false };
      case 'ERROR':
        return { label: 'Action Required', color: 'bg-rose-500/20 text-rose-300 border-rose-400', ping: false };
      default:
        return { label: 'NVK Online', color: 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30', ping: false };
    }
  };

  const badge = getOrbStateBadge();

  return (
    <div 
      className="fixed z-[1000] w-[92vw] sm:w-[480px] max-w-[94vw] font-mono pointer-events-none transition-shadow"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="pointer-events-auto bg-slate-950/92 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-3.5 shadow-[0_0_50px_rgba(0,229,255,0.25)] flex flex-col gap-2.5 relative overflow-hidden"
      >
        {/* Subtle Cyber Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

        {/* Top Header Bar / Drag Handle */}
        <div 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex items-center justify-between cursor-move select-none active:cursor-grabbing pb-1 border-b border-cyan-500/20"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-3.5 h-3.5 text-cyan-400/70 hover:text-cyan-300" />
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.8)] animate-pulse" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-bold tracking-wider text-slate-100 uppercase">NVK</span>
              <span className="text-[9px] text-cyan-400/80 hidden sm:inline">Living Intelligence</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
            <div className={`px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-semibold border flex items-center gap-1 transition-all ${badge.color}`}>
              {badge.ping && <span className="w-1 h-1 rounded-full bg-current animate-ping" />}
              <span>{badge.label}</span>
            </div>
            
            <button 
              onClick={handleResetPosition}
              className="w-5 h-5 rounded bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 flex items-center justify-center text-[10px] transition-all"
              title="Reset to Top-Left"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>

            <button 
              onClick={() => setIsMinimized(v => !v)}
              className="w-5 h-5 rounded bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 flex items-center justify-center text-xs transition-all font-bold"
              title={isMinimized ? "Expand Console" : "Collapse Console"}
            >
              {isMinimized ? '+' : '−'}
            </button>
          </div>
        </div>

        {/* Core Status Indicator */}
        <div className="flex items-center justify-between px-1 border-b border-cyan-500/10 pb-1.5 mb-1 select-none">
          <div className="text-[9px] uppercase font-mono font-bold tracking-widest flex items-center gap-2">
            <span className="text-slate-500">Logic Core:</span>
            {isModelLoaded ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(52,211,153,0.8)]" /> ML Brain Active
              </span>
            ) : (
              <span className="text-amber-500/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-500/50 rounded-full" /> Heuristic
              </span>
            )}
          </div>
          {!isModelLoaded && (
            <button 
              onClick={() => loadModel()} 
              className="text-[8px] bg-slate-900 hover:bg-slate-800 text-cyan-400 px-2 py-0.5 rounded border border-slate-700/50 hover:border-cyan-500/50 transition-colors uppercase font-bold"
            >
              {loadStatus === 'Ready' || loadStatus === '' ? 'Initialize Advanced ML Brain' : loadStatus}
            </button>
          )}
        </div>

        {/* Expandable Body */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {/* Chat & Activity Stream */}
              <div 
                ref={scrollContainerRef}
                className="max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs"
              >
                {history.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'nvk' && (
                      <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 text-[10px] shrink-0 mt-0.5">
                        ◈
                      </div>
                    )}
                    <div 
                      className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 font-mono text-[11px]' 
                          : 'bg-slate-900/80 border border-slate-800 text-slate-200 font-sans text-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      {msg.actionSummary && (
                        <div className="mt-1.5 pt-1.5 border-t border-cyan-500/20 text-[9px] font-mono text-cyan-300 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-cyan-400" /> Action: {msg.actionSummary}
                        </div>
                      )}
                      {msg.buttons && msg.buttons.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {msg.buttons.map((btn, bIdx) => (
                            <button 
                              key={bIdx}
                              onClick={() => handleSendCommand(btn.action)}
                              className="text-xs font-bold font-mono text-cyan-900 bg-cyan-400 hover:bg-cyan-300 px-3 py-1.5 rounded flex items-center justify-between transition-colors"
                            >
                              <span>{btn.label}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Realtime Activity Steps Layer (NVK Showing Its Work) */}
                {activitySteps.length > 0 && (
                  <div className="p-2 bg-slate-900/60 border border-cyan-500/30 rounded-xl space-y-1 my-1">
                    <div className="text-[9px] uppercase tracking-widest text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-cyan-400 animate-spin" /> NVK Activity Stream
                    </div>
                    {activitySteps.map((step) => (
                      <div key={step.id} className="flex items-center gap-2 text-[10px] text-slate-300">
                        {step.status === 'completed' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : step.status === 'running' ? (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                        )}
                        <span className={step.status === 'running' ? 'text-cyan-300 font-semibold' : ''}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Consequential Action / Permission Modal Card */}
              {pendingConfirmation && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 bg-amber-950/40 border border-amber-500/60 rounded-xl text-amber-200 text-xs flex flex-col gap-2.5"
                >
                  <div className="flex items-center gap-2 font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    {pendingConfirmation.confirmationDetails?.title || 'Permission Confirmation'}
                  </div>
                  <div className="text-[11px] font-sans text-amber-100/90 leading-relaxed">
                    {pendingConfirmation.confirmationDetails?.description}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                    <button
                      onClick={handleCancelAction}
                      className="px-3 py-1 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded text-[10px] uppercase font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmAction}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-[10px] uppercase font-bold shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    >
                      Confirm & Execute
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Clickable Suggested Commands */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar select-none">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 shrink-0 font-semibold">
                  Try asking:
                </span>
                {SUGGESTED_COMMANDS.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendCommand(cmd.label)}
                      className="px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500/50 text-[10px] text-slate-300 hover:text-cyan-300 whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
                    >
                      <Icon className="w-3 h-3 text-cyan-400/80" />
                      <span>{cmd.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar & Voice Controls */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendCommand();
          }}
          className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 rounded-xl p-1.5 focus-within:border-cyan-400 focus-within:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask NVK anything... (e.g. 'Research commercial solar in Texas', 'Create pitch deck')"
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
          />

          <button
            type="button"
            onClick={handleToggleListening}
            className={`p-2 rounded-lg transition-all flex items-center justify-center ${
              isListening || isVoiceActive
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,229,255,0.8)] animate-pulse'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-700'
            }`}
            title={isListening || isVoiceActive ? "Listening (Click to stop)" : "Voice Command"}
          >
            {isListening || isVoiceActive ? <Mic className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)] active:scale-95"
          >
            <span>Send</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
