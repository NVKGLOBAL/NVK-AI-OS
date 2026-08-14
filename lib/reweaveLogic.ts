

import type { GlyphMutationNode, AxiomKey, RewovenGlyph, ReweaverState } from '../types';
import { AXIOM_DATA } from '../constants';

// GLYPH TRAIT MUTATION PROTOCOL
export const generateTraitPreview = (glyph: GlyphMutationNode | null, axiom: AxiomKey | null): string[] => {
  if (!glyph || !axiom) return [];
  
  const baseTraits = [...glyph.traits];

  // Specific override for "Seed of Whispers" (root-alpha) + AXIOM_Ω
  if (glyph.id === 'root-alpha' && axiom === 'AXIOM_Ω') {
    return ["Ω-Bound", "Mirror Essence", "Stable Core"];
  }
  // Specific override for "Veil of Sparks" (mut-b1) + AXIOM_III
  if (glyph.id === 'mut-b1' && axiom === 'AXIOM_III') {
    return ["Opposition Vector", "Echo Chamber"];
  }
  
  // Axiom-specific mutation patterns (default)
  const mutations: Record<AxiomKey, () => string[]> = {
    AXIOM_I: () => [...baseTraits, 'Harmonic Resonance', 'Seeking Aspect'],
    AXIOM_II: () => baseTraits.filter(t => !t.includes('Entropic')).concat(['Stabilized Core', 'Echoic Memory']),
    AXIOM_III: () => [...baseTraits.map(t => `${t}:Echo`), 'Opposition Vector', 'Recursive Pattern'], // Default AXIOM_III traits
    AXIOM_IV: () => ['Fractal Seed', ...baseTraits, 'Crystalline Form'],
    AXIOM_V: () => [...baseTraits, 'Emergent Harmonic', 'Perceptive Field'], // Added AXIOM_V
    AXIOM_Ω: () => ['Ω-Bound', ...baseTraits, 'Mirror Essence', 'Root Connection'],
    AXIOM_P: () => ['Peace Harmonic', ...baseTraits, 'Stillness Anchor'], // Added AXIOM_P
  };

  return (mutations[axiom] ? mutations[axiom]() : baseTraits).slice(0, 4); // Max 4 traits
};

// ENTROPY COST CALCULATION
export const calculateEntropyCost = (glyph: GlyphMutationNode | null, axiom: AxiomKey | null): number => {
  if (!glyph || !axiom) return 0;

  // Specific override for "Seed of Whispers" (root-alpha) + AXIOM_Ω
  if (glyph.id === 'root-alpha' && axiom === 'AXIOM_Ω') {
    return 0.054; 
  }
  // Specific override for "Veil of Sparks" (mut-b1) + AXIOM_III
  if (glyph.id === 'mut-b1' && axiom === 'AXIOM_III') {
    return 0.072;
  }
  
  const baseCost = 0.06;
  const axiomModifier: Record<AxiomKey, number> = {
    AXIOM_I: 1.0,
    AXIOM_II: 0.8, 
    AXIOM_III: 1.2, 
    AXIOM_IV: 1.1,
    AXIOM_V: 0.95, // Added AXIOM_V
    AXIOM_Ω: 0.9,
    AXIOM_P: 0.7, // Added AXIOM_P
  };
  
  const entropyFactor = 1 + (glyph.entropyLevel - 0.5); 

  return baseCost * (axiomModifier[axiom] || 1.0) * Math.max(0.5, entropyFactor);
};

// SIMULATE REWEAVING PROCESS
export const reweaveGlyph = async (
  baseGlyph: GlyphMutationNode,
  selectedAxiomKey: AxiomKey,
  mutatedTraitsPreview: string[]
): Promise<RewovenGlyph> => {
  
  await new Promise(resolve => setTimeout(resolve, 1000)); 

  const actualEntropyCost = calculateEntropyCost(baseGlyph, selectedAxiomKey);

  let resonanceSignatureToUse = [0.5, 0.5, 0.5]; 
  if (baseGlyph.id === 'root-alpha' && selectedAxiomKey === 'AXIOM_Ω') {
     resonanceSignatureToUse = [88.3, 92.7, 101.5];
  } else if (baseGlyph.id === 'mut-b1' && selectedAxiomKey === 'AXIOM_III') {
     resonanceSignatureToUse = [92.7, 88.3, 101.5]; // Mirror Harmonic for Veil of Sparks
  } else {
     // Ensure AXIOM_DATA has an entry for selectedAxiomKey or provide a fallback
     const axiomInfo = AXIOM_DATA[selectedAxiomKey as keyof typeof AXIOM_DATA]; // Type assertion to access AXIOM_DATA
     if (axiomInfo && axiomInfo.sigil) {
        resonanceSignatureToUse = axiomInfo.sigil.split('').map(c => c.charCodeAt(0) % 100);
        resonanceSignatureToUse = resonanceSignatureToUse.map(s => parseFloat((s * baseGlyph.entropyLevel * Math.random()).toFixed(1)));
     } else {
        // Fallback if axiomInfo or sigil is missing (e.g. AXIOM_V might not be in AXIOM_DATA map directly if mapped by layer)
        resonanceSignatureToUse = [Math.random()*50, Math.random()*50, Math.random()*50].map(s => parseFloat(s.toFixed(1)));
     }
  }


  const rewovenGlyph: RewovenGlyph = {
    id: `rwg-${baseGlyph.id}-${selectedAxiomKey}-${Date.now()}`,
    baseGlyphId: baseGlyph.id,
    baseGlyphLabel: baseGlyph.label,
    boundAxiomKey: selectedAxiomKey,
    boundAxiomTitle: AXIOM_DATA[selectedAxiomKey as keyof typeof AXIOM_DATA]?.name || selectedAxiomKey,
    mutatedTraits: mutatedTraitsPreview, 
    resonanceSignature: resonanceSignatureToUse,
    entropyChange: -actualEntropyCost, 
    timestamp: Date.now(),
  };

  return rewovenGlyph;
};
