import express, { type Request, type Response, type NextFunction } from 'express';
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
  category: z
    .enum(['normal', 'edge_case', 'adversarial', 'tool_failure', 'policy_conflict', 'escalation'])
    .default('normal'),
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
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const worlds = await storage.getWorlds();
      res.json({ success: true, data: worlds });
    } catch (err: any) {
      next(err);
    }
  });

  // GET /api/worlds/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const world = await storage.getWorld(req.params.id as string);
      if (!world) {
        return res.status(404).json({ success: false, error: 'World not found' });
      }
      res.json({ success: true, data: world });
    } catch (err: any) {
      next(err);
    }
  });

  // POST /api/worlds
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
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
      next(err);
    }
  });

  // PUT /api/worlds/:id
  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await storage.getWorld(req.params.id as string);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'World not found' });
      }

      const validated = WorldSchema.parse(req.body);
      const updated: World = {
        ...existing,
        ...validated,
        updatedAt: new Date().toISOString(),
      };

      await storage.saveWorld(updated);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      next(err);
    }
  });

  // GET /api/worlds/:id/scenarios
  router.get('/:id/scenarios', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scenarios = await storage.getScenariosForWorld(req.params.id as string);
      res.json({ success: true, data: scenarios });
    } catch (err: any) {
      next(err);
    }
  });

  // POST /api/worlds/:id/scenarios
  router.post('/:id/scenarios', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = ScenarioSchema.parse(req.body);
      const newScenario: Scenario = {
        id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        worldId: req.params.id as string,
        ...validated,
      };

      await storage.saveScenario(newScenario);
      res.status(201).json({ success: true, data: newScenario });
    } catch (err: any) {
      next(err);
    }
  });

  return router;
}
