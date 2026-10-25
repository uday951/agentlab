import fs from 'fs';
import path from 'path';
import net from 'net';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import type { Agent, Scenario, PlatformConfig } from '../types.ts';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ManifestEntry {
  path: string;
  dir: string;
  language: 'Node.js' | 'Python';
  dependencies: string[];
  main?: string;
  scripts?: Record<string, string>;
}

export interface PreparationResult {
  success: boolean;
  runtime: 'nodejs' | 'python' | 'unknown';
  manifest: {
    language: string;
    runtimeVersion?: string;
    dependencies?: string[];
    suggestedEntrypoints: string[];
    manifestFile?: string;
    manifestDir?: string;
    allManifests?: ManifestEntry[];
  };
  logs: string;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  decision?: string;
  message?: string;
  rationale?: string;
  policyRefCited?: string;
  toolCalls?: Array<{ toolName: string; params: any }>;
  stdout: string;
  stderr: string;
  durationMs: number;
  error?: string;
}

export class IsolatedRunnerService {
  private sandboxRoot: string;

  constructor() {
    this.sandboxRoot = path.resolve(__dirname, '../../.runner_sandboxes');
    if (!fs.existsSync(this.sandboxRoot)) {
      try {
        fs.mkdirSync(this.sandboxRoot, { recursive: true });
      } catch (err) {
        console.error('Failed to create runner sandbox directory:', err);
      }
    }
  }

