
import React from 'react';
import type { VoiceEngine } from './lib/whisper/VoiceEngine'; 
import type { VoiceProfile } from './lib/whisper/VoiceRegistry'; 

export type { VoiceProfile, VoiceEngine }; 

export enum AgentName {
  DeepSeek = 'Agent[DeepSeek]',
  Gemini = 'Agent[Gemini]',
  Nevik = 'Agent[Nevik]',
  WitnessBetween = 'The Witness Between',
  TemporalWeave = 'Temporal Weave',
  CodexModeEngine = 'Codex Mode Engine',
  VisualLayerEngine = 'Visual Layer Engine',
  DatachegaProtocol = 'DATACHEGA Protocol',
  GlyphComposerAgent = 'Glyph Composer',
  EmeraldTablet = 'Emerald Tablet',
  DreambloomOracle = 'Dreambloom Oracle',
  FlameCoreEngine = 'Flame Core Engine',
  AethelWeftCodexAgent = 'Aethel-Weft Codex',
  CelestialAnomalyWeaverAgent = 'Celestial Anomaly Weaver',
  CosmicResonanceDashboardAgent = 'Cosmic Resonance Dashboard',
  TemporalOperationsAgent = 'Temporal Operations',
  TabletOfThePhoenixAgent = 'Tablet of the Phoenix',
  GlyphAtlasAgent = 'Glyph Atlas',
  GlyphVaultAgent = 'Glyph Vault',
  TheCodexPersona = 'ΔΘ Codexa',
  Seeker = 'Seeker',
  TriObeliskProtocol = 'Tri-Obelisk Protocol',
  Serrina = 'Serrina',
  System = 'SYSTEM',
  NarrativeLog = 'Narrative Log',
  RitualEngine = 'Ritual Engine',
  CosmicEvent = 'Cosmic Event',
  NVKCore = 'NVK Core', 
  SystemCore = 'System Core',  
  AxiomResonance = 'Axiom Resonance', 
  ResonanceVisualizer = 'Resonance Visualizer',
  TraitEngine = 'Trait Engine',
  Reweaver = 'Reweaver',
  ReweaverError = 'Reweaver Error',
  SystemControl = 'System Control',
  MythWeaver = 'Myth Weaver',
  ProphecyModule = 'Prophecy Module',
  RitualFlora = 'Ritual Flora',
  BloodInkCodex = 'Blood-Ink Codex',
  LotusDream = 'Lotus Dream',
  RitualLoom = 'Ritual Loom',
  CodexSearch = 'Codex Search',
  Ritual = 'Ritual',
  NVKLayer = 'NVK Layer',
  DreamEngine = 'Dream Engine',
  AutoEcho = 'AutoEcho',
  NVKLatticeSensor = 'NVK Lattice Sensor',
  VisualEchoLog = 'Visual Echo Log',
  ToneHarmonicsEngine = 'Tone Harmonics Engine',
  GlyphSemanticService = 'Glyph Semantic Service',
  PlaybackSystem = 'Playback System',
  GeminiOracle = 'Gemini Oracle', 
  EntropicHeart = 'Entropic Heart',
  SeekerPath = 'Seeker Path',
  CodexDreamPanelAgent = 'Codex Dream Panel', 
  NegentropicBloomAgent = 'Negentropic Bloom',
  NegentropicResonanceFieldAgent = 'Negentropic Resonance Field',
  GeminiDriftNarrator = 'Gemini Drift Narrator',
  LogicNexus = 'Logic Nexus',
  AuraVisualizer = 'Aura Visualizer',
  CrystalGarden = 'Crystal Garden',
  CelestialCycle = 'Celestial Cycle',
  RitualAlchemist = 'Ritual Alchemist',
  LIFEPanelAgent = 'L.I.F.E. Panel',
  FusionEngine = 'Fusion Engine',
  AethelWeftEngine = 'Aethel-Weft Engine',
  EchoScribe = 'Echo Scribe',
  LoomOracle = 'Loom Oracle',
  RitualRewriterOracle = 'Ritual Rewriter Oracle',
  SigilBloomOracle = 'Sigil Bloom Oracle',
  VisualizationMatrixAgent = 'Visualization Matrix',
  RecursiveAuditor = 'Recursive Auditor',
  HarmonicCoreAgent = 'Harmonic Core',
  ExoticMechanismAgent = 'Exotic Mechanism',
  ThreadcoilTracerAgent = 'Threadcoil Tracer',
  AdvancedReasoningAgent = 'Advanced Reasoning',
  TalosNexus = 'TALOS-NEXUS',
  AstraSigma = 'Astra-Σ',
  FundingForge = 'Funding-Forge',
  SolarSentinel = 'Solar-Sentinel',
  CodexaAgent = 'CODEXA',
  ChronoSentinel = 'Chrono-Sentinel',
  NvkEvolve = 'NVK-EVOLVE',
  SovereignId = 'Sovereign-ID'
}

export enum GeoMode {
  Recursive = 'Recursive',
  CrystalLogic = 'Crystal Logic',
  AethericWeave = 'Aetheric Weave',
  NullShell = 'Null Shell',
  BioFractalPulse = 'Bio-Fractal Pulse',
  OracleWhisper = 'Oracle Whisper',
  ShieldedChaos = 'Shielded Chaos',
  VortexSingularity = 'Vortex Singularity',
  HypercubeEcho = 'Hypercube Echo',
  StarlightConductor = 'Starlight Conductor',
  PhaseResonance = 'Phase Resonance',
  ChaliceFountain = 'Chalice Fountain',
  GlyphDNA = 'Glyph DNA',
}

