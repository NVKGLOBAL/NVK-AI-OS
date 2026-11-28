import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Presentation, Download, Copy, Check, Sparkles, Plus,
  ChevronLeft, ChevronRight, Edit3, Eye, Layers, ShieldCheck, Share2
} from 'lucide-react';
import { documentStore, downloadDocument, type StoredDocument } from '../../services/DocumentStore';

interface Slide {
  title: string;
  subtitle: string;
  point: string;
  metrics?: { label: string; value: string }[];
}

interface DocumentWorkspaceProps {
  initialTitle?: string;
  initialType?: 'pitch_deck' | 'document' | 'memo';
  initialData?: any;
}

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({
  initialTitle = 'NVK Global — Living Intelligence OS',
  initialType = 'pitch_deck',
  initialData
}) => {
  const [docType, setDocType] = useState<'pitch_deck' | 'document'>(initialType === 'pitch_deck' ? 'pitch_deck' : 'document');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  // Persistence (matrix item 5, 2026-11-27): the document this panel
  // shows is stored in IndexedDB via DocumentStore, so it survives a
  // reload; the Download button exports the real content as Markdown.
  // docId is null until the document has been saved once.
  const [docId, setDocId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadNote, setLoadNote] = useState<string | null>(null);

  // A new document starts BLANK — from real input, never from the old
  // fixed template (five invented slides with fabricated metrics and a
  // canned "paradigm shift" memo). initialData still wins when the
  // caller supplies real content.
  const [slides, setSlides] = useState<Slide[]>(() => {
    if (initialData?.slides && Array.isArray(initialData.slides)) {
      return initialData.slides;
    }
    return [{ title: '', subtitle: '', point: '' }];
  });

  const [docContent, setDocContent] = useState<string>(() =>
    typeof initialData?.content === 'string' ? initialData.content : ''
  );

  // On mount, reload a previously saved document with this title, if
  // one exists — the document persists across reloads.
  useEffect(() => {
    let cancelled = false;
    documentStore.getDocumentByTitle(initialTitle).then((stored) => {
      if (cancelled || !stored) return;
      setDocId(stored.id);
      setLoadNote(`Loaded saved document from ${new Date(stored.updatedAt).toLocaleString()}.`);
      if (stored.type === 'pitch_deck' && stored.slides && stored.slides.length > 0) {
        setSlides(stored.slides);
        setDocType('pitch_deck');
      } else {
        setDocContent(stored.content);
        setDocType('document');
      }
      setCurrentSlideIndex(0);
    }).catch(() => {
      if (!cancelled) setLoadNote(null);
    });
    return () => { cancelled = true; };
  }, [initialTitle]);

  const buildStoredDoc = (): Omit<StoredDocument, 'id' | 'createdAt' | 'updatedAt'> => ({
    title: initialTitle,
    type: docType,
    content: docType === 'document' ? docContent : '',
    slides: docType === 'pitch_deck' ? slides : undefined,
  });

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const data = buildStoredDoc();
      if (docId) {
        await documentStore.updateDocument(docId, data);
      } else {
        const created = await documentStore.createDocument(data);
        setDocId(created.id);
      }
      setSaveState('saved');
      setLoadNote(null);
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch {
      setSaveState('error');
    }
  };

  const handleDownload = async () => {
    try {
      const doc: StoredDocument = docId
        ? (await documentStore.getDocument(docId)) ?? {
            id: docId, ...buildStoredDoc(), createdAt: Date.now(), updatedAt: Date.now(),
          }
        : {
            id: `doc-unsaved-${Date.now()}`,
            ...buildStoredDoc(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
      await downloadDocument(doc);
    } catch {
      setSaveState('error');
    }
  };

  const currentSlide = slides[currentSlideIndex] || slides[0];

  const handleCopyMarkdown = () => {
    const textToCopy = docType === 'pitch_deck' 
      ? slides.map((s, i) => `## Slide ${i+1}: ${s.title}\n### ${s.subtitle}\n${s.point}\n`).join('\n---\n\n')
      : docContent;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddSlide = () => {
    // A new slide starts blank — real input only, no canned subtitle
    // or fabricated "98% confidence" metric.
    const newSlide: Slide = { title: '', subtitle: '', point: '' };
    setSlides(prev => [...prev, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/95 text-slate-100 font-mono border border-cyan-500/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.15)]">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-cyan-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
            {docType === 'pitch_deck' ? <Presentation className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              <span>{initialTitle}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                LIVING ARTIFACT
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Connected to NVK Neural Core</div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950/80 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setDocType('pitch_deck')}
              className={`px-2.5 py-1 text-[10px] uppercase rounded transition-all flex items-center gap-1.5 ${
                docType === 'pitch_deck' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Presentation className="w-3 h-3" /> Deck ({slides.length})
            </button>
            <button
              onClick={() => setDocType('document')}
              className={`px-2.5 py-1 text-[10px] uppercase rounded transition-all flex items-center gap-1.5 ${
                docType === 'document' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3 h-3" /> Memo
            </button>
          </div>

          <button
            onClick={() => setViewMode(v => v === 'preview' ? 'edit' : 'preview')}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 text-xs transition-all"
            title={viewMode === 'preview' ? 'Switch to Edit' : 'Switch to Preview'}
          >
            {viewMode === 'preview' ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleCopyMarkdown}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 text-[10px] uppercase flex items-center gap-1 transition-all"
            title="Copy Artifact to Clipboard"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 text-[10px] uppercase flex items-center gap-1 transition-all disabled:opacity-50"
            title="Save this document locally — it persists across reloads"
          >
            {saveState === 'saved' ? <Check className="w-3 h-3 text-emerald-400" /> : <ShieldCheck className="w-3 h-3" />}
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : 'Save'}
          </button>

          <button
            onClick={handleDownload}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 text-[10px] uppercase flex items-center gap-1 transition-all"
            title="Download this document as a Markdown file"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
        </div>
      </div>
      {loadNote && (
        <div className="px-4 py-1 bg-emerald-950/40 border-b border-emerald-500/20 text-[10px] text-emerald-300 font-mono">
          {loadNote}
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {docType === 'pitch_deck' ? (
          <div className="flex flex-col h-full justify-between gap-4">
            {/* Active Slide Card */}
            <motion.div 
              key={currentSlideIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-[220px] bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-cyan-500/30 rounded-xl p-6 relative overflow-hidden flex flex-col justify-between"
            >
              {/* Background watermark */}
              <div className="absolute -right-6 -bottom-6 text-[90px] font-black text-cyan-500/5 select-none pointer-events-none">
                0{currentSlideIndex + 1}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                    SLIDE 0{currentSlideIndex + 1} / 0{slides.length}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> NVK Verified Structure
                  </div>
                </div>

                {viewMode === 'preview' ? (
                  <>
                    <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-1">
                      {currentSlide.title || 'Untitled slide — switch to Edit and write the real slide.'}
                    </h2>
                    <h4 className="text-xs text-cyan-300 font-mono mb-4">{currentSlide.subtitle}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xl font-sans">{currentSlide.point}</p>
                  </>
                ) : (
                  <div className="space-y-2 mt-2">
                    <input 
                      type="text" 
                      value={currentSlide.title} 
                      placeholder="Slide title — write your own"
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlides(prev => prev.map((s, i) => i === currentSlideIndex ? { ...s, title: val } : s));
                      }}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded px-2.5 py-1 text-sm text-cyan-300"
                    />
                    <input 
                      type="text" 
                      value={currentSlide.subtitle} 
                      placeholder="Subtitle"
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlides(prev => prev.map((s, i) => i === currentSlideIndex ? { ...s, subtitle: val } : s));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-300"
                    />
                    <textarea 
                      rows={3}
                      value={currentSlide.point} 
                      placeholder="Your point — write the real content here"
                      onChange={(e) => {
                        const val = e.target.value;
                        setSlides(prev => prev.map((s, i) => i === currentSlideIndex ? { ...s, point: val } : s));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-300 resize-none font-sans"
                    />
                  </div>
                )}
              </div>

              {/* Metrics Grid */}
              {currentSlide.metrics && currentSlide.metrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800">
                  {currentSlide.metrics.map((m, idx) => (
                    <div key={idx} className="bg-slate-950/60 border border-cyan-500/20 rounded-lg p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-slate-400">{m.label}</div>
                      <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">{m.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Slide Navigation Strip */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentSlideIndex(i => Math.max(0, i - 1))}
                  disabled={currentSlideIndex === 0}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 disabled:opacity-40 disabled:pointer-events-none text-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1 overflow-x-auto max-w-[240px] py-1 px-1">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`w-5 h-5 rounded text-[9px] font-mono flex items-center justify-center transition-all ${
                        idx === currentSlideIndex
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(0,229,255,0.6)]'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentSlideIndex(i => Math.min(slides.length - 1, i + 1))}
                  disabled={currentSlideIndex === slides.length - 1}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 disabled:opacity-40 disabled:pointer-events-none text-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddSlide}
                className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 text-[10px] uppercase flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" /> Add Slide
              </button>
            </div>
          </div>
        ) : (
          /* Executive Memo / Document Mode */
          <div className="flex flex-col h-full">
            {viewMode === 'preview' ? (
              <div className="p-4 bg-slate-900/60 border border-cyan-500/20 rounded-xl space-y-4 text-xs font-sans text-slate-300 leading-relaxed">
                <div className="text-cyan-400 font-mono font-bold text-sm uppercase tracking-wider border-b border-slate-800 pb-2">
                  {initialTitle}
                </div>
                <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-200">
                  {docContent.trim().length > 0
                    ? docContent
                    : 'No content yet — switch to Edit and write the real document, then Save it.'}
                </div>
              </div>
            ) : (
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                rows={12}
                placeholder="Write the real document here — then Save it. It persists across reloads and can be downloaded as Markdown."
                className="w-full h-full bg-slate-950 border border-cyan-500/30 rounded-xl p-4 text-xs font-mono text-cyan-200 resize-none focus:outline-none focus:border-cyan-400"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
