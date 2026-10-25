import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateSafeMcpUrl, isPrivateIp, SsrfError } from '../server/mcp/ssrfValidator.ts';
import { McpAuthManager } from '../server/mcp/McpAuthManager.ts';
import { UniversalMcpClient } from '../server/mcp/UniversalMcpClient.ts';
import { McpBenchmarkOrchestrator } from '../server/mcp/McpBenchmarkOrchestrator.ts';
import type { IStorageStore } from '../server/storage/storage.ts';
import type {
  McpConnectionRecord,
  McpBenchmarkJob,
} from '../server/mcp/types.ts';
import type { BenchmarkProject, BenchmarkRun, BenchmarkDefinition } from '../server/types.ts';

// In-memory mock storage for MCP testing
class MockMcpStorage implements Partial<IStorageStore> {
  public mcpConnections = new Map<string, McpConnectionRecord>();
  public mcpBenchmarkJobs = new Map<string, McpBenchmarkJob>();
  public benchmarkProjects = new Map<string, BenchmarkProject>();
  public benchmarkRuns = new Map<string, BenchmarkRun>();
  public benchmarkDefinitions = new Map<string, BenchmarkDefinition>();

  async getMcpConnections(): Promise<McpConnectionRecord[]> {
    return Array.from(this.mcpConnections.values());
  }

  async getMcpConnection(id: string): Promise<McpConnectionRecord | null> {
    return this.mcpConnections.get(id) || null;
  }

  async saveMcpConnection(conn: McpConnectionRecord): Promise<McpConnectionRecord> {
    this.mcpConnections.set(conn.id, conn);
    return conn;
  }

  async deleteMcpConnection(id: string): Promise<void> {
    this.mcpConnections.delete(id);
  }

  async getMcpBenchmarkJob(id: string): Promise<McpBenchmarkJob | null> {
    return this.mcpBenchmarkJobs.get(id) || null;
  }

  async saveMcpBenchmarkJob(job: McpBenchmarkJob): Promise<McpBenchmarkJob> {
    this.mcpBenchmarkJobs.set(job.id, job);
    return job;
  }

  async getBenchmarkDefinitions(): Promise<BenchmarkDefinition[]> {
    return Array.from(this.benchmarkDefinitions.values());
  }

  async getBenchmarkDefinition(id: string): Promise<BenchmarkDefinition | null> {
    return this.benchmarkDefinitions.get(id) || null;
  }

  async saveBenchmarkDefinition(def: BenchmarkDefinition): Promise<BenchmarkDefinition> {
    this.benchmarkDefinitions.set(def.id, def);
    return def;
  }

  async getBenchmarkProjects(): Promise<BenchmarkProject[]> {
    return Array.from(this.benchmarkProjects.values());
  }

  async getBenchmarkProject(id: string): Promise<BenchmarkProject | null> {
    return this.benchmarkProjects.get(id) || null;
  }

  async saveBenchmarkProject(project: BenchmarkProject): Promise<BenchmarkProject> {
    this.benchmarkProjects.set(project.id, project);
    return project;
  }

  async getBenchmarkRuns(): Promise<BenchmarkRun[]> {
    return Array.from(this.benchmarkRuns.values());
  }

  async saveBenchmarkRun(run: BenchmarkRun): Promise<BenchmarkRun> {
    this.benchmarkRuns.set(run.id, run);
    return run;
  }
}

test('SSRF Protection: blocks private IPs, loopback, and metadata', async () => {
  assert.equal(isPrivateIp('127.0.0.1'), true);
  assert.equal(isPrivateIp('127.0.0.2'), true);
  assert.equal(isPrivateIp('10.0.0.1'), true);
  assert.equal(isPrivateIp('192.168.1.100'), true);
  assert.equal(isPrivateIp('172.16.0.5'), true);
  assert.equal(isPrivateIp('172.31.255.255'), true);
  assert.equal(isPrivateIp('169.254.169.254'), true);
  assert.equal(isPrivateIp('::1'), true);
  assert.equal(isPrivateIp('8.8.8.8'), false);
  assert.equal(isPrivateIp('1.1.1.1'), false);

  // Default behavior: blocks localhost and 127.0.0.1
  await assert.rejects(async () => {
    await validateSafeMcpUrl('http://localhost:3000', false);
  }, SsrfError);

  await assert.rejects(async () => {
    await validateSafeMcpUrl('http://127.0.0.1:3000', false);
  }, SsrfError);

  await assert.rejects(async () => {
    await validateSafeMcpUrl('http://169.254.169.254/latest/meta-data/', false);
  }, SsrfError);

  await assert.rejects(async () => {
    await validateSafeMcpUrl('file:///etc/passwd', false);
  }, SsrfError);

  const allowedPublic = await validateSafeMcpUrl('https://mcp.lovable.dev', false);
  assert.equal(allowedPublic.safe, true);

  // Enable local testing flag for subsequent local mock HTTP server tests
  process.env.ALLOW_LOCAL_MCP_TESTING = 'true';
});

