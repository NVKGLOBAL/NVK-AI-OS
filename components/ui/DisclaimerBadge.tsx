import React from 'react';
import { getDisclaimer, getApplicableDisclaimers } from '../../lib/DisclaimerEngine';

interface DisclaimerBadgeProps {
  content: string;
}

export const DisclaimerBadge: React.FC<DisclaimerBadgeProps> = ({ content }) => {
  const applicableContexts = getApplicableDisclaimers(content);

  if (applicableContexts.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
      {applicableContexts.map((context) => (
        <div key={context} className="flex items-start gap-2 text-[10px] text-white/40 font-mono leading-tight">
          <svg className="w-3 h-3 text-white/30 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="opacity-70">{getDisclaimer(context)}</span>
        </div>
      ))}
    </div>
  );
};
