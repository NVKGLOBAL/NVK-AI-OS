import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Mic, MicOff, Send, Compass, Layers, Terminal, 
  CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, X, 
  Activity, Globe, FileText, GitMerge, Search, Cpu, RefreshCw, Volume2,
  GripHorizontal, RotateCcw, Calculator, ChevronUp
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
import { answerCatalogQuestion } from '../../lib/catalogLookup';
import { NVK_PRODUCT_FACTS } from '../../lib/nvkProductFacts';
import { liveEventText, runtimeEventText } from '../../services/liveFeedFormat';
import { latestLiveEventLine, shouldAutofocusInput } from '../../lib/mobileWorkspace';
import { tryAnswerMath, isSearchQuestion, answerSearchQuestion, needsNoModelReply, NO_MODEL_REPLY, GATEWAY_OFFLINE_REPLY } from '../../services/osNoModelAnswers';
import { intentEngine } from '../../src/nvk/intent/IntentEngine';

interface NVKCommandLayerProps {
  orbState: NVKOrbState;
  onSetOrbState: (state: NVKOrbState) => void;
  onExecuteAction: (intent: ProcessedNVKIntent) => void;
  isVoiceActive?: boolean;
  onToggleVoice?: () => void;
  activeWorkflow?: NVKWorkflow | null;
  activitySteps?: NVKActivityStep[];
  currentStatusText?: string;
  /** Round-3 (2026-11-27): the effective workspace mode — in Desk
      (grid/2d) mode on desktop the console docks at the bottom instead
      of floating top-left over the grid's first tile. */
  workspaceMode?: string;
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
  currentStatusText = 'Ready for instruction',
  workspaceMode = 'immersive'
}) => {
  const { isModelLoaded, loadModel, loadStatus, generateText, isCloudMode, freeCloudEnabled } = useLocalLLM();
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
    // Fix round (2026-11-27): the feed subscribes to BOTH buses. The
    // services/EventBus subscription was already here — but nothing ever
    // published to that bus, so the feed was dead. The chat paths now
    // publish to it (see handleSendCommand / askBrain / executeAndRender).
    // The runtime's nvkEventBus is the bus IntentEngine, Planner, and
    // CapabilityRegistry already publish to (intent.detected,
    // plan.created, artifact.created) — the feed never listened to it
    // until now. Both subscriptions use the same imported singletons the
    // publishers use, so an event published anywhere in this app reaches
    // the feed.
    const formatEvent = (e: NVKEvent) => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
      return { time, text: liveEventText(e) };
    };
    const pushRuntime = (text: string) => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
      // Cap the feed: the console shows the last few, storage never grows
      // unbounded on a long session.
      setLiveEvents(prev => [...prev.slice(-49), { time, text }]);
    };
    const unsub = eventBus.subscribe((e) => {
      // Cap the feed: the console shows the last few, storage never grows
      // unbounded on a long session.
      setLiveEvents(prev => [...prev.slice(-49), formatEvent(e)]);
    });
    const unsubRuntime = nvkEventBus.subscribe((e) => {
      const text = runtimeEventText(e);
      if (text !== null) pushRuntime(text);
    });
    return () => { unsub(); unsubRuntime(); };
  }, []);
  const speechRecognitionRef = useRef<any>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // S5: no floating position to drag on mobile — the layer is docked.
    // Round-3: Desk mode docks it too.
    if (isMobile || isDeskMode) return;
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

  // Auto focus input on mount for immediate first-turn interaction.
  // Mobile-first redesign (2026-11-27): NO autofocus on touch — the
  // current focus() on mount pops the iOS keyboard on load and shrinks
  // the viewport. Autofocus only on non-touch.
  useEffect(() => {
    const isCoarsePointer = typeof window !== 'undefined'
      && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
    if (!shouldAutofocusInput(isCoarsePointer)) return;
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

  // Ret12 fix: at narrow widths the console starts minimized, which hid
  // every NVK reply — the retest saw "silence" for answers that existed
  // in the hidden history. When a new NVK reply lands while minimized,
  // expand so the answer is visible. Re-minimizing is respected until
  // the next reply.
  // Round-2 phone fix (2026-11-27): the old check fired on mount — the
  // seed greeting IS an nvk message — so the console auto-expanded on
  // fresh load and covered the orb; and it re-expanded on every collapse
  // (Focus NVK, the "−" button) because history[last] stayed 'nvk'.
  // Only a NEW nvk message — history growing after mount — expands.
  const historyLenRef = useRef(history.length);
  useEffect(() => {
    const grew = history.length > historyLenRef.current;
    historyLenRef.current = history.length;
    if (grew && isMinimized && history.length > 0 && history[history.length - 1].role === 'nvk') {
      setIsMinimized(false);
    }
  }, [history, isMinimized]);

  // Phone fix (2026-11-27): Focus NVK / Reset Viewport in the 3D HUD
  // collapse the console on phones so the orb they reveal is actually
  // visible — the expanded sheet covers it at z-1095. Desktop
  // unaffected: the console is a draggable panel there and must not
  // collapse on focus. Only the HUD dispatches this event (mobile-gated
  // at the source); the isMobile guard here is belt-and-braces.
  useEffect(() => {
    const collapse = () => { if (isMobile) setIsMinimized(true); };
    window.addEventListener('nvk-collapse-console', collapse);
    return () => window.removeEventListener('nvk-collapse-console', collapse);
  }, [isMobile]);

  // Round-3 (2026-11-27): in Desk (grid/2d) mode on desktop the console
  // docks at the bottom instead of floating top-left over the grid's
  // first tile (it covered the System Monitor panel's heading). Docked
  // means minimized by default — the bar, not the sheet — and not
  // draggable; the persisted floating position is kept for the 3D modes.
  const isDeskMode = !isMobile && (workspaceMode === 'grid' || workspaceMode === '2d');
  useEffect(() => {
    if (isDeskMode) setIsMinimized(true);
  }, [isDeskMode]);

  // Round-3 (2026-11-27): broadcast the expanded state so the 3D HUD
  // can hide while the console is expanded on phones (same window-event
  // pattern as 'nvk-collapse-console'). The window property covers
  // mount order — the orb stage reads it for its initial state.
  useEffect(() => {
    const expanded = isMobile && !isMinimized;
    (window as any).__nvkConsoleExpanded = expanded;
    window.dispatchEvent(new CustomEvent('nvk-console-state', { detail: { expanded } }));
  }, [isMobile, isMinimized]);

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

      // Fix round (2026-11-27): a completed run is a real feed event.
      eventBus.publish(processed.interpretedAction.status === 'failed'
        ? { type: 'ACTION_FAILED', actionId: processed.interpretedAction.label.slice(0, 80), error: responseText.slice(0, 120) }
        : { type: 'ACTION_COMPLETED', actionId: processed.interpretedAction.label.slice(0, 80) });

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
      eventBus.publish({ type: 'ACTION_FAILED', actionId: 'Command execution', error: err.message || String(err) });
      onSetOrbState('ERROR');
      setHistory(prev => [...prev, { 
        role: 'nvk', 
        text: `Execution failed: ${err.message || err}` 
      }]);
    }
  }, [onSetOrbState, onExecuteAction]);

  // 2026-11-26 follow-up: the single brain call shared by the no-model
  // branch and the no-tool-matched branch. Passes the conversation so far
  // (role 'nvk' maps to 'assistant') so the brain answers in context, not
  // on one line alone. Returns the answer text, or null when the brain
  // could not answer (gateway 429/offline, or no model loaded) — the
  // caller renders the honest offline message, never a fabricated answer.
  // Precedence (local model / key / gateway) lives in generateText.
  const askBrain = useCallback(async (prompt: string): Promise<string | null> => {
    const gatewayHistory = history
      .filter((m) => m.text && m.text.trim())
      .map((m) => ({ role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.text }));
    // Fix round (2026-11-27): product facts reach EVERY engine — the
    // gateway call carried none, so product questions got "I don't have
    // verified details". The deterministic lookup (handleSendCommand)
    // answers catalog questions with no model call at all; the facts
    // block covers everything the lookup does not.
    // The brain's work is also a real feed event: question asked →
    // answer delivered, with timestamps (Defect 2).
    const short = prompt.length > 60 ? `${prompt.slice(0, 57)}…` : prompt;
    eventBus.publish({ type: 'ACTION_STARTED', actionId: 'chat', description: `Answering: "${short}"` });
    const text = await generateText(
      prompt,
      `You are NVK, the central intelligence of the NVK OS. Answer helpfully and concisely.\n\n${NVK_PRODUCT_FACTS}`,
      0.7,
      500,
      gatewayHistory,
    );
    if (text) {
      eventBus.publish({ type: 'ACTION_COMPLETED', actionId: 'Answered question' });
    } else {
      eventBus.publish({ type: 'ACTION_FAILED', actionId: 'Answering question', error: 'no answer — gateway offline or no model loaded' });
    }
    return text;
  }, [generateText, history]);

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
      // It is also a real feed event (Defect 2).
      eventBus.publish(panelResult.ok
        ? { type: 'ACTION_COMPLETED', actionId: 'Panel command done' }
        : { type: 'ACTION_FAILED', actionId: 'Panel command', error: panelResult.reason ?? 'That panel command could not run.' });
      onSetOrbState(panelResult.ok ? 'COMPLETE' : 'ERROR');
      return;
    }

    // Fix round (2026-11-27): deterministic catalog lookup — ported
    // from CODEXA (option D). A product price/identity question is
    // answered from the catalog with NO model call, so it cannot
    // hallucinate a price. Runs right after panel commands, before
    // search/math/brain — same precedence as CODEXA.
    const catalog = answerCatalogQuestion(prompt);
    if (catalog.handled) {
      setHistory(prev => [...prev, { role: 'nvk', text: catalog.reply ?? 'Done.' }]);
      eventBus.publish({ type: 'ACTION_COMPLETED', actionId: 'Answered product question' });
      onSetOrbState('COMPLETE');
      return;
    }

    // Ret12 fix: deterministic answers that need no model — search first
    // (real results or an honest unavailable message), then math (a real
    // calculation, never a fabricated number). Both run before the runtime,
    // which cannot answer either without a model on this deploy.
    if (isSearchQuestion(prompt)) {
      const search = await answerSearchQuestion(prompt);
      setHistory(prev => [...prev, { role: 'nvk', text: search.reply }]);
      eventBus.publish(search.results > 0
        ? { type: 'ACTION_COMPLETED', actionId: 'Answered web search' }
        : { type: 'ACTION_FAILED', actionId: 'Web search', error: 'no results' });
      onSetOrbState(search.results > 0 ? 'COMPLETE' : 'ERROR');
      return;
    }
    const mathReply = tryAnswerMath(prompt);
    if (mathReply !== null) {
      setHistory(prev => [...prev, { role: 'nvk', text: mathReply }]);
      eventBus.publish({ type: 'ACTION_COMPLETED', actionId: 'Calculated answer' });
      onSetOrbState('COMPLETE');
      return;
    }

    // Ret12 fix: with no model loaded, a general question has no honest
    // runtime answer (the planner routes it to web.search, which cannot
    // run on the static deploy). 2026-11-26 fix: the free cloud gateway
    // answers it instead — generateText routes a no-model call to the
    // gateway when freeCloudEnabled is on (the default), so the chat works
    // on a fresh phone with nothing downloaded. Only when the gateway is
    // off does the honest no-model reply still apply. A gateway failure
    // (generateText returns null) renders the honest offline message —
    // never a fabricated answer, never a dead input.
    if (needsNoModelReply(intentEngine.classify(prompt).intent, isModelLoaded)) {
      if (freeCloudEnabled) {
        onSetOrbState('THINKING');
        const answer = await askBrain(prompt);
        if (answer) {
          setHistory(prev => [...prev, { role: 'nvk', text: answer }]);
          onSetOrbState('COMPLETE');
        } else {
          setHistory(prev => [...prev, { role: 'nvk', text: GATEWAY_OFFLINE_REPLY }]);
          onSetOrbState('ERROR');
        }
        return;
      }
      setHistory(prev => [...prev, { role: 'nvk', text: NO_MODEL_REPLY }]);
      onSetOrbState('IDLE');
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
        // 2026-11-26 follow-up: an empty plan means no tool matches — but
        // a free-text request (write, answer, summarize, create) is
        // general chat, not a missing tool. With the gateway on, the brain
        // answers it instead of the canned decline. Only when the gateway
        // is off does the canned decline still apply. A brain failure
        // renders the honest offline message when no model is loaded —
        // never a fabricated answer, never the canned decline.
        if (preview.noToolMatched && freeCloudEnabled) {
          onSetOrbState('THINKING');
          const answer = await askBrain(prompt);
          if (answer) {
            setHistory(prev => [...prev, { role: 'nvk', text: answer }]);
            onSetOrbState('COMPLETE');
          } else if (!isModelLoaded) {
            setHistory(prev => [...prev, { role: 'nvk', text: GATEWAY_OFFLINE_REPLY }]);
            onSetOrbState('ERROR');
          } else {
            setHistory(prev => [...prev, { role: 'nvk', text: preview.needsInput! }]);
            onSetOrbState('IDLE');
          }
          return;
        }
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
  }, [inputValue, onSetOrbState, executeAndRender, pendingConfirmation, isModelLoaded, generateText, freeCloudEnabled, history, askBrain]);

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
      // Slice 4 (memory): pass the bounded conversation history so the
      // shard is synthesized with the conversation in view. The command
      // layer's history uses role 'nvk' for the assistant; map it to
      // 'assistant' for the model.
      const shardHistory = history
        .filter((m) => m.text && m.text.trim())
        .map((m) => ({ role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.text }));
      const shard = await synthesizeShard(intent, generateText, shardVariant, shardHistory);
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
    // The abort itself is a real feed event (Defect 2).
    eventBus.publish({ type: 'ACTION_COMPLETED', actionId: 'Operation aborted by user' });
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
      // full-width minus small margins, anchored just above the safe-area
      // inset. Mobile-first redesign (2026-11-27): the dock is gone on
      // phones, so the 128px dock clearance is gone too — the bar floats
      // at 8px + safe-area. Desktop keeps the draggable persisted
      // top-left position exactly as before.
      // Retest #13 (2026-11-23): a panel in Deep Focus (z-1090) covered
      // the chat SEND button, so a command could not be sent until the
      // panel was closed. The console is now z-1095 — above a focused
      // panel (1090) so chat stays clickable, still below the dock
      // (1100) so the dock buttons keep priority.
      className={`fixed z-[1095] font-mono pointer-events-none transition-shadow ${isMobile ? 'left-2 right-2' : isDeskMode ? 'left-1/2 -translate-x-1/2 w-[480px] max-w-[94vw]' : 'w-[92vw] sm:w-[480px] max-w-[94vw]'}`}
      style={isMobile ? { bottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' } : isDeskMode ? { bottom: '124px' } : {
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      {/* Mobile-first redesign (2026-11-27): live feed as a ONE-LINE
          overlay above the collapsed composer bar — latest event only.
          The full 4-event feed stays in the expanded console. Shown
          only while the bar is collapsed; the overlay never covers the
          orb's centre, it sits just above the bar. */}
      {isMobile && isMinimized && (
        <div className="pointer-events-none absolute bottom-full left-0 right-0 mb-2 px-1">
          <div className="bg-slate-950/85 border border-slate-800 rounded-full px-3 py-1.5 text-[10px] font-mono text-slate-300 truncate">
            {latestLiveEventLine(liveEvents)}
          </div>
        </div>
      )}
      {/* Round-2 phone fix (2026-11-27): the expanded sheet was capped
          at 82dvh, so on a phone its header rose to ~18dvh from the top —
          exactly where the floating Apps button sits (top 108–152px) —
          and the "−" Collapse button ended up underneath it. 72dvh keeps
          the header below the Apps button on phone viewports (top edge
          ≥ 28dvh) while the sheet still scrolls internally. */}
      <motion.div 
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`pointer-events-auto ${isMobile && !isMinimized ? 'bg-slate-950' : 'bg-slate-950/92'} backdrop-blur-2xl border border-cyan-500/40 rounded-2xl p-3.5 shadow-[0_0_50px_rgba(0,229,255,0.25)] flex flex-col gap-2.5 relative ${(isMobile || isDeskMode) && !isMinimized ? 'max-h-[72dvh] overflow-y-auto' : 'overflow-hidden'}`}
      >
        {/* Subtle Cyber Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

        {/* Top Header Bar / Drag Handle — hidden on the collapsed mobile
            bar (input + mic + Send only); the expand chevron in the
            input row is the way back in. */}
        {!(isMobile && isMinimized) && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`flex items-center justify-between select-none pb-1 border-b border-cyan-500/20 ${isMobile || isDeskMode ? 'cursor-default' : 'cursor-move active:cursor-grabbing'}`}
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
            
            {/* Round-3: no Reset Position while docked in Desk mode —
                the floating position is meaningless there. */}
            {!isDeskMode && (
            <button 
              onClick={handleResetPosition}
              className="w-8 h-8 rounded bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 flex items-center justify-center text-[10px] transition-all"
              title="Reset to Top-Left"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
            )}

            <button 
              onClick={() => setIsMinimized(v => !v)}
              className="w-8 h-8 rounded bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 flex items-center justify-center text-xs transition-all font-bold"
              title={isMinimized ? "Expand Console" : "Collapse Console"}
            >
              {isMinimized ? '+' : '−'}
            </button>
          </div>
        </div>
        )}

        {/* Core Status Indicator — hidden on the collapsed mobile bar. */}
        {!(isMobile && isMinimized) && (
        <div className="flex items-center justify-between px-1 border-b border-cyan-500/10 pb-1.5 mb-1 select-none">
          <div className="text-[9px] uppercase font-mono font-bold tracking-widest flex items-center gap-2">
            <span className="text-slate-500">Logic Core:</span>
            {isModelLoaded ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(52,211,153,0.8)]" /> ML Brain Active
              </span>
            ) : freeCloudEnabled ? (
              <span className="text-cyan-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,211,238,0.8)]" /> Free Cloud Gateway
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
        )}

        {/* Expandable Body */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {/* Chat & Activity Stream — taller on the expanded mobile
                  sheet so a reply is readable without scrolling the
                  whole sheet. */}
              <div 
                ref={scrollContainerRef}
                className={isMobile && !isMinimized ? 'max-h-[46dvh] overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs' : 'max-h-36 sm:max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs'}
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

                {/* Live event feed — the orb's work, visible. Fix round
                    (2026-11-27): the feed is ALWAYS visible on the
                    default view. Before, it rendered only inside
                    `{liveEvents.length > 0 && (...)}` — when empty it
                    rendered NOTHING, no container, no empty state, so
                    the live check found no feed at all. The empty state
                    is honest ("Nothing yet — ask NVK something"), never
                    a fake event. Real events arrive from both buses
                    (see the subscription above). */}
                <div className="p-2 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 my-1">
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live — what NVK just did
                  </div>
                  {liveEvents.length === 0 ? (
                    <div className="text-[10px] text-slate-500">Nothing yet — ask NVK something.</div>
                  ) : (
                    liveEvents.slice(-4).map((ev, i) => (
                      <div key={`${ev.time}-${i}`} className="flex items-baseline gap-2 text-[10px] text-slate-400">
                        <span className="text-slate-600 font-mono shrink-0">{ev.time}</span>
                        <span className="truncate">{ev.text}</span>
                      </div>
                    ))
                  )}
                </div>
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
                      className="px-3 min-h-[44px] bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded text-[10px] uppercase font-semibold flex items-center"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmAction}
                      className="px-3 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-[10px] uppercase font-bold shadow-[0_0_10px_rgba(245,158,11,0.5)] flex items-center"
                    >
                      Confirm & Execute
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Clickable Suggested Commands */}
              {/* Phone fix (2026-11-27): on phones the chips ran off the
                  right edge in a single scrollable line (iOS hides the
                  scrollbar, so they just looked cut off). On phones they
                  wrap to a second row so every chip is visible; desktop
                  keeps the single scrollable line. */}
              <div className={isMobile ? 'flex flex-wrap items-center gap-1.5 py-1 select-none' : 'flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar select-none'}>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 shrink-0 font-semibold">
                  Try asking:
                </span>
                {SUGGESTED_COMMANDS.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendCommand(cmd.label)}
                      className="px-2.5 py-1 min-h-[44px] sm:min-h-0 rounded-full bg-slate-900/90 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500/50 text-[10px] text-slate-300 hover:text-cyan-300 whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
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

        {/* Shard synthesis controls (defect 8) — hidden on the collapsed
            mobile bar; they live in the expanded sheet. */}
        {!(isMobile && isMinimized) && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={shardVariant}
            onChange={(e) => setShardVariant(e.target.value as ShardVariant)}
            className="min-w-0 max-w-full bg-slate-900/90 border border-cyan-500/30 rounded-lg text-[11px] text-slate-200 px-2 py-1.5 min-h-[36px] focus:outline-none"
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
            className="shrink-0 px-3 py-1.5 min-h-[36px] bg-slate-800/80 hover:bg-slate-800 disabled:opacity-40 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center"
          >
            {isSynthesizingShard ? 'Synthesizing…' : 'Synthesize shard'}
          </button>
          {!isModelLoaded && !isCloudMode && !freeCloudEnabled && (
            <span className="text-[10px] text-slate-500">Load a local model to synthesize shards.</span>
          )}
        </div>
        )}

        {/* Input Bar & Voice Controls */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendCommand();
          }}
          className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 rounded-xl p-1.5 focus-within:border-cyan-400 focus-within:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all"
        >
          {/* Collapsed mobile bar: tap to expand into the full console
              sheet. The Ret12 auto-expand (a reply landing while
              minimized) still works on top of this. */}
          {isMobile && isMinimized && (
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="min-h-[44px] min-w-[44px] p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center shrink-0"
              title="Expand console"
              aria-label="Expand console"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isMobile && isMinimized ? 'Ask NVK anything…' : "Ask NVK anything... (e.g. 'Research commercial solar in Texas', 'Create pitch deck')"}
            className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
          />

          <button
            type="button"
            onClick={handleToggleListening}
            className={`shrink-0 min-h-[44px] min-w-[44px] p-2 rounded-lg transition-all flex items-center justify-center ${
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
            className="shrink-0 px-3.5 min-h-[44px] bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)] active:scale-95"
          >
            <span>Send</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
