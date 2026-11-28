// services/DocumentStore.ts
// Persistent document storage for documents.create (matrix item 5,
// 2026-11-27). The old path kept created documents only in the
// in-memory ArtifactRegistry Map — a reload wiped them, and there was
// no download at all.
//
// Storage choice: IndexedDB via Dexie — the dependency is already in
// package.json and db.ts (CodexDriftDB) establishes the pattern of a
// Dexie database with an in-memory fallback when IndexedDB is
// unavailable. This store follows it: a dedicated `NVKDocumentsDatabase`
// with one `documents` table, and a module-level in-memory Map shared
// by all store instances as the fallback (Node test runs and browsers
// with IndexedDB blocked). In the browser the Dexie table is the real
// persistence — a document created in one session reads back after a
// reload. The fallback is process memory only and never pretends to be
// durable: it exists so the API keeps working where IndexedDB cannot.
//
// No template content lives here: a document stores exactly the title,
// content, and slides the caller supplied. Download is a pure payload
// builder (filename + MIME + markdown text); the Blob + anchor-click
// step lives in downloadDocument() and is DOM-guarded.

import Dexie, { type Table } from 'dexie';

export interface StoredSlide {
  title: string;
  subtitle: string;
  point: string;
  metrics?: Array<{ label: string; value: string }>;
}

export interface StoredDocument {
  id: string;
  title: string;
  type: 'document' | 'pitch_deck';
  content: string;
  slides?: StoredSlide[];
  createdAt: number;
  updatedAt: number;
}

export interface NewDocumentInput {
  title: string;
  type?: 'document' | 'pitch_deck';
  content?: string;
  slides?: unknown;
}

export interface DocumentDownload {
  filename: string;
  mimeType: string;
  content: string;
}

const DB_NAME = 'NVKDocumentsDatabase';

/** Module-level fallback, shared by every store instance in this process. */
const memoryDocuments = new Map<string, StoredDocument>();

function slugifyTitle(title: string): string {
  const slug = title.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return slug.length > 0 ? slug : 'document';
}

function sanitizeSlides(raw: unknown): StoredSlide[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const slides: StoredSlide[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const title = typeof e.title === 'string' ? e.title : '';
    const subtitle = typeof e.subtitle === 'string' ? e.subtitle : '';
    const point = typeof e.point === 'string' ? e.point : '';
    if (title.trim().length === 0 && point.trim().length === 0) continue;
    const metrics = Array.isArray(e.metrics)
      ? (e.metrics as unknown[])
          .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
          .map((m) => ({
            label: typeof m.label === 'string' ? m.label : '',
            value: typeof m.value === 'string' ? m.value : '',
          }))
          .filter((m) => m.label.length > 0 || m.value.length > 0)
      : undefined;
    slides.push({
      title,
      subtitle,
      point,
      ...(metrics && metrics.length > 0 ? { metrics } : {}),
    });
  }
  return slides.length > 0 ? slides : undefined;
}

/**
 * Render a document as Markdown — the download payload. A pitch deck
 * renders its real slides as sections; a memo renders its real content.
 * Nothing is added that the caller did not supply.
 */
export function documentToMarkdown(
  doc: Pick<StoredDocument, 'title' | 'type' | 'content' | 'slides'>
): string {
  const lines: string[] = [`# ${doc.title}`, ''];
  if (doc.type === 'pitch_deck' && doc.slides && doc.slides.length > 0) {
    doc.slides.forEach((slide, i) => {
      lines.push(`## Slide ${i + 1}: ${slide.title}`);
      if (slide.subtitle) lines.push(`### ${slide.subtitle}`);
      if (slide.point) lines.push('', slide.point);
      if (slide.metrics && slide.metrics.length > 0) {
        lines.push('', ...slide.metrics.map((m) => `- ${m.label}: ${m.value}`));
      }
      lines.push('', '---', '');
    });
    if (doc.content.trim().length > 0) lines.push(doc.content);
  } else {
    lines.push(doc.content);
  }
  return lines.join('\n').trimEnd() + '\n';
}

/** Pure download payload for a stored document (no DOM, no Blob). */
export function documentDownload(doc: StoredDocument): DocumentDownload {
  return {
    filename: `${slugifyTitle(doc.title)}.md`,
    mimeType: 'text/markdown',
    content: documentToMarkdown(doc),
  };
}

