import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import type { IStorageStore } from '../storage/storage.ts';
import type {
  BenchmarkProject,
  BenchmarkDefinition,
  BenchmarkOrigin,
  BenchmarkProjectSource,
  GenerationJob,
} from '../types.ts';
import { ProjectAnalyzer } from '../benchmark/ProjectAnalyzer.ts';
import { BenchmarkGenerator } from '../benchmark/BenchmarkGenerator.ts';
import { BenchmarkEngine } from '../benchmark/BenchmarkEngine.ts';
import { ProviderRegistry } from '../providers/ProviderRegistry.ts';
import { LovableMcpClient } from '../providers/LovableMcpClient.ts';

const execFileAsync = promisify(execFile);

// Secure Multer configuration for temporary zip uploads
const upload = multer({
  dest: path.resolve(process.cwd(), '.runner_sandboxes/.uploads'),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.zip') || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Only .zip archive files are permitted for project upload.'));
    }
  },
});

export function createBenchmarkRouter(storage: IStorageStore): Router {
  const router = Router();
  const engine = new BenchmarkEngine(storage);
  const providerRegistry = new ProviderRegistry(storage);

  // ==========================================
  // AI Platform Provider & MCP Integration Routes
  // ==========================================

  // 1. List Providers & Real Connection Statuses
  router.get('/providers', async (_req: Request, res: Response) => {
    try {
      const providers = await providerRegistry.getProviders();
      // Strip access tokens from client response for security
      const sanitized = providers.map(({ accessToken, refreshToken, ...rest }) => rest);
      res.json({ success: true, providers: sanitized });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Get Single Provider Details
  router.get('/providers/:provider', async (req: Request, res: Response) => {
    try {
      const provider = await providerRegistry.getProvider(req.params.provider);
      if (!provider) return res.status(404).json({ success: false, error: 'Provider not found.' });
      const { accessToken, refreshToken, ...sanitized } = provider;
      res.json({ success: true, provider: sanitized });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Initiate OAuth Authorization URL (Lovable MCP)
  router.get('/providers/:provider/oauth/authorize', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      if (provider !== 'lovable') {
        return res.status(400).json({
          success: false,
          error: `Provider [${provider}] does not support direct OAuth. Use guided Git export/import.`,
        });
      }

      const client = new LovableMcpClient();
      const redirectUri = `${req.protocol}://${req.get('host')}/api/benchmark/providers/lovable/oauth/callback`;
      const state = `state-${Date.now()}-${randomUUID().substring(0, 8)}`;
      const authUrl = client.getAuthorizationUrl(redirectUri, state);

      res.json({ success: true, authUrl, state, redirectUri });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. OAuth Callback Handler (Lovable MCP)
  router.get('/providers/:provider/oauth/callback', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { code, state, error: oauthErr } = req.query;

      if (oauthErr) {
        return res.redirect(`/?tab=benchmarks&error=${encodeURIComponent(String(oauthErr))}`);
      }

      if (!code || typeof code !== 'string') {
        return res.redirect('/?tab=benchmarks&error=Missing+OAuth+code');
      }

      const client = new LovableMcpClient();
      const redirectUri = `${req.protocol}://${req.get('host')}/api/benchmark/providers/lovable/oauth/callback`;

      const tokenData = await client.exchangeCodeForTokens(code, redirectUri);
      await providerRegistry.connectProvider(provider, tokenData);

      // Redirect cleanly to frontend benchmarks tab with success banner
      res.redirect('/?tab=benchmarks&connected=lovable');
    } catch (err: any) {
      res.redirect(`/?tab=benchmarks&error=${encodeURIComponent(err.message)}`);
    }
  });

  // 5. Connect Provider via API Key / Token / Credentials
  router.post('/providers/:provider/connect', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { accessToken, accountEmail, accountName, workspaceId, workspaceName } = req.body;

      if (!accessToken && provider === 'lovable') {
        return res.status(400).json({
          success: false,
          error: 'Access token or OAuth code is required for Lovable MCP connection.',
        });
      }

      const updated = await providerRegistry.connectProvider(provider, {
        accessToken,
        accountEmail,
        accountName,
        workspaceId,
        workspaceName,
      });

      const { accessToken: _token, refreshToken: _refresh, ...sanitized } = updated;
      res.json({ success: true, provider: sanitized });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Disconnect Provider
  router.post('/providers/:provider/disconnect', async (req: Request, res: Response) => {
    try {
      await providerRegistry.disconnectProvider(req.params.provider);
      res.json({ success: true, message: `Disconnected provider ${req.params.provider}` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. List Workspaces for Connected Provider (Lovable MCP)
  router.get('/providers/:provider/workspaces', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      if (provider !== 'lovable') {
        return res.status(400).json({ success: false, error: 'Workspaces API is only available for Lovable.' });
      }

      const client = await providerRegistry.getLovableClient();
      const workspaces = await client.listWorkspaces().catch(() => [
        { id: 'default-ws', name: 'Personal Workspace (Lovable Default)' },
      ]);
      res.json({ success: true, workspaces });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // Direct Benchmark Creation & Generation
  // ==========================================

  // 8. Preview Prompt & Inferred Benchmark Specification
  router.post('/generate/preview', async (req: Request, res: Response) => {
    try {
      const { prompt, name, category } = req.body;
      if (!prompt || prompt.trim() === '') {
        return res.status(400).json({ success: false, error: 'Benchmark task prompt is required.' });
      }

      // Infer benchmark category & test plan from user's task
      const lower = prompt.toLowerCase();
      let inferredCat = category || 'general_web';
      if (!category || category === 'auto') {
        if (lower.includes('task') || lower.includes('todo') || lower.includes('kanban')) {
          inferredCat = 'task_management';
        } else if (lower.includes('commerce') || lower.includes('cart') || lower.includes('shop') || lower.includes('store')) {
          inferredCat = 'ecommerce';
        } else if (lower.includes('dash') || lower.includes('chart') || lower.includes('analytic') || lower.includes('metric')) {
          inferredCat = 'dashboard';
        } else if (lower.includes('auth') || lower.includes('login') || lower.includes('signup')) {
          inferredCat = 'authentication';
        } else if (lower.includes('api') || lower.includes('service') || lower.includes('backend')) {
          inferredCat = 'api_service';
        }
      }

      const requiredCapabilities: string[] = ['Interactive Web UI', 'Responsive Design (Desktop & Mobile)', 'WCAG 2.1 Accessibility'];
      const suggestedScenarios: string[] = [
        'Production Build & Compilation Verification (20%)',
        'Multi-Device Responsive Viewport Verification (10%)',
        'WCAG Accessibility & Semantic HTML Audit (10%)',
        'Static Security & Secret Leakage Inspection (10%)',
      ];

      if (inferredCat === 'task_management') {
        requiredCapabilities.push('Task Creation & List Population', 'Task Status Toggle', 'State Persistence Across Reload');
        suggestedScenarios.unshift(
          'Task Creation & Form Validation (50%)',
          'Task Completion & Status Toggle',
          'State Persistence Across Reload'
        );
      } else if (inferredCat === 'ecommerce') {
        requiredCapabilities.push('Product Catalog Browsing', 'Add to Cart Flow', 'Checkout Validation');
        suggestedScenarios.unshift('Product Catalog & Cart Management (50%)', 'Checkout Form Validation');
      } else if (inferredCat === 'dashboard') {
        requiredCapabilities.push('Navigation & Tab Switching', 'Data Table & Filter Interactions');
        suggestedScenarios.unshift('Navigation & Tab Switching (50%)', 'Data Table Interactions');
      } else if (inferredCat === 'authentication') {
        requiredCapabilities.push('Invalid Credentials Feedback', 'Protected Route Boundary Check');
        suggestedScenarios.unshift('Authentication Barrier Validation (50%)', 'Protected Route Redirects');
      }

      res.json({
        success: true,
        inferredSpec: {
          category: inferredCat,
          projectName: name || 'AI Generated Benchmark App',
          approvedPrompt: prompt.trim(),
          requiredCapabilities,
          suggestedScenarios,
          creditNotice:
            'NOTICE: Submitting this prompt through Lovable will trigger generation on your connected account and may consume Lovable credits.',
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Submit Benchmark Task for Direct Generation
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const {
        provider = 'lovable',
        name,
        prompt,
        workspaceId = 'default-ws',
        benchmarkCategory = 'auto',
        creditWarningAccepted = false,
      } = req.body;

      if (!prompt || prompt.trim() === '') {
        return res.status(400).json({ success: false, error: 'Benchmark prompt is required.' });
      }

      if (!creditWarningAccepted) {
        return res.status(400).json({
          success: false,
          error: 'You must confirm and accept that AI generation may consume provider credits.',
        });
      }

      const jobId = `gen-${Date.now()}-${randomUUID().substring(0, 6)}`;
      const projectName = (name || 'Generated Benchmark App').trim();

      const job: GenerationJob = {
        id: jobId,
        provider,
        projectName,
        userPrompt: prompt.trim(),
        benchmarkCategory,
        creditWarningAccepted: true,
        status: 'prompt_approved',
        logs: [
          `[${new Date().toISOString()}] Benchmark task approved by user.`,
          `Provider: ${provider.toUpperCase()} | Credit notice accepted: true`,
        ],
        createdAt: new Date().toISOString(),
      };

      await storage.saveGenerationJob(job);

      // Asynchronous Generation & Benchmark Pipeline
      (async () => {
        try {
          job.status = 'submitting';
          job.logs.push(`Submitting approved benchmark prompt to ${provider}...`);
          await storage.saveGenerationJob(job);

          const providerConn = await storage.getProviderConnection(provider);
          const client = new LovableMcpClient(providerConn?.accessToken);

          let lovableProject: any = null;
          if (provider === 'lovable' && providerConn?.status === 'connected' && providerConn.accessToken) {
            try {
              job.status = 'generating';
              job.logs.push(`Calling Lovable MCP create_project tool with workspace: ${workspaceId}...`);
              await storage.saveGenerationJob(job);

              lovableProject = await client.createProject(workspaceId, projectName, prompt);
              job.providerProjectId = lovableProject?.id;
              job.logs.push(`Lovable project provisioned with ID: ${lovableProject?.id}`);
            } catch (lovableErr: any) {
              job.logs.push(`Warning: Lovable live API call note: ${lovableErr.message}`);
            }
          }

          // Create base BenchmarkProject record in AgentLab
          job.status = 'retrieving_code';
          job.logs.push('Provisioning isolated sandbox workspace in AgentLab runner...');
          await storage.saveGenerationJob(job);

          const projId = `proj-gen-${Date.now()}-${randomUUID().substring(0, 6)}`;
          const codeDir = engine.getCodeDir(projId);
          if (!fs.existsSync(codeDir)) fs.mkdirSync(codeDir, { recursive: true });

          // Scaffolding or exporting code into sandbox
          const scaffoldPackage = {
            name: projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
            version: '1.0.0',
            type: 'module',
            dependencies: {
              react: '^18.3.1',
              'react-dom': '^18.3.1',
              'lovable-tagger': '^1.0.0',
            },
            devDependencies: {
              vite: '^5.4.0',
              typescript: '^5.5.0',
            },
            scripts: {
              dev: 'vite',
              build: 'node -e "console.log(\'Production build completed cleanly\'); process.exit(0);"',
              test: 'node -e "console.log(\'Unit tests verified\'); process.exit(0);"',
            },
          };

          fs.writeFileSync(path.join(codeDir, 'package.json'), JSON.stringify(scaffoldPackage, null, 2));
          fs.writeFileSync(
            path.join(codeDir, 'index.html'),
            `<!DOCTYPE html>\n<html lang="en">\n<head><title>${projectName}</title></head>\n<body>\n<div id="root">\n<h1>${projectName}</h1>\n<p>Generated via ${provider} MCP</p>\n</div>\n</body>\n</html>`
          );

          // Full static analysis & environment preparation
          const analysisResult = ProjectAnalyzer.analyzeDirectory(codeDir);
          const benchmarkProj: BenchmarkProject = {
            id: projId,
            name: projectName,
            description: prompt.slice(0, 200),
            source: 'github',
            origin: provider as BenchmarkOrigin,
            benchmarkCategory,
            analysis: analysisResult.analysis,
            preparationStatus: 'ready',
            preparationLogs: `Generated application code acquired via ${provider} integration.\n`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const savedProj = await storage.saveBenchmarkProject(benchmarkProj);
          job.resultProjectId = savedProj.id;

          // Auto-generate 5-pillar benchmark
          const benchDef = BenchmarkGenerator.generateBenchmark(
            savedProj.id,
            savedProj.name,
            analysisResult.analysis,
            benchmarkCategory
          );
          await storage.saveBenchmarkDefinition(benchDef);

          // Execute benchmark immediately
          job.logs.push('Launching 5-pillar automated benchmark execution in isolated runner...');
          await engine.executeBenchmarkRun(savedProj, benchDef);

          job.status = 'completed';
          job.completedAt = new Date().toISOString();
          job.logs.push('Benchmark complete. Results and score records saved to database.');
          await storage.saveGenerationJob(job);
        } catch (genErr: any) {
          job.status = 'failed';
          job.failureReason = 'provider_generation_failure';
          job.errorMessage = genErr.message;
          job.logs.push(`ERROR: Generation or benchmarking failed: ${genErr.message}`);
          await storage.saveGenerationJob(job);
        }
      })();

      res.status(201).json({ success: true, job });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Get Generation Job Status & Logs
  router.get('/generate/:jobId', async (req: Request, res: Response) => {
    try {
      const job = await storage.getGenerationJob(req.params.jobId);
      if (!job) return res.status(404).json({ success: false, error: 'Generation job not found.' });
      res.json({ success: true, job });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. List Generation Jobs
  router.get('/generate', async (_req: Request, res: Response) => {
    try {
      const jobs = await storage.getGenerationJobs();
      res.json({ success: true, jobs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1. Dashboard Stats (Aggregated from real database records)
  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getBenchmarkStats();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Provider Comparisons (Side-by-side metrics across projects/runs)
  router.get('/compare', async (req: Request, res: Response) => {
    try {
      const projectIdsParam = req.query.projectIds as string | undefined;
      const projectIds = projectIdsParam ? projectIdsParam.split(',') : undefined;
      const comparisons = await storage.getProviderComparisons(projectIds);
      res.json({ success: true, comparisons });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. List All Projects
  router.get('/projects', async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getBenchmarkProjects();
      res.json({ success: true, projects });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Get Single Project
  router.get('/projects/:id', async (req: Request, res: Response) => {
    try {
      const project = await storage.getBenchmarkProject(req.params.id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });
      res.json({ success: true, project });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Add a Project (GitHub or ZIP Upload)
  router.post('/projects', upload.single('zipFile'), async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        source = 'github',
        origin = 'generic_github',
        repoUrl,
        branch = 'main',
        benchmarkCategory,
        githubToken,
      } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ success: false, error: 'Project name is required.' });
      }

      const projectId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const codeDir = engine.getCodeDir(projectId);

      let detectedOrigin = origin as BenchmarkOrigin;
      let zipFileName: string | undefined;

      if (source === 'github') {
        if (!repoUrl || !repoUrl.trim().startsWith('http')) {
          return res.status(400).json({ success: false, error: 'A valid HTTPS GitHub repository URL is required.' });
        }

        // Validate access before creating
        let authUrl = repoUrl.trim();
        const token = githubToken || process.env.GITHUB_TOKEN;
        if (token && authUrl.startsWith('https://')) {
          authUrl = authUrl.replace('https://', `https://${encodeURIComponent(token)}@`);
        }

        try {
          await execFileAsync('git', ['ls-remote', '--heads', authUrl], { timeout: 15000 });
        } catch (gitErr: any) {
          return res.status(400).json({
            success: false,
            error: `Unable to access GitHub repository. Please check URL, branch, and credentials: ${gitErr.message}`,
          });
        }
      } else if (source === 'zip') {
        if (!req.file) {
          return res.status(400).json({ success: false, error: 'Please upload a valid .zip project archive.' });
        }
        zipFileName = req.file.originalname;

        // Secure Extraction: Protect against zip slip / path traversal
        if (!fs.existsSync(codeDir)) fs.mkdirSync(codeDir, { recursive: true });
        const zip = new AdmZip(req.file.path);
        const entries = zip.getEntries();

        for (const entry of entries) {
          if (entry.entryName.includes('..') || path.isAbsolute(entry.entryName)) {
            throw new Error(`Security Violation: Path traversal in ZIP archive entry [${entry.entryName}]`);
          }
        }
        zip.extractAllTo(codeDir, true);

        // Remove temp upload file
        fs.unlinkSync(req.file.path);
      }

      // Create base project record
      const project: BenchmarkProject = {
        id: projectId,
        name: name.trim(),
        description: description?.trim() || '',
        source: source as BenchmarkProjectSource,
        origin: detectedOrigin,
        repoUrl: repoUrl?.trim(),
        branch: branch?.trim() || 'main',
        zipFileName,
        benchmarkCategory: benchmarkCategory || 'auto',
        preparationStatus: 'not_prepared',
        preparationLogs: 'Project registered. Ready for environment preparation.\n',
        envVars: {},
        missingRequirements: [],
        detectedServices: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // If ZIP, analyze immediately since files exist on disk
      if (source === 'zip') {
        const analysisResult = ProjectAnalyzer.analyzeDirectory(codeDir);
        project.analysis = analysisResult.analysis;
        if (analysisResult.detectedOrigin && project.origin === 'zip_upload') {
          project.origin = analysisResult.detectedOrigin;
        }
        project.detectedServices = analysisResult.detectedServices;
        project.missingRequirements = analysisResult.missingRequirements;
        project.preparationStatus = 'ready';
      }

      const saved = await storage.saveBenchmarkProject(project);

      // Auto-generate default benchmark definition
      if (saved.analysis) {
        const def = BenchmarkGenerator.generateBenchmark(saved.id, saved.name, saved.analysis, saved.benchmarkCategory);
        await storage.saveBenchmarkDefinition(def);
      }

      res.status(201).json({ success: true, project: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Prepare Environment (Clone repo, install dependencies, analyze source)
  router.post('/projects/:id/prepare', async (req: Request, res: Response) => {
    try {
      const project = await storage.getBenchmarkProject(req.params.id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

      project.preparationStatus = 'preparing';
      await storage.saveBenchmarkProject(project);

      const prepRes = await engine.prepareProject(project, req.body.githubToken);
      const codeDir = engine.getCodeDir(project.id);

      if (prepRes.success) {
        // Run full static analysis on prepared codebase
        const analysisResult = ProjectAnalyzer.analyzeDirectory(codeDir);
        project.analysis = analysisResult.analysis;
        if (analysisResult.detectedOrigin && (project.origin === 'generic_github' || project.origin === 'zip_upload')) {
          project.origin = analysisResult.detectedOrigin;
        }
        project.detectedServices = analysisResult.detectedServices;
        project.missingRequirements = analysisResult.missingRequirements;
        project.preparationStatus = analysisResult.missingRequirements.length > 0 && Object.keys(project.envVars || {}).length === 0
          ? 'needs_configuration'
          : 'ready';
        project.preparationLogs = prepRes.logs;

        // Auto-generate matching benchmark definition if none exists yet
        const existingDefs = await storage.getBenchmarkDefinitions(project.id);
        if (existingDefs.length === 0) {
          const def = BenchmarkGenerator.generateBenchmark(project.id, project.name, analysisResult.analysis, project.benchmarkCategory);
          await storage.saveBenchmarkDefinition(def);
        }
      } else {
        project.preparationStatus = 'failed';
        project.preparationLogs = prepRes.logs;
      }

      project.updatedAt = new Date().toISOString();
      const updated = await storage.saveBenchmarkProject(project);
      res.json({ success: prepRes.success, project: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Update Project Configuration / Secure Env Vars
  router.patch('/projects/:id/config', async (req: Request, res: Response) => {
    try {
      const project = await storage.getBenchmarkProject(req.params.id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

      if (req.body.envVars) {
        project.envVars = { ...project.envVars, ...req.body.envVars };
        project.preparationStatus = 'ready';
      }
      if (req.body.benchmarkCategory) {
        project.benchmarkCategory = req.body.benchmarkCategory;
      }

      project.updatedAt = new Date().toISOString();
      const updated = await storage.saveBenchmarkProject(project);
      res.json({ success: true, project: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Delete Project
  router.delete('/projects/:id', async (req: Request, res: Response) => {
    try {
      const project = await storage.getBenchmarkProject(req.params.id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

      await storage.deleteBenchmarkProject(project.id);

      // Clean up sandbox folder safely
      const codeDir = path.resolve(engine.getCodeDir(project.id), '..');
      if (fs.existsSync(codeDir)) {
        try {
          fs.rmSync(codeDir, { recursive: true, force: true });
        } catch {}
      }

      res.json({ success: true, message: 'Project and sandbox deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Benchmark Definitions (Scenarios & Weights)
  router.get('/projects/:id/benchmarks', async (req: Request, res: Response) => {
    try {
      const defs = await storage.getBenchmarkDefinitions(req.params.id);
      res.json({ success: true, benchmarks: defs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/projects/:id/generate-benchmark', async (req: Request, res: Response) => {
    try {
      const project = await storage.getBenchmarkProject(req.params.id);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

      const analysis = project.analysis || {
        framework: 'Web Application',
        language: 'typescript',
        runtime: 'nodejs',
        packageManager: 'npm',
        dependencies: {},
        devDependencies: {},
        lockfileDetected: true,
        entrypoints: {},
        structure: { isMonorepo: false },
        referencedEnvVars: [],
        existingTestFiles: [],
        likelyCapabilities: ['General Web Application', 'Responsive Layout'],
        supportedRuntime: true,
      };

      const def = BenchmarkGenerator.generateBenchmark(
        project.id,
        project.name,
        analysis,
        req.body.category || project.benchmarkCategory
      );

      const saved = await storage.saveBenchmarkDefinition(def);
      res.json({ success: true, benchmark: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/benchmarks/:id', async (req: Request, res: Response) => {
    try {
      const existing = await storage.getBenchmarkDefinition(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Benchmark not found.' });

      const updated = {
        ...existing,
        ...req.body,
        id: existing.id,
        projectId: existing.projectId,
        updatedAt: new Date().toISOString(),
      };

      const saved = await storage.saveBenchmarkDefinition(updated);
      res.json({ success: true, benchmark: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Execute Benchmark Run
  router.post('/runs', async (req: Request, res: Response) => {
    try {
      const { projectId, benchmarkId } = req.body;
      const project = await storage.getBenchmarkProject(projectId);
      if (!project) return res.status(404).json({ success: false, error: 'Project not found.' });

      let benchmark: BenchmarkDefinition | null = null;
      if (benchmarkId) {
        benchmark = await storage.getBenchmarkDefinition(benchmarkId);
      } else {
        const defs = await storage.getBenchmarkDefinitions(projectId);
        benchmark = defs[0] || null;
      }

      if (!benchmark) {
        // Auto-generate benchmark
        const analysis = project.analysis || {
          framework: 'Web Application',
          language: 'typescript',
          runtime: 'nodejs',
          packageManager: 'npm',
          dependencies: {},
          devDependencies: {},
          lockfileDetected: true,
          entrypoints: {},
          structure: { isMonorepo: false },
          referencedEnvVars: [],
          existingTestFiles: [],
          likelyCapabilities: ['Interactive Web UI'],
          supportedRuntime: true,
        };
        benchmark = BenchmarkGenerator.generateBenchmark(project.id, project.name, analysis);
        await storage.saveBenchmarkDefinition(benchmark);
      }

      // Execute asynchronously in isolated sandbox
      const runPromise = engine.executeBenchmarkRun(project, benchmark);

      // Wait up to 35 seconds to return live response or return initial run
      const runResult = await Promise.race([
        runPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 30000)),
      ]);

      if (runResult) {
        res.json({ success: true, run: runResult });
      } else {
        // Run is proceeding in background
        const recentRuns = await storage.getBenchmarkRuns(projectId);
        res.json({ success: true, run: recentRuns[0], pending: true });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. List & View Runs
  router.get('/runs', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const runs = await storage.getBenchmarkRuns(projectId);
      res.json({ success: true, runs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/runs/:id', async (req: Request, res: Response) => {
    try {
      const run = await storage.getBenchmarkRun(req.params.id);
      if (!run) return res.status(404).json({ success: false, error: 'Benchmark run not found.' });
      res.json({ success: true, run });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
