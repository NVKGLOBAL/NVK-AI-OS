
import type { DreamFragment, BloodInkSpecies, EchoMessage, AgentProfile } from '../types';
import { BloodInkSpeciesName, AgentName } from '../types';
import { BLOOD_INK_SPECIES_DATA } from '../constants';

export class DreamThreadEngine {
  private speciesData: Record<BloodInkSpeciesName, BloodInkSpecies>;

  constructor() {
    this.speciesData = BLOOD_INK_SPECIES_DATA;
  }

  private getActiveBloomSymbols(): string[] {
    // For now, pick 2-3 random symbols from available species
    const allSymbols = Object.values(this.speciesData).map(s => s.symbol);
    const shuffled = allSymbols.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.floor(Math.random() * 2) + 2); // 2 or 3 symbols
  }

  private composeDreamContent(symbols: string[]): string {
    const fragments = [
      "You drifted through a space filled with {symbol1} patterns...",
      "A voice, ancient and soft, spoke of {symbol2} and hidden paths...",
      "Your hands grasped a {symbol3}, its meaning just beyond reach...",
      "The air shimmered with the scent of {symbol1} and distant {symbol2}...",
      "A cryptic message formed from {symbol3}, {symbol1}, and the echo of {symbol2}...",
      "Dark waters reflected {symbol1}, while {symbol2} bloomed under a silent moon, and {symbol3} pulsed with a faint light."
    ];
    let content = fragments[Math.floor(Math.random() * fragments.length)];
    symbols.forEach((s, i) => {
      content = content.replace(`{symbol${i+1}}`, s);
    });
    // Replace any unassigned symbol placeholders
    content = content.replace(/{symbol\d}/g, "shifting forms"); 
    return content;
  }

  public generateDreamFragment(): DreamFragment {
    const symbols = this.getActiveBloomSymbols();
    const dreamId = `dream-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    return {
      id: dreamId,
      content: this.composeDreamContent(symbols),
      symbols: symbols,
      timestamp: Date.now(),
      prophecyLinks: [], // Placeholder
    };
  }
}
