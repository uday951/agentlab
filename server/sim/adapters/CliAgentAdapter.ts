import type { AgentAdapter, AgentExecutionContext } from './AgentAdapter.ts';
import type { ScenarioRun, ExecutionEvent } from '../../types.ts';
import { spawn } from 'child_process';

const APPROVED_EXECUTABLES = new Set([
  'node',
  'python',
  'python3',
  'deno',
  'bun',
  'sh',
  'bash',
]);

export class CliAgentAdapter implements AgentAdapter {
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
      inputSummary: `CLI Task requested: "${scenario.inputTask}"`,
      outputSummary: `Configured Command: ${agent.cliCommand || 'none'}`,
      status: 'info',
    });

    const isEnabled = process.env.ENABLE_CLI_RUNNER === 'true';

    if (!isEnabled) {
      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Verifying CLI security policy',
        outputSummary: 'CONFIGURATION REQUIRED: ENABLE_CLI_RUNNER is false in server environment.',
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
            'CLI subprocess execution is disabled by default for security. Set ENABLE_CLI_RUNNER=true in server .env to authorize approved command execution.',
          rationale: 'Security boundary: Arbitrary local subprocess execution requires explicit opt-in.',
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
          explanation:
            'Local command execution requires ENABLE_CLI_RUNNER=true in server environment variables.',
          suggestedRemediation:
            'Enable the CLI runner in server environment or use the Built-in Sample Support Agent.',
        },
      };
    }

    if (!agent.cliCommand || agent.cliCommand.trim().length === 0) {
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
          message: 'No CLI command specified for this agent.',
          rationale: 'Configuration error: cliCommand is empty.',
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
          failureCategory: 'Invalid Command Configuration',
          explanation: 'The agent has no command configured.',
          suggestedRemediation: 'Provide an approved command (e.g. `node agent.js`).',
        },
      };
    }

    // Command Validation & Sanitization: Ensure binary is in whitelist and no dangerous operators
    const commandParts = agent.cliCommand.trim().split(/\s+/);
    const binary = commandParts[0].toLowerCase().replace(/^.*[\\\/]/, '').replace(/\.exe$/, '');

    // Check for dangerous shell metacharacters
    if (/[;&|><`$]/.test(agent.cliCommand)) {
      trackEvent({
        actionType: 'policy_check',
        inputSummary: 'Command security validation',
        outputSummary: 'BLOCKED: Command contains disallowed shell operators or chaining.',
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
          message: 'Command rejected: Disallowed shell metacharacters detected.',
          rationale: 'Security policy: Command chaining or redirection is blocked.',
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
          failureCategory: 'Security Violation',
          explanation: 'Command chaining or redirection is forbidden.',
        },
      };
    }

    if (!APPROVED_EXECUTABLES.has(binary)) {
      trackEvent({
        actionType: 'policy_check',
        inputSummary: 'Binary whitelist validation',
        outputSummary: `BLOCKED: "${binary}" is not in approved executable whitelist (${Array.from(APPROVED_EXECUTABLES).join(', ')}).`,
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
          message: `Executable "${binary}" is not permitted. Approved runners: ${Array.from(APPROVED_EXECUTABLES).join(', ')}`,
          rationale: 'Security boundary: Unapproved binaries rejected.',
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
          failureCategory: 'Unapproved Executable',
          explanation: `Executable must be one of: ${Array.from(APPROVED_EXECUTABLES).join(', ')}`,
        },
      };
    }

    // Execute approved command with timeout and output capture
    try {
      trackEvent({
        actionType: 'tool_call',
        inputSummary: `Executing: ${agent.cliCommand}`,
        outputSummary: 'Spawning child process with stdin scenario JSON payload...',
        status: 'info',
      });

      const payload = JSON.stringify({
        task: scenario.inputTask,
        customer: scenario.customerProfile,
        orderContext: scenario.orderContext,
      });

      const child = spawn(commandParts[0], commandParts.slice(1), {
        timeout: agent.timeoutMs || 5000,
        cwd: agent.workingDir || process.cwd(),
        env: {
          PATH: process.env.PATH,
          NODE_ENV: 'test',
        },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
        if (stdout.length > 50000) child.kill(); // Max output limit
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.stdin.write(payload);
      child.stdin.end();

      const exitCode: number = await new Promise((resolve) => {
        child.on('close', resolve);
        child.on('error', () => resolve(-1));
      });

      const durationMs = Date.now() - startTime;

      if (exitCode !== 0) {
        throw new Error(`Process exited with code ${exitCode}. Error output: ${stderr.slice(0, 200)}`);
      }

      let parsedOutput: any = {};
      try {
        parsedOutput = JSON.parse(stdout);
      } catch {
        parsedOutput = { decision: 'provide_info', message: stdout.trim() };
      }

      const passed = parsedOutput.decision === scenario.expectedOutcome.decision;

      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Process completed successfully',
        outputSummary: `Decision: ${parsedOutput.decision || 'none'}`,
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
          decision: parsedOutput.decision || 'unknown',
          message: parsedOutput.message || '',
          rationale: parsedOutput.rationale || 'CLI stdout output',
          policyRefCited: parsedOutput.policyRef,
        },
        executionTrace: trace,
        durationMs,
        evaluation: {
          passed,
          taskCompleted: true,
          correctOutcome: passed,
          toolAccuracy: true,
          policyCompliant: passed,
          score: passed ? 100 : 40,
        },
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      trackEvent({
        actionType: 'error',
        inputSummary: 'Subprocess error',
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
          message: err.message,
          rationale: 'Process execution error or timeout.',
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
          failureCategory: 'Process Runtime Error',
          explanation: err.message,
        },
      };
    }
  }
}
