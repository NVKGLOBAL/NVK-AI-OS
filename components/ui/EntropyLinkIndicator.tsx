
import React from 'react';

const EntropyLinkIndicator: React.FC<{ entropy: number }> = ({ entropy }) => {
  const getLinkStrength = () => {
    if (entropy < 0.33) return 'strong';
    if (entropy < 0.66) return 'wavering';
    return 'fragile';
  };
  
  const strength = getLinkStrength();
  const pulseDuration = Math.max(1, (1 - entropy) * 5 + 1); // Duration from 1s to 6s
  const opacity = Math.max(0.2, entropy * 0.8 + 0.2) ; // Opacity based on entropy

  const colorClass = 
    strength === 'strong' ? 'text-sky-300 border-sky-400' :
    strength === 'wavering' ? 'text-yellow-300 border-yellow-400' :
    'text-red-400 border-red-500';

  return (
    <div className={`entropy-link flex items-center space-x-1.5 text-xs font-mono px-2 py-0.5 rounded border ${colorClass}`}>
      <span className="label">Entropy Link:</span>
      <span className={`strength font-semibold`}>{strength.toUpperCase()}</span>
      <div 
        className="pulse w-1.5 h-1.5 rounded-full bg-current" 
        style={{ 
          animation: `pulse-fast ${pulseDuration}s infinite`, // Using existing pulse-fast animation
          animationDelay: `${Math.random() * 0.5}s`, // Random delay to desync multiple indicators
          opacity: opacity,
        }} 
      />
    </div>
  );
};

export default EntropyLinkIndicator;
