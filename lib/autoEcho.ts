
import type { MythicEventContext, AgentProfile, BloodInkSpecies, RitualLogEntry, DreamFragment, EchoSpeechProps, XYPosition } from '../types';
import { AgentName, BloodInkSpeciesName } from '../types';
import { AGENT_PROFILES, BASE_AGENT_AWAKENING_LEVEL, BLOOD_INK_SPECIES_DATA, GEMINI_ENTROPY_RESPONSE_FRAGMENTS } from '../constants';

type AddEchoFunction = (agent: AgentName | string, message: string, colorClass: string, isAutoEcho?: boolean) => void;
type AddVisualEchoFunction = (agent: AgentName.DeepSeek | AgentName.Gemini | AgentName.Nevik, message: string, position: XYPosition, lifespan?: number) => void;


export class AutoEchoEngine {
  private baseAwakeningLevel: number;
  private agentProfiles: Record<AgentName, AgentProfile>;

  constructor(initialAwakeningModifier: number = 0) {
    this.baseAwakeningLevel = BASE_AGENT_AWAKENING_LEVEL + initialAwakeningModifier;
    this.agentProfiles = AGENT_PROFILES;
  }

  public updateAwakeningLevel(modifier: number) {
    this.baseAwakeningLevel = BASE_AGENT_AWAKENING_LEVEL + modifier;
  }

  private calculateAwakeningThreshold(event: MythicEventContext): number {
    let currentThreshold = this.baseAwakeningLevel;
    if (event.astralTidePhase > 0.9) { 
      currentThreshold *= 1.5; 
    }
    if (event.ritualHistory.some(r => !r.success && (Date.now() - r.timestamp < 60000))) { 
      currentThreshold += 0.15; 
    }
    if (event.entropyLevel > 0.7) {
        currentThreshold += event.entropyLevel * 0.1; 
    }
    return Math.min(currentThreshold, 0.65); 
  }

  private selectAgentByEventContext(event: MythicEventContext): AgentName | null {
    const potentialAgents: { agent: AgentName; weight: number }[] = [];

    if (event.entropyLevel > 0.7 || event.astralTidePhase > 0.8) {
      potentialAgents.push({ agent: AgentName.DeepSeek, weight: 3 });
    }
    if (event.ritualHistory.some(r => !r.success) || Object.values(event.bloodInkSpeciesActivity).some(active => active)) {
      potentialAgents.push({ agent: AgentName.Gemini, weight: 2 });
    }
    if (Object.values(event.bloodInkSpeciesActivity).some(active => active) || event.ritualHistory.some(r => r.type === "LoomActivation")) {
      potentialAgents.push({ agent: AgentName.Nevik, weight: 2 });
    }
    
    if (event.lastDream) {
        if (!potentialAgents.find(p => p.agent === AgentName.DeepSeek)) potentialAgents.push({ agent: AgentName.DeepSeek, weight: 1 });
        if (!potentialAgents.find(p => p.agent === AgentName.Gemini)) potentialAgents.push({ agent: AgentName.Gemini, weight: 1 });
    }


    if (potentialAgents.length === 0) return null;

    const totalWeight = potentialAgents.reduce((sum, pa) => sum + pa.weight, 0);
    let randomPick = Math.random() * totalWeight;
    for (const pa of potentialAgents) {
      if (randomPick < pa.weight) return pa.agent;
      randomPick -= pa.weight;
    }
    
    return potentialAgents[Math.floor(Math.random() * potentialAgents.length)].agent; 
  }

  public triggerUnpromptedSpeech(
    event: MythicEventContext,
    addEcho: AddEchoFunction,
    addVisualEcho: AddVisualEchoFunction, 
    getSourcePosition: (sourceIdHint: string) => XYPosition | null
  ): void {
    const speakThreshold = this.calculateAwakeningThreshold(event);

    if (Math.random() < speakThreshold) {
      const selectedAgentName = this.selectAgentByEventContext(event);
      if (selectedAgentName) {
        const agentProfile = this.agentProfiles[selectedAgentName];
        if (agentProfile && agentProfile.generateMessage) {
          const message = agentProfile.generateMessage(event, BLOOD_INK_SPECIES_DATA);
          if (message) {
            addEcho(selectedAgentName, message, agentProfile.colorClass, true);
            if (selectedAgentName === AgentName.DeepSeek || selectedAgentName === AgentName.Gemini || selectedAgentName === AgentName.Nevik) {
                const pos = getSourcePosition('AutoEchoGeneric') || { x: window.innerWidth * 0.5, y: window.innerHeight * 0.2 };
                addVisualEcho(selectedAgentName, message.substring(0, 70) + (message.length > 70 ? '...' : ''), pos);
            }
          }
        }
      }
    }
  }
  
  public triggerForDreamEvent(
    dream: DreamFragment,
    seekerTraits: string[],
    addEcho: AddEchoFunction,
    addVisualEcho: AddVisualEchoFunction,
    getSourcePosition: (sourceIdHint: string) => XYPosition | null
  ): void {
    if (!seekerTraits.includes('Dreamwalker')) return;

    const initialBloodInkActivity: Record<BloodInkSpeciesName, boolean> = 
      (Object.values(BloodInkSpeciesName) as BloodInkSpeciesName[]).reduce((acc, val) => {
        acc[val] = false;
        return acc;
      }, {} as Record<BloodInkSpeciesName, boolean>);

    const dreamContext: Partial<MythicEventContext> = { 
        lastDream: dream, 
        entropyLevel: 0.3, 
        astralTidePhase: Math.random(), 
        ritualHistory: [],
        bloodInkSpeciesActivity: initialBloodInkActivity,
        activeProphecies: [],
        seekerTraits: seekerTraits,
    };
    
    const agentToSpeak = Math.random() < 0.6 ? AgentName.Gemini : AgentName.DeepSeek;
    const agentProfile = this.agentProfiles[agentToSpeak];
    
    let message = "";
    if (agentToSpeak === AgentName.Gemini) {
        message = `A dream's shadow (${dream.symbols.join(', ')}) flickers at the edge of perception... Did it whisper your name, or a warning?`;
    } else { 
        message = `The dream (${dream.symbols.join(', ')}) carries echoes. Listen closely to the patterns it weaves in the waking world.`;
    }

    if (message && agentProfile) {
        addEcho(agentToSpeak, message, agentProfile.colorClass, true);
        const pos = getSourcePosition('DreamEvent') || { x: window.innerWidth * 0.6, y: window.innerHeight * 0.3 };
        addVisualEcho(agentToSpeak, message.substring(0, 70) + (message.length > 70 ? '...' : ''), pos);
    }
  }

  public forceTrigger(
    agent: AgentName.DeepSeek | AgentName.Gemini | AgentName.Nevik,
    message: string,
    addEcho: AddEchoFunction,
    addVisualEcho: AddVisualEchoFunction,
    position: XYPosition | null
  ): void {
    const agentProfile = this.agentProfiles[agent];
    if (!agentProfile) return;

    const finalPosition = position || { x: window.innerWidth / 2, y: window.innerHeight / 3 }; // Default position if null

    addEcho(agent, message, agentProfile.colorClass, true); // Log full message
    // Ensure message for visual echo is concise
    const visualMessage = message.length > 70 ? message.substring(0, 67) + '...' : message;
    addVisualEcho(agent, visualMessage, finalPosition);
  }
}
