import React, { useState, useCallback } from 'react';
import { OmniWheel } from './OmniWheel';
import { FlightInput } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, RotateCcw } from 'lucide-react';
import { useSystemState } from '../../context/SystemContext';

interface FlightControllerProps {
  onFlightChange: (input: FlightInput) => void;
  onRecenter?: () => void;
  className?: string;
}

export const FlightController: React.FC<FlightControllerProps> = ({ onFlightChange, onRecenter, className = '' }) => {
  const { isMobile } = useSystemState();
  const [isLocked, setIsLocked] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [flightData, setFlightData] = useState<FlightInput>({
    translation: { x: 0, y: 0, z: 0 },
    rotation: { pitch: 0, yaw: 0, roll: 0 },
    isLocked: false
  });

  const updateFlight = useCallback((newData: Partial<FlightInput>) => {
    setFlightData(prev => {
      const updated = { ...prev, ...newData };
      onFlightChange(updated);
      return updated;
    });
  }, [onFlightChange]);

  const handleTranslation = (input: { x: number; y: number }) => {
    if (isLocked) return;
    updateFlight({
      translation: { x: input.x, y: 0, z: input.y } // Y on joystick maps to Z (forward/backward)
    });
  };

  const handleRotation = (input: { x: number; y: number }) => {
    if (isLocked) return;
    updateFlight({
      rotation: { pitch: input.y, yaw: input.x, roll: 0 }
    });
  };

  const toggleLock = () => {
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    updateFlight({ isLocked: newLocked });
  };

  const resetFlight = () => {
    const resetData = {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { pitch: 0, yaw: 0, roll: 0 },
      isLocked: isLocked
    };
    setFlightData(resetData);
    onFlightChange(resetData);
  };

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="bg-black/80 backdrop-blur-md border border-cyan-500/30 p-3 rounded-full text-cyan-400 shadow-[0_0_15px_rgba(0,255,179,0.2)] hover:bg-cyan-500/10 transition-all pointer-events-auto"
        title={isCollapsed ? "Open Navigation" : "Close Navigation"}
      >
        <i className={`ri-compass-3-line text-xl ${!isCollapsed ? 'rotate-90' : ''} transition-transform duration-300`}></i>
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="flex items-end gap-4 sm:gap-8 p-4 sm:p-6 bg-black/60 backdrop-blur-xl rounded-2xl sm:rounded-t-3xl border border-cyan-500/20 pointer-events-auto shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
          >
            {/* Translation Wheel (Left) */}
            <div className="flex flex-col items-center gap-2">
              <OmniWheel 
                label="Translation" 
                onMove={handleTranslation} 
                color="cyan"
                size={isMobile ? 80 : 120}
              />
            </div>

            {/* Center Controls */}
            <div className="flex flex-col gap-3 sm:gap-4 mb-2 sm:mb-4">
              <button
                onClick={toggleLock}
                className={`p-2 sm:p-3 rounded-full border transition-all duration-300 ${
                  isLocked 
                    ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                    : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20'
                }`}
                title={isLocked ? "Unlock Navigation" : "Lock Navigation"}
              >
                {isLocked ? <Lock size={isMobile ? 16 : 20} /> : <Unlock size={isMobile ? 16 : 20} />}
              </button>
              
              <button
                onClick={resetFlight}
                className="p-2 sm:p-3 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                title="Reset Inputs"
              >
                <RotateCcw size={isMobile ? 16 : 20} />
              </button>

              {onRecenter && (
                <button
                  onClick={onRecenter}
                  className="p-2 sm:p-3 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 transition-all"
                  title="Recenter on Orb"
                >
                  <i className={`ri-focus-3-line ${isMobile ? 'text-base' : 'text-xl'}`}></i>
                </button>
              )}
            </div>

            {/* Rotation Wheel (Right) */}
            <div className="flex flex-col items-center gap-2">
              <OmniWheel 
                label="Rotation" 
                onMove={handleRotation} 
                color="purple"
                size={isMobile ? 80 : 120}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
