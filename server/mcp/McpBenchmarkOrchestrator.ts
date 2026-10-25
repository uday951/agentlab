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
      const initResult = await client.initialize();
      job.logs.push(`MCP handshake succeeded with protocol version ${initResult.protocolVersion}.`);

      // 2. Discover & Map capabilities
      const tools = await client.listTools();
      job.logs.push(`Discovered ${tools.length} active tools from MCP server.`);

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
        if (schemaProps.workspace_id) args.workspace_id = 'default-workspace';

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
      if (job.retrievedCodeDir && fs.existsSync(job.retrievedCodeDir) && fs.readdirSync(job.retrievedCodeDir).length > 0) {
        job.status = 'evaluating';
        job.logs.push('Executing 5-pillar benchmark suite in isolated sandbox...');
        await this.saveJob(job);

        const projectDef = {
          id: testProjectId,
          name: `MCP Benchmark [${connection.displayName}]`,
          source: 'zip' as const,
          origin: (connection.preset || 'generic_github') as any,
          preparationStatus: 'ready' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const { analysis } = ProjectAnalyzer.analyzeDirectory(codeDir);
        const benchmarkDef = BenchmarkGenerator.generateBenchmark(
          testProjectId,
          projectDef.name,
          analysis,
          job.benchmarkCategory || 'auto'
        );

        const benchmarkRun = await engine.executeBenchmarkRun(projectDef as any, benchmarkDef);
        job.benchmarkRunId = benchmarkRun.id;
        job.overallScore = benchmarkRun.summary.overallScore;
        job.logs.push(`5-Pillar evaluation completed with score: ${job.overallScore}%.`);
      }

      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.logs.push(`[${new Date().toISOString()}] Benchmark run concluded successfully.`);
      await this.saveJob(job);

      client.close();
      return job;

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
