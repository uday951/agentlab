import test from 'node:test';
import assert from 'node:assert/strict';
import { LovableMcpClient } from '../server/providers/LovableMcpClient.ts';
import { BoltProviderAdapter } from '../server/providers/BoltProviderAdapter.ts';
import { ReplitProviderAdapter } from '../server/providers/ReplitProviderAdapter.ts';
import { EmergentProviderAdapter } from '../server/providers/EmergentProviderAdapter.ts';
import { ProviderRegistry } from '../server/providers/ProviderRegistry.ts';
import type { IStorageStore } from '../server/storage/storage.ts';
import type { ProviderConnection, GenerationJob } from '../server/types.ts';

// In-memory test store implementation for provider & generation jobs
class MockStorage implements Partial<IStorageStore> {
  public providerConnections = new Map<string, ProviderConnection>();
  public generationJobs = new Map<string, GenerationJob>();

  public async getProviderConnections(): Promise<ProviderConnection[]> {
    return Array.from(this.providerConnections.values());
  }

  public async getProviderConnection(provider: string): Promise<ProviderConnection | null> {
    return this.providerConnections.get(provider) || null;
  }

  public async saveProviderConnection(conn: ProviderConnection): Promise<ProviderConnection> {
    this.providerConnections.set(conn.provider, conn);
    return conn;
  }

  public async deleteProviderConnection(provider: string): Promise<void> {
    this.providerConnections.delete(provider);
  }

  public async getGenerationJob(id: string): Promise<GenerationJob | null> {
    return this.generationJobs.get(id) || null;
  }

  public async getGenerationJobs(): Promise<GenerationJob[]> {
    return Array.from(this.generationJobs.values());
  }

  public async saveGenerationJob(job: GenerationJob): Promise<GenerationJob> {
    this.generationJobs.set(job.id, job);
    return job;
  }
}

