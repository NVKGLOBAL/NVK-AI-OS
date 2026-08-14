import React, { useState, useEffect } from 'react';

interface AIProvider {
  id: string;
  label: string;
  icon: string;
  desc: string;
  scopes: string[];
}

const ALL_PROVIDERS: AIProvider[] = [
  { id: 'google', label: 'Google Gemini Workspace', icon: 'ri-google-line', desc: 'Secure frontier Gemini models and custom Vertex pipelines', scopes: ['gemini:generate', 'vertex:predict', 'workspace:sync'] },
  { id: 'openai', label: 'OpenAI Developer Network', icon: 'ri-openai-line', desc: 'Direct access to flagship standard GPT platforms (gpt-4o, o1)', scopes: ['chat:completions', 'models:list', 'files:write'] },
  { id: 'github', label: 'GitHub Developer Sync', icon: 'ri-github-line', desc: 'Coordinate project configurations, active repos, and Copilot logic', scopes: ['repo:read', 'user:email', 'gist:write'] },
  { id: 'anthropic', label: 'Anthropic Engine Matrix', icon: 'ri-sparkling-fill', desc: 'Frontier reasoning loops (Claude 3.5 Sonnet & Haiku)', scopes: ['claude:chat', 'messages:create', 'models:read'] },
  { id: 'deepseek', label: 'DeepSeek AI Corporation', icon: 'ri-cpu-line', desc: 'Optimized access to DeepSeek-V3 and R1 reasoning nodes', scopes: ['chat:completions', 'reasoner:execute', 'offgrid:sovereign'] },
  { id: 'openrouter', label: 'OpenRouter Unified Directory', icon: 'ri-compass-line', desc: 'Universal gateway for cloud-pooled open-source LLM weights', scopes: ['inference:chat', 'models:read', 'free_directory:allow'] },
  { id: 'together', label: 'Together AI Cluster', icon: 'ri-server-line', desc: 'Sovereign high-speed orchestration for open weights', scopes: ['inference:chat', 'models:list', 'developer:read'] },
  { id: 'huggingface', label: 'Hugging Face Hub Services', icon: 'ri-emoji-sticker-line', desc: 'Execute inference directly on standard space/serverless builds', scopes: ['inference:api', 'models:read', 'dataset:download'] },
  { id: 'mistral', label: 'Mistral AI Laboratories', icon: 'ri-windy-line', desc: 'European developer endpoints featuring Large & Codestral cores', scopes: ['chat:completions', 'codestral:predict', 'embeddings:create'] },
  { id: 'nvidia', label: 'NVIDIA NIM Gateway', icon: 'ri-hardware-line', desc: 'NVIDIA NIM accelerated clusters and hardware models', scopes: ['nim:execute', 'models:list', 'inference:run'] }
];

