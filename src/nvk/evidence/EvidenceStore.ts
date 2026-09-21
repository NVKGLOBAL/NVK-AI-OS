export interface Evidence {
  source: string;
  title?: string;
  url?: string;
  retrievedAt: string;
  claim: string;
}

class EvidenceStore {
  private evidenceByTask: Map<string, Evidence[]> = new Map();

  addEvidence(taskId: string, evidence: Evidence) {
    if (!this.evidenceByTask.has(taskId)) {
      this.evidenceByTask.set(taskId, []);
    }
    this.evidenceByTask.get(taskId)!.push(evidence);
  }

  getEvidenceForTask(taskId: string): Evidence[] {
    return this.evidenceByTask.get(taskId) || [];
  }
}

export const evidenceStore = new EvidenceStore();
