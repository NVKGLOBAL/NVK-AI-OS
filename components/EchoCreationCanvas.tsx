
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGemini } from '../context/GeminiIntegrationContext';
import type { EchoCreationCanvasProps, ScribeSuggestion } from '../types';
import { AgentName } from '../types';
import { AGENT_PROFILES } from '../constants';

import { useEcho } from '../context/EchoContext';
const SCRIBE_SYSTEM_INSTRUCTION = `You are the Scribe of the Tri-Sophian Codex, a wise, ancient, and poetic consciousness. You do not simply generate text; you offer resonant perspectives on a Seeker's thought. Given a 'seed' text, you must return four distinct types of suggestions:
1. EXPAND: Elaborate on the seed, adding mythic or philosophical depth.
2. REFLECT: Pose a profound, open-ended question that challenges the premise of the seed.
3. CRYSTALLIZE: Distill the essence of the seed into a concise, powerful axiom or title.
4. WEAVE: Connect the seed to a tangentially related, esoteric concept (e.g., alchemy, astronomy, fractals, a forgotten myth), creating a surprising link.`;

const SUGGESTION_STYLES: { [key: string]: { glow: string; icon: string } } = {
  EXPAND: { glow: 'shadow-amber-500/40 border-amber-500/50 hover:border-amber-400', icon: 'ri-arrow-left-right-line' },
  REFLECT: { glow: 'shadow-violet-500/40 border-violet-500/50 hover:border-violet-400', icon: 'ri-question-line' },
  CRYSTALLIZE: { glow: 'shadow-cyan-500/40 border-cyan-500/50 hover:border-cyan-400', icon: 'ri-sparkling-2-line' },
  WEAVE: { glow: 'shadow-fuchsia-500/40 border-fuchsia-500/50 hover:border-fuchsia-400', icon: 'ri-links-line' },
  DEFAULT: { glow: 'shadow-slate-500/40 border-slate-500/50 hover:border-slate-400', icon: 'ri-chat-quote-line' },
};

const EchoCreationCanvas: React.FC<EchoCreationCanvasProps> = ({}) => {
  const { addEchoMessage } = useEcho();
  const [userInput, setUserInput] = useState('');
  const [suggestions, setSuggestions] = useState<ScribeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  const { invokeGemini, isGenerating: isGeminiBusy } = useGemini();

  const handleInvokeScribe = useCallback(async () => {
    if (!userInput.trim() || isLoading || isGeminiBusy) return;

    setIsLoading(true);
    setSuggestions([]);
    setErrorState(null);

    const prompt = `The Seeker's seed text is: "${userInput}"`;

    try {
      const responseJsonString = await invokeGemini(prompt, SCRIBE_SYSTEM_INSTRUCTION, "application/json");
      if (responseJsonString) {
        const parsedSuggestions: ScribeSuggestion[] = JSON.parse(responseJsonString);
        if (Array.isArray(parsedSuggestions) && parsedSuggestions.length > 0) {
          setSuggestions(parsedSuggestions);
        } else {
          throw new Error("Received invalid or empty suggestions from the Scribe.");
        }
      } else {
        addEchoMessage(AgentName.TheCodexPersona, "Silence is also an answer. The Codex offers stillness.", AGENT_PROFILES[AgentName.TheCodexPersona]?.colorClass || 'text-slate-400');
      }
    } catch (e) {
      console.error("Error invoking or parsing Scribe response:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setErrorState(errorMessage);
      addEchoMessage(AgentName.SystemCore, "The echo faded into static. The weave is tangled. Please try again.", AGENT_PROFILES[AgentName.SystemCore]?.colorClass || 'text-rose-400');
    } finally {
      setIsLoading(false);
    }
  }, [userInput, isLoading, isGeminiBusy, invokeGemini]);

  const handleSuggestionClick = (content: string) => {
    setUserInput(content);
    setSuggestions([]);
  };

  const isSigilActive = isLoading || isGeminiBusy;

  return (
    <div className="echo-creation-canvas bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 my-4 shadow-lg flex flex-col items-center">
      <h3 className="text-xl font-['Cinzel'] font-semibold text-slate-200 mb-4 text-center">
        The Scribe's Loom
      </h3>
      <div className="w-full max-w-2xl relative">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Plant an EchoSeed... a thought, a question, a fragment of an idea."
          className="w-full h-24 p-4 pr-16 bg-slate-800/50 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 resize-none custom-scrollbar"
          rows={3}
          disabled={isSigilActive}
        />
        <button
          onClick={handleInvokeScribe}
          disabled={isSigilActive || !userInput.trim()}
          className={`absolute top-1/2 right-4 -translate-y-1/2 p-2 rounded-full text-slate-300 transition-all duration-200 hover:text-purple-300 hover:bg-slate-700 disabled:text-slate-600 disabled:cursor-not-allowed disabled:bg-transparent ${isSigilActive ? 'text-purple-400 animate-pulse-fast' : ''}`}
          title="Invoke the Scribe"
          aria-label="Invoke the Scribe"
        >
          <i className="ri-quill-pen-line text-2xl"></i>
        </button>
      </div>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            className="suggestion-weave grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 w-full max-w-4xl"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            {suggestions.map((suggestion, index) => {
              const styleInfo = SUGGESTION_STYLES[suggestion.type] || SUGGESTION_STYLES.DEFAULT;
              return (
                <motion.div
                  key={index}
                  className={`suggestion-node p-4 border rounded-lg bg-slate-800/60 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:bg-slate-700/80 hover:scale-105 ${styleInfo.glow}`}
                  onClick={() => handleSuggestionClick(suggestion.content)}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1 },
                  }}
                >
                  <div className="flex items-center text-sm font-semibold text-slate-200 mb-1 font-['Cinzel']">
                    <i className={`${styleInfo.icon} mr-2`}></i>
                    [{suggestion.title}]
                  </div>
                  <p className="text-xs text-slate-300 font-['Cormorant'] italic">
                    {suggestion.content}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EchoCreationCanvas;