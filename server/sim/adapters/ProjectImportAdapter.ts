import type { AgentAdapter, AgentExecutionContext } from './AgentAdapter.ts';
import type { ScenarioRun, ExecutionEvent } from '../../types.ts';

export class ProjectImportAdapter implements AgentAdapter {
  public async executeScenario(context: AgentExecutionContext): Promise<ScenarioRun> {
    const startTime = Date.now();
    const trace: ExecutionEvent[] = [];
    const { agent, scenario, emitEvent } = context;

    const trackEvent = (
      evt: Omit<ExecutionEvent, 'id' | 'experimentId' | 'scenarioId' | 'step' | 'timestamp'>
    ) => {
      const recorded = emitEvent(evt);
      trace.push(recorded);
      return recorded;
    };

    trackEvent({
      actionType: 'task_received',
      inputSummary: `Imported Project Task requested: "${scenario.inputTask}"`,
      outputSummary: `Repository: ${agent.repoUrl || 'Not configured'} | Entrypoint: ${agent.entrypoint || 'Not configured'}`,
      status: 'info',
    });

    const runnerUrl = process.env.AGENT_RUNNER_URL;
    const runnerToken = process.env.AGENT_RUNNER_TOKEN;

    // Check if an isolated container runner is configured
    if (!runnerUrl) {
      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Inspecting isolated execution infrastructure',
        outputSummary: 'CONFIGURATION REQUIRED: AGENT_RUNNER_URL is not configured. Isolated container worker required.',
        status: 'error',
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
          message:
            'Isolated execution runner is not configured. Untrusted imported code cannot be executed directly in the main server process. Set AGENT_RUNNER_URL in .env to connect a Docker or isolated worker environment.',
          rationale: 'Security enforcement: Isolated container runner required for arbitrary repository execution.',
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
          failureCategory: 'Isolated Runner Not Configured',
          explanation:
            'A repository URL is source code, not automatically runnable. AGENT_RUNNER_URL must be configured to execute imported projects in an isolated sandbox.',
          suggestedRemediation:
            'Configure AGENT_RUNNER_URL and AGENT_RUNNER_TOKEN in .env, or use the Built-in Sample Support Agent or an HTTP API Agent.',
        },
      };
    }

    // If runner is configured, dispatch execution to the isolated container runner
    try {
      trackEvent({
        actionType: 'tool_call',
        inputSummary: `Dispatching to isolated runner: ${runnerUrl}`,
        outputSummary: `Forwarding repo ${agent.repoUrl} and scenario context with ${agent.timeoutMs || 10000}ms timeout...`,
        status: 'info',
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), agent.timeoutMs || 10000);

      const resp = await fetch(`${runnerUrl.replace(/\/$/, '')}/run-scenario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(runnerToken ? { Authorization: `Bearer ${runnerToken}` } : {}),
        },
        body: JSON.stringify({
          repoUrl: agent.repoUrl,
          entrypoint: agent.entrypoint,
          task: scenario.inputTask,
          customer: scenario.customerProfile,
          orderContext: scenario.orderContext,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        throw new Error(`Isolated runner returned HTTP ${resp.status}: ${resp.statusText}`);
      }

      const data: any = await resp.json();
      const durationMs = Date.now() - startTime;
      const passed = data.decision === scenario.expectedOutcome.decision;

      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Isolated runner response received',
        outputSummary: `Decision: ${data.decision}`,
        status: passed ? 'success' : 'warning',
      });

      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: passed ? 'passed' : 'failed',
        agentOutput: {
          decision: data.decision || 'unknown',
          message: data.message || '',
          rationale: data.rationale || 'Isolated runner output',
          policyRefCited: data.policyRef,
        },
        executionTrace: trace,
        durationMs,
        evaluation: {
          passed,
          taskCompleted: true,
          correctOutcome: passed,
          toolAccuracy: true,
          policyCompliant: passed,
          score: passed ? 100 : 30,
          failureCategory: passed ? undefined : 'Incorrect Decision',
          explanation: passed ? undefined : `Expected ${scenario.expectedOutcome.decision}, got ${data.decision}`,
        },
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      trackEvent({
        actionType: 'error',
        inputSummary: 'Isolated runner dispatch failed',
        outputSummary: err.message,
        status: 'error',
      });

      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: 'error',
        agentOutput: {
          decision: 'error',
          message: `Isolated runner execution failed: ${err.message}`,
          rationale: 'Subprocess communication error in isolated container.',
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
          failureCategory: 'Runner Execution Failure',
          explanation: err.message,
          suggestedRemediation: 'Check isolated runner logs and verify repository entrypoint.',
        },
      };
    }
  }
}
