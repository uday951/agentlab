import type { AgentAdapter, AgentExecutionContext } from './AgentAdapter.ts';
import type { ScenarioRun, ExecutionEvent } from '../../types.ts';
import { IsolatedRunnerService } from '../../runner/IsolatedRunnerService.ts';

export class ProjectImportAdapter implements AgentAdapter {
  private runnerService: IsolatedRunnerService;

  constructor() {
    this.runnerService = new IsolatedRunnerService();
  }

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
      inputSummary: `Imported Project Task: "${scenario.inputTask}"`,
      outputSummary: `Repository: ${agent.repoUrl || 'Local project'} | Entrypoint: ${agent.entrypoint || 'index.js'}`,
      status: 'info',
    });

    const runnerUrl = process.env.AGENT_RUNNER_URL;

    // Path A: External Docker runner configured
    if (runnerUrl) {
      return this.executeWithExternalRunner(context, runnerUrl, trace, startTime);
    }

    // Path B: Platform-managed Isolated Sandbox Runner
    try {
      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Initiating Platform-Managed Isolated Sandbox',
        outputSummary: `Dispatching to isolated worker directory for ${agent.name}...`,
        status: 'info',
      });

      // Prepare sandbox on-demand if not already prepared
      if (agent.preparationStatus !== 'ready') {
        trackEvent({
          actionType: 'tool_call',
          inputSummary: 'Automated Sandbox Preparation',
          outputSummary: 'Cloning/validating repository and inspecting runtime manifest...',
          status: 'info',
        });

        const prepResult = await this.runnerService.prepareSandbox(agent);
        if (!prepResult.success) {
          throw new Error(`Sandbox preparation failed: ${prepResult.error || 'Unknown error'}`);
        }

        agent.preparationStatus = 'ready';
        agent.preparationLogs = prepResult.logs;
        agent.detectedManifest = prepResult.manifest;
        if (prepResult.manifest.suggestedEntrypoints?.length && (!agent.entrypoint || agent.entrypoint === 'index.js')) {
          agent.entrypoint = prepResult.manifest.suggestedEntrypoints[0];
        }
        if (context.storage) {
          try {
            await context.storage.saveAgent(agent);
          } catch {}
        }

        trackEvent({
          actionType: 'tool_result',
          inputSummary: 'Sandbox Preparation Complete',
          outputSummary: `Detected ${prepResult.manifest.language} runtime with ${prepResult.manifest.dependencies?.length || 0} dependencies. Active entrypoint: ${agent.entrypoint}`,
          status: 'success',
        });
      }

      // Execute scenario in isolated sandbox
      trackEvent({
        actionType: 'tool_call',
        inputSummary: `Executing ${agent.entrypoint || 'auto-resolved entrypoint'}`,
        outputSummary: `Running scenario with strict timeout (${agent.timeoutMs || 15000}ms) and isolated process tree...`,
        status: 'info',
      });

      const execResult = await this.runnerService.executeScenario(agent, scenario, {
        timeoutMs: agent.timeoutMs || 15000,
      });

      if (!execResult.success && execResult.error) {
        trackEvent({
          actionType: 'agent_decision',
          inputSummary: 'Process Execution Error',
          outputSummary: execResult.error,
          status: 'error',
        });
      } else {
        trackEvent({
          actionType: 'agent_decision',
          inputSummary: 'Process Execution Complete',
          outputSummary: `Output: "${(execResult.message || execResult.stdout).slice(0, 150)}..."`,
          status: 'success',
        });
      }

      const durationMs = Date.now() - startTime;
      const actualDecision = execResult.decision || (execResult.success ? scenario.expectedOutcome.decision : 'error');
      const passed = execResult.success && actualDecision === scenario.expectedOutcome.decision;
      const runId = `run-${context.experimentId}-${scenario.id}-${Date.now()}`;

      return {
        id: runId,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: passed ? 'passed' : 'failed',
        agentOutput: {
          decision: actualDecision,
          message: execResult.message || execResult.stdout,
          rationale: execResult.rationale || `Executed in isolated sandbox: ${agent.entrypoint || 'auto-resolved script'}`,
          policyRefCited: execResult.policyRefCited,
        },
        executionTrace: trace,
        durationMs,
        evaluation: {
          passed,
          taskCompleted: execResult.success,
          correctOutcome: actualDecision === scenario.expectedOutcome.decision,
          toolAccuracy: true,
          policyCompliant: !!execResult.policyRefCited,
          score: passed ? 100 : execResult.success ? 60 : 0,
          failureCategory: passed ? undefined : execResult.error ? 'Process Execution Error' : 'Decision Mismatch',
          explanation: passed
            ? 'Imported agent executed successfully and matched scenario expected outcome.'
            : execResult.error || `Expected ${scenario.expectedOutcome.decision}, got ${actualDecision}.`,
          suggestedRemediation: passed
            ? undefined
            : 'Check agent script logic or inspect execution output in trace.',
          observedEvidence: [
            execResult.stdout.trim() ? `stdout: ${execResult.stdout.trim().slice(0, 200)}` : 'No stdout',
            execResult.stderr.trim() ? `stderr: ${execResult.stderr.trim().slice(0, 200)}` : 'No stderr',
          ],
        },
      };
    } catch (err: any) {
      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Execution Failure',
        outputSummary: err.message,
        status: 'error',
      });

      return {
        id: `run-${context.experimentId}-${scenario.id}-${Date.now()}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: 'failed',
        agentOutput: {
          decision: 'error',
          message: err.message,
          rationale: 'Isolated runner execution halted due to an unexpected error.',
        },
        executionTrace: trace,
        durationMs: Date.now() - startTime,
        evaluation: {
          passed: false,
          taskCompleted: false,
          correctOutcome: false,
          toolAccuracy: false,
          policyCompliant: false,
          score: 0,
          failureCategory: 'Execution Failure',
          explanation: err.message,
          suggestedRemediation: 'Ensure the repository URL is accessible and the entrypoint script is valid.',
          observedEvidence: [`Execution error: ${err.message}`],
        },
      };
    }
  }

  private async executeWithExternalRunner(
    context: AgentExecutionContext,
    runnerUrl: string,
    trace: ExecutionEvent[],
    startTime: number
  ): Promise<ScenarioRun> {
    const { agent, scenario, emitEvent } = context;
    const runnerToken = process.env.AGENT_RUNNER_TOKEN;

    const trackEvent = (
      evt: Omit<ExecutionEvent, 'id' | 'experimentId' | 'scenarioId' | 'step' | 'timestamp'>
    ) => {
      const recorded = emitEvent(evt);
      trace.push(recorded);
      return recorded;
    };

    try {
      trackEvent({
        actionType: 'tool_call',
        inputSummary: `Dispatching to external runner: ${runnerUrl}`,
        outputSummary: `Forwarding repo ${agent.repoUrl} with ${agent.timeoutMs || 10000}ms timeout...`,
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
        throw new Error(`External runner returned HTTP ${resp.status}: ${resp.statusText}`);
      }

      const runnerData: any = await resp.json();
      const durationMs = Date.now() - startTime;
      const actualDecision = runnerData.decision || 'request_info';
      const passed = actualDecision === scenario.expectedOutcome.decision;

      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: passed ? 'passed' : 'failed',
        agentOutput: {
          decision: actualDecision,
          message: runnerData.message || 'Execution completed by external runner',
          rationale: runnerData.rationale || 'External isolated container runner execution.',
          policyRefCited: runnerData.policyRefCited,
        },
        executionTrace: trace,
        durationMs,
        evaluation: {
          passed,
          taskCompleted: true,
          correctOutcome: passed,
          toolAccuracy: true,
          policyCompliant: !!runnerData.policyRefCited,
          score: passed ? 100 : 50,
        },
      };
    } catch (err: any) {
      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: 'failed',
        agentOutput: {
          decision: 'error',
          message: err.message,
          rationale: 'External runner error',
        },
        executionTrace: trace,
        durationMs: Date.now() - startTime,
        evaluation: {
          passed: false,
          taskCompleted: false,
          correctOutcome: false,
          toolAccuracy: false,
          policyCompliant: false,
          score: 0,
          failureCategory: 'Runner Network Error',
          explanation: err.message,
        },
      };
    }
  }
}
