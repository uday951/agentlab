import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { validateSafeMcpUrl } from './ssrfValidator.ts';
import type {
  McpTransport,
  McpServerCapabilities,
  McpToolDefinition,
  McpResourceDefinition,
  McpToolCategory,
} from './types.ts';

export interface UniversalClientOptions {
  transport: McpTransport;
  serverUrl?: string;
  localCommand?: string;
  localArgs?: string[];
  localEnv?: Record<string, string>;
  localCwd?: string;
  bearerToken?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export class UniversalMcpClient {
  private options: UniversalClientOptions;
  private childProcess: ChildProcess | null = null;
  private stdioBuffer = '';
  private stdioPendingRequests = new Map<
    string | number,
    { resolve: (val: any) => void; reject: (err: any) => void; timeoutTimer: NodeJS.Timeout }
  >();
  private messageCounter = 1;
  private sseEndpointUrl: string | null = null;
  private sessionId?: string;

  constructor(options: UniversalClientOptions) {
    this.options = {
      timeoutMs: 15000,
      ...options,
    };
  }

  /**
   * Initializes the MCP connection and negotiates protocol handshake
   */
  public async initialize(): Promise<{
    protocolVersion: string;
    capabilities: McpServerCapabilities;
    serverInfo?: { name: string; version: string };
  }> {
    if (this.options.transport === 'stdio') {
      await this.startStdioProcess();
    } else if (this.options.transport === 'sse') {
      await this.initSseTransport();
    } else {
      // Validate remote URL against SSRF
      if (!this.options.serverUrl) throw new Error('Remote serverUrl is required for HTTP transport.');
      await validateSafeMcpUrl(this.options.serverUrl);
    }

    const initParams = {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
        sampling: {},
      },
      clientInfo: {
        name: 'agentlab-universal-client',
        version: '1.0.0',
      },
    };

    const res = await this.sendJsonRpcRequest('initialize', initParams);
    if (!res) throw new Error('Empty response received during MCP initialization handshake.');

    // Send initialized notification as required by MCP spec
    await this.sendJsonRpcNotification('notifications/initialized', {});

    return {
      protocolVersion: res.protocolVersion || '2024-11-05',
      capabilities: res.capabilities || {},
      serverInfo: res.serverInfo,
    };
  }

  /**
   * Discovers tools from the MCP server via tools/list
   */
  public async listTools(): Promise<McpToolDefinition[]> {
    const res = await this.sendJsonRpcRequest('tools/list', {});
    const rawTools: any[] = res?.tools || [];

    return rawTools.map((t: any) => {
      const name = String(t.name || 'unnamed_tool');
      const desc = String(t.description || '');
      const inputSchema = t.inputSchema || { type: 'object', properties: {} };

      const category = this.categorizeTool(name, desc);
      const isReadOnly = this.isReadOnlyTool(name, desc);
      const requiresApproval = !isReadOnly || category === 'project_creation' || desc.toLowerCase().includes('credit');
      const isBenchmarkCapable = ['project_creation', 'code_generation', 'code_retrieval', 'execution'].includes(category);

      return {
        name,
        description: desc,
        inputSchema,
        isReadOnly,
        requiresApproval,
        isBenchmarkCapable,
        category,
      };
    });
  }

  /**
   * Invokes an MCP tool with validated arguments
   */
  public async callTool(toolName: string, args: Record<string, any> = {}): Promise<any> {
    const res = await this.sendJsonRpcRequest('tools/call', {
      name: toolName,
      arguments: args,
    });
    return res;
  }

