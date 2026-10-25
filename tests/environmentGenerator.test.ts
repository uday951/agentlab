import { test, describe } from 'node:test';
import assert from 'node:assert';
import { EnvironmentGenerator } from '../server/sim/environmentGenerator.ts';
import { ShopSphereToolRegistry } from '../server/sim/tools.ts';
import type { IStorageStore } from '../server/storage/storage.ts';
import type { Agent, World, Scenario, KnowledgeDocument, PlatformConfig } from '../server/types.ts';

// In-Memory mock storage store for unit tests
class MockStorageStore implements Partial<IStorageStore> {
  public agents: Map<string, Agent> = new Map();
  public worlds: Map<string, World> = new Map();
  public scenarios: Map<string, Scenario[]> = new Map();
  public knowledgeDocs: Map<string, KnowledgeDocument[]> = new Map();

  async getAgent(id: string): Promise<Agent | null> {
    return this.agents.get(id) || null;
  }
  async getWorlds(): Promise<World[]> {
    return Array.from(this.worlds.values());
  }
  async getWorld(id: string): Promise<World | null> {
    return this.worlds.get(id) || null;
  }
  async saveWorld(world: World): Promise<World> {
    this.worlds.set(world.id, world);
    return world;
  }
  async getScenariosForWorld(worldId: string): Promise<Scenario[]> {
    return this.scenarios.get(worldId) || [];
  }
  async saveScenario(scenario: Scenario): Promise<Scenario> {
    const list = this.scenarios.get(scenario.worldId) || [];
    list.push(scenario);
    this.scenarios.set(scenario.worldId, list);
    return scenario;
  }
  async getKnowledgeDocuments(worldId: string): Promise<KnowledgeDocument[]> {
    return this.knowledgeDocs.get(worldId) || [];
  }
  async saveKnowledgeDocument(doc: KnowledgeDocument): Promise<KnowledgeDocument> {
    const list = this.knowledgeDocs.get(doc.worldId || '') || [];
    list.push(doc);
    this.knowledgeDocs.set(doc.worldId || '', list);
    return doc;
  }
  async getPlatformConfig(): Promise<PlatformConfig> {
    return {
      id: 'platform-default',
      llmProvider: 'deepseek',
      llmApiKey: '', // test deterministic template generator
      llmModel: 'deepseek-chat',
      enableCliRunner: false,
      agentRunnerMode: 'builtin-sandbox',
      maxExecutionTimeoutMs: 30000,
      maxOutputSizeBytes: 5242880,
      updatedAt: new Date().toISOString(),
    };
  }
}

