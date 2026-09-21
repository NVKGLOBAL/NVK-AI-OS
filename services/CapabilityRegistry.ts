import { NVKCapability, NVKExecutionContext, NVKCapabilityResult, NVKEvidence, NVKRiskLevel } from '../types';
import { sovereignLedger } from './SovereignLedger';
import { eventBus } from './EventBus';

class CapabilityRegistry {
  private capabilities: Map<string, NVKCapability> = new Map();

  register(capability: NVKCapability) {
    this.capabilities.set(capability.id, capability);
  }

  get(id: string): NVKCapability | undefined {
    return this.capabilities.get(id);
  }

  getAll(): NVKCapability[] {
    return Array.from(this.capabilities.values());
  }

  async getAvailable(): Promise<NVKCapability[]> {
    const available = [];
    for (const cap of this.capabilities.values()) {
      if (await cap.available()) {
        available.push(cap);
      }
    }
    return available;
  }

  /**
   * Audited Execution Pipeline:
   * Capability Request -> Authorization/HITL Guard -> Execution -> Result -> Cryptographic Evidence -> Sovereign Ledger
   */
  async executeWithAudit(
    capabilityId: string, 
    input: unknown, 
    context: NVKExecutionContext = {}
  ): Promise<NVKCapabilityResult> {
    const cap = this.capabilities.get(capabilityId);
    if (!cap) {
      const errRes: NVKCapabilityResult = {
        success: false,
        capabilityId,
        error: `Capability "${capabilityId}" not found in sovereign registry.`
      };
      await sovereignLedger.append({
        capabilityId,
        authorization: 'auto_approved',
        riskLevel: 'safe',
        result: errRes,
        input
      });
      return errRes;
    }

    // Availability Check
    const isAvailable = await cap.available();
    if (!isAvailable) {
      const errRes: NVKCapabilityResult = {
        success: false,
        capabilityId,
        error: `Capability "${cap.name}" is currently unavailable or offline.`
      };
      await sovereignLedger.append({
        capabilityId,
        authorization: 'auto_approved',
        riskLevel: cap.riskLevel,
        result: errRes,
        input
      });
      return errRes;
    }

    // Human-in-the-Loop (HITL) Authorization Guard
    if (cap.requiresConfirmation && !context.confirmedByUser) {
      const blockedRes: NVKCapabilityResult = {
        success: false,
        capabilityId,
        error: `Action blocked: "${cap.name}" requires explicit Human-in-the-Loop (HITL) authorization.`
      };
      await sovereignLedger.append({
        capabilityId,
        authorization: 'hitl_rejected',
        riskLevel: cap.riskLevel,
        result: blockedRes,
        input
      });
      eventBus.publish({ 
        type: 'ACTION_FAILED', 
        actionId: `act-${Date.now()}`, 
        error: `User confirmation required for ${cap.name}` 
      });
      return blockedRes;
    }

    // Authorized execution
    const authState = cap.requiresConfirmation ? 'hitl_confirmed' : 'auto_approved';
    eventBus.publish({ 
      type: 'ACTION_STARTED', 
      actionId: `act-${Date.now()}`, 
      description: `Executing ${cap.name}` 
    });

    try {
      const result = await cap.execute(input, context);

      // Generate supplementary evidence if defined on the contract
      if (cap.emitEvidence) {
        const extraEv = cap.emitEvidence(result, context);
        const extraList = Array.isArray(extraEv) ? extraEv : [extraEv];
        result.evidence = [...(result.evidence || []), ...extraList];
      }

      // Record in sovereign immutable ledger
      await sovereignLedger.append({
        capabilityId,
        authorization: authState,
        riskLevel: cap.riskLevel,
        result,
        input
      });

      if (result.success) {
        eventBus.publish({ 
          type: 'ACTION_COMPLETED', 
          actionId: `act-${Date.now()}` 
        });
      } else {
        eventBus.publish({ 
          type: 'ACTION_FAILED', 
          actionId: `act-${Date.now()}`, 
          error: result.error || 'Execution failed' 
        });
      }

      return result;
    } catch (err: any) {
      const errRes: NVKCapabilityResult = {
        success: false,
        capabilityId,
        error: err.message || 'Unknown runtime capability failure.'
      };
      await sovereignLedger.append({
        capabilityId,
        authorization: authState,
        riskLevel: cap.riskLevel,
        result: errRes,
        input
      });
      eventBus.publish({ 
        type: 'ACTION_FAILED', 
        actionId: `act-${Date.now()}`, 
        error: errRes.error 
      });
      return errRes;
    }
  }
}

export const capabilityRegistry = new CapabilityRegistry();

// ============================================================
// Core Sovereign Capabilities
// ============================================================

// 1. Filesystem: Read File
capabilityRegistry.register({
  id: 'filesystem.read',
  name: 'Read Local File',
  description: 'Read the text contents of a file from the sovereign workspace.',
  category: 'filesystem',
  riskLevel: 'low',
  inputSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'Relative path of file to read', required: true }
    },
    required: ['filename']
  },
  outputSchema: {
    type: 'string',
    properties: {
      content: { type: 'string', description: 'Raw text content of the file' }
    }
  },
  available: async () => true,
  requiresConfirmation: false,
  execute: async (input: any, context: NVKExecutionContext): Promise<NVKCapabilityResult> => {
    try {
      const filename = typeof input === 'string' ? input : input.filename;
      const res = await fetch(`/api/fs/download/${filename}`);
      if (!res.ok) throw new Error(`Failed to read file: ${filename}`);
      const content = await res.text();
      return {
        success: true,
        capabilityId: 'filesystem.read',
        output: content,
        evidence: [{ 
          type: 'file_modified', 
          timestamp: Date.now(), 
          reference: filename,
          metadata: { sizeBytes: content.length } 
        }]
      };
    } catch (e: any) {
      return { success: false, capabilityId: 'filesystem.read', error: e.message };
    }
  },
  emitEvidence: (result, ctx) => ({
    type: 'file_modified',
    timestamp: Date.now(),
    reference: result.capabilityId
  })
});

