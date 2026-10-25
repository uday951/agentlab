import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createStorageStore } from './storage/index.ts';
import { DatabaseNotConfiguredError } from './storage/storage.ts';
import { SimulationEngine } from './sim/simulationEngine.ts';
import { createAgentRouter } from './routes/agentRoutes.ts';
import { createWorldRouter } from './routes/worldRoutes.ts';
import { createKnowledgeRouter } from './routes/knowledgeRoutes.ts';
import { createExperimentRouter } from './routes/experimentRoutes.ts';
import { createDemoRouter } from './routes/demoRoutes.ts';
import { createInfrastructureRouter } from './routes/infrastructureRoutes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Basic Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Structured Logging Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
      if (res.statusCode >= 500) {
        console.error(`🔴 ${logLine}`);
      } else if (res.statusCode >= 400) {
        console.warn(`🟡 ${logLine}`);
      } else if (req.originalUrl.startsWith('/api') && req.originalUrl !== '/api/health') {
        console.log(`🟢 ${logLine}`);
      }
    });
    next();
  });

  // Authentication-Ready Middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Ready for JWT verification when JWT_SECRET is configured
      (req as any).authToken = token;
      (req as any).user = { id: 'auth-user', role: 'developer' };
    }
    next();
  });

  // Initialize Real MongoDB Storage & Simulation Engine
  const storage = await createStorageStore();
  const engine = new SimulationEngine(storage);

  // Health check & System Telemetry Endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    const isDbConnected = storage.isConnected();
    res.status(isDbConnected ? 200 : 503).json({
      status: isDbConnected ? 'ok' : 'degraded',
      service: 'AgentLab Simulation Backend',
      version: '2.0.0-production',
      database: {
        type: 'mongodb',
        connected: isDbConnected,
        error: storage.getConnectionError(),
      },
      infrastructure: {
        isolatedRunnerConfigured: !!process.env.AGENT_RUNNER_URL,
        cliRunnerEnabled: process.env.ENABLE_CLI_RUNNER === 'true',
        githubTokenConfigured: !!process.env.GITHUB_TOKEN,
        llmProvider: process.env.LLM_PROVIDER || 'builtin-deterministic',
      },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Routers
  app.use('/api/agents', createAgentRouter(storage));
  app.use('/api/worlds', createWorldRouter(storage));
  app.use('/api/worlds/:worldId/documents', createKnowledgeRouter(storage));
  app.use('/api/experiments', createExperimentRouter(storage, engine));
  app.use('/api/demo', createDemoRouter(storage, engine));
  app.use('/api/infrastructure', createInfrastructureRouter(storage));

  // Centralized Error Handling Middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);

    if (err instanceof DatabaseNotConfiguredError || err.name === 'DatabaseNotConfiguredError') {
      return res.status(503).json({
        success: false,
        error: 'DatabaseNotConfigured',
        message: err.message,
      });
    }

    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        details: err.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: err.message || 'An unexpected error occurred.',
    });
  });

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
    console.log(`📡 Telemetry & Health: http://localhost:${PORT}/api/health`);
    console.log(`💾 Database: MONGODB (${storage.isConnected() ? 'ONLINE' : 'UNCONFIGURED / DISCONNECTED'})`);
    console.log('──────────────────────────────────────────────────────');
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting AgentLab server:', err);
  process.exit(1);
});
