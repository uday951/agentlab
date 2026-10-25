import express, { type Request, type Response, type NextFunction } from 'express';
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
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const experiments = await storage.getExperiments();
      res.json({ success: true, data: experiments });
    } catch (err: any) {
      next(err);
    }
  });

  // GET /api/experiments/:id
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exp = await storage.getExperiment(req.params.id as string);
      if (!exp) {
        return res.status(404).json({ success: false, error: 'Experiment not found' });
      }
      res.json({ success: true, data: exp });
    } catch (err: any) {
      next(err);
    }
  });

  // POST /api/experiments - Create new experiment
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
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
          : scenarios.map((s) => s.id);

      const experiment: Experiment = {
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

      await storage.saveExperiment(experiment);
      res.status(201).json({ success: true, data: experiment });
    } catch (err: any) {
      next(err);
    }
  });

  // POST /api/experiments/:id/run - Start execution
  router.post('/:id/run', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expId = req.params.id as string;
      const exp = await storage.getExperiment(expId);
      if (!exp) {
        return res.status(404).json({ success: false, error: 'Experiment not found' });
      }

      // Execute simulation asynchronously
      engine.runExperiment(expId).catch((err) => {
        console.error(`Simulation runtime error on ${expId}:`, err);
      });

      res.json({
        success: true,
        message: 'Simulation initiated',
        experimentId: expId,
      });
    } catch (err: any) {
      next(err);
    }
  });

  // POST /api/experiments/:id/cancel
  router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expId = req.params.id as string;
      const cancelled = engine.cancel(expId);
      res.json({ success: true, cancelled });
    } catch (err: any) {
      next(err);
    }
  });

  // GET /api/experiments/:id/stream - Real-time SSE telemetry events
  router.get('/:id/stream', async (req: Request, res: Response) => {
    const expId = req.params.id as string;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial ping
    res.write(`data: ${JSON.stringify({ type: 'connected', experimentId: expId })}\n\n`);

    const unsubscribe = engine.subscribe(expId, (message) => {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    });

    req.on('close', () => {
      unsubscribe();
    });
  });

  // GET /api/experiments/:id/results - Evaluation metrics & failure breakdown
  router.get('/:id/results', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exp = await storage.getExperiment(req.params.id as string);
      if (!exp) {
        return res.status(404).json({ success: false, error: 'Experiment not found' });
      }

      if (!exp.results) {
        return res.status(400).json({
          success: false,
          error: 'Experiment has not yet completed evaluation.',
          status: exp.status,
        });
      }

      res.json({
        success: true,
        summary: exp.results,
        runs: exp.runs,
      });
    } catch (err: any) {
      next(err);
    }
  });

  // GET /api/experiments/:id/export - Download full CSV/JSON report
  router.get('/:id/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exp = await storage.getExperiment(req.params.id as string);
      if (!exp) {
        return res.status(404).json({ success: false, error: 'Experiment not found' });
      }

      const format = (req.query.format as string) || 'json';

      if (format === 'csv') {
        const headers = [
          'Scenario ID',
          'Scenario Title',
          'Category',
          'Status',
          'Agent Decision',
          'Expected Decision',
          'Policy Cited',
          'Score',
          'Duration (ms)',
        ];

        const rows = (exp.runs || []).map((r) => [
          `"${r.scenarioId}"`,
          `"${r.scenarioTitle.replace(/"/g, '""')}"`,
          `"${r.category}"`,
          `"${r.status}"`,
          `"${r.agentOutput.decision}"`,
          `"${r.evaluation.correctOutcome ? r.agentOutput.decision : 'other'}"`,
          `"${r.agentOutput.policyRefCited || 'None'}"`,
          r.evaluation.score,
          r.durationMs,
        ]);

        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${exp.id}-results.csv"`);
        return res.send(csvContent);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${exp.id}-results.json"`);
      res.json(exp);
    } catch (err: any) {
      next(err);
    }
  });

  return router;
}
