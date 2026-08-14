import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  category: string;
}

interface LeadItem {
  id: string;
  name: string;
  score: number;
  value: number;
  status: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  sentiment: number; // 1-10
  burnRisk: 'Nominal' | 'Warning' | 'Critical';
  salary: number;
}

interface WorkflowTask {
  id: string;
  title: string;
  assignee: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Queue' | 'Active' | 'Complete';
}

const OPERATIONS_MODULES = [
  { id: 'finance', name: 'Financial Management', icon: 'ri-money-dollar-circle-line', description: 'Interactive runway calculators, custom expense ledger logs, and budget planners.', color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30' },
  { id: 'hr', name: 'Human Resources', icon: 'ri-group-line', description: 'Active team sentiment tracker, burnout risk mitigation, and hiring pipeline cores.', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
  { id: 'crm', name: 'CRM & Sales', icon: 'ri-customer-service-2-line', description: 'Lead pipeline management, predictive opportunity scoring, and outreach planners.', color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
  { id: 'logistics', name: 'Supply Chain', icon: 'ri-truck-line', description: 'Dynamic transit routing, shipping calculators, and hub optimization metrics.', color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
  { id: 'marketing', name: 'Marketing Workspace', icon: 'ri-megaphone-line', description: 'Brand tone copy generators, campaign simulators, and ROI calculations.', color: 'text-pink-400', bg: 'bg-pink-900/20', border: 'border-pink-500/30' },
  { id: 'workflow', name: 'Operations & Workflow', icon: 'ri-flow-chart', description: 'Interactive tick queue engines, prioritization builders, and task routers.', color: 'text-cyan-400', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30' },
];

const OperationsDashboardPanel: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'finance' | 'hr' | 'crm' | 'logistics' | 'marketing' | 'workflow'>('finance');
  
  // Finance States
  const [revenue, setRevenue] = useState(124000); // Monthly Custom
  const [burnRate, setBurnRate] = useState(84000); // Monthly Custom
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { id: 'exp-1', name: 'Server clusters (WebGPU)', amount: 15000, category: 'Infrastructure' },
    { id: 'exp-2', name: 'AI reasoning token proxies', amount: 35000, category: 'Infrastructure' },
    { id: 'exp-3', name: 'Lattice engineering hub lease', amount: 20000, category: 'Operations' }
  ]);
  const [newExpName, setNewExpName] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCat, setNewExpCat] = useState('Marketing');
  const [estimatedRunway, setEstimatedRunway] = useState(18.5);

  // CRM States
  const [leads, setLeads] = useState<LeadItem[]>([
    { id: 'ld-1', name: 'Acme Mega Corp', score: 94, value: 120000, status: 'Ready to Close' },
    { id: 'ld-2', name: 'Globex Synthetics', score: 88, value: 85000, status: 'Engaged' },
    { id: 'ld-3', name: 'Initech Core', score: 82, value: 45000, status: 'Evaluating' }
  ]);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadValue, setNewLeadValue] = useState('');
  const [newLeadScore, setNewLeadScore] = useState('85');

  // HR States
  const [team, setTeam] = useState<TeamMember[]>([
    { id: 'tm-1', name: 'Dr. Sarah Avery', role: 'Chief Neural Architect', sentiment: 8.5, burnRisk: 'Nominal', salary: 14000 },
    { id: 'tm-2', name: 'Vikram Mercer', role: 'Lead Frontend Developer', sentiment: 5.2, burnRisk: 'Warning', salary: 10000 },
    { id: 'tm-3', name: 'Anya Chen', role: 'System Operations Lead', sentiment: 7.8, burnRisk: 'Nominal', salary: 11000 }
  ]);
  const [newHireName, setNewHireName] = useState('');
  const [newHireRole, setNewHireRole] = useState('Developer');
  const [newHireSalary, setNewHireSalary] = useState('9000');

  // Logistics States
  const [logWeight, setLogWeight] = useState('500');
  const [logOrigin, setLogOrigin] = useState('Neo-Tokyo Hub');
  const [logTransitCost, setLogTransitCost] = useState(4200);

  // Marketing States
  const [mktProduct, setMktProduct] = useState('NVK LATTICE OS V2');
  const [mktTone, setMktTone] = useState<'cyber' | 'executive' | 'bold'>('cyber');
  const [generatedCopy, setGeneratedCopy] = useState('');

  // Workflow States
  const [tasks, setTasks] = useState<WorkflowTask[]>([
    { id: 'tk-1', title: 'Compile build release patch', assignee: 'Anya Chen', priority: 'High', status: 'In Queue' },
    { id: 'tk-2', title: 'Verify secure encryption rules', assignee: 'Sarah Avery', priority: 'High', status: 'Active' },
    { id: 'tk-3', title: 'Refine world clock GMT offset', assignee: 'Vikram Mercer', priority: 'Medium', status: 'Complete' }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Calculate Runway
  const recomputeRunway = () => {
    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const netMonthly = revenue - (burnRate + totalExpenses);
    if (netMonthly >= 0) {
      setEstimatedRunway(99.0); // Sustainable inf months
    } else {
      const remainingCapital = 1500000; // Simulated active reserves
      const calculatedRange = remainingCapital / Math.abs(netMonthly);
      setEstimatedRunway(parseFloat(calculatedRange.toFixed(1)));
    }
  };

  useEffect(() => {
    recomputeRunway();
  }, [revenue, burnRate, expenses]);

  // CRM lead actions
  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadValue.trim()) return;

    const newLd: LeadItem = {
      id: `ld-${Date.now()}`,
      name: newLeadName.trim(),
      score: parseInt(newLeadScore) || 75,
      value: parseFloat(newLeadValue) || 10000,
      status: 'Captured'
    };

    setLeads([...leads, newLd]);
    setNewLeadName('');
    setNewLeadValue('');
  };

  const handlePruneLead = (id: string) => {
    setLeads(leads.filter(l => l.id !== id));
  };

  // HR actions
  const handleHireMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHireName.trim()) return;

    const newMbr: TeamMember = {
      id: `tm-${Date.now()}`,
      name: newHireName.trim(),
      role: newHireRole,
      sentiment: 8.5,
      burnRisk: 'Nominal',
      salary: parseFloat(newHireSalary) || 8000
    };

    setTeam([...team, newMbr]);
    setNewHireName('');
  };

  const handleMitigateBurnout = (id: string) => {
    setTeam(team.map(m => {
      if (m.id === id) {
        return { 
          ...m, 
          sentiment: Math.min(10.0, m.sentiment + 1.8),
          burnRisk: 'Nominal'
        } as TeamMember;
      }
      return m;
    }));
  };

  // Finance Actions
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpName.trim() || !newExpAmount.trim()) return;

    const newExp: ExpenseItem = {
      id: `exp-${Date.now()}`,
      name: newExpName.trim(),
      amount: parseFloat(newExpAmount) || 1000,
      category: newExpCat
    };

    setExpenses([...expenses, newExp]);
    setNewExpName('');
    setNewExpAmount('');
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // Logistics compute
  const handleLogisticsCompute = (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = parseFloat(logWeight) || 0;
    let multiplier = 5.2;
    if (logOrigin.includes('Tokyo')) multiplier = 8.4;
    if (logOrigin.includes('Svalbard')) multiplier = 12.0;

    setLogTransitCost(Math.round(weightVal * multiplier + 1200));
  };

  // Marketing Generator client-side engine
  const handleGenerateCopy = (e: React.FormEvent) => {
    e.preventDefault();
    const product = mktProduct.toUpperCase();
    let copy = '';

    if (mktTone === 'cyber') {
      copy = `[SYNAPSE ANNOUNCEMENT FEED: ${product}]\n\nEngage the absolute matrix. Our updated spatial core is alive and glowing. Experience the ultimate zero-egress environment complete with custom geocoding mapped rails, secure inbox channels, and real active local terminal engines. Master the threadcoil and unlock your ultimate high-integrity potential immediately!`;
    } else if (mktTone === 'executive') {
      copy = `We are proud to introduce ${product} by NVK Global.\n\nAn architectural paradigm engineered for elite operating parameters, featuring local WebGPU scaling adapters, full directory permissions, and real-time ledger audits. Optimize operational burn-rates and achieve persistent strategic synergy right out of the box. No hidden third-party subscription overhead required.`;
    } else {
      copy = `${product}: THOUSANDS OF $$$ IN VALUE, PACKED IN ONE WORKSPACE.\n\nStop paying tech tax! Master your files, configure custom world-clocks, chart shipment transit budgets, and coordinate workflows in a single elegant viewport. Secure. Stable. Scaled for the corporate edge.`;
    }
    setGeneratedCopy(copy);
  };

  // Workflow actions
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTk: WorkflowTask = {
      id: `tk-${Date.now()}`,
      title: newTaskTitle.trim(),
      assignee: team[Math.floor(Math.random() * team.length)]?.name || 'Anya Chen',
      priority: newTaskPriority,
      status: 'In Queue'
    };

    setTasks([...tasks, newTk]);
    setNewTaskTitle('');
  };

  const handleAdvanceTask = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        let nextStatus: 'In Queue' | 'Active' | 'Complete' = 'Complete';
        if (t.status === 'In Queue') nextStatus = 'Active';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 p-4 sm:p-5 flex flex-col overflow-hidden border border-slate-800 rounded-xl relative select-none font-mono text-xs">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.05)_0,transparent_60%)] pointer-events-none" />
      
      {/* Module Title Header and System Status */}
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
        <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <i className="ri-dashboard-3-line text-indigo-400 text-base sm:text-lg"></i>
          ANGELIC OPERATIONS SUITE
        </h2>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] text-slate-500 uppercase font-bold tracking-widest">Sys_Status: Nominal</span>
        </div>
      </div>

      <div className="flex-grow overflow-hidden flex flex-col md:flex-row gap-4 min-h-0">
        
        {/* Operations module items sidebar menu */}
        <div className="w-full md:w-52 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible md:overflow-y-auto custom-scrollbar shrink-0 select-none pb-2 md:pb-0">
          {OPERATIONS_MODULES.map(module => (
            <button 
              key={module.id}
              onClick={() => setActiveModule(module.id as any)}
              className={`w-full text-left p-2.5 rounded-lg border flex flex-col gap-1 transition-all text-xs cursor-pointer shrink-0 md:shrink ${activeModule === module.id ? `bg-slate-900 border-slate-650 shadow` : `bg-slate-900/10 border-white/5 hover:bg-slate-900/60`}`}
              style={{ minWidth: '140px' }}
            >
              <div className="flex items-center gap-2">
                <i className={`${module.icon} text-sm ${module.color}`}></i>
                <span className="font-bold text-slate-200 text-xs uppercase truncate">{module.name.split(' ')[0]}</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal hidden md:block">{module.description}</p>
            </button>
          ))}
        </div>

        {/* Core details view with interactive tools */}
        <div className="flex-grow bg-slate-900/30 rounded-xl border border-white/5 p-4 flex flex-col min-h-0 overflow-y-auto custom-scrollbar relative">
          
          {/* FINANCIAL MANAGEMENT MODULE */}
          {activeModule === 'finance' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="font-bold text-emerald-400 uppercase tracking-widest text-xs">FINANCIAL LEDGER & RUNWAY SIMULATOR</span>
              </div>

              {/* Simulation metrics inputs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">MONTHLY REV ($)</span>
                  <input
                    type="number"
                    value={revenue}
                    onChange={(e) => setRevenue(parseInt(e.target.value) || 0)}
                    className="bg-transparent border-none text-white text-sm font-semibold outline-none mt-1 p-0 font-mono w-full"
                  />
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">BASE BURN RATE ($)</span>
                  <input
                    type="number"
                    value={burnRate}
                    onChange={(e) => setBurnRate(parseInt(e.target.value) || 0)}
                    className="bg-transparent border-none text-white text-sm font-semibold outline-none mt-1 p-0 font-mono w-full"
                  />
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 flex flex-col items-center justify-center relative">
                  <span className="text-[10px] text-slate-500 uppercase font-bold text-center">SOLVED RUNWAY</span>
                  <div className="text-base text-emerald-400 font-bold mt-1">
                    {estimatedRunway >= 90 ? 'INIFINITE' : `${estimatedRunway} MO`}
                  </div>
                </div>
              </div>

              {/* Expense Addition ledgers */}
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900 space-y-3">
                <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                  <span className="text-[10.5px] text-slate-400 uppercase tracking-wider font-bold">INBOUND EXTRA CAPITAL EXPENDITURES</span>
                  <span className="text-[10.5px] text-slate-600 font-bold">TOTAL EXPENSES: ${expenses.reduce((a,c) => a + c.amount, 0)}</span>
                </div>

                <div className="max-h-24 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 text-xs">
                  {expenses.map((exp) => (
                    <div key={exp.id} className="flex justify-between items-center bg-slate-900/30 p-1 px-2 rounded border border-white/5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                        <span className="text-slate-350 font-medium truncate">{exp.name}</span>
                        <span className="text-[10px] bg-slate-900 px-1 rounded text-slate-500 uppercase">{exp.category}</span>
                      </div>
                      <div className="flex items-center gap-2 cursor-pointer shrink-0">
                        <span className="text-white font-semibold">${exp.amount}</span>
                        <button 
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-slate-600 hover:text-rose-400 transition-colors"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddExpense} className="grid grid-cols-3 gap-2 pt-1 select-none text-[10px]">
                  <input
                    type="text"
                    placeholder="Expense item name"
                    value={newExpName}
                    onChange={(e) => setNewExpName(e.target.value)}
                    className="bg-slate-950 rounded px-2 py-1 text-slate-300 border border-slate-900 outline-none w-full"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Monthly Amount ($)"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    className="bg-slate-950 rounded px-2 py-1 text-slate-300 border border-slate-900 outline-none w-full font-mono"
                    required
                  />
                  <button type="submit" className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-bold rounded text-[11px] uppercase tracking-wider cursor-pointer">
                    + ADD ITEM
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* HUMAN RESOURCES MODULE */}
          {activeModule === 'hr' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="font-bold text-blue-400 uppercase tracking-widest text-xs">TEAM SENTIMENT & CAPITAL ALLOCATION</span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">TOTAL STAFF: {team.length}</span>
              </div>

              {/* Employee list grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1 text-xs">
                {team.map((mbr) => (
                  <div key={mbr.id} className="bg-slate-950 border border-slate-900 rounded-lg p-2 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-white font-semibold truncate pr-1">{mbr.name}</span>
                        <span className="text-blue-400 font-mono text-[11px] font-bold">${mbr.salary}/mo</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{mbr.role}</span>
                    </div>

                    <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600 text-[10px] font-bold">ENERGY:</span>
                        <span className={`font-bold font-mono text-[11px] ${mbr.sentiment >= 8.0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {mbr.sentiment.toFixed(1)}/10
                        </span>
                      </div>
                      <button 
                        onClick={() => handleMitigateBurnout(mbr.id)}
                        className="py-0.5 px-1.5 bg-slate-900 hover:bg-slate-800 border border-white/5 text-[9.5px] hover:text-white uppercase font-bold rounded cursor-pointer"
                        title="Reduce threat index"
                      >
                        Reduce Burnout
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recruitment addition row */}
              <form onSubmit={handleHireMember} className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 grid grid-cols-3 gap-2 items-center text-xs">
                <input
                  type="text"
                  placeholder="Candidate full name"
                  value={newHireName}
                  onChange={(e) => setNewHireName(e.target.value)}
                  className="bg-slate-950 rounded px-2 py-1 text-slate-300 border border-slate-900 outline-none w-full"
                  required
                />
                <select
                  value={newHireRole}
                  onChange={(e) => setNewHireRole(e.target.value)}
                  className="bg-slate-950 rounded px-1.5 py-1 text-slate-300 border border-slate-900 outline-none w-full text-[11px]"
                >
                  <option value="Lead Scientist">Lead Scientist</option>
                  <option value="Developer">Developer</option>
                  <option value="Technical Writer">Technical Writer</option>
                  <option value="Account Manager">Account Manager</option>
                </select>
                <button type="submit" className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 font-bold rounded text-[11px] tracking-widest uppercase cursor-pointer py-1">
                  OFFER HIRING
                </button>
              </form>
            </div>
          )}

          {/* CRM PIPELINE MANAGEMENT */}
          {activeModule === 'crm' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="font-bold text-orange-400 uppercase tracking-widest text-xs">CRM SALES FUNNEL & PREDICTIVE PIPELINE</span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">ACTIVE VALUE: ${leads.reduce((a,c) => a + c.value, 0).toLocaleString()}</span>
              </div>

              {/* Leads lists */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1 text-xs">
                {leads.map((lead) => (
                  <div key={lead.id} className="bg-slate-950 border border-slate-900 rounded-lg p-2 flex justify-between items-center hover:border-orange-550/30 transition-all select-all">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                        <span className="text-white font-medium">{lead.name}</span>
                        <span className="text-[10px] bg-slate-900 px-1 rounded text-orange-400 border border-orange-500/20 uppercase">{lead.status}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">EST VALUE: ${lead.value.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-slate-500">PREDICTIVE SCORE:</span>
                        <span className="text-orange-400 font-bold font-mono block text-xs">{lead.score}%</span>
                      </div>
                      <button 
                        onClick={() => handlePruneLead(lead.id)}
                        className="text-slate-600 hover:text-rose-400 p-0.5 text-xs transition-colors cursor-pointer"
                        title="Archive opportunity"
                      >
                        <i className="ri-close-circle-line"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Lead additions form */}
              <form onSubmit={handleAddLead} className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 grid grid-cols-4 gap-2 text-xs items-center">
                <input
                  type="text"
                  placeholder="Lead Corporation Name"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="bg-slate-950 rounded px-2 py-1 text-slate-300 border border-slate-900 outline-none w-full col-span-2"
                  required
                />
                <input
                  type="number"
                  placeholder="Expected deal value"
                  value={newLeadValue}
                  onChange={(e) => setNewLeadValue(e.target.value)}
                  className="bg-slate-950 rounded px-2 py-1 text-slate-300 border border-slate-900 outline-none w-full font-mono"
                  required
                />
                <button type="submit" className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/40 font-bold rounded text-[10px] tracking-wider uppercase cursor-pointer py-1 w-full">
                  + RECRUIT LEAD
                </button>
              </form>
            </div>
          )}

          {/* SUPPLY CHAIN LOGISTICS INTERACT */}
          {activeModule === 'logistics' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="font-bold text-purple-400 uppercase tracking-widest text-xs">SHIPMENT BUDGET CALCULATOR</span>
              </div>

              <form onSubmit={handleLogisticsCompute} className="bg-slate-950 border border-slate-900 rounded-lg p-3 grid grid-cols-2 gap-3 items-end text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-bold pb-1">Transit Route Origin:</span>
                  <select
                    value={logOrigin}
                    onChange={(e) => setLogOrigin(e.target.value)}
                    className="bg-slate-900 text-xs px-2 py-1 border border-white/5 rounded text-slate-300 outline-none"
                  >
                    <option value="Neo-Tokyo Hub">Neo-Tokyo Hub ➔ Silicon Valley</option>
                    <option value="Svalbard seed repository">Svalbard Vault ➔ London Gateway</option>
                    <option value="Giza Pyramid Anchor">Giza Pyramid Anchor ➔ CERN Sector</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-bold pb-1">Cargo Net Weight (kg):</span>
                  <input
                    type="number"
                    value={logWeight}
                    onChange={(e) => setLogWeight(e.target.value)}
                    className="bg-slate-900 text-xs px-2 py-0.5 border border-white/5 rounded text-white outline-none font-mono"
                    placeholder="Mass in kilograms"
                  />
                </div>

                <div className="col-span-2 pt-1 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">SOLVED TRANSIT CONTRACT COST</span>
                    <span className="text-base text-purple-400 font-bold block mt-0.5">${logTransitCost.toLocaleString()} USD</span>
                  </div>
                  <button type="submit" className="py-1.5 px-4 bg-purple-600/15 border border-purple-550/30 hover:bg-purple-600/30 text-purple-300 uppercase tracking-widest font-bold rounded cursor-pointer select-none">
                    CALCULATE ROUTE
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MARKETING AUTOMATION WRITER */}
          {activeModule === 'marketing' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="font-bold text-pink-400 uppercase tracking-widest text-xs">BRAND CAMPAIGN COPYWRITER</span>
              </div>

              <form onSubmit={handleGenerateCopy} className="bg-slate-950 p-2.5 border border-slate-900 rounded-lg space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={mktProduct}
                    onChange={(e) => setMktProduct(e.target.value)}
                    placeholder="Asset e.g. NVK OS"
                    className="bg-slate-900 rounded px-2 py-1 text-white border border-white/5 outline-none font-mono text-xs"
                  />
                  <select
                    value={mktTone}
                    onChange={(e) => setMktTone(e.target.value as any)}
                    className="bg-slate-900 rounded px-1.5 py-1 text-slate-300 border border-white/5 outline-none text-[10px] uppercase font-bold"
                  >
                    <option value="cyber">Matrix Cyber Tone</option>
                    <option value="executive">Corporate Executive</option>
                    <option value="bold">High Impact Slogan</option>
                  </select>
                </div>

                <button type="submit" className="w-full py-1 bg-pink-600 hover:bg-pink-500 text-white uppercase tracking-widest font-bold rounded cursor-pointer text-[10.5px]">
                  ✓ SYNTHESIZE ADVERTISING TEXT
                </button>
              </form>

              {generatedCopy && (
                <div className="bg-slate-950 p-3 rounded-lg border border-pink-500/10 text-[10.5px] leading-relaxed text-slate-350 select-text">
                  {generatedCopy}
                </div>
              )}
            </div>
          )}

          {/* OPERATIONS WORKFLOWS MODULES */}
          {activeModule === 'workflow' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="font-bold text-cyan-400 uppercase tracking-widest text-xs">OPERATIONAL AUTOMATED TASKS & QUEUES</span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">TASKS: {tasks.length}</span>
              </div>

              {/* Tasks queue */}
              <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar pr-1 text-xs">
                {tasks.map((tk) => (
                  <div key={tk.id} className="bg-slate-950 border border-slate-900 rounded p-2 flex justify-between items-center relative group">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full ${tk.priority === 'High' ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`}></span>
                      <span className="text-white font-medium truncate">{tk.title}</span>
                      <span className="text-[9.5px] text-slate-500 lowercase">({tk.assignee})</span>
                    </div>

                    <div className="flex gap-2 items-center shrink-0">
                      <span className={`text-[10px] uppercase tracking-wide font-bold px-1 rounded ${
                        tk.status === 'Complete' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : tk.status === 'Active' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse' : 'bg-slate-900 text-slate-500'
                      }`}>
                        {tk.status}
                      </span>
                      {tk.status !== 'Complete' && (
                        <button 
                          onClick={() => handleAdvanceTask(tk.id)}
                          className="py-0.5 px-1 bg-slate-900 border border-white/5 hover:bg-slate-800 text-[9.5px] hover:text-white uppercase font-bold rounded cursor-pointer"
                        >
                          ADVANCE
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Task added row */}
              <form onSubmit={handleAddTask} className="bg-slate-950/45 p-2 rounded border border-slate-900 flex gap-2 text-xs items-center">
                <input
                  type="text"
                  placeholder="Task specifications..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="bg-slate-950 px-2 py-1 flex-grow outline-none border border-slate-900 rounded text-slate-300"
                  required
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="bg-slate-950 rounded py-1 px-1 border border-slate-900 outline-none text-[10px] uppercase"
                >
                  <option value="High">HIGH</option>
                  <option value="Medium">MEDIUM</option>
                  <option value="Low">LOW</option>
                </select>
                <button type="submit" className="py-1 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded text-[10.5px] cursor-pointer">
                  + APPEND
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

      <div className="p-1 border-t border-slate-950 bg-slate-900 text-[10px] text-slate-600 flex justify-between uppercase select-none mt-2 shrink-0">
        <span>OPERATIONAL_MODULE_CORE: ACTIVE</span>
        <span>AUTONOMOUS_MODE_STABILIZED</span>
      </div>
    </div>
  );
};

export default OperationsDashboardPanel;