/**
 * Trigger a real browser download of a stored document via a Blob URL.
 * Throws an honest error outside a DOM (tests use documentDownload()
 * for the payload instead — no fake download is ever reported).
 */
export async function downloadDocument(doc: StoredDocument): Promise<void> {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('DOCUMENT_DOWNLOAD_UNAVAILABLE: no DOM download available in this environment.');
  }
  const payload = documentDownload(doc);
  const blob = new Blob([payload.content], { type: payload.mimeType });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = payload.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

class NVKDocumentsDB extends Dexie {
  documents!: Table<StoredDocument, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      documents: '&id, title, type, createdAt, updatedAt',
    });
  }
}

export class DocumentStore {
  private db: NVKDocumentsDB | null = null;
  private mode: 'dexie' | 'memory' = 'memory';
  private readyPromise: Promise<void> | null = null;

  /** Open IndexedDB once; on any failure, fall back to process memory. */
  ensureReady(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = (async () => {
      try {
        if (typeof indexedDB === 'undefined') throw new Error('indexedDB unavailable');
        const db = new NVKDocumentsDB();
        await db.open();
        this.db = db;
        this.mode = 'dexie';
      } catch {
        this.db = null;
        this.mode = 'memory';
      }
    })();
    return this.readyPromise;
  }

  /** 'dexie' in the browser (durable), 'memory' where IndexedDB cannot open. */
  async storageMode(): Promise<'dexie' | 'memory'> {
    await this.ensureReady();
    return this.mode;
  }

  async createDocument(input: NewDocumentInput): Promise<StoredDocument> {
    const title = (input.title || '').trim();
    if (title.length === 0) {
      throw new Error('DOCUMENT_TITLE_REQUIRED: a document needs a title — none was provided.');
    }
    const type = input.type === 'pitch_deck' ? 'pitch_deck' : 'document';
    const slides = sanitizeSlides(input.slides);
    const rawContent = typeof input.content === 'string' ? input.content : '';
    const content =
      rawContent.trim().length > 0
        ? rawContent
        : documentToMarkdown({ title, type, content: '', slides });
    const now = Date.now();
    const doc: StoredDocument = {
      id: `doc-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      type,
      content,
      ...(slides ? { slides } : {}),
      createdAt: now,
      updatedAt: now,
    };
    await this.ensureReady();
    if (this.mode === 'dexie' && this.db) {
      await this.db.documents.put(doc);
    } else {
      memoryDocuments.set(doc.id, doc);
    }
    return doc;
  }

  async getDocument(id: string): Promise<StoredDocument | undefined> {
    await this.ensureReady();
    if (this.mode === 'dexie' && this.db) {
      return this.db.documents.get(id);
    }
    return memoryDocuments.get(id);
  }

  async getDocumentByTitle(title: string): Promise<StoredDocument | undefined> {
    await this.ensureReady();
    if (this.mode === 'dexie' && this.db) {
      const found = await this.db.documents.where('title').equals(title).toArray();
      return found.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    }
    const found = Array.from(memoryDocuments.values())
      .filter((d) => d.title === title)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return found[0];
  }

  async listDocuments(): Promise<StoredDocument[]> {
    await this.ensureReady();
    const all =
      this.mode === 'dexie' && this.db
        ? await this.db.documents.toArray()
        : Array.from(memoryDocuments.values());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async updateDocument(
    id: string,
    patch: Partial<Pick<StoredDocument, 'title' | 'content' | 'slides' | 'type'>>
  ): Promise<StoredDocument> {
    const existing = await this.getDocument(id);
    if (!existing) {
      throw new Error(`DOCUMENT_NOT_FOUND: no stored document with id "${id}".`);
    }
    const next: StoredDocument = {
      ...existing,
      ...(patch.title !== undefined ? { title: patch.title.trim() || existing.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.slides !== undefined ? { slides: sanitizeSlides(patch.slides) } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      updatedAt: Date.now(),
    };
    if (this.mode === 'dexie' && this.db) {
      await this.db.documents.put(next);
    } else {
      memoryDocuments.set(next.id, next);
    }
    return next;
  }

  async deleteDocument(id: string): Promise<boolean> {
    await this.ensureReady();
    if (this.mode === 'dexie' && this.db) {
      const existing = await this.db.documents.get(id);
      if (!existing) return false;
      await this.db.documents.delete(id);
      return true;
    }
    return memoryDocuments.delete(id);
  }
}

/** Shared store instance used by the capability and the panel. */
export const documentStore = new DocumentStore();
