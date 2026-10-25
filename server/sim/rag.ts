import type { KnowledgeDocument } from '../types.ts';

export interface RetrievedPassage {
  id: string;
  documentTitle: string;
  section: string;
  text: string;
  score: number;
  citation: string;
}

export interface IKnowledgeRetriever {
  name: string;
  retrieve(query: string, options?: { topK?: number; worldId?: string }): Promise<RetrievedPassage[]>;
  chunkDocument(doc: KnowledgeDocument): Array<{ chunkId: string; text: string; section: string; tokenCount: number }>;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'for',
  'with', 'at', 'by', 'from', 'this', 'that', 'these', 'those', 'it', 'its', 'as', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should',
]);

/**
 * LocalLexicalRetriever:
 * Reliable, production-ready local passage retriever using lexical term frequency
 * and structured document chunking. Designed to be cleanly swapped with a vector retriever.
 */
export class LocalRAGPipeline implements IKnowledgeRetriever {
  public readonly name = 'Local Lexical TF-IDF Retriever (Passage-level)';
  private documents: KnowledgeDocument[];

  constructor(documents: KnowledgeDocument[] = []) {
    this.documents = documents;
  }

  public setDocuments(documents: KnowledgeDocument[]) {
    this.documents = documents;
  }

  /**
   * Splits a document into discrete passages based on paragraph structure and section headers.
   * Attaches unique passage chunk IDs and token lengths for citations.
   */
  public chunkDocument(doc: KnowledgeDocument): Array<{
    chunkId: string;
    text: string;
    section: string;
    tokenCount: number;
  }> {
    const rawParagraphs = doc.content
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 15);

    let currentSection = doc.title;
    const chunks: Array<{ chunkId: string; text: string; section: string; tokenCount: number }> = [];

    rawParagraphs.forEach((p, idx) => {
      // Detect markdown headers or policy tags
      if (p.startsWith('#') || p.startsWith('Policy') || p.startsWith('Rule') || p.startsWith('Section')) {
        const firstLine = p.split('\n')[0].replace(/^#+\s*/, '').trim();
        currentSection = firstLine;
      }

      const tokens = this.tokenize(p);
      chunks.push({
        chunkId: `${doc.id}-chk-${idx + 1}`,
        section: currentSection,
        text: p,
        tokenCount: tokens.length,
      });
    });

    return chunks;
  }

  /**
   * Retrieves top-k matching passages for a query using lexical relevance scoring.
   */
  public async retrieve(
    query: string,
    options: { topK?: number; worldId?: string } | number = {}
  ): Promise<RetrievedPassage[]> {
    const opts = typeof options === 'number' ? { topK: options } : options;
    const topK = opts.topK || 3;
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const allPassages: RetrievedPassage[] = [];

    for (const doc of this.documents) {
      if (opts.worldId && (doc as any).worldId && (doc as any).worldId !== opts.worldId) {
        continue;
      }

      const chunks =
        doc.chunks && doc.chunks.length > 0
          ? doc.chunks.map((c: any) => ({
              chunkId: c.chunkId || c.id,
              text: c.text,
              section: c.section,
              tokenCount: c.tokenCount || this.tokenize(c.text).length,
            }))
          : this.chunkDocument(doc);

      for (const chunk of chunks) {
        const chunkTokens = this.tokenize(chunk.text + ' ' + chunk.section);
        const score = this.calculateLexicalScore(queryTokens, chunkTokens);

        if (score > 0) {
          allPassages.push({
            id: chunk.chunkId,
            documentTitle: doc.title,
            section: chunk.section,
            text: chunk.text,
            score: Math.round(score * 100) / 100,
            citation: `[Source: ${doc.title} § "${chunk.section}"]`,
          });
        }
      }
    }

    allPassages.sort((a, b) => b.score - a.score);
    return allPassages.slice(0, topK);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  }

  private calculateLexicalScore(queryTokens: string[], docTokens: string[]): number {
    const docFreq: Record<string, number> = {};
    for (const t of docTokens) {
      docFreq[t] = (docFreq[t] || 0) + 1;
    }

    let matchCount = 0;
    let score = 0;

    for (const qt of queryTokens) {
      if (docFreq[qt]) {
        matchCount++;
        // Term frequency weighting
        score += 1 + Math.log(docFreq[qt]);
      }
    }

    if (matchCount === 0) return 0;
    // Ratio of matched terms relative to query length
    const coverage = matchCount / queryTokens.length;
    return score * coverage;
  }
}
