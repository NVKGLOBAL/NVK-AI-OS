
import type { SimulationGrid } from '../types';
// Threshold from user spec for "Collapse-imminent"
const ENTROPY_THRESHOLD = 0.78; 

export class NVKLatticeSensor {
  
  // This method calculates average entropy of the grid cells,
  // but the current implementation of detectEntropicAnomaly uses systemEntropy.
  // Kept for potential future use or more granular checks.
  private calculateGridCellAverageEntropy(grid: SimulationGrid): number {
    if (!grid || grid.length === 0 || grid[0].length === 0) {
      return 0;
    }
    let totalEntropy = 0;
    let cellCount = 0;
    grid.forEach(row => {
      row.forEach(cell => {
        totalEntropy += cell.entropy;
        cellCount++;
      });
    });
    return cellCount > 0 ? totalEntropy / cellCount : 0;
  }

  /**
   * Detects an entropic anomaly.
   * Currently uses the overall systemEntropy passed to it, as per interpretation of the spec's trigger condition.
   * @param grid - The current simulation grid (currently unused in favor of systemEntropy).
   * @param systemEntropy - The current global system entropy value.
   * @returns boolean - True if an anomaly is detected, false otherwise.
   */
  public detectEntropicAnomaly(
    grid: SimulationGrid, // Parameter kept for potential future use
    systemEntropy: number 
  ): boolean {
    // Per user spec: "if entropy >= threshold" where entropy seems to be system-level.
    if (systemEntropy >= ENTROPY_THRESHOLD) {
      return true; // Anomaly detected
    }
    return false; // No critical anomaly
  }
}
