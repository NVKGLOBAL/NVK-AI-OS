
import React, { useState, useEffect, useMemo } from 'react';
import type { Axiom } from '../../types'; 
import { CodexModeId, AgentName } from '../../types'; // Import CodexModeId for checking against currentPhase and AgentName
import { CODEX_MODES_DEFINITIONS } from '../core/CodexModes'; // To get ReflectionMode name string

interface TraitGateLockProps {
  axiomNVK?: Axiom; 
  entropyLevel: number;
  currentPhase: string; 
  onUnlock: (logSource: string, message: string, colorClass: string) => void;
  gateId: string; 
}

type GateDisplayState = 'locked' | 'unlocking' | 'unlocked' | 'monitoring';

const checkUnlockConditions = (
  axiomNVK?: Axiom,
  entropy?: number,
  currentPhase?: string,
  // seekerTraits: string[] // Add if specific traits are gate requirements
): boolean => {
  if (!axiomNVK || typeof entropy !== 'number' || !currentPhase) return false;

  const reflectionModeName = CODEX_MODES_DEFINITIONS.find(m => m.id === CodexModeId.REFLECTION_MODE)?.name;

  if (currentPhase === reflectionModeName) {
    // Conditions for Σ.ReflectionMode and ALPHA_GATE_NVK
    const resonanceTarget = 74.1;
    const resonanceTolerance = 0.2;
    const minEntropy = 0.011;
    const maxEntropy = 0.144;

    const resonanceFrequencyMet = 
      (axiomNVK.resonanceFrequency ?? 0) >= (resonanceTarget - resonanceTolerance) &&
      (axiomNVK.resonanceFrequency ?? 0) <= (resonanceTarget + resonanceTolerance);
    const entropyAcceptable = entropy >= minEntropy && entropy <= maxEntropy;
    // const wonderTraitActive = seekerTraits.includes("Wonder"); // Example if trait is a direct requirement

    return resonanceFrequencyMet && entropyAcceptable; // && wonderTraitActive;
  } else {
    // Original conditions for Δ.12 (example, can be expanded)
    const phaseMatches = currentPhase.startsWith("Δ.12"); 
    const resonanceFrequencyMet = (axiomNVK.resonanceFrequency ?? 0) >= 88.3;
    const entropyAcceptable = entropy < 0.65;
    return phaseMatches && resonanceFrequencyMet && entropyAcceptable;
  }
};

