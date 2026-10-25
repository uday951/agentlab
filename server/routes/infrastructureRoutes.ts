import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import type { IStorageStore } from '../storage/storage.ts';
import { IsolatedRunnerService } from '../runner/IsolatedRunnerService.ts';

export function createInfrastructureRouter(storage: IStorageStore) {
  const router = Router();
  const runnerService = new IsolatedRunnerService();

  // GET /api/infrastructure - Comprehensive Telemetry & Config Status
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const isDbConnected = storage.isConnected();
      let collectionsCount = 0;
      if (isDbConnected && mongoose.connection.db) {
        try {
          const collections = await mongoose.connection.db.listCollections().toArray();
          collectionsCount = collections.length;
        } catch {}
      }

      const platformConfig = await storage.getPlatformConfig();
      const systemRuntimes = await runnerService.getSystemRuntimes();

      // Mask sensitive credentials
      const mask = (val?: string) => {
        if (!val) return '';
        if (val.length <= 8) return '********';
        return `${val.slice(0, 4)}...${val.slice(-4)}`;
      };

      res.json({
        success: true,
        data: {
          database: {
            connected: isDbConnected,
            type: 'MongoDB Atlas',
            error: storage.getConnectionError(),
            collectionsCount,
          },
          runner: {
            mode: platformConfig.agentRunnerMode,
            ready: true,
            runtimes: {
              node: systemRuntimes.node,
              python: systemRuntimes.python,
              git: systemRuntimes.git,
            },
            sandboxesCount: systemRuntimes.sandboxesCount,
            sandboxRoot: systemRuntimes.sandboxRoot,
          },
          config: {
            llmProvider: platformConfig.llmProvider,
            llmModel: platformConfig.llmModel,
            llmApiKeyMasked: mask(platformConfig.llmApiKey),
            hasLlmApiKey: !!platformConfig.llmApiKey,
            githubTokenMasked: mask(platformConfig.githubToken),
            hasGithubToken: !!platformConfig.githubToken,
            enableCliRunner: platformConfig.enableCliRunner,
            agentRunnerMode: platformConfig.agentRunnerMode,
            agentRunnerUrl: platformConfig.agentRunnerUrl,
            maxExecutionTimeoutMs: platformConfig.maxExecutionTimeoutMs,
            updatedAt: platformConfig.updatedAt,
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/infrastructure - Update Platform Settings In-App
  router.post('/', async (req: Request, res: Response) => {
    try {
      const {
        llmProvider,
        llmApiKey,
        llmModel,
        githubToken,
        enableCliRunner,
        agentRunnerMode,
        agentRunnerUrl,
      } = req.body;

      const updates: any = {};
      if (llmProvider !== undefined) updates.llmProvider = llmProvider;
      if (llmApiKey !== undefined && llmApiKey !== '') updates.llmApiKey = llmApiKey;
      if (llmModel !== undefined) updates.llmModel = llmModel;
      if (githubToken !== undefined && githubToken !== '') updates.githubToken = githubToken;
      if (enableCliRunner !== undefined) updates.enableCliRunner = !!enableCliRunner;
      if (agentRunnerMode !== undefined) updates.agentRunnerMode = agentRunnerMode;
      if (agentRunnerUrl !== undefined) updates.agentRunnerUrl = agentRunnerUrl;

      const updated = await storage.savePlatformConfig(updates);

      // Keep process.env synchronized in memory for active runtime
      if (updates.llmApiKey) process.env.LLM_API_KEY = updates.llmApiKey;
      if (updates.llmProvider) process.env.LLM_PROVIDER = updates.llmProvider;
      if (updates.llmModel) process.env.LLM_MODEL = updates.llmModel;
      if (updates.githubToken) process.env.GITHUB_TOKEN = updates.githubToken;
      if (updates.enableCliRunner !== undefined) {
        process.env.ENABLE_CLI_RUNNER = updates.enableCliRunner ? 'true' : 'false';
      }

      res.json({
        success: true,
        message: 'Platform configuration updated successfully in MongoDB.',
        data: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/infrastructure/test-llm - Test Live LLM Provider
  router.post('/test-llm', async (_req: Request, res: Response) => {
    try {
      const config = await storage.getPlatformConfig();
      const apiKey = config.llmApiKey || process.env.LLM_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'No LLM API Key is configured. Enter your API key in the configuration panel above.',
        });
      }

      const startTime = Date.now();
      const endpoint = 'https://api.deepseek.com/chat/completions';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.llmModel || 'deepseek-chat',
          messages: [{ role: 'user', content: 'AgentLab ping test. Respond with "pong" only.' }],
          temperature: 0.1,
          max_tokens: 10,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          success: false,
          error: `Provider returned HTTP ${response.status}: ${errText}`,
          latencyMs,
        });
      }

      const data: any = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || 'pong';

      res.json({
        success: true,
        status: 'connected',
        latencyMs,
        provider: config.llmProvider,
        model: config.llmModel,
        reply,
        message: `Successfully connected to ${config.llmProvider} in ${latencyMs}ms. Response: "${reply}"`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/infrastructure/test-github - Verify GitHub Token
  router.post('/test-github', async (_req: Request, res: Response) => {
    try {
      const config = await storage.getPlatformConfig();
      const token = config.githubToken || process.env.GITHUB_TOKEN;

      const headers: Record<string, string> = {
        'User-Agent': 'AgentLab-Platform/1.0',
        Accept: 'application/vnd.github.v3+json',
      };
      if (token) headers['Authorization'] = `token ${token}`;

      const startTime = Date.now();
      const response = await fetch('https://api.github.com/rate_limit', { headers });
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: `GitHub API error (${response.status} ${response.statusText})`,
          latencyMs,
        });
      }

      const data: any = await response.json();
      const remaining = data.rate?.remaining;
      const limit = data.rate?.limit;

      res.json({
        success: true,
        status: 'connected',
        latencyMs,
        tokenConfigured: !!token,
        rateLimit: `${remaining} / ${limit} requests remaining`,
        message: `GitHub API reachable in ${latencyMs}ms (${remaining}/${limit} rate limit quota).`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