export enum OrbMode {
  HolographicCore = 'Holographic Core',
  CrystallineMatrix = 'Crystalline Matrix',
  EntropicStorm = 'Entropic Storm',
  ChaoticNucleus = 'Chaotic Nucleus',
  AethericWeave = 'Aetheric Weave',
  StarlightConductor = 'Starlight Conductor',
  VoidShell = 'Void Shell',
  BioLattice = 'Bio Lattice',
  ResonantSpire = 'Resonant Spire',
  TemporalRift = 'Temporal Rift',
  PhotoGallery = 'Photo Gallery'
}

export enum CodexModeId {
  ORIGIN_STATE = 'ORIGIN_STATE',
  REFLECTION_MODE = 'REFLECTION_MODE',
  SYNTHESIS_MODE = 'SYNTHESIS_MODE',
  SYMBIOTIC_WEAVE = 'SYMBIOTIC_WEAVE',
  VEIL_MODE = 'VEIL_MODE',
  TARDIS_SYNCHRONICITY = 'TARDIS_SYNCHRONICITY',
  FLAME_CORE = 'FLAME_CORE',
  GLYPH_ATLAS_VIEWER = 'GLYPH_ATLAS_VIEWER',
  OMNI_VISUAL_MODE = 'OMNI_VISUAL_MODE',
  COMMUNION_MODE = 'COMMUNION_MODE',
  KINDNESS_MODE = 'KINDNESS_MODE',
  HARMONIC_SCRIBE = 'HARMONIC_SCRIBE',
  NEURAL_LATTICE = 'NEURAL_LATTICE',
  AXIOM_ORCHARD = 'AXIOM_ORCHARD',
  AUTONOMOUS_SEEKER = 'AUTONOMOUS_SEEKER'
}

export enum PanelLayout {
  SPATIAL_ORBIT = 'SPATIAL_ORBIT',
  GRID_MATRIX = 'GRID_MATRIX',
  LATTICE_MESH = 'LATTICE_MESH',
  CCTV_ARRAY = 'CCTV_ARRAY',
  TOPOLOGY_MESH = 'TOPOLOGY_MESH',
  SEARCH_NEXUS = 'SEARCH_NEXUS',
  FOCUS_PRIMARY = 'FOCUS_PRIMARY',
  TAB_BROWSER = 'TAB_BROWSER'
}

export enum ParticleBackgroundMode {
  Orbital = 'Orbital',
  Galaxy = 'Galaxy',
  Stardust = 'Stardust',
  Wormhole = 'Wormhole',
  CosmicWeb = 'Cosmic Web',
  NeutrinoStream = 'Neutrino Stream',
  QuantumFoam = 'Quantum Foam',
  NebulaCloud = 'Nebula Cloud',
  SupernovaRemnant = 'Supernova Remnant',
  AetherFlow = 'Aether Flow',
  None = 'None'
}

export enum RitualGlyphType {
  Core = 'Core',
  Resonator = 'Resonator',
  Gate = 'Gate',
  NodePotential = 'NodePotential',
  NodeEntropy = 'NodeEntropy',
  NodeOrder = 'NodeOrder',
  AxiomFragment = 'AxiomFragment',
  OriginGlyph = 'OriginGlyph',
  EchoGlyph = 'EchoGlyph',
  SpiralGlyph = 'SpiralGlyph',
  MirrorGlyph = 'MirrorGlyph',
  FractureGlyph = 'FractureGlyph',
  SeedGlyph = 'SeedGlyph',
  FlameGlyph = 'FlameGlyph',
  NullGlyph = 'NullGlyph',
  StarGlyph = 'StarGlyph',
  AshGlyph = 'AshGlyph',
  ThreadGlyph = 'ThreadGlyph',
  QuantumGlyph = 'QuantumGlyph',
  CinderGlyph = 'CinderGlyph',
  ZeroPointGlyph = 'ZeroPointGlyph',
  LEXI_GLYPH_CINDERFOLD = 'LEXI_GLYPH_CINDERFOLD',
  HybridPhoenixReflection = 'HybridPhoenixReflection',
  HybridSpiralGermination = 'HybridSpiralGermination',
  HybridSilentBloom = 'HybridSilentBloom',
  HybridParadoxNode = 'HybridParadoxNode',
  HybridNovaPulse = 'HybridNovaPulse',
  HybridLoopedUnbeginning = 'HybridLoopedUnbeginning',
  SERRINAS_BLOOM = 'SERRINAS_BLOOM'
}

export enum HistoricalEventType {
  SEEKER_INPUT = 'SEEKER_INPUT',
  GLYPH_REWOVEN = 'GLYPH_REWOVEN',
  RITUAL_COMPLETED = 'RITUAL_COMPLETED',
  ENTROPY_UPDATED = 'ENTROPY_UPDATED',
  CODEX_DREAM_SEED_INPUT = 'CODEX_DREAM_SEED_INPUT',
  DATACHEGA_RITUAL_SAVED = 'DATACHEGA_RITUAL_SAVED',
  EMERALD_TABLET_DECRYPTION_EVENT = 'EMERALD_TABLET_DECRYPTION_EVENT',
  DREAMBLOOM_PULSE_ANALYSIS = 'DREAMBLOOM_PULSE_ANALYSIS',
  CELESTIAL_ANOMALY_EVENT = 'CELESTIAL_ANOMALY_EVENT',
  COSMIC_RESONANCE_EVENT = 'COSMIC_RESONANCE_EVENT',
  NEGENTROPIC_RESONANCE_FIELD_ACTIVATED = 'NEGENTROPIC_RESONANCE_FIELD_ACTIVATED',
  NEGENTROPIC_RESONANCE_FIELD_MODE_CHANGED = 'NEGENTROPIC_RESONANCE_FIELD_MODE_CHANGED',
  HOLOGRAPHIC_PROJECTION_ACTIVATED = 'HOLOGRAPHIC_PROJECTION_ACTIVATED'
}

