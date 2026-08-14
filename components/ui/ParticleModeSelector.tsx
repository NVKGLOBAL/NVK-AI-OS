import React from 'react';
import { ParticleBackgroundMode } from '../../types';
import { motion } from 'motion/react';

interface ParticleModeSelectorProps {
  currentMode: ParticleBackgroundMode;
  onSetMode: (mode: ParticleBackgroundMode) => void;
  availableModes: ParticleBackgroundMode[];
}

export const ParticleModeSelector: React.FC<ParticleModeSelectorProps> = ({ currentMode, onSetMode, availableModes }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="orb-mode-selector" // Reusing the same style
    >
      {availableModes.map(mode => (
        <button
          key={mode}
          onClick={() => onSetMode(mode)}
          className={`orb-mode-button ${currentMode === mode ? 'active' : ''}`}
          aria-pressed={currentMode === mode}
          title={`Switch to ${mode} background`}
        >
          {mode}
        </button>
      ))}
    </motion.div>
  );
};