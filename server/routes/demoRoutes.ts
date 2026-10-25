import express, { type Request, type Response } from 'express';
const { Router } = express;
import type { IStorageStore } from '../storage/storage.ts';
import { SimulationEngine } from '../sim/simulationEngine.ts';
import type { Experiment } from '../types.ts';

export function createDemoRouter(storage: IStorageStore, engine: SimulationEngine): Router {
  const router = Router();

  // POST /api/demo/run-quick - 1-Click College Review Demo
  router.post('/run-quick', async (_req: Request, res: Response) => {
    try {
      const agents = await storage.getAgents();
      const sampleAgent = agents.find(a => a.id === 'agent-sample-support') || agents[0];

      const worlds = await storage.getWorlds();
      const shopSphere = worlds.find(w => w.id === 'world-shopsphere') || worlds[0];

      if (!sampleAgent || !shopSphere) {
        return res.status(400).json({
          success: false,
          error: 'Default agent or world not found. Please re-seed default data.',
        });
      }

      const scenarios = await storage.getScenariosForWorld(shopSphere.id);
      const scenarioIds = scenarios.map(s => s.id);

      const demoExp: Experiment = {
        id: `exp-demo-${Date.now()}`,
        name: `ShopSphere Benchmark Run #${Math.floor(1000 + Math.random() * 9000)}`,
        agentId: sampleAgent.id,
        agentName: sampleAgent.name,
        worldId: shopSphere.id,
        worldName: shopSphere.name,
        scenarioIds,
        status: 'pending',
        scenarioCount: scenarioIds.length,
        progress: 0,
        runs: [],
        events: [],
        createdAt: new Date().toISOString(),
      };

      await storage.saveExperiment(demoExp);

      // Start simulation in background
      engine.runExperiment(demoExp.id).catch(err => {
        console.error('Demo simulation error:', err);
      });

      res.status(201).json({
        success: true,
        message: '1-Click College Review Demo initiated with 10 deterministic test scenarios',
        experiment: demoExp,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
