
import Dexie, { type Table } from 'dexie';
import type { IDriftInterpretationDB, IGlyphHistory, IRitualFrame, DriftCommentary, Episode, Pattern, Skill } from './types'; // Added new types

// Define the database
export class CodexDriftDB extends Dexie {
  interpretations!: Table<IDriftInterpretationDB, number>;
  glyphs!: Table<IGlyphHistory, string>;
  rituals!: Table<IRitualFrame, string>;
  driftCommentaries!: Table<DriftCommentary, number>;
  
  // Continual Learning Tables
  episodes!: Table<Episode, string>;
  patterns!: Table<Pattern, string>;
  skills!: Table<Skill, string>;

  // Enterprise V3 Tables
  agentThreads!: Table<any, number>;
  threadMessages!: Table<any, number>;
  workspaceSnapshots!: Table<any, number>;
  auditLog!: Table<any, number>;
  shardComments!: Table<any, number>;

  // Memory fallbacks in case IndexedDB is disabled in sub-iframes or blocked
  private memory_interpretations: IDriftInterpretationDB[] = [];
  private memory_glyphs: Map<string, IGlyphHistory> = new Map();
  private memory_driftCommentaries: DriftCommentary[] = [];
  private useMemoryFallback = false;

  constructor() {
    super('CodexDriftDatabase');
    (this as Dexie).version(1).stores({
      interpretations: '++id, glyphId, glyphSymbol, timestamp, entropy, driftScore, ritualContext, version', 
      glyphs: '&id, symbol, lastInterpreted, driftVolatility',
      rituals: '&id, timestamp, entropyLevel',
    });
    
    (this as Dexie).version(2).stores({
      interpretations: '++id, glyphId, glyphSymbol, timestamp, entropy, driftScore, ritualContext, version', 
      glyphs: '&id, symbol, lastInterpreted, driftVolatility',
      rituals: '&id, timestamp, entropyLevel',
      driftCommentaries: '++id, linkedDriftId, agent, timestamp',
    });

    // Version 4: NVK Enterprise App Updates
    (this as Dexie).version(4).stores({
      interpretations: '++id, glyphId, glyphSymbol, timestamp, entropy, driftScore, ritualContext, version', 
      glyphs: '&id, symbol, lastInterpreted, driftVolatility',
      rituals: '&id, timestamp, entropyLevel',
      driftCommentaries: '++id, linkedDriftId, agent, timestamp',
      episodes: '&id, timestamp, *patterns',
      patterns: '&id, type, successRate, *applicability',
      skills: '&id, name, proficiency, lastUsed',
      agentThreads: '++id, agentId, userId, &sessionId, lastActiveAt, *contextTags',
      threadMessages: '++id, threadId, role, content, timestamp, decisionOutputId',
      workspaceSnapshots: '++id, userId, name, createdAt, isPinned',
      auditLog: '++id, userId, action, resourceId, timestamp',
      shardComments: '++id, shardId, userId, content, resolved, createdAt'
    }).upgrade(tx => {
      console.log("Upgrading database to version 4: Added Enterprise stores (agentThreads, snapshots, audit, comments).");
    });

    (this as Dexie).open().then(() => {
        console.log("Dexie database opened successfully.");
    }).catch(err => {
        console.warn(`Failed to open Dexie database: ${err}. Switching gracefully to memory-only fallback database.`);
        this.useMemoryFallback = true;
    });
  }
  
  private logDriftMemory(interpretation: IDriftInterpretationDB): number {
    const id = this.memory_interpretations.length + 1;
    const entry = { ...interpretation, id };
    this.memory_interpretations.push(entry);

    let glyph = this.memory_glyphs.get(interpretation.glyphId);
    if (!glyph) {
      glyph = {
        id: interpretation.glyphId,
        symbol: interpretation.glyphSymbol,
        entropyHistory: [interpretation.entropy],
        lastInterpreted: new Date(),
        driftVolatility: 0
      };
      this.memory_glyphs.set(interpretation.glyphId, glyph);
    } else {
      const newHistory = [...glyph.entropyHistory, interpretation.entropy].slice(-50);
      const driftScores = this.memory_interpretations
        .filter(i => i.glyphId === interpretation.glyphId)
        .slice(-50)
        .map(i => i.driftScore);
      
      this.memory_glyphs.set(glyph.id, {
        ...glyph,
        entropyHistory: newHistory,
        lastInterpreted: new Date(),
        driftVolatility: this.calculateStdDev(driftScores)
      });
    }
    return id;
  }

