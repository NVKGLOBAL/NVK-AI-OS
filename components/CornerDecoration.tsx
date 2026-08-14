

import React from 'react';

interface CornerDecorationProps {
  position: 'tl' | 'tr' | 'bl' | 'br';
  glowClass: string;
}

export const CornerDecoration: React.FC<CornerDecorationProps> = ({ position, glowClass }) => {
  let positionClasses = '';
  let borderImageGradient = '';

  switch (position) {
    case 'tl':
      positionClasses = 'top-[5px] left-[5px] border-t-2 border-l-2';
      borderImageGradient = `linear-gradient(135deg, currentColor 0%, transparent 80%) 1`;
      break;
    case 'tr':
      positionClasses = 'top-[5px] right-[5px] border-t-2 border-r-2';
      borderImageGradient = `linear-gradient(225deg, currentColor 0%, transparent 80%) 1`;
      break;
    case 'bl':
      positionClasses = 'bottom-[5px] left-[5px] border-b-2 border-l-2';
      borderImageGradient = `linear-gradient(45deg, currentColor 0%, transparent 80%) 1`;
      break;
    case 'br':
      positionClasses = 'bottom-[5px] right-[5px] border-b-2 border-r-2';
      borderImageGradient = `linear-gradient(315deg, currentColor 0%, transparent 80%) 1`;
      break;
  }

  return (
    <div
      className={`corner-decoration absolute w-10 h-10 pointer-events-none ${positionClasses} ${glowClass}`}
      style={{ borderImage: borderImageGradient }}
    ></div>
  );
};