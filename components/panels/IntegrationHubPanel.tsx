import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Connector {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected';
  icon: string;
  color: string;
  apiKey?: string;
  endpoint?: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  status: 'Active' | 'Paused';
}

interface PluginItem {
  id: string;
  name: string;
  desc: string;
  installed: boolean;
  icon: string;
  color: string;
}

const DEFAULT_CONNECTORS: Connector[] = [
  { id: 'slack', name: 'Slack', type: 'Communication', status: 'connected', icon: 'ri-slack-line', color: 'text-rose-400', apiKey: 'xoxb-dummy-slack-token-1128', endpoint: 'https://hooks.slack.com/services/T00/B00/X00' },
  { id: 'jira', name: 'Jira', type: 'Project Management', status: 'connected', icon: 'ri-trello-line', color: 'text-blue-400', apiKey: 'jira-usr-token-axiom-771', endpoint: 'https://nexus-jira.atlassian.net' },
  { id: 'salesforce', name: 'Salesforce', type: 'CRM', status: 'disconnected', icon: 'ri-cloud-line', color: 'text-sky-400', apiKey: '', endpoint: '' },
  { id: 'github', name: 'GitHub', type: 'Development', status: 'connected', icon: 'ri-github-fill', color: 'text-slate-300', apiKey: 'ghp_autonomous_operator_secrethash', endpoint: 'https://api.github.com' },
  { id: 'stripe', name: 'Stripe', type: 'Finance', status: 'disconnected', icon: 'ri-bank-card-line', color: 'text-indigo-400', apiKey: '', endpoint: '' },
  { id: 'zendesk', name: 'Zendesk', type: 'Support', status: 'disconnected', icon: 'ri-customer-service-line', color: 'text-emerald-400', apiKey: '', endpoint: '' },
];

const DEFAULT_WEBHOOKS: Webhook[] = [
  { id: 'wh-1', name: 'Payment Processed (Stripe)', url: 'https://api.nexus.os/wh/stripe_pay', status: 'Active' },
  { id: 'wh-2', name: 'New Support Ticket (Zendesk)', url: 'https://api.nexus.os/wh/zd_ticket', status: 'Paused' }
];

const DEFAULT_PLUGINS: PluginItem[] = [
  { id: 'rpa', name: 'RPA Bridge', desc: 'Connects autonomous agents to legacy desktop applications via Robotic Process Automation.', installed: true, icon: 'ri-robot-line', color: 'text-emerald-400' },
  { id: 'blockchain', name: 'Blockchain Audit', desc: 'Anchors critical autonomous decisions to a public ledger for immutable transparency.', installed: false, icon: 'ri-link-m', color: 'text-indigo-400' },
  { id: 'twin', name: 'Digital Twin Sync', desc: 'Synchronizes operational data with 3D digital twin models for simulation and analysis.', installed: false, icon: 'ri-bubble-chart-line', color: 'text-pink-400' }
];

const IntegrationHubPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'connectors' | 'webhooks' | 'plugins'>('connectors');
  
  // Real Persistent State
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  
  // Selection / Editing State
  const [editingConnectorId, setEditingConnectorId] = useState<string | null>(null);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempEndpoint, setTempEndpoint] = useState('');
  
  // Form Webhook State
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWhName, setNewWhName] = useState('');
  const [newWhUrl, setNewWhUrl] = useState('');
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load from Storage
  useEffect(() => {
    const savedConns = localStorage.getItem('nvk_hub_connectors');
    const savedWhs = localStorage.getItem('nvk_hub_webhooks');
    const savedPlugs = localStorage.getItem('nvk_hub_plugins');

    try {
      setConnectors(savedConns ? JSON.parse(savedConns) : DEFAULT_CONNECTORS);
      setWebhooks(savedWhs ? JSON.parse(savedWhs) : DEFAULT_WEBHOOKS);
      setPlugins(savedPlugs ? JSON.parse(savedPlugs) : DEFAULT_PLUGINS);
    } catch (e) {
      setConnectors(DEFAULT_CONNECTORS);
      setWebhooks(DEFAULT_WEBHOOKS);
      setPlugins(DEFAULT_PLUGINS);
    }
  }, []);

  const saveConnectors = (list: Connector[]) => {
    setConnectors(list);
    localStorage.setItem('nvk_hub_connectors', JSON.stringify(list));
  };

  const saveWebhooks = (list: Webhook[]) => {
    setWebhooks(list);
    localStorage.setItem('nvk_hub_webhooks', JSON.stringify(list));
  };

  const savePlugins = (list: PluginItem[]) => {
    setPlugins(list);
    localStorage.setItem('nvk_hub_plugins', JSON.stringify(list));
  };

  // Connect / Toggle status of standard connector
  const handleToggleConnector = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const list = connectors.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'connected' ? 'disconnected' : 'connected';
        return { 
          ...c, 
          status: nextStatus as any,
          apiKey: nextStatus === 'connected' ? c.apiKey || 'xoxhb-auto-gen-token-3000' : ''
        };
      }
      return c;
    });
    saveConnectors(list);
    const updated = list.find(c => c.id === id);
    showToast(`${updated?.name} status transitioned to: ${updated?.status.toUpperCase()}`);
  };

  const openConnectorDetails = (conn: Connector) => {
    setEditingConnectorId(conn.id);
    setTempApiKey(conn.apiKey || '');
    setTempEndpoint(conn.endpoint || '');
  };

  const handleSaveConnectorSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConnectorId) return;

    const list = connectors.map(c => {
      if (c.id === editingConnectorId) {
        return {
          ...c,
          apiKey: tempApiKey,
          endpoint: tempEndpoint,
          status: tempApiKey.trim() ? 'connected' : 'disconnected'
        } as Connector;
      }
      return c;
    });

    saveConnectors(list);
    setEditingConnectorId(null);
    showToast(`Saved settings parameters for ${connectors.find(c => c.id === editingConnectorId)?.name}!`);
  };

  // Webhooks Action Codes
  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhName.trim() || !newWhUrl.trim()) return;

    const newWh: Webhook = {
      id: `wh-${Date.now()}`,
      name: newWhName.trim(),
      url: newWhUrl.trim(),
      status: 'Active'
    };

    const updated = [...webhooks, newWh];
    saveWebhooks(updated);
    setNewWhName('');
    setNewWhUrl('');
    setShowAddWebhook(false);
    showToast(`Registered new live webhook endpoint!`);
  };

  const handleToggleWebhookStatus = (id: string) => {
    const list = webhooks.map(w => {
      if (w.id === id) {
        return { ...w, status: w.status === 'Active' ? 'Paused' : 'Active' } as Webhook;
      }
      return w;
    });
    saveWebhooks(list);
    showToast(`Webhook state toggled`);
  };

  const handleDeleteWebhook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const list = webhooks.filter(w => w.id !== id);
    saveWebhooks(list);
    showToast(`Webhook removed`);
  };

  // Plugins installation
  const handleTogglePlugin = (id: string) => {
    const list = plugins.map(p => {
      if (p.id === id) {
        return { ...p, installed: !p.installed };
      }
      return p;
    });
    savePlugins(list);
    const updated = list.find(p => p.id === id);
    showToast(`${updated?.name} ${updated?.installed ? 'Installed' : 'Uninstalled'}`);
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 p-4 sm:p-5 flex flex-col font-mono relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.03)_0,transparent_55%)] pointer-events-none" />

      {/* Embedded Action Notifications banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-14 right-4 z-50 bg-violet-950/90 border border-violet-500/30 text-violet-300 text-[10px] px-3.5 py-1.5 rounded-lg shadow-xl uppercase tracking-wider flex items-center gap-1.5 font-bold"
          >
            <i className="ri-shield-check-line animate-pulse"></i>
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Upper Title Hub bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 border-b border-white/5 pb-3">
        <h2 className="text-base sm:text-lg font-light text-slate-100 flex items-center gap-2.5">
          <i className="ri-plug-2-line text-violet-400"></i>
          Integration Hub <span className="text-slate-600 font-bold text-[9px] uppercase border border-slate-800/80 rounded px-1 px-1.5">Lattice Core</span>
        </h2>
        <div className="flex bg-slate-900/60 p-0.5 rounded border border-white/5 self-start">
          {[
            { id: 'connectors', name: 'Connectors' },
            { id: 'webhooks', name: 'Webhooks' },
            { id: 'plugins', name: 'Plugins' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setEditingConnectorId(null); }}
              className={`px-3 py-1 text-[9px] uppercase tracking-wider font-bold transition-all rounded ${activeTab === tab.id ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-slate-300 cursor-pointer'}`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar min-h-0 relative">
        
        {/* TAB 1: CONNECTORS CONFIGURATION */}
        {activeTab === 'connectors' && (
          <div className="space-y-4">
            
            {editingConnectorId ? (
              /* Inline Modal-like Custom Settings Interface */
              <form onSubmit={handleSaveConnectorSettings} className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 relative animate-fade-in text-[11px]">
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                  <span className="text-white font-bold uppercase tracking-wide">
                    Configure Node Integration: {connectors.find(c => c.id === editingConnectorId)?.name}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setEditingConnectorId(null)}
                    className="text-slate-500 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-slate-550 uppercase font-mono font-bold text-[8.5px] tracking-widest mb-1.5">API KEY / ACCESS TOKEN</label>
                    <input 
                      type="text" 
                      placeholder="e.g. xoxb-slack-secret, ghp_token, etc..."
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono placeholder-slate-700 outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-550 uppercase font-mono font-bold text-[8.5px] tracking-widest mb-1.5">GATEWAY_ENDPOINT URL</label>
                    <input 
                      type="text" 
                      placeholder="e.g. https://api.slack.com/methods or custom endpoint..."
                      value={tempEndpoint}
                      onChange={(e) => setTempEndpoint(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono placeholder-slate-700 outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className="py-2 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                  >
                    Apply Sync Credentials
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditingConnectorId(null)}
                    className="py-2 px-4 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded uppercase tracking-wider text-[9px]"
                  >
                    Discard Changes
                  </button>
                </div>
              </form>
            ) : (
              /* Grid Layout Connectors List */
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3.5">
                {connectors.map(conn => (
                  <div 
                    key={conn.id} 
                    onClick={() => openConnectorDetails(conn)}
                    className="bg-slate-900/40 p-4 border border-white/5 rounded-xl flex flex-col justify-between hover:bg-slate-905 hover:border-violet-500/20 group relative transition-all cursor-pointer"
                  >
                    <button 
                      type="button"
                      onClick={(e) => handleToggleConnector(conn.id, e)}
                      className="absolute top-3.5 right-3.5"
                      title="Quick toggle connection state"
                    >
                      <span className={`w-3 h-3 rounded-full block border shadow-inner transition-colors duration-500 ${
                        conn.status === 'connected' ? 'bg-emerald-400/90 border-emerald-500/20 animate-pulse' : 'bg-slate-800 border-white/10'
                      }`}></span>
                    </button>

                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-lg bg-slate-950 flex items-center justify-center ${conn.color} border border-white/5`}>
                          <i className={`${conn.icon} text-lg`}></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-200 text-xs">{conn.name}</h4>
                          <span className="text-[8px] uppercase font-mono font-bold text-slate-500 tracking-wider">{conn.type}</span>
                        </div>
                      </div>
                      
                      <div className="text-[10px] text-slate-500 font-mono space-y-1 mb-4 select-all">
                        <p className="truncate"><span className="text-slate-600">KEY:</span> {conn.apiKey ? '••••••••' + conn.apiKey.slice(-4) : 'NOT_SET'}</p>
                        <p className="truncate"><span className="text-slate-600">TARGET:</span> {conn.endpoint || 'DEFAULT'}</p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 select-none pt-2 border-t border-white/5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openConnectorDetails(conn); }}
                        className="flex-grow py-1 bg-slate-950 border border-slate-800 hover:border-violet-500/30 text-[8.5px] uppercase font-bold tracking-wider rounded text-slate-400 group-hover:text-white transition-all cursor-pointer"
                      >
                        config
                      </button>
                      <button 
                        onClick={(e) => handleToggleConnector(conn.id, e)}
                        className={`px-2.5 py-1 text-[8.5px] uppercase font-bold tracking-wider rounded border cursor-pointer transition-all ${
                          conn.status === 'connected' 
                            ? 'bg-emerald-900/10 border-emerald-500/15 text-emerald-400' 
                            : 'bg-slate-950 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {conn.status === 'connected' ? 'connected' : 'connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Interface generation */}
            <div className="bg-slate-900/10 p-5 rounded-xl border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
              <i className="ri-tools-line text-2xl text-slate-600 mb-2.5"></i>
              <h4 className="text-xs font-semibold text-slate-300 mb-1">Legacy Custom SDK Port</h4>
              <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed">Map a direct database query stream or webhook relay using full Node endpoints mapped via /api/terminal or custom shell scripting.</p>
            </div>
            
          </div>
        )}

        {/* TAB 2: LIVE WEBHOOKS ROUTER */}
        {activeTab === 'webhooks' && (
          <div className="space-y-4">
            
            <div className="flex justify-between items-center font-mono">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Active Real-Time Webhook Receivers ({webhooks.length})</span>
              <button 
                onClick={() => setShowAddWebhook(!showAddWebhook)}
                className="py-1 px-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[9px] uppercase tracking-wider font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
              >
                <i className={showAddWebhook ? "ri-close-fill" : "ri-add-line"}></i> {showAddWebhook ? "Hide Form" : "New Webhook"}
              </button>
            </div>

            {showAddWebhook && (
              <form onSubmit={handleAddWebhook} className="bg-slate-900 border border-slate-800 p-4 rounded-xl animate-fade-in space-y-3 text-[11px]">
                <div className="text-white font-bold uppercase tracking-wide border-b border-white/5 pb-1 select-none">REGISTER WEBHOOK NODE</div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] text-slate-500 font-mono font-bold mb-1 uppercase tracking-wider">Webhook / Event Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Chat Message Received"
                      value={newWhName}
                      onChange={(e) => setNewWhName(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white placeholder-slate-700 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] text-slate-500 font-mono font-bold mb-1 uppercase tracking-wider">Receiver Target URL</label>
                    <input 
                      type="url" 
                      placeholder="https://yourserver.com/hooks/chat"
                      value={newWhUrl}
                      onChange={(e) => setNewWhUrl(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white placeholder-slate-700 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button type="submit" className="py-1.5 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded font-bold uppercase tracking-wider text-[9px] cursor-pointer">
                    Register Webhook
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowAddWebhook(false)}
                    className="py-1.5 px-3 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded uppercase tracking-wider text-[9px]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2.5">
              {webhooks.map(wh => (
                <div key={wh.id} className="p-3 bg-slate-900/50 rounded-xl border border-white/5 flex items-center justify-between gap-4 font-mono select-all">
                  <div className="truncate flex-grow">
                    <h5 className="text-[11px] font-semibold text-slate-200 truncate">{wh.name}</h5>
                    <span className="text-[8.5px] text-violet-400 block mt-1 truncate">{wh.url}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 select-none">
                    <button 
                      onClick={() => handleToggleWebhookStatus(wh.id)}
                      className={`py-0.5 px-2 text-[8px] uppercase tracking-wider font-bold rounded cursor-pointer border ${
                        wh.status === 'Active' 
                          ? 'bg-emerald-900/10 border-emerald-500/15 text-emerald-400' 
                          : 'bg-amber-900/10 border-amber-500/15 text-amber-400'
                      }`}
                    >
                      {wh.status === 'Active' ? 'Active' : 'Paused'}
                    </button>
                    
                    <button 
                      onClick={(e) => handleDeleteWebhook(wh.id, e)}
                      className="p-1 hover:bg-rose-950 hover:text-rose-400 rounded transition-colors text-slate-500"
                      title="De-register Webhook"
                    >
                      <i className="ri-delete-bin-2-line"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 3: PLUGINS DISCOVER */}
        {activeTab === 'plugins' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plugins.map(plug => (
              <div key={plug.id} className="bg-slate-900/40 p-4 border border-white/5 rounded-xl flex flex-col justify-between hover:border-slate-850 transition-all font-mono">
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <i className={`${plug.icon} text-2xl ${plug.color}`}></i>
                    <h4 className="font-semibold text-slate-200 text-xs truncate leading-none">{plug.name}</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed mb-4 font-sans">{plug.desc}</p>
                </div>
                
                <button 
                  onClick={() => handleTogglePlugin(plug.id)}
                  className={`w-full py-1.5 rounded text-[9px] uppercase font-bold tracking-wider transition-all border cursor-pointer ${
                    plug.installed 
                      ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/40' 
                      : 'bg-violet-900/15 border-violet-500/25 text-violet-300 hover:bg-violet-900/30'
                  }`}
                >
                  {plug.installed ? 'Installed' : 'Install Plugin'}
                </button>
              </div>
            ))}
          </div>
        )}
        
      </div>

      <div className="p-1 px-1.5 border-t border-slate-900 bg-slate-950 text-[8px] text-slate-600 flex justify-between uppercase mt-4 select-none shrink-0 font-mono">
        <span>HUB_SSL_PIPE: PORT_3000_ESTABLISHED</span>
        <span>STATUS_STABLE</span>
      </div>
    </div>
  );
};

export default IntegrationHubPanel;
