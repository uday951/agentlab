import type { AgentAdapter, AgentExecutionContext } from './AgentAdapter.ts';
import type { ScenarioRun, ExecutionEvent } from '../../types.ts';

export class ApiAgentAdapter implements AgentAdapter {
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
      inputSummary: `Task dispatched to API Agent (${agent.name})`,
      outputSummary: `Endpoint: ${agent.endpoint}`,
      status: 'info',
    });

    if (!agent.endpoint) {
      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Validating API configuration',
        outputSummary: 'Configuration error: Missing endpoint URL.',
        status: 'error',
      });

      return this.createErrorRun(context, trace, startTime, 'Agent endpoint URL is missing.');
    }

    // SSRF Validation
    if (this.isBlockedUrl(agent.endpoint)) {
      trackEvent({
        actionType: 'policy_check',
        inputSummary: `SSRF Guardrail Check for: ${agent.endpoint}`,
        outputSummary: 'BLOCKED: Target URL resolves to localhost or private network address.',
        status: 'error',
      });

      return this.createErrorRun(
        context,
        trace,
        startTime,
        'SSRF Security Guardrail: Localhost and internal private addresses are blocked.'
      );
    }

    try {
      trackEvent({
        actionType: 'tool_call',
        inputSummary: `HTTP POST ${agent.endpoint}`,
        outputSummary: `Sending task payload with ${agent.timeoutMs || 5000}ms timeout...`,
        status: 'info',
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), agent.timeoutMs || 5000);

      // Build headers with authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(agent.headers || {}),
      };

      if (agent.authType === 'bearer' && agent.authHeader) {
        headers['Authorization'] = `Bearer ${agent.authHeader}`;
      } else if (agent.authType === 'api_key' && agent.authHeader) {
        headers['X-API-Key'] = agent.authHeader;
      } else if (agent.authType === 'basic' && agent.authHeader) {
        headers['Authorization'] = `Basic ${agent.authHeader}`;
      }

      // Build payload with configurable request mapping
      let payload: any = {
        task: scenario.inputTask,
        customer: scenario.customerProfile,
        orderContext: scenario.orderContext,
        availableTools: agent.tools,
      };

      if (agent.requestMapping) {
        try {
          const mapping = JSON.parse(agent.requestMapping);
          payload = { ...payload, ...mapping };
        } catch {
          // Keep default payload if custom mapping is not valid JSON
        }
      }

      const response = await fetch(agent.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData: any = await response.json();

      trackEvent({
        actionType: 'tool_result',
        inputSummary: `HTTP Response from ${agent.endpoint}`,
        outputSummary: `Status 200 OK: ${JSON.stringify(responseData).slice(0, 100)}...`,
        status: 'success',
      });

      // Extract decision using response mapping or standard properties
      let decision = responseData.decision;
      let message = responseData.message || '';
      let rationale = responseData.rationale || '';
      let policyRef = responseData.policyRef;

      // Handle OpenAI format (choices[0].message.content)
      if (!decision && responseData.choices && responseData.choices[0]?.message) {
        const content = responseData.choices[0].message.content || '';
        message = content;
        try {
          const parsed = JSON.parse(content);
          decision = parsed.decision;
          rationale = parsed.rationale || parsed.reasoning || '';
          policyRef = parsed.policyRef;
        } catch {
          decision = content.includes('refund') ? 'process_refund' : 'provide_info';
        }
      }

      if (!decision) {
        decision = 'request_info';
      }

      const durationMs = Date.now() - startTime;
      const passed = decision === scenario.expectedOutcome.decision;

      trackEvent({
        actionType: 'agent_decision',
        inputSummary: `Agent reached conclusion: ${decision}`,
        outputSummary: message || rationale || 'No response message provided',
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
          decision,
          message,
          rationale: rationale || 'External API agent decision response',
          policyRefCited: policyRef,
        },
        executionTrace: trace,
        durationMs,
        evaluation: {
          passed,
          taskCompleted: true,
          correctOutcome: passed,
          toolAccuracy: true,
          policyCompliant: passed,
          score: passed ? 100 : 35,
          failureCategory: passed ? undefined : 'Incorrect Decision',
          explanation: passed
            ? 'External agent matched expected scenario decision.'
            : `Expected "${scenario.expectedOutcome.decision}", but agent decided "${decision}".`,
          suggestedRemediation: passed
            ? undefined
            : 'Adjust agent system prompt or model parameters to align with world policies.',
        },
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      trackEvent({
        actionType: 'error',
        inputSummary: 'External API Call Failed',
        outputSummary: err.name === 'AbortError' ? `Request timed out after ${agent.timeoutMs || 5000}ms` : err.message,
        status: 'error',
      });

      return this.createErrorRun(
        context,
        trace,
        startTime,
        err.name === 'AbortError' ? `Timeout: Request exceeded ${agent.timeoutMs || 5000}ms` : err.message
      );
    }
  }

  private isBlockedUrl(endpointUrl: string): boolean {
    try {
      const url = new URL(endpointUrl);
      const host = url.hostname.toLowerCase();

      // Check protocol
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return true;
      }

      // Localhost & loopback
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
        return true;
      }

      // Link-local & cloud metadata (AWS, GCP, Azure metadata services)
      if (host === '169.254.169.254' || host.startsWith('169.254.')) {
        return true;
      }

      // Private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
      if (host.startsWith('10.') || host.startsWith('192.168.')) {
        return true;
      }

      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) {
        return true;
      }

      return false;
    } catch {
      return true;
    }
  }

  private createErrorRun(
    context: AgentExecutionContext,
    trace: ExecutionEvent[],
    startTime: number,
    errorMsg: string
  ): ScenarioRun {
    return {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      experimentId: context.experimentId,
      scenarioId: context.scenario.id,
      scenarioTitle: context.scenario.title,
      category: context.scenario.category,
      status: 'error',
      agentOutput: {
        decision: 'error',
        message: errorMsg,
        rationale: 'API communication or configuration failure.',
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
        failureCategory: 'API Connection Error',
        explanation: errorMsg,
        suggestedRemediation: 'Verify the external endpoint is accessible and handles POST requests.',
      },
    };
  }
}
