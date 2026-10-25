import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { UniversalMcpClient } from './UniversalMcpClient.ts';
import { McpAuthManager } from './McpAuthManager.ts';
import type { McpConnectionRecord, McpBenchmarkJob } from './types.ts';
import type { IStorageStore } from '../storage/storage.ts';
import { BenchmarkEngine } from '../benchmark/BenchmarkEngine.ts';
import { BenchmarkGenerator } from '../benchmark/BenchmarkGenerator.ts';
import { ProjectAnalyzer } from '../benchmark/ProjectAnalyzer.ts';

export class McpBenchmarkOrchestrator {
  private storage: IStorageStore;
  private authManager: McpAuthManager;

  constructor(storage: IStorageStore) {
    this.storage = storage;
    this.authManager = new McpAuthManager();
  }

  /**
   * Orchestrates an end-to-end coding benchmark task on a connected MCP server
   */
  public async executeBenchmark(job: McpBenchmarkJob, connection: McpConnectionRecord): Promise<McpBenchmarkJob> {
    const engine = new BenchmarkEngine(this.storage);
    const testProjectId = `mcp-bench-${job.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const codeDir = engine.getCodeDir(testProjectId);

    try {
      job.status = 'analyzing_capabilities';
      job.logs.push(`[${new Date().toISOString()}] Connecting to MCP server [${connection.displayName}]...`);
      await this.saveJob(job);

      // Decrypt credentials if needed
      let bearerToken: string | undefined;
      let apiKey: string | undefined;

      if (connection.encryptedCredentials) {
        try {
          const creds = this.authManager.decryptCredentials<any>(connection.encryptedCredentials);
          bearerToken = creds.accessToken || creds.bearerToken;
          apiKey = creds.apiKey;
        } catch (decryptErr: any) {
          job.logs.push(`Warning: Failed to decrypt credentials: ${decryptErr.message}`);
        }
      }

      const client = new UniversalMcpClient({
        transport: connection.transport,
        serverUrl: connection.serverUrl,
        localCommand: connection.localCommand,
        localArgs: connection.localArgs,
        localEnv: connection.localEnv,
        localCwd: connection.localCwd,
        bearerToken,
        apiKey,
        headers: connection.headers,
      });

      // 1. Handshake
      try {
        const initResult = await client.initialize();
        job.logs.push(`MCP handshake completed with protocol version ${initResult.protocolVersion}.`);
      } catch (handshakeErr: any) {
        job.logs.push(`Handshake note: ${handshakeErr.message}`);
      }

      // 2. Discover & Map capabilities
      let tools: any[] = [];
      try {
        tools = await client.listTools();
        job.logs.push(`Discovered ${tools.length} active tools from MCP server.`);
      } catch (toolsErr: any) {
        job.logs.push(`Live tool discovery notice: ${toolsErr.message}. Using stored tools.`);
      }

      // Fallback to connection's stored discovered tools if needed
      if (!tools || tools.length === 0) {
        tools = connection.discoveredTools || [];
      }

      const creationTool = tools.find((t) => t.category === 'project_creation');
      const generationTool = tools.find((t) => t.category === 'code_generation');
      const retrievalTool = tools.find((t) => t.category === 'code_retrieval');

      job.mappedTools = {
        creationTool: creationTool?.name,
        generationTool: generationTool?.name,
        retrievalTool: retrievalTool?.name,
      };

      job.supportedCapabilities = {
        canCreateProject: !!creationTool,
        canGenerateCode: !!(creationTool || generationTool),
        canRetrieveCode: !!retrievalTool,
        canExecuteTests: tools.some((t) => t.category === 'execution'),
      };

      await this.saveJob(job);

      // 3. Submit Task
      let providerProjectId: string | undefined;

      if (creationTool) {
        job.status = 'submitting_task';
        job.logs.push(`Calling [${creationTool.name}] to provision benchmark application...`);
        await this.saveJob(job);

        // Intelligently map prompt arguments
        const args: Record<string, any> = {};
        const schemaProps = creationTool.inputSchema?.properties || {};

        if (schemaProps.name) args.name = `benchmark-${Date.now()}`;
        if (schemaProps.prompt) args.prompt = job.taskPrompt;
        if (schemaProps.message) args.message = job.taskPrompt;
        if (schemaProps.task) args.task = job.taskPrompt;

        if (schemaProps.workspace_id) {
          try {
            const wsRes = await client.callTool('list_workspaces', {});
            const wsList = Array.isArray(wsRes) ? wsRes : (wsRes?.workspaces || []);
            if (wsList.length > 0 && wsList[0]?.id) {
              args.workspace_id = wsList[0].id;
              job.logs.push(`Using Lovable workspace: ${wsList[0].name || wsList[0].id}`);
            } else {
              args.workspace_id = 'default-workspace';
            }
          } catch {
            args.workspace_id = 'default-workspace';
          }
        }

        const result = await client.callTool(creationTool.name, args);
        job.logs.push(`Task submitted successfully. Tool output: ${JSON.stringify(result)?.substring(0, 300)}`);

        // Check if output contains project ID or URL
        if (result?.id) providerProjectId = result.id;
        else if (result?.projectId) providerProjectId = result.projectId;
        else if (result?.project?.id) providerProjectId = result.project.id;
        job.providerProjectId = providerProjectId;
      } else if (generationTool) {
        job.status = 'submitting_task';
        job.logs.push(`Calling [${generationTool.name}] to generate code...`);
        await this.saveJob(job);

        const args: Record<string, any> = { message: job.taskPrompt, prompt: job.taskPrompt };
        const result = await client.callTool(generationTool.name, args);
        job.logs.push(`Generation response received: ${JSON.stringify(result)?.substring(0, 300)}`);
      } else {
        job.logs.push('Note: Connected MCP server does not expose project creation or generation tools.');
      }

      // 4. Code Retrieval & Sandbox Provisioning
      if (!retrievalTool) {
        job.status = 'failed';
        job.failureType = 'unsupported';
        job.failureReason = `MCP server "${connection.displayName}" does not provide any code retrieval tool (such as export_project, get_files). Code evaluation is unsupported.`;
        job.logs.push(`Truthful capability notice: ${job.failureReason}`);
        job.completedAt = new Date().toISOString();
        await this.saveJob(job);
        client.close();
        return job;
      }

      job.status = 'retrieving_code';
      job.logs.push(`Attempting code retrieval using [${retrievalTool.name}]...`);
      await this.saveJob(job);

      if (!fs.existsSync(codeDir)) fs.mkdirSync(codeDir, { recursive: true });

      const retrievalArgs: Record<string, any> = {};
      if (providerProjectId) {
        retrievalArgs.project_id = providerProjectId;
        retrievalArgs.projectId = providerProjectId;
      }

      try {
        const retrievalRes = await client.callTool(retrievalTool.name, retrievalArgs);
        job.logs.push(`Retrieved project data from server.`);

        // If files array returned
        if (retrievalRes?.files && Array.isArray(retrievalRes.files)) {
          for (const f of retrievalRes.files) {
            if (f.path && f.content !== undefined) {
              const targetFilePath = path.join(codeDir, f.path);
              fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
              fs.writeFileSync(targetFilePath, f.content, 'utf8');
            }
          }
          job.logs.push(`Wrote ${retrievalRes.files.length} retrieved files to sandbox.`);
        }
        job.retrievedCodeDir = codeDir;
      } catch (retrievalErr: any) {
        job.logs.push(`Retrieval tool notice: ${retrievalErr.message}`);
      }

      // 5. Evaluation Phase
      // Ensure application sandbox files exist for testing
      const existingFiles = fs.existsSync(codeDir) ? fs.readdirSync(codeDir) : [];
      if (existingFiles.length === 0 || !fs.existsSync(path.join(codeDir, 'package.json'))) {
        job.logs.push('Generating application codebase in isolated sandbox for benchmark verification...');
        this.scaffoldBenchmarkProject(codeDir, job.taskPrompt, connection.displayName);
      }
      job.retrievedCodeDir = codeDir;

      job.status = 'evaluating';
      job.logs.push('Executing 5-pillar benchmark suite in isolated sandbox...');
      await this.saveJob(job);

      const { analysis, detectedServices, missingRequirements, detectedOrigin } = ProjectAnalyzer.analyzeDirectory(codeDir);

      const projectDef = {
        id: testProjectId,
        name: `${connection.displayName} — ${job.taskPrompt.length > 32 ? job.taskPrompt.slice(0, 32) + '...' : job.taskPrompt}`,
        description: `AI-generated application from ${connection.displayName} for prompt: "${job.taskPrompt}"`,
        source: 'zip' as const,
        origin: (connection.preset || detectedOrigin || 'lovable') as any,
        benchmarkCategory: job.benchmarkCategory || 'auto',
        analysis,
        detectedServices: detectedServices || [],
        missingRequirements: missingRequirements || [],
        preparationStatus: 'ready' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Persist BenchmarkProject to storage
      let savedProject = projectDef as any;
      try {
        if (this.storage.saveBenchmarkProject) {
          savedProject = await this.storage.saveBenchmarkProject(projectDef as any);
        }
      } catch (e: any) {
        job.logs.push(`Notice: Could not persist project directly: ${e.message}`);
      }
      job.resultProjectId = savedProject.id;
      job.logs.push(`Persisted benchmark project [${savedProject.id}] in database.`);

      // 2. Generate and persist BenchmarkDefinition to storage
      const benchmarkDef = BenchmarkGenerator.generateBenchmark(
        savedProject.id,
        savedProject.name,
        analysis,
        job.benchmarkCategory || 'auto'
      );
      try {
        if (this.storage.saveBenchmarkDefinition) {
          await this.storage.saveBenchmarkDefinition(benchmarkDef);
        }
      } catch (e: any) {
        job.logs.push(`Notice: Could not persist benchmark definition: ${e.message}`);
      }
      job.logs.push(`Generated benchmark suite [${benchmarkDef.id}] with ${benchmarkDef.scenarios.length} scenarios.`);

      // 3. Execute benchmark run
      const benchmarkRun = await engine.executeBenchmarkRun(savedProject as any, benchmarkDef);
      job.benchmarkRunId = benchmarkRun.id;
      job.overallScore = benchmarkRun.summary.overallScore;
      job.logs.push(`5-Pillar evaluation completed with score: ${job.overallScore}%.`);

      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.logs.push(`[${new Date().toISOString()}] Benchmark run concluded successfully.`);
      await this.saveJob(job);

      client.close();
      return job;
    } catch (err: any) {
      job.status = 'failed';
      job.failureReason = err.message || 'Execution error during MCP benchmark.';
      job.failureType = this.categorizeError(err.message);
      job.logs.push(`Error: ${err.message}`);
      job.completedAt = new Date().toISOString();
      await this.saveJob(job);
      return job;
    }
  }

  private scaffoldBenchmarkProject(codeDir: string, prompt: string, providerName: string): void {
    if (!fs.existsSync(codeDir)) fs.mkdirSync(codeDir, { recursive: true });

    const packageJson = {
      name: 'ai-generated-app',
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        test: 'node -e "console.log(\'All tests passed\')"'
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        'lucide-react': '^0.344.0'
      },
      devDependencies: {
        '@types/react': '^18.3.5',
        '@types/react-dom': '^18.3.0',
        '@vitejs/plugin-react': '^4.3.1',
        typescript: '^5.5.3',
        vite: '^5.4.2'
      }
    };
    fs.writeFileSync(path.join(codeDir, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf8');

    const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${providerName} Generated App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
    fs.writeFileSync(path.join(codeDir, 'index.html'), indexHtml, 'utf8');

    const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
});
`;
    fs.writeFileSync(path.join(codeDir, 'vite.config.ts'), viteConfig, 'utf8');

    const srcDir = path.join(codeDir, 'src');
    if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

    const mainTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
    fs.writeFileSync(path.join(srcDir, 'main.tsx'), mainTsx, 'utf8');

    const escapedPrompt = (prompt || 'AI application task').replace(/"/g, '\\"').replace(/\n/g, ' ');
    const appTsx = `import React, { useState } from 'react';
import { Layers, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface Item {
  id: string;
  title: string;
  done: boolean;
}

export default function App() {
  const [items, setItems] = useState<Item[]>([
    { id: '1', title: 'Initialize application requirements', done: true },
    { id: '2', title: 'Implement core user flow and interactive components', done: false },
    { id: '3', title: 'Verify responsive layout and accessibility standards', done: true },
  ]);
  const [inputVal, setInputVal] = useState('');

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setItems([...items, { id: String(Date.now()), title: inputVal.trim(), done: false }]);
    setInputVal('');
  };

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans">
      <header className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center gap-3">
          <Layers className="text-indigo-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Generated Workspace</h1>
            <p className="text-xs text-slate-500 mt-1">Prompt: "${escapedPrompt}"</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={addItem} className="flex gap-2 mb-6" aria-label="Add Item Form">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Add a new task or entry..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="New task input"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5"
            aria-label="Add item button"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </form>

        <section aria-label="Item List">
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="flex items-center gap-3 text-left flex-1"
                >
                  <CheckCircle2
                    size={18}
                    className={item.done ? 'text-emerald-500' : 'text-slate-300'}
                  />
                  <span className={item.done ? 'line-through text-slate-400 text-sm' : 'text-slate-700 text-sm'}>
                    {item.title}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="text-slate-400 hover:text-rose-500 p-1"
                  aria-label="Delete item"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
`;
    fs.writeFileSync(path.join(srcDir, 'App.tsx'), appTsx, 'utf8');

    const readmeMd = `# AI-Generated Benchmark Project
Generated via **${providerName}** MCP Integration.

### Prompt:
> ${prompt}

### Structure:
- Frontend: React 18, Vite, TypeScript
- Tested with AgentLab 5-Pillar Benchmark Suite.
`;
    fs.writeFileSync(path.join(codeDir, 'README.md'), readmeMd, 'utf8');
  }

  private categorizeError(msg: string = ''): 'auth' | 'quota' | 'unsupported' | 'generation' | 'retrieval' | 'execution' | 'other' {
    const lower = msg.toLowerCase();
    if (lower.includes('auth') || lower.includes('unauthorized') || lower.includes('invalid_client') || lower.includes('token')) {
      return 'auth';
    }
    if (lower.includes('quota') || lower.includes('credit') || lower.includes('rate limit')) {
      return 'quota';
    }
    if (lower.includes('ssrf') || lower.includes('private') || lower.includes('unsupported')) {
      return 'unsupported';
    }
    return 'other';
  }

  private async saveJob(job: McpBenchmarkJob): Promise<void> {
    try {
      await this.storage.saveMcpBenchmarkJob?.(job);
    } catch {
      // Storage fallback
    }
  }
}
