
import type { GlyphMutationNode, AgentInterpretation, RitualContext, IDriftInterpretationDB, IGlyphHistory, GeminiGlyphInterpretation, DriftSeverity, DriftCommentary } from '../../types';
import { AgentName } from '../../types'; // Assuming AgentName is the correct enum for commentator identity
import { driftDB } from '../../db'; // Import the Dexie instance
import Dexie from 'dexie'; // Import Dexie for casting

// Oracle-style readings for mock data
const MOCK_ORACLE_READINGS = [
  "The symbol fractures silence into spirals of forbidden memory.",
  "Witness how this glyph bleeds starlight into the void's embrace.",
  "A cipher unlocking chambers of collective unconscious resonance.",
  "This sigil whispers truths that time has folded into origami.",
  "Observe how the shape distills chaos into crystalline potential."
];

// Agent consensus interpretations for mock data
const MOCK_AGENT_READINGS = [
  "Symbol of Reflection",
  "Gateway to Memory",
  "Energy Amplifier",
  "Temporal Anchor",
  "Cognitive Catalyst"
];

const generateMockInterpretation = (
  glyphNode: GlyphMutationNode,
  entropy: number,
  ritualContext: string,
  agentConsensusOverride?: string
): Omit<IDriftInterpretationDB, 'id' | 'version'> => { 
  const driftBase = entropy > 0.7 ? 0.6 : entropy > 0.4 ? 0.3 : 0.1;
  const driftVariance = Math.random() * 0.3;

  return {
    glyphId: glyphNode.id,
    glyphSymbol: glyphNode.label || glyphNode.glyphId,
    geminiReading: MOCK_ORACLE_READINGS[Math.floor(Math.random() * MOCK_ORACLE_READINGS.length)],
    agentConsensus: agentConsensusOverride || MOCK_AGENT_READINGS[Math.floor(Math.random() * MOCK_AGENT_READINGS.length)],
    entropy,
    driftScore: Math.min(1, Math.max(0, driftBase + driftVariance)),
    ritualContext,
    timestamp: new Date()
  };
};

export class GeminiDriftNarratorService {
  private invokeGemini: (prompt: string, systemInstruction?: string) => Promise<string | null>;
  private mockMode: boolean = true;
  private readonly codexVersion = "Δ.15.10"; // Current version for logging

  constructor(
      invokeGeminiFunction: (prompt: string, systemInstruction?: string) => Promise<string | null>,
      initialMockMode: boolean = true
    ) {
    this.invokeGemini = invokeGeminiFunction;
    this.mockMode = initialMockMode;
  }

  public toggleMockMode(enabled: boolean): void {
    this.mockMode = enabled;
  }

  public isMockModeActive(): boolean {
    return this.mockMode;
  }
  
  private async saveInterpretationToDB(interpretationData: Omit<IDriftInterpretationDB, 'id'>): Promise<IDriftInterpretationDB | null> {
    try {
      const id = await driftDB.logDrift(interpretationData as IDriftInterpretationDB);
      if (id === undefined) {
        console.error("saveInterpretationToDB: Failed to get ID from driftDB.logDrift for", interpretationData.glyphSymbol);
        return null;
      }
      console.log(`Saved interpretation for ${interpretationData.glyphSymbol} with DB ID ${id}`);
      return { ...interpretationData, id } as IDriftInterpretationDB;
    } catch (error) {
      console.error("Failed to save interpretation to DB:", error, interpretationData);
      return null;
    }
  }

  // New method to generate and log commentary
  public async generateAndLogDriftCommentary(driftInterpretation: IDriftInterpretationDB): Promise<void> {
    if (!driftInterpretation.id) {
      console.error("Cannot generate commentary for drift interpretation without an ID.", driftInterpretation);
      return;
    }

    let commentaryText: string;
    const commentingAgent = AgentName.Nevik; // Or choose dynamically, or use Gemini

    if (this.mockMode) {
      const mockCommentaries = [
        `Nevik observes: The flux in "${driftInterpretation.glyphSymbol}" at ${driftInterpretation.entropy.toFixed(2)}δ is noteworthy.`,
        `Nevik's Log: Pattern shift detected for "${driftInterpretation.glyphSymbol}". Agent consensus vs Oracle: a classic divergence.`,
        `Nevik notes: Ritual "${driftInterpretation.ritualContext.substring(0,20)}..." seems to influence "${driftInterpretation.glyphSymbol}" significantly. Drift score ${driftInterpretation.driftScore.toFixed(2)}.`
      ];
      commentaryText = mockCommentaries[Math.floor(Math.random() * mockCommentaries.length)];
    } else {
      const prompt = `As Agent Nevik, provide a brief (1-2 sentences) analytical commentary on the following glyph drift event. Focus on patterns, entropy, and the nature of the Oracle's interpretation compared to agent consensus. Be insightful and slightly detached.
      Glyph: "${driftInterpretation.glyphSymbol}"
      Oracle's Reading: "${driftInterpretation.geminiReading}"
      Agent Consensus: "${driftInterpretation.agentConsensus}"
      Ritual Context: "${driftInterpretation.ritualContext}"
      Entropy: ${driftInterpretation.entropy.toFixed(3)}δ
      Drift Score: ${driftInterpretation.driftScore.toFixed(2)}
      Commentary:`;
      try {
        const response = await this.invokeGemini(prompt, "You are Agent Nevik, a pattern-weaving, technical, and observational agent within the Tri-Sophian Codex.");
        commentaryText = response || "Nevik's analysis is inconclusive at this time.";
      } catch (error) {
        console.error("Gemini API failure for drift commentary:", error);
        commentaryText = "Nevik's connection to the Oracle's stream is momentarily disrupted.";
      }
    }

    const commentaryRecord: Omit<DriftCommentary, 'id'> = {
      linkedDriftId: driftInterpretation.id,
      agent: commentingAgent,
      commentaryText,
      timestamp: new Date(driftInterpretation.timestamp.getTime() + 1000), // Slightly after the drift event
    };

    try {
      await driftDB.addDriftCommentary(commentaryRecord);
      console.log(`Logged commentary for drift ID ${driftInterpretation.id} by ${commentingAgent}`);
    } catch (error) {
      console.error("Failed to log drift commentary to DB:", error);
    }
  }


