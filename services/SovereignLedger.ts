import { NVKEvidence, NVKCapabilityResult } from '../types';

export interface SovereignLedgerEntry {
  id: string;
  index: number;
  timestamp: number;
  capabilityId: string;
  authorization: 'auto_approved' | 'hitl_confirmed' | 'hitl_rejected';
  riskLevel: string;
  status: 'success' | 'failure' | 'blocked';
  inputSummary: string;
  outputReference?: string;
  evidence: NVKEvidence[];
  previousHash: string;
  entryHash: string;
}

/**
 * Fast SHA-256 hash generator for verifiable audit entries.
 */
async function computeHash(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }
  // Deterministic FNV-1a / Murmur hybrid hash for environments without WebCrypto
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < data.length; i++) {
    const ch = data.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

class SovereignLedger {
  private entries: SovereignLedgerEntry[] = [];
  private readonly storageKey = 'nvk_sovereign_evidence_ledger_v1';
  private lastHash: string = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor() {
    this.hydrate();
  }

  private hydrate() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        this.entries = JSON.parse(raw);
        if (this.entries.length > 0) {
          this.lastHash = this.entries[this.entries.length - 1].entryHash;
        }
      }
    } catch (e) {
      console.warn('[SovereignLedger] Failed to load cached ledger:', e);
      this.entries = [];
    }
  }

  private persist() {
    if (typeof localStorage === 'undefined') return;
    try {
      // Keep last 250 immutable entries in local storage
      const slice = this.entries.slice(-250);
      localStorage.setItem(this.storageKey, JSON.stringify(slice));
    } catch (e) {
      console.warn('[SovereignLedger] Failed to persist ledger:', e);
    }
  }

  /**
   * Append a new verified execution to the sovereign ledger.
   */
  async append(entry: {
    capabilityId: string;
    authorization: 'auto_approved' | 'hitl_confirmed' | 'hitl_rejected';
    riskLevel?: string;
    result: NVKCapabilityResult;
    input: unknown;
  }): Promise<SovereignLedgerEntry> {
    const timestamp = Date.now();
    const index = this.entries.length;
    const prevHash = this.lastHash;
    const inputSummary = typeof entry.input === 'string' 
      ? entry.input.slice(0, 120) 
      : JSON.stringify(entry.input || {}).slice(0, 120);

    const evidenceList: NVKEvidence[] = (entry.result.evidence || []).map(ev => ({
      ...ev,
      id: ev.id || `ev-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: ev.timestamp || timestamp,
    }));

    const rawPayload = `${index}:${prevHash}:${entry.capabilityId}:${timestamp}:${entry.result.success}:${inputSummary}`;
    const entryHash = await computeHash(rawPayload);

    const ledgerEntry: SovereignLedgerEntry = {
      id: `led-${timestamp}-${index}`,
      index,
      timestamp,
      capabilityId: entry.capabilityId,
      authorization: entry.authorization,
      riskLevel: entry.riskLevel || 'safe',
      status: entry.result.success ? 'success' : 'failure',
      inputSummary,
      outputReference: typeof entry.result.output === 'string' ? entry.result.output.slice(0, 80) : undefined,
      evidence: evidenceList,
      previousHash: prevHash,
      entryHash
    };

    this.entries.push(ledgerEntry);
    this.lastHash = entryHash;
    this.persist();

    return ledgerEntry;
  }

  getEntries(): SovereignLedgerEntry[] {
    return [...this.entries];
  }

  getLatest(count = 20): SovereignLedgerEntry[] {
    return this.entries.slice(-count);
  }

  clear() {
    this.entries = [];
    this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}

export const sovereignLedger = new SovereignLedger();
