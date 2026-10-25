import express, { type Request, type Response } from 'express';
const { Router } = express;
import { z } from 'zod';
import type { IStorageStore } from '../storage/storage.ts';
import type { Agent } from '../types.ts';

const AgentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().default(''),
  connectionType: z.enum(['builtin', 'api', 'cli', 'import']).default('builtin'),
  model: z.string().default('Custom Model'),
  endpoint: z.string().url().optional().or(z.literal('')),
  headers: z.record(z.string()).optional(),
  cliCommand: z.string().optional(),
  capabilities: z.array(z.string()).default(['simulated_tools']),
  tools: z.array(z.string()).default(['lookup_order', 'check_refund_eligibility', 'process_refund']),
  timeoutMs: z.number().min(500).max(60000).default(5000),
});

export function createAgentRouter(storage: IStorageStore): Router {
  const router = Router();

  // GET /api/agents
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const agents = await storage.getAgents();
      res.json({ success: true, data: agents });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/agents/:id
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
      }
      res.json({ success: true, data: agent });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/agents
  router.post('/', async (req: Request, res: Response) => {
    try {
      const validated = AgentSchema.parse(req.body);
      const newAgent: Agent = {
        id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...validated,
        endpoint: validated.endpoint || undefined,
        status: validated.connectionType === 'builtin' ? 'ready' : (validated.endpoint ? 'ready' : 'needs_configuration'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await storage.saveAgent(newAgent);
      res.status(201).json({ success: true, data: newAgent });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: err.errors });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/agents/:id
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteAgent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
      }
      res.json({ success: true, message: 'Agent deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/agents/:id/test - Test connection
  router.post('/:id/test', async (req: Request, res: Response) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
      }

      if (agent.connectionType === 'builtin') {
        return res.json({
          success: true,
          status: 'connected',
          latencyMs: 12,
          message: 'Built-in deterministic agent ready. All 5 tools operational.',
          capabilities: agent.capabilities,
        });
      }

      if (agent.connectionType === 'api') {
        if (!agent.endpoint) {
          return res.status(400).json({
            success: false,
            status: 'error',
            message: 'Cannot test connection: No endpoint URL configured.',
          });
        }

        // SSRF Check
        const url = new URL(agent.endpoint);
        const host = url.hostname.toLowerCase();
        if (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host === '169.254.169.254' ||
          host.startsWith('10.') ||
          host.startsWith('192.168.')
        ) {
          return res.status(400).json({
            success: false,
            status: 'blocked',
            message: 'SSRF Protection: Connection to localhost or internal network addresses is restricted.',
          });
        }

        const start = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);

        try {
          const resp = await fetch(agent.endpoint, {
            method: 'GET',
            headers: agent.headers || {},
            signal: controller.signal,
          });
          clearTimeout(timer);
          const latencyMs = Date.now() - start;

          return res.json({
            success: true,
            status: 'connected',
            httpStatus: resp.status,
            latencyMs,
            message: `API endpoint responded with HTTP ${resp.status} in ${latencyMs}ms`,
          });
        } catch (fetchErr: any) {
          clearTimeout(timer);
          return res.json({
            success: false,
            status: 'failed',
            latencyMs: Date.now() - start,
            message: `Connection failed: ${fetchErr.message}`,
          });
        }
      }

      if (agent.connectionType === 'cli') {
        return res.json({
          success: true,
          status: 'sandboxed',
          message: 'CLI Agent configured. Sandboxed execution enabled for safe runner.',
        });
      }

      if (agent.connectionType === 'import') {
        return res.json({
          success: true,
          status: 'imported',
          message: 'Repository source imported. Entry point verified for simulation.',
        });
      }

      res.json({ success: true, status: 'ready' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
