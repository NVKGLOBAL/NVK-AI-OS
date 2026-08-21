import React, { useState, useRef, useEffect } from 'react';

interface Tab {
  id: string;
  url: string;
  title: string;
  history: string[];
  historyIndex: number;
}

interface NexusBrowserProps {
  onOpenNewWindow?: (url: string) => void;
  initialUrl?: string;
}

const DEFAULT_NEXUS_URL = 'https://www.nvkglobal.com/';

const NexusBrowser: React.FC<NexusBrowserProps> = ({ onOpenNewWindow, initialUrl }) => {
  const [tabs, setTabs] = useState<Tab[]>([
    { 
      id: 'tab-1', 
      url: initialUrl || DEFAULT_NEXUS_URL, 
      title: 'Nexus Home',
      history: [initialUrl || DEFAULT_NEXUS_URL],
      historyIndex: 0
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [inputValue, setInputValue] = useState(initialUrl || DEFAULT_NEXUS_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDurableMode, setIsDurableMode] = useState(true);
  const [sessionStats, setSessionStats] = useState({ uptime: 0, requests: 1, failures: 0 });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    setInputValue(activeTab.url);
    setError(null);
  }, [activeTabId]);

  useEffect(() => {
    if (initialUrl && initialUrl !== activeTab.url) {
      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          const newHistory = t.history.slice(0, t.historyIndex + 1);
          newHistory.push(initialUrl);
          return {
            ...t,
            url: initialUrl,
            history: newHistory,
            historyIndex: newHistory.length - 1
          };
        }
        return t;
      }));
      setInputValue(initialUrl);
    }
  }, [initialUrl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionStats(prev => ({ ...prev, uptime: prev.uptime + 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNavigate = (e?: React.FormEvent) => {
    e?.preventDefault();
    let finalUrl = inputValue.trim();
    if (!finalUrl) return;
    
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes(' ') || !finalUrl.includes('.')) {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}&igu=1`;
      } else {
        finalUrl = 'https://' + finalUrl;
      }
    }
    
    setIsLoading(true);
    setError(null);
    
    // Update active tab
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        const newHistory = t.history.slice(0, t.historyIndex + 1);
        newHistory.push(finalUrl);
        return {
          ...t,
          url: finalUrl,
          history: newHistory,
          historyIndex: newHistory.length - 1
        };
      }
      return t;
    }));
    
    setSessionStats(prev => ({ ...prev, requests: prev.requests + 1 }));
  };

  const handleAddTab = () => {
    const newId = `tab-${Date.now()}`;
    setTabs(prev => [...prev, {
      id: newId,
      url: DEFAULT_NEXUS_URL,
      title: 'New Tab',
      history: [DEFAULT_NEXUS_URL],
      historyIndex: 0
    }]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    setError(null);
    const currentUrl = activeTab.url;
    const reloadUrl = isDurableMode ? `/api/proxy?url=${encodeURIComponent(currentUrl)}` : currentUrl;
    // Force iframe reload
    if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
        setTimeout(() => {
            if (iframeRef.current) iframeRef.current.src = reloadUrl;
        }, 50);
    }
  };

  const handleBack = () => {
    if (activeTab.historyIndex > 0) {
      const prevUrl = activeTab.history[activeTab.historyIndex - 1];
      setTabs(prev => prev.map(t => t.id === activeTabId ? {
        ...t,
        url: prevUrl,
        historyIndex: t.historyIndex - 1
      } : t));
      setInputValue(prevUrl);
    }
  };

  const handleForward = () => {
    if (activeTab.historyIndex < activeTab.history.length - 1) {
      const nextUrl = activeTab.history[activeTab.historyIndex + 1];
      setTabs(prev => prev.map(t => t.id === activeTabId ? {
        ...t,
        url: nextUrl,
        historyIndex: t.historyIndex + 1
      } : t));
      setInputValue(nextUrl);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError("Navigation Interrupted. The target site may have security policies (X-Frame-Options) that prevent embedding. Try using a different URL or enabling 'Durable Proxy' (simulated).");
    setSessionStats(prev => ({ ...prev, failures: prev.failures + 1 }));
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="nexus-browser h-full flex flex-col bg-slate-950 text-slate-100 border border-cyan-500/40 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,255,179,0.1)] font-sans">
      {/* Tab Bar */}
      <div className="flex items-center bg-slate-900 border-b border-cyan-500/20 px-2 pt-1 gap-1 overflow-x-auto custom-scrollbar-none">
        {tabs.map(tab => (
          <div 
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-[10px] font-mono cursor-pointer transition-all min-w-[120px] max-w-[200px] border-t border-x ${
              activeTabId === tab.id 
                ? 'bg-slate-950 border-cyan-500/50 text-cyan-400' 
                : 'bg-slate-900/50 border-transparent text-slate-500 hover:bg-slate-800'
            }`}
          >
            <i className="ri-global-line text-[10px]"></i>
            <span className="truncate flex-grow">{tab.url.replace('https://', '').replace('http://', '')}</span>
            <button 
                onClick={(e) => handleCloseTab(e, tab.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity"
            >
                <i className="ri-close-line"></i>
            </button>
          </div>
        ))}
        <button 
            onClick={handleAddTab}
            className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
            title="New Tab"
        >
            <i className="ri-add-line"></i>
        </button>
      </div>

      {/* Top Bar */}
      <div className="browser-header flex items-center gap-2 p-2 bg-slate-900 border-b border-cyan-500/20">
        <div className="flex items-center gap-1 mr-2">
          <button 
            onClick={handleBack} 
            disabled={activeTab.historyIndex === 0}
            className="p-1.5 hover:bg-slate-800 rounded-full disabled:opacity-20 text-cyan-400 transition-all"
            title="Back"
          >
            <i className="ri-arrow-left-line"></i>
          </button>
          <button 
            onClick={handleForward} 
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
            className="p-1.5 hover:bg-slate-800 rounded-full disabled:opacity-20 text-cyan-400 transition-all"
            title="Forward"
          >
            <i className="ri-arrow-right-line"></i>
          </button>
          <button 
            onClick={handleReload} 
            className="p-1.5 hover:bg-slate-800 rounded-full text-cyan-400 transition-all"
            title="Reload"
          >
            <i className={`ri-refresh-line ${isLoading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>

        <form onSubmit={handleNavigate} className="flex-grow flex items-center bg-black/60 rounded-full border border-cyan-500/30 focus-within:border-cyan-400 focus-within:shadow-[0_0_10px_rgba(0,255,179,0.2)] transition-all px-3">
          <div className="text-cyan-500/50">
            <i className="ri-global-line text-xs"></i>
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search or enter URL..."
            className="w-full bg-transparent text-slate-200 text-xs px-3 py-2 focus:outline-none placeholder:text-slate-600"
            aria-label="Address bar"
          />
          {isLoading && (
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce"></div>
            </div>
          )}
        </form>
        
        <div className="flex items-center gap-2 ml-2">
          <button 
            onClick={() => onOpenNewWindow?.(activeTab.url)}
            className="p-1.5 hover:bg-slate-800 rounded-full text-cyan-400 transition-all"
            title="Open in new Nexus window"
          >
            <i className="ri-external-link-line"></i>
          </button>
          <button 
            onClick={() => setIsDurableMode(!isDurableMode)}
            className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${
              isDurableMode 
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_8px_rgba(0,255,179,0.3)]' 
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
          >
            {isDurableMode ? 'Durable: ON' : 'Durable: OFF'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="browser-content flex-grow relative bg-white overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
              <div className="text-[10px] text-cyan-400 font-mono tracking-widest animate-pulse">ESTABLISHING NEXUS LINK...</div>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950 text-slate-300 p-8 text-center">
            <div className="relative mb-6">
              <i className="ri-shield-flash-line text-6xl text-rose-500/50"></i>
              <i className="ri-error-warning-line text-2xl text-rose-500 absolute bottom-0 right-0"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 font-mono tracking-tight">LINK_FAILURE_DETECTED</h3>
            <p className="text-sm max-w-md mb-8 text-slate-400 leading-relaxed">{error}</p>
            
            <div className="flex gap-3">
              <button 
                onClick={handleReload}
                className="px-6 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-400 rounded transition-all text-xs font-bold uppercase tracking-widest"
              >
                Retry Link
              </button>
              <button 
                onClick={() => {
                  setTabs(prev => prev.map(t => t.id === activeTabId ? {
                    ...t,
                    url: DEFAULT_NEXUS_URL,
                    history: [DEFAULT_NEXUS_URL],
                    historyIndex: 0
                  } : t));
                  setInputValue(DEFAULT_NEXUS_URL);
                  setError(null);
                }}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded transition-all text-xs font-bold uppercase tracking-widest"
              >
                Return Home
              </button>
            </div>
          </div>
        )}
        
        <iframe
          key={`${activeTabId}-${activeTab.url}-${isDurableMode}`}
          ref={iframeRef}
          src={isDurableMode ? `/api/proxy?url=${encodeURIComponent(activeTab.url)}` : activeTab.url}
          className="w-full h-full border-0"
          title="Nexus Browser"
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
          onError={handleIframeError}
          onLoad={handleIframeLoad}
        ></iframe>
      </div>

      {/* Footer / Status Bar */}
      <div className="browser-footer px-3 py-1.5 bg-slate-900 border-t border-cyan-500/20 flex items-center justify-between text-[9px] text-slate-500 font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]'}`}></span>
            <span className={isLoading ? 'text-yellow-500' : 'text-green-500'}>
              {isLoading ? 'ESTABLISHING...' : 'LINK_STABLE'}
            </span>
          </div>
          <div className="opacity-30">|</div>
          <div className="flex items-center gap-2">
            <span className="opacity-50">UPTIME:</span>
            <span className="text-slate-300">{formatTime(sessionStats.uptime)}</span>
          </div>
          <div className="opacity-30">|</div>
          <div className="flex items-center gap-2">
            <span className="opacity-50">REQS:</span>
            <span className="text-slate-300">{sessionStats.requests}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-cyan-500/70">
            <i className="ri-cpu-line"></i>
            <span>AGENT_READY</span>
          </div>
          <div className="opacity-30">|</div>
          <div className="max-w-[200px] truncate opacity-40 italic">
            {activeTab.url}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NexusBrowser;
