import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';

interface OmniWheelProps {
  onMove?: (input: { x: number; y: number }) => void;
  className?: string;
  label?: string;
  color?: string;
  size?: number;
}

export const OmniWheel: React.FC<OmniWheelProps> = ({ 
  onMove, 
  className = '', 
  label = 'Omni-Nav System',
  color = 'cyan',
  size = 120
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Motion values for the handle position
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Constraints for the handle movement
  const radius = size * 0.35;
  const handleSize = size * 0.3;
  
  // Animation frame for continuous updates while dragging
  const requestRef = useRef<number>();
  
  const updateMovement = () => {
    if (isDragging && onMove) {
      // Normalize values to -1 to 1 range
      const normX = x.get() / radius;
      const normY = y.get() / radius;
      
      // Deadzone check
      if (Math.abs(normX) > 0.1 || Math.abs(normY) > 0.1) {
        onMove({ x: normX, y: -normY }); // Invert Y for standard screen coordinates
      }
    }
    requestRef.current = requestAnimationFrame(updateMovement);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateMovement);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isDragging, onMove]);

  const handleDragEnd = () => {
    setIsDragging(false);
    x.set(0);
    y.set(0);
    if (onMove) {
      onMove({ x: 0, y: 0 });
    }
  };

  const colorClasses = {
    cyan: {
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-950/20',
      shadow: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]',
      indicator: 'bg-cyan-500/40',
      handle: 'from-cyan-400 to-blue-600',
      handleShadow: 'shadow-[0_0_20px_rgba(6,182,212,0.5)]',
      glow: 'bg-cyan-400',
      text: 'text-cyan-500/60'
    },
    purple: {
      border: 'border-purple-500/30',
      bg: 'bg-purple-950/20',
      shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
      indicator: 'bg-purple-500/40',
      handle: 'from-purple-400 to-pink-600',
      handleShadow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
      glow: 'bg-purple-400',
      text: 'text-purple-500/60'
    }
  }[color as 'cyan' | 'purple'] || {
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-950/20',
    shadow: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]',
    indicator: 'bg-cyan-500/40',
    handle: 'from-cyan-400 to-blue-600',
    handleShadow: 'shadow-[0_0_20px_rgba(6,182,212,0.5)]',
    glow: 'bg-cyan-400',
    text: 'text-cyan-500/60'
  };

  return (
    <div 
      ref={containerRef}
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none ${className}`}
      id={`omni-wheel-container-${label.replace(/\s+/g, '-').toLowerCase()}`}
    >
      {/* Outer Ring */}
      <div className={`absolute inset-0 rounded-full border-2 ${colorClasses.border} ${colorClasses.bg} backdrop-blur-sm ${colorClasses.shadow}`} />
      
      {/* Inner Decorative Rings */}
      <div className={`absolute inset-[15%] rounded-full border ${colorClasses.border.replace('/30', '/10')}`} />
      <div className={`absolute inset-[30%] rounded-full border ${colorClasses.border.replace('/30', '/5')}`} />
      
      {/* Directional Indicators */}
      <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-1 h-2 ${colorClasses.indicator} rounded-full`} />
      <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-2 ${colorClasses.indicator} rounded-full`} />
      <div className={`absolute left-2 top-1/2 -translate-y-1/2 h-1 w-2 ${colorClasses.indicator} rounded-full`} />
      <div className={`absolute right-2 top-1/2 -translate-y-1/2 h-1 w-2 ${colorClasses.indicator} rounded-full`} />

      {/* The Handle */}
      <motion.div
        drag
        dragConstraints={{ left: -radius, right: radius, top: -radius, bottom: radius }}
        dragElastic={0.1}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x, y, width: handleSize, height: handleSize }}
        className={`relative rounded-full bg-gradient-to-br ${colorClasses.handle} ${colorClasses.handleShadow} cursor-grab active:cursor-grabbing flex items-center justify-center z-10`}
        id={`omni-wheel-handle-${label.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="w-[60%] h-[60%] rounded-full border-2 border-white/20 flex items-center justify-center">
          <div className="w-[25%] h-[25%] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </div>
        
        {/* Glow effect */}
        <motion.div 
          animate={{ scale: isDragging ? 1.2 : 1, opacity: isDragging ? 0.6 : 0.3 }}
          className={`absolute inset-0 rounded-full ${colorClasses.glow} blur-md -z-10`}
        />
      </motion.div>
      
      {/* Label */}
      <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono ${colorClasses.text} uppercase tracking-widest whitespace-nowrap`}>
        {label}
      </div>
    </div>
  );
};
