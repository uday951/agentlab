import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { promisify } from 'util';
import { execFile } from 'child_process';
import type { IStorageStore } from '../storage/storage.ts';
import type {
  BenchmarkProject,
  BenchmarkDefinition,
  BenchmarkOrigin,
  BenchmarkProjectSource,
} from '../types.ts';
import { ProjectAnalyzer } from '../benchmark/ProjectAnalyzer.ts';
import { BenchmarkGenerator } from '../benchmark/BenchmarkGenerator.ts';
import { BenchmarkEngine } from '../benchmark/BenchmarkEngine.ts';

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