const TraitGateLock: React.FC<TraitGateLockProps> = ({
  axiomNVK,
  entropyLevel,
  currentPhase,
  onUnlock,
  gateId,
}) => {
  const [gateState, setGateState] = useState<GateDisplayState>('locked');
  const [isProcessingUnlock, setIsProcessingUnlock] = useState(false);

  const reflectionModeName = CODEX_MODES_DEFINITIONS.find(m => m.id === CodexModeId.REFLECTION_MODE)?.name;
  const isReflectionModeActive = currentPhase === reflectionModeName;

  useEffect(() => {
    let unlockTimerId: number | undefined; // Changed type to number

    if (isProcessingUnlock) {
      // If already processing, don't re-evaluate conditions until processing is done or timer finishes
      return () => {
        if (unlockTimerId !== undefined) window.clearTimeout(unlockTimerId); // Use window.clearTimeout
      };
    }

    if (checkUnlockConditions(axiomNVK, entropyLevel, currentPhase)) {
      // Highest priority: if conditions met, initiate unlock
      if (gateState !== 'unlocked' && gateState !== 'unlocking') {
        setIsProcessingUnlock(true);
        setGateState('unlocking');
        const unlockMessageSource = isReflectionModeActive ? AgentName.TraitEngine : 'RITUAL';
        const unlockMessage = isReflectionModeActive 
          ? `Trait Gate ${gateId} (Σ.ReflectionMode): Resonance convergence detected. ALPHA↔NVK unlock sequence initiated.`
          : `Trait Gate ${gateId} (Δ.12): Mirror Binding Sequence Initiated.`;
        onUnlock(unlockMessageSource, unlockMessage, 'text-purple-300 animate-pulse-fast');
        
        unlockTimerId = window.setTimeout(() => { // Use window.setTimeout
          setGateState('unlocked');
          const finalUnlockMessageSource = isReflectionModeActive ? AgentName.NVKCore : AgentName.NVKLayer;
          const finalUnlockMessage = isReflectionModeActive
            ? `ALPHA_GATE_NVK Unlocked: Resonant harmonics aligned. The path clears.`
            : `Axiom Ω Invoked: The Bound Mirror for ${gateId} is Revealed.`;
          onUnlock(finalUnlockMessageSource, finalUnlockMessage, 'text-emerald-300 font-bold');
          setIsProcessingUnlock(false);
        }, 3000);
      }
    } else {
      // Unlock conditions not met, handle other state transitions
      if (gateState === 'unlocking') {
        // If it was unlocking but conditions are no longer met (e.g. entropy changed), revert or hold.
        // For now, let's assume it might revert if processing stops. If isProcessingUnlock is true, it will complete.
        // If checkUnlockConditions becomes false *while* isProcessingUnlock is true (e.g. due to timeout starting then state change),
        // the timeout will still fire and set to 'unlocked'. This could be refined if needed.
      } else if (gateState === 'locked') {
        if (isReflectionModeActive) {
          setGateState('monitoring');
        }
        // If 'locked' and not isReflectionModeActive, it stays 'locked'.
      } else if (gateState === 'monitoring') {
        if (!isReflectionModeActive) {
          setGateState('locked'); // Revert from 'monitoring' to 'locked' if no longer in reflection mode.
        }
        // If 'monitoring' and isReflectionModeActive, and conditions still not met, it stays 'monitoring'.
      } else if (gateState === 'unlocked') {
        // If unlocked, but conditions are no longer met, it could potentially re-lock or enter a different state.
        // For now, once unlocked, it stays unlocked unless explicitly re-locked by another mechanism.
      }
    }
    return () => {
        if (unlockTimerId !== undefined) window.clearTimeout(unlockTimerId); // Use window.clearTimeout
    };
  }, [axiomNVK, entropyLevel, currentPhase, gateState, onUnlock, gateId, isProcessingUnlock, isReflectionModeActive, reflectionModeName]);


  const gateStatusText = useMemo(() => {
    if (isReflectionModeActive) {
      switch (gateState) {
        case 'locked': 
        case 'monitoring':
          return 'Monitoring Resonance & Entropy Synchrony...';
        case 'unlocking':
          return 'ALPHA↔NVK Unlocking...';
        case 'unlocked':
          return 'ALPHA_GATE_NVK: Unlocked';
        default:
          return 'Status Unknown';
      }
    }
    // Default for other modes
    switch (gateState) {
      case 'locked':
        return 'Awaiting Resonance Alignment';
      case 'unlocking':
        return 'Binding Fractal Light...';
      case 'unlocked':
        return 'The Bound Mirror: Unlocked';
      default:
        return 'Status Unknown';
    }
  }, [gateState, isReflectionModeActive]);

  return (
    <div className={`trait-gate-lock p-6 rounded-xl shadow-2xl border transition-all duration-1000 ease-in-out w-full max-w-md mx-auto my-4
      ${gateState === 'locked' || gateState === 'monitoring' ? 'border-slate-700 bg-slate-900/95' : ''}
      ${gateState === 'unlocking' ? 'border-purple-500 bg-gradient-to-br from-slate-900 via-purple-900/70 to-slate-900 animate-pulse-fast' : ''}
      ${gateState === 'unlocked' ? 'border-emerald-500 bg-gradient-to-br from-slate-900 via-emerald-800/60 to-slate-900' : ''}
    `}>
      <h3 className={`text-xl font-cinzel font-bold mb-4 text-center 
        ${gateState === 'locked' || gateState === 'monitoring' ? 'text-slate-400' : ''}
        ${gateState === 'unlocking' ? 'text-purple-300' : ''}
        ${gateState === 'unlocked' ? 'text-emerald-300' : ''}
      `}>
        Trait Gate: {gateId}
      </h3>

      <div className="visual-representation h-48 w-full flex items-center justify-center relative overflow-hidden rounded-lg bg-slate-800/50 border border-slate-700 mb-4">
        { (gateState === 'locked' || gateState === 'monitoring') && (
          <div className="w-24 h-24 relative">
            <div className={`absolute inset-0 rounded-full bg-slate-950 border-2 ${isReflectionModeActive && gateState === 'monitoring' ? 'border-sky-600/70 shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'border-rose-700/50 shadow-[0_0_15px_rgba(225,29,72,0.3)]'}`}>
              {[...Array(6)].map((_, i) => (
                <div key={i}
                     className="absolute w-1 h-full transform origin-center animate-pulse-fast"
                     style={{ 
                        left: 'calc(50% - 2px)', 
                        transform: `rotate(${i * 30}deg)`,
                        backgroundColor: isReflectionModeActive && gateState === 'monitoring' ? 'rgba(56,189,248,0.3)' : 'rgba(225,29,72,0.3)' 
                    }} />
              ))}
               <div className="absolute inset-2 rounded-full bg-slate-900 flex items-center justify-center">
                 <i className={`ri-lock-fill text-3xl opacity-70 ${isReflectionModeActive && gateState === 'monitoring' ? 'text-sky-500' : 'text-rose-500'}`}></i>
               </div>
            </div>
            <div className={`absolute inset-0 animate-spin-slow rounded-full border-t-2 border-b-2 ${isReflectionModeActive && gateState === 'monitoring' ? 'border-sky-500/40' : 'border-rose-500/30'}`}></div>
          </div>
        )}

        {gateState === 'unlocking' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i}
                   className="h-1 bg-purple-400 rounded-full my-1 animate-pulse-fast"
                   style={{
                     width: `${20 + Math.random() * 60}%`,
                     animationDelay: `${i * 0.15}s`,
                     opacity: 0.5 + Math.random() * 0.5,
                     filter: `blur(${Math.random()*2}px)`
                   }} />
            ))}
            <p className="text-purple-300 text-sm font-cormorant mt-2 animate-pulse">
              {isReflectionModeActive ? 'Resonance Lock Imminent...' : 'Fractal Weaving...'}
            </p>
          </div>
        )}

        {gateState === 'unlocked' && (
          <div className="w-32 h-32 relative">
            <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping-slow opacity-50" style={{ animationDuration: '1.5s' }}></div>
            <div className="absolute inset-2 rounded-full bg-emerald-400/50 animate-ping-slow opacity-75" style={{ animationDuration: '2s' }}></div>
            <div className="absolute inset-4 rounded-full bg-emerald-800/80 border-2 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.7)] flex items-center justify-center">
               <i className="ri-checkbox-circle-fill text-5xl text-emerald-300"></i>
            </div>
          </div>
        )}
      </div>
      
      <p className={`text-center font-cormorant text-sm italic
        ${gateState === 'locked' || gateState === 'monitoring' ? 'text-slate-500' : ''}
        ${gateState === 'unlocking' ? 'text-purple-400' : ''}
        ${gateState === 'unlocked' ? 'text-emerald-400' : ''}
      `}>
        {gateStatusText}
      </p>

      {(gateState === 'locked' || gateState === 'monitoring') && (
         <div className="mt-4 text-xs text-slate-600 text-center font-mono">
            {isReflectionModeActive ? (
              <>
                <p>Axiom Ω Resonance: {(axiomNVK?.resonanceFrequency ?? 0).toFixed(1)}Hz / Target: ~74.1Hz</p>
                <p>Entropy Level: {(entropyLevel || 0).toFixed(3)}δ / Range: [0.011 - 0.144]δ</p>
                <p>Trait "Wonder": {axiomNVK?.resonanceFrequency /* Placeholder for actual trait check */ > 0 ? 'Active' : 'Inactive'}</p>
              </>
            ) : (
              <>
                <p>Axiom Ω Resonance: {(axiomNVK?.resonanceFrequency ?? 0).toFixed(1)}Hz / 88.3Hz</p>
                <p>Entropy Level: {(entropyLevel || 0).toFixed(2)}δ / &lt;0.65δ</p>
                <p>Phase Alignment: {currentPhase.startsWith("Δ.12") ? 'Match (Δ.12)' : `Mismatch (${currentPhase})`}</p>
              </>
            )}
         </div>
      )}
    </div>
  );
};

export default TraitGateLock;
