import React, { useState, useMemo, useEffect } from 'react';
import { TreeOfThoughtReasoner, SelfReflectiveAgent, ContinualLearningSystem } from '../../lib/reasoning/ReasoningCore';
import { useLocalLLM } from '../../context/LocalLLMContext';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { AgentName, AdvancedReasoningPanelProps } from '../../types';
import { AGENT_PROFILES } from '../../constants';

import { useEcho } from '../../context/EchoContext';
const AdvancedReasoningPanel: React.FC<AdvancedReasoningPanelProps> = ({  width, height }) => {
  const { addEchoMessage } = useEcho();
  const { 
    isModelLoaded, 
    loadStatus, 
    loadProgress, 
    loadModel, 
    generateText, 
    isGenerating, 
    error, 
    clearCache, 
    isCloudMode, 
    setIsCloudMode,
    selectedProvider, 
    setSelectedProvider,
    selectedModel,
    ollamaConfig,
    setOllamaConfig
  } = useLocalLLM();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'tree' | 'reflection'>('tree');
  const [result, setResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOllamaSettings, setShowOllamaSettings] = useState(false);

  const reasoner = useMemo(() => new TreeOfThoughtReasoner(generateText), [generateText]);
  const reflector = useMemo(() => new SelfReflectiveAgent(generateText), [generateText]);
  const learner = useMemo(() => new ContinualLearningSystem(generateText), [generateText]);

  const handleProcess = async () => {
    if (!input.trim() || isProcessing) return;
    if (!isModelLoaded && !isCloudMode && selectedProvider !== 'ollama') return;
    setIsProcessing(true);
    setResult(null);

    try {
      const engineName = selectedProvider === 'ollama' ? `Ollama (${ollamaConfig.model})` : (isCloudMode ? selectedProvider : 'Gemma 3');
      if (mode === 'tree') {
        addEchoMessage(AgentName.AdvancedReasoningAgent, `${engineName}: Initiating Tree-of-Thought analysis...`, 'text-cyan-300');
        const path = await reasoner.solve(input);
        setResult(path);
        addEchoMessage(AgentName.AdvancedReasoningAgent, `Synthesis complete. Confidence: ${(path?.totalConfidence || 0).toFixed(2)}`, 'text-emerald-300');
        
        await learner.learnFromInteraction(
            { query: input, response: path.finalAnswer, context: { mode: 'tree', engine: engineName } },
            { goalAchieved: true }
        );
        
      } else {
        addEchoMessage(AgentName.AdvancedReasoningAgent, `${engineName}: Initiating Self-Reflective synthesis...`, 'text-purple-300');
        const reflection = await reflector.generateWithReflection(input);
        setResult(reflection);
        addEchoMessage(AgentName.AdvancedReasoningAgent, `Reflection complete. Iterations: ${reflection.iterations}`, 'text-emerald-300');
        
        await learner.learnFromInteraction(
            { query: input, response: reflection.improvedResponse, context: { mode: 'reflection', engine: engineName } },
            { goalAchieved: true }
        );
      }
    } catch (error) {
      console.error("Reasoning error:", error);
      addEchoMessage(AgentName.SystemCore, `Module failure: ${error}`, 'text-rose-400');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurgeCache = async () => {
    if (window.confirm("This will purge the locally cached Gemma 3 weights (approx. 3.5GB). Use this if the download is stuck or throwing 'Cache' errors. Proceed?")) {
      await clearCache();
      addEchoMessage(AgentName.SystemControl, "Local neural lattice purged. Awaiting re-hydration.", 'text-amber-400');
    }
  };

  if (!isModelLoaded && !isCloudMode && selectedProvider !== 'ollama') {
    return (
      <div className="advanced-reasoning-panel bg-slate-950/90 backdrop-blur-md border border-cyan-600/50 rounded-xl shadow-2xl p-6 text-slate-100 flex flex-col items-center justify-center" style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}>
        <i className="ri-brain-line text-5xl text-cyan-400 mb-4 animate-pulse"></i>
        <h3 className="text-2xl font-cinzel font-bold text-cyan-300 mb-2">NVK Logic Core</h3>
        
        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700 mb-6">
          <button 
            onClick={() => { setIsCloudMode(false); setSelectedProvider('gemini'); }}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono transition-all ${!isCloudMode && selectedProvider !== 'ollama' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-cyan-400'}`}
          >
            LOCAL (WebGPU)
          </button>
          <button 
            onClick={() => { setIsCloudMode(false); setSelectedProvider('ollama'); }}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono transition-all ${selectedProvider === 'ollama' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-orange-400'}`}
          >
            OLLAMA
          </button>
          <button 
            onClick={() => setIsCloudMode(true)}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono transition-all ${isCloudMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-400'}`}
          >
            CLOUD
          </button>
        </div>

        {selectedProvider === 'ollama' ? (
          <div className="w-full max-w-xs flex flex-col gap-3 mb-6 animate-fade-in">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 uppercase font-mono">Ollama URL</label>
                <input 
                  type="text" 
                  value={ollamaConfig.url} 
                  onChange={(e) => setOllamaConfig(prev => ({ ...prev, url: e.target.value }))}
                  className="bg-slate-900 border border-slate-700 text-cyan-400 text-xs p-2 rounded outline-none focus:border-cyan-500"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 uppercase font-mono">Model Name</label>
                <input 
                  type="text" 
                  value={ollamaConfig.model} 
                  onChange={(e) => setOllamaConfig(prev => ({ ...prev, model: e.target.value }))}
                  className="bg-slate-900 border border-slate-700 text-orange-400 text-xs p-2 rounded outline-none focus:border-orange-500"
                />
             </div>
             <p className="text-[10px] text-slate-500 italic text-center">
               Ensure Ollama is running and OLLAMA_ORIGINS="*" is set.
             </p>
             <Button 
                onClick={() => handleProcess()} 
                className="bg-orange-700 hover:bg-orange-600 py-3 font-cinzel tracking-widest shadow-lg"
              >
                Connect to Ollama
             </Button>
          </div>
        ) : (
          <>
            <p className="text-slate-400 mb-8 text-center max-w-md font-cormorant text-lg leading-relaxed">
              Initializing the NVK strategic lattice. Local execution enabled: Private, limitless, NVK Logic Core. Powered by Gemma 3.
            </p>
            
            {loadStatus !== "Idle" && loadStatus !== "Ready" && loadStatus !== "Error" && (
                 <div className="w-full max-w-md mb-6">
                    <div className="flex justify-between text-[10px] text-cyan-400 mb-1 font-mono uppercase tracking-widest">
                        <span className="truncate pr-4">{loadStatus}</span>
                        <span>{Math.round(loadProgress)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                        <div className="bg-cyan-600 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${loadProgress}%` }}></div>
                    </div>
                 </div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button 
                onClick={() => loadModel()} 
                disabled={loadStatus !== "Idle" && loadStatus !== "Error" && loadStatus !== "Ready"} 
                className="bg-cyan-700 hover:bg-cyan-600 py-3 font-cinzel tracking-widest shadow-lg hover:shadow-cyan-500/20"
              >
                 {loadStatus === "Idle" || loadStatus === "Error" ? "Hydrate NVK Matrix" : "Synthesizing..."}
              </Button>
              
              {(loadStatus === "Error" || loadStatus === "Ready" || loadStatus === "Idle") && (
                <Button onClick={handlePurgeCache} className="bg-slate-900 border border-slate-700 text-slate-400 text-xs py-2 hover:text-rose-400 transition-colors">
                  Reset Core (Purge Local Buffer)
                </Button>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="mt-8 p-4 bg-rose-950/30 border border-rose-500/50 rounded-lg text-rose-300 text-sm text-center max-w-sm shadow-xl animate-fade-in-up">
            <p className="font-bold mb-2 flex items-center justify-center gap-2">
              <i className="ri-error-warning-line text-lg"></i>
              NVK Lattice Critical Failure:
            </p>
            <p className="font-mono text-[11px] opacity-90 leading-relaxed mb-4">{error.message}</p>
            {(error.message.includes("Cache") || error.message.includes("add")) && (
              <p className="text-[11px] text-rose-400 italic bg-rose-950/40 p-2 rounded border border-rose-900/50">
                Tip: The download was likely interrupted or the model library path changed. Use 'Reset Core' to clear partial files and try again.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="advanced-reasoning-panel bg-slate-950/90 backdrop-blur-md border border-cyan-600/50 rounded-xl shadow-2xl p-6 text-slate-100 flex flex-col" style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h3 className="text-2xl font-cinzel font-bold text-cyan-300 tracking-wider">
              <i className="ri-brain-line mr-2"></i>{selectedProvider === 'ollama' ? 'Ollama Core' : (isCloudMode ? `${selectedProvider.toUpperCase()} Core` : 'NVK Core (Gemma 3)')}
          </h3>
          <span className="text-[9px] text-slate-500 uppercase tracking-widest ml-8 font-mono">NVK Inference Engine</span>
        </div>
        <div className="flex flex-col items-end gap-1">
            <div className="flex bg-slate-900/80 p-0.5 rounded border border-slate-700 mb-1">
              <button 
                onClick={() => { setIsCloudMode(false); setSelectedProvider('gemini'); }}
                className={`px-2 py-0.5 rounded text-[8px] font-mono transition-all ${!isCloudMode && selectedProvider !== 'ollama' ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-cyan-400'}`}
              >
                LOCAL
              </button>
              <button 
                onClick={() => { setIsCloudMode(false); setSelectedProvider('ollama'); }}
                className={`px-2 py-0.5 rounded text-[8px] font-mono transition-all ${selectedProvider === 'ollama' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-orange-400'}`}
              >
                OLLAMA
              </button>
              <button 
                onClick={() => setIsCloudMode(true)}
                className={`px-2 py-0.5 rounded text-[8px] font-mono transition-all ${isCloudMode ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-indigo-400'}`}
              >
                CLOUD
              </button>
            </div>
            {!isCloudMode && selectedProvider !== 'ollama' && (
              <button onClick={handlePurgeCache} className="text-[9px] text-slate-600 hover:text-rose-500 transition-colors uppercase font-bold">
                  Reset Lattice
              </button>
            )}
            {selectedProvider === 'ollama' && (
              <button onClick={() => setShowOllamaSettings(!showOllamaSettings)} className="text-[9px] text-orange-500 hover:text-orange-400 transition-colors uppercase font-bold">
                  {showOllamaSettings ? 'Hide Settings' : 'Ollama Settings'}
              </button>
            )}
        </div>
      </div>

      {selectedProvider === 'ollama' && showOllamaSettings && (
        <div className="mb-4 p-3 bg-slate-900/80 border border-orange-500/30 rounded-lg animate-fade-in">
           <div className="grid grid-cols-2 gap-3">
             <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 uppercase font-mono">URL</label>
                <input 
                  type="text" 
                  value={ollamaConfig.url} 
                  onChange={(e) => setOllamaConfig(prev => ({ ...prev, url: e.target.value }))}
                  className="bg-black border border-slate-800 text-cyan-400 text-[10px] p-1.5 rounded outline-none focus:border-cyan-500"
                />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[9px] text-slate-500 uppercase font-mono">Model</label>
                <input 
                  type="text" 
                  value={ollamaConfig.model} 
                  onChange={(e) => setOllamaConfig(prev => ({ ...prev, model: e.target.value }))}
                  className="bg-black border border-slate-800 text-orange-400 text-[10px] p-1.5 rounded outline-none focus:border-orange-500"
                />
             </div>
           </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 justify-center">
        <button
          onClick={() => setMode('tree')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all font-cinzel tracking-wider ${mode === 'tree' ? 'bg-cyan-600 text-white shadow-lg scale-105 shadow-cyan-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Tree of Thought
        </button>
        <button
          onClick={() => setMode('reflection')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all font-cinzel tracking-wider ${mode === 'reflection' ? 'bg-purple-600 text-white shadow-lg scale-105 shadow-purple-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Self-Reflection
        </button>
      </div>

      <div className="input-area mb-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'tree' ? "Enter a complex problem for TurboQuant to decompose..." : "Enter a prompt for reflective refinement..."}
          className="h-24 text-sm bg-slate-900/50 border-slate-700 focus:border-cyan-500/50 transition-all font-cormorant text-lg"
          disabled={isProcessing || isGenerating}
        />
        <Button
          onClick={handleProcess}
          disabled={isProcessing || isGenerating || !input.trim()}
          className="w-full mt-2 bg-cyan-700 hover:bg-cyan-600 text-white font-cinzel py-3 shadow-lg shadow-cyan-500/10"
        >
          {isProcessing || isGenerating ? <><i className="ri-loader-4-line animate-spin mr-2"></i>Generating Insight...</> : <><i className="ri-cpu-line mr-2"></i>Execute NVK Logic</>}
        </Button>
      </div>

      <div className="results-area flex-grow overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-lg border border-slate-800 p-4">
        {!result && !isProcessing && (
            <div className="text-center text-slate-500 italic mt-12 font-cormorant text-xl opacity-60">
                {isCloudMode ? `${selectedProvider.toUpperCase()} stands ready.` : `${selectedModel} stands ready. Absolute privacy. Infinite depth.`}
            </div>
        )}
        
        {result && mode === 'tree' && (
            <div className="space-y-4">
                <div className="final-answer p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
                    <h4 className="text-cyan-400 font-cinzel text-sm mb-2 uppercase tracking-widest">Synthesized Conclusion</h4>
                    <p className="text-slate-200 text-sm leading-relaxed font-cormorant text-lg">{result.finalAnswer}</p>
                </div>
                <div className="reasoning-trace">
                    <h4 className="text-slate-400 text-[10px] uppercase tracking-widest mb-2 font-mono">Reasoning Path</h4>
                    {result.reasoning.map((step: string, i: number) => (
                        <div key={i} className="mb-2 p-3 bg-slate-800/50 rounded border-l-2 border-cyan-600 text-xs text-slate-300 font-cormorant text-base">
                            <span className="font-bold text-cyan-500 mr-2 font-mono">{i + 1}.</span>
                            {step}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {result && mode === 'reflection' && (
            <div className="space-y-4">
                <div className="improved-response p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                    <h4 className="text-purple-400 font-cinzel text-sm mb-2 uppercase tracking-widest">Grounded Synthesis</h4>
                    <p className="text-slate-200 text-sm leading-relaxed font-cormorant text-lg">{result.improvedResponse}</p>
                </div>
                <div className="critique-section text-xs bg-slate-800/50 p-4 rounded border border-slate-700">
                    <h4 className="text-slate-400 uppercase tracking-widest mb-3 font-mono">Internal Audit</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span className="text-green-400 font-bold font-cinzel text-[10px] tracking-widest">STRENGTHS</span>
                            <ul className="list-disc list-inside text-slate-400 pl-1 mt-1 font-cormorant text-base space-y-1">
                                {result.critique.strengths.map((s: string, i: number) => <li key={i} className="leading-tight">{s}</li>)}
                            </ul>
                        </div>
                        <div>
                            <span className="text-rose-400 font-bold font-cinzel text-[10px] tracking-widest">LIMITATIONS</span>
                             <ul className="list-disc list-inside text-slate-400 pl-1 mt-1 font-cormorant text-base space-y-1">
                                {result.critique.weaknesses.map((s: string, i: number) => <li key={i} className="leading-tight">{s}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedReasoningPanel;