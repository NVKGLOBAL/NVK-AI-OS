
import React, { createContext, useContext, ReactNode } from 'react';

export interface SystemStateContextType {
  entropy: number; // This is effectiveSystemEntropy
  activeTraits: string[];
  playbackStatus: 'playing' | 'paused' | 'stopped';
  activeGlyph: string | null;
  negentropyLevel: number; // Added for L.I.F.E Panel
  isNegentropyStable: boolean; // Added for L.I.F.E Panel
  isMobile: boolean;
  performanceTier: 'low' | 'high';
}

const SystemStateContext = createContext<SystemStateContextType | undefined>(undefined);

export const SystemStateProvider: React.FC<{ value: SystemStateContextType, children: ReactNode }> = ({ value, children }) => {
  return <SystemStateContext.Provider value={value}>{children}</SystemStateContext.Provider>;
};

export const useSystemState = (): SystemStateContextType => {
  const context = useContext(SystemStateContext);
  if (context === undefined) {
    throw new Error('useSystemState must be used within a SystemStateProvider');
  }
  return context;
};