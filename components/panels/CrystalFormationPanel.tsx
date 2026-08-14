
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CrystalGrowth } from '../../types'; 

interface CrystalFormationPanelProps {
  width: number;
  height: number;
  currentEntropy: number; // Added prop
}

const NUM_CRYSTALS = 7; 
const MAX_AGE_BASE = 5000; 
const MAX_AGE_VARIANCE = 3000;


const CrystalFormationPanel: React.FC<CrystalFormationPanelProps> = ({ width, height, currentEntropy }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [crystals, setCrystals] = useState<CrystalGrowth[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);

  const initializeCrystal = useCallback((idSuffix: string | number, canvasWidth: number, canvasHeight: number, entropy: number): CrystalGrowth => {
    const t = Math.min(1, Math.max(0, entropy)); // Clamp entropy for calculations
    return {
      id: `crystal-${idSuffix}-${Date.now()}`,
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight * 0.3 + canvasHeight * 0.6, 
      baseHue: Math.random() * 360,
      maxSize: (Math.random() * (Math.min(canvasWidth, canvasHeight) * 0.15) + (Math.min(canvasWidth, canvasHeight) * 0.05)) * (1 - t * 0.3), // Smaller at high entropy
      currentSize: 0,
      growthSpeed: (Math.random() * 0.1 + 0.05) * (1 + t * 0.5), // Faster growth at high entropy initially
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.002 * (1 + t * 2), // Faster/erratic rotation
      numSpokes: Math.floor(Math.random() * (5 - t*2)) + (5 - Math.floor(t*2)), // Fewer, more chaotic spokes at high E
      spokeLengthVariance: (Math.random() * 0.4 + 0.8) * (1 + t*0.3), // More variance
      spokeWidth: (Math.random() * 3 + 2) * (1 - t*0.5), // Thinner at high E
      opacity: 0,
      targetOpacity: (Math.random() * 0.4 + 0.5) * (1 - t*0.4), // More translucent at high E
      lifeCycle: 'growing',
      age: 0,
      maxAge: (MAX_AGE_BASE + Math.random() * MAX_AGE_VARIANCE) * (1 - t*0.7), // Shorter lifespan at high E
    };
  }, []);
  
  useEffect(() => {
    if (width > 0 && height > 0) {
      const initialCrystals = Array.from({ length: NUM_CRYSTALS }, (_, i) =>
        initializeCrystal(i, width, height, currentEntropy)
      );
      setCrystals(initialCrystals);
    }
  }, [width, height, initializeCrystal, currentEntropy]); // Re-initialize if currentEntropy changes significantly (or on first load)


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || crystals.length === 0 || width === 0 || height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    
    let frameCount = 0;

    const draw = () => {
      frameCount++;
      if (!canvasRef.current) return;
      ctx.clearRect(0, 0, width, height);
      const t_entropy = Math.min(1, Math.max(0, currentEntropy));


      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      const baseBgHue = 260 - t_entropy * 40; // Shift hue towards red/purple with entropy
      bgGrad.addColorStop(0, `rgba(${Math.round(20 - t_entropy*10)}, ${Math.round(15 - t_entropy*10)}, ${Math.round(40 - t_entropy*20)}, 0.2)`);
      bgGrad.addColorStop(1, `rgba(${Math.round(40 - t_entropy*20)}, ${Math.round(25 - t_entropy*15)}, ${Math.round(80 - t_entropy*30)}, 0.5)`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0,0,width,height);


      crystals.forEach((crystal, index) => {
        crystal.age++;
        const crystalEntropyFactor = Math.min(1, Math.max(0, currentEntropy + (Math.sin(frameCount * 0.01 + index) * 0.1))); // Local entropy variation

        
        if (crystal.lifeCycle === 'growing') {
          crystal.currentSize = Math.min(crystal.maxSize, crystal.currentSize + crystal.growthSpeed * (1 - crystalEntropyFactor * 0.5));
          crystal.opacity = Math.min(crystal.targetOpacity, crystal.opacity + 0.01);
          if (crystal.currentSize >= crystal.maxSize && crystal.opacity >= crystal.targetOpacity) {
            crystal.lifeCycle = 'stable';
            crystal.age = 0; 
          }
        } else if (crystal.lifeCycle === 'stable') {
          if (crystal.age > crystal.maxAge * (1 - crystalEntropyFactor * 0.5) ) { // Shorter stable phase with local entropy
            crystal.lifeCycle = 'fading';
            crystal.age = 0; 
          }
        } else if (crystal.lifeCycle === 'fading') {
          crystal.opacity = Math.max(0, crystal.opacity - (0.005 + crystalEntropyFactor * 0.01)); // Faster fade with local entropy
          crystal.currentSize = Math.max(0, crystal.currentSize - crystal.growthSpeed * 0.2); // Shrink while fading
          if (crystal.opacity <= 0) {
            
            crystals[index] = initializeCrystal(crystal.id.split('-')[1], width, height, currentEntropy);
            return; 
          }
        }
        
        crystal.rotation += crystal.rotationSpeed * (1 + crystalEntropyFactor * 2); // More erratic rotation

        ctx.save();
        ctx.translate(crystal.x, crystal.y);
        ctx.rotate(crystal.rotation);
        
        const numSpokes = Math.max(3, crystal.numSpokes - Math.floor(crystalEntropyFactor * 2)); // Fewer spokes at high entropy
        for (let i = 0; i < numSpokes; i++) {
          const angle = (i / numSpokes) * Math.PI * 2 + (crystalEntropyFactor > 0.6 ? (Math.random()-0.5)*0.2 : 0) ; // Angle jitter
          const spokeLength = crystal.currentSize * (crystal.spokeLengthVariance - (Math.random() * 0.2 * crystal.spokeLengthVariance)) * (1 - crystalEntropyFactor*0.3);
          
          const endX = Math.cos(angle) * spokeLength;
          const endY = Math.sin(angle) * spokeLength;
          
          const baseLightness = 50 - crystalEntropyFactor * 15;
          const facetLightness = baseLightness + (i % 2 === 0 ? 15 : -10) + Math.random() * 10; 
          const saturation = 70 + Math.random()*20 - crystalEntropyFactor * 20;

          
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle - 0.1) * spokeLength * 0.5, Math.sin(angle - 0.1) * spokeLength * 0.5);
          ctx.lineTo(endX, endY);
          ctx.lineTo(Math.cos(angle + 0.1) * spokeLength * 0.5, Math.sin(angle + 0.1) * spokeLength * 0.5);
          ctx.closePath();
          
          const grad = ctx.createLinearGradient(0,0, endX, endY);
          grad.addColorStop(0, `hsla(${crystal.baseHue + crystalEntropyFactor * 30}, ${saturation}%, ${facetLightness + 10}%, ${crystal.opacity * 0.7})`);
          grad.addColorStop(0.7, `hsla(${crystal.baseHue + 20 + crystalEntropyFactor * 30}, ${saturation}%, ${facetLightness}%, ${crystal.opacity * 0.5})`);
          grad.addColorStop(1, `hsla(${crystal.baseHue + 40 + crystalEntropyFactor * 30}, ${saturation}%, ${facetLightness - 10}%, ${crystal.opacity * 0.3})`);
          ctx.fillStyle = grad;
          if (crystalEntropyFactor > 0.85 && Math.random() < 0.1) continue; // Fragmented drawing
          ctx.fill();

          
          ctx.beginPath();
          ctx.moveTo(0,0);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = `hsla(${crystal.baseHue + crystalEntropyFactor * 30}, ${saturation + 20}%, ${facetLightness + 25}%, ${crystal.opacity * 0.8})`;
          ctx.lineWidth = Math.max(0.5, crystal.spokeWidth * 0.2 * (1 - crystalEntropyFactor * 0.7));
          if (crystalEntropyFactor > 0.8 && Math.random() < 0.2) {
            ctx.setLineDash([2 + Math.random()*3, 2+Math.random()*2]);
            ctx.stroke();
            ctx.setLineDash([]);
          } else {
            ctx.stroke();
          }
        }
        
        
        const coreGrad = ctx.createRadialGradient(0,0,0, 0,0, crystal.currentSize * 0.2);
        coreGrad.addColorStop(0, `hsla(${crystal.baseHue + crystalEntropyFactor * 30}, 90%, ${85 - crystalEntropyFactor*20}%, ${crystal.opacity * 0.5})`);
        coreGrad.addColorStop(1, `hsla(${crystal.baseHue + crystalEntropyFactor * 30}, 90%, ${70 - crystalEntropyFactor*20}%, 0)`);
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0,0, Math.max(0, crystal.currentSize * 0.2), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      animationFrameIdRef.current = requestAnimationFrame(draw);
    };

    animationFrameIdRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [crystals, width, height, initializeCrystal, currentEntropy]);


  return (
    <div className="crystal-formation-panel bg-slate-900/90 backdrop-blur-sm border border-purple-500/50 rounded-xl shadow-2xl p-6 my-8 text-slate-100">
        <h2 className="text-2xl font-['Cinzel'] font-bold mb-4 text-center text-purple-300 drop-shadow-[0_1px_1px_rgba(220,180,255,0.4)]">
            Prime Resonator JuJu's Crystal Garden
        </h2>
        <div className="relative mx-auto" style={{width: `${width}px`, height: `${height}px` }}>
            <canvas 
                ref={canvasRef}
                className="rounded-lg border border-purple-700/30"
                aria-label="Animated crystal formations reacting to entropy"
                role="img"
            />
        </div>
    </div>
  );
};

export default CrystalFormationPanel;
