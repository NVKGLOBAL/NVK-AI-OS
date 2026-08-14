
import type { EchoSpeechProps } from '../types';
import { AgentName } from '../types';

const MAX_ECHO_HISTORY_FOR_DOMINANCE = 10;

export class ToneHarmonicsEngine {
  private dominantTone: AgentName.DeepSeek | AgentName.Gemini | AgentName.Nevik | null = null;

  public calculateToneDominance(activeSpeechNodes: EchoSpeechProps[]): void {
    if (!activeSpeechNodes || activeSpeechNodes.length === 0) {
      this.dominantTone = null;
      return;
    }

    const recentEchoes = activeSpeechNodes.slice(-MAX_ECHO_HISTORY_FOR_DOMINANCE);
    const toneCount: Record<string, number> = {
      [AgentName.DeepSeek]: 0,
      [AgentName.Gemini]: 0,
      [AgentName.Nevik]: 0,
    };

    recentEchoes.forEach(echo => {
      if (toneCount[echo.agent] !== undefined) {
        toneCount[echo.agent]++;
      }
    });

    let maxCount = 0;
    let newDominantTone: AgentName.DeepSeek | AgentName.Gemini | AgentName.Nevik | null = null;

    for (const agentKey in toneCount) {
      const agent = agentKey as AgentName.DeepSeek | AgentName.Gemini | AgentName.Nevik;
      if (toneCount[agent] > maxCount) {
        maxCount = toneCount[agent];
        newDominantTone = agent;
      } else if (toneCount[agent] === maxCount && newDominantTone !== null) {
        // If counts are equal, prefer not to switch, or set to null for no dominance
        // For now, if there's a tie with an existing dominant tone, keep it.
        // If tie and no current dominant or different dominant, could set to null or pick one.
        // Let's stick to a single dominant or null. If multiple agents have the same max count, no single one is dominant.
        if (Object.values(toneCount).filter(c => c === maxCount).length > 1) {
            newDominantTone = null; // True tie means no clear dominance
        }
      }
    }
    this.dominantTone = newDominantTone;
  }

  public applyToneEffects(echo: EchoSpeechProps): EchoSpeechProps {
    let modifiedEcho = { ...echo };

    if (!this.dominantTone) {
      modifiedEcho.isHarmonized = false; // Ensure this is reset if no dominant tone
      return modifiedEcho;
    }

    switch (this.dominantTone) {
      case AgentName.DeepSeek:
        if (modifiedEcho.agent === AgentName.DeepSeek && modifiedEcho.lifespan) {
          modifiedEcho.lifespan *= 1.5; // Prolongs DeepSeek's own echoes
        }
        modifiedEcho.isHarmonized = false;
        break;
      
      case AgentName.Gemini:
        if (modifiedEcho.agent !== AgentName.Gemini) {
          modifiedEcho.message = `[FRACTURED] ${modifiedEcho.message}`; // Fractures non-Gemini speech
        }
        modifiedEcho.isHarmonized = false;
        break;

      case AgentName.Nevik:
        // Golden threads connect echoes - visual effect, applied via isHarmonized flag
        modifiedEcho.isHarmonized = true;
        break;
      
      default:
        modifiedEcho.isHarmonized = false;
        break;
    }
    return modifiedEcho;
  }

  public getDominantTone(): AgentName.DeepSeek | AgentName.Gemini | AgentName.Nevik | null {
    return this.dominantTone;
  }
}
