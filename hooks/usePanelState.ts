
import { useState, useMemo } from 'react';
import { useSystemState } from '../context/SystemContext'; 
import { VisualizationMatrixMode } from '../types'; 

export const usePanelState = () => {
  const { entropy: globalEffectiveEntropy } = useSystemState(); 

  const [currentMode, setCurrentMode] = useState<VisualizationMatrixMode>(VisualizationMatrixMode.SacredLattice);
  const [resonanceTuning, setResonanceTuning] = useState<number>(0.5); // 0-1 range
  const [timeDilation, setTimeDilation] = useState<number>(1.0); // Multiplier, 1.0 is normal speed

  // Panel's "effective entropy" can be based on global or have local modifiers if needed
  // For now, it directly uses or slightly modifies the global effective entropy.
  const effectiveEntropy = useMemo(() => {
    // Example: Panel might interpret entropy differently based on its mode or tuning
    // For simplicity, let's say it's mostly global, but resonance can subtly affect perception
    return Math.max(0, Math.min(1, globalEffectiveEntropy + (resonanceTuning - 0.5) * 0.05));
  }, [globalEffectiveEntropy, resonanceTuning]);

  const panelStateSetters = {
    setCurrentMode,
    setResonanceTuning,
    setTimeDilation,
  };

  return {
    currentMode,
    resonanceTuning,
    timeDilation,
    effectiveEntropy, // This panel's perceived/visualized entropy
    panelStateSetters,
  };
};
