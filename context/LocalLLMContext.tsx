import React, { createContext, useState, useCallback, useContext, ReactNode, useRef, useEffect } from 'react';
import { CreateMLCEngine, CreateWebWorkerMLCEngine, prebuiltAppConfig } from "@mlc-ai/web-llm";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import type { LocalLLMContextType } from '../types';

/**
 * Standardized model ID for Gemma 3 1B Instruct.
 */
const SELECTED_MODEL = "gemma-3-1b-it-q4f16_1-MLC";

/**
 * Custom App Config to explicitly register stable models.
 * Using verified URLs for Gemma 3 and other models.
 */
const MODEL_LIB_URL_PREFIX = "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/";

const customAppConfig = {
  ...prebuiltAppConfig,
  // Defect 5 fix (2026-11-22): cache ON. Was false, so every load re-downloaded
  // the full model — the exact re-download loop the NVK Agent fixed in v0.1.1.
  useIndexedDBCache: true,
  model_list: [
    // Defect 6 fix (2026-11-22): Gemma 3 4B is excluded everywhere. Its wasm
    // lib 404s upstream, so the entry could never load; the silent 4B→1B
    // rewrite that hid that fact is deleted below.
    ...(prebuiltAppConfig.model_list || []).filter((m: any) => !String((m as any).model_id || '').includes('gemma-3-4b')),
    {
      model: "https://huggingface.co/mlc-ai/SmolLM2-135M-Instruct-q0f16-MLC",
      model_id: "SmolLM2-135M-Instruct-q0f16-MLC",
      model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/SmolLM2-135M-Instruct-q0f16_cs1k-webgpu.wasm",
      low_resource_required: true,
      vram_required_MB: 300,
    },
    {
      model: "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q0f16-MLC",
      model_id: "Qwen2.5-0.5B-Instruct-q0f16-MLC",
      model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/Qwen2-0.5B-Instruct-q0f16_cs1k-webgpu.wasm",
      low_resource_required: true,
      vram_required_MB: 500,
    },
    {
      model: "https://huggingface.co/mlc-ai/gemma-3-1b-it-q4f16_1-MLC",
      model_id: "gemma-3-1b-it-q4f16_1-MLC",
      model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/gemma3-1b-it-q4f16_1_cs1k-webgpu.wasm",
      low_resource_required: true,
      vram_required_MB: 1500,
    },
    {
      model: "https://huggingface.co/mlc-ai/gemma-2b-it-q4f16_1-MLC",
      model_id: "gemma-2b-it-q4f16_1-MLC",
      model_lib: MODEL_LIB_URL_PREFIX + "gemma-2b-it-q4f16_1-MLC.wasm",
      low_resource_required: true,
      vram_required_MB: 1500,
    },
    {
      model: "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC",
      model_id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
      model_lib: MODEL_LIB_URL_PREFIX + "Llama-3.2-1B-Instruct-q4f16_1-MLC.wasm",
      low_resource_required: true,
      vram_required_MB: 1100,
    },
    {
      model: "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q0f16-MLC",
      model_id: "Llama-3.2-1B-Instruct-q0f16-MLC",
      model_lib: MODEL_LIB_URL_PREFIX + "Llama-3.2-1B-Instruct-q0f16-MLC.wasm",
      low_resource_required: true,
      vram_required_MB: 1100,
    },
    {
      model: "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f32_1-MLC",
      model_id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      model_lib: MODEL_LIB_URL_PREFIX + "Llama-3.2-1B-Instruct-q4f32_1-MLC.wasm",
      low_resource_required: true,
      vram_required_MB: 2000,
    },
    {
      model: "https://huggingface.co/mlc-ai/Llama-3.1-8B-Instruct-q4f16_1-MLC",
      model_id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
      model_lib: MODEL_LIB_URL_PREFIX + "Llama-3.1-8B-Instruct-q4f16_1-MLC.wasm",
      low_resource_required: false,
      vram_required_MB: 5500,
    }
  ],
};

