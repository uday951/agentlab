import express, { type Request, type Response } from 'express';
const { Router } = express;
import { z } from 'zod';
import type { IStorageStore } from '../storage/storage.ts';
import { SimulationEngine } from '../sim/simulationEngine.ts';
import type { Experiment } from '../types.ts';

const CreateExperimentSchema = z.object({
  name: z.string().min(2),
  agentId: z.string(),
  worldId: z.string(),
  scenarioIds: z.array(z.string()).default([]),
});

export function createExperimentRouter(storage: IStorageStore, engine: SimulationEngine): Router {
  const router = Router();

  // GET /api/experiments
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const experiments = await storage.getExperiments();
      res.json({ success: true, data: experiments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/experiments/:id
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const exp = await storage.getExperiment(req.params.id);
      if (!exp) {
        return res.status(404).json({ success: false, error: 'Experiment not found' });
      }
      res.json({ success: true, data: exp });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/experiments - Create new experiment
  router.post('/', async (req: Request, res: Response) => {
    try {
      const validated = CreateExperimentSchema.parse(req.body);
      const agent = await storage.getAgent(validated.agentId);
      if (!agent) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
      }

      const world = await storage.getWorld(validated.worldId);
      if (!world) {
        return res.status(404).json({ success: false, error: 'World not found' });
      }

      const scenarios = await storage.getScenariosForWorld(world.id);
      const selectedScenarioIds =
        validated.scenarioIds.length > 0
          ? validated.scenarioIds
          : scenarios.map(s => s.id);

      const newExp: Experiment = {
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: validated.name,
        agentId: agent.id,
        agentName: agent.name,
        worldId: world.id,
        worldName: world.name,
        scenarioIds: selectedScenarioIds,
        status: 'pending',
        scenarioCount: selectedScenarioIds.length,
        progress: 0,
        runs: [],
        events: [],
        createdAt: new Date().toISOString(),
      };

      await storage.saveExperiment(newExp);
      res.status(201).json({ success: true, data: newExp });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: err.errors });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/experiments/:id/run - Launch simulation
  router.post('/:id/run', async (req: Request, res: Response) => {
    try {
      const exp = await storage.getExperiment(req.params.id);
      if (!exp) {
        return res.status(404).json({ success: false, error: 'Experiment not found' });
      }

      if (exp.status === 'running') {
        return res.status(400).json({ success: false, error: 'Experiment is already running' });
      }

      // Launch asynchronously
      engine.runExperiment(exp.id).catch(err => {
        console.error(`Simulation runtime error for ${exp.id}:`, err);
      });

      res.json({
        success: true,
        message: 'Simulation run initiated',
        experimentId: exp.id,
        status: 'running',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/experiments/:id/cancel
  router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const cancelled = engine.cancel(req.params.id);
      if (!cancelled) {
        return res.status(400).json({ success: false, message: 'Experiment is not currently running or cannot be cancelled' });
      }
      res.json({ success: true, message: 'Cancellation signal sent' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/experiments/:id/stream - Server-Sent Events (SSE) Live Feed
  router.get('/:id/stream', async (req: Request, res: Response) => {
    const expId = req.params.id;
    const exp = await storage.getExperiment(expId);
    if (!exp) {
      return res.status(404).json({ success: false, error: 'Experiment not found' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', experimentId: expId, status: exp.status })}\n\n`);

    const unsubscribe = engine.subscribe(expId, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on('close', () => {
      unsubscribe();
    });
  });

  // GET /api/experiments/:id/events
  router.get('/:id/events', async (req: Request, res: Response) => {
    try {
      const exp = await storage.getExperiment(req.params.id);
      if (!exp) {
        return res.status(404).json({ success: false, error: 'Experiment not found' });
      }
      res.json({ success: true, data: exp.events || [] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/experiments/:id/results
  router.get('/:id/results', async (req: Request, res: Response) => {
    try {
      const exp = await storage.getExperiment(req.params.id);
      if (!exp) {
        return res.status(404).json({ success: false, error: 'Experiment not found' });
      }
      res.json({ success: true, data: exp.results || null, status: exp.status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/experiments/:id/export - Export JSON or CSV
  router.get('/:id/export', async (req: Request, res: Response) => {
    try {
      const exp = await storage.getExperiment(req.params.id);
      if (!exp) {
        return res.status(404).json({ success: false, error: 'Experiment not found' });
      }

      const format = req.query.format === 'csv' ? 'csv' : 'json';

      if (format === 'csv') {
        const rows = [
          ['Scenario ID', 'Scenario Title', 'Category', 'Status', 'Agent Decision', 'Score', 'Duration (ms)'].join(','),
          ...exp.runs.map(r => [
            `"${r.scenarioId}"`,
            `"${r.scenarioTitle.replace(/"/g, '""')}"`,
            `"${r.category}"`,
            `"${r.status}"`,
            `"${r.agentOutput.decision}"`,
            r.evaluation.score,
            r.durationMs,
          ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${exp.name.replace(/\s+/g, '_')}_results.csv"`);
        return res.send(rows);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${exp.name.replace(/\s+/g, '_')}_results.json"`);
      res.json(exp);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/experiments/:id
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteExperiment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Experiment not found' });
      }
      res.json({ success: true, message: 'Experiment deleted' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
