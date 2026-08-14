
import React, { createContext, useContext, ReactNode } from 'react';
import { GeminiDriftNarratorService } from '../lib/gemini/GeminiDriftNarratorService';

// Create a default (potentially non-functional if API key isn't there for invokeGemini)
// instance for the context. The actual functional instance will be provided by App.tsx.
const defaultInvokeGemini = async (prompt: string, systemInstruction?: string) => {
  console.warn("Default invokeGemini called from DriftNarratorContext. Ensure a real one is provided.");
  return `Mock response for: ${prompt.substring(0,30)}... (SI: ${systemInstruction ? systemInstruction.substring(0,20)+'...' : 'None'})`;
};

const defaultDriftNarratorService = new GeminiDriftNarratorService(defaultInvokeGemini, true);

export const DriftNarratorContext = createContext<GeminiDriftNarratorService>(defaultDriftNarratorService);

export const useDriftNarrator = (): GeminiDriftNarratorService => {
  const context = useContext(DriftNarratorContext);
  // No undefined check needed if we always provide a default instance.
  // However, it's good practice if there's a chance it might not be provided.
  if (!context) {
    throw new Error('useDriftNarrator must be used within a DriftNarratorProvider');
  }
  return context;
};

// Optional: If you want a named Provider component for clarity, though App.tsx will use DriftNarratorContext.Provider directly.
// interface DriftNarratorProviderProps {
//   service: GeminiDriftNarratorService;
//   children: ReactNode;
// }
// export const DriftNarratorProvider: React.FC<DriftNarratorProviderProps> = ({ service, children }) => {
//   return (
//     <DriftNarratorContext.Provider value={service}>
//       {children}
//     </DriftNarratorContext.Provider>
//   );
// };
