import express, { type Request, type Response } from 'express';
const { Router } = express;
import { z } from 'zod';
import type { IStorageStore } from '../storage/storage.ts';
import { LocalRAGPipeline } from '../sim/rag.ts';
import type { KnowledgeDocument } from '../types.ts';

const KnowledgeDocumentSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  category: z.string().min(2, 'Category must be at least 2 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  metadata: z.record(z.any()).optional(),
});

export function createKnowledgeRouter(storage: IStorageStore): Router {
  const router = Router({ mergeParams: true });
  const rag = new LocalRAGPipeline();

  // GET /api/worlds/:worldId/documents - List documents
  router.get('/', async (req: Request, res: Response) => {
    try {
      const worldId = req.params.worldId as string;
      const docs = await storage.getKnowledgeDocuments(worldId);
      res.json({ success: true, data: docs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/worlds/:worldId/documents - Create new document with automatic chunking
  router.post('/', async (req: Request, res: Response) => {
    try {
      const worldId = req.params.worldId as string;
      const validated = KnowledgeDocumentSchema.parse(req.body);

      const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const rawDoc: KnowledgeDocument = {
        id: docId,
        title: validated.title,
        category: validated.category,
        content: validated.content,
      };

      // Real chunking pipeline
      const chunks = rag.chunkDocument(rawDoc);

      const newDoc: KnowledgeDocument = {
        ...rawDoc,
        chunks: chunks.map(c => ({
          id: c.chunkId,
          text: c.text,
          section: c.section,
        })),
      };

      const saved = await storage.saveKnowledgeDocument({ ...newDoc, worldId } as any);
      res.status(201).json({ success: true, data: saved });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: err.errors });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/worlds/:worldId/documents/:id - Get document by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const doc = await storage.getKnowledgeDocument(req.params.id as string);
      if (!doc) {
        return res.status(404).json({ success: false, error: 'Knowledge document not found' });
      }
      res.json({ success: true, data: doc });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/worlds/:worldId/documents/:id - Update document and re-chunk
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const worldId = req.params.worldId as string;
      const docId = req.params.id as string;
      const existing = await storage.getKnowledgeDocument(docId);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Knowledge document not found' });
      }

      const validated = KnowledgeDocumentSchema.parse(req.body);
      const updatedRaw: KnowledgeDocument = {
        id: docId,
        title: validated.title,
        category: validated.category,
        content: validated.content,
      };

      const chunks = rag.chunkDocument(updatedRaw);
      const updatedDoc: KnowledgeDocument = {
        ...updatedRaw,
        chunks: chunks.map(c => ({
          id: c.chunkId,
          text: c.text,
          section: c.section,
        })),
      };

      const saved = await storage.saveKnowledgeDocument({ ...updatedDoc, worldId } as any);
      res.json({ success: true, data: saved });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: err.errors });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/worlds/:worldId/documents/:id - Delete document
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteKnowledgeDocument(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Knowledge document not found' });
      }
      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/worlds/:worldId/documents/search - Test retrieval against world knowledge base
  router.post('/search', async (req: Request, res: Response) => {
    try {
      const worldId = req.params.worldId as string;
      const query = (req.body.query || '').trim();
      const topK = typeof req.body.topK === 'number' ? req.body.topK : 3;

      if (!query) {
        return res.json({ success: true, data: [] });
      }

      const docs = await storage.getKnowledgeDocuments(worldId);
      rag.setDocuments(docs);
      const results = await rag.retrieve(query, { topK, worldId });

      res.json({
        success: true,
        data: results,
        retriever: rag.name,
        queriedDocumentsCount: docs.length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
