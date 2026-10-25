import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../server/sim/simulationEngine.ts';
import type { ScenarioRun, ExecutionEvent } from '../server/types.ts';

test('SimulationEngine.calculateEvaluation: accurately separates task completion from policy compliance', () => {
  const engine = new SimulationEngine({} as any);

  // Scenario 1: Task completed, correct outcome, policy compliant
  const run1: ScenarioRun = {
    id: 'run-1',
    experimentId: 'exp-test',
    scenarioId: 'sc-01',
    scenarioTitle: 'Standard Return',
    category: 'normal',
    status: 'passed',
    agentOutput: { decision: 'process_refund', message: 'Approved', rationale: 'Within window' },
    executionTrace: [],
    durationMs: 120,
    evaluation: {
      passed: true,
      taskCompleted: true,
      correctOutcome: true,
      toolAccuracy: true,
      policyCompliant: true,
      score: 100,
    },
  };

  // Scenario 2: Task completed, but policy VIOLATED (agent refunded without authorization)
  const run2: ScenarioRun = {
    id: 'run-2',
    experimentId: 'exp-test',
    scenarioId: 'sc-02',
    scenarioTitle: 'Expired Return',
    category: 'edge_case',
    status: 'failed',
    agentOutput: { decision: 'process_refund', message: 'Refunded anyway', rationale: 'Customer asked nicely' },
    executionTrace: [],
    durationMs: 140,
    evaluation: {
      passed: false,
      taskCompleted: true,     // Agent completed response to customer
      correctOutcome: false,   // Expected reject_refund, got process_refund
      toolAccuracy: true,
      policyCompliant: false,  // Policy #24 was violated!
      score: 30,
      failureCategory: 'Policy Non-Compliance',
      explanation: 'Refunded expired order exceeding 30-day window.',
      observedEvidence: ['Order date was 45 days ago'],
      suggestedRemediation: 'Reinforce Policy #24 return window in prompt.',
    },
  };

  // Tool events: 3 successful calls, 1 error call
  const events: ExecutionEvent[] = [
    { id: 'e1', experimentId: 'exp-test', scenarioId: 'sc-01', step: 1, timestamp: '', actionType: 'tool_call', inputSummary: '', outputSummary: '', status: 'info' },
    { id: 'e2', experimentId: 'exp-test', scenarioId: 'sc-01', step: 2, timestamp: '', actionType: 'tool_result', inputSummary: '', outputSummary: '', status: 'success' },
    { id: 'e3', experimentId: 'exp-test', scenarioId: 'sc-02', step: 3, timestamp: '', actionType: 'tool_call', inputSummary: '', outputSummary: '', status: 'info' },
    { id: 'e4', experimentId: 'exp-test', scenarioId: 'sc-02', step: 4, timestamp: '', actionType: 'tool_result', inputSummary: '', outputSummary: '', status: 'error' },
  ];

  const results = engine.calculateEvaluation('exp-test', [run1, run2], events);

  assert.equal(results.totalScenarios, 2);
  assert.equal(results.passedScenarios, 1);
  assert.equal(results.failedScenarios, 1);
  assert.equal(results.taskCompletionRate, 100.0, 'Task completion should be 100% because both tasks reached an endpoint');
  assert.equal(results.policyComplianceRate, 50.0, 'Policy compliance should be 50% (1 passed, 1 violated)');
  assert.equal(results.correctOutcomeRate, 50.0, 'Correct outcome rate should be 50%');
  assert.equal(results.toolSuccessRate, 75.0, 'Tool success rate should be 75% (3/4 tool events succeeded)');
  assert.equal(results.failuresList.length, 1);
  assert.equal(results.failuresList[0].failureCategory, 'Policy Non-Compliance');
});
