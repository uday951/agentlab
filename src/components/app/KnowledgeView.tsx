import { useState, useEffect } from 'react';
import { Search, FileText } from 'lucide-react';
import { api, type World } from '../../lib/api';

export const KnowledgeView = () => {
  const [world, setWorld] = useState<World | null>(null);
  const [query, setQuery] = useState('How are opened electronics handled?');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    api.getWorlds().then((worlds) => {
      if (worlds.length > 0) {
        setWorld(worlds[0]);
        runSearch('How are opened electronics handled?', worlds[0]);
      }
    });
  }, []);

  const runSearch = (q: string, targetWorld?: World) => {
    const w = targetWorld || world;
    if (!w || !q.trim()) {
      setSearchResults([]);
      return;
    }

    const queryTokens = q.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter((t) => t.length > 2);
    const results: any[] = [];

    for (const doc of w.knowledgeDocuments) {
      const paragraphs = doc.content.split(/\n\s*\n/).filter((p) => p.trim().length > 20);

      paragraphs.forEach((p, idx) => {
        const textTokens = p.toLowerCase().split(/\s+/);
        let matches = 0;
        for (const qt of queryTokens) {
          if (textTokens.some((tt) => tt.includes(qt))) {
            matches++;
          }
        }
        if (matches > 0) {
          results.push({
            id: `${doc.id}-p${idx + 1}`,
            documentTitle: doc.title,
            category: doc.category,
            passage: p.trim(),
            score: Math.round((matches / queryTokens.length) * 100) / 10,
          });
        }
      });
    }

    results.sort((a, b) => b.score - a.score);
    setSearchResults(results.slice(0, 3));
  };

  if (!world) {
    return <div className="p-8 text-center font-mono text-xs text-burgundy/50">Loading RAG Knowledge Base...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-4 sm:pt-6 pb-20 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-burgundy mb-1">
          Knowledge Base & Local RAG Explorer
        </h1>
        <p className="font-sans text-xs sm:text-sm text-burgundy/60">
          Inspect document passages and test real lexical retrieval ranking prior to agent scenario injection.
        </p>
      </div>

      {/* Interactive Search Tester */}
      <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
        <h3 className="font-sans font-bold text-sm text-burgundy flex items-center gap-2">
          <Search size={15} className="text-copper" />
          <span>Test Retrieval Pipeline</span>
        </h3>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              runSearch(e.target.value);
            }}
            placeholder="e.g. Can I return a gift card or opened electronics?"
            className="flex-1 border border-copper/25 p-2.5 rounded bg-ivory text-xs font-sans focus:outline-none focus:border-copper"
          />
          <button
            onClick={() => runSearch(query)}
            className="cursor-pointer bg-copper text-ivory px-4 py-2 text-xs font-mono font-bold hover:bg-copper-dark rounded"
          >
            Retrieve
          </button>
        </div>

        {/* Live Ranked Results */}
        <div className="space-y-3 pt-2">
          <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
            Top Ranked Passages ({searchResults.length} matched)
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-6 text-zinc-400 font-mono text-xs">
              No matching passages found for query terms.
            </div>
          ) : (
            searchResults.map((res, i) => (
              <div key={i} className="p-3.5 bg-ivory/50 border border-copper/20 rounded text-xs space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="font-bold text-burgundy">{res.documentTitle}</span>
                  <span className="text-copper font-bold bg-copper/15 px-2 py-0.5 rounded">
                    Score: {res.score}
                  </span>
                </div>
                <p className="text-burgundy/80 font-sans leading-relaxed">{res.passage}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ingested Documents List */}
      <div className="bg-white border border-copper/20 p-5 rounded-lg shadow-sm space-y-4">
        <h3 className="font-sans font-bold text-sm text-burgundy flex items-center gap-2">
          <FileText size={15} className="text-copper" />
          <span>Ingested World Documents ({world.knowledgeDocuments.length})</span>
        </h3>

        <div className="space-y-3">
          {world.knowledgeDocuments.map((doc) => (
            <div key={doc.id} className="p-4 border border-copper/15 rounded bg-ivory/30">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-sans font-bold text-xs text-burgundy">{doc.title}</span>
                <span className="font-mono text-[9px] px-2 py-0.5 bg-copper/15 text-copper rounded">
                  {doc.category}
                </span>
              </div>
              <pre className="font-mono text-[11px] text-burgundy/70 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded border border-copper/10">
                {doc.content}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
