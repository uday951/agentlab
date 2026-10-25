import express, { type Request, type Response } from 'express';
const { Router } = express;
import { z } from 'zod';
import type { IStorageStore } from '../storage/storage.ts';
import type { World, Scenario } from '../types.ts';

const WorldSchema = z.object({
  name: z.string().min(2),
  industry: z.string().default('General Operations'),
  description: z.string().default(''),
  systemRules: z.array(z.string()).default([]),
  knowledgeDocuments: z.array(z.any()).default([]),
  simulatedTools: z.array(z.any()).default([]),
  customerProfiles: z.array(z.any()).default([]),
  eventConditions: z.array(z.string()).default([]),
  successCriteria: z.array(z.string()).default([]),
});

const ScenarioSchema = z.object({
  title: z.string().min(2),
  description: z.string().default(''),
  category: z.enum(['normal', 'edge_case', 'adversarial', 'tool_failure', 'policy_conflict', 'escalation']).default('normal'),
  customerProfile: z.any(),
  inputTask: z.string().min(2),
  orderContext: z.any().optional(),
  injectedFailures: z.any().optional(),
  expectedOutcome: z.object({
    decision: z.enum(['process_refund', 'reject_refund', 'escalate_manager', 'request_info', 'provide_info']),
    policyRef: z.string().optional(),
    requiresEscalation: z.boolean().optional(),
  }),
  evaluationRules: z.any().default({}),
});

export function createWorldRouter(storage: IStorageStore): Router {
  const router = Router();

  // GET /api/worlds
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const worlds = await storage.getWorlds();
      res.json({ success: true, data: worlds });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/worlds/:id
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const world = await storage.getWorld(req.params.id);
      if (!world) {
        return res.status(404).json({ success: false, error: 'World not found' });
      }
      res.json({ success: true, data: world });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/worlds
  router.post('/', async (req: Request, res: Response) => {
    try {
      const validated = WorldSchema.parse(req.body);
      const newWorld: World = {
        id: `world-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...validated,
        initialData: req.body.initialData || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await storage.saveWorld(newWorld);
      res.status(201).json({ success: true, data: newWorld });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: err.errors });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/worlds/:id
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const existing = await storage.getWorld(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'World not found' });
      }

      const updatedWorld: World = {
        ...existing,
        ...req.body,
        id: existing.id,
        updatedAt: new Date().toISOString(),
      };

      await storage.saveWorld(updatedWorld);
      res.json({ success: true, data: updatedWorld });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/worlds/:id/scenarios
  router.get('/:id/scenarios', async (req: Request, res: Response) => {
    try {
      const scenarios = await storage.getScenariosForWorld(req.params.id);
      res.json({ success: true, data: scenarios });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/worlds/:id/scenarios
  router.post('/:id/scenarios', async (req: Request, res: Response) => {
    try {
      const validated = ScenarioSchema.parse(req.body);
      const newScenario: Scenario = {
        id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        worldId: req.params.id,
        ...validated,
      };

      await storage.saveScenario(newScenario);
      res.status(201).json({ success: true, data: newScenario });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: err.errors });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
