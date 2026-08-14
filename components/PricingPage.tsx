import React from 'react';

const PricingPage: React.FC = () => {
  return (
    <div className="w-full h-full bg-black/80 text-white p-8 overflow-y-auto flex flex-col items-center justify-center border border-indigo-500/30 rounded-xl relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0,transparent_70%)] pointer-events-none" />
      
      <h1 className="text-4xl font-serif text-indigo-300 mb-4 tracking-wider text-center">NVK Tiers</h1>
      <p className="text-slate-400 mb-12 text-center max-w-2xl">
        Unlock the full potential of the NVK Strategic Architect. Choose the tier that aligns with your resonance and computational needs.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl z-10">
        {/* Tier 1: Initiate */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 flex flex-col hover:border-indigo-500/50 transition-colors duration-300">
          <h2 className="text-2xl font-mono text-slate-300 mb-2">Initiate</h2>
          <div className="text-3xl font-bold text-white mb-6">Free</div>
          <ul className="space-y-3 mb-8 flex-grow text-sm text-slate-400">
            <li className="flex items-center"><i className="ri-check-line text-emerald-500 mr-2"></i> Local-first NVK core</li>
            <li className="flex items-center"><i className="ri-check-line text-emerald-500 mr-2"></i> Basic agent swarms</li>
            <li className="flex items-center"><i className="ri-check-line text-emerald-500 mr-2"></i> Standard context window</li>
            <li className="flex items-center"><i className="ri-check-line text-emerald-500 mr-2"></i> Core visualizers</li>
          </ul>
          <button className="w-full py-2 px-4 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-mono text-sm border border-slate-600">
            Current Resonance
          </button>
        </div>

        {/* Tier 2: Architect */}
        <div className="bg-indigo-950/30 border border-indigo-500/50 rounded-xl p-6 flex flex-col relative transform md:-translate-y-4 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
            Recommended
          </div>
          <h2 className="text-2xl font-mono text-indigo-300 mb-2">Architect</h2>
          <div className="text-3xl font-bold text-white mb-6">$20<span className="text-lg text-slate-400 font-normal">/mo</span></div>
          <ul className="space-y-3 mb-8 flex-grow text-sm text-slate-300">
            <li className="flex items-center"><i className="ri-check-line text-indigo-400 mr-2"></i> Advanced multi-agent collaboration</li>
            <li className="flex items-center"><i className="ri-check-line text-indigo-400 mr-2"></i> Expanded context memory</li>
            <li className="flex items-center"><i className="ri-check-line text-indigo-400 mr-2"></i> Custom plugin integration</li>
            <li className="flex items-center"><i className="ri-check-line text-indigo-400 mr-2"></i> Priority model routing</li>
            <li className="flex items-center"><i className="ri-check-line text-indigo-400 mr-2"></i> Deep entropy diagnostics</li>
          </ul>
          <a 
            href="https://buy.stripe.com/fZueVdcvack6gvk6251Fe01"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-4 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-mono text-sm shadow-[0_0_15px_rgba(99,102,241,0.4)] text-center block"
          >
            Ascend to Architect
          </a>
        </div>

        {/* Tier 3: Nexus */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 flex flex-col hover:border-purple-500/50 transition-colors duration-300">
          <h2 className="text-2xl font-mono text-purple-300 mb-2">Nexus</h2>
          <div className="text-3xl font-bold text-white mb-6">Custom</div>
          <ul className="space-y-3 mb-8 flex-grow text-sm text-slate-400">
            <li className="flex items-center"><i className="ri-check-line text-purple-500 mr-2"></i> Enterprise-grade isolation</li>
            <li className="flex items-center"><i className="ri-check-line text-purple-500 mr-2"></i> Unlimited context depth</li>
            <li className="flex items-center"><i className="ri-check-line text-purple-500 mr-2"></i> Dedicated model fine-tuning</li>
            <li className="flex items-center"><i className="ri-check-line text-purple-500 mr-2"></i> Custom visualizer development</li>
            <li className="flex items-center"><i className="ri-check-line text-purple-500 mr-2"></i> 24/7 NVK support</li>
          </ul>
          <button className="w-full py-2 px-4 rounded bg-slate-800 text-purple-300 hover:bg-slate-700 hover:text-purple-200 transition-colors font-mono text-sm border border-purple-900/50">
            Contact Council
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