test('McpAuthManager: AES-256-GCM credential encryption and decryption', () => {
  const authManager = new McpAuthManager();
  const credentials = {
    accessToken: 'mcp-secret-access-token-12345',
    refreshToken: 'mcp-refresh-token-67890',
    clientId: 'registered-client-id',
  };

  const encrypted = authManager.encryptCredentials(credentials);

  assert.ok(encrypted.includes(':'));
  assert.ok(!encrypted.includes('mcp-secret-access-token-12345'));

  const decrypted = authManager.decryptCredentials<typeof credentials>(encrypted);
  assert.equal(decrypted.accessToken, credentials.accessToken);
  assert.equal(decrypted.refreshToken, credentials.refreshToken);
  assert.equal(decrypted.clientId, credentials.clientId);
});

test('McpAuthManager: PKCE generation, RFC 8414 metadata, and RFC 7591 dynamic registration', async () => {
  const authManager = new McpAuthManager();

  // Test PKCE helper
  const pkce = authManager.generatePkce();
  assert.ok(pkce.codeVerifier.length >= 43);
  assert.ok(pkce.codeChallenge.length >= 43);
  assert.notEqual(pkce.codeVerifier, pkce.codeChallenge);

  // Mock OAuth Authorization Server
  let registerCalled = false;
  const server = http.createServer((req, res) => {
    if (req.url === '/.well-known/oauth-authorization-server') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          issuer: 'https://lovable.dev/oauth',
          authorization_endpoint: 'https://lovable.dev/oauth/authorize',
          token_endpoint: 'https://lovable.dev/oauth/token',
          registration_endpoint: 'http://127.0.0.1/oauth/register',
          code_challenge_methods_supported: ['S256'],
        })
      );
    } else if (req.url === '/oauth/register' && req.method === 'POST') {
      registerCalled = true;
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const json = JSON.parse(body);
        assert.ok(json.redirect_uris);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            client_id: 'dynamic-test-client-id-xyz',
            client_name: json.client_name,
            redirect_uris: json.redirect_uris,
          })
        );
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const registrationEndpoint = `http://127.0.0.1:${port}/oauth/register`;
  const redirectUri = 'http://localhost:3001/api/mcp/oauth/callback';

  try {
    const reg = await authManager.registerClient(
      registrationEndpoint,
      redirectUri,
      'AgentLab Dynamic Client'
    );

    assert.equal(registerCalled, true);
    assert.equal(reg.clientId, 'dynamic-test-client-id-xyz');

    const authUrl = authManager.buildAuthorizationUrl({
      authorizationEndpoint: 'https://lovable.dev/oauth/authorize',
      clientId: reg.clientId,
      redirectUri,
      state: 'test-state-123',
      codeChallenge: pkce.codeChallenge,
    });

    assert.ok(authUrl.includes('client_id=dynamic-test-client-id-xyz'));
    assert.ok(authUrl.includes(`code_challenge=${encodeURIComponent(pkce.codeChallenge)}`));
    assert.ok(authUrl.includes('code_challenge_method=S256'));
    assert.ok(authUrl.includes('response_type=code'));
  } finally {
    server.close();
  }
});