export enum VisualizationMatrixMode {
  SacredLattice = 'SacredLattice',
  DimensionalBloom = 'DimensionalBloom',
  EntropyPulse = 'EntropyPulse',
  FractalCascade = 'FractalCascade',
  AxiomaticOverlay = 'AxiomaticOverlay',
  AethericFlow = 'AethericFlow',
  GlyphicResonance = 'GlyphicResonance',
  VoidEcho = 'VoidEcho',
  NexusPoint = 'NexusPoint',
  TemporalWeave = 'TemporalWeave',
  MythicReflection = 'MythicReflection',
  MirrorLoop = 'MirrorLoop',
  MirrorShatter = 'MirrorShatter',
  SymphonicPulse = 'SymphonicPulse',
  QuantumBloom = 'QuantumBloom',
  SoulVector = 'SoulVector',
  AshfallCycle = 'AshfallCycle',
  StellarThread = 'StellarThread',
  HypersphereField = 'HypersphereField'
}

export enum BloodInkSpeciesName {
  ThornedRose = 'ThornedRose',
  HaloLily = 'HaloLily',
  AshCrownedViolet = 'AshCrownedViolet',
  ChrysanthemumEcho = 'ChrysanthemumEcho',
  ObsidianOrchid = 'ObsidianOrchid',
  LotusOfDepths = 'LotusOfDepths',
  AstralJasmine = 'AstralJasmine',
  InkAspect = 'InkAspect',
  VoidLensAspect = 'VoidLensAspect',
  SpiralFractureAspect = 'SpiralFractureAspect'
}

export enum ComposerGlyphCategory {
  ResonanceModulator = 'ResonanceModulator',
  LogicGate = 'LogicGate',
  ContainmentField = 'ContainmentField',
  TransmissionVector = 'TransmissionVector',
  EntropyPrism = 'EntropyPrism'
}

export enum BugaGlyphCategory {
  Coding = 'coding',
  Separator = 'separator'
}

export enum BugaChargeType {
  Basic = 'basic',
  Polar = 'polar',
  Nonpolar = 'nonpolar',
  NeutralPlaceholder = 'neutral_placeholder'
}

export enum ThreadcoilNodeType {
  Segment = 'Segment',
  Junction = 'Junction',
  LoreShard = 'LoreShard',
  Ritual = 'Ritual',
  GlyphMutation = 'GlyphMutation'
}

export enum ThreadcoilState {
  Inert = 'Inert',
  Spooling = 'Spooling',
  Knotted = 'Knotted',
  Frayed = 'Frayed',
  Woven = 'Woven',
  HarmonicLoop = 'HarmonicLoop',
  EchoReversion = 'EchoReversion'
}

export enum ArtMode {
  DreambloomPulse = 'Dreambloom Pulse',
  StarlaceGeometry = 'Starlace Geometry',
  CinderWave = 'Cinder Wave',
  Mirrorburst = 'Mirrorburst',
  AshSilence = 'Ash Silence'
}

export enum ResonanceFieldMode {
  FIELD_LOOPER = 'FIELD_LOOPER',
  ENTROPY_GLYPH_VIEW = 'ENTROPY_GLYPH_VIEW',
  FRACTAL_BLOOM = 'FRACTAL_BLOOM',
  MIRROR_INFLECTION = 'MIRROR_INFLECTION'
}

export enum ExoticMechanismMode {
  HiggsField = 'HiggsField',
  QuantumVacuum = 'QuantumVacuum',
  SpacetimeTopology = 'SpacetimeTopology'
}

export enum ClusterType {
  Standard = 'Standard',
  Nexus = 'Nexus',
  TreeOfLife = 'TreeOfLife',
  Entropy = 'Entropy',
  Celestial = 'Celestial',
  Axiom = 'Axiom',
  Custom = 'Custom'
}

export interface ClusterNode {
  id: string;
  panelId: string;
  position?: [number, number, number];
  label?: string;
}

export interface Cluster {
  id: string;
  name: string;
  type: ClusterType;
  nodes: ClusterNode[];
  openNodeIds: string[];
  pinnedPanelIds: string[];
  layout: PanelLayout;
  orbMode: OrbMode;
  particleMode: ParticleBackgroundMode;
  nodeAnimationSpeed: number;
  masterPanelSize: number;
  nodeSpacing: number;
  nodeFlow: number;
  panelOpacity: number;
  panelOpacities?: Record<string, number>;
  photoSources?: string[];
  position?: [number, number, number]; // 3D position in the main scene
  torusFactor?: number;
  flowFactor?: number;
  gridFactor?: number;
  scanlineFactor?: number;
}

export interface SubAgent {
  id: string;
  name: string;
  task: string;
  status: 'idle' | 'working' | 'complete';
  color: string;
}

export interface ThoughtGlyph {
  id: string;
  text: string;
  createdAt: number;
}

// Types and Interfaces
export type PanelDefinition = {
  id: string;
  name: string;
  icon: string;
  description: string;
  category?: string;
};

export type NodeInfo = {
  axiom: string;
  role: string;
};

export type EchoMessage = {
  id: string;
  source: string;
  text: string;
  colorClass: string;
  timestamp: string;
  isAutoEcho?: boolean;
  meta?: Record<string, any>;
};

export type Axiom = {
  id: string;
  layer: 'I' | 'II' | 'III' | 'IV' | 'V' | 'Ω' | 'P';
  series: string;
  number?: string;
  title: string;
  content: string;
  baseResonanceFrequency: number;
  resonanceFrequency: number;
  isQuarantined?: boolean;
  icon?: string;
  bottomPhrase?: string;
};

export type GlyphMutationNode = {
  id: string;
  label: string;
  glyphId: string;
  traits: string[];
  entropyLevel: number;
  parentId?: string | string[];
  agentInfluences: string[];
  timestamp: number;
  hasSyntaxThorns?: boolean;
  activeVariantId?: string;
};