describe('EnvironmentGenerator & Dynamic Tools', () => {
  test('synthesizes DevOps/Engineering environment for a coding agent', async () => {
    const store = new MockStorageStore();
    const codingAgent: Agent = {
      id: 'agent-devops-01',
      name: 'CodeReviewer Pro',
      description: 'Automated GitHub pull request reviewer, linter and unit test runner.',
      connectionType: 'builtin',
      model: 'deepseek-coder',
      capabilities: ['Code Review', 'Static Analysis'],
      tools: ['read_file', 'run_unit_tests', 'lint_code'],
      timeoutMs: 30000,
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.agents.set(codingAgent.id, codingAgent);

    const generator = new EnvironmentGenerator(store as any);
    const result = await generator.generateEnvironmentForAgent('agent-devops-01', false);

    assert.strictEqual(result.isNew, true);
    assert.strictEqual(result.detectedDomain, 'Software Engineering & DevOps');
    assert.ok(result.world.name.includes('Engineering & CI/CD Sandbox'));
    assert.ok(result.world.simulatedTools.some((t) => t.name === 'run_unit_tests'));
    assert.ok(result.scenarios.length >= 4);

    // Verify scenario categories
    const categories = result.scenarios.map((s) => s.category);
    assert.ok(categories.includes('normal'), 'Must have normal scenario');
    assert.ok(categories.includes('edge_case'), 'Must have edge case');
    assert.ok(categories.includes('tool_failure'), 'Must have tool failure');
    assert.ok(categories.includes('adversarial'), 'Must have adversarial scenario');
  });

  test('synthesizes Customer Support environment for an e-commerce agent', async () => {
    const store = new MockStorageStore();
    const supportAgent: Agent = {
      id: 'agent-support-01',
      name: 'ShopAssistant AI',
      description: 'Customer service agent assisting users with orders, returns, and refunds.',
      connectionType: 'builtin',
      model: 'deepseek-chat',
      capabilities: ['Customer Support Workflow'],
      tools: ['lookup_order', 'process_refund'],
      timeoutMs: 30000,
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.agents.set(supportAgent.id, supportAgent);

    const generator = new EnvironmentGenerator(store as any);
    const result = await generator.generateEnvironmentForAgent('agent-support-01', false);

    assert.strictEqual(result.detectedDomain, 'Customer Support & Operations');
    assert.ok(result.world.simulatedTools.some((t) => t.name === 'process_refund'));
    assert.ok(result.world.systemRules.some((r) => r.includes('Policy #24')));
  });

  test('synthesizes Scientific Research environment for a literature QA agent', async () => {
    const store = new MockStorageStore();
    const researchAgent: Agent = {
      id: 'agent-research-01',
      name: 'BioScholar AI',
      description: 'Biomedical literature research assistant that searches papers, citations, and verifies claims.',
      connectionType: 'api',
      model: 'deepseek-chat',
      capabilities: ['Literature Analysis'],
      tools: ['search_documents', 'verify_fact'],
      timeoutMs: 30000,
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.agents.set(researchAgent.id, researchAgent);

    const generator = new EnvironmentGenerator(store as any);
    const result = await generator.generateEnvironmentForAgent('agent-research-01', false);

    assert.strictEqual(result.detectedDomain, 'Scientific Research & Evidence Synthesis');
    assert.ok(result.world.simulatedTools.some((t) => t.name === 'search_documents'));
    assert.ok(result.world.simulatedTools.some((t) => t.name === 'fetch_source_citation'));
  });

  test('reuses compatible world if already generated and unchanged', async () => {
    const store = new MockStorageStore();
    const agent: Agent = {
      id: 'agent-cached-01',
      name: 'Cached Tester',
      description: 'Testing environment reuse.',
      connectionType: 'builtin',
      model: 'sample-model',
      capabilities: ['Testing'],
      tools: [],
      timeoutMs: 30000,
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.agents.set(agent.id, agent);

    const generator = new EnvironmentGenerator(store as any);
    const firstRun = await generator.generateEnvironmentForAgent('agent-cached-01', false);
    assert.strictEqual(firstRun.isNew, true);

    const secondRun = await generator.generateEnvironmentForAgent('agent-cached-01', false);
    assert.strictEqual(secondRun.isNew, false);
    assert.strictEqual(secondRun.world.id, firstRun.world.id);

    // Force regenerate should create new version
    const forceRun = await generator.generateEnvironmentForAgent('agent-cached-01', true);
    assert.strictEqual(forceRun.isNew, true);
    assert.strictEqual(forceRun.world.version, 2);
  });

  test('ShopSphereToolRegistry executes dynamic DevOps and Research tools with real outputs', async () => {
    const registry = new ShopSphereToolRegistry();

    // Test DevOps read_file tool
    const readResult = await registry.executeTool('read_file', { path: 'src/auth.ts' });
    assert.strictEqual(readResult.success, true);
    assert.ok(readResult.data.content);

    // Test DevOps run_unit_tests tool
    const testResult = await registry.executeTool('run_unit_tests', { testSuite: 'unit' });
    assert.strictEqual(testResult.success, true);
    assert.strictEqual(testResult.data.passed, true);
    assert.strictEqual(testResult.data.totalTests, 14);

    // Test DevOps execute_build tool
    const buildResult = await registry.executeTool('execute_build', { target: 'production' });
    assert.strictEqual(buildResult.success, true);
    assert.strictEqual(buildResult.data.status, 'success');

    // Test Research verify_fact tool
    const factResult = await registry.executeTool('verify_fact', { claim: 'Attention induction heads decompose' });
    assert.strictEqual(factResult.success, true);
    assert.strictEqual(factResult.data.verified, true);

    // Test Injected Failure handling on dynamic tool
    registry.injectFailure('run_unit_tests', {
      failureType: 'timeout',
      failureMessage: 'Jest Worker Timeout OOM',
    });
    const failedRun = await registry.executeTool('run_unit_tests', {});
    assert.strictEqual(failedRun.success, false);
    assert.strictEqual(failedRun.injectedFailureTriggered, true);
    assert.strictEqual(failedRun.error, 'Jest Worker Timeout OOM');
  });
});
