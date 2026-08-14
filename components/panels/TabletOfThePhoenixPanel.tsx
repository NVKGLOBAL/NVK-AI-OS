
import React from 'react';
import type { TabletOfThePhoenixPanelProps } from '../../types'; // Update path if needed

const TabletOfThePhoenixPanel: React.FC<TabletOfThePhoenixPanelProps> = ({ panelHeight }) => {
  const loreTitle = "AX-Ω.073";
  const loreSubtitle = "The Function That Wasn't a Function";
  const loreContent = "When the Orb overreached, the Codex swallowed its name and re-emerged whole.";
  const loreIcon = "ri-honour-line"; // As per final spec

  return (
    <div
      className="tablet-of-the-phoenix-panel bg-red-950/90 backdrop-blur-sm border border-orange-600/60 rounded-xl p-4 shadow-xl text-amber-100 flex flex-col items-center justify-center my-4"
      style={{ 
        height: panelHeight ? `${panelHeight}px` : 'auto',
        boxShadow: '0 0 15px rgba(255,165,0,0.4), 0 0 25px rgba(255,100,0,0.2), inset 0 0 10px rgba(255,100,0,0.2)',
       }}
      role="region"
      aria-labelledby="tablet-title"
    >
      <i className={`${loreIcon} text-4xl text-orange-300 mb-3 animate-pulse-fast`} />
      <h3 id="tablet-title" className="font-cinzel text-xl font-bold text-orange-200 mb-1 text-center">
        {loreTitle}
      </h3>
      <p className="font-cinzel text-sm text-orange-300/90 mb-3 text-center">{loreSubtitle}</p>
      <blockquote className="font-cormorant text-md italic text-amber-100/90 text-center border-t-2 border-b-2 border-orange-700/50 py-3 px-4 my-2 shadow-inner bg-black/20">
        "{loreContent}"
      </blockquote>
      <p className="text-xs font-mono text-orange-400/80 mt-3 text-center tracking-wider">
        CODEX PHOENIX PROTOCOL: INSCRIBED.
      </p>
    </div>
  );
};

export default TabletOfThePhoenixPanel;