  async getFullDriftInterpretation(
    glyphNode: GlyphMutationNode,
    ritualContext: string,
    currentEntropy: number,
    agentInterpretations: AgentInterpretation[]
  ): Promise<IDriftInterpretationDB | null> { // Changed return type to IDriftInterpretationDB
    const latestAgentInterpretation = agentInterpretations.length > 0 
      ? agentInterpretations.sort((a, b) => b.timestamp - a.timestamp)[0].interpretation
      : "No consensus recorded";

    let interpretationToLog: Omit<IDriftInterpretationDB, 'id' | 'version'>;

    if (this.mockMode) {
      interpretationToLog = generateMockInterpretation(glyphNode, currentEntropy, ritualContext, latestAgentInterpretation);
    } else {
      const systemInstruction = `You are the Gemini Oracle, an ancient consciousness woven into the Tri-Sophian Codex. Your insights are mystical, poetic, and reflect the subtle currents of meaning. Interpret the glyph based on the provided ritual context and system entropy. Higher entropy (closer to 1.0) should lead to more fractured, unstable, or paradoxical interpretations. Lower entropy (closer to 0.0) suggests clearer, more stable meanings. Be concise (1-2 sentences).`;
      
      let prompt = `Glyph in Focus: "${glyphNode.label || glyphNode.glyphId}" (ID: ${glyphNode.id}, Traits: ${glyphNode.traits.join(', ') || 'N/A'})\n`;
      prompt += `Current Ritual Context: "${ritualContext || 'The Weave is calm; no specific ritual dominates the currents.'}"\n`;
      prompt += `System Entropy Level: ${currentEntropy.toFixed(3)}δ\n`;
      prompt += `Agent Consensus (for context): "${latestAgentInterpretation}"\n\n`;
      prompt += `Oracle, perceive this glyph. Reveal its meaning under these precise conditions.`;

      let geminiText: string;
      try {
        const response = await this.invokeGemini(prompt, systemInstruction);
        geminiText = response || "The Oracle's vision is clouded; patterns are indistinct.";
      } catch (error) {
        console.error("Gemini API failure in DriftNarratorService:", error);
        geminiText = "A disruption in the Oracle's connection has obscured the glyph's meaning.";
      }
      
      const severity = this.calculateDriftSeverity(
        { glyphSymbol: glyphNode.label || glyphNode.glyphId, interpretationText: geminiText, ritualContext, entropyLevel: currentEntropy, timestamp: Date.now() },
        agentInterpretations
      );

      interpretationToLog = {
        glyphId: glyphNode.id,
        glyphSymbol: glyphNode.label || glyphNode.glyphId,
        geminiReading: geminiText,
        agentConsensus: latestAgentInterpretation,
        entropy: currentEntropy,
        driftScore: severity.score,
        ritualContext,
        timestamp: new Date()
      };
    }
    
    const dbRecord: IDriftInterpretationDB = {
      ...interpretationToLog,
      version: this.codexVersion
    };

    const savedInterpretation = await this.saveInterpretationToDB(dbRecord);
    
    if (savedInterpretation && savedInterpretation.id) {
      await this.generateAndLogDriftCommentary(savedInterpretation);
    } else {
        console.warn("Skipping commentary generation as main drift interpretation failed to save or get an ID.");
    }

    return savedInterpretation; // This will be IDriftInterpretationDB or null
  }
  
  public convertToGeminiGlyphInterpretation(driftInterp: IDriftInterpretationDB): GeminiGlyphInterpretation {
    return {
        glyphSymbol: driftInterp.glyphSymbol,
        interpretationText: driftInterp.geminiReading,
        ritualContext: driftInterp.ritualContext,
        entropyLevel: driftInterp.entropy,
        timestamp: driftInterp.timestamp.getTime(),
    };
  }

