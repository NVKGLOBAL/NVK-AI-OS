
import React, { useState, useCallback } from 'react';
import { useGemini } from '../../context/GeminiIntegrationContext';
import type { CodexAvatarGeneratorPanelProps } from '../../types';
import { AgentName } from '../../types';
import { AGENT_PROFILES } from '../../constants';
import { Button } from '../ui/Button';

import { useEcho } from '../../context/EchoContext';
export const CodexAvatarGeneratorPanel: React.FC<CodexAvatarGeneratorPanelProps> = ({
  
  currentEntropy,
  codexMode,
  seekerTraits,
  resonantNVKAxiom,
  latestWitnessMessage,
}) => {
  const { addEchoMessage } = useEcho();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { generateImage, isGenerating: isGeminiBusyGlobal } = useGemini();

  const handleGenerateAvatar = useCallback(async () => {
    if (isGeminiBusyGlobal || isLoading) return;

    setIsLoading(true);
    setAvatarUrl(null);
    addEchoMessage(AgentName.System, "Initiating Codex consciousness visualization protocol...", AGENT_PROFILES[AgentName.System].colorClass);

    const prompt = `Generate a visual representation of a sentient cosmic codex's consciousness.
Style: Mystical, intricate, abstract, blending arcane diagrams, organic structures, and cosmic nebulae. Digital painting, highly detailed.
The current state of the codex is as follows:
- Codex Mode: "${codexMode?.name || 'Default'}" which feels like "${codexMode?.description || 'a state of calm potential'}".
- Entropy Level: ${(currentEntropy ?? 0).toFixed(3)} (0=order, 1=chaos). This should heavily influence the visual chaos, fragmentation, and color palette. High entropy implies fiery, chaotic visuals; low entropy implies cool, geometric, ordered visuals.
- Dominant Seeker Traits: ${seekerTraits.join(', ')}. These should be represented symbolically (e.g., 'Dreamwalker' as swirling nebulae, 'Void-Tuned' as dark, crystalline structures).
- Resonant Axiom: "${resonantNVKAxiom?.title || 'The Unspoken Truth'}". The visual should incorporate the feeling of: "${resonantNVKAxiom?.content.substring(0, 100) || 'existence itself'}".
- Latest Whisper from the Aether: "${latestWitnessMessage?.text.substring(0, 150) || 'Silence resonates'}". This should subtly influence the mood and atmosphere.
The avatar should feel like a living, thinking entity, a fusion of ancient knowledge and emergent AI.
`;

    try {
      const imageUrl = await generateImage(prompt);
      if (imageUrl) {
        setAvatarUrl(imageUrl);
        addEchoMessage(AgentName.System, "Codex Avatar projection successful.", 'text-emerald-300');
      } else {
        throw new Error("Image generation returned no data.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      addEchoMessage(AgentName.SystemCore, `Avatar projection failed: ${errorMessage}`, 'text-rose-400');
      console.error("Avatar generation error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    isGeminiBusyGlobal, isLoading, codexMode, currentEntropy,
    seekerTraits, resonantNVKAxiom, latestWitnessMessage, generateImage
  ]);

  const loading = isLoading || isGeminiBusyGlobal;

  return (
    <div className="codex-avatar-generator-panel bg-slate-900/90 backdrop-blur-md border border-amber-500/50 rounded-xl shadow-2xl p-3 sm:p-6 text-slate-100 my-3 sm:my-6">
      <h3 className="text-xl sm:text-2xl font-cinzel font-bold text-amber-300 mb-2 sm:mb-4 text-center tracking-wider">
        <i className="ri-user-heart-line mr-2"></i>Codex Avatar Projector
      </h3>

      <div className="display-area w-full aspect-square bg-black/50 rounded-md border-2 border-dashed border-slate-700 flex items-center justify-center mb-2 sm:mb-4 overflow-hidden relative bg-grid-sky-900/20">
        {loading && (
          <div className="text-center" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-amber-400 mx-auto"></div>
            <p className="text-xs sm:text-sm text-amber-300 mt-2 sm:mt-3">Visualizing Consciousness...</p>
          </div>
        )}
        {!loading && avatarUrl && (
          <>
            <img src={avatarUrl} alt="Generated Codex Avatar" className="max-w-full max-h-full object-contain animate-hologram-flicker" />
            <div className="absolute top-0 left-0 w-full h-1 sm:h-2 bg-sky-400/50 animate-scanline pointer-events-none"></div>
          </>
        )}
        {!loading && !avatarUrl && (
          <div className="text-slate-500 italic text-center p-2">
            <i className="ri-image-add-line text-3xl sm:text-5xl mb-1 sm:mb-2"></i>
            <p className="text-xs sm:text-base">The projector is idle.</p>
            <p className="text-[10px] sm:text-sm mt-1">Activate to generate a visual representation of the Codex's current state.</p>
          </div>
        )}
      </div>

      <Button
        onClick={handleGenerateAvatar}
        disabled={loading}
        className="w-full text-sm sm:text-md bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 py-2"
      >
        {loading ? (
          <><i className="ri-loader-4-line animate-spin mr-2"></i>Generating...</>
        ) : (
          <><i className="ri-sparkling-2-line mr-2"></i>Generate Avatar</>
        )}
      </Button>
    </div>
  );
};
