import type { AgentAdapter, AgentExecutionContext } from './AgentAdapter.ts';
import type { ScenarioRun, ExecutionEvent } from '../../types.ts';

export class CliAgentAdapter implements AgentAdapter {
  public async executeScenario(context: AgentExecutionContext): Promise<ScenarioRun> {
    const startTime = Date.now();
    const trace: ExecutionEvent[] = [];
    const { agent, scenario, emitEvent } = context;

    emitEvent({
      actionType: 'task_received',
      inputSummary: `CLI Task requested: "${scenario.inputTask}"`,
      outputSummary: `Configured Command: ${agent.cliCommand || 'none'}`,
      status: 'warning',
    });

    const durationMs = Date.now() - startTime;

    return {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      experimentId: context.experimentId,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      category: scenario.category,
      status: 'error',
      agentOutput: {
        decision: 'error',
        message: 'CLI Agent runner is sandboxed in demo mode. Set ENABLE_CLI_RUNNER=true in environment to execute subprocesses.',
        rationale: 'Security boundary: Arbitrary command execution restricted in review sandbox.',
      },
      executionTrace: trace,
      durationMs,
      evaluation: {
        passed: false,
        taskCompleted: false,
        correctOutcome: false,
        toolAccuracy: false,
        policyCompliant: false,
        score: 0,
        failureCategory: 'Execution Sandbox Restriction',
        explanation: 'Local command runner requires explicit ENABLE_CLI_RUNNER flag in environment.',
        suggestedRemediation: 'Use the Built-in Sample Support Agent or an API Agent endpoint for automated runs.',
      },
    };
  }
}
