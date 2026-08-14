import React, { useState } from 'react';
import { motion } from 'motion/react';

const ETHICAL_PILLARS = [
  { id: 'transparency', name: 'Transparency', value: 95, color: 'bg-cyan-500', description: 'Degree to which decisions and processes are explainable and visible to stakeholders.' },
  { id: 'fairness', name: 'Fairness & Equity', value: 92, color: 'bg-purple-500', description: 'Mitigation of bias and equitable treatment across all operations and interactions.' },
  { id: 'accountability', name: 'Accountability', value: 98, color: 'bg-rose-500', description: 'Clear attribution of actions and mechanisms for redress and human oversight.' },
  { id: 'privacy', name: 'Privacy & Security', value: 100, color: 'bg-emerald-500', description: 'Protection of sensitive data and adherence to NVK data principles.' },
  { id: 'sustainability', name: 'Sustainability', value: 85, color: 'bg-lime-500', description: 'Optimization of resource consumption and long-term ecological impact.' },
  { id: 'alignment', name: 'Value Alignment', value: 96, color: 'bg-indigo-500', description: 'Adherence to core organizational values and human-centric goals.' },
];

const EthicalFrameworkPanel: React.FC = () => {
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 p-6 flex flex-col overflow-hidden border border-slate-800 rounded-xl relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.05)_0,transparent_70%)] pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 z-10 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-serif text-slate-100 flex items-center gap-3">
          <i className="ri-scales-3-line text-emerald-400"></i>
          Ethical & Moral Framework
        </h2>
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded border border-slate-700">
          <i className="ri-shield-check-fill text-emerald-500"></i>
          <span className="text-xs font-mono text-slate-300">Alignment: <span className="text-emerald-400 font-bold">94.3%</span></span>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto z-10 pr-2 custom-scrollbar flex flex-col gap-6">
        
        <div className="bg-slate-900/40 p-5 rounded-lg border border-slate-800">
          <h3 className="text-sm font-medium text-slate-200 mb-4 uppercase tracking-wider">Moral Compass Configuration</h3>
          <div className="space-y-4">
            {ETHICAL_PILLARS.map(pillar => (
              <div 
                key={pillar.id}
                onMouseEnter={() => setSelectedPillar(pillar.id)}
                onMouseLeave={() => setSelectedPillar(null)}
                className="relative"
              >
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-medium ${selectedPillar === pillar.id ? 'text-white' : 'text-slate-400'}`}>{pillar.name}</span>
                  <span className="font-mono text-slate-500">{pillar.value}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${pillar.value}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${pillar.color} ${selectedPillar === pillar.id ? 'opacity-100' : 'opacity-70'}`}
                  />
                </div>
                {selectedPillar === pillar.id && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 mt-2 z-20 w-full bg-slate-800 border border-slate-700 p-3 rounded shadow-xl text-xs text-slate-300"
                  >
                    {pillar.description}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/40 p-5 rounded-lg border border-slate-800">
            <h3 className="text-sm font-medium text-slate-200 mb-4 uppercase tracking-wider">Recent Ethical Interventions</h3>
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm">
                <div className="mt-0.5"><i className="ri-shield-keyhole-line text-purple-400"></i></div>
                <div>
                  <div className="text-slate-200">Hiring Algorithm Adjustment</div>
                  <div className="text-xs text-slate-500 mt-1">Detected potential bias in resume screening. Adjusted weights to prioritize skill-based assessment over historical proxy data.</div>
                </div>
              </li>
              <li className="flex gap-3 text-sm">
                <div className="mt-0.5"><i className="ri-eye-off-line text-emerald-400"></i></div>
                <div>
                  <div className="text-slate-200">Data Minimization Enforced</div>
                  <div className="text-xs text-slate-500 mt-1">Blocked CRM agent from scraping non-essential personal data from public social profiles to maintain strict privacy compliance.</div>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="bg-slate-900/40 p-5 rounded-lg border border-slate-800">
            <h3 className="text-sm font-medium text-slate-200 mb-4 uppercase tracking-wider">Decision Guardrails</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700">
                <span className="text-sm text-slate-300">Human-in-the-Loop Threshold</span>
                <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-amber-400">Risk &gt; 15%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700">
                <span className="text-sm text-slate-300">Max Autonomous Spend</span>
                <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-emerald-400">$5,000</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700">
                <span className="text-sm text-slate-300">Data Retention Policy</span>
                <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-cyan-400">Strict (30 Days)</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EthicalFrameworkPanel;
