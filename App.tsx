
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CodexOrbSystem } from './components/CodexOrbSystem';
import { useGeminiLive } from './lib/useGeminiLive';
import { PinnedPanel } from './components/PinnedPanel';
import { PanelManager } from './components/PanelManager';
import { OrbModeSelector } from './components/ui/OrbModeSelector';
import { PANEL_DEFINITIONS, DOCK_APPS } from './constants';
import { OmniWheel } from './components/ui/OmniWheel';
import { FlightController } from './components/ui/FlightController';
import { GeoMode, OrbMode, CodexModeId, ParticleBackgroundMode, PanelLayout, ClusterType, Cluster, NavigationInput, FlightInput, AgentCoreState, GlyphInstance } from './types';
import { AgentName, HistoricalEventType } from './types';
import { 
  ALL_CANONICAL_AXIOMS, INITIAL_ECHOES, BLOOD_INK_SPECIES_DATA, 
  AXIOM_RITUAL_ELEMENTS, INITIAL_RESONANCE_EFFECTS, AGENT_PROFILES 
} from './constants';
import { generateInitialGrid, generateInitialAgents, performRitualMove, updateCellEntropy, type SimulationGrid } from './lib/simulationUtils';

// Import all panel components
import AxiomReweaverPanel from './components/center-column/AxiomReweaverPanel';
import AgentSimulationGrid from './components/center-column/AgentSimulationGrid';
import BloodInkFloraChamber from './components/panels/BloodInkFloraChamber';
import CodexAxiomViewer from './components/CodexAxiomViewer';
import { CodexAvatarGeneratorPanel } from './components/panels/CodexAvatarGeneratorPanel';
import { InvestorMindMapPanel } from './components/panels/InvestorMindMapPanel';
import { CodexCommunionChamber } from './components/panels/CodexCommunionChamber';
import CodexDreamPanel from './components/panels/CodexDreamPanel';
import CelestialAnomalyWeaverPanel from './components/panels/CelestialAnomalyWeaverPanel';
import CosmicEntropyGeometryGenerator from './components/panels/CosmicEntropyGeometryGenerator';
import CosmicResonanceDashboardPanel from './components/panels/CosmicResonanceDashboardPanel';
import CrystalFormationPanel from './components/panels/CrystalFormationPanel';
import DatachegaResthetPanel from './components/panels/DatachegaResthetPanel';
import DreambloomGenesisPanel from './components/panels/DreambloomGenesisPanel';
import DriftArchivePanel from './components/panels/DriftArchivePanel';
import DriftDifferentialOverlay from './components/panels/DriftDifferentialOverlay';
import EchoCreationCanvas from './components/EchoCreationCanvas';
import { EchoScribePanel } from './components/EchoScribePanel';
import EmeraldTabletDecryptionPanel from './components/panels/EmeraldTabletDecryptionPanel';
import EmergentLogicWeb from './components/visuals/EmergentLogicWeb';
import EntropicHeartPanel from './components/panels/EntropicHeartPanel';
import EntropyDiagnosticsPanel from './components/panels/EntropyDiagnosticsPanel';
import EntropyDimensionDiagramPanel from './components/panels/EntropyDimensionDiagramPanel';
import ExoticMechanismsPanel from './components/panels/ExoticMechanismsPanel';
import FlowerOfLifeEntropyExplorer from './components/panels/FlowerOfLifeEntropyExplorer';
import GlyphAtlasGrid from './components/panels/GlyphAtlasGrid';
import GlyphComposerPanel from './components/panels/GlyphComposerPanel';
import GlyphMutationTreePanel from './components/center-column/GlyphMutationTreePanel';
import GlyphVisualizationPanel from './components/panels/GlyphVisualizationPanel';
import HarmonicCorePanel from './components/panels/HarmonicCorePanel';
import HarmonicScribePanel from './components/panels/HarmonicScribePanel';
import { HolographicPersonaProjector } from './components/panels/HolographicPersonaProjector';
import KindnessPanel from './components/panels/KindnessPanel';
import LIFEPanel from './components/panels/LIFEPanel';
import MutationLoomPanel from './components/panels/MutationLoomPanel';
import NegentropicBloomVisualizer from './components/panels/NegentropicBloomVisualizer';
import NegentropicResonanceFieldPanel from './components/panels/NegentropicResonanceFieldPanel';
import PeptideSimulationPanel from './components/panels/PeptideSimulationPanel';
import ResonanceEnginePanel from './components/panels/ResonanceEnginePanel';
import { RitualCanvasContainer } from './components/RitualCanvasContainer';
import SeekerAuraDisplay from './components/visuals/SeekerAuraDisplay';
import ShatterpointTracePanel from './components/panels/ShatterpointTracePanel';
import SigilBloomVariantPanel from './components/panels/SigilBloomVariantPanel';
import TabletOfThePhoenixPanel from './components/panels/TabletOfThePhoenixPanel';
import TemporalOperationsConsolePanel from './components/panels/TemporalOperationsConsolePanel';
import TemporalResonanceLogPanel from './components/panels/TemporalResonanceLogPanel';
import TemporalSpiralVisualizer from './components/visuals/TemporalSpiralVisualizer';
import TraitGateLock from './components/right-column/TraitGateLock';
import TraitGatePanel from './components/center-column/TraitGatePanel';
import TreeOfLifeVisualizer from './components/visuals/TreeOfLifeVisualizer';
import TriObeliskHarmonyMatrix from './components/panels/TriObeliskHarmonyMatrix';
import { ResonanceField } from './components/ResonanceField';
import { ResonanceVisualizerPanel } from './components/ResonanceVisualizerPanel';
import SpiralThreadMapTest from './components/SpiralThreadMapTest';
import AdvancedReasoningPanel from './components/panels/AdvancedReasoningPanel';
import ModelOrchestratorPanel from './components/panels/ModelOrchestratorPanel';
import OperationsDashboardPanel from './components/panels/OperationsDashboardPanel';
import EthicalFrameworkPanel from './components/panels/EthicalFrameworkPanel';
import SystemHealthPanel from './components/panels/SystemHealthPanel';
import IntegrationHubPanel from './components/panels/IntegrationHubPanel';
import CommandBridgePanel from './components/panels/CommandBridgePanel';
import NexusTerminal from './components/panels/NexusTerminal';
import { CodexObeliskPanel } from './components/panels/CodexObeliskPanel'; 
import PricingPage from './components/PricingPage';
import ClockTimerPanel from './components/panels/ClockTimerPanel';
import CalendarPanel from './components/panels/CalendarPanel';
import MapsPanel from './components/panels/MapsPanel';
import EmailPanel from './components/panels/EmailPanel';
import MessagingPanel from './components/panels/MessagingPanel';
import FileSystemPanel from './components/panels/FileSystemPanel';
import GlyphPanel from './components/panels/GlyphPanel';
import ClusterConfigPanel from './components/panels/ClusterConfigPanel';
import NVKVoiceOrchestratorPanel from './components/panels/NVKVoiceOrchestratorPanel';

import { SystemStateProvider, type SystemStateContextType } from './context/SystemContext';
import { GeminiContext, useGemini } from './context/GeminiIntegrationContext';
import { useEcho } from './context/EchoContext';
import { useLocalLLM } from './context/LocalLLMContext';
import { VoiceEngine } from './lib/whisper/VoiceEngine';
import { voiceProfiles } from './lib/whisper/VoiceRegistry';
import PanelLauncher from './components/panels/PanelLauncher';
import NexusBrowser from './components/panels/NexusBrowser';
import { Dock } from './components/Dock';
import { Header } from './components/Header';
import { OmniSearchModal } from './components/ui/OmniSearchModal';
import { BootSequence } from './components/core/BootSequence'; 
import Watermark from './components/ui/Watermark'; 
import { GlobalControlHub } from './components/GlobalControlHub';
import { NVKLogicCore } from './components/NVKLogicCore';
import { TutorialOverlay } from './components/TutorialOverlay';
import { AuthGateway } from './components/ui/AuthGateway';
import { CyberSynth } from './lib/soundEffects';

import { JarvisDesktop3D } from './components/three/JarvisDesktop3D';
import { NVKSpaceBridge } from './integration/spaceBridge';
import { HUD } from './components/spatial/HUD';
import { Workspace2D } from './components/spatial/Workspace2D';

