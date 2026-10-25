import type { KnowledgeDocument } from '../types.ts';

export interface RetrievedPassage {
  id: string;
  documentTitle: string;
  section: string;
  text: string;
  score: number;
}

export class LocalRAGPipeline {
  private documents: KnowledgeDocument[];

  constructor(documents: KnowledgeDocument[] = []) {
    this.documents = documents;
  }

  public setDocuments(documents: KnowledgeDocument[]) {
    this.documents = documents;
  }

  /**
   * Splits a document's content into clean passages based on paragraphs and headers.
   */
  public chunkDocument(doc: KnowledgeDocument): { id: string; text: string; section: string }[] {
    const rawParagraphs = doc.content
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 20);

    let currentSection = doc.title;
    const chunks: { id: string; text: string; section: string }[] = [];

    rawParagraphs.forEach((p, idx) => {
      // If line starts with # or Policy, consider it a section header
      if (p.startsWith('#') || p.startsWith('Policy') || p.startsWith('Rule')) {
        const firstLine = p.split('\n')[0].replace(/^#+\s*/, '').trim();
        currentSection = firstLine;
      }
      chunks.push({
        id: `${doc.id}-chunk-${idx + 1}`,
        section: currentSection,
        text: p,
      });
    });

    return chunks;
  }

  /**
   * Retrieves top-k matching passages for a query using lexical token scoring.
   */
  public retrieve(query: string, topK = 3): RetrievedPassage[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const allPassages: RetrievedPassage[] = [];

    for (const doc of this.documents) {
      const chunks = doc.chunks && doc.chunks.length > 0 ? doc.chunks : this.chunkDocument(doc);

      for (const chunk of chunks) {
        const chunkTokens = this.tokenize(chunk.text + ' ' + chunk.section);
        const score = this.calculateScore(queryTokens, chunkTokens);

        if (score > 0) {
          allPassages.push({
            id: chunk.id,
            documentTitle: doc.title,
            section: chunk.section,
            text: chunk.text,
            score: Math.round(score * 100) / 100,
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
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }

  private calculateScore(queryTokens: string[], docTokens: string[]): number {
    const docFreq: Record<string, number> = {};
    for (const t of docTokens) {
      docFreq[t] = (docFreq[t] || 0) + 1;
    }

    let matchCount = 0;
    let score = 0;

    for (const qt of queryTokens) {
      if (docFreq[qt]) {
        matchCount++;
        // Term frequency boost
        score += 1.0 + Math.log(1 + docFreq[qt]);
      }
    }

    // Proportional recall penalty
    const recall = matchCount / queryTokens.length;
    return score * (0.5 + 0.5 * recall);
  }
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'were', 'which',
  'what', 'when', 'where', 'then', 'than', 'into', 'some', 'them', 'their', 'about',
  'just', 'like', 'will', 'would', 'could', 'should', 'been', 'there', 'they', 'your'
]);
