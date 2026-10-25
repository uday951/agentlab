import { useState, useEffect } from 'react';
import { Search, FileText, Plus, Trash2, BookOpen } from 'lucide-react';
import { api, type World, type KnowledgeDocument } from '../../lib/api';

export const KnowledgeView = () => {
  const [world, setWorld] = useState<World | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [query, setQuery] = useState('How are opened electronics handled?');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [retrieverName, setRetrieverName] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New document form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Customer Support Policy');
  const [newContent, setNewContent] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);

  useEffect(() => {
    api.getWorlds().then((worlds) => {
      if (worlds.length > 0) {
        const w = worlds[0];
        setWorld(w);
        loadDocuments(w.id);
        executeSearch('How are opened electronics handled?', w.id);
      }
    });
  }, []);

  const loadDocuments = async (worldId: string) => {
    try {
      const docs = await api.getKnowledgeDocuments(worldId);
      setDocuments(docs);
    } catch (e) {
      console.error('Failed to load knowledge documents:', e);
    }
  };

  const executeSearch = async (q: string, targetWorldId?: string) => {
    const wId = targetWorldId || world?.id;
    if (!wId || !q.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await api.searchKnowledge(wId, q, 3);
      setSearchResults(res.data || []);
      setRetrieverName(res.retriever || 'Lexical TF-IDF Passage Retriever');
    } catch (err: any) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!world || !newTitle || !newContent) return;

    setSavingDoc(true);
    try {
      await api.createKnowledgeDocument(world.id, {
        title: newTitle,
        category: newCategory,
        content: newContent,
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewContent('');
      await loadDocuments(world.id);
      executeSearch(query, world.id);
    } catch (err: any) {
      alert(`Error creating document: ${err.message}`);
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!world) return;
    if (confirm('Delete this knowledge document and its indexed passages?')) {
      try {
        await api.deleteKnowledgeDocument(world.id, docId);
        await loadDocuments(world.id);
        executeSearch(query, world.id);
      } catch (err: any) {
        alert(`Error deleting document: ${err.message}`);
      }
    }
  };

  if (!world) {
    return (
      <div className="p-8 text-center font-mono text-xs text-burgundy/50">
        Loading RAG Knowledge Base...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">
            Knowledge Base & Passage Retrieval
          </h1>
          <p className="font-sans text-xs sm:text-sm text-burgundy/60">
            Real passage-level document chunking and TF-IDF lexical search pipeline with citations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="cursor-pointer flex items-center gap-2 bg-burgundy text-ivory px-4 py-2 text-xs font-sans font-bold hover:bg-burgundy-light rounded transition-colors self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Add Knowledge Document</span>
        </button>
      </div>

      {/* Interactive Search Tester */}
      <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-sans font-bold text-sm text-burgundy flex items-center gap-2">
            <Search size={15} className="text-copper" />
            <span>Live Query Retrieval Tester</span>
          </h3>
          {retrieverName && (
            <span className="font-mono text-[10px] text-zinc-500 bg-ivory px-2 py-0.5 rounded border border-copper/15">
              Retriever: {retrieverName}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeSearch(query)}
            placeholder="e.g. Can I return a gift card or opened electronics?"
            className="flex-1 border border-copper/25 p-2.5 rounded bg-ivory text-xs font-sans focus:outline-none focus:border-copper"
          />
          <button
            onClick={() => executeSearch(query)}
            disabled={searching}
            className="cursor-pointer bg-copper text-ivory px-4 py-2 text-xs font-mono font-bold hover:bg-copper-dark rounded disabled:opacity-50"
          >
            {searching ? 'Querying...' : 'Retrieve Passages'}
          </button>
        </div>

        {/* Live Ranked Results */}
        <div className="space-y-3 pt-2">
          <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
            Top Ranked Passages ({searchResults.length} matched)
          </div>

          {searchResults.length === 0 ? (
            <div className="p-4 bg-ivory/40 rounded border border-copper/15 text-xs text-burgundy/60 italic text-center">
              No matching passages found for query terms. Try keywords like "electronics", "refund", "receipt", or "30 days".
            </div>
          ) : (
            searchResults.map((res, idx) => (
              <div
                key={res.id || idx}
                className="p-3.5 bg-ivory/60 rounded border border-copper/20 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-burgundy text-xs">{res.documentTitle}</span>
                    <span className="font-mono text-[10px] text-zinc-500">§ {res.section}</span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-copper/20 text-copper font-bold">
                    Relevance: {res.score}
                  </span>
                </div>
                <p className="font-sans text-xs text-burgundy/80 leading-relaxed bg-white/70 p-2.5 rounded border border-copper/10">
                  {res.text}
                </p>
                <div className="text-[10px] font-mono text-zinc-500">{res.citation}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Indexed Documents List */}
      <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-sans font-bold text-sm text-burgundy flex items-center gap-2">
            <BookOpen size={15} className="text-copper" />
            <span>Indexed World Documents ({documents.length})</span>
          </h3>
          <span className="font-mono text-[10px] text-zinc-500">
            Passage Chunking: Paragraph & Header Aware
          </span>
        </div>

        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 border border-copper/15 rounded bg-ivory/30 space-y-2 hover:border-copper/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-sans font-bold text-sm text-burgundy">{doc.title}</h4>
                    <span className="font-mono text-[10px] bg-copper/10 text-copper px-2 py-0.5 rounded uppercase">
                      {doc.category}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500">
                    ID: {doc.id} · {doc.chunks?.length || 0} indexed passages
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Delete Document"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="text-xs font-sans text-burgundy/70 line-clamp-3 bg-white p-2.5 rounded border border-copper/10">
                {doc.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Add Knowledge Document */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-copper/30 rounded-lg max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-copper" />
              <h2 className="font-display text-xl font-bold text-burgundy">
                Add Knowledge Document
              </h2>
            </div>
            <p className="font-sans text-xs text-burgundy/60">
              The content will be automatically segmented into chunked passages with section tags and citation metadata.
            </p>

            <form onSubmit={handleCreateDocument} className="space-y-3 font-sans text-xs">
              <div>
                <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Policy #44: Holiday Season Return Extensions"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-copper/25 p-2 rounded bg-ivory focus:outline-none focus:border-copper"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                  Category
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Return Policy, Customer Verification"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full border border-copper/25 p-2 rounded bg-ivory focus:outline-none focus:border-copper"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-copper font-bold mb-1">
                  Document Content (Markdown / Text)
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Paste document text here. Paragraphs and headers (# Section) will be automatically segmented into retrieval chunks..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full border border-copper/25 p-2 rounded bg-ivory focus:outline-none focus:border-copper resize-none font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-copper/15">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded border border-copper/30 text-burgundy hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDoc}
                  className="px-5 py-2 rounded bg-burgundy text-ivory font-bold hover:bg-burgundy-light cursor-pointer disabled:opacity-50"
                >
                  {savingDoc ? 'Indexing...' : 'Save & Chunk Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
