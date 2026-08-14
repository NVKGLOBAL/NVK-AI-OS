
import { useEffect } from 'react';
import type { PersistenceTarget, CodexStateSnapshot, EchoMessage, AgentNode, SimulationGrid, GlyphMutationNode, PlacedGlyph, CanvasConnection, HistoricalEvent, RewovenGlyph } from '../types';
import { CodexModeId } from '../types'; // Added import for CodexModeId

const CODEX_APP_VERSION = 'Δ.2.4'; // Version for storage schema (updated for masterNegentropyLevel)

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`CodexPersistence: Failed to get item '${key}' from localStorage.`, e);
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`CodexPersistence: Failed to set item '${key}' in localStorage.`, e);
  }
};

const safeClearStorage = (): void => {
  try {
    const currentVersion = safeGetItem('codexVersion'); 
    localStorage.clear();
    if (currentVersion) { 
        safeSetItem('codexVersion', currentVersion);
    }
    console.log('CodexPersistence: localStorage cleared (except version potentially).');
  } catch (e) {
    console.warn(`CodexPersistence: Failed to clear localStorage.`, e);
  }
};


export const useCodexPersistence = (
  targets: PersistenceTarget[],
  stateValues: CodexStateSnapshot
) => {
  useEffect(() => {
    const saveState = () => {
      console.log('CodexPersistence: Attempting to save state...');
      targets.forEach(target => {
        try {
          switch (target) {
            case 'EchoLog':
              if (stateValues.echoLog) safeSetItem('codexEchoLog', JSON.stringify(stateValues.echoLog));
              break;
            case 'AgentGridState':
              if (stateValues.agentGridState) safeSetItem('codexAgentGridState', JSON.stringify(stateValues.agentGridState));
              break;
            case 'GlyphTree':
              if (stateValues.glyphTree) safeSetItem('codexGlyphTree', JSON.stringify(stateValues.glyphTree));
              break;
            case 'RitualState':
              if (stateValues.ritualState) safeSetItem('codexRitualState', JSON.stringify(stateValues.ritualState));
              break;
            case 'SystemEntropy':
              if (typeof stateValues.systemEntropy === 'number') safeSetItem('codexSystemEntropy', stateValues.systemEntropy.toString());
              break;
            case 'MasterNegentropyLevel': // New case for negentropy
              if (typeof stateValues.masterNegentropyLevel === 'number') safeSetItem('codexMasterNegentropyLevel', stateValues.masterNegentropyLevel.toString());
              break;
            case 'AutoEchoState':
              if (stateValues.autoEchoState) safeSetItem('codexAutoEchoState', JSON.stringify(stateValues.autoEchoState));
              break;
            case 'EventHistory':
                 if (stateValues.eventHistory) safeSetItem('codexEventHistory', JSON.stringify(stateValues.eventHistory));
                 break;
            case 'ReweavingHistory':
                if (stateValues.reweavingHistory) safeSetItem('codexReweavingHistory', JSON.stringify(stateValues.reweavingHistory));
                break;
            // SeekerTraits is handled separately below if not part of a larger targeted object
          }
        } catch (e) {
            console.error(`CodexPersistence: Error saving target ${target}`, e);
        }
      });
      
      // Explicit save for SeekerTraits if it's a direct target or needs to be saved always
      if (targets.includes('SeekerTraits') && stateValues.seekerTraits) {
        safeSetItem('codexSeekerTraits', JSON.stringify(stateValues.seekerTraits));
      }
      // If masterNegentropyLevel is not part of a larger saved object like 'SystemEntropy' and needs its own trigger
      if (!targets.includes('MasterNegentropyLevel') && typeof stateValues.masterNegentropyLevel === 'number' && targets.some(t => t.startsWith('System'))) {
         //This means it wasn't explicitly targeted, but might be part of a larger system state object that IS targeted.
         // If it's a top-level prop in CodexStateSnapshot, and 'SystemEntropy' or similar is a target, it won't be saved by the loop above unless it has its own target.
         // This check is a bit redundant if MasterNegentropyLevel is added to targets array.
         // The switch case for 'MasterNegentropyLevel' should handle it if it's in `targets`.
      }

      safeSetItem('codexVersion', CODEX_APP_VERSION); 
      console.log('CodexPersistence: State saved.');
    };

    const phaseIndicatorElement = document.getElementById('codex-phase-indicator');
    let phaseObserver: MutationObserver | null = null;

    if (phaseIndicatorElement) {
      phaseObserver = new MutationObserver(saveState);
      phaseObserver.observe(phaseIndicatorElement, { childList: true, characterData: true, subtree: true });
    }

    window.addEventListener('beforeunload', saveState);

    return () => {
      if (phaseObserver) phaseObserver.disconnect();
      window.removeEventListener('beforeunload', saveState);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, JSON.stringify(stateValues)]); // Deep compare stateValues by stringifying

  const hydrateState = (): CodexStateSnapshot => {
    console.log('CodexPersistence: Hydrating state...');
    const storedVersion = safeGetItem('codexVersion');
    if (storedVersion !== CODEX_APP_VERSION) {
      console.warn(`CodexPersistence: Version mismatch (stored: ${storedVersion}, app: ${CODEX_APP_VERSION}). Clearing non-version storage.`);
      const keysToClear: Array<keyof CodexStateSnapshot | string> = ['codexEchoLog', 'codexAgentGridState', 'codexGlyphTree', 'codexRitualState', 'codexSystemEntropy', 'codexMasterNegentropyLevel', 'codexAutoEchoState', 'codexEventHistory', 'codexReweavingHistory', 'codexSeekerTraits'];
      keysToClear.forEach(key => {
        try { localStorage.removeItem(key as string); } catch (e) { console.warn("Error removing item", key, e); }
      });
      safeSetItem('codexVersion', CODEX_APP_VERSION);
    }

    const hydrated: CodexStateSnapshot = {};
    try {
      targets.forEach(target => {
        switch (target) {
          case 'EchoLog':
            hydrated.echoLog = JSON.parse(safeGetItem('codexEchoLog') || '[]') as EchoMessage[];
            break;
          case 'AgentGridState':
            hydrated.agentGridState = JSON.parse(safeGetItem('codexAgentGridState') || '{}') as { agents: AgentNode[]; grid: SimulationGrid };
            break;
          case 'GlyphTree':
            hydrated.glyphTree = JSON.parse(safeGetItem('codexGlyphTree') || '[]') as GlyphMutationNode[];
            break;
          case 'RitualState':
            hydrated.ritualState = JSON.parse(safeGetItem('codexRitualState') || '{}') as { currentPhase: string; chaliceStatus: string; placedGlyphs: PlacedGlyph[]; connections: CanvasConnection[]; currentCodexModeId?: CodexModeId };
            break;
          case 'SystemEntropy':
            hydrated.systemEntropy = parseFloat(safeGetItem('codexSystemEntropy') || '0');
            break;
          case 'MasterNegentropyLevel':
            hydrated.masterNegentropyLevel = parseFloat(safeGetItem('codexMasterNegentropyLevel') || '5'); // Default to 5 if not found
            break;
          case 'AutoEchoState':
            hydrated.autoEchoState = JSON.parse(safeGetItem('codexAutoEchoState') || '{}') as { isAutoEchoPaused: boolean; agentAwakeningLevelModifier: number; };
            break;
          case 'EventHistory':
            hydrated.eventHistory = JSON.parse(safeGetItem('codexEventHistory') || '[]') as HistoricalEvent[];
            break;
          case 'ReweavingHistory':
            hydrated.reweavingHistory = JSON.parse(safeGetItem('codexReweavingHistory') || '[]') as RewovenGlyph[];
            break;
          case 'SeekerTraits':
             hydrated.seekerTraits = JSON.parse(safeGetItem('codexSeekerTraits') || 'null') as string[] | null || undefined;
            if (hydrated.seekerTraits === null) delete hydrated.seekerTraits;
            break;
        }
      });
      // If MasterNegentropyLevel was not in targets but we want to load it anyway (e.g. if it's a new field)
      if (!targets.includes('MasterNegentropyLevel')) {
         const storedNegentropy = safeGetItem('codexMasterNegentropyLevel');
         if (storedNegentropy !== null) {
             hydrated.masterNegentropyLevel = parseFloat(storedNegentropy);
         }
      }
       if (!targets.includes('SeekerTraits')) {
         const storedTraits = safeGetItem('codexSeekerTraits');
         if (storedTraits !== null) {
            hydrated.seekerTraits = JSON.parse(storedTraits) as string[] | null || undefined;
            if (hydrated.seekerTraits === null) delete hydrated.seekerTraits;
         }
      }

    } catch (e) {
        console.error("CodexPersistence: Error during hydration parsing.", e);
    }
    console.log('CodexPersistence: Hydration complete.');
    return hydrated;
  };

  return { hydrateState, safeClearStorage }; 
};