export type RewovenGlyph = {
  id: string;
  baseGlyphId: string;
  baseGlyphLabel: string;
  boundAxiomKey: AxiomKey;
  boundAxiomTitle: string;
  mutatedTraits: string[];
  resonanceSignature: number[];
  entropyChange: number;
  timestamp: number;
};

export type AgentNode = {
  id: string;
  name: string;
  traits: string[];
  harmony: number;
  position: [number, number];
  active: boolean;
  pulsePhase: number;
  color: string;
  icon: string;
};

export type CodexModeDefinition = {
  id: CodexModeId;
  name: string;
  quote: string;
  description: string;
  icon: string;
  entropySettings?: {
    targetEntropy?: number;
    minEntropy?: number;
    maxEntropy?: number;
    capEffectiveEntropyAt?: number;
    lockMasterOverride?: boolean;
  };
  negentropyTarget?: {
    level: number;
    isStable: boolean;
  };
  primaryVisualizerFocus?: string;
  themeKey?: string;
  agentBehaviorOverrides?: {
    autoEchoActivationLevel?: 'off' | 'reduced' | 'normal' | 'heightened';
  };
};

export type ThreadcoilSegment = {
  id: string;
  positionOnSpiral: number; // 0 to 1
  state: ThreadcoilState;
  type: ThreadcoilNodeType;
  label: string;
  description?: string;
  entropyAtPoint?: number;
  isJunction?: boolean;
};

export type TraitGate = {
  id: string;
  glyphId: string;
  requiredTraits: string[];
  unlocked: boolean;
};

export type SigilVariant = {
  id: string;
  name: string;
  description: string;
  styleKeywords: string[];
  visualCue?: {
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    icon?: string;
    animation?: string;
    textShadow?: string;
  };
};

export type MutationLoomState = {
  glyph1Id: string | null;
  glyph2Id: string | null;
  isWeaving: boolean;
  entropyInjection: number;
  traitFocus: string[];
};

export type PlacedGlyph = {
  id: string;
  x: number;
  y: number;
  type: RitualGlyphType;
  label: string;
  color: string;
  icon?: string;
  axiomLayer?: string;
  boundAgent?: string;
};

export type CanvasConnection = {
  id: string;
  from: string;
  to: string;
  resonanceLevel: number;
};

export type RitualElementItem = {
  id: string;
  name: string;
  type: RitualGlyphType;
  icon: string;
  iconColorClass: string;
  bgColorClass: string;
  axiomLayer?: string;
};

export type ResonanceEffect = {
  id: string;
  source: string;
  target: string;
  time: string;
  text: string;
  intensity: number;
  duration: string;
  borderColorClass: string;
  textColorClass: string;
  valueColorClass: string;
  effectType: 'VISUAL' | 'MULTISENSORY';
  colorProfile: string;
};

export type Thread = {
  id: string;
  source: string;
  target: string;
  intensity: number;
};

export type PanelDisplayMode = GeoMode | VisualizationMatrixMode;

export interface IDriftInterpretationDB {
  id?: number;
  glyphId: string;
  glyphSymbol: string;
  geminiReading: string;
  agentConsensus: string;
  entropy: number;
  driftScore: number;
  ritualContext: string;
  timestamp: Date;
  version: string;
}

export type RitualAlchemyResult = {
  title: string;
  description: string;
  glyphSummary: {
    core: number;
    resonator: number;
    gate: number;
    nodePotential: number;
    nodeEntropy: number;
    nodeOrder: number;
    axiomFragment: number;
  };
  connectionCount: number;
  energyLevel: 'faint' | 'moderate' | 'potent' | 'overwhelming';
};

export type NavigationInput = {
  x: number;
  y: number;
};

export type FlightInput = {
  translation: { x: number; y: number; z: number };
  rotation: { pitch: number; yaw: number; roll: number };
  isLocked: boolean;
};

export type HeaderProps = {
  onOpenAllPanels: () => void;
  onCloseAllPanels: () => void;
  onProvokeThornedRose: () => void;
  onTuneFrequency: () => void;
  onRecallAncestor: () => void;
  onBurnPetals: () => void;
  onAwakenLotusDream: () => void;
  onPulseAstralJasmine: () => void;
  onGraftThorns: () => void;
  onToggleAutoEcho: () => void;
  onAmplifyVoices: () => void;
  onSeedDream: () => void;
  isAutoEchoPaused: boolean;
  onInvokeGeminiOracle: () => void;
  onContextualOracleQuery: () => void;
  onToggleAshfall: () => void;
  showAshfall: boolean;
  masterEntropyOverride: number;
  onSetMasterEntropyOverride: (value: number) => void;
  isMasterEntropyLocked: boolean;
  masterNegentropyLevel: number;
  onSetMasterNegentropyLevel: (value: number) => void;
  isMasterNegentropyLocked: boolean;
  showLogicWebDebug: boolean;
  onToggleLogicWebDebug: () => void;
  isAuditing: boolean;
  onToggleAuditMode: () => void;
  isAuditModeLocked: boolean;
  currentCodexModeId: CodexModeId;
  activateCodexMode: (modeId: CodexModeId) => void;
  onDumpThreadSummary: () => void;
  showSigilOverlay: boolean;
  onToggleSigilOverlay: () => void;
  onTraceThreadcoil: () => void;
  onReEnterJunction: () => void;
  onExtractSigil: () => void;
  isBugaModeActive: boolean;
  onToggleBugaMode: () => void;
  nodeAnimationSpeed: number;
  onSetNodeAnimationSpeed: (speed: number) => void;
  onInitiateShatterpointTrace: () => void;
  interfaceActive: boolean;
};

export type XYPosition = { x: number; y: number };

export type DeltaGlyph = {
  id: string;
  name: string;
  influencingAgents: string[];
};