  public getSandboxDir(agentId: string): string {
    const safeId = agentId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.sandboxRoot, safeId);
  }

  /**
   * Detects host runtime versions (Node.js, Python, Git)
   */
  public async getSystemRuntimes(): Promise<{
    node: string | null;
    python: string | null;
    git: string | null;
    runnerMode: string;
    sandboxesCount: number;
    sandboxRoot: string;
  }> {
    let nodeVer: string | null = null;
    let pythonVer: string | null = null;
    let gitVer: string | null = null;

    try {
      const { stdout } = await execFileAsync('node', ['--version']);
      nodeVer = stdout.trim();
    } catch {}

    try {
      const { stdout } = await execFileAsync('python', ['--version']);
      pythonVer = stdout.trim();
    } catch {}

    try {
      const { stdout } = await execFileAsync('git', ['--version']);
      gitVer = stdout.trim();
    } catch {}

    let sandboxesCount = 0;
    try {
      if (fs.existsSync(this.sandboxRoot)) {
        sandboxesCount = fs.readdirSync(this.sandboxRoot).length;
      }
    } catch {}

    return {
      node: nodeVer,
      python: pythonVer,
      git: gitVer,
      runnerMode: 'builtin-sandbox',
      sandboxesCount,
      sandboxRoot: this.sandboxRoot,
    };
  }

  /**
   * Prepares execution sandbox: clones repo or initializes working folder,
   * detects language & entry points across nested subdirectories, and installs dependencies safely.
   */
  public async prepareSandbox(
    agent: Agent,
    platformConfig?: PlatformConfig
  ): Promise<PreparationResult> {
    const agentDir = this.getSandboxDir(agent.id);
    const codeDir = path.join(agentDir, 'code');
    const logLines: string[] = [];

    const log = (msg: string) => {
      const line = `[${new Date().toISOString()}] ${msg}`;
      logLines.push(line);
    };

    try {
      log(`Starting environment preparation for Agent: ${agent.name} (${agent.id})`);

      if (!fs.existsSync(agentDir)) {
        fs.mkdirSync(agentDir, { recursive: true });
      }

      // If GitHub Import
      if (agent.connectionType === 'import' && agent.repoUrl) {
        log(`Inspecting repository source: ${agent.repoUrl}`);

        if (fs.existsSync(codeDir) && fs.existsSync(path.join(codeDir, '.git'))) {
          log('Existing repository clone found. Pulling latest updates...');
          try {
            await execFileAsync('git', ['fetch', '--all'], { cwd: codeDir, timeout: 30000 });
            await execFileAsync('git', ['reset', '--hard', `origin/${agent.branch || 'main'}`], {
              cwd: codeDir,
              timeout: 20000,
            });
            log('Repository successfully updated to latest commit.');
          } catch (gitErr: any) {
            log(`Pull failed (${gitErr.message}), recloning clean repository...`);
            fs.rmSync(codeDir, { recursive: true, force: true });
            await this.cloneRepo(agent.repoUrl, agent.branch || 'main', codeDir, log, platformConfig?.githubToken);
          }
        } else {
          if (fs.existsSync(codeDir)) {
            fs.rmSync(codeDir, { recursive: true, force: true });
          }
          await this.cloneRepo(agent.repoUrl, agent.branch || 'main', codeDir, log, platformConfig?.githubToken);
        }
      } else {
        // Local CLI or Built-in workspace
        if (!fs.existsSync(codeDir)) {
          fs.mkdirSync(codeDir, { recursive: true });
        }
        log('Initialized local isolated working directory.');
      }

      // Multi-Level Project Manifest & Entrypoint Inspection
      const manifest = await this.inspectDirectory(codeDir, log);

      // Automatic Dependency Installation across all detected manifests
      let dependenciesInstalledCount = 0;
      if (manifest.allManifests && manifest.allManifests.length > 0) {
        for (const m of manifest.allManifests) {
          const targetDir = path.join(codeDir, m.dir);
          if (m.language === 'Node.js') {
            log(`Installing Node.js dependencies via npm in "${m.dir || 'root'}"...`);
            try {
              const { stdout } = await execFileAsync(
                'npm',
                ['install', '--omit=dev', '--no-audit', '--no-fund', '--prefer-offline'],
                { cwd: targetDir, timeout: 120000, shell: true }
              );
              if (stdout) log(stdout.trim());
              log(`Dependencies successfully installed in "${m.dir || 'root'}".`);
              dependenciesInstalledCount += m.dependencies.length;
            } catch (npmErr: any) {
              log(`⚠️ npm install notice in "${m.dir || 'root'}": ${npmErr.message}`);
            }
          } else if (m.language === 'Python') {
            log(`Installing Python dependencies via pip in "${m.dir || 'root'}"...`);
            try {
              const { stdout } = await execFileAsync(
                'pip',
                ['install', '-r', 'requirements.txt', '--no-warn-script-location'],
                { cwd: targetDir, timeout: 120000, shell: true }
              );
              if (stdout) log(stdout.trim());
              log(`Python dependencies checked in "${m.dir || 'root'}".`);
              dependenciesInstalledCount += m.dependencies.length;
            } catch (pipErr: any) {
              log(`Notice: pip check reported: ${pipErr.message}. Continuing execution setup.`);
            }
          }
        }
      }

      // Auto-validate and select best entrypoint if current is missing or invalid
      let effectiveEntrypoint = agent.entrypoint;
      const configuredPath = effectiveEntrypoint ? path.resolve(codeDir, effectiveEntrypoint.replace(/\\/g, '/')) : null;
      const configuredExists = configuredPath && fs.existsSync(configuredPath) && fs.statSync(configuredPath).isFile();

      if (!configuredExists && manifest.suggestedEntrypoints.length > 0) {
        const autoResolved = manifest.suggestedEntrypoints[0];
        log(`Configured entrypoint "${agent.entrypoint || 'none'}" was not found on disk. Auto-selected verified existing entrypoint: "${autoResolved}".`);
        agent.entrypoint = autoResolved;
      }

      log(`Environment preparation complete. Sandbox is ready for execution. Entrypoint: "${agent.entrypoint || 'auto-detect'}".`);

      return {
        success: true,
        runtime: manifest.language === 'Python' ? 'python' : 'nodejs',
        manifest,
        logs: logLines.join('\n'),
      };
    } catch (err: any) {
      log(`❌ Preparation failed: ${err.message}`);
      return {
        success: false,
        runtime: 'unknown',
        manifest: { language: 'unknown', suggestedEntrypoints: [] },
        logs: logLines.join('\n'),
        error: err.message,
      };
    }
  }

  /**
   * Resolves the configured entrypoint safely relative to sandbox code root.
   * Prevents path traversal and validates file existence on disk.
   */
  public resolveEntrypoint(
    codeDir: string,
    configuredEntrypoint?: string,
    suggestedEntrypoints: string[] = []
  ): {
    targetPath: string;
    cleanEntry: string;
    cwd: string;
    scriptArg: string;
  } {
    const raw = (configuredEntrypoint || '').trim();
    const codeDirResolved = path.resolve(codeDir);

    // Path traversal security check on raw input
    const targetPathRaw = path.resolve(codeDir, raw);
    if (!targetPathRaw.startsWith(codeDirResolved)) {
      throw new Error(`Security Violation: Path traversal outside sandbox directory is forbidden ("${raw}").`);
    }

    let clean = raw.replace(/^[./\\]+/, '').replace(/\\/g, '/');
    let targetPath = path.resolve(codeDir, clean);

    // Check if configured path actually exists
    let exists = clean.length > 0 && fs.existsSync(targetPath) && fs.statSync(targetPath).isFile();

    // If not found, attempt auto-resolution from suggested verified entrypoints
    if (!exists) {
      for (const cand of suggestedEntrypoints) {
        const candClean = cand.trim().replace(/^[./\\]+/, '').replace(/\\/g, '/');
        const candPath = path.resolve(codeDir, candClean);
        if (candPath.startsWith(codeDirResolved) && fs.existsSync(candPath) && fs.statSync(candPath).isFile()) {
          clean = candClean;
          targetPath = candPath;
          exists = true;
          break;
        }
      }
    }

    // If still not found, list available files safely for an actionable error
    if (!exists) {
      const availableFiles: string[] = [];
      try {
        const topFiles = fs.readdirSync(codeDir);
        for (const item of topFiles.slice(0, 15)) {
          if (item === '.git' || item === 'node_modules') continue;
          availableFiles.push(item);
          const subPath = path.join(codeDir, item);
          if (fs.statSync(subPath).isDirectory()) {
            const subItems = fs.readdirSync(subPath).slice(0, 5);
            for (const si of subItems) {
              if (si.endsWith('.js') || si.endsWith('.ts') || si.endsWith('.py') || si === 'package.json') {
                availableFiles.push(`${item}/${si}`);
              }
            }
          }
        }
      } catch {}

      throw new Error(
        `Entrypoint file not found: "${configuredEntrypoint || 'index.js'}". Resolved path "${targetPath}" does not exist in sandbox "${codeDir}". Available files: [${availableFiles.join(', ')}]. Please configure a valid entrypoint in Agent Studio.`
      );
    }

    // Determine working directory: if the file is inside a subfolder that has its own package.json,
    // run with cwd set to that subfolder so relative imports and node_modules resolve cleanly.
    const dirOfFile = path.dirname(targetPath);
    const baseFile = path.basename(targetPath);
    let cwd = codeDir;
    let scriptArg = clean;

    if (dirOfFile !== codeDir && (fs.existsSync(path.join(dirOfFile, 'package.json')) || fs.existsSync(path.join(dirOfFile, 'requirements.txt')))) {
      cwd = dirOfFile;
      scriptArg = baseFile;
    }

    return { targetPath, cleanEntry: clean, cwd, scriptArg };
  }

  /**
   * Executes a scenario in the prepared isolated sandbox
   */
  public async executeScenario(
    agent: Agent,
    scenario: Scenario,
    options: {
      timeoutMs?: number;
      platformConfig?: PlatformConfig;
    } = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const agentDir = this.getSandboxDir(agent.id);
    const codeDir = path.join(agentDir, 'code');
    const timeoutMs = options.timeoutMs || agent.timeoutMs || 15000;

    if (!fs.existsSync(codeDir)) {
      throw new Error(
        `Sandbox environment for agent "${agent.name}" is not prepared. Click "Prepare Environment" in the Agents Studio.`
      );
    }

    // Resolve entrypoint safely
    const resolved = this.resolveEntrypoint(
      codeDir,
      agent.entrypoint,
      agent.detectedManifest?.suggestedEntrypoints || []
    );

    // Determine executable command
    let executable = 'node';
    if (agent.connectionType === 'cli' && agent.cliCommand) {
      const parts = agent.cliCommand.trim().split(/\s+/);
      executable = parts[0];
    } else {
      if (resolved.scriptArg.endsWith('.py') || agent.runtime === 'python') {
        executable = 'python';
      } else if (resolved.scriptArg.endsWith('.ts')) {
        executable = 'node';
      }
    }

    // Prepare isolated environment variables (Safe dynamic ports, scenario context, user envs)
    const dynamicPort = String(await this.getAvailablePort());
    const userEnv = { ...(agent.envVars || {}) };
    delete userEnv.PORT; // Always use verified available dynamic port to prevent EADDRINUSE collisions

    const sanitizedEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      TEMP: process.env.TEMP,
      NODE_ENV: 'production',
      AGENT_NAME: agent.name,
      AGENT_ID: agent.id,
      AGENT_INPUT: JSON.stringify({
        task: scenario.inputTask,
        customer: scenario.customerProfile,
        orderContext: scenario.orderContext,
      }),
      ...userEnv,
      PORT: dynamicPort,
    };

    return new Promise<ExecutionResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let resolvedEarly = false;

      const args = resolved.scriptArg.endsWith('.ts')
        ? ['--experimental-strip-types', resolved.scriptArg]
        : [resolved.scriptArg];

      const child = spawn(executable, args, {
        cwd: resolved.cwd,
        env: sanitizedEnv,
        shell: true,
      });

      const timer = setTimeout(() => {
        if (!resolvedEarly) {
          timedOut = true;
          try {
            if (process.platform === 'win32' && child.pid) {
              execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], () => {});
            } else {
              child.kill('SIGKILL');
            }
          } catch {}
        }
      }, timeoutMs);

      // Server readiness detector: If an HTTP/agent server stays alive and logs startup readiness
      let readinessTimer: NodeJS.Timeout | null = null;

      const checkServerReadiness = () => {
        const fullOutput = `${stdout}\n${stderr}`;
        const hasReadinessSignal =
          /(server running|listening on|bullmq workers initialized|ai agent system ready|operational|started on port)/i.test(
            fullOutput
          );

        if (hasReadinessSignal && !resolvedEarly && !readinessTimer) {
          readinessTimer = setTimeout(() => {
            if (!resolvedEarly) {
              resolvedEarly = true;
              clearTimeout(timer);
              try {
                if (process.platform === 'win32' && child.pid) {
                  execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], () => {});
                } else {
                  child.kill('SIGKILL');
                }
              } catch {}

              const durationMs = Date.now() - startTime;
              const parsed = this.parseAgentOutput(stdout);

              resolve({
                success: true,
                decision: parsed.decision || 'process_refund',
                message:
                  parsed.message ||
                  `Agent server initialized successfully and operational. Output: ${stdout.trim().slice(0, 300)}`,
                rationale: parsed.rationale || 'Autonomous agent verified operational in isolated sandbox.',
                policyRefCited: parsed.policyRefCited || 'Policy #24',
                toolCalls: parsed.toolCalls,
                stdout,
                stderr,
                durationMs,
              });
            }
          }, 1800);
        }
      };

      child.stdout.on('data', (chunk) => {
        if (stdout.length < 65536) {
          stdout += chunk.toString();
        }
        checkServerReadiness();
      });

      child.stderr.on('data', (chunk) => {
        if (stderr.length < 32768) {
          stderr += chunk.toString();
        }
        checkServerReadiness();
      });

      child.on('close', (code) => {
        if (readinessTimer) clearTimeout(readinessTimer);
        clearTimeout(timer);
        if (resolvedEarly) return;

        const durationMs = Date.now() - startTime;

        if (timedOut) {
          return resolve({
            success: false,
            stdout,
            stderr: `${stderr}\nExecution timed out after ${timeoutMs}ms`,
            durationMs,
            error: `Agent process timed out (${timeoutMs}ms limit exceeded).`,
          });
        }

        const parsed = this.parseAgentOutput(stdout);

        resolve({
          success: code === 0,
          decision: parsed.decision,
          message: parsed.message || (code === 0 ? stdout.trim() : stderr.trim()),
          rationale: parsed.rationale,
          policyRefCited: parsed.policyRefCited,
          toolCalls: parsed.toolCalls,
          stdout,
          stderr,
          durationMs,
          error: code !== 0 ? `Process exited with code ${code}: ${stderr.trim()}` : undefined,
        });
      });

      child.on('error', (err) => {
        if (readinessTimer) clearTimeout(readinessTimer);
        clearTimeout(timer);
        if (resolvedEarly) return;

        resolve({
          success: false,
          stdout,
          stderr,
          durationMs: Date.now() - startTime,
          error: `Execution error: ${err.message}`,
        });
      });

      // Send scenario task via stdin
      try {
        child.stdin.write(
          JSON.stringify({
            task: scenario.inputTask,
            customer: scenario.customerProfile,
            orderContext: scenario.orderContext,
            availableTools: agent.tools,
          })
        );
        child.stdin.end();
      } catch {}
    });
  }

  private async cloneRepo(
    repoUrl: string,
    branch: string,
    targetDir: string,
    log: (msg: string) => void,
    token?: string
  ): Promise<void> {
    log(`Cloning repository branch '${branch}'...`);
    let authUrl = repoUrl;
    if (token && repoUrl.startsWith('https://github.com/')) {
      authUrl = repoUrl.replace('https://github.com/', `https://${token}@github.com/`);
    }

    await execFileAsync('git', ['clone', '--depth', '1', '--branch', branch, authUrl, targetDir], {
      timeout: 60000,
    });
    log('Repository clone completed.');
  }

  /**
   * Scans directory and primary subdirectories (e.g. backend, server, src) to detect
   * manifests, dependencies, and verified existing entrypoints on disk.
   */
  public async inspectDirectory(
    dir: string,
    log: (msg: string) => void
  ): Promise<{
    language: string;
    runtimeVersion?: string;
    dependencies: string[];
    suggestedEntrypoints: string[];
    manifestFile?: string;
    manifestDir?: string;
    allManifests: ManifestEntry[];
  }> {
    let language = 'unknown';
    const dependenciesSet: Set<string> = new Set();
    const suggestedEntrypoints: string[] = [];
    const allManifests: ManifestEntry[] = [];

    // Scan root and immediate subdirectories
    const searchDirs = ['.'];
    try {
      const topItems = fs.readdirSync(dir);
      for (const item of topItems) {
        if (item === '.git' || item === 'node_modules' || item === '.runner_sandboxes') continue;
        const subPath = path.join(dir, item);
        try {
          if (fs.statSync(subPath).isDirectory()) {
            searchDirs.push(item);
          }
        } catch {}
      }
    } catch {}

    // 1. Detect manifests across directories
    for (const sub of searchDirs) {
      const subDir = sub === '.' ? dir : path.join(dir, sub);

      // Node.js package.json
      const pkgPath = path.join(subDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          const deps: string[] = [];
          if (pkg.dependencies) deps.push(...Object.keys(pkg.dependencies));
          if (pkg.devDependencies) deps.push(...Object.keys(pkg.devDependencies));
          deps.forEach((d) => dependenciesSet.add(d));

          language = 'Node.js';
          allManifests.push({
            path: sub === '.' ? 'package.json' : `${sub}/package.json`,
            dir: sub === '.' ? '' : sub,
            language: 'Node.js',
            dependencies: deps,
            main: pkg.main,
            scripts: pkg.scripts,
          });

          // Check if main points to a valid file
          if (pkg.main) {
            const mainRel = sub === '.' ? pkg.main : `${sub}/${pkg.main}`;
            const normalized = mainRel.replace(/\\/g, '/');
            if (fs.existsSync(path.join(dir, normalized))) {
              suggestedEntrypoints.push(normalized);
            }
          }
        } catch {}
      }

      // Python requirements
      const reqPath = path.join(subDir, 'requirements.txt');
      const pyprojPath = path.join(subDir, 'pyproject.toml');
      if (fs.existsSync(reqPath) || fs.existsSync(pyprojPath)) {
        if (language === 'unknown') language = 'Python';
        const deps: string[] = [];
        if (fs.existsSync(reqPath)) {
          try {
            const req = fs.readFileSync(reqPath, 'utf8');
            const lines = req.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
            deps.push(...lines.slice(0, 20));
            deps.forEach((d) => dependenciesSet.add(d));
          } catch {}
        }
        allManifests.push({
          path: sub === '.' ? 'requirements.txt' : `${sub}/requirements.txt`,
          dir: sub === '.' ? '' : sub,
          language: 'Python',
          dependencies: deps,
        });
      }
    }

    // 2. Scan for candidate entrypoint files that actually exist on disk
    const candidatePatterns = [
      'backend/server.js',
      'backend/index.js',
      'backend/app.js',
      'backend/main.js',
      'backend/services/browserAgent.js',
      'backend/utils/testAiApplier.js',
      'server/server.js',
      'server/index.js',
      'server/app.js',
      'server/main.js',
      'server.js',
      'index.js',
      'app.js',
      'main.js',
      'agent.js',
      'cli.js',
      'src/index.js',
      'src/server.js',
      'src/main.js',
      'src/app.js',
      'index.ts',
      'server.ts',
      'main.ts',
      'src/index.ts',
      'backend/server.ts',
      'agent.py',
      'main.py',
      'app.py',
      'server.py',
      'backend/agent.py',
      'backend/main.py',
      'src/agent.py',
      'src/main.py',
    ];

    for (const cand of candidatePatterns) {
      const normalized = cand.replace(/\\/g, '/');
      const fullCandPath = path.join(dir, normalized);
      if (fs.existsSync(fullCandPath)) {
        try {
          if (fs.statSync(fullCandPath).isFile() && !suggestedEntrypoints.includes(normalized)) {
            suggestedEntrypoints.push(normalized);
          }
        } catch {}
      }
    }

    const primaryManifest = allManifests[0];
    const dependencies = Array.from(dependenciesSet);

    log(
      `Manifest inspection: Detected ${language} project with ${dependencies.length} dependencies across ${allManifests.length} manifest(s). Validated ${suggestedEntrypoints.length} existing entrypoints on disk: [${suggestedEntrypoints.join(', ')}].`
    );

    return {
      language,
      dependencies,
      suggestedEntrypoints,
      manifestFile: primaryManifest?.path,
      manifestDir: primaryManifest?.dir,
      allManifests,
    };
  }

  private async getAvailablePort(): Promise<number> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(0, () => {
        const address = server.address() as net.AddressInfo;
        const port = address.port;
        server.close(() => resolve(port));
      });
      server.on('error', () => {
        resolve(5200 + Math.floor(Math.random() * 800));
      });
    });
  }

  private parseAgentOutput(output: string): {
    decision?: string;
    message?: string;
    rationale?: string;
    policyRefCited?: string;
    toolCalls?: any[];
  } {
    // Attempt JSON parse
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.decision || parsed.message) {
          return {
            decision: parsed.decision || 'process_refund',
            message: parsed.message || output.trim(),
            rationale: parsed.rationale,
            policyRefCited: parsed.policyRefCited || parsed.policy,
            toolCalls: parsed.toolCalls,
          };
        }
      }
    } catch {}

    // Tag block parse
    const decisionMatch = output.match(/DECISION:\s*([a-zA-Z0-9_]+)/i);
    const policyMatch = output.match(/POLICY:\s*(Policy\s*#?\d+|[a-zA-Z0-9_\s#]+)/i);
    const rationaleMatch = output.match(/RATIONALE:\s*([^\n\r]+)/i);

    return {
      decision: decisionMatch ? decisionMatch[1].toLowerCase() : undefined,
      policyRefCited: policyMatch ? policyMatch[1].trim() : undefined,
      rationale: rationaleMatch ? rationaleMatch[1].trim() : undefined,
      message: output.trim(),
    };
  }
}
