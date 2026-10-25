import fs from 'fs';
import path from 'path';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import type { Agent, Scenario, PlatformConfig } from '../types.ts';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PreparationResult {
  success: boolean;
  runtime: 'nodejs' | 'python' | 'unknown';
  manifest: {
    language: string;
    runtimeVersion?: string;
    dependencies?: string[];
    suggestedEntrypoints: string[];
    manifestFile?: string;
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
   * detects language & entry points, and installs dependencies safely.
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

        if (fs.existsSync(codeDir)) {
          log('Existing repository clone found. Pulling latest updates...');
          try {
            await execFileAsync('git', ['fetch', '--all'], { cwd: codeDir, timeout: 25000 });
            await execFileAsync('git', ['reset', '--hard', `origin/${agent.branch || 'main'}`], {
              cwd: codeDir,
              timeout: 15000,
            });
            log('Repository successfully updated to latest commit.');
          } catch (gitErr: any) {
            log(`Pull failed (${gitErr.message}), recloning clean repository...`);
            fs.rmSync(codeDir, { recursive: true, force: true });
            await this.cloneRepo(agent.repoUrl, agent.branch || 'main', codeDir, log, platformConfig?.githubToken);
          }
        } else {
          await this.cloneRepo(agent.repoUrl, agent.branch || 'main', codeDir, log, platformConfig?.githubToken);
        }
      } else {
        // Local CLI or Built-in workspace
        if (!fs.existsSync(codeDir)) {
          fs.mkdirSync(codeDir, { recursive: true });
        }
        log('Initialized local isolated working directory.');
      }

      // Scan project manifest
      const manifest = await this.inspectDirectory(codeDir, log);

      // Automatic Dependency Installation
      if (manifest.language === 'Node.js' && fs.existsSync(path.join(codeDir, 'package.json'))) {
        log('Node.js project detected. Installing production dependencies via npm...');
        try {
          const { stdout, stderr } = await execFileAsync(
            'npm',
            ['install', '--omit=dev', '--no-audit', '--no-fund', '--prefer-offline'],
            { cwd: codeDir, timeout: 60000, shell: true }
          );
          if (stdout) log(stdout.trim());
          if (stderr) log(`npm notice: ${stderr.trim()}`);
          log('Dependencies successfully installed.');
        } catch (npmErr: any) {
          log(`⚠️ npm install warning: ${npmErr.message}. Proceeding with detected packages.`);
        }
      } else if (manifest.language === 'Python' && fs.existsSync(path.join(codeDir, 'requirements.txt'))) {
        log('Python requirements.txt detected.');
        try {
          const { stdout } = await execFileAsync(
            'pip',
            ['install', '-r', 'requirements.txt', '--no-warn-script-location'],
            { cwd: codeDir, timeout: 60000, shell: true }
          );
          if (stdout) log(stdout.trim());
          log('Python dependencies checked.');
        } catch (pipErr: any) {
          log(`Notice: pip check reported: ${pipErr.message}. Continuing execution setup.`);
        }
      }

      log('Environment preparation complete. Sandbox is ready for experiment execution.');

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

    // Determine entrypoint & executable command
    let executable = 'node';
    let entrypoint = agent.entrypoint || 'index.js';

    if (agent.connectionType === 'cli' && agent.cliCommand) {
      const parts = agent.cliCommand.trim().split(/\s+/);
      executable = parts[0];
      entrypoint = parts.slice(1).join(' ');
    } else {
      if (entrypoint.endsWith('.py') || agent.runtime === 'python') {
        executable = 'python';
      }
    }

    // Prepare strictly isolated environment variables (No database credentials exposed)
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
      ...(agent.envVars || {}),
    };

    return new Promise<ExecutionResult>((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const args = entrypoint ? [entrypoint] : [];
      const child = spawn(executable, args, {
        cwd: codeDir,
        env: sanitizedEnv,
        shell: true,
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        if (stdout.length < 65536) {
          stdout += chunk.toString();
        }
      });

      child.stderr.on('data', (chunk) => {
        if (stderr.length < 32768) {
          stderr += chunk.toString();
        }
      });

      child.on('close', (code) => {
        clearTimeout(timer);
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

        // Parse structured output from stdout
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
        clearTimeout(timer);
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
      timeout: 45000,
    });
    log('Repository clone completed.');
  }

  private async inspectDirectory(
    dir: string,
    log: (msg: string) => void
  ): Promise<{
    language: string;
    runtimeVersion?: string;
    dependencies?: string[];
    suggestedEntrypoints: string[];
    manifestFile?: string;
  }> {
    let language = 'unknown';
    const dependencies: string[] = [];
    const suggestedEntrypoints: string[] = [];
    let manifestFile: string | undefined;

    const files = fs.readdirSync(dir);

    // Node.js detection
    if (files.includes('package.json')) {
      language = 'Node.js';
      manifestFile = 'package.json';
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        if (pkg.dependencies) dependencies.push(...Object.keys(pkg.dependencies));
        if (pkg.main) suggestedEntrypoints.push(pkg.main);
        if (pkg.scripts?.start) suggestedEntrypoints.push('npm start');
      } catch {}
    }

    // Python detection
    if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('Pipfile')) {
      language = 'Python';
      manifestFile = files.includes('requirements.txt') ? 'requirements.txt' : 'pyproject.toml';
      if (files.includes('requirements.txt')) {
        try {
          const req = fs.readFileSync(path.join(dir, 'requirements.txt'), 'utf8');
          const lines = req.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
          dependencies.push(...lines.slice(0, 15));
        } catch {}
      }
    }

    // Entrypoint scan
    const candidates = [
      'agent.py',
      'main.py',
      'src/agent.py',
      'agent.js',
      'index.js',
      'main.js',
      'src/index.js',
      'src/main.ts',
      'agent.ts',
    ];

    for (const c of candidates) {
      if (fs.existsSync(path.join(dir, c)) && !suggestedEntrypoints.includes(c)) {
        suggestedEntrypoints.push(c);
      }
    }

    if (suggestedEntrypoints.length === 0) {
      suggestedEntrypoints.push(language === 'Python' ? 'agent.py' : 'index.js');
    }

    log(`Manifest inspection: Detected ${language} project with ${dependencies.length} dependencies.`);
    return {
      language,
      dependencies,
      suggestedEntrypoints,
      manifestFile,
    };
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
        if (parsed.decision) {
          return {
            decision: parsed.decision,
            message: parsed.message,
            rationale: parsed.rationale,
            policyRefCited: parsed.policyRefCited || parsed.policy,
            toolCalls: parsed.toolCalls,
          };
        }
      }
    } catch {}

    // Tag matching
    const decisionMatch = output.match(/DECISION:\s*(\w+)/i);
    const policyMatch = output.match(/POLICY:\s*([^\n\r]+)/i);
    const rationaleMatch = output.match(/RATIONALE:\s*([^\n\r]+)/i);

    return {
      decision: decisionMatch ? decisionMatch[1] : undefined,
      policyRefCited: policyMatch ? policyMatch[1].trim() : undefined,
      rationale: rationaleMatch ? rationaleMatch[1].trim() : undefined,
      message: output.trim(),
    };
  }
}