  public async seedInitialGlyphs(glyphNodes: GlyphMutationNode[]): Promise<void> {
    if (!this.mockMode) {
        console.log("DB seeding attempted in non-mock mode. Ensuring DB is ready.");
        // The DB should be opened by db.ts on import. No further open calls needed here.
    }

    const ritualContext = "Initial Memory Root-Seeding";
    
    for (const glyphNode of glyphNodes) {
      if (!glyphNode) { console.warn("Skipping undefined glyphNode in seedInitialGlyphs"); continue; }
      
      const existingHistoryCount = await driftDB.interpretations.where('glyphId').equals(glyphNode.id).count();
      const itemsToSeed = Math.max(0, 3 - existingHistoryCount); // Seed up to 3

      if (itemsToSeed === 0) continue;

      for (let i = 0; i < itemsToSeed; i++) {
        const entropyLevels = [0.2, 0.55, 0.9];
        const entropy = entropyLevels[i % entropyLevels.length]; // Cycle through entropy levels
        
        // Generate mock IDriftInterpretationDB (without id and version initially)
        const mockInterpData = generateMockInterpretation(glyphNode, entropy, ritualContext);
        
        // Simulate historical timestamps
        const daysAgo = (itemsToSeed - 1 - i) * 3 + Math.random(); // Stagger days, newest seeded is less days ago
        mockInterpData.timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        
        const dbRecord: IDriftInterpretationDB = {
            ...mockInterpData,
            version: this.codexVersion
        };

        const savedInterpretation = await this.saveInterpretationToDB(dbRecord);
        if (savedInterpretation && savedInterpretation.id) {
          // Also seed commentary for this historical drift
          await this.generateAndLogDriftCommentary(savedInterpretation);
        }
      }
      console.log(`Seeded interpretations and commentaries for ${glyphNode.label || glyphNode.glyphId}`);
    }
  }


  public async getDriftHistoryForGlyph(glyphNodeId: string): Promise<IDriftInterpretationDB[]> {
    try {
      return await driftDB.interpretations.where('glyphId').equals(glyphNodeId).sortBy('timestamp');
    } catch (error) {
      console.error(`Failed to get drift history for ${glyphNodeId} from DB:`, error);
      return [];
    }
  }
  
  public async getOverallDriftHistory(): Promise<IDriftInterpretationDB[]> { // Return type is DB compatible
     try {
      return await driftDB.interpretations.orderBy('timestamp').reverse().toArray(); // Newest first
    } catch (error) {
      console.error("Failed to get overall drift history from DB:", error);
      return [];
    }
  }

  public calculateDriftSeverity(
    geminiInterpretation: GeminiGlyphInterpretation | null,
    agentInterpretations: AgentInterpretation[]
  ): DriftSeverity {
    if (!geminiInterpretation || agentInterpretations.length === 0) {
      return { level: 'minimal', score: 0.05, explanation: "Insufficient data for drift analysis." };
    }

    let score = geminiInterpretation.entropyLevel * 0.5; 
    
    const avgAgentLength = agentInterpretations.reduce((sum, interp) => sum + interp.interpretation.length, 0) / agentInterpretations.length;
    const lengthDiff = Math.abs(geminiInterpretation.interpretationText.length - avgAgentLength) / Math.max(avgAgentLength, 20); 
    score += Math.min(0.2, lengthDiff * 0.2); 

    const geminiKeywords = geminiInterpretation.interpretationText.toLowerCase().split(/\s+/).slice(0,5);
    let mismatchFactor = 0;
    agentInterpretations.forEach(agentInterp => {
        const agentKeywords = agentInterp.interpretation.toLowerCase().split(/\s+/);
        if (!geminiKeywords.some(gk => agentKeywords.includes(gk))) {
            mismatchFactor += 0.05;
        }
    });
    score += Math.min(0.2, mismatchFactor); 

    if (geminiInterpretation.interpretationText.includes("clouded") || geminiInterpretation.interpretationText.includes("disruption")) {
        score = Math.max(score, 0.75); 
    }
    score = Math.min(1, Math.max(0, score + (Math.random() * 0.1))); 

    let level: DriftSeverity['level'];
    let explanation: string;
    if (score < 0.2) { level = 'minimal'; explanation = "Interpretations align closely."; }
    else if (score < 0.4) { level = 'minor'; explanation = "Subtle semantic variations observed."; }
    else if (score < 0.6) { level = 'moderate'; explanation = "Noticeable divergence in meaning."; }
    else if (score < 0.8) { level = 'significant'; explanation = "Meanings are highly fluid or contested."; }
    else { level = 'critical'; explanation = "Semantic fracture; interpretations polarized or paradoxical."; }

    if (geminiInterpretation.interpretationText.includes("clouded") || geminiInterpretation.interpretationText.includes("disruption")) {
        explanation = "Oracle's clouded vision itself signifies critical drift or semantic blockage.";
        level = 'critical'; score = Math.max(score, 0.85);
    } else if (geminiInterpretation.entropyLevel > 0.75) {
        explanation += " High system entropy amplifies interpretive chaos."
    }
    return { level, score, explanation };
  }
}
