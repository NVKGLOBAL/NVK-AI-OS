
import { useState, useEffect, useCallback } from 'react';
import { detectActiveWhispers, AgentWhisper } from '../lib/whisper/WhisperRegistry';
// Removed: import { useSystemState } from '../context/SystemContext';
import type { SystemStateContextType } from '../context/SystemContext';

// Define the type for the props argument more precisely based on what the hook uses
type WhisperSystemProps = Pick<SystemStateContextType, 'entropy' | 'activeTraits' | 'playbackStatus' | 'activeGlyph'>;

export const useWhisperSystem = (systemState: WhisperSystemProps) => {
  const { entropy, activeTraits, playbackStatus, activeGlyph } = systemState; // Destructure from argument
  const [activeWhispers, setActiveWhispers] = useState<AgentWhisper[]>([]);
  const [dismissedWhispers, setDismissedWhispers] = useState<string[]>([]);

  // Detect new whispers on state changes
  useEffect(() => {
    const currentSystemStateForDetection = { // Use the passed state for detection
      entropy,
      activeTraits,
      playbackStatus,
      activeGlyph
    };
    const newPotentialWhispers = detectActiveWhispers(currentSystemStateForDetection);
    
    // Filter out already dismissed whispers
    const newlyTriggeredWhispers = newPotentialWhispers.filter(w => !dismissedWhispers.includes(w.id));

    // Update activeWhispers:
    // 1. Keep whispers that are still active and not dismissed.
    // 2. Add newly triggered whispers that are not already active.
    setActiveWhispers(prevActive => {
      const stillActive = prevActive.filter(aw => 
        newlyTriggeredWhispers.some(ntw => ntw.id === aw.id) && !dismissedWhispers.includes(aw.id)
      );
      const trulyNew = newlyTriggeredWhispers.filter(ntw => 
        !stillActive.some(sa => sa.id === ntw.id)
      );
      return [...stillActive, ...trulyNew];
    });

  }, [entropy, activeTraits, playbackStatus, activeGlyph, dismissedWhispers]);

  const dismissWhisper = useCallback((id: string) => {
    setDismissedWhispers(prev => {
      if (!prev.includes(id)) {
        return [...prev, id];
      }
      return prev;
    });
    setActiveWhispers(prev => prev.filter(w => w.id !== id));
  }, []);
  
  // Function to clear dismissed whispers, e.g., on a major state reset or periodically
  const clearDismissedHistory = useCallback(() => {
    setDismissedWhispers([]);
  }, []);


  return { activeWhispers, dismissWhisper, clearDismissedHistory };
};
