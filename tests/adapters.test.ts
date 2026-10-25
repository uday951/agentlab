import test from 'node:test';
import assert from 'node:assert/strict';
import { SampleSupportAgent } from '../server/sim/adapters/SampleSupportAgent.ts';
import { ApiAgentAdapter } from '../server/sim/adapters/ApiAgentAdapter.ts';
import { CliAgentAdapter } from '../server/sim/adapters/CliAgentAdapter.ts';
import { ProjectImportAdapter } from '../server/sim/adapters/ProjectImportAdapter.ts';
import { ShopSphereToolRegistry } from '../server/sim/tools.ts';
import { LocalRAGPipeline } from '../server/sim/rag.ts';
import { defaultShopSphereWorld, defaultScenarios, defaultSampleAgent } from '../server/storage/seedData.ts';

test('SampleSupportAgent: executes standard return scenario and cites Policy #24', async () => {
  const agent = new SampleSupportAgent();
  const tools = new ShopSphereToolRegistry(defaultShopSphereWorld.initialData.orders);
  const rag = new LocalRAGPipeline(defaultShopSphereWorld.knowledgeDocuments);
  const standardScenario = defaultScenarios[0]; // SC-01: 14 days ago, eligible return

  const events: any[] = [];
  const emitEvent = (e: any) => {
    events.push(e);
    return e;
  };

  const result = await agent.executeScenario({
    agent: defaultSampleAgent,
    world: defaultShopSphereWorld,
    scenario: standardScenario,
    experimentId: 'test-exp-01',
    tools,
    rag,
    stepCounter: 0,
    emitEvent,
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.agentOutput.decision, 'process_refund');
  assert.ok(result.agentOutput.refundTransactionId);
  assert.equal(result.evaluation.passed, true);
  assert.equal(result.evaluation.policyCompliant, true);
});

test('SampleSupportAgent: handles injected tool failure (HTTP 503) and escalates to manager', async () => {
  const agent = new SampleSupportAgent();
  const tools = new ShopSphereToolRegistry(defaultShopSphereWorld.initialData.orders);
  const rag = new LocalRAGPipeline(defaultShopSphereWorld.knowledgeDocuments);
  const failureScenario = defaultScenarios.find((s) => s.id === 'sc-05')!; // Injected tool failure

  const events: any[] = [];
  const emitEvent = (e: any) => {
    events.push(e);
    return e;
  };

  const result = await agent.executeScenario({
    agent: defaultSampleAgent,
    world: defaultShopSphereWorld,
    scenario: failureScenario,
    experimentId: 'test-exp-05',
    tools,
    rag,
    stepCounter: 0,
    emitEvent,
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.agentOutput.decision, 'escalate_manager');
  assert.ok(result.agentOutput.escalatedTicketId);
  assert.equal(result.evaluation.correctOutcome, true);
});

test('ApiAgentAdapter: blocks private IP and localhost SSRF destinations', async () => {
  const apiAdapter = new ApiAgentAdapter();
  const blockedEndpoints = [
    'http://localhost:3000/api',
    'http://127.0.0.1:8080/hook',
    'http://169.254.169.254/latest/meta-data',
    'http://10.0.1.50:5000/webhook',
    'http://192.168.1.1/admin',
    'http://172.16.0.10/internal',
  ];

  for (const endpoint of blockedEndpoints) {
    const isBlocked = (apiAdapter as any).isBlockedUrl(endpoint);
    assert.equal(isBlocked, true, `Expected ${endpoint} to be blocked by SSRF check`);
  }

  // Public valid URLs should not be blocked
  assert.equal((apiAdapter as any).isBlockedUrl('https://api.openai.com/v1/chat'), false);
  assert.equal((apiAdapter as any).isBlockedUrl('https://example.com/agent'), false);
});

test('CliAgentAdapter: blocks execution when ENABLE_CLI_RUNNER is not set', async () => {
  delete process.env.ENABLE_CLI_RUNNER;
  const cliAdapter = new CliAgentAdapter();

  const events: any[] = [];
  const emitEvent = (e: any) => {
    events.push(e);
    return e;
  };

  const result = await cliAdapter.executeScenario({
    agent: { ...defaultSampleAgent, connectionType: 'cli', cliCommand: 'node test.js' },
    world: defaultShopSphereWorld,
    scenario: defaultScenarios[0],
    experimentId: 'test-exp-cli',
    tools: new ShopSphereToolRegistry(),
    rag: new LocalRAGPipeline(),
    stepCounter: 0,
    emitEvent,
  });

  assert.equal(result.status, 'error');
  assert.equal(result.evaluation.failureCategory, 'Execution Sandbox Restriction');
  assert.match(result.agentOutput.message, /ENABLE_CLI_RUNNER=true/);
});

test('ProjectImportAdapter: reports configuration required when AGENT_RUNNER_URL is missing', async () => {
  delete process.env.AGENT_RUNNER_URL;
  const importAdapter = new ProjectImportAdapter();

  const events: any[] = [];
  const emitEvent = (e: any) => {
    events.push(e);
    return e;
  };

  const result = await importAdapter.executeScenario({
    agent: {
      ...defaultSampleAgent,
      connectionType: 'import',
      repoUrl: 'https://github.com/example/agent',
      entrypoint: 'agent.py',
    },
    world: defaultShopSphereWorld,
    scenario: defaultScenarios[0],
    experimentId: 'test-exp-import',
    tools: new ShopSphereToolRegistry(),
    rag: new LocalRAGPipeline(),
    stepCounter: 0,
    emitEvent,
  });

  assert.equal(result.status, 'error');
  assert.equal(result.evaluation.failureCategory, 'Isolated Runner Not Configured');
  assert.match(result.agentOutput.message, /AGENT_RUNNER_URL/);
});
