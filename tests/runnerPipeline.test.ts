import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IsolatedRunnerService } from '../server/runner/IsolatedRunnerService.ts';
import { ProjectImportAdapter } from '../server/sim/adapters/ProjectImportAdapter.ts';
import type { Agent, Scenario, World } from '../server/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('IsolatedRunnerService & Execution Pipeline', () => {
  const runner = new IsolatedRunnerService();
  const testSandboxDir = path.resolve(__dirname, '../.runner_sandboxes/test-runner-agent');
  const codeDir = path.join(testSandboxDir, 'code');

  // Setup mock sandbox files for testing
  const setupSandbox = () => {
    if (fs.existsSync(testSandboxDir)) {
      fs.rmSync(testSandboxDir, { recursive: true, force: true });
    }
    fs.mkdirSync(codeDir, { recursive: true });

    // 1. Root level index.js
    fs.writeFileSync(
      path.join(codeDir, 'index.js'),
      'console.log("DECISION: process_refund\\nPOLICY: Policy #24\\nRATIONALE: Root index executed.");'
    );

    // 2. Nested folder backend/server.js with its own package.json
    const backendDir = path.join(codeDir, 'backend');
    fs.mkdirSync(backendDir, { recursive: true });
    fs.writeFileSync(
      path.join(backendDir, 'package.json'),
      JSON.stringify({
        name: 'test-backend',
        version: '1.0.0',
        main: 'server.js',
        dependencies: { express: '^4.19.2' },
      })
    );
    fs.writeFileSync(
      path.join(backendDir, 'server.js'),
      'console.log("DECISION: process_refund\\nPOLICY: Policy #24\\nRATIONALE: Nested backend server executed.");'
    );
  };

  test('resolves a valid root-level index.js', () => {
    setupSandbox();
    const resolved = runner.resolveEntrypoint(codeDir, 'index.js');
    assert.strictEqual(resolved.cleanEntry, 'index.js');
    assert.strictEqual(resolved.cwd, codeDir);
    assert.strictEqual(resolved.scriptArg, 'index.js');
    assert.ok(fs.existsSync(resolved.targetPath));
  });

  test('resolves an entrypoint inside a nested folder with correct cwd', () => {
    setupSandbox();
    const resolved = runner.resolveEntrypoint(codeDir, 'backend/server.js');
    assert.strictEqual(resolved.cleanEntry, 'backend/server.js');
    // cwd must be the backend folder so relative imports & local node_modules resolve
    assert.strictEqual(resolved.cwd, path.join(codeDir, 'backend'));
    assert.strictEqual(resolved.scriptArg, 'server.js');
    assert.ok(fs.existsSync(resolved.targetPath));
  });

  test('fails with a clear actionable configuration error when entrypoint does not exist', () => {
    setupSandbox();
    assert.throws(
      () => {
        runner.resolveEntrypoint(codeDir, 'non_existent_file.js', []);
      },
      (err: any) => {
        assert.ok(err.message.includes('Entrypoint file not found'));
        assert.ok(err.message.includes('non_existent_file.js'));
        assert.ok(err.message.includes('Available files'));
        return true;
      }
    );
  });

  test('blocks path traversal attacks attempting to escape sandbox', () => {
    setupSandbox();
    assert.throws(
      () => {
        runner.resolveEntrypoint(codeDir, '../../server/index.ts');
      },
      (err: any) => {
        assert.ok(err.message.includes('Path traversal'));
        return true;
      }
    );
  });

  test('inspectDirectory detects manifests and verified entrypoints across nested directories', async () => {
    setupSandbox();
    const manifest = await runner.inspectDirectory(codeDir, () => {});
    assert.strictEqual(manifest.language, 'Node.js');
    assert.ok(manifest.dependencies.includes('express'));
    assert.ok(manifest.suggestedEntrypoints.includes('index.js'));
    assert.ok(manifest.suggestedEntrypoints.includes('backend/server.js'));
  });

  test('executeScenario runs isolated process, captures stdout and parses structured decision', async () => {
    setupSandbox();
    const agent: Agent = {
      id: 'test-runner-agent',
      name: 'Test Runner Agent',
      description: 'Unit test agent',
      connectionType: 'import',
      model: 'Custom',
      entrypoint: 'backend/server.js',
      timeoutMs: 10000,
      status: 'ready',
      capabilities: [],
      tools: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const scenario: Scenario = {
      id: 'sc-1',
      worldId: 'world-1',
      title: 'Test Scenario',
      description: 'Verifies isolated execution',
      category: 'normal',
      customerProfile: { id: 'usr-1', name: 'Test User', email: 'test@example.com', tier: 'standard', behaviorTrait: 'normal' },
      inputTask: 'Please process test return',
      expectedOutcome: { decision: 'process_refund', policyRef: 'Policy #24' },
      evaluationRules: {},
    };

    const result = await runner.executeScenario(agent, scenario);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.decision, 'process_refund');
    assert.strictEqual(result.policyRefCited, 'Policy #24');
    assert.ok(result.stdout.includes('Nested backend server executed'));
  });

  test('runs real task against Career-OS repository without MODULE_NOT_FOUND', async () => {
    const careerOsAgentId = 'agent-1792925430662-4bhl';
    const careerOsSandbox = runner.getSandboxDir(careerOsAgentId);
    const careerCodeDir = path.join(careerOsSandbox, 'code');

    // Verify Career-OS repository sandbox exists
    assert.ok(fs.existsSync(careerCodeDir), 'Career-OS sandbox code directory must exist');

    // Test resolving the real Career-OS entrypoint
    const resolved = runner.resolveEntrypoint(careerCodeDir, 'backend/server.js');
    assert.strictEqual(resolved.cleanEntry, 'backend/server.js');
    assert.strictEqual(resolved.cwd, path.join(careerCodeDir, 'backend'));
    assert.ok(fs.existsSync(resolved.targetPath));

    const agent: Agent = {
      id: careerOsAgentId,
      name: 'job pipeline',
      description: 'Career-OS Autonomous Agent',
      connectionType: 'import',
      model: 'CareerOS AI Agent',
      repoUrl: 'https://github.com/uday951/Career-OS.git',
      branch: 'main',
      entrypoint: 'backend/server.js',
      runtime: 'nodejs',
      timeoutMs: 8000,
      status: 'ready',
      preparationStatus: 'ready',
      capabilities: ['simulated_tools'],
      tools: ['lookup_order'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      envVars: {
        PORT: '5096',
        MONGO_URI: 'mongodb+srv://udaydd6062_db_user:uday1234@cluster0.ey4rxkc.mongodb.net/careeros?retryWrites=true&w=majority&appName=Cluster0',
      },
    };

    const scenario: Scenario = {
      id: 'sc-careeros-01',
      worldId: 'world-careeros',
      title: 'CareerOS Real Execution Test',
      description: 'Verifies real Career-OS server launch and output capture without MODULE_NOT_FOUND',
      category: 'normal',
      customerProfile: { id: 'usr-dev', name: 'Dev Lead', email: 'dev@career-os.io', tier: 'vip', behaviorTrait: 'rigorous' },
      inputTask: 'Verify AI Job Pipeline readiness and worker queue initialization',
      expectedOutcome: { decision: 'process_refund' },
      evaluationRules: {},
    };

    // Execute through ProjectImportAdapter
    const adapter = new ProjectImportAdapter();
    const emittedEvents: any[] = [];
    const runResult = await adapter.executeScenario({
      agent,
      world: {
        id: 'world-careeros',
        name: 'CareerOS World',
        industry: 'B2B Sales & Pipeline Management',
        description: 'CareerOS Environment',
        systemRules: [],
        knowledgeDocuments: [],
        simulatedTools: [],
        customerProfiles: [],
        eventConditions: [],
        successCriteria: [],
        initialData: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      scenario,
      experimentId: 'exp-test-careeros',
      tools: {} as any,
      rag: {} as any,
      stepCounter: 0,
      emitEvent: (evt) => {
        emittedEvents.push(evt);
        return { id: `evt-${Date.now()}`, experimentId: 'exp-test-careeros', scenarioId: scenario.id, step: 1, timestamp: new Date().toISOString(), ...evt };
      },
    });

    // Verification assertions: Ensure MODULE_NOT_FOUND is completely resolved and never thrown
    assert.strictEqual(runResult.agentOutput.message.includes('MODULE_NOT_FOUND'), false);
    assert.strictEqual(runResult.evaluation.explanation.includes('MODULE_NOT_FOUND'), false);
    assert.ok(resolved.targetPath.endsWith('server.js'));
    assert.ok(fs.existsSync(resolved.targetPath));
  });
});
