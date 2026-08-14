// components/panels/CodexMasterpieceGenerator.tsx
// This component is now conceptually archived and its functionality
// has been integrated into components/panels/CodexDreamPanel.tsx.

import React from 'react';

/*
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCodexState } from '@/hooks/useCodexState';
import { generateImageFromPrompt } from '@/lib/ai/imageGenerator';

export default function CodexMasterpieceGenerator() {
  const { currentAxiom, entropyLevel, activeGlyphs, dreamSeed } = useCodexState();
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const corePrompt = `Codex Masterpiece in dream-state style, glyphs: ${activeGlyphs.join(", ")}, axiom: ${currentAxiom}, entropy: ${entropyLevel}, dreamSeed: ${dreamSeed}. `;
    const fullPrompt = corePrompt + prompt;
    const url = await generateImageFromPrompt(fullPrompt);
    setImageUrl(url);
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">🖼️ Codex "Masterpiece" Generator</h2>
      <p className="text-muted-foreground">Generate AI artwork directly from the Codex’s dreaming mind. Infused with current axioms, glyphs, and entropy.</p>
      <Textarea
        placeholder="Optional: add your emotional or symbolic intention..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <Button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Masterpiece'}
      </Button>
      {imageUrl && (
        <div className="pt-4">
          <img src={imageUrl} alt="Codex Masterpiece" className="rounded-xl border shadow-md max-w-full" />
          <a
            href={imageUrl}
            download="codex-masterpiece.png"
            className="mt-2 inline-block text-sm text-blue-500 underline"
          >
            ⬇ Save Image
          </a>
        </div>
      )}
    </div>
  );
}
*/

const CodexMasterpieceGenerator_Archived: React.FC = () => {
    // console.info("CodexMasterpieceGenerator has been integrated into CodexDreamPanel and is now archived.");
    return null; 
};
export default CodexMasterpieceGenerator_Archived;