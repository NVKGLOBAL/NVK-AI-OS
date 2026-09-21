export interface Artifact {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  taskId: string;
  status: string;
  location?: string;
  metadata?: Record<string, unknown>;
  content?: string;
}

export class ArtifactRegistry {
  private artifacts: Map<string, Artifact> = new Map();

  createArtifact(artifact: Artifact): void {
    this.artifacts.set(artifact.id, artifact);
  }

  getArtifact(id: string): Artifact | undefined {
    return this.artifacts.get(id);
  }

  getAllArtifacts(): Artifact[] {
    return Array.from(this.artifacts.values());
  }
}

export const artifactRegistry = new ArtifactRegistry();