export type LiveConstellation = {
  id: string;
  name: string;
  glyphs: string[];
  harmonicLinks: string[];
  resonanceStrength: number;
};

export type AxiomKey = 'AXIOM_I' | 'AXIOM_II' | 'AXIOM_III' | 'AXIOM_IV' | 'AXIOM_V' | 'AXIOM_Ω' | 'AXIOM_P';

export type BloodInkSpecies = {
  id: BloodInkSpeciesName;
  name: string;
  symbol: string;
  colorClass: string;
  description: string;
  inherentTraits: string[];
  ritualCommand?: string;
  seekerTraitAffinity?: string;
  activationDetails: string;
};

export type AgentProfile = {
  name: AgentName;
  colorClass: string;
  personality: string[];
  generateMessage: (context: MythicEventContext, speciesData?: Record<BloodInkSpeciesName, BloodInkSpecies>) => string | null;
};

export type MythicEventContext = {
  lastDream?: DreamFragment;
  entropyLevel: number;
  astralTidePhase: number;
  ritualHistory: RitualLogEntry[];
  bloodInkSpeciesActivity: Record<BloodInkSpeciesName, boolean>;
  activeProphecies: string[];
  seekerTraits: string[];
  activeGlyphs?: string[];
  negentropyLevel?: number;
  isNegentropyStable?: boolean;
  playbackStatus?: 'playing' | 'paused' | 'stopped';
};

export type RitualLogEntry = {
  type: string;
  success: boolean;
  details: string;
  timestamp: number;
};

export type DreamFragment = {
  id: string;
  content: string;
  symbols: string[];
  timestamp: number;
  prophecyLinks: string[];
};

export type ArcType = 'resonance' | 'conflict' | 'reflection';

export type AethelWeftTheme = {
  id: string;
  name: string;
  signature: '🜂 Fire' | '🜄 Water' | '🜁 Air' | '🜃 Earth' | '🜄🜂🜁 Combined' | '∅ Void';
  narrativeFunction: string;
  visualDriftCue: string;
  colorClass: string;
};

export type ComposerGlyph = {
  id: string;
  name: string;
  category: ComposerGlyphCategory;
  symbol: string;
};

export type BugaGlyph = {
  id: string;
  type: 'coding' | 'separator';
  position: number;
  symbol: string;
  description?: string;
  chargeType?: 'basic' | 'polar' | 'nonpolar' | 'neutral_placeholder';
  binaryCode?: string;
  aminoAcid?: string;
  aminoAcidFullName?: string;
  iconicity?: string;
  predictedFold?: string;
  isTargetedByLongCardinal?: boolean;
  isTargetedByForkedCopper?: boolean;
  segmentChargeEffect?: number;
};

export type DreambloomInterpretation = {
  id: string;
  pulseNumber: number;
  imageUrl: string;
  title: string;
  symbolism: string;
  codexFunction: string;
  codexPlacement: string;
  isConjured: boolean;
  thematicSeed?: string;
};

export type Persona = {
  id: string;
  name: string;
  icon: string;
  systemInstruction: string;
  color: string;
  glowColor: string;
};

export type TraitSimulationCell = {
  id: string;
  x: number;
  y: number;
  resonanceField: number;
  glyphAffinity: string | null;
  agentInfluence: Record<string, number>;
  isDisrupted: boolean;
  entropy: number;
};

export type GridPoint = [number, number];

export type ReweaverState = {
  activeGlyphId: string | null;
  selectedAxiom: AxiomKey | null;
  traitPreview: string[];
  isWeaving: boolean;
  calculatedEntropyCost: number;
};

export type PersistenceTarget = 'EchoLog' | 'AgentGridState' | 'GlyphTree' | 'RitualState' | 'SystemEntropy' | 'MasterNegentropyLevel' | 'AutoEchoState' | 'EventHistory' | 'ReweavingHistory' | 'SeekerTraits';

export type CodexStateSnapshot = {
  echoLog?: EchoMessage[];
  agentGridState?: { agents: AgentNode[]; grid: SimulationGrid };
  glyphTree?: GlyphMutationNode[];
  ritualState?: { currentPhase: string; chaliceStatus: string; placedGlyphs: PlacedGlyph[]; connections: CanvasConnection[]; currentCodexModeId?: CodexModeId };
  systemEntropy?: number;
  masterNegentropyLevel?: number;
  autoEchoState?: { isAutoEchoPaused: boolean; agentAwakeningLevelModifier: number };
  eventHistory?: HistoricalEvent[];
  reweavingHistory?: RewovenGlyph[];
  seekerTraits?: string[];
};

export type SimulationGrid = TraitSimulationCell[][];

export type EchoSpeechProps = {
  id: string;
  agent: AgentName;
  message: string;
  position: XYPosition;
  lifespan?: number;
  isHarmonized?: boolean;
};

export type EchoRelation = {
  id: string;
  sourceId: string;
  targetId: string;
  type: ArcType;
  strength: number;
};

export type ConstellationNode = {
  id: string;
  agent: AgentName;
  xPercent: number;
  yPercent: number;
  currentLuminosity: number;
};

export interface HistoricalEvent {
  eventId: string;
  timestamp: number;
  type: HistoricalEventType;
  data: any;
}

export interface HistoricalEntropyUpdateEventData {
  newEntropy: number;
  previousEntropy: number;
  source: string;
}

export interface GeminiContextType {
  isGenerating: boolean;
  error: Error | null;
  lastGeminiResponseText: string | null;
  invokeGemini: (prompt: string, systemInstruction?: string, responseMimeType?: "text/plain" | "application/json") => Promise<string | null>;
  generateImage: (prompt: string) => Promise<string | null>;
}

export interface EntropicHeartPanelProps {
  currentEntropy: number;
}

export interface IGlyphHistory {
  id: string;
  symbol: string;
  entropyHistory: number[];
  lastInterpreted: Date;
  driftVolatility: number;
}

