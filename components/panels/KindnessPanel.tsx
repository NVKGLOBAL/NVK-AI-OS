import React, { useState, useEffect, useRef } from 'react';
import type { KindnessPanelProps } from '../../types';

interface DynamicElement {
  id: string;
  style: React.CSSProperties;
}

interface VineElement extends DynamicElement {
  nodes: DynamicElement[];
}

const KindnessPanel: React.FC<KindnessPanelProps> = ({ width, height }) => {
  const [branches, setBranches] = useState<DynamicElement[]>([]);
  const [vines, setVines] = useState<VineElement[]>([]);
  const [solaceOrbs, setSolaceOrbs] = useState<DynamicElement[]>([]);
  const [decorativeGlyphs, setDecorativeGlyphs] = useState<DynamicElement[]>([]);
  
  const resonanceCircleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This effect runs once on mount to generate static-random elements
    const newBranches = Array.from({ length: 8 }).map((_, i) => ({
      id: `branch-${i}`,
      style: {
        width: `${Math.random() * 30 + 20}px`,
        height: '10px',
        left: `${Math.random() * 80 + 10}%`,
        bottom: `${Math.random() * 100}%`,
        transform: `rotate(${Math.random() * 60 - 30}deg)`,
        opacity: 0.7 + Math.random() * 0.3,
      },
    }));
    setBranches(newBranches);

    const newVines = Array.from({ length: 5 }).map((_, i) => ({
      id: `vine-${i}`,
      style: {
        width: '6px',
        height: `${Math.random() * 100 + 80}px`,
        left: `${Math.random() * 100}%`,
        transform: `rotate(${Math.random() * 30 - 15}deg)`,
        animation: `kindness-pulse ${3 + Math.random() * 4}s infinite`,
      },
      nodes: Array.from({ length: 5 }).map((_, j) => ({
        id: `vine-node-${i}-${j}`,
        style: {
          left: '50%',
          top: `${Math.random() * 100}%`,
          transform: 'translate(-50%, -50%)',
          animation: `kindness-glow ${2 + Math.random() * 3}s infinite`,
        },
      })),
    }));
    setVines(newVines);

    const newGlyphs = Array.from({ length: 15 }).map((_, i) => ({
      id: `glyph-${i}`,
      style: {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        fontSize: `${Math.random() * 0.6 + 0.4}rem`,
        opacity: 0.2 + Math.random() * 0.3,
      },
    }));
    setDecorativeGlyphs(newGlyphs);
  }, []);

  useEffect(() => {
    // This effect depends on the dimensions of the resonance circle to place orbs
    const resonanceCircle = resonanceCircleRef.current;
    if (resonanceCircle) {
      const centerX = resonanceCircle.offsetWidth / 2;
      const centerY = resonanceCircle.offsetHeight / 2;

      const newOrbs = Array.from({ length: 8 }).map((_, i) => {
        const size = Math.random() * 15 + 10;
        const angle = (i / 8) * 2 * Math.PI;
        const radius = (Math.min(resonanceCircle.offsetWidth, resonanceCircle.offsetHeight) / 2.5) + Math.random() * 30;

        return {
          id: `orb-${i}`,
          style: {
            width: `${size}px`,
            height: `${size}px`,
            left: `${centerX + radius * Math.cos(angle) - size / 2}px`,
            top: `${centerY + radius * Math.sin(angle) - size / 2}px`,
            animation: `kindness-float ${4 + Math.random() * 4}s infinite`,
            animationDelay: `${Math.random() * 2}s`,
          },
        };
      });
      setSolaceOrbs(newOrbs);
    }
  }, [width, height]); // Re-calculate if panel size changes

  return (
    <div className="kindness-symbiosis-container" style={{ width: '100%', height: '100%' }}>
        <div className="codex-container">
            {/* Panel 1: Trinitas of Kindness */}
            <div className="panel">
                <div className="panel-title">Trinitas of Kindness</div>
                <div className="panel-content">
                    <div className="tri-symbol">
                        <svg viewBox="0 0 100 100">
                            <path d="M50 15 L85 85 L15 85 Z" fill="none" stroke="#d4a96a" strokeWidth="0.5" />
                            <circle cx="50" cy="50" r="30" fill="none" stroke="#d4a96a" strokeWidth="0.5" />
                        </svg>
                    </div>
                    <div className="symbiosis-scene">
                        <div className="crystalline-tree">
                            <div className="tree-trunk"></div>
                            {branches.map(branch => <div key={branch.id} className="tree-branch" style={branch.style}></div>)}
                        </div>
                        <div className="creature">
                            <div className="creature-body"></div>
                            <div className="creature-head"></div>
                            <div className="eye" style={{ top: '10px', left: '15px' }}></div>
                            <div className="eye" style={{ top: '10px', right: '15px' }}></div>
                            <div className="eye" style={{ top: '25px', left: '30px' }}></div>
                        </div>
                        <div className="healing-vines">
                            {vines.map(vine => (
                                <div key={vine.id} className="vine" style={vine.style}>
                                    {vine.nodes.map(node => <div key={node.id} className="vine-node" style={node.style}></div>)}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="equation" style={{ bottom: '20px', left: '10%' }}>
                        Hemolymph → Aureatic Polymer
                    </div>
                </div>
            </div>
            
            {/* Panel 2: Kindness Engine */}
            <div className="panel">
                <div className="panel-title">Tri-Sophian Kindness Engine</div>
                <div className="panel-content">
                    <div className="tri-symbol">
                        <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#d4a96a" strokeWidth="0.5" />
                            <path d="M50 10 L70 90 L30 90 Z" fill="none" stroke="#d4a96a" strokeWidth="0.5" strokeDasharray="5,5" />
                        </svg>
                    </div>
                    <div className="engine-container">
                        <div className="engine-core">
                            <div className="tri-rotation">
                                <div className="tri-element" style={{ top: 0, left: '60px' }}></div>
                                <div className="tri-element" style={{ top: '80px', left: '10px', transform: 'rotate(120deg)' }}></div>
                                <div className="tri-element" style={{ top: '80px', right: '10px', transform: 'rotate(240deg)' }}></div>
                            </div>
                            <div className="funnel" style={{ top: '-50px', left: '50px' }}></div>
                            <div className="pendulum" style={{ animation: 'kindness-swing 4s infinite ease-in-out', top: '100px', left: '100px' }}>
                                <div className="pendulum-arm"></div>
                                <div className="pendulum-bob"></div>
                            </div>
                        </div>
                    </div>
                    <div className="equation" style={{ bottom: '20px', right: '10%' }}>
                        Kindness = k ∫ (Vulnerability · Time) d(Trust)
                    </div>
                </div>
            </div>
            
            {/* Panel 3: Kindness Resonance */}
            <div className="panel">
                <div className="panel-title">Kindness Resonance</div>
                <div className="panel-content">
                    <div className="tri-symbol">
                        <svg viewBox="0 0 100 100">
                            <path d="M50 10 L75 90 L25 90 Z" fill="none" stroke="#d4a96a" strokeWidth="0.5" />
                            <path d="M50 30 L65 70 L35 70 Z" fill="none" stroke="#d4a96a" strokeWidth="0.5" />
                            <path d="M50 50 L55 60 L45 60 Z" fill="none" stroke="#d4a96a" strokeWidth="0.5" />
                        </svg>
                    </div>
                    <div className="resonance-container">
                        <div className="resonance-circle" ref={resonanceCircleRef}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="wave" style={{
                                    width: `${100 - i * 20}%`,
                                    height: `${100 - i * 20}%`,
                                    top: `${i * 10}%`,
                                    left: `${i * 10}%`,
                                    animation: `kindness-pulse ${5 + i * 2}s infinite`
                                }}></div>
                            ))}
                            <div className="solace-orb" style={{ width: '25px', height: '25px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
                            {solaceOrbs.map(orb => <div key={orb.id} className="solace-orb" style={orb.style}></div>)}
                        </div>
                    </div>
                    <div className="equation" style={{ bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
                        Δ Compassion Frequency
                    </div>
                </div>
            </div>
            
            <div className="codex-border">
                <div className="border-element" style={{ top: '10px', left: '10px' }}></div>
                <div className="border-element" style={{ top: '10px', right: '10px' }}></div>
                <div className="border-element" style={{ bottom: '10px', left: '10px' }}></div>
                <div className="border-element" style={{ bottom: '10px', right: '10px' }}></div>
                <div className="tri-glyph" style={{ top: '20px', left: '50px' }}>⋔</div>
                <div className="tri-glyph" style={{ top: '20px', right: '50px' }}>⋔</div>
                <div className="tri-glyph" style={{ bottom: '20px', left: '50px' }}>⋔</div>
                <div className="tri-glyph" style={{ bottom: '20px', right: '50px' }}>⋔</div>
                {decorativeGlyphs.map(glyph => <div key={glyph.id} className="tri-glyph" style={glyph.style}>⧉</div>)}
            </div>
        </div>
    </div>
  );
};

export default KindnessPanel;