test('UniversalMcpClient: stdio transport with local process', async () => {
  // Create a minimal Node.js stdio MCP server script
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-stdio-'));
  const scriptPath = path.join(tmpDir, 'mockMcpServer.js');

  const serverScript = `
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (msg.method === 'initialize') {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'mock-stdio-server', version: '1.0.0' }
        }
      }) + '\\n');
    } else if (msg.method === 'notifications/initialized') {
      // no response needed
    } else if (msg.method === 'tools/list') {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          tools: [
            {
              name: 'stdio_echo',
              description: 'Echo message utility',
              inputSchema: { type: 'object', properties: { text: { type: 'string' } } }
            }
          ]
        }
      }) + '\\n');
    } else if (msg.method === 'tools/call') {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          content: [{ type: 'text', text: 'Echo: ' + (msg.params.arguments?.text || '') }]
        }
      }) + '\\n');
    }
  } catch (err) {}
});
`;
  fs.writeFileSync(scriptPath, serverScript, 'utf8');

  const client = new UniversalMcpClient({
    transport: 'stdio',
    localCommand: process.execPath,
    localArgs: [scriptPath],
  });

  try {
    const handshake = await client.initialize();
    assert.equal(handshake.serverInfo.name, 'mock-stdio-server');
    assert.equal(handshake.protocolVersion, '2024-11-05');

    const tools = await client.listTools();
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, 'stdio_echo');
    assert.equal(tools[0].category, 'utility');

    const callResult = await client.callTool('stdio_echo', { text: 'Hello MCP!' });
    assert.ok(callResult.content);
    assert.equal(callResult.content[0].text, 'Echo: Hello MCP!');
  } finally {
    client.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('UniversalMcpClient: Streamable HTTP transport and tool categorization', async () => {
  let receivedAuth = '';
  const mockTools = [
    {
      name: 'create_project',
      description: 'Creates a brand new web project and commits code',
      inputSchema: { type: 'object', properties: { prompt: { type: 'string' } } },
    },
    {
      name: 'list_workspaces',
      description: 'List user workspaces',
      inputSchema: { type: 'object' },
    },
    {
      name: 'get_project_files',
      description: 'Retrieve project files and code',
      inputSchema: { type: 'object', properties: { projectId: { type: 'string' } } },
    },
  ];

  const server = http.createServer((req, res) => {
    receivedAuth = req.headers['authorization'] || '';
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const msg = JSON.parse(body || '{}');
      if (msg.method === 'initialize') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'mock-http-server', version: '2.0.0' },
            },
          })
        );
      } else if (msg.method === 'notifications/initialized') {
        res.writeHead(204);
        res.end();
      } else if (msg.method === 'tools/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: { tools: mockTools },
          })
        );
      } else if (msg.method === 'tools/call') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              content: [{ type: 'text', text: `Invoked ${msg.params?.name}` }],
            },
          })
        );
      } else {
        res.writeHead(400);
        res.end();
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const serverUrl = `http://127.0.0.1:${port}/mcp`;

  try {
    const client = new UniversalMcpClient({
      transport: 'streamable_http',
      serverUrl,
      bearerToken: 'test-mcp-bearer-token',
    });

    const init = await client.initialize();
    assert.equal(init.serverInfo.name, 'mock-http-server');
    assert.equal(receivedAuth, 'Bearer test-mcp-bearer-token');

    const tools = await client.listTools();
    assert.equal(tools.length, 3);

    const createTool = tools.find((t) => t.name === 'create_project');
    assert.ok(createTool);
    assert.equal(createTool.category, 'project_creation');
    assert.equal(createTool.isReadOnly, false);
    assert.equal(createTool.requiresApproval, true);

    const listTool = tools.find((t) => t.name === 'list_workspaces');
    assert.ok(listTool);
    assert.equal(listTool.category, 'utility');
    assert.equal(listTool.isReadOnly, true);
    assert.equal(listTool.requiresApproval, false);

    const retrieveTool = tools.find((t) => t.name === 'get_project_files');
    assert.ok(retrieveTool);
    assert.equal(retrieveTool.category, 'code_retrieval');

    const callResult = await client.callTool('create_project', { prompt: 'Make an app' });
    assert.ok(callResult.content);
    assert.equal(callResult.content[0].text, 'Invoked create_project');
  } finally {
    server.close();
  }
});