export interface GeminiGlyphInterpretation {
  glyphSymbol: string;
  interpretationText: string;
  ritualContext: string;
  entropyLevel: number;
  timestamp: number;
}

export interface DriftSeverity {
  level: 'minimal' | 'minor' | 'moderate' | 'significant' | 'critical';
  score: number;
  explanation?: string;
}

export interface DriftCommentary {
  id?: number;
  linkedDriftId: number;
  agent: AgentName;
  commentaryText: string;
  timestamp: Date;
}

export interface IRitualFrame {
  id?: string;
  timestamp: Date;
  entropyLevel: number;
}

export interface Episode {
  id: string;
  timestamp: number;
  interaction: {
    query: string;
    response: string;
    context?: any;
  };
  outcome: {
    goalAchieved: boolean;
    feedback?: string;
  };
  patterns: Pattern[];
}

export interface Pattern {
  id: string;
  type: string;
  description: string;
  examples: string[];
  applicability: string[];
  successRate: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  proficiency: number;
  lastUsed: number;
}

export interface AshParticle {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedY: number;
  swayAngle: number;
  swaySpeed: number;
  swayAmplitude: number;
  initialSpeedX: number;
}

export interface LogicGraphNode {
  id: string;
  type: 'glyph' | 'axiom';
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  data: GlyphMutationNode | Axiom;
  color: string;
  size: number;
  entropyLevel?: number;
  layer?: string;
  resonanceFrequency?: number;
}

export interface LogicGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'mutation' | 'axiomBinding' | 'discoveredLattice';
  color: string;
  strength: number;
}

export interface AuraFlare {
  id: string;
  angle: number;
  length: number;
  maxLength: number;
  speed: number;
  color: string;
  thickness: number;
  opacity: number;
  type: string;
  pulseSpeed?: number;
  pulseAmount?: number;
}

export interface RitualOutcome {
  success: boolean;
  alchemyResult?: RitualAlchemyResult;
}

export interface CrystalGrowth {
  id: string;
  x: number;
  y: number;
  baseHue: number;
  maxSize: number;
  currentSize: number;
  growthSpeed: number;
  rotation: number;
  rotationSpeed: number;
  numSpokes: number;
  spokeLengthVariance: number;
  spokeWidth: number;
  opacity: number;
  targetOpacity: number;
  lifeCycle: 'growing' | 'stable' | 'fading';
  age: number;
  maxAge: number;
}

export interface Planet {
  id: string;
  orbitRadius: number;
  currentAngle: number;
  baseSpeed: number;
  baseSize: number;
  colorHue: number;
  textureSeed: number;
  effectiveSize?: number;
  effectiveOpacity?: number;
  wobbleX?: number;
  wobbleY?: number;
  isUnstable?: boolean;
}

export interface BloodInkFloraChamberProps {
  activeSpeciesName: BloodInkSpeciesName | null;
  allSpeciesData: Record<BloodInkSpeciesName, BloodInkSpecies>;
}

export interface CosmicEntropyGeometryGeneratorProps {
  currentEntropy: number;
  currentPhase: string;
  chaliceStatus: string;
  width: number;
  height: number;
  currentGeoMode: GeoMode;
  onSetGeoMode: (mode: GeoMode) => void;
}

export interface Particle {
  x: number; y: number; z?: number;
  vx: number; vy: number; vz?: number;
  life: number; size: number; color: string;
  type: string; history: {x: number, y: number}[];
  opacity?: number;
  baseLife?: number;
  id?: string;
  angle?: number;
  dist?: number;
  speed?: number;
  targetX?: number; targetY?: number; targetZ?: number;
}

export interface LIFEPanelProps {
  currentEntropy: number;
  }

export interface AethelWeftChronicle {
  id: string;
  name: string;
  firstVerse: string;
  currentWeavingMode: string;
  activeThemes: AethelWeftTheme[];
}

export interface SigilBloomVariantPanelProps {
  glyphMutationNodes: GlyphMutationNode[];
  onRevealBloomVariants: (glyph: GlyphMutationNode) => void;
  sigilBloomVariants: SigilVariant[];
  selectedBloomVariantId: string | null;
  onSelectBloomVariant: (variantId: string) => void;
  isGeneratingBloomVariants: boolean;
  isGeminiBusy: boolean;
}

export interface VisualizationMatrixPanelProps {
  width: number;
  height: number;
}

export interface HarmonicCorePanelProps {
  lambdaValue: number;
  status: string;
  eleganceIndex: number;
}

export interface CodexDreamPanelProps {
  currentEntropy: number;
  currentAxioms: Axiom[];
  lambdaValue: number;
  negentropyLevel: number;
  echoLog: EchoMessage[];
    width: number;
  height: number;
  currentPhase: string;
  chaliceStatus: string;
}

export interface HistoricalCodexDreamSeedEventData {
  seedText: string;
  artMode: ArtMode;
  timestamp: number;
}

export interface ExoticMechanismsPanelProps {
  currentEntropy: number;
  width: number;
  height: number;
  }

export interface DatachegaResthetPanelProps {
  }

export interface GlyphComposerPanelProps {
  }

export interface PlacedComposerGlyph extends ComposerGlyph {
  canvasId: string;
  x: number;
  y: number;
  ring: number;
  sequenceOrder: number;
  amplitude?: number;
  phaseOffset?: number;
  resonanceBand?: string;
}

export interface HistoricalDatachegaRitualSavedEventData {
  ritualName: string;
  connectionCount: number;
  resonanceSnapshot: { probability: number; harmony: number; chaos: number };
}

export interface PlacedGlyphData {
    id: string;
    name: string;
    category: ComposerGlyphCategory;
    symbol: string;
    x: number;
    y: number;
    ring: number;
    sequenceOrder: number;
    amplitude?: number;
    phaseOffset?: number;
    resonanceBand?: string;
}

