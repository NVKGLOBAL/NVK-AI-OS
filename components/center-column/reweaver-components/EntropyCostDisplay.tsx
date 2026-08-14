import React from 'react';

// Correcting logic based on how it's used:
// calculateEntropyCost returns a positive value for cost.
// reweaveGlyph uses this for new RewovenGlyph().entropyChange = -actualEntropyCost
// So, if this component receives `calculatedEntropyCost` directly from `reweaveLogic.calculateEntropyCost`,
// then positive `cost` means a negative `entropyChange` (stabilizing).

const EntropyCostDisplay: React.FC<{cost: number}> = ({cost}) => {
     const displayValue = (cost || 0).toFixed(3);
     const effectText = cost > 0 ? "Stabilizing" : cost < 0 ? "Destabilizing" : "Neutral";
     const textColor = cost > 0 ? "text-green-400" : cost < 0 ? "text-rose-400" : "text-slate-500";

    return (
         <div className="text-center text-sm mb-3">
             <span className="text-slate-400 font-cormorant">Projected System Entropy Change: </span>
             <span className={`font-semibold font-mono ${textColor}`}>
                 {cost > 0 ? `-${displayValue}` : (cost < 0 ? `+${(Math.abs(cost || 0)).toFixed(3)}` : "0.000")}δ
             </span>
             <span className={`text-xs ml-1 ${textColor}`}>({effectText})</span>
         </div>
     );
}

export default EntropyCostDisplay;
