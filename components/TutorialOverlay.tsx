import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TutorialStep {
  title: string;
  content: string;
  target?: string; // CSS selector or ID
  icon: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to NVK OS",
    content: "Welcome to the Angelic Business Operations OS. We have designed an incredibly simple, step-by-step onboarding sequence for you. Let's explore your new sovereign command system!",
    icon: "ri-shield-star-line"
  },
  {
    title: "1. The Core Orb",
    content: "This central 3D WebGL sphere represents the intelligence center of your machine. Click directly on nodes to boot up systems, or click and drag the orb to explore its geometry.",
    target: "#codex-orb-canvas-container",
    icon: "ri-bubble-chart-line"
  },
  {
    title: "2. The System Dock",
    content: "Located at the bottom center, the Dock houses all your main interfaces. Click any icon here to immediately toggle its corresponding panel open or closed.",
    target: ".dock-container",
    icon: "ri-menu-line"
  },
  {
    title: "3. NVK Logic Core",
    content: "This glowing floating reactor is your autonomous AI assistant. Click it to open the real-time speech and command deck, where you can issue directions or run diagnostics.",
    target: "#nvk-core-button",
    icon: "ri-coreos-line"
  },
  {
    title: "4. NVK Service Tiers",
    content: "Need higher token bandwidth or dedicated logic units? Click the NVK Service Tiers app icon in your Dock to configure and upgrade your sovereign systems.",
    target: "#dock-app-PricingPage",
    icon: "ri-flashlight-line"
  }
];

interface TutorialOverlayProps {
  isVisible?: boolean;
  onComplete: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isVisible: forceVisible, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (forceVisible) {
      setIsVisible(true);
      setCurrentStep(0);
      return;
    }

    const hasSeenTutorial = localStorage.getItem('nvk_tutorial_completed');
    if (!hasSeenTutorial) {
      setIsVisible(true);
    }
  }, [forceVisible]);

  // Track and measure the targeted element dynamically
  useEffect(() => {
    if (!isVisible) return;
    const step = TUTORIAL_STEPS[currentStep];
    
    const updateRect = () => {
      if (!step.target) {
        setTargetRect(null);
        return;
      }
      
      const el = document.querySelector(step.target);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    
    // Periodically poll in case of rendering delay, layout shifts, or animations
    const interval = setInterval(updateRect, 300);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSkip();
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem('nvk_tutorial_completed', 'true');
    onComplete();
  };

  if (!isVisible) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isNearBottom = targetRect ? targetRect.top > window.innerHeight / 2 : false;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[4900] pointer-events-none">
        
        {/* SVG Spotlight Mask Backdrop */}
        <svg className="fixed inset-0 pointer-events-none w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              {/* White fills the screen (opaque mask = dim backdrop) */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black cuts out the spotlight area (transparent mask = see-through highlight) */}
              {targetRect && (
                <rect 
                  x={targetRect.left - 8} 
                  y={targetRect.top - 8} 
                  width={targetRect.width + 16} 
                  height={targetRect.height + 16} 
                  rx="12" 
                  fill="black" 
                />
              )}
            </mask>
          </defs>
          <rect 
            x="0" 
            y="0" 
            width="100%" 
            height="100%" 
            fill="rgba(2, 6, 23, 0.78)" 
            mask="url(#spotlight-mask)" 
            className="transition-all duration-300 pointer-events-auto"
            onClick={(e) => {
              // Block clicking background from closing unless desired, 
              // but allow standard interaction
              e.stopPropagation();
            }}
          />
        </svg>

        {/* Neon Outline Spotlight border and pointer arrow */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'fixed',
              top: targetRect.top - 12,
              left: targetRect.left - 12,
              width: targetRect.width + 24,
              height: targetRect.height + 24,
            }}
            className="border-2 border-cyan-400 rounded-2xl pointer-events-none z-[4910] shadow-[0_0_30px_rgba(34,211,238,0.55)]"
          >
            {/* Pulsing indicator light */}
            <div className="absolute inset-0 border border-cyan-500/30 rounded-2xl animate-ping" style={{ animationDuration: '2s' }}></div>

            {/* Bouncing pointer arrow placement based on vertical location */}
            <div className={`absolute ${isNearBottom ? '-top-14' : '-bottom-14'} left-1/2 -translate-x-1/2 flex flex-col items-center gap-1`}>
              {isNearBottom ? (
                <>
                  <i className="ri-arrow-down-double-line text-cyan-400 text-3xl animate-bounce"></i>
                </>
              ) : (
                <>
                  <i className="ri-arrow-up-double-line text-cyan-400 text-3xl animate-bounce"></i>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Tutorial Card Wrapper */}
        <div 
          className="fixed inset-0 flex items-center justify-center p-6 z-[4950] pointer-events-none"
          style={{
            alignItems: targetRect ? (isNearBottom ? 'flex-start' : 'flex-end') : 'center',
            paddingTop: targetRect && isNearBottom ? '10%' : '1.5rem',
            paddingBottom: targetRect && !isNearBottom ? '10%' : '1.5rem'
          }}
        >
          <motion.div 
            key={currentStep}
            initial={{ scale: 0.95, opacity: 0, y: isNearBottom ? -20 : 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-6 max-w-md w-full shadow-[0_0_60px_rgba(0,255,255,0.25)] relative overflow-hidden pointer-events-auto"
          >
            {/* Decorative Corner Lines */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-400/30 shadow-[0_0_15px_rgba(0,255,255,0.2)] shrink-0">
                  <i className={`${step.icon} text-2xl text-cyan-300 animate-pulse`}></i>
                </div>
                <div>
                  <h2 className="text-cyan-100 font-mono text-base font-bold tracking-wider uppercase">{step.title}</h2>
                  <p className="text-cyan-500/60 font-mono text-[10px] uppercase tracking-widest font-semibold">Step {currentStep + 1} of {TUTORIAL_STEPS.length}</p>
                </div>
              </div>

              <p className="text-slate-350 font-mono text-xs leading-relaxed mb-6">
                {step.content}
              </p>

              <div className="flex items-center justify-between">
                <button 
                  onClick={handleSkip}
                  className="text-slate-500 hover:text-cyan-400 font-mono text-[10px] uppercase tracking-widest font-bold transition-colors"
                >
                  Skip Guide
                </button>
                
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button 
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-mono text-[10px] uppercase tracking-widest font-bold rounded-lg transition-all"
                    >
                      Back
                    </button>
                  )}
                  <button 
                    onClick={handleNext}
                    className="px-5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-mono text-[10px] uppercase tracking-widest font-extrabold rounded-lg shadow-[0_0_15px_rgba(0,255,255,0.15)] transition-all flex items-center gap-1.5"
                  >
                    <span>{currentStep === TUTORIAL_STEPS.length - 1 ? "Get Started" : "Next"}</span>
                    <i className="ri-arrow-right-line text-[11px]"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Custom bottom progress indicator bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-cyan-500/10 w-full">
              <motion.div 
                className="h-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
                transition={{ type: 'spring', stiffness: 50 }}
              />
            </div>
          </motion.div>
        </div>

      </div>
    </AnimatePresence>
  );
};