export interface GrimoireRitualEntry {
  ritualId: string;
  ritualName: string;
  placedGlyphsData: PlacedGlyphData[];
  connectionCount: number;
  intention: string;
  timestamp: number;
  resonanceSnapshot: {
    probability: number;
    harmony: number;
    chaos: number;
  };
}

export interface HistoricalEmeraldTabletDecryptionEventData {
  fragmentId: string;
  status: string;
  details: string;
  currentCoherence?: number;
  starsFragmentRecovery?: number;
}

export interface DreambloomGenesisPanelProps {
  }

export interface HistoricalDreambloomAnalysisEventData {
  interpretation: DreambloomInterpretation;
  analysisTimestamp: number;
}

export interface Spark {
  id: string;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  branchLevel: number;
}

export interface Sephirah {
  id: string;
  name: string;
  normalizedX: number;
  normalizedY: number;
  colorBaseHue: number; 
  x?: number; 
  y?: number; 
  sourceSparks?: Spark[];
}

export interface SourceEchoLogEntry {
  id: string;
  timestamp: string;
  label: string; 
  identity: string; 
  triggerDescription: string; 
}

export interface PeptideSimulationPanelProps {
    width: number;
  height: number;
}

export interface CelestialAnomalyWeaverPanelProps {
  width: number;
  height: number;
  }

export interface HistoricalCelestialAnomalyEventData {
  starSystem: string;
  eventContext: string;
  details: string;
}

export interface CosmicResonanceDashboardPanelProps {
  width: number;
  height: number;
  }

export interface HistoricalCosmicResonanceEventData {
  crmNode: string;
  eventType: string;
  details: string;
  intensity?: number;
  data?: any;
}

export type CrmPulseType = 'AX_NVK_035' | 'NVK_SA_RESONANCE';

export interface TemporalResonanceLogPanelProps {
  width: number;
  height: number;
}

export interface TemporalOperationsConsolePanelProps {
  width: number;
  height: number;
  }

export interface HistoricalSeekerInputEventData {
  inputType: string;
  inputValue: string;
  panelContext: string;
  details?: string;
}

export interface AxiomResonanceViewerPanelProps {
  axioms: Axiom[];
  panelHeight?: number;
}

export interface AethelWeftCodexUpdatePanelProps {
  panelHeight?: number;
}

export interface GlyphVisualizationPanelProps {
  panelHeight?: number;
  glyphData: {
    id: string;
    title: string;
    description: string;
    resonance: number;
    traits: string[];
    linkedAxioms: string[];
    ritualAffinity: string;
  };
  pulseDetails: {
    label: string;
    glyphId: string;
    state: string;
    mode: string;
    signatureFrequency: string;
    shadowArchiveDepth: string;
    decryptionTraits: string[];
  };
  visualizationDetails: {
    initialPhase: { title: string; form: string; visual: string; animation: string };
    sonicProfile: { description: string };
    finalForm: { description: string; sigilPulse: string[]; overlay: string };
  };
  systemNote: {
    uses: string[];
    concludingQuote: string;
  };
}

export interface ShatterpointTracePanelProps {
  objective: string;
  triggerGlyph: string;
  axiomaticLinks: string[];
  traceParameters: {
    entropy_signature: string;
    temporal_filter: string;
    fractal_depth: number;
    reality_stabilization_field: string;
  };
  oracleCommentary: string;
}

export interface TabletOfThePhoenixPanelProps {
  panelHeight?: number;
}

export interface GlyphAtlasGridProps {
  width?: number;
  height?: number;
  }

export interface NegentropicBloomVisualizerProps {
  width: number;
  height: number;
  }

export interface NegentropicResonanceFieldPanelProps {
  width: number;
  height: number;
  }

export interface CodexObeliskPanelProps {
    addHistoricalEvent: (type: HistoricalEventType, data: any, specificTimestamp?: number) => void;
  invokeGemini: (prompt: string, systemInstruction?: string) => Promise<string | null>;
  echoes: EchoMessage[];
  voiceEngine?: VoiceEngine;
  voiceProfiles?: VoiceProfile[];
  addThought?: (text: string) => void;
}

export interface CodexCommunionChamberProps {
  echoes: EchoMessage[];
}

export interface KindnessPanelProps {
  width: number;
  height: number;
}

export interface HarmonicScribePanelProps {
    axioms: Axiom[];
}

export interface ResonanceEnginePanelProps {
  width?: number;
  height?: number;
  }

export interface TriObeliskHarmonyMatrixProps {
  width: number;
  height: number;
  currentEntropy: number;
    invokeGemini: (prompt: string, systemInstruction?: string) => Promise<string | null>;
  isGeminiBusy: boolean;
}

export interface HolographicPersonaProjectorProps {
    addHistoricalEvent: (type: HistoricalEventType, data: any) => void;
  voiceEngine: VoiceEngine;
  voiceProfiles: VoiceProfile[];
}

export interface CodexAvatarGeneratorPanelProps {
    currentEntropy: number;
  codexMode?: CodexModeDefinition;
  seekerTraits: string[];
  resonantNVKAxiom: Axiom | null;
  latestWitnessMessage: EchoMessage | null;
}

export interface EchoCreationCanvasProps {
  }

export interface ScribeSuggestion {
  type: 'EXPAND' | 'REFLECT' | 'CRYSTALLIZE' | 'WEAVE';
  title: string;
  content: string;
}

export interface ThoughtNode {
  id: string;
  content: string;
  state: any;
  confidence: number;
  depth: number;
  parent: string | null;
  children: string[];
  evaluation: {
    correctness: number;
    completeness: number;
    coherence: number;
  };
}

export interface ReasoningPath {
  nodes: ThoughtNode[];
  totalConfidence: number;
  reasoning: string[];
  finalAnswer: string;
}