  async logDrift(interpretation: IDriftInterpretationDB): Promise<number | undefined> {
    if (!interpretation.glyphId || !interpretation.glyphSymbol) {
        console.error("logDrift: glyphId and glyphSymbol are required.", interpretation);
        return undefined;
    }

    if (this.useMemoryFallback) {
      return this.logDriftMemory(interpretation);
    }

    try {
      return await (this as Dexie).transaction('rw', this.interpretations, this.glyphs, async () => {
        const interpretationId = await this.interpretations.add(interpretation);
        
        let glyph = await this.glyphs.get(interpretation.glyphId);
        if (!glyph) {
          glyph = {
            id: interpretation.glyphId,
            symbol: interpretation.glyphSymbol,
            entropyHistory: [interpretation.entropy],
            lastInterpreted: new Date(),
            driftVolatility: 0
          };
          await this.glyphs.add(glyph);
        } else {
          const newHistory = [...glyph.entropyHistory, interpretation.entropy].slice(-50);
          const driftScores = await this.interpretations
            .where('glyphId').equals(interpretation.glyphId)
            .limit(50)
            .toArray()
            .then(items => items.map(i => i.driftScore));
            
          await this.glyphs.update(glyph.id, {
            entropyHistory: newHistory,
            lastInterpreted: new Date(),
            driftVolatility: this.calculateStdDev(driftScores)
          });
        }
        return interpretationId;
      });
    } catch (error) {
        console.warn("Failed to complete logDrift transaction in DB, falling back to clean local state in memory:", error);
        this.useMemoryFallback = true;
        return this.logDriftMemory(interpretation);
    }
  }
  
  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(
      values.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / values.length
    );
  }

  async getGlyphHistory(glyphNodeId: string): Promise<IDriftInterpretationDB[]> {
    if (this.useMemoryFallback) {
      return this.memory_interpretations
        .filter(i => i.glyphId === glyphNodeId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    try {
      return await this.interpretations
        .where('glyphId')
        .equals(glyphNodeId)
        .sortBy('timestamp');
    } catch (e) {
      console.warn("Failed to getGlyphHistory from DB, using fallback:", e);
      this.useMemoryFallback = true;
      return this.memory_interpretations
        .filter(i => i.glyphId === glyphNodeId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
  }

  async addDriftCommentary(commentary: Omit<DriftCommentary, 'id'>): Promise<number> {
    if (this.useMemoryFallback) {
      const id = this.memory_driftCommentaries.length + 1;
      this.memory_driftCommentaries.push({ ...commentary, id } as DriftCommentary);
      return id;
    }

    try {
      return await this.driftCommentaries.add(commentary as DriftCommentary);
    } catch (e) {
      console.warn("Failed to addDriftCommentary to DB, using fallback:", e);
      this.useMemoryFallback = true;
      const id = this.memory_driftCommentaries.length + 1;
      this.memory_driftCommentaries.push({ ...commentary, id } as DriftCommentary);
      return id;
    }
  }

  async getCommentariesForDrift(driftId: number): Promise<DriftCommentary[]> {
    if (this.useMemoryFallback) {
      return this.memory_driftCommentaries
        .filter(c => c.linkedDriftId === driftId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    try {
      return await this.driftCommentaries.where('linkedDriftId').equals(driftId).sortBy('timestamp');
    } catch (e) {
      console.warn("Failed to getCommentariesForDrift from DB, using fallback:", e);
      this.useMemoryFallback = true;
      return this.memory_driftCommentaries
        .filter(c => c.linkedDriftId === driftId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
  }
}

export const driftDB = new CodexDriftDB();
