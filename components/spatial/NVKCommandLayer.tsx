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
import type { ProcessedNVKIntent } from '../../types';
import { nvkRuntime, type NVKPlanStep } from '../../src/nvk/runtime/NVKRuntime';
import { nvkEventBus } from '../../src/nvk/events/NVKEventBus';
import { eventBus } from '../../services/EventBus';
import { NVKEvent } from '../../types';
import { useLocalLLM } from '../../context/LocalLLMContext';
import { synthesizeShard, SHARD_VARIANTS } from '../../services/shardEngine';
import type { ShardSpec, ShardVariant } from '../../services/shardEngine';
import { ShardRenderer } from '../ui/ShardRenderer';
import { useIsMobile } from '../../lib/useIsMobile';
import { dispatchPanelCommand } from '../../services/OsPanelCommandDispatcher';
import { resolveTerminalOrbState } from '../../lib/orbStateMapping';

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

// A1 follow-up (2026-11-22): a pending confirmation is a real plan the
// user was asked to approve — the prompt, the steps that require
// confirmation, and the details the confirm UI renders (action, target,
// consequence — never a generic "Permission Confirmation").
interface PendingConfirmation {
  prompt: string;
  steps: NVKPlanStep[];
  confirmationDetails: { title: string; description: string };
}

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
  const { isModelLoaded, loadModel, loadStatus, generateText, isCloudMode } = useLocalLLM();
  // S5 (2026-11-22): shared mobile breakpoint. On mobile the layer docks
  // to the bottom as a bottom sheet (see the outer div); on desktop it
  // stays a draggable floating panel at the persisted position.
  const isMobile = useIsMobile();
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

  const [history, setHistory] = useState<Array<{ role: 'user' | 'nvk'; text: string; actionSummary?: string; buttons?: {label: string, action: string}[]; shard?: ShardSpec }>>([
    {
      role: 'nvk',
      text: "I'm NVK.\nTell me what you want to accomplish.\n\nTry: \"Build something for me...\""
    }
  ]);
  const [isListening, setIsListening] = useState(false);
  const [liveEvents, setLiveEvents] = useState<{time: string, text: string}[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  // Shard synthesis (defect 8): real entry point for the shard engine.
  const [shardVariant, setShardVariant] = useState<ShardVariant>('text-block');
  const [isSynthesizingShard, setIsSynthesizingShard] = useState(false);
  const [sharedShard, setSharedShard] = useState<{ index: number; url: string } | null>(null);
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
    // S5: no floating position to drag on mobile — the layer is docked.
    if (isMobile) return;
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

  // A1 follow-up (2026-11-22): the single execution path. `context` is
  // the confirmation the user actually gave for this run — absent/false
  // means unconfirmed, and the engine blocks any capability that requires
  // confirmation. The caller (send vs. confirm) decides the context;
  // this function never invents one.
  const executeAndRender = useCallback(async (prompt: string, context: { confirmedByUser: boolean; confirmedAt?: number }) => {
    try {
      const runtimeResponse = await nvkRuntime.execute({
        input: prompt,
        sessionId: 'session-1',
        context
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

      // Slice 3 (A3 fix): the orb shows the REAL terminal state of the
      // run — COMPLETE on success, ERROR on failure. The old code set
      // CALM here unconditionally, which overwrote the runtime's ERROR
      // (last-write-wins) so a failed command showed the same calm orb
      // as a successful one. The runtime also publishes COMPLETED/FAILED
      // and App maps them the same way; both writers now agree.
      onSetOrbState(resolveTerminalOrbState(processed.interpretedAction.status === 'failed' ? 'failed' : 'complete'));
      onExecuteAction(processed);

    } catch (err: any) {
      // Slice 3 (A3 fix): an exception in the run itself is a failure,
      // not a calm — the orb shows ERROR until the next command.
      onSetOrbState('ERROR');
      setHistory(prev => [...prev, { 
        role: 'nvk', 
        text: `Execution failed: ${err.message || err}` 
      }]);
    }
  }, [onSetOrbState, onExecuteAction]);

  const handleSendCommand = useCallback(async (textToSend?: string) => {
    const prompt = (textToSend || inputValue).trim();
    if (!prompt) return;

    // A pending confirmation belongs to an earlier prompt — a new send
    // supersedes it. The earlier plan is abandoned, never executed, and
    // no grant or denial is recorded for it (the user neither granted
    // nor denied; they moved on).
    if (pendingConfirmation) setPendingConfirmation(null);

    // The user's utterance goes into history and the input clears for
    // every send — panel commands included — so the chat shows what was
    // asked and what NVK did about it.
    setHistory(prev => [...prev, { role: 'user', text: prompt }]);
    setInputValue('');

    // Slice 3: panel commands run through the bus FIRST, before the
    // runtime preview — the same function serves typed chat and voice
    // transcripts (the mic writes its transcript into this input). A
    // handled command's confirmation is the reply; the runtime is never
    // consulted for it. An unrecognized utterance falls through to the
    // runtime as before.
    const panelResult = dispatchPanelCommand(prompt);
    if (panelResult.handled) {
      setHistory(prev => [...prev, {
        role: 'nvk',
        text: panelResult.ok
          ? (panelResult.confirmation ?? 'Done.')
          : (panelResult.reason ?? 'That panel command could not run.')
      }]);
      // A panel command is a real action with a real outcome: success
      // shows COMPLETE, a refused command shows ERROR (never CALM).
      onSetOrbState(panelResult.ok ? 'COMPLETE' : 'ERROR');
      return;
    }

    // Trigger thinking state on NVK Orb
    onSetOrbState('THINKING');

    try {
      // A1: preview first — build the plan WITHOUT executing anything.
      // If any planned step both requires confirmation AND can actually
      // run, stop here and ask the user. Nothing executes until they
      // grant. Steps that require confirmation but are unavailable are
      // not gated here — the engine reports them unavailable instead.
      const preview = nvkRuntime.preview(prompt);
      if (preview.needsInput) {
        // Slice 3: needs-input means waiting on the user, not calm —
        // and the runtime publishes IDLE for the same case, so both
        // writers agree.
        onSetOrbState('IDLE');
        setHistory(prev => [...prev, { role: 'nvk', text: preview.needsInput! }]);
        return;
      }
      const confirmSteps = preview.steps.filter(s => s.requiresConfirmation && s.available);
      if (confirmSteps.length > 0) {
        const names = confirmSteps.map(s => s.name).join(', ');
        const details = confirmSteps.map(s =>
          `${s.name} (${s.capabilityId}) — ${s.description || 'No description.'} Objective: ${s.objective}.`
        ).join('\n');
        setPendingConfirmation({
          prompt,
          steps: confirmSteps,
          confirmationDetails: {
            title: `Confirm: ${names}`,
            description: `${details}\n\nThis action requires your explicit approval. Confirming runs it now; denying leaves nothing changed.`
          }
        });
        // Slice 3: a pending confirmation blocks on the user — the orb
        // shows WAITING until they confirm (ACTING) or cancel (IDLE).
        onSetOrbState('WAITING');
        return;
      }
      await executeAndRender(prompt, { confirmedByUser: false });
    } catch (err: any) {
      onSetOrbState('ERROR');
      setHistory(prev => [...prev, {
        role: 'nvk',
        text: `Execution failed: ${err.message || err}`
      }]);
    }
  }, [inputValue, onSetOrbState, executeAndRender, pendingConfirmation]);

  const handleConfirmAction = useCallback(async () => {
    if (!pendingConfirmation) return;
    const { prompt } = pendingConfirmation;
    setPendingConfirmation(null);
    setHistory(prev => [...prev, { 
      role: 'nvk', 
      text: "Operation authorized by operator. Executing requested task." 
    }]);
    onSetOrbState('ACTING');
    // A1: the grant is real — the user just tapped Confirm. The grant
    // timestamp is threaded so the ledger records hitl_confirmed with
    // when it actually happened, not when the run finished.
    await executeAndRender(prompt, { confirmedByUser: true, confirmedAt: Date.now() });
  }, [pendingConfirmation, executeAndRender, onSetOrbState]);

  // Shard synthesis (defect 8): synthesizes a shard from the current input
  // (or the last user message) via the LOCAL model. A null result means no
  // model is loaded or the model's JSON failed validation — reported
  // honestly, never replaced with placeholder content.
  const handleSynthesizeShard = useCallback(async () => {
    const intent = inputValue.trim() || [...history].reverse().find(m => m.role === 'user')?.text || '';
    if (!intent) {
      setHistory(prev => [...prev, { role: 'nvk', text: 'Type something first, then synthesize a shard from it.' }]);
      return;
    }
    setIsSynthesizingShard(true);
    try {
      const shard = await synthesizeShard(intent, generateText, shardVariant);
      if (shard) {
        setHistory(prev => [...prev, { role: 'nvk', text: `Shard synthesized: ${shard.title}`, shard }]);
      } else {
        setHistory(prev => [...prev, { role: 'nvk', text: 'Shard synthesis unavailable — load a local model first, or the model returned invalid output.' }]);
      }
    } finally {
      setIsSynthesizingShard(false);
    }
  }, [inputValue, history, generateText, shardVariant]);

  // Share a synthesized shard via the real /api/share/shard endpoint and
  // show the real same-origin URL it returns. Nothing is fabricated.
  const handleShareShard = useCallback(async (index: number, shard: ShardSpec) => {
    try {
      const res = await fetch('/api/share/shard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shard })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Share failed (${res.status})`);
      setSharedShard({ index, url: data.url });
    } catch (err: any) {
      setHistory(prev => [...prev, { role: 'nvk', text: `Sharing the shard failed: ${err.message || String(err)}` }]);
    }
  }, []);

  const handleCancelAction = useCallback(async () => {
    if (!pendingConfirmation) return;
    const pending = pendingConfirmation;
    setPendingConfirmation(null);
    try {
      // A1: a denial is a real audit event — record it as hitl_rejected
      // so the ledger shows the user was asked and said no. Nothing
      // executes on this path.
      const entries = await nvkRuntime.recordDenial(pending.steps, pending.prompt);
      setHistory(prev => [...prev, {
        role: 'nvk',
        text: `Operation aborted. No changes made. Denial recorded in the ledger as hitl_rejected (${entries.map(e => e.id).join(', ')}).`
      }]);
    } catch (err: any) {
      // The denial itself could not be recorded — say so plainly rather
      // than claiming a record that does not exist.
      setHistory(prev => [...prev, {
        role: 'nvk',
        text: `Operation aborted. No changes made. Warning: the denial could not be recorded in the ledger (${err.message || err}).`
      }]);
    }
    // Slice 3: a cancelled confirmation returns to idle — the user
    // aborted, nothing failed, and the orb is not calm, it is idle.
    onSetOrbState('IDLE');
  }, [pendingConfirmation, onSetOrbState]);

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
      case 'WAITING':
        return { label: 'Waiting for you…', color: 'bg-amber-500/20 text-amber-300 border-amber-400', ping: true };
      case 'COMPLETE':
        return { label: 'Done', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400', ping: false };
      default:
        return { label: 'NVK Online', color: 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30', ping: false };
    }
  };

  const badge = getOrbStateBadge();

  return (
    <div
      // S5 (2026-11-22): on mobile the CommandLayer is a bottom sheet —
      // full-width minus small margins, anchored above the dock (the Dock
      // footer sits at bottom-12, so 128px clears it) — instead of floating
      // top-left over the orb. Desktop keeps the draggable persisted
      // top-left position exactly as before.
      className={`fixed z-[1000] font-mono pointer-events-none transition-shadow ${isMobile ? 'left-2 right-2' : 'w-[92vw] sm:w-[480px] max-w-[94vw]'}`}
      style={isMobile ? { bottom: '128px' } : {
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
          className={`flex items-center justify-between select-none pb-1 border-b border-cyan-500/20 ${isMobile ? 'cursor-default' : 'cursor-move active:cursor-grabbing'}`}
        >
          <div className="flex items-center gap-2">
            {!isMobile && <GripHorizontal className="w-3.5 h-3.5 text-cyan-400/70 hover:text-cyan-300" />}
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
                      {msg.shard && (
                        <ShardRenderer
                          shard={msg.shard}
                          isGenerating={false}
                          variant={msg.shard.variant}
                          onShare={() => handleShareShard(idx, msg.shard!)}
                          shareUrl={sharedShard?.index === idx ? sharedShard.url : null}
                        />
                      )}
                    </div>
                  </div>
                ))}

                {/* Shard synthesis in progress (defect 8) */}
                {isSynthesizingShard && (
                  <ShardRenderer shard={null} isGenerating={true} variant={shardVariant} />
                )}

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
                        ) : step.status === 'failed' ? (
                          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                        )}
                        <span className={step.status === 'running' ? 'text-cyan-300 font-semibold' : step.status === 'failed' ? 'text-red-300' : ''}>
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

        {/* Shard synthesis controls (defect 8) */}
        <div className="flex items-center gap-2">
          <select
            value={shardVariant}
            onChange={(e) => setShardVariant(e.target.value as ShardVariant)}
            className="bg-slate-900/90 border border-cyan-500/30 rounded-lg text-[11px] text-slate-200 px-2 py-1.5 focus:outline-none"
            title="Shard format"
          >
            {SHARD_VARIANTS.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSynthesizeShard}
            disabled={isSynthesizingShard}
            title="Synthesize a shard from the current input using the local model"
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 disabled:opacity-40 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all"
          >
            {isSynthesizingShard ? 'Synthesizing…' : 'Synthesize shard'}
          </button>
          {!isModelLoaded && !isCloudMode && (
            <span className="text-[10px] text-slate-500">Load a local model to synthesize shards.</span>
          )}
        </div>

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