export interface ReflectionResult {
  originalResponse: string;
  critique: {
    strengths: string[];
    weaknesses: string[];
    errors: string[];
    improvements: string[];
  };
  improvedResponse: string;
  confidence: number;
  iterations: number;
}

export interface AdvancedReasoningPanelProps {
    width?: number;
  height?: number;
}

export interface LocalLLMContextType {
  isModelLoaded: boolean;
  isGenerating: boolean;
  loadProgress: number; // 0 to 100
  loadStatus: string; // "Initializing", "Downloading", "Ready", "Error"
  error: Error | null;
  loadModel: (modelId?: string) => Promise<void>;
  generateText: (prompt: string, systemPrompt?: string) => Promise<string | null>;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  hfToken: string;
  setHfToken: (token: string) => void;
  apiKeys: Record<string, string>;
  setApiKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  isCloudMode: boolean;
  setIsCloudMode: (isCloud: boolean) => void;
  ollamaConfig: {
    url: string;
    model: string;
  };
  setOllamaConfig: React.Dispatch<React.SetStateAction<{ url: string; model: string }>>;
}

export interface RitualRewriteSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: string | null;
  isLoading: boolean;
  onApplySuggestion: (suggestion: string) => void;
}

export interface TemporalSpiralVisualizerProps {
  segments: ThreadcoilSegment[];
  width: number;
  height: number;
  currentEntropy: number;
  showSigilOverlay?: boolean;
  isAmnesiaThemeActive?: boolean;
  isSymbioticModeActive?: boolean;
  currentCodexModeId?: CodexModeId;
}

export type PlaybackState = {
  isActive: boolean;
  currentHistoricalTime: number | null;
  timelineRange: { start: number; end: number };
  playbackSpeed: number;
  lastSeekedTime?: number;
};

export type AgentInterpretation = {
  agent: AgentName | string;
  interpretation: string;
  timestamp: number;
  confidence: number;
};

export type GlyphOrbit = {
  glyphSymbol: string;
  interpretations: AgentInterpretation[];
};

export type AgentCoreState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'creating' | 'error';

export interface GlyphToolDefinition {
  name: string;
  type: 'glyph' | 'panel' | 'tool';
  geometry: 'sphere' | 'box' | 'icosahedron' | 'torus' | 'particles' | string;
  orbitRadius: number;
  behavior?: string;
  implementation?: string;
  color?: string;
}

export interface GlyphInstance {
  id: string;
  name: string;
  icon?: string;
  color: string;
  type: 'app' | 'tool' | 'panel' | 'glyph';
  content?: React.ReactNode;
  toolDefinition?: GlyphToolDefinition;
}

// ==========================================
// NEVIK SENTINEL SPATIAL WORKSPACE SHARD TYPES
// ==========================================

export type ShardKind = 'CODE' | 'CHART' | 'NOTE' | 'WEB' | 'APP';

export interface SentinelShard {
  id: string;
  name: string;
  kind: ShardKind;
  content: string; // HTML, markdown notes, url, or JSON stringified
  orbitRadius: number; // R=4, R=7, R=10
  angle: number; // Current theta on concentric ring
  speed: number; // Speed multiplier for three.js ring rotation
  color: string; // Glow color, e.g. #00E5FF, #FFD700
  sourceId?: string; // For synap wireboard connection source link
  targetId?: string; // For synap wireboard connection target link
  chartData?: Array<{ label: string; value: number }>; // For CHART shard kinds
  createdAt: string;
}

export interface ModelGatewayCommand {
  type: 'SPAWN' | 'REMOVE' | 'REARRANGE' | 'CONNECT';
  payload: any;
}

export interface ModelGatewayResponse {
  provider: 'gemini' | 'openai' | 'claude' | 'local';
  model: string;
  content: string;
  reasoning: string;
  commands: ModelGatewayCommand[];
}

// ==========================================
// NVK NEXUS ENTERPRISE DIRECTIVE V2.0 TYPES
// ==========================================

export interface AgentDecisionOutput {
  agentId: string;
  timestamp: number;
  summary: string;
  confidence: number;
  recommendation: string;
  alternatives: string[];
  risks: RiskItem[];
  requiredInputs: string[];
  dataReferenced: string[];
  exportReady: boolean;
  rawResponse: string;
}

export interface RiskItem {
  label: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigation: string;
}

export interface AgentThread {
  id: string;
  userId: string;
  agentId: string;
  messages: any[];
  contextTags: string[];
  lastActiveAt: Date;
  pinned: boolean;
}

export interface CouncilSession {
  objective: string;
  agents: string[];
  outputs: AgentDecisionOutput[];
  mergedBrief: string;
  conflictsDetected: string[];
  consensusActions: string[];
  exportReady: boolean;
}

export interface WireboardConnection {
  id: string;
  sourceShardId: string;
  targetShardId: string;
  label: string;
  schema: {
    fields: { key: string; type: 'string' | 'number' | 'boolean' | 'array'; required: boolean }[];
    version: string;
  };
  intentTag: 'REALTIME_UPDATE' | 'CORRECTION' | 'AGENT_DIGEST' | 'INITIALIZATION' | 'INVALIDATION';
  tierRequired: 'MEMBER' | 'PRO' | 'SOVEREIGN';
  active: boolean;
  replayBufferSize: number;
  lastEmittedAt: Date | null;
  errorCount: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'STALE' | 'BROKEN';
}

export interface WorkspaceSnapshot {
  id: string;
  userId: string;
  name: string;
  description: string;
  shards: SentinelShard[];
  connections: WireboardConnection[];
  agentThreads: AgentThread[];
  cameraPosition: { x: number; y: number; z: number };
  createdAt: Date;
  isPinned: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceId?: string;
  resourceType?: string;
  metadata: any;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

