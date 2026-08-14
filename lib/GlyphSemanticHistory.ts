
import type { AgentInterpretation, GlyphOrbit, AgentName } from '../types';

// Helper function to simulate confidence calculation (placeholder)
// In a real scenario, this might involve NLP or other contextual analysis.
const calculateSemanticConfidence = (interpretationText: string): number => {
  // Simple example: longer interpretations might be considered more confident,
  // or this could be a fixed value or passed in.
  // For now, let's use a random factor combined with length.
  const lengthFactor = Math.min(1, interpretationText.length / 50); // Normalize length up to 50 chars
  return Math.random() * 0.3 + lengthFactor * 0.7; // Weighted random
};


export class GlyphSemanticHistoryService {
  private history: Map<string, AgentInterpretation[]> = new Map(); // Key: glyphSymbol

  public logInterpretation(
    glyphSymbol: string, 
    agent: AgentName | string, 
    interpretationText: string,
    confidence?: number // Optional confidence, can be calculated if not provided
  ): void {
    if (!this.history.has(glyphSymbol)) {
      this.history.set(glyphSymbol, []);
    }
    
    const interpretationEntry: AgentInterpretation = {
      agent,
      interpretation: interpretationText,
      timestamp: Date.now(),
      confidence: confidence !== undefined ? confidence : calculateSemanticConfidence(interpretationText),
    };

    const interpretationsForGlyph = this.history.get(glyphSymbol);
    if (interpretationsForGlyph) {
      interpretationsForGlyph.push(interpretationEntry);
      // Optional: Limit history size per glyph
      // if (interpretationsForGlyph.length > 20) {
      //   this.history.set(glyphSymbol, interpretationsForGlyph.slice(-20));
      // }
    }
  }

  public getDriftHistory(): GlyphOrbit[] {
    const driftHistoryArray: GlyphOrbit[] = [];
    this.history.forEach((interpretations, glyphSymbol) => {
      driftHistoryArray.push({
        glyphSymbol,
        // Sort interpretations by timestamp, newest first for typical display
        interpretations: [...interpretations].sort((a, b) => b.timestamp - a.timestamp),
      });
    });
    // Sort glyphs themselves, perhaps alphabetically or by last update
    return driftHistoryArray.sort((a,b) => {
        const lastA = a.interpretations[0]?.timestamp || 0;
        const lastB = b.interpretations[0]?.timestamp || 0;
        return lastB - lastA; // Show most recently interpreted glyphs first
    });
  }

  public clearHistory(): void {
    this.history.clear();
  }
}
