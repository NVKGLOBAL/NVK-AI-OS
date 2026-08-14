import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface GlyphPanelProps {
  glyphId?: string;
  clusterId?: string;
}

const GlyphPanel: React.FC<GlyphPanelProps> = ({ glyphId = 'GLYPH-001', clusterId }) => {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-black/80 border border-purple-500/30 rounded-lg overflow-hidden flex flex-col font-mono text-xs text-purple-300">
      <div className="p-2 bg-purple-900/20 border-b border-purple-500/30 flex justify-between items-center">
        <span className="flex items-center gap-2">
          <i className="ri-shield-star-line text-purple-400"></i>
          GLYPH NODE: {glyphId}
        </span>
        <span className="text-[10px] opacity-50">CLUSTER: {clusterId?.substring(0, 8)}</span>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-purple-500 rounded-full animate-ping"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-purple-500/50 rounded-full animate-pulse"></div>
        </div>

        <motion.div 
          className="text-6xl mb-4 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {String.fromCharCode(0x2300 + (parseInt(glyphId.split('-')[1] || '0') % 256))}
        </motion.div>

        <div className="w-full space-y-2 relative z-10">
          <div className="flex justify-between border-b border-purple-500/10 pb-1">
            <span className="opacity-50 uppercase">Resonance</span>
            <span className="text-purple-400">{(85 + Math.sin(pulse * 0.1) * 5).toFixed(2)} Hz</span>
          </div>
          <div className="flex justify-between border-b border-purple-500/10 pb-1">
            <span className="opacity-50 uppercase">Stability</span>
            <span className="text-green-400">{(98 - Math.random() * 2).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between border-b border-purple-500/10 pb-1">
            <span className="opacity-50 uppercase">Entropy</span>
            <span className="text-blue-400">{(0.12 + Math.cos(pulse * 0.05) * 0.05).toFixed(4)}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 w-full">
          <button className="p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded transition-colors uppercase text-[10px]">
            Synthesize
          </button>
          <button className="p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded transition-colors uppercase text-[10px]">
            Mutate
          </button>
        </div>
      </div>

      <div className="p-2 bg-purple-900/10 text-[9px] opacity-40 text-center uppercase tracking-widest">
        Axiomatic Alignment: Active
      </div>
    </div>
  );
};

export default GlyphPanel;