  /**
   * Discovers resources from the MCP server via resources/list
   */
  public async listResources(): Promise<McpResourceDefinition[]> {
    try {
      const res = await this.sendJsonRpcRequest('resources/list', {});
      const raw: any[] = res?.resources || [];
      return raw.map((r: any) => ({
        uri: String(r.uri || ''),
        name: String(r.name || r.uri || ''),
        description: r.description ? String(r.description) : undefined,
        mimeType: r.mimeType ? String(r.mimeType) : undefined,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Reads a resource from the MCP server via resources/read
   */
  public async readResource(uri: string): Promise<any> {
    return await this.sendJsonRpcRequest('resources/read', { uri });
  }

  /**
   * Categorizes a tool into functional capability buckets for benchmarking
   */
  public categorizeTool(name: string, description: string): McpToolCategory {
    const text = `${name} ${description}`.toLowerCase();

    if (
      text.includes('create_project') ||
      text.includes('new_project') ||
      text.includes('scaffold') ||
      text.includes('init_project')
    ) {
      return 'project_creation';
    }

    if (
      text.includes('send_message') ||
      text.includes('generate_code') ||
      text.includes('edit_code') ||
      text.includes('coding_prompt') ||
      text.includes('prompt')
    ) {
      return 'code_generation';
    }

    if (
      text.includes('get_project') ||
      text.includes('read_file') ||
      text.includes('list_files') ||
      text.includes('get_diff') ||
      text.includes('diff') ||
      text.includes('export') ||
      text.includes('download')
    ) {
      return 'code_retrieval';
    }

    if (
      text.includes('build') ||
      text.includes('test') ||
      text.includes('compile') ||
      text.includes('run')
    ) {
      return 'execution';
    }

    return 'utility';
  }

  private isReadOnlyTool(name: string, description: string): boolean {
    const lowerName = name.toLowerCase();
    const lowerDesc = description.toLowerCase();

    const readPrefixes = ['get_', 'list_', 'read_', 'check_', 'describe_', 'inspect_', 'find_', 'search_'];
    const writeKeywords = ['create', 'update', 'delete', 'post', 'send', 'modify', 'write', 'execute', 'build'];

    if (writeKeywords.some((w) => lowerName.includes(w) || lowerDesc.includes(w))) {
      return false;
    }

    return readPrefixes.some((p) => lowerName.startsWith(p));
  }

  /**
   * JSON-RPC request dispatcher
   */
  private async sendJsonRpcRequest(method: string, params: Record<string, any>): Promise<any> {
    const id = this.messageCounter++;
    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    if (this.options.transport === 'stdio') {
      return await this.sendStdioMessage(payload);
    }

    return await this.sendHttpMessage(payload);
  }

  private async sendJsonRpcNotification(method: string, params: Record<string, any>): Promise<void> {
    const payload = {
      jsonrpc: '2.0',
      method,
      params,
    };

    if (this.options.transport === 'stdio') {
      this.childProcess?.stdin?.write(JSON.stringify(payload) + '\n');
      return;
    }

    try {
      await this.sendHttpMessage(payload, false);
    } catch {
      // Notifications do not require response
    }
  }

  /**
   * HTTP JSON-RPC dispatch (Streamable HTTP / SSE)
   */
  private async sendHttpMessage(payload: any, expectResponse = true): Promise<any> {
    const targetUrl = this.sseEndpointUrl || this.options.serverUrl;
    if (!targetUrl) throw new Error('No target URL configured for HTTP transport.');

    await validateSafeMcpUrl(targetUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'Mcp-Protocol-Version': '2024-11-05',
      ...(this.options.headers || {}),
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    if (this.options.bearerToken) {
      headers['Authorization'] = `Bearer ${this.options.bearerToken}`;
    } else if (this.options.apiKey) {
      headers['Authorization'] = `Bearer ${this.options.apiKey}`;
      headers['X-API-Key'] = this.options.apiKey;
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.options.timeoutMs || 15000),
    });

    const returnedSessionId = res.headers.get('Mcp-Session-Id') || res.headers.get('mcp-session-id');
    if (returnedSessionId) {
      this.sessionId = returnedSessionId;
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => res.statusText);
      throw new Error(`MCP Server HTTP Error (${res.status}): ${errBody}`);
    }

    if (!expectResponse) return null;

    const data = await res.json().catch(() => null);
    if (!data) return null;

    if (data.error) {
      throw new Error(`MCP Error [${data.error.code}]: ${data.error.message || JSON.stringify(data.error)}`);
    }

    return data.result;
  }

  /**
   * Stdio child process initialization & communication
   */
  private async startStdioProcess(): Promise<void> {
    if (this.childProcess) return;

    const cmd = this.options.localCommand;
    if (!cmd) throw new Error('localCommand is required for stdio MCP transport.');

    const args = this.options.localArgs || [];
    const cwd = this.options.localCwd || process.cwd();
    const env = { ...process.env, ...(this.options.localEnv || {}) };

    const isWindows = process.platform === 'win32';
    const isDirectExecutable = path.isAbsolute(cmd) || cmd.toLowerCase().endsWith('.exe') || cmd === process.execPath;
    const useShell = isWindows && !isDirectExecutable;

    this.childProcess = spawn(cmd, args, {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: useShell,
    });

    this.childProcess.stdout?.on('data', (chunk) => {
      this.handleStdioChunk(chunk.toString('utf8'));
    });

    this.childProcess.stderr?.on('data', () => {
      // Stderr can carry diagnostics from local MCP server
    });

    this.childProcess.on('exit', () => {
      this.childProcess = null;
    });
  }

  private handleStdioChunk(chunk: string) {
    this.stdioBuffer += chunk;
    const lines = this.stdioBuffer.split('\n');
    this.stdioBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const msg = JSON.parse(trimmed);
        if (msg.id !== undefined && this.stdioPendingRequests.has(msg.id)) {
          const req = this.stdioPendingRequests.get(msg.id)!;
          clearTimeout(req.timeoutTimer);
          this.stdioPendingRequests.delete(msg.id);

          if (msg.error) {
            req.reject(new Error(`MCP Stdio Error [${msg.error.code}]: ${msg.error.message}`));
          } else {
            req.resolve(msg.result);
          }
        }
      } catch {
        // Non-JSON logging from child process ignored
      }
    }
  }

  private sendStdioMessage(payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.childProcess || !this.childProcess.stdin) {
        return reject(new Error('Local stdio MCP process is not running.'));
      }

      const timeoutTimer = setTimeout(() => {
        this.stdioPendingRequests.delete(payload.id);
        reject(new Error(`MCP stdio request timed out after ${this.options.timeoutMs}ms.`));
      }, this.options.timeoutMs || 15000);

      this.stdioPendingRequests.set(payload.id, { resolve, reject, timeoutTimer });
      this.childProcess.stdin.write(JSON.stringify(payload) + '\n');
    });
  }

  /**
   * Legacy SSE initialization
   */
  private async initSseTransport(): Promise<void> {
    if (!this.options.serverUrl) throw new Error('serverUrl required for SSE transport.');
    await validateSafeMcpUrl(this.options.serverUrl);

    // Initial check on SSE endpoint
    const sseUrl = this.options.serverUrl.endsWith('/sse')
      ? this.options.serverUrl
      : `${this.options.serverUrl.replace(/\/+$/, '')}/sse`;

    this.sseEndpointUrl = sseUrl;
  }

  /**
   * Graceful cleanup of resources & child processes
   */
  public close() {
    if (this.childProcess) {
      this.childProcess.kill();
      this.childProcess = null;
    }
    for (const [id, req] of this.stdioPendingRequests.entries()) {
      clearTimeout(req.timeoutTimer);
      req.reject(new Error('MCP client connection closed.'));
    }
    this.stdioPendingRequests.clear();
  }
}
