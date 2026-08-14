
import React from 'react';

export const Watermark: React.FC = () => {
  return (
    <div className="fixed top-2 left-2 pointer-events-none z-[50] opacity-40 select-none mix-blend-screen flex flex-col items-start">
      <div className="text-[10px] font-mono text-cyan-500 tracking-widest uppercase">
        NVK TECHNOLOGIES
      </div>
      <div className="text-[9px] font-mono text-cyan-700 tracking-wide">
        VER. 2.4.0 | ANGELIC OS
      </div>
    </div>
  );
};

export default Watermark;