// 2. Filesystem: Write File
capabilityRegistry.register({
  id: 'filesystem.write',
  name: 'Write Local File',
  description: 'Write content to a file in the sovereign workspace.',
  category: 'filesystem',
  riskLevel: 'moderate',
  inputSchema: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'Target file path', required: true },
      content: { type: 'string', description: 'Content to write', required: true }
    },
    required: ['filename', 'content']
  },
  outputSchema: {
    type: 'object',
    properties: {
      written: { type: 'boolean', description: 'Whether the write succeeded' }
    }
  },
  available: async () => true,
  requiresConfirmation: true,
  execute: async (input: any, context: NVKExecutionContext): Promise<NVKCapabilityResult> => {
    try {
      const res = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!res.ok) throw new Error('Failed to write file');
      return {
        success: true,
        capabilityId: 'filesystem.write',
        output: { filename: input.filename, size: (input.content || '').length },
        evidence: [{ 
          type: 'file_created', 
          timestamp: Date.now(), 
          reference: input.filename,
          metadata: { sizeBytes: (input.content || '').length }
        }]
      };
    } catch (e: any) {
      return { success: false, capabilityId: 'filesystem.write', error: e.message };
    }
  }
});

// 3. Terminal: Execute Safe Shell Command
capabilityRegistry.register({
  id: 'terminal.execute',
  name: 'Execute Shell Command',
  description: 'Run an audited command in the containerized host environment.',
  category: 'terminal',
  riskLevel: 'high',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command string to execute', required: true }
    },
    required: ['command']
  },
  outputSchema: {
    type: 'object',
    properties: {
      output: { type: 'string', description: 'Standard output/error stream' }
    }
  },
  available: async () => true,
  requiresConfirmation: true,
  execute: async (input: any, context: NVKExecutionContext): Promise<NVKCapabilityResult> => {
    try {
      const cmd = typeof input === 'string' ? input : input.command;
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      return {
        success: !data.isError,
        capabilityId: 'terminal.execute',
        output: data.output,
        evidence: [{ 
          type: 'command_executed', 
          timestamp: Date.now(), 
          reference: cmd, 
          metadata: { exitCode: data.isError ? 1 : 0 } 
        }]
      };
    } catch (e: any) {
      return { success: false, capabilityId: 'terminal.execute', error: e.message };
    }
  }
});

// 4. Web: Connected Web Access
capabilityRegistry.register({
  id: 'web.fetch',
  name: 'Connected Web Access',
  description: 'Fetch real-time web content and research data via sovereign proxy.',
  category: 'web',
  riskLevel: 'low',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Target URL to fetch', required: true }
    },
    required: ['url']
  },
  outputSchema: {
    type: 'string',
    properties: {
      content: { type: 'string', description: 'Fetched document body' }
    }
  },
  available: async () => true,
  requiresConfirmation: false,
  execute: async (input: any, context: NVKExecutionContext): Promise<NVKCapabilityResult> => {
    try {
      const url = typeof input === 'string' ? input : input.url;
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`Proxy error fetching ${url}`);
      const content = await res.text();
      return {
        success: true,
        capabilityId: 'web.fetch',
        output: content,
        evidence: [{ 
          type: 'web_response', 
          timestamp: Date.now(), 
          reference: url,
          metadata: { responseLength: content.length }
        }]
      };
    } catch (e: any) {
      return { success: false, capabilityId: 'web.fetch', error: e.message };
    }
  }
});

// 5. System: Sovereign Diagnostics
capabilityRegistry.register({
  id: 'system.diagnostics',
  name: 'System Diagnostics',
  description: 'Audit hardware acceleration, WebGPU availability, and runtime telemetry.',
  category: 'workflow',
  riskLevel: 'safe',
  inputSchema: {
    type: 'object',
    properties: {}
  },
  outputSchema: {
    type: 'object',
    properties: {
      webgpuAvailable: { type: 'boolean' },
      hardwareConcurrency: { type: 'number' },
      memoryHeapLimit: { type: 'number' }
    }
  },
  available: async () => true,
  requiresConfirmation: false,
  execute: async (): Promise<NVKCapabilityResult> => {
    const hasWebGPU = typeof navigator !== 'undefined' && !!(navigator as any).gpu;
    const concurrency = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const memory = typeof performance !== 'undefined' && (performance as any).memory
      ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        }
      : null;

    const data = {
      webgpuAvailable: hasWebGPU,
      hardwareConcurrency: concurrency,
      memory,
      runtime: 'NVK-OS-R8 Sovereign Edition'
    };

    return {
      success: true,
      capabilityId: 'system.diagnostics',
      output: data,
      evidence: [{
        type: 'artifact_created',
        timestamp: Date.now(),
        reference: 'system-telemetry-snapshot',
        metadata: data
      }]
    };
  }
});
