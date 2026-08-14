
import React from 'react';
import type { AxiomKey } from '../../../types';
import { AXIOM_DATA } from '../../../constants';

interface MappedAxiom {
  key: AxiomKey;
  name: string;
  sigil: string;
  color: string;
}

interface AxiomRadialMenuProps {
  selectedAxiom: AxiomKey | null;
  onSelectAxiom: (axiomKey: AxiomKey) => void;
  availableAxioms: MappedAxiom[]; // Use the mapped type
}

const AxiomRadialMenu: React.FC<AxiomRadialMenuProps> = ({ selectedAxiom, onSelectAxiom, availableAxioms }) => {
  const radius = 80; // pixels for translation
  const orbSize = 50; // pixels for orb diameter

  return (
    <div 
      className="relative w-52 h-52 md:w-64 md:h-64 mx-auto my-4 flex items-center justify-center"
      role="menu"
      aria-label="Axiom Selection Menu"
    >
      {/* Central decorative element */}
      <div className="absolute w-16 h-16 rounded-full bg-slate-700 border-2 border-emerald-600/50 shadow-inner flex items-center justify-center">
        <i className="ri-git-commit-fill text-3xl text-emerald-400"></i>
      </div>

      {availableAxioms.map((axiomInfo, i) => {
        const angleRad = (i * (360 / availableAxioms.length) - 90) * (Math.PI / 180); // Start from top, clockwise
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;
        
        // axiomInfo directly contains key, name, sigil, color from the mappedAxioms prop
        if (!axiomInfo || !axiomInfo.key || !axiomInfo.sigil || !axiomInfo.color || !axiomInfo.name) {
            // console.warn("Skipping rendering AxiomOrb due to missing info:", axiomInfo);
            return null; // Skip rendering if essential data is missing
        }


        return (
          <button
            key={axiomInfo.key}
            role="menuitemradio"
            aria-checked={selectedAxiom === axiomInfo.key}
            className={`axiom-orb absolute w-[${orbSize}px] h-[${orbSize}px] rounded-full 
                        flex items-center justify-center cursor-pointer 
                        border-2 transition-all duration-200 ease-in-out transform hover:scale-110
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-400
                        ${selectedAxiom === axiomInfo.key 
                          ? `${axiomInfo.color} border-emerald-300 shadow-lg scale-110 ring-2 ring-emerald-300` 
                          : `${axiomInfo.color} opacity-70 border-transparent hover:opacity-100 hover:shadow-md`
                        }`}
            style={{
              transform: `translate(${x}px, ${y}px)`,
              width: `${orbSize}px`,
              height: `${orbSize}px`,
            }}
            onClick={() => onSelectAxiom(axiomInfo.key)}
            title={`Select Axiom: ${axiomInfo.name}`}
          >
            <span className="text-xl font-cinzel font-bold text-white mix-blend-overlay">{axiomInfo.sigil}</span>
          </button>
        );
      })}
    </div>
  );
};

export default AxiomRadialMenu;
