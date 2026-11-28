/**
 * EvidenceStore — THIN ADAPTER over the SovereignLedger (matrix program,
 * 2026-11-27 — item 8).
 *
 * The old store was a second, unhashed in-memory Map alongside the real
 * SHA-256 hash chain + persistence in services/SovereignLedger.ts. That
 * Map is RETIRED: every write below appends a hashed, persisted ledger
 * entry, and every read filters the ledger. There is one evidence store
 * now — the ledger.
 *
 * The public API (addEvidence / getEvidenceForTask + the Evidence type)
 * is kept so existing callers (ExecutionEngine, TaskGraph) do not change
 * shape — only the backing changes. addEvidence is async: it resolves
 * with the ledger entry (hash included) once the entry is written.
 * getEvidenceForTask returns the evidence items the ledger holds for
 * that task, each carrying its ledgerHash + ledgerEntryId in metadata so
 * the UI can match an item against the chain. Callers that need the
 * chain itself use sovereignLedger directly (getEntries / verifyChain).
 */
import { sovereignLedger, type SovereignLedgerEntry } from '../../../services/SovereignLedger';
import type { NVKEvidence } from '../../../types';

export interface Evidence {
  source: string;
  title?: string;
  url?: string;
  retrievedAt: string;
  claim: string;
}

class EvidenceStore {
  /**
   * Write evidence for a task THROUGH the ledger: one hashed, persisted
   * entry per call, capability 'evidence.record', auto_approved (this is
   * a record of work already done, not a new action). The taskId is
   * stamped into the evidence metadata so getEvidenceForTask can find
   * it again — the ledger itself is append-only and never rewritten.
   */
  async addEvidence(taskId: string, evidence: Evidence): Promise<SovereignLedgerEntry> {
    const item: NVKEvidence = {
      type: 'artifact_created',
      timestamp: Date.parse(evidence.retrievedAt) || Date.now(),
      reference: evidence.source,
      metadata: {
        taskId,
        title: evidence.title,
        url: evidence.url,
        claim: evidence.claim,
      },
    };
    const entry = await sovereignLedger.append({
      capabilityId: 'evidence.record',
      authorization: 'auto_approved',
      riskLevel: 'safe',
      result: {
        success: true,
        capabilityId: 'evidence.record',
        output: evidence.claim,
        evidence: [item],
      },
      input: { taskId, source: evidence.source, claim: evidence.claim },
    });
    return entry;
  }

  /**
   * Read evidence for a task back OUT of the ledger: every ledger entry
   * whose evidence metadata carries this taskId. Returns the items with
   * their ledger hash attached — re-verifiable through
   * sovereignLedger.verifyChain(). Empty array when nothing was recorded.
   */
  getEvidenceForTask(taskId: string): NVKEvidence[] {
    const found: NVKEvidence[] = [];
    for (const entry of sovereignLedger.getEntries()) {
      for (const ev of entry.evidence || []) {
        if ((ev.metadata as Record<string, unknown> | undefined)?.taskId === taskId) {
          found.push({
            ...ev,
            metadata: {
              ...(ev.metadata || {}),
              ledgerHash: entry.entryHash,
              ledgerEntryId: entry.id,
            },
          });
        }
      }
    }
    return found;
  }
}

export const evidenceStore = new EvidenceStore();