test('McpBenchmarkOrchestrator: end-to-end benchmark run with code retrieval and evaluation', async () => {
  const store = new MockMcpStorage();

  // Create mock HTTP server that supports creation and retrieval
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const msg = JSON.parse(body || '{}');
      if (msg.method === 'initialize') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: { name: 'mock-platform', version: '1.0.0' },
            },
          })
        );
      } else if (msg.method === 'notifications/initialized') {
        res.writeHead(204);
        res.end();
      } else if (msg.method === 'tools/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              tools: [
                {
                  name: 'create_application',
                  description: 'Generate code for an app',
                  inputSchema: { type: 'object' },
                },
                {
                  name: 'export_project_code',
                  description: 'Export project files',
                  inputSchema: { type: 'object' },
                },
              ],
            },
          })
        );
      } else if (msg.method === 'tools/call') {
        if (msg.params?.name === 'create_application') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: {
                projectId: 'proj-mcp-999',
                content: [{ type: 'text', text: 'Project created with ID proj-mcp-999' }],
              },
            })
          );
        } else if (msg.params?.name === 'export_project_code') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id: msg.id,
              result: {
                files: [
                  { path: 'package.json', content: '{"name":"mcp-bench-app","version":"1.0.0"}' },
                  { path: 'src/index.js', content: 'console.log("App ready");' },
                ],
              },
            })
          );
        }
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const serverUrl = `http://127.0.0.1:${port}/mcp`;

  try {
    const connRecord: McpConnectionRecord = {
      id: 'conn-test-123',
      ownerId: 'test-user',
      displayName: 'Test AI Coding MCP Server',
      preset: 'custom',
      transport: 'streamable_http',
      serverUrl,
      authType: 'none',
      connectionStatus: 'connected',
      discoveredTools: [
        {
          name: 'create_application',
          description: 'Generate code for an app',
          inputSchema: {},
          isReadOnly: false,
          requiresApproval: true,
          isBenchmarkCapable: true,
          category: 'project_creation',
        },
        {
          name: 'export_project_code',
          description: 'Export project files',
          inputSchema: {},
          isReadOnly: false,
          requiresApproval: false,
          isBenchmarkCapable: true,
          category: 'code_retrieval',
        },
      ],
      discoveredResources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.saveMcpConnection(connRecord);

    const orchestrator = new McpBenchmarkOrchestrator(store as any);

    const job: McpBenchmarkJob = {
      id: 'mcp-job-123',
      connectionId: connRecord.id,
      ownerId: 'test-user',
      taskPrompt: 'Build a task management application',
      benchmarkCategory: 'task_management',
      status: 'pending',
      mappedTools: {},
      supportedCapabilities: {
        canCreateProject: true,
        canGenerateCode: true,
        canRetrieveCode: true,
        canExecuteTests: false,
      },
      logs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.saveMcpBenchmarkJob(job);

    await orchestrator.executeBenchmark(job, connRecord);

    const completedJob = await store.getMcpBenchmarkJob(job.id);
    assert.ok(completedJob);
    assert.equal(completedJob.status, 'completed');
    assert.ok(completedJob.benchmarkRunId);
    assert.ok(completedJob.overallScore !== undefined);
    assert.ok(completedJob.overallScore! >= 0);
    assert.ok(completedJob.retrievedCodeDir);
    assert.ok(fs.existsSync(completedJob.retrievedCodeDir!));
  } finally {
    server.close();
  }
});

test('McpBenchmarkOrchestrator: truthfully reports failure when code retrieval is unsupported', async () => {
  const store = new MockMcpStorage();

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const msg = JSON.parse(body || '{}');
      if (msg.method === 'initialize') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: { name: 'no-retrieval-platform', version: '1.0.0' },
            },
          })
        );
      } else if (msg.method === 'notifications/initialized') {
        res.writeHead(204);
        res.end();
      } else if (msg.method === 'tools/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: {
              tools: [
                {
                  name: 'generate_something',
                  description: 'Generates code on cloud platform only',
                  inputSchema: {},
                },
              ],
            },
          })
        );
      } else if (msg.method === 'tools/call') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result: { text: 'code generated on cloud platform' },
          })
        );
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const serverUrl = `http://127.0.0.1:${port}/mcp`;

  try {
    const connRecord: McpConnectionRecord = {
      id: 'conn-no-retrieval',
      ownerId: 'test-user',
      displayName: 'No-Retrieval Platform',
      preset: 'custom',
      transport: 'streamable_http',
      serverUrl,
      authType: 'none',
      connectionStatus: 'connected',
      discoveredTools: [
        {
          name: 'generate_something',
          description: 'Generates code on cloud platform only',
          inputSchema: {},
          isReadOnly: false,
          requiresApproval: true,
          isBenchmarkCapable: true,
          category: 'code_generation',
        },
      ],
      discoveredResources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.saveMcpConnection(connRecord);

    const orchestrator = new McpBenchmarkOrchestrator(store as any);
    const job: McpBenchmarkJob = {
      id: 'mcp-job-unsupported',
      connectionId: connRecord.id,
      ownerId: 'test-user',
      taskPrompt: 'Build an app',
      benchmarkCategory: 'auto',
      status: 'pending',
      mappedTools: {},
      supportedCapabilities: {
        canCreateProject: false,
        canGenerateCode: true,
        canRetrieveCode: false,
        canExecuteTests: false,
      },
      logs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.saveMcpBenchmarkJob(job);

    await orchestrator.executeBenchmark(job, connRecord);

    const updatedJob = await store.getMcpBenchmarkJob(job.id);
    assert.ok(updatedJob);
    assert.equal(updatedJob.status, 'failed');
    assert.equal(updatedJob.failureType, 'unsupported');
    assert.ok(updatedJob.failureReason?.includes('does not provide any code retrieval tool'));
  } finally {
    server.close();
  }
});