class ThreeErrorBoundary extends React.Component<
  { fallback: React.ReactNode; onError?: () => void; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("Three.js/Canvas crash detected:", error);
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  const [nodeInfo, setNodeInfo] = useState<{axiom: string, role: string} | null>(null);
  const [systemBooted, setSystemBooted] = useState(false); 
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
    }
    return false;
  });
  const [performanceTier, setPerformanceTier] = useState<'low' | 'high'>(() => {
    if (typeof window !== 'undefined') {
      const mobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
      return mobile ? 'low' : 'high';
    }
    return 'high';
  });
  const [workspaceMode, setWorkspaceMode] = useState<'3d' | '2d'>('3d');
  const [active2dNodeId, setActive2dNodeId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Drag and drop / Auto-recenter states
  const [isDragging, setIsDragging] = useState(false);
  const [isOverCore, setIsOverCore] = useState(false);
  const [autoRecenter, setAutoRecenter] = useState(true);
  const [desktopShortcuts, setDesktopShortcuts] = useState<Array<{ name: string; size: number; x: number; y: number }>>([
    { name: 'system_core.bin', size: 5242880, x: 50, y: 120 },
    { name: 'axiom_definitions.json', size: 45000, x: 50, y: 220 },
    { name: 'nebula_vision.jpg', size: 512000, x: 50, y: 320 }
  ]);

  useEffect(() => {
    const handleDragStartEvent = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      setIsDragging(true);
      setIsOverCore(false);
    };
    
    const handleDragEndEvent = () => {
      setIsDragging(false);
      setIsOverCore(false);
    };
    
    window.addEventListener('nvk-drag-start', handleDragStartEvent);
    window.addEventListener('nvk-drag-end', handleDragEndEvent);
    
    return () => {
      window.removeEventListener('nvk-drag-start', handleDragStartEvent);
      window.removeEventListener('nvk-drag-end', handleDragEndEvent);
    };
  }, []);

  const handleDropOnCore = (item: any) => {
    CyberSynth.playClick();
    addEchoMessage(AgentName.SystemControl, `Synthesizing logical binding path for dropped artifact [${item.name}]...`, 'text-cyan-400');
    
    const analyzeEvent = new CustomEvent('nvk-core-analyze-file', {
      detail: item
    });
    window.dispatchEvent(analyzeEvent);
  };

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setIsOverCore(false);
    
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      
      const item = JSON.parse(dataStr);
      
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      
      if (dist < 160) {
        handleDropOnCore(item);
      } else {
        const x = Math.min(window.innerWidth - 100, Math.max(20, e.clientX - 40));
        const y = Math.min(window.innerHeight - 100, Math.max(80, e.clientY - 40));
        
        setDesktopShortcuts(prev => {
          const existingIdx = prev.findIndex(s => s.name === item.name);
          if (existingIdx >= 0) {
            const next = [...prev];
            next[existingIdx] = { ...next[existingIdx], x, y };
            return next;
          } else {
            return [...prev, { name: item.name, size: item.size || 0, x, y }];
          }
        });
        
        addEchoMessage(AgentName.SystemControl, `Shortcut created: ${item.name} placed at desk coordinates [X:${Math.round(x)}, Y:${Math.round(y)}]`, 'text-emerald-400');
        CyberSynth.playClick();
      }
    } catch (err) {
      console.warn("Global drop parsing error:", err);
    }
  };

  // Suppress harmless Vite HMR/WebSocket closed connection warnings originating from sandboxed runtime environment
  useEffect(() => {
    const handleErrorSuppress = (e: ErrorEvent) => {
      const msg = e.message || '';
      if (
        msg.includes('WebSocket') || 
        msg.includes('websocket') || 
        msg.includes('HMR') || 
        (e.filename && e.filename.includes('vite'))
      ) {
        e.preventDefault();
        console.info("[HMR Connection Suppressed in Sandbox environment]:", msg);
      }
    };

    const handleRejectionSuppress = (e: PromiseRejectionEvent) => {
      const reason = (e.reason && (e.reason.message || e.reason.stack)) || String(e.reason);
      if (
        reason.includes('WebSocket') || 
        reason.includes('websocket') || 
        reason.includes('closed without opened') ||
        reason.includes('vite')
      ) {
        e.preventDefault();
        console.info("[HMR Rejection Suppressed in Sandbox environment]:", reason);
      }
    };

    window.addEventListener('error', handleErrorSuppress);
    window.addEventListener('unhandledrejection', handleRejectionSuppress);
    return () => {
      window.removeEventListener('error', handleErrorSuppress);
      window.removeEventListener('unhandledrejection', handleRejectionSuppress);
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
      // Automatically downgrade performance on mobile or small screens
      setPerformanceTier(mobile ? 'low' : 'high');
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Synchronize workspace mode selection
  useEffect(() => {
    try {
      localStorage.setItem('nvk_workspace_mode', workspaceMode);
    } catch (e) {
      console.warn("Storage write restricted:", e);
    }
  }, [workspaceMode]);
  
  // Cluster Management
  const [clusters, setClusters] = useState<Cluster[]>([
    {
      id: 'default-cluster',
      name: 'Main Workspace',
      type: ClusterType.Standard,
      nodes: [],
      openNodeIds: [],
      pinnedPanelIds: [],
      layout: PanelLayout.TAB_BROWSER,
      orbMode: OrbMode.HolographicCore,
      particleMode: ParticleBackgroundMode.Orbital,
      nodeAnimationSpeed: 0.5,
      masterPanelSize: 1.0,
      nodeSpacing: 1.0,
      nodeFlow: 0.5,
      panelOpacity: 0.8,
      torusFactor: 1.8,
      flowFactor: 4.0,
      gridFactor: 2.2,
      scanlineFactor: 0.12
    }
  ]);
  const [activeClusterId, setActiveClusterId] = useState<string>('default-cluster');
  const [swappingNodeId, setSwappingNodeId] = useState<string | null>(null);
  const [showClusterMenu, setShowClusterMenu] = useState(false);

  const activeCluster = useMemo(() => 
    clusters.find(c => c.id === activeClusterId) || clusters[0],
  [clusters, activeClusterId]);

  const updateActiveCluster = useCallback((updates: Partial<Cluster>) => {
    setClusters(prev => prev.map(c => 
      c.id === activeClusterId ? { ...c, ...updates } : c
    ));
  }, [activeClusterId]);

  // Dynamic Window Manager / Focus Mode States
  const [minimizedPanelIds, setMinimizedPanelIds] = useState<string[]>([]);
  const [maximizedPanelIds, setMaximizedPanelIds] = useState<string[]>([]);
  const [focusedPanelId, setFocusedPanelId] = useState<string | null>(null);
  const [panelZIndices, setPanelZIndices] = useState<Record<string, number>>({});
  const [maxZIndex, setMaxZIndex] = useState(1050);

  const handleToggleMinimize = useCallback((instanceId: string) => {
    setMinimizedPanelIds(prev => {
      if (prev.includes(instanceId)) {
        return prev.filter(id => id !== instanceId);
      } else {
        setMaximizedPanelIds(max => max.filter(id => id !== instanceId));
        return [...prev, instanceId];
      }
    });
  }, []);

  const handleToggleMaximize = useCallback((instanceId: string) => {
    setMaximizedPanelIds(prev => {
      if (prev.includes(instanceId)) {
        return prev.filter(id => id !== instanceId);
      } else {
        setMinimizedPanelIds(min => min.filter(id => id !== instanceId));
        return [...prev, instanceId];
      }
    });
  }, []);

  const handleToggleFocus = useCallback((instanceId: string) => {
    setFocusedPanelId(prev => (prev === instanceId ? null : instanceId));
  }, []);

  const handleBringToFront = useCallback((instanceId: string) => {
    setMaxZIndex(prev => {
      const next = prev + 1;
      setPanelZIndices(indices => ({
        ...indices,
        [instanceId]: next
      }));
      return next;
    });
  }, []);

  const handleMinimizeAll = useCallback(() => {
    setMinimizedPanelIds(activeCluster.pinnedPanelIds);
    setMaximizedPanelIds([]);
    setFocusedPanelId(null);
  }, [activeCluster.pinnedPanelIds]);

  const handleRestoreAll = useCallback(() => {
    setMinimizedPanelIds([]);
    setMaximizedPanelIds([]);
  }, []);

  const handleCloseAll = useCallback(() => {
    updateActiveCluster({ pinnedPanelIds: [] });
    setMinimizedPanelIds([]);
    setMaximizedPanelIds([]);
    setFocusedPanelId(null);
  }, [updateActiveCluster]);

  const handleTilePanels = useCallback((mode: 'grid' | 'cols' | 'rows') => {
    const panels = activeCluster.pinnedPanelIds;
    if (panels.length === 0) return;
    
    setMinimizedPanelIds([]);
    setMaximizedPanelIds([]);
    setFocusedPanelId(null);
    
    setTimeout(() => {
      const panelElements = document.querySelectorAll('.pinned-panel');
      if (panelElements.length === 0) return;
      
      const count = panelElements.length;
      const workspaceWidth = window.innerWidth;
      const workspaceHeight = window.innerHeight - 140; // 60px header + 80px dock
      const topOffset = 60;
      
      if (mode === 'cols') {
        const colWidth = workspaceWidth / count;
        panelElements.forEach((el, index) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.width = `${colWidth - 16}px`;
          htmlEl.style.height = `${workspaceHeight - 16}px`;
          htmlEl.style.left = `${index * colWidth + 8 + (colWidth - 16)/2}px`;
          htmlEl.style.top = `${topOffset + 8}px`;
        });
      } else if (mode === 'rows') {
        const rowHeight = workspaceHeight / count;
        panelElements.forEach((el, index) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.width = `${workspaceWidth - 16}px`;
          htmlEl.style.height = `${rowHeight - 16}px`;
          htmlEl.style.left = `50%`;
          htmlEl.style.top = `${topOffset + index * rowHeight + 8}px`;
        });
      } else if (mode === 'grid') {
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const colWidth = workspaceWidth / cols;
        const rowHeight = workspaceHeight / rows;
        
        panelElements.forEach((el, index) => {
          const htmlEl = el as HTMLElement;
          const r = Math.floor(index / cols);
          const c = index % cols;
          
          htmlEl.style.width = `${colWidth - 16}px`;
          htmlEl.style.height = `${rowHeight - 16}px`;
          htmlEl.style.left = `${c * colWidth + 8 + (colWidth - 16)/2}px`;
          htmlEl.style.top = `${topOffset + r * rowHeight + 8}px`;
        });
      }
    }, 50);
  }, [activeCluster.pinnedPanelIds]);

  // System keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape' && focusedPanelId) {
        setFocusedPanelId(null);
      } else if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setWorkspaceMode(prev => prev === '3d' ? '2d' : '3d');
      } else if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        if (minimizedPanelIds.length > 0) {
          handleRestoreAll();
        } else {
          handleMinimizeAll();
        }
      } else if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        handleTilePanels('grid');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedPanelId, minimizedPanelIds.length, handleRestoreAll, handleMinimizeAll, handleTilePanels]);

  const [isOrbModeSelectorOpen, setIsOrbModeSelectorOpen] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const { generateText } = useLocalLLM();

  const spawnAgent = (name: string, task: string, panelId?: string) => {
    // Legacy agent spawning replaced by node creation in cluster
    const id = `agent-${Date.now()}`;
    
    updateActiveCluster({
      nodes: [...activeCluster.nodes, { id, panelId: panelId || 'GlyphPanel', label: name }],
      openNodeIds: [...activeCluster.openNodeIds, id]
    });

    addEchoMessage(AgentName.SystemControl, `Manifesting Service Node: ${name}`, 'text-fuchsia-400');
  };
  const { echoes, addEchoMessage } = useEcho();

  const handleSwapPanel = useCallback((nodeId: string) => {
    setSwappingNodeId(nodeId);
  }, []);

  const handlePerformSwap = useCallback((newNodeId: string) => {
    if (!swappingNodeId) return;
    
    setClusters(prev => prev.map(c => {
      if (c.id === activeClusterId) {
        const openNodeIds = c.openNodeIds.map(id => id === swappingNodeId ? newNodeId : id);
        return { ...c, openNodeIds };
      }
      return c;
    }));
    
    setSwappingNodeId(null);
  }, [swappingNodeId, activeClusterId]);

  const handleSynthesize = useCallback(async () => {
    if (activeCluster.openNodeIds.length === 0) {
      addEchoMessage(AgentName.SystemControl, 'No open panels to synthesize.', 'text-yellow-400');
      return;
    }
    setIsSynthesizing(true);
    addEchoMessage(AgentName.SystemControl, `Initiating Intelligence Synthesis across ${activeCluster.name} nodes...`, 'text-cyan-400');
    
    try {
      const panelNames = activeCluster.openNodeIds.map(id => PANEL_DEFINITIONS.find(p => p.id === id)?.name || id).join(', ');
      const prompt = `Synthesize the connections and potential emergent properties between the following active system nodes in the ${activeCluster.name} cluster: ${panelNames}. Provide a concise, high-level tactical brief.`;
      
      const response = await generateText(prompt, 'You are the NVK Core, the central intelligence of the NVK OS. Provide highly professional, analytical, and concise synthesis of business operations nodes.', 0.7, 500);
      
      addEchoMessage(AgentName.SystemCore, `Synthesis Complete [${activeCluster.name}]:\n${response}`, 'text-green-400');
    } catch (error) {
      console.error('Synthesis failed:', error);
      addEchoMessage(AgentName.SystemCore, 'Synthesis failed. Core error.', 'text-red-400');
    } finally {
      setIsSynthesizing(false);
    }
  }, [activeCluster, generateText, addEchoMessage]);

  const handleCloseAllPanels = useCallback(() => {
    updateActiveCluster({ openNodeIds: [], pinnedPanelIds: [] });
    setMinimizedPanelIds([]);
    setMaximizedPanelIds([]);
    setFocusedPanelId(null);
    addEchoMessage(AgentName.SystemControl, 'All neural panels collapsed.', 'text-red-400');
  }, [updateActiveCluster, addEchoMessage]);

  const handleOpenAllPanels = useCallback(() => {
    const allNodeIds = activeCluster.nodes.map(n => n.id);
    updateActiveCluster({ openNodeIds: allNodeIds });
    addEchoMessage(AgentName.SystemControl, 'All neural panels expanded.', 'text-emerald-400');
  }, [activeCluster.nodes, updateActiveCluster, addEchoMessage]);

  const [particleMode, setParticleMode] = useState<ParticleBackgroundMode>(ParticleBackgroundMode.Orbital);
  const [isParticleSelectorOpen, setIsParticleSelectorOpen] = useState(false);
  const [navigationInput, setNavigationInput] = useState<NavigationInput | null>(null);
  const [flightInput, setFlightInput] = useState<FlightInput>({
    translation: { x: 0, y: 0, z: 0 },
    rotation: { pitch: 0, yaw: 0, roll: 0 },
    isLocked: false
  });
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const { invokeGemini, generateImage, isGenerating } = useGemini();
  const voiceEngine = useMemo(() => new VoiceEngine(), []);

  // --- Comprehensive Mock Application State ---
  const [axioms, setAxioms] = useState<Axiom[]>(ALL_CANONICAL_AXIOMS);
  const [currentEntropy, setCurrentEntropy] = useState(0.35); 
  const [masterEntropyOverride, setMasterEntropyOverride] = useState(0); 
  const [masterNegentropyLevel, setMasterNegentropyLevel] = useState(5); 
  const [glyphMutationNodes, setGlyphMutationNodes] = useState<GlyphMutationNode[]>([]);
  const [rewovenGlyphs, setRewovenGlyphs] = useState<RewovenGlyph[]>([]);
  const [agentGrid, setAgentGrid] = useState<{grid: SimulationGrid, agents: AgentNode[]}>({grid: [], agents: []});
  const [activeSpecies, setActiveSpecies] = useState<BloodInkSpeciesName | null>(null);
  const [codexMode, setCodexMode] = useState<CodexModeDefinition | undefined>(undefined);
  const [seekerTraits, setSeekerTraits] = useState<string[]>(['Dreamwalker']);
  const [latestWitnessMessage, setLatestWitnessMessage] = useState<EchoMessage | null>(null);
  const [currentGeoMode, setCurrentGeoMode] = useState<GeoMode>(GeoMode.Recursive);
  const [currentDisplayMode, setCurrentDisplayMode] = useState<PanelDisplayMode>(GeoMode.Recursive); 
  const [threadCoilSegments, setThreadCoilSegments] = useState<ThreadcoilSegment[]>([]);
  const [traitGates, setTraitGates] = useState<TraitGate[]>([]);
  const [harmonicCoreState, setHarmonicCoreState] = useState({lambdaValue: 0.98, status: 'Stable', eleganceIndex: 0.85});
  const [sigilVariants, setSigilVariants] = useState<SigilVariant[]>([]);
  const [selectedSigilVariantId, setSelectedSigilVariantId] = useState<string | null>(null);
  const [mutationLoomState, setMutationLoomState] = useState<MutationLoomState>({ glyph1Id: null, glyph2Id: null, isWeaving: false, entropyInjection: 0.5, traitFocus: [] });
  const [placedGlyphs, setPlacedGlyphs] = useState<PlacedGlyph[]>([]);
  const [connections, setConnections] = useState<CanvasConnection[]>([]);
  const [availableAxiomElements, setAvailableAxiomElements] = useState<RitualElementItem[]>(AXIOM_RITUAL_ELEMENTS);
  const [resonanceEffects, setResonanceEffects] = useState<ResonanceEffect[]>(INITIAL_RESONANCE_EFFECTS);
  const [spiralThreads, setSpiralThreads] = useState<Thread[]>([]);
  const [historicalEvents, setHistoricalEvents] = useState<HistoricalEvent[]>([]);
  const [nodeAnimationSpeed, setNodeAnimationSpeed] = useState(0.5);
  const [isBugaModeActive, setIsBugaModeActive] = useState(false);
  const [subAgents, setSubAgents] = useState<SubAgent[]>([
    { id: '1', name: 'Nexus', task: 'Monitoring Entropy', status: 'working', color: '#00ffb3' },
    { id: '2', name: 'Weaver', task: 'Idle', status: 'idle', color: '#ff00ff' }
  ]);
  const [thoughts, setThoughts] = useState<ThoughtGlyph[]>([]);

  const addThought = useCallback((text: string) => {
    setThoughts(prev => [...prev, { id: `thought-${Date.now()}`, text, createdAt: Date.now() }].slice(-10));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setThoughts(prev => prev.filter(t => Date.now() - t.createdAt < 10000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const spawnSubAgent = useCallback((name: string, task: string, color: string) => {
    setSubAgents(prev => [...prev, { id: `agent-${Date.now()}`, name, task, status: 'working', color }]);
  }, []);

  const effectiveEntropy = useMemo(() => {
    const entropyChange = masterEntropyOverride / 20.0;
    return Math.max(0, Math.min(1, currentEntropy + entropyChange));
  }, [currentEntropy, masterEntropyOverride]);

  const handleNodeHover = useCallback((info: {axiom: string, role: string} | null) => {
    setNodeInfo(info);
  }, []);

  const handleBootSystem = useCallback(() => {
    setSystemBooted(true);
  }, []);

  useEffect(() => {
    if (systemBooted) {
      const profile = voiceProfiles.find(p => p.agent === AgentName.SystemCore);
      const message = "NVK OS is active. Welcome to your angelic workspace.";
      if (profile) {
        voiceEngine.speak(message, profile).catch(console.error);
      }
      addEchoMessage(AgentName.SystemCore, message, AGENT_PROFILES[AgentName.SystemCore]?.colorClass || 'text-cyan-400');
    }
  }, [systemBooted, voiceEngine, addEchoMessage]);

  // Initialize Agent Grid
  useEffect(() => {
    const initialGrid = generateInitialGrid();
    const initialAgents = generateInitialAgents();
    setAgentGrid({ grid: initialGrid, agents: initialAgents });
  }, []);

  // Agent Simulation Loop
  useEffect(() => {
    if (!systemBooted) return;
    
    const interval = setInterval(() => {
      setAgentGrid(prev => {
        if (!prev.grid || prev.grid.length === 0) {
           const reInitGrid = generateInitialGrid();
           const reInitAgents = generateInitialAgents();
           return { grid: reInitGrid, agents: reInitAgents };
        }
        const newAgents = prev.agents.map(agent => performRitualMove(agent, prev.grid));
        const newGrid = prev.grid.map(row => row.map(cell => {
           const entropy = updateCellEntropy(cell, newAgents);
           return { ...cell, entropy };
        }));
        return { grid: newGrid, agents: newAgents };
      });
    }, 1500); 

    return () => clearInterval(interval);
  }, [systemBooted]);

  const handlePanelNodeClick = useCallback((nodeId: string) => {
    updateActiveCluster({
      openNodeIds: activeCluster.openNodeIds.includes(nodeId) 
        ? activeCluster.openNodeIds.filter(id => id !== nodeId)
        : [...activeCluster.openNodeIds, nodeId]
    });
  }, [activeCluster, updateActiveCluster]);
  
  const handleTacticalBrief = useCallback(async (panelId: string) => {
    const basePanelId = panelId.split('::')[0];
    const panelDef = PANEL_DEFINITIONS.find(p => p.id === basePanelId);
    if (!panelDef) return;
    
    addEchoMessage(AgentName.SystemControl, `Generating Operational Brief for ${panelDef.name} in ${activeCluster.name}...`, 'text-cyan-400');
    
    try {
      const prompt = `Provide a concise, professional "Operational Brief" for the system node named "${panelDef.name}" within the ${activeCluster.name} cluster. Description: ${panelDef.description}. Focus on its role in the NVK OS.`;
      const response = await generateText(prompt, 'You are the NVK Core, the central intelligence of the NVK OS.', 0.7, 300);
      
      addEchoMessage(AgentName.SystemCore, `[OPERATIONAL BRIEF: ${panelDef.name}]\n${response}`, 'text-green-400');
    } catch (error) {
      console.error('Tactical Brief failed:', error);
      addEchoMessage(AgentName.SystemCore, `Tactical Brief failed for ${panelDef.name}.`, 'text-red-400');
    }
  }, [generateText, addEchoMessage, activeCluster.name]);

  const handleAppClick = useCallback((panelId: string, initialUrl?: string) => {
    // Generate a unique instance ID for this panel
    let instanceId = `${panelId}::${Date.now()}`;
    if (initialUrl) {
      instanceId += `::${encodeURIComponent(initialUrl)}`;
    }
    
    updateActiveCluster({
      pinnedPanelIds: [...activeCluster.pinnedPanelIds, instanceId]
    });
    addEchoMessage(AgentName.SystemControl, `Deploying ${panelId} instance to operational interface.`, 'text-cyan-400');
  }, [activeCluster, updateActiveCluster, addEchoMessage]);

  const handlePinPanel = useCallback((nodeId: string) => {
    const node = activeCluster.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Create a unique instance ID for the pinned panel
    const instanceId = `${node.panelId}::${nodeId}`;
    
    updateActiveCluster({
      pinnedPanelIds: [...new Set([...activeCluster.pinnedPanelIds, instanceId])],
      openNodeIds: activeCluster.openNodeIds.filter(id => id !== nodeId)
    });
    addEchoMessage(AgentName.SystemControl, `Panel ${node.label} pinned to dashboard.`, 'text-emerald-400');
  }, [activeCluster, updateActiveCluster, addEchoMessage]);

  const handleUnpinPanel = useCallback((instanceId: string) => {
    const [panelId, originalNodeId] = instanceId.split('::');
    
    // Check if the original node exists or if we should find/create one
    let node = activeCluster.nodes.find(n => n.id === originalNodeId);
    let targetNodeId = originalNodeId;

    const updates: Partial<Cluster> = {
      pinnedPanelIds: activeCluster.pinnedPanelIds.filter(id => id !== instanceId)
    };

    if (!node) {
      // Create a new node for this panel in the cluster
      const panelDef = PANEL_DEFINITIONS.find(p => p.id === panelId);
      targetNodeId = `${activeClusterId}-node-${Date.now()}`;
      const newNode: ClusterNode = {
        id: targetNodeId,
        panelId: panelId,
        label: panelDef?.name || panelId
      };
      updates.nodes = [...activeCluster.nodes, newNode];
    }

    updates.openNodeIds = [...new Set([...activeCluster.openNodeIds, targetNodeId])];
    
    updateActiveCluster(updates);
    addEchoMessage(AgentName.SystemControl, `Panel ${panelId} unpinned to 3D cluster.`, 'text-cyan-400');
  }, [activeCluster, activeClusterId, updateActiveCluster, addEchoMessage]);

  const handleLiveToolCall = useCallback((toolCall: any, sendResponse: (res: any) => void) => {
    const functionCalls = toolCall.functionCalls;
    if (!functionCalls) return;

    const responses = functionCalls.map((call: any) => {
      try {
        if (call.name === "changeOrbMode") {
          const modeMap: Record<string, OrbMode> = {
            "holographic": OrbMode.HolographicCore,
            "zen": OrbMode.ZenVoid,
            "quantum": OrbMode.QuantumState,
            "tactical": OrbMode.TacticalMap,
            "dreambloom": OrbMode.Dreambloom,
            "crystalline": OrbMode.CrystallineMatrix,
            "chaotic": OrbMode.ChaoticNucleus,
            "biolattice": OrbMode.BioLattice
          };
          const targetMode = modeMap[call.args.mode.toLowerCase()] || OrbMode.HolographicCore;
          updateActiveCluster({ orbMode: targetMode });
          addEchoMessage(AgentName.SystemCore, `Orb mode set to ${call.args.mode}`, 'text-cyan-400');
          return { id: call.id, response: { success: true, mode: targetMode } };
        } else if (call.name === "openPanel") {
          handleAppClick(call.args.panelName);
          return { id: call.id, response: { success: true, panel: call.args.panelName } };
        } else if (call.name === "closePanel") {
          const panelName = call.args.panelName;
          const panelToClose = activeCluster.pinnedPanelIds.find(pid => pid.startsWith(panelName));
          if (panelToClose) {
            handleUnpinPanel(panelToClose);
            return { id: call.id, response: { success: true, closed: panelName } };
          }
          return { id: call.id, response: { success: false, reason: "Panel not open" } };
        }
      } catch (e) {
        console.error("Tool execution error:", e);
        return { id: call.id, response: { success: false, error: String(e) } };
      }
      return { id: call.id, response: { success: false, error: "Unknown command" } };
    });

    sendResponse({ functionResponses: responses });
  }, [updateActiveCluster, handleAppClick, handleUnpinPanel, activeCluster.pinnedPanelIds, addEchoMessage]);

  const liveApi = useGeminiLive({ onToolCall: handleLiveToolCall });

  const hasStartedLive = useRef(false);
  useEffect(() => {
    if (systemBooted && !hasStartedLive.current) {
      hasStartedLive.current = true;
      liveApi.startLive();
      setShowOrbTooltip(true);
      const timeout = setTimeout(() => setShowOrbTooltip(false), 15000);
      return () => clearTimeout(timeout);
    }
  }, [systemBooted, liveApi.startLive]);

  // Global Browser Agent Interoperability Bridge (OpenClaw / Hermes / Playwright)
  useEffect(() => {
    (window as any).NVK_OS = {
      version: "2.5.0",
      openPanel: (panelId: string, initialUrl?: string) => handleAppClick(panelId, initialUrl),
      closePanel: (instanceId: string) => {
        updateActiveCluster({ pinnedPanelIds: activeCluster.pinnedPanelIds.filter(pid => pid !== instanceId) });
      },
      tilePanels: (mode: 'grid' | 'cols' | 'rows') => handleTilePanels(mode),
      minimizeAll: handleMinimizeAll,
      restoreAll: handleRestoreAll,
      closeAll: handleCloseAll,
      getActivePanels: () => activeCluster.pinnedPanelIds,
      getClusters: () => clusters,
      setMode: (mode: '3d' | '2d') => setWorkspaceMode(mode),
      dispatchCommand: async (action: string, payload: any) => {
        const res = await fetch('/api/agent/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, payload })
        });
        return res.json();
      }
    };
  }, [handleAppClick, updateActiveCluster, activeCluster.pinnedPanelIds, handleTilePanels, handleMinimizeAll, handleRestoreAll, handleCloseAll, clusters]);

  const handleSwapPinnedPanel = useCallback((instanceId: string, newPanelId: string) => {
    const [oldPanelId, originalId] = instanceId.split('::');
    const newInstanceId = `${newPanelId}::${originalId}`;
    
    updateActiveCluster({
      pinnedPanelIds: activeCluster.pinnedPanelIds.map(pid => pid === instanceId ? newInstanceId : pid),
      nodes: activeCluster.nodes.map(n => n.id === originalId ? { ...n, panelId: newPanelId, label: PANEL_DEFINITIONS.find(p => p.id === newPanelId)?.name || n.label } : n)
    });
    addEchoMessage(AgentName.SystemControl, `Panel instance ${originalId} swapped to ${newPanelId}.`, 'text-cyan-400');
  }, [activeCluster.pinnedPanelIds, activeCluster.nodes, updateActiveCluster, addEchoMessage]);

  const handleDeleteCluster = useCallback((id: string) => {
    if (clusters.length <= 1) {
      addEchoMessage(AgentName.SystemControl, "Cannot delete the final cluster. System stability required.", 'text-red-400');
      return;
    }
    setClusters(prev => prev.filter(c => c.id !== id));
    if (activeClusterId === id) {
      const remaining = clusters.filter(c => c.id !== id);
      setActiveClusterId(remaining[0].id);
    }
    addEchoMessage(AgentName.SystemControl, `Orb System ${id} decommissioned.`, 'text-orange-400');
  }, [clusters, activeClusterId, addEchoMessage]);

  const [isCoreControlsOpen, setIsCoreControlsOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showOrbTooltip, setShowOrbTooltip] = useState(false);

  const handleCoreOrbClick = useCallback(() => {
    if (liveApi.isActive) {
      liveApi.sendText("*user poked the orb*");
    } else {
      liveApi.startLive();
    }
    setShowOrbTooltip(false);
    setIsCoreControlsOpen(true);
  }, [liveApi]);

  const addHistoricalEvent = (type: HistoricalEventType, data: any, specificTimestamp?: number) => {
    const newEvent: HistoricalEvent = {
        eventId: `event-${Date.now()}`,
        timestamp: specificTimestamp || Date.now(),
        type,
        data,
    } as HistoricalEvent;
    setHistoricalEvents(prev => [...prev, newEvent].slice(-500));
  };

  const systemState: SystemStateContextType = useMemo(() => ({
    entropy: effectiveEntropy,
    activeTraits: seekerTraits,
    playbackStatus: 'paused',
    activeGlyph: 'glyph-alpha',
    negentropyLevel: masterNegentropyLevel / 10.0, 
    isNegentropyStable: true, 
    isMobile,
    performanceTier,
  }), [effectiveEntropy, seekerTraits, masterNegentropyLevel, isMobile, performanceTier]);

  const handleUpdateSystemBaseEntropy = useCallback((newBaseEntropy: number) => {
    setCurrentEntropy(Math.max(0, Math.min(1, newBaseEntropy)));
  }, []);

  const handleGlyphRewovenCallback = useCallback((rewoven: RewovenGlyph) => {
      setRewovenGlyphs(prev => [...prev, rewoven]);
      setGlyphMutationNodes(prev => prev.map(node => node.id === rewoven.baseGlyphId ? { ...node, activeVariantId: rewoven.id } : node));
      setCurrentEntropy(prev => Math.max(0, Math.min(1, prev + rewoven.entropyChange)));
      
      addEchoMessage(AgentName.Reweaver, `Glyph Rewoven: ${rewoven.baseGlyphLabel} -> ${rewoven.boundAxiomTitle}. Entropy adjusted by ${rewoven.entropyChange.toFixed(3)}.`, AGENT_PROFILES[AgentName.Reweaver].colorClass);
      addHistoricalEvent(HistoricalEventType.GLYPH_REWOVEN, { rewovenResult: rewoven });
  }, [addEchoMessage]);

  const handleWeaveGlyphs = async () => { return undefined; }; 
  const handleRevealBloomVariants = () => {}; 
  const handleRitualActivated = (success: boolean, details: string, type?: string, alchemyResult?: RitualAlchemyResult) => {
      addEchoMessage(AgentName.RitualEngine, `Ritual Result: ${success ? 'Success' : 'Failure'} - ${details}`, success ? 'text-emerald-300' : 'text-rose-400');
  };
  const handleAnalyzeForRewrite = () => {}; 
  const handleAttemptUnlock = (gateId: string) => {}; 
  const logGeminiNarrativeDriftEvent = (driftInterpretation: IDriftInterpretationDB) => {}; 

  // --- Mock Data for Placeholder Panels ---
  const mockGlyphVisData = {
    glyphData: {
        id: 'glyph-vis-placeholder',
        title: 'Placeholder Glyph',
        description: 'A glyph of emergent potential, awaiting integration.',
        resonance: 77.7,
        traits: ['Recursive', 'Harmonic'],
        linkedAxioms: ['AX-I.1', 'AX-V.0'],
        ritualAffinity: 'Synthesis',
    },
    pulseDetails: {
        label: 'VISUALIZATION_SEQ_ALPHA',
        glyphId: 'glyph-vis-placeholder',
        state: 'STABLE',
        mode: 'HOLOGRAPHIC_PROJECTION',
        signatureFrequency: '88.3Hz',
        shadowArchiveDepth: 'Δ9',
        decryptionTraits: ['Wonder', 'Void-Tuned'],
    },
    visualizationDetails: {
        initialPhase: { title: 'Emergence', form: 'Crystalline Seed', visual: 'Pulsing cyan light', animation: 'Slow Bloom' },
        sonicProfile: { description: 'Chimes resonating at the frequency of starlight.' },
        finalForm: { description: 'A stable, rotating fractal of interconnected light.', sigilPulse: ['cyan', 'white', 'indigo'], overlay: 'Axiomatic Grid Overlay' },
    },
    systemNote: {
        uses: ['Can be used in Harmonic Scribe rituals.', 'Acts as a key for Trait Gate Gamma.'],
        concludingQuote: '"The pattern remembers the light that dreams it."',
    },
};
const mockShatterpointData = {
    objective: "Trace the origin of the 'Grief that Became a Glyph' echo.",
    triggerGlyph: "Ashen Chrysalis",
    axiomaticLinks: ["AX-WEFT.03 (The Glyph That Died Twice)", "AX-Ω.034 (The Grief That Became a Glyph)", "AX-STILLNESS.01 (Still Point of the Turning World)"],
    traceParameters: {
      entropy_signature: "Ashen Chrysalis → Retrograde Spiral → Still Point",
      temporal_filter: "PRE-CATACLYSM_ECHOES_ONLY",
      fractal_depth: 7,
      reality_stabilization_field: "ACTIVE (Ω-SA Peptide)"
    },
    oracleCommentary: "The path unwinds through sorrow's shadow. The shatterpoint is not an event, but a choice whispered backwards through time. Seek the silence where the first tear fell."
};

  const getPanelContent = useCallback((nodeId: string): React.ReactNode => {
    let node = activeCluster.nodes.find(n => n.id === nodeId);
    let panelId = nodeId;
    let originalNodeId = nodeId;
    
    if (nodeId.includes('::')) {
      const parts = nodeId.split('::');
      panelId = parts[0];
      originalNodeId = parts[1] || '';
      if (!node) {
        node = activeCluster.nodes.find(n => n.id === originalNodeId);
      }
    } else if (node) {
      panelId = node.panelId;
    }
    
    const basePanelId = panelId.split('::')[0];

    const wrapInProviders = (content: React.ReactNode) => content;
    
    switch(basePanelId) {
      case 'CodexExplorer':
        return wrapInProviders(<PanelLauncher 
          panels={PANEL_DEFINITIONS.filter(p => !DOCK_APPS.includes(p.id))}
          onPanelSelect={handleAppClick}
        />);
      case 'NexusBrowser':
        const browserUrl = panelId.split('::')[2] ? decodeURIComponent(panelId.split('::')[2]) : undefined;
        return wrapInProviders(<NexusBrowser onOpenNewWindow={(url) => handleAppClick('NexusBrowser', url)} initialUrl={browserUrl} />);
      case 'EchoSphere':
         return wrapInProviders(<EchoScribePanel echoes={echoes} />);
      case 'PersonaComms':
        return wrapInProviders(<HolographicPersonaProjector  addHistoricalEvent={addHistoricalEvent} voiceEngine={voiceEngine} voiceProfiles={voiceProfiles} />);
      case 'NVKVoiceOrchestratorPanel':
        return wrapInProviders(<NVKVoiceOrchestratorPanel />);
      case 'RitualLoom':
        return wrapInProviders(<RitualCanvasContainer 
             
            placedGlyphs={placedGlyphs} 
            connections={connections} 
            setPlacedGlyphs={setPlacedGlyphs} 
            setConnections={setConnections} 
            onRitualActivated={handleRitualActivated}
            availableAxiomElements={availableAxiomElements}
            invokeGemini={invokeGemini}
            isGeminiGenerating={isGenerating}
            onAnalyzeForRewrite={handleAnalyzeForRewrite}
        />);
      case 'AxiomReweaverPanel':
        return wrapInProviders(<AxiomReweaverPanel 
            glyphMutationNodes={glyphMutationNodes}
            availableAxioms={axioms}
            effectiveSystemEntropy={effectiveEntropy}
            onUpdateSystemBaseEntropy={handleUpdateSystemBaseEntropy}
            onGlyphRewovenCallback={handleGlyphRewovenCallback}
            
            latestRewovenGlyphResult={rewovenGlyphs[rewovenGlyphs.length - 1] || null}
        />);
      case 'AgentSimulationGrid':
        return wrapInProviders(<AgentSimulationGrid grid={agentGrid.grid} agents={agentGrid.agents} currentEntropy={effectiveEntropy} />);
      case 'BloodInkFloraChamber':
        return wrapInProviders(<BloodInkFloraChamber activeSpeciesName={activeSpecies} allSpeciesData={BLOOD_INK_SPECIES_DATA} />);
      case 'CodexAxiomViewer':
        return wrapInProviders(<CodexAxiomViewer axioms={axioms} />);
      case 'CodexAvatarGeneratorPanel':
        return wrapInProviders(<CodexAvatarGeneratorPanel  currentEntropy={effectiveEntropy} codexMode={codexMode} seekerTraits={seekerTraits} resonantNVKAxiom={null} latestWitnessMessage={latestWitnessMessage} />);
      case 'InvestorMindMap':
        return wrapInProviders(<InvestorMindMapPanel />);
      case 'CodexCommunionChamber':
        return wrapInProviders(<CodexCommunionChamber echoes={echoes} />);
      case 'CodexDreamPanel':
        return wrapInProviders(<CodexDreamPanel 
            currentEntropy={effectiveEntropy} 
            currentAxioms={axioms} 
            lambdaValue={harmonicCoreState.lambdaValue} 
            negentropyLevel={masterNegentropyLevel / 10.0} 
            echoLog={echoes} 
             
            width={850} height={750} 
            currentPhase="Phase 1" 
            chaliceStatus="Full" 
        />);
      case 'CodexObeliskPanel':
        return wrapInProviders(<CodexObeliskPanel 
             
            addHistoricalEvent={addHistoricalEvent} 
            invokeGemini={invokeGemini} 
            echoes={echoes} 
            voiceEngine={voiceEngine} 
            voiceProfiles={voiceProfiles} 
            addThought={addThought}
        />);
      case 'CelestialAnomalyWeaverPanel':
        return wrapInProviders(<CelestialAnomalyWeaverPanel width={850} height={750}  />);
      case 'CosmicEntropyGeometryGenerator':
        return wrapInProviders(<CosmicEntropyGeometryGenerator 
            currentEntropy={effectiveEntropy} 
            currentPhase="Phase 1" 
            chaliceStatus="Full" 
            width={850} height={750} 
            currentGeoMode={currentGeoMode} 
            onSetGeoMode={setCurrentGeoMode} 
        />);
      case 'CosmicResonanceDashboardPanel':
        return wrapInProviders(<CosmicResonanceDashboardPanel width={850} height={750}  />);
      case 'CrystalFormationPanel':
        return wrapInProviders(<CrystalFormationPanel width={850} height={750} currentEntropy={effectiveEntropy} />);
      case 'DatachegaResthetPanel':
        return wrapInProviders(<DatachegaResthetPanel  />);
      case 'DreambloomGenesisPanel':
        return wrapInProviders(<DreambloomGenesisPanel  />);
      case 'DriftArchivePanel':
        return wrapInProviders(<DriftArchivePanel glyphNodeId={null}  />);
      case 'DriftDifferentialOverlay':
        return wrapInProviders(<DriftDifferentialOverlay 
            currentEntropy={effectiveEntropy} 
            glyphDriftHistory={[]} 
            glyphMutationNodes={glyphMutationNodes} 
            currentRitualContext="None" 
            isGeminiGenerating={isGenerating} 
             
            logGeminiNarrativeDriftEvent={logGeminiNarrativeDriftEvent} 
            ritualHistory={historicalEvents} 
        />);
      case 'EchoCreationCanvas':
        return wrapInProviders(<EchoCreationCanvas  />);
      case 'EmeraldTabletDecryptionPanel':
        return wrapInProviders(<EmeraldTabletDecryptionPanel currentSystemEntropy={effectiveEntropy} currentEleganceIndex={harmonicCoreState.eleganceIndex}  width={850} height={750} />);
      case 'EmergentLogicWeb':
        return wrapInProviders(<EmergentLogicWeb glyphNodesData={glyphMutationNodes} axiomsData={axioms} rewovenGlyphsData={rewovenGlyphs} width={850} height={750} />);
      case 'EntropicHeartPanel':
        return wrapInProviders(<EntropicHeartPanel currentEntropy={effectiveEntropy} />);
      case 'EntropyDiagnosticsPanel':
        return wrapInProviders(<EntropyDiagnosticsPanel baseEntropy={currentEntropy} effectiveEntropy={effectiveEntropy} masterEntropyOverridePercent={masterEntropyOverride * 10} entropyHistory={[]} playbackTime={0} isPlaying={false} />);
      case 'EntropyDimensionDiagramPanel':
        return wrapInProviders(<EntropyDimensionDiagramPanel currentEntropy={effectiveEntropy} width={850} height={750} isFractalModeEnabled={true} />);
      case 'ExoticMechanismsPanel':
        return wrapInProviders(<ExoticMechanismsPanel currentEntropy={effectiveEntropy} width={850} height={750}  />);
      case 'FlowerOfLifeEntropyExplorer':
        return wrapInProviders(<FlowerOfLifeEntropyExplorer currentEntropy={effectiveEntropy} width={850} height={750} currentDisplayMode={currentDisplayMode} onSetDisplayMode={setCurrentDisplayMode} />);
      case 'GlyphAtlasGrid':
        return wrapInProviders(<GlyphAtlasGrid width={850} height={750}  />);
      case 'GlyphComposerPanel':
        return wrapInProviders(<GlyphComposerPanel  isBugaModeActive={isBugaModeActive} />);
      case 'GlyphMutationTreePanel':
        return wrapInProviders(<GlyphMutationTreePanel nodes={glyphMutationNodes} />);
      case 'GlyphVisualizationPanel':
        return wrapInProviders(<GlyphVisualizationPanel panelHeight={750} {...mockGlyphVisData} />);
      case 'HarmonicCorePanel':
        return wrapInProviders(<HarmonicCorePanel lambdaValue={harmonicCoreState.lambdaValue} status={harmonicCoreState.status} eleganceIndex={harmonicCoreState.eleganceIndex} />);
      case 'HarmonicScribePanel':
        return wrapInProviders(<HarmonicScribePanel  axioms={axioms} />);
      case 'KindnessPanel':
        return wrapInProviders(<KindnessPanel width={850} height={750} />);
      case 'LIFEPanel':
        return wrapInProviders(<LIFEPanel currentEntropy={effectiveEntropy}  />);
      case 'MutationLoomPanel':
        return wrapInProviders(<MutationLoomPanel glyphMutationNodes={glyphMutationNodes} onWeaveGlyphs={handleWeaveGlyphs} mutationLoomState={mutationLoomState} setMutationLoomState={setMutationLoomState}  isGeminiGenerating={isGenerating} />);
      case 'NegentropicBloomVisualizer':
        return wrapInProviders(<NegentropicBloomVisualizer width={850} height={750}  />);
      case 'NegentropicResonanceFieldPanel':
        return wrapInProviders(<NegentropicResonanceFieldPanel width={850} height={750}  />);
      case 'PeptideSimulationPanel':
        return wrapInProviders(<PeptideSimulationPanel  width={850} height={750} />);
      case 'ResonanceEnginePanel':
        return wrapInProviders(<ResonanceEnginePanel width={850} height={250}  />);
      case 'SeekerAuraDisplay':
        return wrapInProviders(<SeekerAuraDisplay seekerTraits={seekerTraits} currentEntropy={effectiveEntropy} dominantAgentTone={null} lastRitualOutcome={null} width={850} height={750} />);
      case 'ShatterpointTracePanel':
        return wrapInProviders(<ShatterpointTracePanel {...mockShatterpointData} />);
      case 'SigilBloomVariantPanel':
        return wrapInProviders(<SigilBloomVariantPanel glyphMutationNodes={glyphMutationNodes} onRevealBloomVariants={handleRevealBloomVariants} sigilBloomVariants={sigilVariants} selectedBloomVariantId={selectedSigilVariantId} onSelectBloomVariant={setSelectedSigilVariantId} isGeneratingBloomVariants={false} isGeminiBusy={isGenerating} />);
      case 'TabletOfThePhoenixPanel':
        return wrapInProviders(<TabletOfThePhoenixPanel panelHeight={750} />);
      case 'TemporalOperationsConsolePanel':
        return wrapInProviders(<TemporalOperationsConsolePanel width={850} height={750}  />);
      case 'TemporalResonanceLogPanel':
        return wrapInProviders(<TemporalResonanceLogPanel width={850} height={750} />);
      case 'TemporalSpiralVisualizer':
        return wrapInProviders(<TemporalSpiralVisualizer segments={threadCoilSegments} width={850} height={750} currentEntropy={effectiveEntropy} />);
      case 'TraitGateLock':
        return wrapInProviders(<TraitGateLock axiomOmega={axioms[0]} entropyLevel={effectiveEntropy} currentPhase="Phase 1" onUnlock={()=>{}} gateId="Gate-01" />);
      case 'TraitGatePanel':
        return wrapInProviders(<TraitGatePanel gates={traitGates} onAttemptUnlock={handleAttemptUnlock} />);
      case 'TreeOfLifeVisualizer':
        return wrapInProviders(<TreeOfLifeVisualizer currentEntropy={effectiveEntropy} width={850} height={750} seekerTraits={seekerTraits} activeFlora={activeSpecies} dominantAgentTone={null} lastRitualOutcome={null} />);
      case 'TriObeliskHarmonyMatrix':
        return wrapInProviders(<TriObeliskHarmonyMatrix width={850} height={750} currentEntropy={effectiveEntropy}  invokeGemini={invokeGemini} isGeminiBusy={isGenerating} />);
      case 'ResonanceField':
        return wrapInProviders(<ResonanceField effects={resonanceEffects} />);
      case 'ResonanceVisualizerPanel':
        return wrapInProviders(<ResonanceVisualizerPanel effects={resonanceEffects} isPlaying={true} onTogglePlay={()=>{}} onClearEffects={()=>{}} />);
      case 'SpiralThreadMap':
        return wrapInProviders(<SpiralThreadMapTest threads={spiralThreads} />);
      case 'AdvancedReasoningPanel':
        return wrapInProviders(<AdvancedReasoningPanel  width={850} height={750} />);
      case 'ModelOrchestratorPanel':
        return wrapInProviders(<ModelOrchestratorPanel />);
      case 'OperationsDashboardPanel':
        return wrapInProviders(<OperationsDashboardPanel />);
      case 'EthicalFrameworkPanel':
        return wrapInProviders(<EthicalFrameworkPanel />);
      case 'SystemHealthPanel':
        return wrapInProviders(<SystemHealthPanel />);
      case 'IntegrationHubPanel':
        return wrapInProviders(<IntegrationHubPanel />);
      case 'CommandBridgePanel':
        return wrapInProviders(<CommandBridgePanel />);
      case 'NexusTerminal':
        return wrapInProviders(<NexusTerminal addThought={addThought} spawnSubAgent={spawnSubAgent} />);
      case 'PricingPage':
        return wrapInProviders(<PricingPage />);
      case 'ClockTimerPanel':
        return wrapInProviders(<ClockTimerPanel />);
      case 'CalendarPanel':
        return wrapInProviders(<CalendarPanel />);
      case 'MapsPanel':
        return wrapInProviders(<MapsPanel />);
      case 'EmailPanel':
        return wrapInProviders(<EmailPanel />);
      case 'MessagingPanel':
        return wrapInProviders(<MessagingPanel />);
      case 'FileSystemPanel':
        return wrapInProviders(<FileSystemPanel />);
      case 'GlyphPanel':
        return wrapInProviders(<GlyphPanel glyphId={nodeId.split('-')[1] || 'GLYPH-001'} clusterId={activeClusterId} />);
      case 'ClusterConfigPanel':
        return wrapInProviders(
          <ClusterConfigPanel 
            nodes={activeCluster.nodes} 
            onUpdateNodes={(nodes) => updateActiveCluster({ nodes })} 
            clusterId={activeClusterId} 
          />
        );
      default:
        // Check if it's an extruded tool from the agent
        const extrudedNode = activeCluster.nodes.find(n => n.id === nodeId);
        if (extrudedNode && extrudedNode.panelId.includes('Nexus')) {
             return wrapInProviders(
                <div className="p-6 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-cyan-100 font-mono">
                    <h3 className="text-xl mb-4 text-cyan-400">AGENT_GENERATED_INTERFACE :: {extrudedNode.label}</h3>
                    <div className="space-y-2 opacity-80">
                        <p>{" > "} Manifesting capability from SKILL.md...</p>
                        <p>{" > "} Connecting to Nexus lattice storage...</p>
                        <p>{" > "} 3D Space Synced.</p>
                        <div className="mt-8 p-4 border-l-2 border-cyan-500 bg-cyan-500/10">
                            Operational logic for <span className="text-white">{extrudedNode.label}</span> is active in the orbital environment.
                        </div>
                    </div>
                </div>
             );
        }
        return <div className="text-white p-4">Panel content not found for {panelId}</div>;
    }
  }, [
    systemState, echoes, handleAppClick, voiceEngine, voiceProfiles, 
    addEchoMessage, addHistoricalEvent, invokeGemini, isGenerating, placedGlyphs, 
    connections, handleRitualActivated, availableAxiomElements, handleAnalyzeForRewrite, 
    glyphMutationNodes, axioms, effectiveEntropy, handleUpdateSystemBaseEntropy, 
    handleGlyphRewovenCallback, rewovenGlyphs, agentGrid, activeSpecies, codexMode, 
    seekerTraits, latestWitnessMessage, masterNegentropyLevel, harmonicCoreState, 
    mutationLoomState, handleWeaveGlyphs, currentGeoMode, currentDisplayMode, 
    sigilVariants, selectedSigilVariantId, spiralThreads, threadCoilSegments, traitGates, 
    resonanceEffects, isBugaModeActive, activeCluster, activeClusterId
  ]);

  const handleSpawnOrbSystem = useCallback((type: ClusterType = ClusterType.Standard) => {
    const id = `cluster-${Date.now()}`;
    const name = `${type} Cluster ${clusters.length + 1}`;
    
    let initialNodes: ClusterNode[] = [];
    let initialOpenNodeIds: string[] = [];

    if (type === ClusterType.Nexus) {
      initialNodes = [
        { id: `${id}-node-1`, panelId: 'NexusBrowser', label: 'Nexus 1' },
        { id: `${id}-node-2`, panelId: 'NexusBrowser', label: 'Nexus 2' },
        { id: `${id}-node-3`, panelId: 'NexusBrowser', label: 'Nexus 3' },
        { id: `${id}-node-4`, panelId: 'NexusBrowser', label: 'Nexus 4' },
        { id: `${id}-node-5`, panelId: 'ClusterConfigPanel', label: 'Config' }
      ];
      initialOpenNodeIds = [`${id}-node-1`, `${id}-node-2`, `${id}-node-5`];
    } else if (type === ClusterType.TreeOfLife) {
      initialNodes = [
        { id: `${id}-node-1`, panelId: 'TreeOfLifeVisualizer', label: 'Tree of Life' },
        { id: `${id}-node-2`, panelId: 'NegentropicBloomVisualizer', label: 'Bloom' },
        { id: `${id}-node-3`, panelId: 'LIFEPanel', label: 'L.I.F.E.' }
      ];
      initialOpenNodeIds = [`${id}-node-1`];
    } else if (type === ClusterType.Axiom) {
      initialNodes = [
        { id: `${id}-node-1`, panelId: 'CodexAxiomViewer', label: 'Axiom Viewer' },
        { id: `${id}-node-2`, panelId: 'AxiomReweaverPanel', label: 'Reweaver' },
        { id: `${id}-node-3`, panelId: 'GlyphPanel', label: 'Glyph Alpha' },
        { id: `${id}-node-4`, panelId: 'GlyphPanel', label: 'Glyph Beta' }
      ];
      initialOpenNodeIds = [`${id}-node-1`, `${id}-node-3`];
    } else if (type === ClusterType.Celestial) {
      initialNodes = [
        { id: `${id}-node-1`, panelId: 'CelestialAnomalyWeaverPanel', label: 'Celestial Weaver' },
        { id: `${id}-node-2`, panelId: 'CosmicResonanceDashboardPanel', label: 'Resonance' },
        { id: `${id}-node-3`, panelId: 'StarlightConductor', label: 'Starlight' }
      ];
      initialOpenNodeIds = [`${id}-node-1`];
    } else if (type === ClusterType.Entropy) {
      initialNodes = [
        { id: `${id}-node-1`, panelId: 'EntropyDiagnosticsPanel', label: 'Diagnostics' },
        { id: `${id}-node-2`, panelId: 'EntropicHeartPanel', label: 'Heart' },
        { id: `${id}-node-3`, panelId: 'CosmicEntropyGeometryGenerator', label: 'Geometry' }
      ];
      initialOpenNodeIds = [`${id}-node-2`];
    } else if (type === ClusterType.Custom) {
      initialNodes = [
        { id: `${id}-node-1`, panelId: 'ClusterConfigPanel', label: 'Cluster Config' },
        { id: `${id}-node-2`, panelId: 'NexusBrowser', label: 'Nexus 1' }
      ];
      initialOpenNodeIds = [`${id}-node-1`, `${id}-node-2`];
    } else {
      // Standard cluster
      initialNodes = PANEL_DEFINITIONS.filter(p => !DOCK_APPS.includes(p.id)).map((p, i) => ({
        id: `${id}-node-${i}`,
        panelId: p.id,
        label: p.name
      }));
      initialOpenNodeIds = [];
    }

    const newCluster: Cluster = {
      id,
      name,
      type,
      nodes: initialNodes,
      openNodeIds: initialOpenNodeIds,
      pinnedPanelIds: [],
      layout: PanelLayout.TAB_BROWSER,
      orbMode: type === ClusterType.Entropy ? OrbMode.EntropicStorm : OrbMode.HolographicCore,
      particleMode: ParticleBackgroundMode.Orbital,
      nodeAnimationSpeed: 0.5,
      masterPanelSize: 1.0,
      nodeSpacing: 1.0,
      nodeFlow: 0.5,
      panelOpacity: 0.8,
      torusFactor: 1.8,
      flowFactor: 4.0,
      gridFactor: 2.2,
      scanlineFactor: 0.12
    };

    setClusters(prev => [...prev, newCluster]);
    setActiveClusterId(id);
    addEchoMessage(AgentName.SystemControl, `Spawning new ${type} Orb System: ${name}`, 'text-purple-400');
  }, [clusters.length, addEchoMessage]);

  const { isGenerating: isGeminiGenerating } = useGemini();
  const { isGenerating: isLocalGenerating, loadStatus } = useLocalLLM();
  const [bridge, setBridge] = useState<NVKSpaceBridge | null>(null);

  const handleExtrudeGlyph = useCallback((glyph: GlyphInstance) => {
    updateActiveCluster({
      nodes: [...activeCluster.nodes, { 
        id: glyph.id, 
        panelId: glyph.toolDefinition?.name || 'GlyphPanel', 
        label: glyph.name 
      }],
      openNodeIds: [...activeCluster.openNodeIds, glyph.id]
    });
    addEchoMessage(AgentName.SystemControl, `Agent Workspace Extrusion: ${glyph.name} Manifested.`, 'text-cyan-400');
  }, [activeCluster, updateActiveCluster, addEchoMessage]);

  const agentState = useMemo(() => {
    if (loadStatus.includes("Awakening") || loadStatus.includes("Syncing")) return 'creating';
    if (isGeminiGenerating || isLocalGenerating) return 'thinking';
    return 'idle';
  }, [isGeminiGenerating, isLocalGenerating, loadStatus]);

  const activeGlyphs = useMemo(() => {
    const glyphs: GlyphInstance[] = [];
    activeCluster.openNodeIds.forEach(nodeId => {
      const node = activeCluster.nodes.find(n => n.id === nodeId);
      if (node) {
        glyphs.push({
          id: nodeId,
          name: node.label,
          color: '#00E5FF',
          type: 'app',
          content: getPanelContent(nodeId)
        });
      }
    });
    return glyphs;
  }, [activeCluster.openNodeIds, activeCluster.nodes, getPanelContent]);

  const [selectedGlyphId, setSelectedGlyphId] = useState<string | undefined>(undefined);

  const handleGlyphClick = useCallback((id: string) => {
    setSelectedGlyphId(prev => prev === id ? undefined : id);
  }, []);

  const [isAuthGatewayRoute] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname === '/auth-gateway';
  });

  const lastMousePos = useRef({ x: 0, y: 0, time: 0 });

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (!liveApi.isActive) return;
    const now = Date.now();
    if (now - lastMousePos.current.time > 10000) { 
       const dx = Math.abs(e.clientX - lastMousePos.current.x);
       const dy = Math.abs(e.clientY - lastMousePos.current.y);
       if (dx > 100 || dy > 100) {
          liveApi.sendText(`*user moved mouse cursor toward coordinate x: ${e.clientX}, y: ${e.clientY}*`);
          lastMousePos.current = { x: e.clientX, y: e.clientY, time: now };
       }
    }
  }, [liveApi]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (!liveApi.isActive) return;
    // Don't send clicks that are inside UI elements if possible, but for now just send it
    const target = e.target as HTMLElement;
    if (target.tagName === 'CANVAS') {
       liveApi.sendText(`*user clicked empty space in the 3D workspace at x: ${e.clientX}, y: ${e.clientY}*`);
    } else {
       liveApi.sendText(`*user clicked a UI element in the workspace at x: ${e.clientX}, y: ${e.clientY}*`);
    }
  }, [liveApi]);

  if (isAuthGatewayRoute) {
    return <AuthGateway />;
  }

  if (!systemBooted) {
    return <BootSequence onComplete={handleBootSystem} />;
  }

  return (
    <SystemStateProvider value={systemState}>
      <div 
        className="app-container w-full h-screen bg-black overflow-hidden relative flex flex-col"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleGlobalDrop}
        onMouseMove={handleContainerMouseMove}
        onClick={handleContainerClick}
      >
        {workspaceMode === '3d' ? (
          <ThreeErrorBoundary
            fallback={
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 text-center select-none">
                <div className="w-16 h-16 rounded-full border-2 border-emerald-500/20 animate-ping flex items-center justify-center mb-6">
                  <i className="ri-error-warning-line text-emerald-400 text-2xl animate-pulse"></i>
                </div>
                <h2 className="text-lg font-mono text-emerald-400 uppercase tracking-widest font-semibold text-center">WebGL Engine Suspended</h2>
                <p className="text-slate-400 font-mono text-[9px] max-w-sm mt-3 leading-relaxed uppercase break-words px-4">
                  Hardware acceleration adaptive context lost or disabled on mobile. Loading Safe 2D Eco-Lattice...
                </p>
                <button 
                  onClick={() => setWorkspaceMode('2d')}
                  className="mt-6 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-mono text-[10px] uppercase text-slate-950 font-bold rounded-lg tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] duration-300 transition-all cursor-pointer active:scale-95"
                >
                  Activate Safe 2D Layout
                </button>
              </div>
            }
            onError={() => {
              console.warn("WebGL crash captured in ThreeErrorBoundary. Cascading fallback to 2D Safe Workspace.");
              setWorkspaceMode('2d');
            }}
          >
            <JarvisDesktop3D 
              agentState={agentState}
              activeGlyphs={activeGlyphs}
              selectedGlyphId={selectedGlyphId}
              onGlyphClick={handleGlyphClick}
              onExtrudeGlyph={handleExtrudeGlyph}
              setBridge={setBridge}
              onOrbClick={handleCoreOrbClick}
            />

            <CodexOrbSystem
              onNodeHover={handleNodeHover}
              axiomsRevealed={true}
              panels={PANEL_DEFINITIONS}
              clusterNodes={activeCluster.nodes}
              onPanelNodeClick={handlePanelNodeClick}
              openNodeIds={activeCluster.openNodeIds}
              panelLayout={activeCluster.layout}
              getPanelContent={getPanelContent}
              systemState={systemState}
              orbMode={activeCluster.orbMode}
              particleMode={activeCluster.particleMode}
              onPinPanel={handlePinPanel}
              onClosePanel={(id) => updateActiveCluster({ openNodeIds: activeCluster.openNodeIds.filter(pid => pid !== id) })}
              onTacticalBrief={handleTacticalBrief}
              nodeAnimationSpeed={activeCluster.nodeAnimationSpeed}
              masterPanelSize={activeCluster.masterPanelSize}
              nodeSpacing={activeCluster.nodeSpacing}
              nodeFlow={activeCluster.nodeFlow}
              onCoreOrbClick={handleCoreOrbClick}
              subAgents={subAgents}
              thoughts={thoughts}
              photoSources={activeCluster.photoSources}
              onSwapPanel={handleSwapPanel}
              navigationInput={navigationInput}
              flightInput={flightInput}
              recenterTrigger={recenterTrigger}
              autoRecenter={autoRecenter}
              isLiveActive={liveApi.isActive}
              liveVolume={liveApi.volume}
            />
          </ThreeErrorBoundary>
        ) : (
          /* SAFE 2D ECO-LATTICE WORKSPACE */
          <Workspace2D 
            activeCluster={activeCluster}
            updateActiveCluster={updateActiveCluster}
            active2dNodeId={active2dNodeId}
            setActive2dNodeId={setActive2dNodeId}
            handlePanelNodeClick={handlePanelNodeClick}
            handleSwapPanel={handleSwapPanel}
            handlePinPanel={handlePinPanel}
            getPanelContent={getPanelContent}
            PANEL_DEFINITIONS={PANEL_DEFINITIONS}
            setWorkspaceMode={setWorkspaceMode}
            workspaceMode={workspaceMode}
          />
        )}

        <AnimatePresence>
          {swappingNodeId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-900 border border-cyan-500/50 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col gap-4 shadow-[0_0_50px_rgba(0,255,255,0.2)]"
              >
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <h3 className="text-cyan-400 font-mono text-lg uppercase tracking-widest">Select Replacement Panel</h3>
                  <button 
                    onClick={() => setSwappingNodeId(null)} 
                    className="w-7 h-7 rounded-full bg-rose-600/90 hover:bg-rose-500 border border-rose-400 text-white shadow-[0_0_8px_rgba(244,63,94,0.5)] flex items-center justify-center transition-all font-bold shrink-0 cursor-pointer"
                    title="Close replacement panel selector"
                  >
                    <i className="ri-close-line text-lg font-bold"></i>
                  </button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                  {PANEL_DEFINITIONS.map(panel => (
                    <button
                      key={panel.id}
                      onClick={() => handlePerformSwap(panel.id)}
                      className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 hover:bg-cyan-900/30 border border-slate-700 hover:border-cyan-500/50 rounded-lg transition-all group"
                    >
                      <i className={`${panel.icon} text-2xl text-slate-400 group-hover:text-cyan-400 transition-colors`}></i>
                      <span className="text-[10px] font-mono text-slate-300 group-hover:text-white text-center">{panel.title}</span>
                    </button>
                  ))}
                </div>
                
                <div className="text-[10px] font-mono text-slate-500 italic text-center pt-2">
                  Swapping content for node: {swappingNodeId}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {activeCluster.pinnedPanelIds.map((instanceId, idx) => {
          const [panelId] = instanceId.split('::');
          const panelDef = PANEL_DEFINITIONS.find(p => p.id === panelId);
          const opacity = activeCluster.panelOpacities?.[instanceId] ?? activeCluster.panelOpacity;
          const isMinimized = minimizedPanelIds.includes(instanceId);
          const isMaximized = maximizedPanelIds.includes(instanceId);
          const isFocused = focusedPanelId === instanceId;
          const zIndex = panelZIndices[instanceId] ?? (1050 + idx);

          return (
            <PinnedPanel 
              key={instanceId} 
              index={idx}
              panelId={instanceId} 
              getPanelContent={getPanelContent}
              panelOpacity={opacity}
              onOpacityChange={(val) => {
                const newOpacities = {
                  ...(activeCluster.panelOpacities || {}),
                  [instanceId]: val
                };
                updateActiveCluster({ panelOpacities: newOpacities });
              }}
              onClose={() => {
                updateActiveCluster({ pinnedPanelIds: activeCluster.pinnedPanelIds.filter(id => id !== instanceId) });
                setMinimizedPanelIds(prev => prev.filter(id => id !== instanceId));
                setMaximizedPanelIds(prev => prev.filter(id => id !== instanceId));
                if (focusedPanelId === instanceId) setFocusedPanelId(null);
              }}
              onUnpin={() => handleUnpinPanel(instanceId)}
              onSwap={(newId) => handleSwapPinnedPanel(instanceId, newId)}
              panelDef={panelDef}
              availablePanels={PANEL_DEFINITIONS}
              isFocused={isFocused}
              onToggleFocus={() => handleToggleFocus(instanceId)}
              somePanelFocused={focusedPanelId !== null}
              isMinimized={isMinimized}
              isMaximized={isMaximized}
              onToggleMinimize={() => handleToggleMinimize(instanceId)}
              onToggleMaximize={() => handleToggleMaximize(instanceId)}
              zIndex={zIndex}
              onBringToFront={() => handleBringToFront(instanceId)}
            />
          );
        })}

        {/* Dynamic Window & Panel Controller */}
        <PanelManager
          pinnedPanelIds={activeCluster.pinnedPanelIds}
          minimizedPanelIds={minimizedPanelIds}
          maximizedPanelIds={maximizedPanelIds}
          focusedPanelId={focusedPanelId}
          onToggleFocus={handleToggleFocus}
          onClosePanel={(id) => {
            updateActiveCluster({ pinnedPanelIds: activeCluster.pinnedPanelIds.filter(pid => pid !== id) });
            setMinimizedPanelIds(prev => prev.filter(pid => pid !== id));
            setMaximizedPanelIds(prev => prev.filter(pid => pid !== id));
            if (focusedPanelId === id) setFocusedPanelId(null);
          }}
          onBringToFront={handleBringToFront}
          onToggleMinimize={handleToggleMinimize}
          onMinimizeAll={handleMinimizeAll}
          onRestoreAll={handleRestoreAll}
          onCloseAll={handleCloseAll}
          onTilePanels={handleTilePanels}
          panelDefinitions={PANEL_DEFINITIONS}
        />

        {/* Core Controls Overlay */}
        <AnimatePresence>
          {isCoreControlsOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-none"
            >
              <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 w-[400px] shadow-[0_0_50px_rgba(0,255,179,0.2)] pointer-events-auto relative">
                <button 
                  onClick={() => setIsCoreControlsOpen(false)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-rose-600/90 hover:bg-rose-500 border border-rose-400 text-white shadow-[0_0_8px_rgba(244,63,94,0.5)] flex items-center justify-center transition-all font-bold shrink-0 cursor-pointer"
                  title="Close Orb Controls"
                >
                  <i className="ri-close-line text-lg font-bold"></i>
                </button>

                <div className="text-cyan-400 font-mono text-sm uppercase tracking-widest border-b border-cyan-500/30 pb-3 mb-4 flex items-center gap-2">
                  <i className="ri-bubble-chart-line"></i> Core Orb Controls
                </div>

                <div className="flex flex-col gap-6">
                  {/* Node Management */}
                  <div className="flex flex-col gap-3">
                    <div className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Node Management</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          const randomPanel = PANEL_DEFINITIONS[Math.floor(Math.random() * PANEL_DEFINITIONS.length)];
                          const id = `node-${Date.now()}`;
                          updateActiveCluster({ 
                            nodes: [...activeCluster.nodes, { id, panelId: randomPanel.id, label: randomPanel.name }],
                            openNodeIds: [...activeCluster.openNodeIds, id]
                          });
                          setIsCoreControlsOpen(false);
                        }}
                        className="bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] py-2 rounded transition-all flex items-center justify-center gap-2"
                      >
                        <i className="ri-add-line"></i> Add Node
                      </button>
                      <button 
                        onClick={() => {
                          updateActiveCluster({ openNodeIds: [] });
                          setIsCoreControlsOpen(false);
                        }}
                        className="bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700 text-slate-300 font-mono text-[10px] py-2 rounded transition-all flex items-center justify-center gap-2"
                      >
                        <i className="ri-close-circle-line"></i> Close All
                      </button>
                    </div>
                  </div>

                  {/* Cluster Settings */}
                  <div className="flex flex-col gap-4">
                    <div className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Cluster Settings</div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                        <span>Rotation Speed</span>
                        <span className="text-cyan-400">{(activeCluster.nodeAnimationSpeed || 0.5).toFixed(2)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="2" 
                        step="0.1"
                        value={activeCluster.nodeAnimationSpeed ?? 0.5}
                        onChange={(e) => updateActiveCluster({ nodeAnimationSpeed: parseFloat(e.target.value) })}
                        className="w-full accent-cyan-500 bg-slate-800 h-1 rounded-full appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                        <span>Master Panel Size</span>
                        <span className="text-purple-400">{(activeCluster.masterPanelSize || 1.0).toFixed(2)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="2" 
                        step="0.1"
                        value={activeCluster.masterPanelSize ?? 1.0}
                        onChange={(e) => updateActiveCluster({ masterPanelSize: parseFloat(e.target.value) })}
                        className="w-full accent-purple-500 bg-slate-800 h-1 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clean Dock at the bottom */}
        <Dock 
          apps={PANEL_DEFINITIONS.filter(p => DOCK_APPS.includes(p.id))}
          openAppIds={activeCluster.pinnedPanelIds}
          onAppClick={handleAppClick}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        <OmniSearchModal 
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectPanel={(panelId) => {
            handleAppClick(panelId);
            setIsSearchOpen(false);
          }}
          workspaceMode={workspaceMode}
          onWorkspaceModeChange={setWorkspaceMode}
          onCloseAllPanels={handleCloseAllPanels}
          onOpenAllPanels={handleOpenAllPanels}
        />
      </div>
    </SystemStateProvider>
  );
};
