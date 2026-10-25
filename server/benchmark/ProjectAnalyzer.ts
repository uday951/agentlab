import fs from 'fs';
import path from 'path';
import type { ProjectAnalysis, BenchmarkOrigin } from '../types.ts';

export class ProjectAnalyzer {
  /**
   * Analyzes an isolated directory on disk and returns rich metadata and findings.
   */
  public static analyzeDirectory(codeDir: string): {
    analysis: ProjectAnalysis;
    detectedOrigin?: BenchmarkOrigin;
    detectedServices: string[];
    missingRequirements: string[];
  } {
    const analysis: ProjectAnalysis = {
      framework: 'Unknown',
      language: 'unknown',
      runtime: 'unknown',
      packageManager: 'none',
      dependencies: {},
      devDependencies: {},
      lockfileDetected: false,
      entrypoints: {},
      structure: { isMonorepo: false },
      referencedEnvVars: [],
      existingTestFiles: [],
      likelyCapabilities: [],
      supportedRuntime: true,
      unsupportedReasons: [],
    };

    const detectedServices: string[] = [];
    const missingRequirements: string[] = [];
    let detectedOrigin: BenchmarkOrigin | undefined;

    if (!fs.existsSync(codeDir)) {
      analysis.supportedRuntime = false;
      analysis.unsupportedReasons?.push('Source directory does not exist or was not extracted.');
      return { analysis, detectedServices, missingRequirements };
    }

    // 1. Recursive file list (capped at 500 files for fast inspection)
    const allFiles = this.getFilesRecursive(codeDir, 4, 500);

    // 2. Monorepo / Structure Detection
    const hasFrontendDir = fs.existsSync(path.join(codeDir, 'frontend')) || fs.existsSync(path.join(codeDir, 'client'));
    const hasBackendDir = fs.existsSync(path.join(codeDir, 'backend')) || fs.existsSync(path.join(codeDir, 'server'));
    analysis.structure.isMonorepo = hasFrontendDir && hasBackendDir;
    if (hasFrontendDir) {
      analysis.structure.frontendDir = fs.existsSync(path.join(codeDir, 'frontend')) ? 'frontend' : 'client';
    }
    if (hasBackendDir) {
      analysis.structure.backendDir = fs.existsSync(path.join(codeDir, 'backend')) ? 'backend' : 'server';
    }

    // 3. Inspect package.json (root or frontend/backend)
    const packageJsonPaths = [
      path.join(codeDir, 'package.json'),
      hasFrontendDir ? path.join(codeDir, analysis.structure.frontendDir!, 'package.json') : null,
      hasBackendDir ? path.join(codeDir, analysis.structure.backendDir!, 'package.json') : null,
    ].filter(Boolean) as string[];

    let primaryPkg: any = null;
    for (const pjp of packageJsonPaths) {
      if (fs.existsSync(pjp)) {
        try {
          const raw = JSON.parse(fs.readFileSync(pjp, 'utf-8'));
          if (!primaryPkg) primaryPkg = raw;
          // Merge dependencies
          analysis.dependencies = { ...analysis.dependencies, ...(raw.dependencies || {}) };
          analysis.devDependencies = { ...analysis.devDependencies, ...(raw.devDependencies || {}) };
          if (raw.scripts) {
            if (raw.scripts.build && !analysis.buildScript) analysis.buildScript = raw.scripts.build;
            if (raw.scripts.test && !analysis.testScript) analysis.testScript = raw.scripts.test;
            if (raw.scripts.dev && !analysis.devScript) analysis.devScript = raw.scripts.dev;
            if (raw.scripts.start && !analysis.startScript) analysis.startScript = raw.scripts.start;
          }
        } catch {}
      }
    }

    // 4. Runtime & Package Manager Detection
    if (primaryPkg || packageJsonPaths.some(p => fs.existsSync(p))) {
      analysis.runtime = 'nodejs';
      if (fs.existsSync(path.join(codeDir, 'pnpm-lock.yaml'))) {
        analysis.packageManager = 'pnpm';
        analysis.lockfileDetected = true;
      } else if (fs.existsSync(path.join(codeDir, 'yarn.lock'))) {
        analysis.packageManager = 'yarn';
        analysis.lockfileDetected = true;
      } else if (fs.existsSync(path.join(codeDir, 'bun.lockb'))) {
        analysis.packageManager = 'npm'; // fallback to npm for standard execution
        analysis.lockfileDetected = true;
      } else if (fs.existsSync(path.join(codeDir, 'package-lock.json'))) {
        analysis.packageManager = 'npm';
        analysis.lockfileDetected = true;
      } else {
        analysis.packageManager = 'npm';
        analysis.lockfileDetected = false;
      }
    } else if (fs.existsSync(path.join(codeDir, 'requirements.txt')) || fs.existsSync(path.join(codeDir, 'pyproject.toml'))) {
      analysis.runtime = 'python';
      analysis.packageManager = 'pip';
      analysis.language = 'python';
    }

    // 5. Language Detection
    const hasTsConfig = fs.existsSync(path.join(codeDir, 'tsconfig.json')) ||
      allFiles.some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    if (hasTsConfig) {
      analysis.language = 'typescript';
    } else if (analysis.runtime === 'nodejs') {
      analysis.language = 'javascript';
    }

    // 6. Framework Detection
    const allDeps = { ...analysis.dependencies, ...analysis.devDependencies };
    if (allDeps['next']) {
      analysis.framework = 'Next.js';
    } else if (allDeps['vite'] || fs.existsSync(path.join(codeDir, 'vite.config.ts')) || fs.existsSync(path.join(codeDir, 'vite.config.js'))) {
      analysis.framework = allDeps['react'] ? 'React + Vite' : allDeps['vue'] ? 'Vue + Vite' : 'Vite';
    } else if (allDeps['react']) {
      analysis.framework = 'React';
    } else if (allDeps['vue']) {
      analysis.framework = 'Vue';
    } else if (allDeps['@angular/core']) {
      analysis.framework = 'Angular';
    } else if (allDeps['svelte']) {
      analysis.framework = 'Svelte';
    } else if (allDeps['express'] || allDeps['@nestjs/core'] || allDeps['koa']) {
      analysis.framework = allDeps['@nestjs/core'] ? 'NestJS' : 'Express.js';
    } else if (analysis.runtime === 'python') {
      if (allFiles.some(f => f.includes('fastapi'))) analysis.framework = 'FastAPI';
      else if (allFiles.some(f => f.includes('django'))) analysis.framework = 'Django';
      else if (allFiles.some(f => f.includes('flask'))) analysis.framework = 'Flask';
      else analysis.framework = 'Python Script';
    }

    // 7. Platform Origin Detection (Lovable, Emergent, Bolt, Replit, Generic)
    if (
      allDeps['lovable-tagger'] ||
      fs.existsSync(path.join(codeDir, 'lovable.json')) ||
      fs.existsSync(path.join(codeDir, '.lovable')) ||
      allFiles.some(f => f.toLowerCase().includes('lovable'))
    ) {
      detectedOrigin = 'lovable';
    } else if (
      allDeps['@bolt/sdk'] ||
      fs.existsSync(path.join(codeDir, '.bolt')) ||
      allFiles.some(f => f.toLowerCase().includes('.bolt'))
    ) {
      detectedOrigin = 'bolt';
    } else if (
      fs.existsSync(path.join(codeDir, '.replit')) ||
      fs.existsSync(path.join(codeDir, 'replit.nix'))
    ) {
      detectedOrigin = 'replit';
    } else if (
      allFiles.some(f => f.toLowerCase().includes('emergent')) ||
      allDeps['emergent-sdk']
    ) {
      detectedOrigin = 'emergent';
    }

    // 8. Entrypoints Detection
    const frontendCandidates = [
      'index.html',
      'src/main.tsx',
      'src/main.jsx',
      'src/index.tsx',
      'src/index.jsx',
      'src/App.tsx',
      'src/App.jsx',
      'frontend/src/main.tsx',
      'frontend/index.html',
    ];
    for (const fc of frontendCandidates) {
      if (fs.existsSync(path.join(codeDir, fc))) {
        analysis.entrypoints.frontend = fc;
        break;
      }
    }

    const backendCandidates = [
      'server.js',
      'server.ts',
      'backend/server.js',
      'backend/server.ts',
      'backend/index.js',
      'src/server.ts',
      'src/server.js',
      'api/index.ts',
      'api/index.js',
      'app.py',
      'main.py',
      'backend/app.py',
    ];
    for (const bc of backendCandidates) {
      if (fs.existsSync(path.join(codeDir, bc))) {
        analysis.entrypoints.backend = bc;
        break;
      }
    }

    if (primaryPkg?.main && fs.existsSync(path.join(codeDir, primaryPkg.main))) {
      analysis.entrypoints.root = primaryPkg.main;
    } else if (analysis.entrypoints.frontend) {
      analysis.entrypoints.root = analysis.entrypoints.frontend;
    } else if (analysis.entrypoints.backend) {
      analysis.entrypoints.root = analysis.entrypoints.backend;
    }

    // 9. Database & Service Detection
    if (allDeps['@supabase/supabase-js'] || allDeps['supabase']) {
      analysis.databaseDetected = 'Supabase';
      detectedServices.push('Supabase Backend Database');
    } else if (allDeps['mongoose'] || allDeps['mongodb']) {
      analysis.databaseDetected = 'MongoDB';
      detectedServices.push('MongoDB Database');
    } else if (allDeps['pg'] || allDeps['postgres'] || allDeps['prisma'] || allDeps['drizzle-orm']) {
      analysis.databaseDetected = 'PostgreSQL';
      detectedServices.push('PostgreSQL Database');
    } else if (allDeps['better-sqlite3'] || allDeps['sqlite3'] || allDeps['sqlite']) {
      analysis.databaseDetected = 'SQLite';
      detectedServices.push('Embedded SQLite');
    } else if (allDeps['firebase'] || allDeps['@firebase/firestore']) {
      analysis.databaseDetected = 'Firebase Firestore';
      detectedServices.push('Firebase Cloud Database');
    }

    if (allDeps['redis'] || allDeps['ioredis']) {
      detectedServices.push('Redis Cache / Queue');
    }

    // 10. Authentication Detection
    if (allDeps['@supabase/supabase-js']) {
      analysis.authDetected = 'Supabase Auth';
    } else if (allDeps['@clerk/clerk-react'] || allDeps['@clerk/nextjs']) {
      analysis.authDetected = 'Clerk Authentication';
    } else if (allDeps['firebase'] && allFiles.some(f => f.includes('auth'))) {
      analysis.authDetected = 'Firebase Auth';
    } else if (allDeps['next-auth']) {
      analysis.authDetected = 'NextAuth.js';
    } else if (allDeps['jsonwebtoken'] || allDeps['jose']) {
      analysis.authDetected = 'JWT Bearer Authentication';
    }

    // 11. Referenced Environment Variables Scanner
    const envVarsSet = new Set<string>();
    const envFiles = ['.env', '.env.example', '.env.local', '.env.development'];
    for (const ef of envFiles) {
      const efPath = path.join(codeDir, ef);
      if (fs.existsSync(efPath)) {
        try {
          const lines = fs.readFileSync(efPath, 'utf-8').split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
              const key = trimmed.split('=')[0].trim();
              if (key) envVarsSet.add(key);
            }
          }
        } catch {}
      }
    }

    // Regex scan code files for process.env or import.meta.env
    const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.py'];
    for (const relPath of allFiles.slice(0, 80)) {
      if (codeExts.some(ext => relPath.endsWith(ext))) {
        try {
          const content = fs.readFileSync(path.join(codeDir, relPath), 'utf-8');
          const matches = content.matchAll(/(?:process\.env\.|import\.meta\.env\.)([A-Z0-9_]{3,})/g);
          for (const m of matches) {
            if (m[1]) envVarsSet.add(m[1]);
          }
        } catch {}
      }
    }
    analysis.referencedEnvVars = Array.from(envVarsSet);

    // Identify missing required environment variables or credentials
    for (const ev of analysis.referencedEnvVars) {
      const isSensitive = ev.includes('KEY') || ev.includes('SECRET') || ev.includes('TOKEN') || ev.includes('PASSWORD') || ev.includes('DATABASE_URL');
      if (isSensitive) {
        missingRequirements.push(`Environment secret [${ev}] is referenced in source code.`);
      }
    }

    // 12. Existing Test Files
    analysis.existingTestFiles = allFiles.filter(f =>
      f.includes('.test.') ||
      f.includes('.spec.') ||
      f.includes('__tests__') ||
      f.startsWith('tests/') ||
      f.startsWith('test_')
    );

    // 13. Application Capabilities Analysis
    const capabilities = new Set<string>();
    const fileText = allFiles.join(' ').toLowerCase();

    if (fileText.includes('todo') || fileText.includes('task') || fileText.includes('kanban')) {
      capabilities.add('Task Management & Todo Tracking');
    }
    if (fileText.includes('cart') || fileText.includes('product') || fileText.includes('shop') || fileText.includes('checkout')) {
      capabilities.add('E-commerce & Product Catalog');
    }
    if (fileText.includes('chart') || fileText.includes('dashboard') || fileText.includes('metric') || fileText.includes('analytics')) {
      capabilities.add('Metrics Dashboard & Data Visualizations');
    }
    if (fileText.includes('login') || fileText.includes('auth') || fileText.includes('signup') || fileText.includes('user')) {
      capabilities.add('User Authentication & Session Management');
    }
    if (analysis.entrypoints.frontend) {
      capabilities.add('Interactive Web UI');
      capabilities.add('Responsive Layout (Desktop & Mobile)');
    }
    if (analysis.entrypoints.backend || allDeps['express'] || allDeps['fastapi']) {
      capabilities.add('Backend REST API');
    }
    if (capabilities.size === 0) {
      capabilities.add('General Web Application');
    }
    analysis.likelyCapabilities = Array.from(capabilities);

    // 14. Supported Runtime Check
    if (analysis.runtime === 'unknown' && !analysis.entrypoints.frontend && !analysis.entrypoints.backend) {
      analysis.supportedRuntime = false;
      analysis.unsupportedReasons?.push('No supported Node.js or Python runtime manifests (package.json, requirements.txt) detected.');
    }

    return {
      analysis,
      detectedOrigin,
      detectedServices,
      missingRequirements,
    };
  }

  /**
   * Helper to scan directories recursively up to maxDepth and maxFiles
   */
  private static getFilesRecursive(dir: string, maxDepth = 4, maxFiles = 500, currentDepth = 0): string[] {
    if (currentDepth > maxDepth) return [];
    let results: string[] = [];
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (results.length >= maxFiles) break;
        if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist' || item.name === 'build' || item.name === '.next') {
          continue;
        }
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          const sub = this.getFilesRecursive(fullPath, maxDepth, maxFiles - results.length, currentDepth + 1);
          results = results.concat(sub.map(s => path.join(item.name, s).replace(/\\/g, '/')));
        } else {
          results.push(item.name);
        }
      }
    } catch {}
    return results;
  }
}
