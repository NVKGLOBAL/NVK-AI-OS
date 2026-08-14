import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("CRITICAL RUNTIME COLLAPSE RECAPTURED BY GLOBAL LATTICE:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleForceSafe2D = () => {
    try {
      localStorage.setItem('nvk_force_safe_2d', 'true');
      window.location.reload();
    } catch (e) {
      alert("Failed to access storage. Force refreshing instead.");
      window.location.reload();
    }
  };

  handleResetAndPurge = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Attempt cache API purge
      if (window.caches) {
        window.caches.keys().then((keys) => {
          keys.forEach((key) => {
            window.caches.delete(key);
          });
        });
      }
      
      // Attempt IndexedDB purge
      if (window.indexedDB) {
        const dbs = ["web-llm-storage", "mlc-chat-db", "nvk_os_db"];
        dbs.forEach((db) => {
          try { window.indexedDB.deleteDatabase(db); } catch (e) {}
        });
      }

      alert("Lattice storage purged. Reloading application to fresh state.");
      window.location.reload();
    } catch (e) {
      console.error("Purge encountered partial failure:", e);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-slate-950 p-6 font-mono text-cyan-400 select-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
          
          <div className="w-full max-w-xl p-8 bg-black/85 border border-red-500/30 rounded-xl relative shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden">
            {/* Header Red Line decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-900" />
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-500/40 flex items-center justify-center animate-pulse">
                <i className="ri-error-warning-line text-red-400 text-2xl"></i>
              </div>
              <div>
                <h1 className="text-sm md:text-base font-bold tracking-widest text-red-400 uppercase">
                  NVK OS // SYSTEM RECOVERY CONSOLE
                </h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                  LATTICE FAULT SAFETY CAPTURED
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed uppercase mb-6 border-b border-slate-900 pb-4">
              A critical unhandled runtime crash has occurred in a background module, context provider, or layout engine. To prevent infinite system loops or battery drainage, the rendering pipeline has been suspended.
            </p>

            <div className="bg-red-950/15 border border-red-900/30 rounded p-4 mb-6 max-h-36 overflow-y-auto custom-scrollbar select-text">
              <div className="text-[10px] text-red-400 font-bold uppercase mb-1">Crash Diagnostics:</div>
              <div className="text-xs text-slate-400 font-mono break-all font-semibold select-text">
                {this.state.error ? this.state.error.stack || this.state.error.message : "Undefined system collapse"}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-cyan-950/30 hover:bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 rounded-lg text-xs uppercase font-bold tracking-widest transition-all hover:border-cyan-300 active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-refresh-line text-sm"></i>
                Retry Cold Boot
              </button>
              
              <button
                onClick={this.handleForceSafe2D}
                className="flex-1 px-4 py-2.5 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs uppercase font-bold tracking-widest transition-all hover:border-emerald-300 active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-shield-keyhole-line text-sm"></i>
                Force Safe 2D Layout
              </button>

              <button
                onClick={this.handleResetAndPurge}
                className="flex-1 px-4 py-2.5 bg-red-950/30 hover:bg-red-950/60 border border-red-500/40 text-red-400 rounded-lg text-xs uppercase font-bold tracking-widest transition-all hover:border-red-300 active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-delete-bin-line text-sm"></i>
                Purge Storage & Reset
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-900 flex justify-between select-none text-[8px] md:text-[9px] text-slate-600 uppercase tracking-widest">
              <span>Fault Code: EXC_RECAP_0xFF1A</span>
              <span>Secure Recovery v2.4</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
