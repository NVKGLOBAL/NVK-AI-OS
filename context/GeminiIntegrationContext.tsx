import React, { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import type { GeminiContextType } from '../types';

export const GeminiContext = createContext<GeminiContextType | undefined>(undefined);

export const GeminiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastGeminiResponseText, setLastGeminiResponseText] = useState<string | null>(null);

  const invokeGemini = useCallback(async (
    prompt: string, 
    systemInstruction?: string, 
    responseMimeType?: "text/plain" | "application/json"
  ): Promise<string | null> => {
    setIsGenerating(true);
    setError(null);
    setLastGeminiResponseText(null);

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemInstruction,
          responseMimeType,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const text = data.text || "";
      setLastGeminiResponseText(text);
      setIsGenerating(false);
      return text;
    } catch (e) {
      const err = e instanceof Error ? e : new Error('An unknown error occurred while calling server-side Gemini');
      console.error("Error invoking Gemini API (text):", err);
      setError(err);
      setIsGenerating(false);
      return null;
    }
  }, []);

  const generateImage = useCallback(async (prompt: string): Promise<string | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/gemini/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.imageUrl || null;
      setIsGenerating(false);
      return imageUrl;
    } catch (e) {
      const err = e instanceof Error ? e : new Error('An unknown error occurred while calling server-side Gemini Image API');
      console.error("Error invoking Gemini API (image):", err);
      setError(err);
      setIsGenerating(false);
      return null;
    }
  }, []);

  return (
    <GeminiContext.Provider value={{ isGenerating, error, lastGeminiResponseText, invokeGemini, generateImage }}>
      {children}
    </GeminiContext.Provider>
  );
};

export const useGemini = (): GeminiContextType => {
  const context = useContext(GeminiContext);
  if (context === undefined) {
    throw new Error('useGemini must be used within a GeminiProvider');
  }
  return context;
};
