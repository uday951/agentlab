import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createStorageStore } from './storage/index.ts';
import { SimulationEngine } from './sim/simulationEngine.ts';
import { createAgentRouter } from './routes/agentRoutes.ts';
import { createWorldRouter } from './routes/worldRoutes.ts';
import { createExperimentRouter } from './routes/experimentRoutes.ts';
import { createDemoRouter } from './routes/demoRoutes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize Storage & Engine
  const storage = await createStorageStore();
  const engine = new SimulationEngine(storage);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'AgentLab Simulation Backend',
      version: '1.0.0',
      storageMode: storage.mode,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API routers
  app.use('/api/agents', createAgentRouter(storage));
  app.use('/api/worlds', createWorldRouter(storage));
  app.use('/api/experiments', createExperimentRouter(storage, engine));
  app.use('/api/demo', createDemoRouter(storage, engine));

  // Serve static client bundle if built (production mode / monolithic deployment)
  const distPath = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    console.log(`📦 Serving production client from ${distPath}`);
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log('──────────────────────────────────────────────────────');
    console.log(`🚀 AGENTLAB BACKEND RUNNING ON http://localhost:${PORT}`);
    console.log(`📡 REST API: http://localhost:${PORT}/api/health`);
    console.log(`💾 Storage: ${storage.mode.toUpperCase()} MODE`);
    console.log('──────────────────────────────────────────────────────');
  });
}

startServer().catch(err => {
  console.error('Fatal error starting AgentLab server:', err);
  process.exit(1);
});