export const AuthGateway: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState('openrouter');
  const [token, setToken] = useState('');
  const [savedKeys, setSavedKeys] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success'>('idle');

  // Load initially cached credentials
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialProvider = params.get('provider');
    if (initialProvider && ALL_PROVIDERS.some(p => p.id === initialProvider)) {
      setSelectedId(initialProvider);
    }

    try {
      const saved = localStorage.getItem('nvk_api_keys');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedKeys(parsed);
        // Autofill current selected token if exists
        const currentSelected = initialProvider || 'openrouter';
        if (parsed[currentSelected]) {
          setToken(parsed[currentSelected]);
        }
      }
    } catch (e) {
      console.error('Failed reading saved API keys:', e);
    }
  }, []);

  // Sync token value when provider changes
  useEffect(() => {
    if (savedKeys[selectedId]) {
      setToken(savedKeys[selectedId]);
    } else {
      setToken('');
    }
  }, [selectedId, savedKeys]);

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsSubmitting(true);
    setStatus('authorizing');

    setTimeout(() => {
      try {
        const updatedKeys = { ...savedKeys, [selectedId]: token.trim() };
        localStorage.setItem('nvk_api_keys', JSON.stringify(updatedKeys));
        localStorage.setItem('nvk_selected_provider', selectedId);
        localStorage.setItem('nvk_is_cloud_mode', 'true');
        setSavedKeys(updatedKeys);

        setStatus('success');

        // Post handshake to parent/opener page
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_AUTH_SUCCESS',
            provider: selectedId,
            token: token.trim()
          }, '*');
        }

        setTimeout(() => {
          setStatus('idle');
          setIsSubmitting(false);
        }, 1500);

      } catch (err) {
        console.error(err);
        setIsSubmitting(false);
        setStatus('idle');
        alert('Credentials integration failed. Please verify browser storage access permissions.');
      }
    }, 1200);
  };

  const handleDisconnect = (id: string) => {
    try {
      const updatedKeys = { ...savedKeys };
      delete updatedKeys[id];
      localStorage.setItem('nvk_api_keys', JSON.stringify(updatedKeys));
      setSavedKeys(updatedKeys);
      if (selectedId === id) {
        setToken('');
      }

      // Notify parent to invalidate context if currently selected
      if (window.opener) {
        window.opener.postMessage({
          type: 'OAUTH_AUTH_SUCCESS',
          provider: id,
          token: ''
        }, '*');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentProvider = ALL_PROVIDERS.find(p => p.id === selectedId) || ALL_PROVIDERS[0];

  const filteredProviders = ALL_PROVIDERS.filter(p =>
    p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background Ambience styling */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0,transparent_75%)] pointer-events-none" />
      <div className="absolute top-10 left-10 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Unified Modal Dashboard */}
      <div className="w-full max-w-4xl h-[90vh] max-h-[680px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden z-10">
        
        {/* Left Side: Directory of Providers */}
        <div className="w-full md:w-5/12 bg-slate-950/40 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col h-1/2 md:h-full p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <i className="ri-shield-user-fill text-sm"></i>
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">Identity Desk</h2>
              <p className="text-[10px] text-slate-500 font-mono">Workspace Providers</p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative mb-3">
            <i className="ri-search-line absolute left-3 top-2.5 text-xs text-slate-500" />
            <input
              type="text"
              placeholder="Search providers... (Google, OpenAI...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2 text-slate-500 hover:text-slate-300">
                <i className="ri-close-line" />
              </button>
            )}
          </div>

          {/* Providers List Container */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {filteredProviders.map(p => {
              const isConfigured = !!savedKeys[p.id];
              const isSelected = selectedId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full group rounded-xl p-2.5 transition-all duration-200 cursor-pointer flex items-center justify-between border-2 ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-600/70 text-white'
                      : 'bg-transparent border-transparent hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-200 ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-slate-300'
                    }`}>
                      <i className={p.icon} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-semibold truncate leading-tight">{p.label}</h3>
                      <span className="text-[9px] font-mono font-medium text-slate-500 tracking-wider">CODE: {p.id.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Config Indicators */}
                  <div className="flex items-center gap-1.5">
                    {isConfigured ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" title="Authorized Keys Locked" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-800" title="Offline State" />
                    )}
                    {isSelected && (
                      <i className="ri-arrow-right-s-line text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </div>
                </div>
              );
            })}
            {filteredProviders.length === 0 && (
              <div className="text-center py-8 text-slate-600">
                <i className="ri-radar-line text-lg block mb-1 animate-pulse" />
                <p className="text-[11px] font-mono">No matching providers found</p>
              </div>
            )}
          </div>

          {/* Quick Stats Block */}
          <div className="mt-2 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Synchronized: {Object.keys(savedKeys).length}/{ALL_PROVIDERS.length}</span>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to decouple and revoke all API keys from this workspace?')) {
                  localStorage.removeItem('nvk_api_keys');
                  setSavedKeys({});
                  setToken('');
                  alert('All provider cache pipelines cleared successfully.');
                }
              }}
              className="text-rose-500 hover:text-rose-400 transition-colors uppercase font-bold"
            >
              Flush All
            </button>
          </div>
        </div>

        {/* Right Side: Active Configure / Status Interface */}
        <div className="flex-1 flex flex-col h-1/2 md:h-full p-6 md:p-8 bg-slate-900/60 relative">
          
          {status === 'idle' && (
            <div className="flex flex-col h-full justify-between">
              
              {/* Card Header Info */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono tracking-widest font-bold uppercase text-indigo-400">Target Provider Matrix</span>
                    <h1 className="text-lg font-serif font-bold text-white tracking-tight flex items-center gap-2">
                      <i className={currentProvider.icon + " text-indigo-400"} />
                      {currentProvider.label}
                    </h1>
                  </div>

                  {savedKeys[currentProvider.id] && (
                    <span className="text-[9px] font-mono uppercase bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      Active Key Cash
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  {currentProvider.desc}
                </p>

                <div className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-xl space-y-2">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Authorized Gateway Scopes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentProvider.scopes.map(s => (
                      <code key={s} className="text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-cyan-400 font-mono tracking-tight">
                        {s}
                      </code>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Input Block */}
              <form onSubmit={handleAuthorize} className="space-y-4 mt-6">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold">
                      Secret API Key or Access Token
                    </label>
                    {savedKeys[currentProvider.id] && (
                      <button
                        type="button"
                        onClick={() => handleDisconnect(currentProvider.id)}
                        className="text-[10px] font-mono font-bold uppercase text-rose-500 hover:text-rose-400 transition-colors"
                      >
                        Disconnect Key
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={savedKeys[currentProvider.id] ? "••••••••••••••••••••••••" : `Paste code/token for ${currentProvider.label}...`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-indigo-200 font-mono focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-700"
                      autoComplete="off"
                    />
                    <div className="absolute right-3.5 top-3 text-slate-600">
                      <i className="ri-key-fill text-xs" />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-relaxed font-mono uppercase">
                    🗝️ All credential layers are stored strictly in client sandbox cache storage and never touch third-party intermediate proxies.
                  </p>
                </div>

                {/* Submitting/Authorize Commands */}
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 font-mono font-bold text-[10px] uppercase tracking-wider text-white rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-98 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    Sync Credentials Lattice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.opener) {
                        window.close();
                      } else {
                        alert('Handshake context: Click on top bar mode matrix to return.');
                      }
                    }}
                    className="py-3 px-5 hover:bg-slate-850 border border-transparent hover:border-slate-800 font-mono text-[10px] uppercase tracking-wider text-slate-400 rounded-xl transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </form>

            </div>
          )}

          {status === 'authorizing' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8 animate-fade-in">
              <div className="w-14 h-14 rounded-full border-t-2 border-indigo-500 border-r-2 animate-spin flex items-center justify-center">
                <div className="w-9 h-9 rounded-full border-b-2 border-cyan-400 border-l-2 animate-spin-reverse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-mono text-xs tracking-widest text-indigo-400 uppercase">Synchronizing Credentials Matrix</h3>
                <p className="text-[10px] text-slate-500 font-mono uppercase leading-relaxed max-w-sm mx-auto">
                  Performing secure host handshakes and storing identity weights in developer sandbox environment for {currentProvider.label}...
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8 animate-scale-in">
              <div className="w-14 h-14 rounded-full bg-emerald-950/65 border border-emerald-500 flex items-center justify-center text-emerald-400 text-2xl animate-pulse">
                <i className="ri-checkbox-circle-fill"></i>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 tracking-widest uppercase font-bold">Lattice Connection Synced</span>
              <div className="space-y-1">
                <h3 className="font-serif text-base text-white font-semibold">Integrations Configured</h3>
                <p className="text-[10px] text-slate-500 font-mono leading-relaxed max-w-xs mx-auto">
                  Secure local keystore updated. Active {currentProvider.id} model endpoints are now ready inside your 3D or 2D workspaces.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