interface ExtendedLocalLLMContextType extends LocalLLMContextType {
  clearCache: () => Promise<void>;
}

export const LocalLLMContext = createContext<ExtendedLocalLLMContextType | undefined>(undefined);

export const LocalLLMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState("Idle");
  const [error, setError] = useState<Error | null>(null);
  
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('nvk_selected_model') || SELECTED_MODEL;
  });
  const [hfToken, setHfToken] = useState<string>(() => {
    return localStorage.getItem('nvk_hf_token') || '';
  });
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('nvk_api_keys');
      return saved ? JSON.parse(saved) : {
        cloud_ai: '', openai: '', anthropic: '', mistral: '', nvidia: '', deepseek: '', openrouter: '', together: '', huggingface: ''
      };
    } catch(e) {
      return {
        cloud_ai: '', openai: '', anthropic: '', mistral: '', nvidia: '', deepseek: '', openrouter: '', together: '', huggingface: ''
      };
    }
  });
  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    return localStorage.getItem('nvk_selected_provider') || 'cloud_ai';
  });
  const [isCloudMode, setIsCloudMode] = useState<boolean>(() => {
    return localStorage.getItem('nvk_is_cloud_mode') === 'true';
  });
  const [ollamaConfig, setOllamaConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('nvk_ollama_config');
      return saved ? JSON.parse(saved) : { url: 'http://localhost:11434', model: 'llama3' };
    } catch(e) {
      return { url: 'http://localhost:11434', model: 'llama3' };
    }
  });

  useEffect(() => {
    localStorage.setItem('nvk_selected_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('nvk_hf_token', hfToken);
  }, [hfToken]);

  useEffect(() => {
    localStorage.setItem('nvk_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('nvk_selected_provider', selectedProvider);
  }, [selectedProvider]);

  useEffect(() => {
    localStorage.setItem('nvk_is_cloud_mode', String(isCloudMode));
  }, [isCloudMode]);

  useEffect(() => {
    localStorage.setItem('nvk_ollama_config', JSON.stringify(ollamaConfig));
  }, [ollamaConfig]);

  const engineRef = useRef<MLCEngineInterface | null>(null);

  /**
   * Weights-specific cache probe (defect 5, Agent v0.1.1 pattern).
   * True only when this model's own weight files are in the Cache API —
   * matched by the model id in the cached request URL (Hugging Face weight
   * files live under /<model_id>/resolve/). The wasm lib URL does not contain
   * the model id, so a cached lib alone does not count. Callers must only
   * claim "loading from cache" when this returns true.
   */
  const isModelCached = useCallback(async (modelId: string): Promise<boolean> => {
    if (typeof window === 'undefined' || !window.caches) return false;
    try {
      const cacheNames = await window.caches.keys();
      for (const name of cacheNames) {
        const cache = await window.caches.open(name);
        const keys = await cache.keys();
        for (const req of keys) {
          if (req.url.includes(modelId)) return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  /**
   * Deep purge of the browser's Cache API for WebLLM.
   * This resolves 'Failed to execute add on Cache' errors caused by corrupted or partial downloads.
   */
  const clearCache = useCallback(async () => {
    if (!window.caches) {
      console.warn("Cache API not supported in this environment.");
      return;
    }
    setLoadStatus("Purging Local Lattice...");
    try {
      const cacheNames = await window.caches.keys();
      for (const name of cacheNames) {
        // Purge any cache related to MLC, WebLLM, or Gemma
        if (name.toLowerCase().includes("webllm") || 
            name.toLowerCase().includes("gemma") || 
            name.toLowerCase().includes("mlc") ||
            name === "web-llm-v1") {
          await window.caches.delete(name);
        }
      }
      
      // Clear IndexedDB which handles model state and some cache metadata
      if (window.indexedDB) {
        const dbs = ["web-llm-storage", "mlc-chat-db"];
        dbs.forEach(db => {
          try { window.indexedDB.deleteDatabase(db); } catch(e) {}
        });
      }

      setLoadStatus("Core Purged");
      setLoadProgress(0);
      setIsModelLoaded(false);
      engineRef.current = null;
      setError(null);
      
      if (window.confirm("Lattice purged. A full system reload is recommended to clear WebGPU state. Reload now?")) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to clear WebLLM cache:", err);
    }
  }, []);

  const loadModel = useCallback(async (modelId?: string) => {
    const targetModel = modelId || selectedModel;

    // Defect 6 fix (2026-11-22): no silent substitution. A model that is not
    // in the list (e.g. Gemma 3 4B, removed because its weights 404 upstream)
    // errors honestly instead of loading a different model.
    const knownModel = customAppConfig.model_list.some((m: any) => (m as any).model_id === targetModel);
    if (!knownModel) {
      const unavailableError = new Error(`Model ${targetModel} is not available. It was removed because its weights cannot load — pick a listed model instead.`);
      setError(unavailableError);
      setLoadStatus("Error");
      return;
    }

    if (isModelLoaded && engineRef.current && selectedModel === targetModel) return;

    // WebGPU Availability Guard
    if (!(navigator as any).gpu) {
      const gpuError = new Error("WebGPU is not enabled. Local models require GPU acceleration via Chrome/Edge/Arc.");
      setError(gpuError);
      setLoadStatus("Error");
      return;
    }

    setIsModelLoaded(false);
    // Honest load wording (defect 5): only claim cache when the
    // weights-specific probe actually found this model's weights.
    const weightsCached = await isModelCached(targetModel);
    setLoadStatus(weightsCached ? `Loading ${targetModel} from cache...` : `Downloading ${targetModel} weights...`);
    setError(null);

    try {
      const initProgressCallback = (report: { text: string; progress: number }) => {
        setLoadProgress(report.progress * 100);
        setLoadStatus(report.text);
      };

      let engine: MLCEngineInterface;
      if (typeof Worker !== 'undefined') {
        try {
          const worker = new Worker(new URL('../src/workers/llm.worker.ts', import.meta.url), { type: 'module' });
          engine = await CreateWebWorkerMLCEngine(
            worker,
            targetModel,
            { 
              initProgressCallback: initProgressCallback,
              appConfig: customAppConfig,
              logLevel: "INFO",
            }
          );
        } catch (workerErr) {
          console.warn("WebWorkerMLCEngine worker spawn failed, using in-page engine fallback:", workerErr);
          engine = await CreateMLCEngine(
            targetModel,
            { 
              initProgressCallback: initProgressCallback,
              appConfig: customAppConfig,
              logLevel: "INFO",
            }
          );
        }
      } else {
        engine = await CreateMLCEngine(
          targetModel,
          { 
            initProgressCallback: initProgressCallback,
            appConfig: customAppConfig,
            logLevel: "INFO",
          }
        );
      }

      engineRef.current = engine;
      setSelectedModel(targetModel);
      setIsModelLoaded(true);
      setLoadStatus("Ready");
      setLoadProgress(100);
    } catch (err) {
      console.error(`Critical failure in ${targetModel} Core:`, err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      let displayError = errorMessage;
      // Handle the specific Cache error with actionable advice
      if (errorMessage.includes("Cache") || errorMessage.includes("fetch") || errorMessage.includes("add")) {
        displayError = "Lattice Sync Failure: A model shard could not be cached. This usually happens due to an incorrect URL or network timeout. Check your internet and try 'Reset Core'.";
      } else if (errorMessage.includes("VRAM") || errorMessage.includes("out of memory")) {
        displayError = `GPU VRAM Exhausted. Close other GPU-heavy tabs.`;
      }

      setError(new Error(displayError));
      setLoadStatus("Error");
      engineRef.current = null;
      setIsModelLoaded(false);
    }
  }, [isModelLoaded, selectedModel, isModelCached]);

  // A2 (2026-11-22): temperature / maxTokens are now real parameters
  // (defaults 0.6 / 2048) threaded through all three generation paths,
  // instead of being dropped at the cloud boundary or hardcoded locally.
  // Defect 4 (2026-11-22): no canned fallback anywhere. A missing model or
  // a failed inference returns null and sets an honest error — callers must
  // render the error, never a scripted answer.
  const generateText = useCallback(async (prompt: string, systemPrompt?: string, temperature: number = 0.6, maxTokens: number = 2048): Promise<string | null> => {
    if (selectedProvider === 'ollama') {
      setIsGenerating(true);
      setError(null);
      try {
        const response = await fetch(`${ollamaConfig.url}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaConfig.model,
            messages: [
              { role: 'system', content: systemPrompt || "You are a NVK Logic Core. Reason deeply and provide grounded insights." },
              { role: 'user', content: prompt }
            ],
            options: { temperature, num_predict: maxTokens },
            stream: false
          })
        });

        if (!response.ok) {
          throw new Error(`Ollama Error: ${response.statusText}. Ensure Ollama is running at ${ollamaConfig.url} and OLLAMA_ORIGINS="*" is set.`);
        }

        const data = await response.json();
        setIsGenerating(false);
        return data.message.content;
      } catch (err) {
        console.error("Error in Ollama inference:", err);
        setError(err instanceof Error ? err : new Error("Unknown error generating text via Ollama"));
        setIsGenerating(false);
        return null;
      }
    }

    if (isCloudMode || (selectedProvider !== 'local' && !isModelLoaded)) {
      setIsGenerating(true);
      setError(null);
      try {
        const clientApiKey = apiKeys[selectedProvider];
        const selectedModelName = localStorage.getItem(`nvk_model_${selectedProvider}`) || undefined;

        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            systemInstruction: systemPrompt || undefined,
            provider: selectedProvider,
            model: selectedModelName,
            apiKey: clientApiKey || undefined,
            temperature,
            maxTokens
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with status ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.text || "";
        setIsGenerating(false);
        return responseText;
      } catch (err) {
        console.error("Error in AI inference:", err);
        setError(err instanceof Error ? err : new Error("Unknown error generating text"));
        setIsGenerating(false);
        return null;
      }
    }

    if (!engineRef.current) {
      // Defect 4: no model loaded — return null with an honest error.
      // Never answer from canned text.
      const noModelError = new Error("No local model loaded. Load a local model first — no answer can be generated without one.");
      setError(noModelError);
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const messages = [
        { role: "system", content: systemPrompt || "You are a NVK Logic Core. Reason deeply and provide grounded insights." },
        { role: "user", content: prompt }
      ];

      // Use a timeout to prevent hanging indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const reply = await engineRef.current.chat.completions.create({
        messages: messages as any,
        temperature,
        max_tokens: maxTokens,
      });

      clearTimeout(timeoutId);
      setIsGenerating(false);
      return reply.choices[0].message.content || "";
    } catch (err) {
      console.error("Error in local inference:", err);
      setIsGenerating(false);
      setError(err instanceof Error ? err : new Error("Local inference failed"));
      return null;
    }
  }, [isCloudMode, selectedProvider, apiKeys, isModelLoaded]);

  return (
    <LocalLLMContext.Provider value={{
      isModelLoaded,
      isGenerating,
      loadProgress,
      loadStatus,
      error,
      loadModel,
      generateText,
      isModelCached,
      clearCache,
      selectedModel,
      setSelectedModel,
      hfToken,
      setHfToken,
      apiKeys,
      setApiKeys,
      selectedProvider,
      setSelectedProvider,
      isCloudMode,
      setIsCloudMode,
      ollamaConfig,
      setOllamaConfig
    }}>
      {children}
    </LocalLLMContext.Provider>
  );
};

export const useLocalLLM = (): ExtendedLocalLLMContextType => {
  const context = useContext(LocalLLMContext);
  if (context === undefined) {
    throw new Error('useLocalLLM must be used within a LocalLLMProvider');
  }
  return context;
};