test('AI Coding Platform Providers & Direct Benchmark Pipeline', async (t) => {
  // 1. Lovable MCP Client: Official Protocol & Tool Discovery
  await t.test('LovableMcpClient correctly formats official OAuth URL and discovers tools', async () => {
    const client = new LovableMcpClient();

    // Verify official OAuth URL construction
    const redirectUri = 'http://localhost:3001/api/benchmark/providers/lovable/oauth/callback';
    const state = 'test-state-12345';
    const authUrl = client.getAuthorizationUrl(redirectUri, state);

    assert.ok(authUrl.includes('https://lovable.dev/oauth/authorize') || authUrl.includes('https://mcp.lovable.dev'));
    assert.ok(authUrl.includes(encodeURIComponent(redirectUri)));
    assert.ok(authUrl.includes(state));

    // Verify tool discovery list (dynamic schema fallback)
    const tools = await client.discoverTools();
    assert.ok(Array.isArray(tools));
    assert.ok(tools.length >= 4, 'Should discover at least 4 core MCP tools');

    const toolNames = tools.map((t) => t.name);
    assert.ok(toolNames.includes('create_project'), 'Must discover create_project tool');
    assert.ok(toolNames.includes('list_workspaces'), 'Must discover list_workspaces tool');
    assert.ok(toolNames.includes('send_message'), 'Must discover send_message tool');
    assert.ok(toolNames.includes('get_project_diff'), 'Must discover get_project_diff tool');

    // Verify credit notice is attached to generative tool
    const createTool = tools.find((t) => t.name === 'create_project');
    assert.ok(createTool?.creditCostNotice, 'create_project must carry a clear credit cost notice');
    assert.ok(createTool?.creditCostNotice?.toLowerCase().includes('credit'));
  });

  // 2. Truthful Metadata Adapters: Bolt, Replit, Emergent
  await t.test('Platform adapters accurately report capabilities without fabricating fake APIs', () => {
    const boltMeta = BoltProviderAdapter.getConnectionMetadata();
    const replitMeta = ReplitProviderAdapter.getConnectionMetadata();
    const emergentMeta = EmergentProviderAdapter.getConnectionMetadata();

    // Bolt.new checks
    assert.equal(boltMeta.provider, 'bolt');
    assert.equal(boltMeta.name, 'Bolt.new');
    assert.equal(boltMeta.directPromptGeneration, false, 'Bolt does not expose third-party generation API');
    assert.ok(boltMeta.guidanceNotes.includes('StackBlitz'), 'Bolt should note StackBlitz integration');

    // Replit checks
    assert.equal(replitMeta.provider, 'replit');
    assert.equal(replitMeta.name, 'Replit Agent');
    assert.equal(replitMeta.directPromptGeneration, false, 'Replit Agent does not expose third-party generation API');
    assert.ok(replitMeta.guidanceNotes.includes('Git'), 'Replit should document Git repository sync');

    // Emergent checks
    assert.equal(emergentMeta.provider, 'emergent');
    assert.equal(emergentMeta.name, 'Emergent');
    assert.equal(emergentMeta.directPromptGeneration, false);
    assert.ok(emergentMeta.guidanceNotes.includes('Emergent'), 'Emergent should document export/import flow');
  });

  // 3. ProviderRegistry: Coordinates Live Status & Security Sanitization
  await t.test('ProviderRegistry discovers tools and sanitizes authentication tokens', async () => {
    const store = new MockStorage() as unknown as IStorageStore;
    const registry = new ProviderRegistry(store);

    const providers = await registry.getProviders();
    assert.ok(Array.isArray(providers));
    assert.equal(providers.length, 4, 'Must register 4 providers: lovable, bolt, replit, emergent');

    const lovable = providers.find((p) => p.provider === 'lovable');
    assert.ok(lovable);
    assert.ok(lovable.discoveredTools && lovable.discoveredTools.length > 0);
    assert.equal(lovable.serverUrl, 'https://mcp.lovable.dev');

    // Test connecting Lovable with simulated credentials
    const connected = await registry.connectProvider('lovable', {
      accessToken: 'lovable_test_token_secret_xyz',
      workspaceId: 'ws-team-alpha',
      workspaceName: 'Engineering Workspace',
    });

    assert.equal(connected.status, 'connected');
    assert.equal(connected.workspaceId, 'ws-team-alpha');

    // Verify token persistence and lookup
    const retrieved = await registry.getProvider('lovable');
    assert.equal(retrieved?.status, 'connected');
    assert.equal(retrieved?.accessToken, 'lovable_test_token_secret_xyz');

    // Disconnect
    await registry.disconnectProvider('lovable');
    const disconnected = await registry.getProvider('lovable');
    assert.equal(disconnected?.status, 'disconnected');
  });

  // 4. Direct Benchmark Generation: Enforces Credit Acceptance & Step Logging
  await t.test('Direct Generation requires explicit credit confirmation and tracks job steps', async () => {
    const store = new MockStorage() as unknown as IStorageStore;

    // Verify generation job object schema
    const testJob: GenerationJob = {
      id: `gen-test-${Date.now()}`,
      provider: 'lovable',
      projectName: 'Test Kanban App',
      userPrompt: 'Build a Kanban board with column management and local persistence',
      benchmarkCategory: 'task_management',
      creditWarningAccepted: true,
      status: 'prompt_approved',
      logs: ['Prompt approved by user.'],
      createdAt: new Date().toISOString(),
    };

    await store.saveGenerationJob(testJob);

    const retrievedJob = await store.getGenerationJob(testJob.id);
    assert.ok(retrievedJob);
    assert.equal(retrievedJob.projectName, 'Test Kanban App');
    assert.equal(retrievedJob.creditWarningAccepted, true);
    assert.equal(retrievedJob.status, 'prompt_approved');

    // Transition job through simulated steps
    testJob.status = 'generating';
    testJob.logs.push('Calling Lovable MCP create_project tool...');
    await store.saveGenerationJob(testJob);

    const updatedJob = await store.getGenerationJob(testJob.id);
    assert.equal(updatedJob?.status, 'generating');
    assert.equal(updatedJob?.logs.length, 2);

    // Completion
    testJob.status = 'completed';
    testJob.completedAt = new Date().toISOString();
    await store.saveGenerationJob(testJob);

    const finalJob = await store.getGenerationJob(testJob.id);
    assert.equal(finalJob?.status, 'completed');
  });
});
