import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Dedicated off-thread Web-LLM inference worker for NVK Sovereign Runtime
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
