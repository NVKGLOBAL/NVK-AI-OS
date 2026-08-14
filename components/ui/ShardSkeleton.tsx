import React from 'react';

export interface ShardSkeletonProps {
  variant: 'chart' | 'table' | 'agent-decision' | 'council-brief' | 'text-block';
}

export const ShardSkeleton: React.FC<ShardSkeletonProps> = ({ variant }) => {
  if (variant === 'chart') {
    return (
      <div className="w-full h-full p-6 flex flex-col gap-4 animate-pulse pt-2">
        <div className="h-4 bg-white/10 w-1/3 rounded"></div>
        <div className="h-64 bg-white/5 rounded-lg border border-white/5 relative overflow-hidden">
          {/* Mock chart lines */}
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-white/10 to-transparent"></div>
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="w-full h-full p-4 flex flex-col gap-3 animate-pulse pt-2">
        <div className="h-4 bg-white/10 w-1/4 rounded mb-2"></div>
        <div className="flex justify-between border-b border-white/10 pb-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-3 bg-white/10 w-1/5 rounded"></div>)}
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between py-2 border-b border-white/5">
            {[...Array(4)].map((_, j) => <div key={j} className="h-3 bg-white/5 w-1/5 rounded"></div>)}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'agent-decision') {
    return (
      <div className="w-full h-full p-6 animate-pulse space-y-6 pt-2">
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/10 w-1/5 rounded"></div>
            <div className="h-6 bg-white/10 w-3/4 rounded"></div>
          </div>
          <div className="h-8 w-16 bg-white/10 rounded"></div>
        </div>
        <div className="h-24 bg-white/5 rounded border border-white/10 p-4">
           <div className="h-3 bg-[#C9A84C]/20 w-1/4 rounded mb-4"></div>
           <div className="h-3 bg-white/10 w-full rounded mb-2"></div>
           <div className="h-3 bg-white/10 w-4/5 rounded mb-2"></div>
        </div>
        <div className="space-y-2">
           <div className="h-8 bg-white/5 rounded"></div>
           <div className="h-8 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  if (variant === 'council-brief') {
    return (
      <div className="w-full h-full p-6 animate-pulse space-y-6 pt-2">
        <div className="h-6 bg-white/10 w-1/2 rounded"></div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
             <div key={i} className="h-32 bg-white/5 rounded border border-white/10"></div>
          ))}
        </div>
        <div className="h-3 bg-white/10 w-1/4 rounded"></div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-white/5 w-full rounded"></div>)}
        </div>
      </div>
    );
  }

  // default text-block
  return (
    <div className="w-full h-full p-6 flex flex-col gap-4 animate-pulse pt-2">
      <div className="h-6 bg-white/10 w-1/2 rounded mb-2"></div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className={`h-3 bg-white/5 rounded ${i % 2 === 0 ? 'w-full' : 'w-5/6'}`}></div>
      ))}
    </div>
  );
};
