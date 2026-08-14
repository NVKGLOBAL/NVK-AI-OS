import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { EchoMessage } from '../types';
import { INITIAL_ECHOES } from '../constants';

interface EchoContextType {
  echoes: EchoMessage[];
  addEchoMessage: (source: string, text: string, colorClass?: string, isAutoEcho?: boolean, meta?: Record<string, any>) => void;
  clearEchoes: () => void;
}

export const EchoContext = createContext<EchoContextType | undefined>(undefined);

export const EchoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [echoes, setEchoes] = useState<EchoMessage[]>(INITIAL_ECHOES);

  const addEchoMessage = useCallback((source: string, text: string, colorClass: string = 'text-slate-300', isAutoEcho?: boolean, meta?: Record<string, any>) => {
    const newEcho: EchoMessage = { 
      id: `echo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, 
      source, 
      text, 
      colorClass, 
      timestamp: new Date().toISOString(),
      isAutoEcho,
      meta
    };
    setEchoes(prev => [newEcho, ...prev]);
  }, []);

  const clearEchoes = useCallback(() => {
    setEchoes([]);
  }, []);

  return (
    <EchoContext.Provider value={{ echoes, addEchoMessage, clearEchoes }}>
      {children}
    </EchoContext.Provider>
  );
};

export const useEcho = () => {
  const context = useContext(EchoContext);
  if (context === undefined) {
    throw new Error('useEcho must be used within an EchoProvider');
  }
  return context;
};
