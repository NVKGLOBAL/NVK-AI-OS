import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import * as webllm from '@mlc-ai/web-llm';
import { useLocalLLM } from '../../context/LocalLLMContext';
import { useSystemState } from '../../context/SystemContext';
import { LLMCore } from '../../src/llm-core/llm-core';

const ANGELIC_FEATURES = [
  { category: 'Core System Architecture', items: ['Modular Microservices', 'Multi-Agent Orchestration', 'State Persistence', 'Event-Driven Architecture', 'API Gateway', 'Version Control', 'High Availability & Failover', 'Resource Management'] },
  { category: 'Autonomous Decision-Making', items: ['Goal Decomposition', 'Priority Scheduling', 'Real-Time Optimization', 'Predictive Analytics', 'Simulation & What-If Analysis', 'Risk Assessment', 'Strategic Planning', 'Innovation Generation'] },
  { category: 'Business Operations Functions', items: ['Financial Management', 'Human Resources', 'Customer Relationship Management (CRM)', 'Supply Chain & Logistics', 'Marketing & Sales', 'Operations & Workflow'] },
  { category: 'Learning & Adaptation', items: ['Continuous Learning', 'Reinforcement Learning', 'Feedback Loops', 'Knowledge Graph', 'Transfer Learning', 'Anomaly Detection'] },
  { category: 'Communication & Collaboration', items: ['Natural Language Interfaces', 'Multi-Lingual Support', 'Emotional Intelligence', 'Collaboration Tools', 'Meeting Scheduling & Management', 'Notification & Alerting'] },
  { category: 'Ethical & Moral Framework', items: ['Transparency', 'Fairness', 'Accountability', 'Privacy', 'Value Alignment', 'Sustainability', 'Conflict Resolution', 'Consent Management'] },
  { category: 'Security & Compliance', items: ['Data Encryption', 'Identity & Access Management', 'Threat Detection', 'Compliance Automation', 'Audit Logging', 'Backup & Disaster Recovery', 'Secure Software Supply Chain'] },
  { category: 'Integration & Extensibility', items: ['Pre-Built Connectors', 'Custom API Development', 'Webhook Support', 'Plugin Architecture', 'Data Import/Export', 'Legacy System Wrappers'] },
  { category: 'Monitoring & Reporting', items: ['Real-Time Dashboards', 'Automated Reports', 'Predictive Maintenance', 'User Activity Monitoring', 'ROI Analysis', 'Sentiment Tracking'] },
  { category: 'User Experience & Interface', items: ['Multi-Platform Access', 'Role-Based Views', 'Conversational UI', 'Visual Workflow Designer', 'Onboarding & Training', 'Accessibility'] },
  { category: 'Self-Management & Maintenance', items: ['Self-Healing', 'Performance Tuning', 'Update Management', 'Health Checks', 'Scalability'] },
  { category: 'Advanced Capabilities', items: ['Multi-Agent Negotiation', 'Blockchain Integration', 'Digital Twins', 'Generative AI', 'Robotic Process Automation (RPA)', 'Federated Learning'] },
];

const ModelOrchestratorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'providers' | 'local' | 'angelic' | 'megalith'>('megalith');
  const [availableLocalModels, setAvailableLocalModels] = useState<string[]>([]);
  
  // Megalith LLMCore WebGPU Playground States
  const coreRef = useRef<LLMCore | null>(null);
  const [megalithStatus, setMegalithStatus] = useState<string>('Uninitialized');
  const [megalithLoaded, setMegalithLoaded] = useState<boolean>(false);
  const [megalithGenerating, setMegalithGenerating] = useState<boolean>(false);
  const [megalithPrompt, setMegalithPrompt] = useState<string>('We are the engineers of the sovereign cyber-matrix, reweaving chaos into pure resonance.');
  const [megalithResponse, setMegalithResponse] = useState<string>('');
  const [megalithTemp, setMegalithTemp] = useState<number>(0.7);
  const [megalithTopK, setMegalithTopK] = useState<number>(40);
  const [megalithTopP, setMegalithTopP] = useState<number>(0.9);
  const [megalithMaxTokens, setMegalithMaxTokens] = useState<number>(100);
  const [tokensPerSec, setTokensPerSec] = useState<number>(0);
  const [timeTakenMs, setTimeTakenMs] = useState<number>(0);
  const [hasWebGpu, setHasWebGpu] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const outputContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!navigator.gpu) {
      setHasWebGpu(false);
      setMegalithStatus('WebGPU Unsupported (Use Chrome/Edge)');
    }
  }, []);

  // Auto-scroll effect for streaming response
  useEffect(() => {
    if (outputContainerRef.current) {
      outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
    }
  }, [megalithResponse]);

  const initMegalith = async () => {
    setMegalithStatus('Awakening WebGPU context adapter...');
    try {
      if (!coreRef.current) {
        coreRef.current = new LLMCore();
      }
      setMegalithStatus('Compiling custom WGSL shader pipelines...');
      const success = await coreRef.current.init('/assets/model.bin', '/assets/tokenizer.json');
      if (success) {
        setMegalithStatus('Loaded & Ready on GPU (Zero Network Fetch)');
        setMegalithLoaded(true);
      } else {
        setMegalithStatus(`Failed: ${coreRef.current.errorMsg || 'GPU core rejected adapter'}`);
      }
    } catch (e: any) {
      setMegalithStatus(`Failed: ${e.message || String(e)}`);
    }
  };

  const generateMegalith = async () => {
    if (!coreRef.current || !megalithLoaded) return;
    
    // Input Validation
    const trimmedPrompt = megalithPrompt.trim();
    if (!trimmedPrompt) {
      setValidationError("Prompt cannot be empty. Please compose a prompt context sequence.");
      return;
    }

    setValidationError(null);
    setMegalithGenerating(true);
    setMegalithResponse('');
    setTokensPerSec(0);
    setTimeTakenMs(0);

    const startTime = performance.now();
    let tokenCount = 0;

    try {
      const result = await coreRef.current.generate(megalithPrompt, {
        temperature: megalithTemp,
        topK: megalithTopK,
        topP: megalithTopP,
        maxNewTokens: megalithMaxTokens,
        onToken: (tok) => {
          tokenCount++;
          setMegalithResponse(prev => prev + tok);
          
          const elapsed = (performance.now() - startTime) / 1000;
          if (elapsed > 0) {
            setTokensPerSec(parseFloat((tokenCount / elapsed).toFixed(1)));
          }
        }
      });

      const elapsedMs = performance.now() - startTime;
      setTimeTakenMs(Math.round(elapsedMs));
      if (tokenCount > 0) {
        setTokensPerSec(parseFloat((tokenCount / (elapsedMs / 1000)).toFixed(1)));
      }
    } catch (err: any) {
      console.error(err);
      setMegalithResponse(prev => prev + `\n\n[GPU execution error: browser frame context boundary was reached]`);
    } finally {
      setMegalithGenerating(false);
    }
  };

  const { 
    isModelLoaded, loadProgress, loadStatus, loadModel, 
    selectedModel, setSelectedModel,
    apiKeys, setApiKeys,
    selectedProvider, setSelectedProvider,
    isCloudMode, setIsCloudMode,
    ollamaConfig, setOllamaConfig,
    clearCache,
    hfToken, setHfToken,
    error
  } = useLocalLLM();
  
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const payloadProvider = event.data.provider;
        const payloadToken = event.data.token;
        if (payloadProvider) {
          setApiKeys(prev => ({ ...prev, [payloadProvider]: payloadToken }));
          setIsCloudMode(true);
        }
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [setApiKeys, setIsCloudMode]);
  
  const { isMobile } = useSystemState();
  const [customModelId, setCustomModelId] = useState('');

  const handleFallBackToCloud = () => {
    setIsCloudMode(true);
    setSelectedProvider('gemini');
    setActiveTab('providers');
  };

  const RECOMMENDED_MODELS = [
    { 
      id: "SmolLM2-135M-Instruct-q0f16-MLC", 
      name: "SmolLM2 (135M)", 
      desc: "Ultra-compact model. Ideal for unstable mobile connections and low VRAM.",
      vram: "300 MB",
      tag: "MOBILE OPTIMIZED"
    },
    { 
      id: "Qwen2.5-0.5B-Instruct-q0f16-MLC", 
      name: "Qwen 2.5 (0.5B)", 
      desc: "Small but powerful. High performance on mobile devices.",
      vram: "500 MB",
      tag: "STABLE MOBILE"
    },
    { 
      id: "gemma-3-1b-it-q4f16_1-MLC", 
      name: "Gemma 3 (1B Instruct)", 
      desc: "Google's ultra-advanced lightweight model. Incredible multilingual and reasoning precision.",
      vram: "1.5 GB",
      tag: "SOVEREIGN CORE"
    },
    { 
      id: "gemma-2b-it-q4f16_1-MLC", 
      name: "Gemma 2B (Instruct)", 
      desc: "Optimized 4-bit quantization. Best balance of speed and intelligence for most devices.",
      vram: "1.5 GB",
      tag: "RECOMMENDED"
    },
    { 
      id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", 
      name: "Llama 3.2 (1B)", 
      desc: "Ultra-lightweight model for low-resource devices and rapid response.",
      vram: "1.1 GB",
      tag: "LIGHTWEIGHT"
    },
    { 
      id: "Llama-3.1-8B-Instruct-q4f16_1-MLC", 
      name: "Llama 3.1 (8B)", 
      desc: "High-fidelity 8B model for superior reasoning. Requires significant VRAM.",
      vram: "5.5 GB",
      tag: "HIGH FIDELITY"
    }
  ];

  useEffect(() => {
    // Fetch available local models from web-llm
    if (webllm && webllm.prebuiltAppConfig && webllm.prebuiltAppConfig.model_list) {
      const models = webllm.prebuiltAppConfig.model_list
        .map(m => m.model_id)
        .filter(id => !RECOMMENDED_MODELS.some(rm => rm.id === id));
      setAvailableLocalModels(models);
    } else {
      // Direct reliable fallback list if app config is blank or doesn't map yet
      setAvailableLocalModels([
        "SmolLM2-135M-Instruct-q0f16-MLC",
        "Qwen2.5-0.5B-Instruct-q0f16-MLC",
        "Llama-3.2-1B-Instruct-q4f16_1-MLC",
        "gemma-2b-it-q4f16_1-MLC"
      ]);
    }
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeys(prev => ({ ...prev, [selectedProvider]: e.target.value }));
  };

  const [apiKeysUpdateDummy, setApiKeysUpdateDummy] = useState(0);

  const getDefaultModelForProvider = (provider: string) => {
    switch (provider) {
      case 'deepseek': return 'deepseek-chat';
      case 'openrouter': return 'meta-llama/llama-3.3-70b-instruct:free';
      case 'together': return 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
      case 'huggingface': return 'meta-llama/Llama-2-7b-chat-hf';
      case 'openai': return 'gpt-4o-mini';
      case 'anthropic': return 'claude-3-5-sonnet-latest';
      case 'mistral': return 'mistral-large-latest';
      default: return '';
    }
  };

  const getSelectModelsForProvider = (provider: string) => {
    switch (provider) {
      case 'deepseek':
        return [
          { id: 'deepseek-chat', name: 'DeepSeek-V3 Chat (General Intelligence)', free: false },
          { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (Reasoning, Math, Logic)', free: false }
        ];
      case 'openrouter':
        return [
          { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta Llama 3.3 70B (High Speed Dev)', free: true },
          { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 Reasoning (Deep COT)', free: true },
          { id: 'qwen/qwen-2.5-coder-32b:free', name: 'Qwen 2.5 Coder 32B (Optimized Programming)', free: true },
          { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash Free (Multimodal Fast Search)', free: true },
          { id: 'microsoft/phi-3-medium-128k-instruct:free', name: 'Phi 3 Medium (128K Developer Core)', free: true }
        ];
      case 'together':
        return [
          { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Instruct Turbo', free: false },
          { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1 Deep Thinking Machine', free: false },
          { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B Instruct', free: false }
        ];
      case 'huggingface':
        return [
          { id: 'meta-llama/Llama-2-7b-chat-hf', name: 'Llama 2 7B Chat Serverless API', free: true },
          { id: 'HuggingFaceH4/zephyr-7b-beta', name: 'Zephyr 7B Beta Instructor', free: true },
          { id: 'Qwen/Qwen2.5-Coder-1.5B-Instruct', name: 'Qwen 2.5 Coder 1.5B Instruct', free: true }
        ];
      case 'openai':
        return [
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Speed Core)', free: false },
          { id: 'gpt-4o', name: 'GPT-4o Agentic Flagship Core', free: false },
          { id: 'o1-mini', name: 'o1 Mini (Developer Logic Reasoning)', free: false }
        ];
      case 'anthropic':
        return [
          { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet (Engineering Lead)', free: false },
          { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku (Fast Logic Autocomplete)', free: false }
        ];
      case 'mistral':
        return [
          { id: 'mistral-large-latest', name: 'Mistral Large 2 (Flagship Logic Hub)', free: false },
          { id: 'codestral-latest', name: 'Mistral Codestral (Specialized Code Completion)', free: false }
        ];
      default:
        return [];
    }
  };

  const handleVerifyConnection = () => {
    setIsCloudMode(true);
    alert(`${selectedProvider} cloud mode activated.`);
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-300 p-6 flex flex-col overflow-hidden border border-indigo-500/30 rounded-xl relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0,transparent_70%)] pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 z-10 border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-serif text-indigo-300 flex items-center gap-3">
          <i className="ri-cpu-line text-indigo-400"></i>
          Logic Core Orchestrator
        </h2>
        <div className="flex gap-2 flex-wrap md:flex-nowrap">
          <button 
            onClick={() => setActiveTab('megalith')}
            className={`px-4 py-2 rounded text-sm font-mono transition-colors border border-cyan-500/30 flex items-center gap-1.5 ${activeTab === 'megalith' ? 'bg-cyan-600 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'}`}
          >
            <i className="ri-cpu-fill"></i>
            Megalith LLMCore (WebGPU)
          </button>
          <button 
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2 rounded text-sm font-mono transition-colors ${activeTab === 'providers' ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            Cloud Providers
          </button>
          <button 
            onClick={() => setActiveTab('local')}
            className={`px-4 py-2 rounded text-sm font-mono transition-colors ${activeTab === 'local' ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            Local WebGPU (WebLLM)
          </button>
          <button 
            onClick={() => setActiveTab('angelic')}
            className={`px-4 py-2 rounded text-sm font-mono transition-colors ${activeTab === 'angelic' ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
          >
            Angelic OS Features
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto z-10 pr-2 custom-scrollbar">
        {activeTab === 'megalith' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-slate-900/50 p-5 rounded-lg border border-cyan-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-slate-800 gap-4">
                <div>
                  <h3 className="text-xl font-medium text-white flex items-center gap-2">
                    <i className="ri-cpu-line text-cyan-400"></i>
                    Sovereign Megalith Local LLMCore (50M Parameters)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Bypasses all remote backend layers and runs 100% on the local thread via WebGPU shaders utilizing zero external URL fetches.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-[10px] font-mono rounded border uppercase ${
                    hasWebGpu ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/50' : 'bg-red-950/40 text-red-450 border-red-800/50'
                  }`}>
                    {hasWebGpu ? 'WebGPU Context Active' : 'WebGPU Fail/Missing'}
                  </span>
                </div>
              </div>

              {/* Mobile and Iframe Helpful Guard Advices */}
              {(isMobile || (typeof window !== 'undefined' && window.self !== window.top)) && (
                <div className="mb-5 p-4 bg-amber-950/20 border border-amber-500/20 rounded-lg text-xs space-y-3 text-amber-200">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-400 font-mono">
                    <i className="ri-error-warning-line text-sm"></i> Mobile WebGPU Guidelines
                  </div>
                  {typeof window !== 'undefined' && window.self !== window.top && (
                    <p className="leading-relaxed">
                      ⚠️ <strong className="text-amber-100">Iframe Context Restriction:</strong> Security policies strictly block GPU access within isolated iframes. To run this local model on your phone, click <strong className="text-amber-300">Open App in New Tab</strong> at the top-right of your screen first!
                    </p>
                  )}
                  {isMobile && (
                    <p className="leading-relaxed">
                      📱 <strong className="text-amber-100">System Resources:</strong> Megalith executes completely locally using standard raw GPU shaders. While lightweight (50M params), mobile browsers still enforce extremely tight memory budgets making allocation prone to silent failures.
                    </p>
                  )}
                  <div className="pt-2 border-t border-amber-500/10 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-amber-400 italic">Getting stuck? You can run instantly on cloud instead:</span>
                    <button 
                      onClick={handleFallBackToCloud}
                      className="px-3 py-1 bg-gradient-to-r from-amber-600 to-orange-650 hover:from-amber-500 hover:to-orange-550 text-white rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all shadow-md animate-pulse"
                    >
                      Instant Cloud Mode Fallback
                    </button>
                  </div>
                </div>
              )}

              {/* Status Indicator Bar */}
              <div className="bg-slate-950 p-4 rounded border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    megalithStatus.toLowerCase().includes('ready') ? 'bg-emerald-400' :
                    megalithStatus.toLowerCase().includes('fail') ? 'bg-rose-500' : 'bg-amber-400'
                  }`} />
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Local Shading Pipeline Engine</span>
                    <span className={`text-xs font-mono font-bold ${
                      megalithStatus.toLowerCase().includes('ready') ? 'text-emerald-400' : 'text-cyan-300'
                    }`}>{megalithStatus}</span>
                  </div>
                </div>

                {!megalithLoaded ? (
                  <button 
                    disabled={!hasWebGpu || megalithStatus.toLowerCase().includes('compil') || megalithStatus.toLowerCase().includes('awaken')}
                    onClick={initMegalith}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded text-xs font-mono font-bold transition-all disabled:opacity-50"
                  >
                    {megalithStatus.toLowerCase().includes('awaken') ? 'Awakening Core...' : 'INITIALIZE GPU LLMCORE'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-990/20 px-2.5 py-1 rounded border border-emerald-900/40">
                    <i className="ri-shield-flash-line"></i> WebGPU Shader Pipelines Active
                  </div>
                )}
              </div>

              {/* Hyperparam Tuners Grid on Left & Prompters on Right */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-950 p-5 rounded border border-slate-800/80 space-y-4">
                  <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-widest border-b border-slate-850 pb-2">Hyperparameter tuners</h4>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-slate-400">Temperature</span>
                      <span className="text-cyan-300">{megalithTemp.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="1.5" step="0.1" 
                      value={megalithTemp} onChange={e => setMegalithTemp(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">Controls predictability of next-token logits.</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-slate-400">Top-p (Nucleus)</span>
                      <span className="text-cyan-300">{megalithTopP.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0.1" max="1.0" step="0.05" 
                      value={megalithTopP} onChange={e => setMegalithTopP(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">Filters candidate tokens by cumulative probability.</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-slate-400">Top-K Selection</span>
                      <span className="text-cyan-300">{megalithTopK}</span>
                    </div>
                    <input 
                      type="range" min="1" max="100" step="1" 
                      value={megalithTopK} onChange={e => setMegalithTopK(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">Restricts vocab logits to top specified candidates.</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-slate-400">Max Generated Length</span>
                      <span className="text-cyan-300">{megalithMaxTokens} tok</span>
                    </div>
                    <input 
                      type="range" min="10" max="256" step="10" 
                      value={megalithMaxTokens} onChange={e => setMegalithMaxTokens(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">Limits autoregressive sequence loops.</span>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col space-y-5">
                  <div className="flex-grow flex flex-col space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">Sovereign Prompt Input</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setMegalithPrompt('');
                            setValidationError(null);
                          }}
                          disabled={megalithGenerating}
                          className="text-[10px] font-mono text-slate-500 hover:text-rose-450 transition-colors disabled:opacity-30"
                          title="Clear current input"
                        >
                          [CLEAR]
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMegalithPrompt('We are the engineers of the sovereign cyber-matrix, reweaving chaos into pure resonance.');
                            setValidationError(null);
                          }}
                          disabled={megalithGenerating}
                          className="text-[10px] font-mono text-slate-500 hover:text-cyan-450 transition-colors disabled:opacity-30"
                          title="Reset to default prompt"
                        >
                          [RESET]
                        </button>
                        <span className={`text-[10px] font-mono ${megalithPrompt.length > 4000 ? 'text-amber-500 font-bold animate-pulse' : 'text-slate-500'}`}>
                          {megalithPrompt.length} chars
                        </span>
                      </div>
                    </div>
                    <textarea 
                      disabled={!megalithLoaded || megalithGenerating}
                      value={megalithPrompt}
                      onChange={e => {
                        setMegalithPrompt(e.target.value);
                        if (e.target.value.trim()) {
                          setValidationError(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          if (megalithLoaded && !megalithGenerating && megalithPrompt.trim()) {
                            generateMegalith();
                          }
                        }
                      }}
                      placeholder={megalithLoaded ? "Compose your prompt context sequence... (Ctrl + Enter to execute)" : "Commence 'Initialize GPU LLMCORE' on left to load vocabulary inputs..."}
                      className={`w-full h-28 bg-slate-950 border ${validationError ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20'} rounded p-3 text-xs text-cyan-300 font-mono focus:outline-none focus:ring-1 disabled:opacity-50 resize-none custom-scrollbar`}
                    />
                    {validationError && (
                      <span className="text-[10px] text-rose-400 font-mono flex items-center gap-1 animate-pulse">
                        <i className="ri-error-warning-line"></i> {validationError}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <button
                      disabled={!megalithLoaded || megalithGenerating || !megalithPrompt.trim()}
                      onClick={generateMegalith}
                      className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono rounded text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:shadow-none"
                    >
                      {megalithGenerating ? (
                        <>
                          <i className="ri-loader-4-line animate-spin"></i>
                          REWEAVING SHADERS...
                        </>
                      ) : (
                        <>
                          <i className="ri-play-fill text-sm"></i>
                          RUN LOCAL INFERENCE
                        </>
                      )}
                    </button>

                    {(tokensPerSec > 0 || timeTakenMs > 0) && (
                      <div className="flex gap-4 text-xs font-mono bg-slate-950 border border-slate-800 px-3 py-2 rounded">
                        <div>
                          <span className="text-slate-500 uppercase">Speed:</span>{' '}
                          <span className="text-cyan-400 font-bold">{tokensPerSec} tok/s</span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase">GPU Time:</span>{' '}
                          <span className="text-purple-400 font-bold">{timeTakenMs} ms</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Console Output Block */}
              <div className="mt-6 flex flex-col space-y-1">
                <div className="flex justify-between items-center bg-slate-950 border border-slate-800 px-4 py-2 rounded-t font-mono text-[9px] text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 text-cyan-400/80">
                    <i className="ri-terminal-window-line"></i>
                    Off-Grid Logits Output window
                  </span>
                  <div className="flex items-center gap-3">
                    {megalithResponse && (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(megalithResponse);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            } catch (err) {
                              console.warn('Clipboard write failed', err);
                            }
                          }}
                          className="hover:text-cyan-400 transition-colors uppercase cursor-pointer"
                        >
                          {copied ? '✓ COPIED' : '[COPY]'}
                        </button>
                        <button
                          onClick={() => setMegalithResponse('')}
                          className="hover:text-rose-400 transition-colors uppercase cursor-pointer"
                        >
                          [CLEAR]
                        </button>
                      </>
                    )}
                    <span>100% Client Sovereign</span>
                  </div>
                </div>
                <div 
                  ref={outputContainerRef}
                  className="bg-slate-950 border-x border-b border-slate-800 rounded-b p-4 min-h-[140px] max-h-[250px] overflow-y-auto font-mono text-xs leading-relaxed text-cyan-100/90 custom-scrollbar relative scroll-smooth"
                >
                  {megalithResponse ? (
                    <div className="whitespace-pre-wrap select-text">
                      {megalithResponse}
                      {megalithGenerating && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse" />
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-600 italic">
                      [Offline core outputs will stream here. Hit the inference button above.]
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'providers' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700">
              <h3 className="text-lg font-medium text-white mb-4">Select Primary LLM Provider</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['gemini', 'ollama', 'openai', 'anthropic', 'mistral', 'nvidia', 'deepseek', 'openrouter', 'together', 'huggingface'].map(provider => (
                  <div 
                    key={provider}
                    onClick={() => {
                      setSelectedProvider(provider);
                      if (provider === 'ollama') setIsCloudMode(false);
                    }}
                    className={`p-4 rounded border cursor-pointer transition-all ${selectedProvider === provider ? 'border-indigo-500 bg-indigo-900/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="capitalize font-medium text-white font-mono text-xs">{provider}</span>
                      {selectedProvider === provider && <i className="ri-check-line text-indigo-400"></i>}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-tight">
                      {provider === 'gemini' ? 'Default NVK Core.' : 
                       provider === 'ollama' ? 'Local LLM Orchestrator.' :
                       provider === 'nvidia' ? 'NVIDIA NIM Microservices.' : 
                       provider === 'deepseek' ? 'DeepSeek Reasoning Node.' :
                       provider === 'openrouter' ? 'Open-Source Model Directory.' :
                       provider === 'together' ? 'Together AI Dev Cluster.' :
                       provider === 'huggingface' ? 'Hugging Face Hub Services.' :
                       `Connect via ${provider} API.`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700">
              <h3 className="text-lg font-medium text-white mb-4 capitalize">{selectedProvider} Configuration</h3>
              {selectedProvider === 'ollama' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Ollama Server URL</label>
                      <input 
                        type="text" 
                        value={ollamaConfig.url}
                        onChange={(e) => setOllamaConfig(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="http://localhost:11434" 
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-cyan-400 focus:outline-none focus:border-cyan-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Model Name</label>
                      <input 
                        type="text" 
                        value={ollamaConfig.model}
                        onChange={(e) => setOllamaConfig(prev => ({ ...prev, model: e.target.value }))}
                        placeholder="llama3" 
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-orange-400 focus:outline-none focus:border-orange-500" 
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-900/10 border border-indigo-500/20 rounded text-xs text-slate-400 leading-relaxed">
                    <p className="flex items-center gap-2 mb-1 text-indigo-300">
                      <i className="ri-information-line"></i> Local Orchestration Mode
                    </p>
                    Ensure Ollama is running locally and that you have set the environment variable 
                    <code className="mx-1 text-emerald-400 bg-emerald-950/30 px-1 rounded">OLLAMA_ORIGINS="*"</code> 
                    to allow browser connections.
                  </div>
                  <button 
                    onClick={() => {
                      setIsCloudMode(false);
                      alert(`Ollama core synchronized: ${ollamaConfig.model}`);
                    }} 
                    className="px-4 py-2 bg-orange-600/80 hover:bg-orange-500 text-white rounded text-sm font-medium transition-colors"
                  >
                    Synchronize Ollama Core
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* OAuth Integration Block */}
                  {['deepseek', 'openrouter', 'together', 'huggingface', 'openai', 'anthropic', 'mistral'].includes(selectedProvider) && (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${apiKeys[selectedProvider] ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse'}`} />
                          <span className="text-xs uppercase font-mono tracking-widest font-bold">
                            {apiKeys[selectedProvider] ? 'Workspace Authorized' : 'Workspace Offline'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {apiKeys[selectedProvider] 
                            ? `Authentic cloud pipeline live for ${selectedProvider}.`
                            : `Secure OAuth signature missing for ${selectedProvider}. Connect to initiate model gateway.`}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            // Trigger dynamic path-popup
                            const width = 500;
                            const height = 650;
                            const left = window.screen.width / 2 - width / 2;
                            const top = window.screen.height / 2 - height / 2;
                            const popup = window.open(
                              `/auth-gateway?provider=${selectedProvider}`,
                              `Connect ${selectedProvider}`,
                              `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
                            );
                            if (!popup) {
                              alert("OAuth pop-up blocked. Please authorise popups in your browser settings.");
                            }
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-mono font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                        >
                          <i className="ri-shield-user-line"></i> Connect via Secure OAuth
                        </button>
                        {apiKeys[selectedProvider] && (
                          <button 
                            onClick={() => {
                              setApiKeys(prev => ({ ...prev, [selectedProvider]: '' }));
                              alert(`${selectedProvider} decoupled from workspace.`);
                            }}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 rounded text-xs font-mono transition-colors"
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Active Developer Model Select Catalogue */}
                  {['deepseek', 'openrouter', 'together', 'huggingface', 'openai', 'anthropic', 'mistral'].includes(selectedProvider) && (
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-400 uppercase tracking-widest font-mono">Select Developer Model Hub</label>
                      <select
                        value={localStorage.getItem(`nvk_model_${selectedProvider}`) || getDefaultModelForProvider(selectedProvider)}
                        onChange={(e) => {
                          localStorage.setItem(`nvk_model_${selectedProvider}`, e.target.value);
                          // Force local state update dummy to trigger rerender
                          setApiKeysUpdateDummy(d => d + 1);
                          alert(`${selectedProvider} updated to model ${e.target.value}`);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                      >
                        {getSelectModelsForProvider(selectedProvider).map(m => (
                          <option key={m.id} value={m.id}>{m.name} {m.free ? ' [FREE]' : ''}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 font-mono leading-relaxed uppercase">
                        🚀 Each choice connects directly to {selectedProvider} API endpoints with custom weights optimized for development logic.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Manual Key Override</label>
                    <input 
                      type="password" 
                      value={apiKeys[selectedProvider] || ''}
                      onChange={handleApiKeyChange}
                      placeholder={`Enter manual ${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API Key...`} 
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Base URL Override (Optional)</label>
                    <input 
                      type="text" 
                      placeholder={selectedProvider === 'nvidia' ? 'https://integrate.api.nvidia.com/v1' : 'https://api...'} 
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-500" 
                    />
                  </div>
                  <button onClick={handleVerifyConnection} className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors">
                    Activate Cloud Mode
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'local' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Local WebGPU Models</h3>
                <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-1 rounded border border-emerald-800">Privacy Preserved</span>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                Run models directly in your browser using WebGPU. No data leaves your device. Perfect for NVK, angelic operations requiring absolute privacy.
              </p>

              {error && (
                <div className="mb-5 p-4 bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs leading-relaxed text-rose-200">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-rose-450 mb-1 font-mono">
                    <i className="ri-error-warning-line text-sm"></i> WebGPU Lattice Disturbance
                  </div>
                  <p className="mb-2">{error.message}</p>
                  <button 
                    onClick={() => clearCache()}
                    className="px-3 py-1 bg-rose-900/30 hover:bg-rose-900/50 border border-rose-800 text-rose-300 rounded font-mono text-[10px] transition-colors"
                  >
                    Reset & Purge Client Cache
                  </button>
                </div>
              )}

              {/* Mobile/Iframe Warning alert for Local tab */}
               {(isMobile || (typeof window !== 'undefined' && window.self !== window.top)) && (
                <div className="mb-5 p-4 bg-amber-950/20 border border-amber-500/20 rounded-lg text-xs space-y-3 text-amber-200">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-400 font-mono">
                    <i className="ri-smartphone-line text-sm"></i> Mobile WebGPU Guidelines
                  </div>
                  {typeof window !== 'undefined' && window.self !== window.top && (
                    <p className="leading-relaxed font-sans">
                      ⚠️ <strong className="text-amber-100">Iframe Context Restriction:</strong> Security policies block WebGPU access within isolated previews. To run local models on your phone, you <strong className="text-amber-300 uppercase">must Open this App in a New Tab</strong> using the button at the top-right of the screen!
                    </p>
                  )}
                  {isMobile && (
                    <p className="leading-relaxed font-sans">
                      📱 <strong className="text-amber-100">Memory allocation boundary:</strong> Mobile GPUs share memory with system RAM and strictly limit allocations. We strongly advise selecting <strong className="text-amber-300">SmolLM2 (135M)</strong> or <strong className="text-amber-300">Qwen 2.5 (0.5B)</strong>. Heavy models like Gemma 3 are highly likely to hit resource bounds and fail silently or crash the tab.
                    </p>
                  )}
                  <div className="pt-2 border-t border-amber-500/10 flex flex-wrap items-center justify-between gap-2 font-sans">
                    <span className="text-[10px] text-amber-400 italic">Trouble loading? Use Gemini Cloud Server instead:</span>
                    <button 
                      onClick={handleFallBackToCloud}
                      className="px-3 py-1 bg-gradient-to-r from-amber-600 to-orange-650 hover:from-amber-500 hover:to-orange-550 text-white rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all shadow-md animate-pulse"
                    >
                      Instant Cloud Mode Fallback
                    </button>
                  </div>
                </div>
              )}
              
              {loadStatus !== "Idle" && (
                <div className="mb-4 p-3 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-300 break-all">
                  <span className="text-indigo-400">System:</span> {loadStatus} ({Math.round(loadProgress)}%)
                </div>
              )}
              
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {/* Recommended Models */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">Recommended for NVK Core</h4>
                  {RECOMMENDED_MODELS.map(model => (
                    <div 
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`p-4 rounded border cursor-pointer transition-all flex flex-col gap-2 ${selectedModel === model.id ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-white">{model.name}</span>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{model.vram} VRAM</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                            model.tag === 'RECOMMENDED' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800' : 
                            model.tag === 'HIGH FIDELITY' ? 'bg-indigo-900/50 text-indigo-400 border-indigo-800' :
                            'bg-slate-900/50 text-slate-400 border-slate-800'
                          }`}>
                            {model.tag}
                          </span>
                        </div>
                        {isModelLoaded && selectedModel === model.id ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <i className="ri-check-line"></i> Active
                          </span>
                        ) : selectedModel === model.id ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsCloudMode(false); loadModel(model.id); }}
                            disabled={loadStatus !== "Idle" && loadStatus !== "Error" && loadStatus !== "Ready"}
                            className={`text-xs px-3 py-1 rounded transition-colors ${loadStatus !== "Idle" && loadStatus !== "Error" && loadStatus !== "Ready" ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-50'}`}
                          >
                            {loadStatus !== "Idle" && loadStatus !== "Error" && loadStatus !== "Ready" ? 'Loading...' : 'Hydrate'}
                          </button>
                        ) : (
                          <i className="ri-download-cloud-2-line text-slate-500"></i>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{model.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Standard Models */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">Standard WebGPU Library</h4>
                  {availableLocalModels.length > 0 ? (
                    availableLocalModels.map(model => (
                      <div 
                        key={model}
                        onClick={() => setSelectedModel(model)}
                        className={`p-3 rounded border cursor-pointer transition-all flex items-center justify-between ${selectedModel === model ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'}`}
                      >
                        <span className="font-mono text-sm text-slate-300">{model}</span>
                        {isModelLoaded && selectedModel === model ? (
                          <span className="text-xs bg-emerald-900/50 text-emerald-400 px-3 py-1 rounded border border-emerald-800 flex items-center gap-1">
                            <i className="ri-check-line"></i> Loaded
                          </span>
                        ) : selectedModel === model ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsCloudMode(false); loadModel(model); }}
                            disabled={loadStatus !== "Idle" && loadStatus !== "Error" && loadStatus !== "Ready"}
                            className={`text-xs px-3 py-1 rounded transition-colors ${loadStatus !== "Idle" && loadStatus !== "Error" && loadStatus !== "Ready" ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                          >
                            {loadStatus !== "Idle" && loadStatus !== "Error" && loadStatus !== "Ready" ? 'Loading...' : 'Load'}
                          </button>
                        ) : (
                          <i className="ri-download-cloud-2-line text-slate-500"></i>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 text-slate-500">
                      <i className="ri-loader-4-line animate-spin text-2xl mb-2 block"></i>
                      Loading standard library...
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-4">
                   <div className="bg-slate-950/50 p-4 rounded border border-indigo-500/20">
                      <h4 className="text-xs font-mono text-indigo-400 uppercase tracking-widest mb-3">Hugging Face Integration</h4>
                      <div className="space-y-3">
                         <div>
                            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">HF Access Token (Optional)</label>
                            <input 
                              type="password"
                              value={hfToken}
                              onChange={(e) => setHfToken(e.target.value)}
                              placeholder="hf_..."
                              className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                         </div>
                         <div className="flex gap-2">
                            <input 
                              type="text"
                              value={customModelId}
                              onChange={(e) => setCustomModelId(e.target.value)}
                              placeholder="username/model-id-MLC"
                              className="flex-grow bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                            <button 
                              onClick={() => {
                                if (customModelId) {
                                  setSelectedModel(customModelId);
                                  loadModel(customModelId);
                                }
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono rounded transition-all"
                            >
                              Load
                            </button>
                         </div>
                         <p className="text-[10px] text-slate-500 italic">
                           Note: The model must be in MLC format (e.g. q4f16_1-MLC).
                         </p>
                      </div>
                   </div>

                   <button 
                    onClick={clearCache}
                    className="w-full py-2 bg-rose-900/10 hover:bg-rose-900/20 border border-rose-500/10 text-rose-500 text-[10px] font-mono rounded transition-all flex items-center justify-center gap-2"
                   >
                     <i className="ri-delete-bin-line"></i> Purge Logic Core Cache
                   </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'angelic' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-slate-900/50 p-5 rounded-lg border border-emerald-500/30">
              <div className="flex items-center gap-3 mb-2">
                <i className="ri-shield-star-line text-2xl text-emerald-400"></i>
                <h3 className="text-xl font-serif text-emerald-300">Angelic Business Operations OS</h3>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                System capabilities designed for efficiency, ethics, and transparency. The logic core orchestrates these functions autonomously while aligned with human values.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ANGELIC_FEATURES.map((category, idx) => (
                  <div key={idx} className="bg-slate-950/50 p-4 rounded border border-slate-800">
                    <h4 className="text-emerald-400 font-medium mb-3 text-sm uppercase tracking-wider border-b border-slate-800 pb-2">
                      {category.category}
                    </h4>
                    <ul className="space-y-2">
                      {category.items.map((item, i) => (
                        <li key={i} className="flex items-start text-sm text-slate-300">
                          <i className="ri-checkbox-circle-line text-emerald-600 mr-2 mt-0.5"></i>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ModelOrchestratorPanel;
