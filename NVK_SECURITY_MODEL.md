# NVK OS — Security & Permission Model (OMEGA 2.1)

## Security Principles

1. **Deny by Default**: Destructive or high-risk capabilities (`email.send`, `application.launch`, `filesystem.delete`) require explicit user authorization and confirmation.
2. **No Capability Theater**: Unsupported or unconnected actions are explicitly reported as unavailable (`UNAVAILABLE`) rather than simulated or redirected to web search.
3. **Local-First Privacy**: Data remains in local state and client-side memory storage (IndexedDB/localStorage) by default.
4. **No Cloud LLM Dependency**: NVK OS operates without requiring external proprietary API keys for core orchestration.
