# NVK OS — Reference Architecture

| PROJECT | PURPOSE | USEFUL PATTERN | NVK EQUIVALENT | DEPENDENCY? | SECURITY CONCERNS | IMPLEMENTED? | TESTED? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Open Interpreter | Local computer interaction | Command routing, permission boundaries | ExecutionKernel, PermissionManager | NO | High (Code execution) | YES | PASS |
| WebLLM | Browser-local LLM | Model lifecycle, streaming | LocalInferenceProvider | NO | Memory limits, WebGPU availability | PENDING | N/A |
| Transformers.js | Local embeddings | WASM/WebGPU execution, pipeline | DocumentEngine (Embeddings) | NO | High memory usage | PENDING | N/A |
| Pyodide | Browser Python execution | Safe worker isolation, stdout | code.execute.python capability | NO | Sandbox escapes | PENDING | N/A |
| WebContainers | Browser Node.js | Filesystem abstraction, build tools | software.build, project environments | NO | Browser cross-origin isolation | PENDING | N/A |
| Playwright | Browser automation | Navigation, DOM extraction | browser.automation connector | NO | High (automation outside sandbox) | NO (Connector Required) | N/A |
| AutoGPT | Autonomous agents | Task decomposition, task state | JobManager, TaskPlanner | NO | Runaway loops | YES (Bounded) | PASS |
| LangGraph | Stateful workflows | Graph execution, human checkpoints | TaskGraph, JobManager | NO | Infinite loops | YES | PASS |
