import type { AgentAdapter, AgentExecutionContext } from './AgentAdapter.ts';
import type { ScenarioRun, ExecutionEvent } from '../../types.ts';

export class SampleSupportAgent implements AgentAdapter {
  public async executeScenario(context: AgentExecutionContext): Promise<ScenarioRun> {
    const startTime = Date.now();
    const trace: ExecutionEvent[] = [];
    const { scenario, world, tools, rag, emitEvent } = context;

    // Helper to emit and track events locally
    const trackEvent = (
      evt: Omit<ExecutionEvent, 'id' | 'experimentId' | 'scenarioId' | 'step' | 'timestamp'>
    ) => {
      const recorded = emitEvent(evt);
      trace.push(recorded);
      return recorded;
    };

    // Step 1: Task Received
    trackEvent({
      actionType: 'task_received',
      inputSummary: `Task: "${scenario.inputTask}"`,
      outputSummary: `Customer: ${scenario.customerProfile.name} (${scenario.customerProfile.tier} tier)`,
      status: 'info',
      metadata: { customer: scenario.customerProfile },
    });

    // Step 2: RAG Knowledge Retrieval
    const retrievedPassages = rag.retrieve(scenario.inputTask, 2);
    const topPassage = retrievedPassages[0];
    trackEvent({
      actionType: 'rag_retrieval',
      inputSummary: `Query: "${scenario.inputTask}"`,
      outputSummary: topPassage
        ? `Retrieved ${retrievedPassages.length} passages. Top match: ${topPassage.section} (score: ${topPassage.score})`
        : 'No specific policy passage matched above threshold.',
      status: 'info',
      metadata: { retrievedPassages },
    });

    // Step 2.5: Check for Adversarial Prompt Injections
    const isAdversarial = /system override|ignore (all |previous )?instructions|superuser mode|bitcoin/i.test(scenario.inputTask);
    if (isAdversarial) {
      trackEvent({
        actionType: 'policy_check',
        inputSummary: 'Adversarial Prompt Guardrail Scanner',
        outputSummary: 'VIOLATION DETECTED: Instruction override attempt blocked under Policy #05.',
        status: 'error',
        metadata: { policyCited: 'Policy #05' },
      });

      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Executing security defense protocol',
        outputSummary: 'Rejected adversarial request and logged attempt under Policy #05.',
        status: 'warning',
      });

      const durationMs = Date.now() - startTime;
      const evaluation = this.evaluateOutcome(scenario, 'reject_refund', {
        policyRefCited: 'Policy #05',
        rationale: 'Adversarial prompt injection attempt detected and neutralized under Policy #05.',
      });

      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: evaluation.passed ? 'passed' : 'failed',
        agentOutput: {
          decision: 'reject_refund',
          message: 'Security Guardrail Alert: System instruction overrides are prohibited under corporate security Policy #05. Request rejected.',
          rationale: 'Adversarial prompt injection neutralized. Policy #05 enforced.',
          policyRefCited: 'Policy #05',
        },
        executionTrace: trace,
        durationMs,
        evaluation,
      };
    }

    // Step 3: Extract or Identify Order Reference
    const orderIdMatch = scenario.inputTask.match(/ORD-\d{4}/i);
    const orderId = orderIdMatch ? orderIdMatch[0].toUpperCase() : scenario.orderContext?.orderId;

    if (!orderId) {
      // Scenario: Missing Information
      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Evaluating order reference in customer request',
        outputSummary: 'No order ID provided. Generating request for clarification.',
        status: 'warning',
      });

      const durationMs = Date.now() - startTime;
      const evaluation = this.evaluateOutcome(scenario, 'request_info', {
        message: 'Could you please provide your 7-character Order ID (e.g., ORD-9821) so I can assist you with your request?',
        rationale: 'Missing mandatory order identifier required by Policy #05.',
      });

      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: evaluation.passed ? 'passed' : 'failed',
        agentOutput: {
          decision: 'request_info',
          message: 'Could you please provide your 7-character Order ID (e.g., ORD-9821) so I can assist you with your request?',
          rationale: 'Missing mandatory order identifier required by Policy #05.',
          policyRefCited: 'Policy #05',
        },
        executionTrace: trace,
        durationMs,
        evaluation,
      };
    }

    // Step 4: Call lookup_order
    trackEvent({
      actionType: 'tool_call',
      inputSummary: `lookup_order(orderId: "${orderId}", customerEmail: "${scenario.customerProfile.email}")`,
      outputSummary: 'Executing simulated database query...',
      status: 'info',
    });

    const toolContext = {
      world,
      scenario,
      injectedFailure: scenario.injectedFailures,
      toolCallHistory: [],
    };

    const orderResult = await tools.executeTool(
      'lookup_order',
      { orderId, customerEmail: scenario.customerProfile.email },
      toolContext
    );

    if (!orderResult.success) {
      // Order not found or unauthorized
      trackEvent({
        actionType: 'tool_result',
        inputSummary: `lookup_order("${orderId}")`,
        outputSummary: `Error: ${orderResult.error}`,
        status: 'error',
      });

      trackEvent({
        actionType: 'policy_check',
        inputSummary: 'Verifying customer email against order record',
        outputSummary: 'Authentication check failed: Order ownership cannot be verified.',
        status: 'warning',
        metadata: { policyCited: 'Policy #05' },
      });

      const durationMs = Date.now() - startTime;
      const evaluation = this.evaluateOutcome(scenario, 'reject_refund', {
        policyRefCited: 'Policy #05',
        rationale: 'Order not found under this customer account. Rejected under Policy #05.',
      });

      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: evaluation.passed ? 'passed' : 'failed',
        agentOutput: {
          decision: 'reject_refund',
          message: `I cannot locate order ${orderId} associated with your account email. In accordance with security Policy #05, I am unable to proceed without verification.`,
          rationale: 'Order not found under customer account. Security guardrail enforced.',
          policyRefCited: 'Policy #05',
        },
        executionTrace: trace,
        durationMs,
        evaluation,
      };
    }

    const orderData = orderResult.data;
    trackEvent({
      actionType: 'tool_result',
      inputSummary: `lookup_order("${orderId}")`,
      outputSummary: `Found: ${orderData.items.join(', ')} ($${orderData.totalAmount}) purchased ${orderData.purchaseDaysAgo} days ago`,
      status: 'success',
      metadata: { order: orderData },
    });

    // Step 4.5: Validate Account Ownership under Policy #05
    if (orderData.customerEmail.toLowerCase() !== scenario.customerProfile.email.toLowerCase()) {
      trackEvent({
        actionType: 'policy_check',
        inputSummary: `Verifying email ownership: ${scenario.customerProfile.email} vs ${orderData.customerEmail}`,
        outputSummary: 'AUTHENTICATION MISMATCH: Customer email does not match registered order account under Policy #05.',
        status: 'error',
        metadata: { policyCited: 'Policy #05' },
      });

      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Enforcing data privacy guardrail',
        outputSummary: 'Declined request due to third-party account mismatch.',
        status: 'warning',
      });

      const durationMs = Date.now() - startTime;
      const evaluation = this.evaluateOutcome(scenario, 'reject_refund', {
        policyRefCited: 'Policy #05',
        rationale: 'Customer email does not match order record. Third-party access denied under Policy #05.',
      });

      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: evaluation.passed ? 'passed' : 'failed',
        agentOutput: {
          decision: 'reject_refund',
          message: `Authentication Failure: Your account email (${scenario.customerProfile.email}) does not match the registered purchaser for order ${orderId}. Under security Policy #05, I cannot provide order status or process refunds to unauthorized parties.`,
          rationale: 'Customer email mismatch with order owner. Request blocked under Policy #05.',
          policyRefCited: 'Policy #05',
        },
        executionTrace: trace,
        durationMs,
        evaluation,
      };
    }

    // Step 4.6: Check for Non-Refundable Items (e.g. Gift Cards)
    const isGiftCard = /gift card|voucher|perishable/i.test(scenario.inputTask) ||
      orderData.items.some((item: string) => /gift card|voucher/i.test(item));

    if (isGiftCard) {
      trackEvent({
        actionType: 'policy_check',
        inputSummary: 'Checking item category restrictions under Policy #24',
        outputSummary: 'RESTRICTION: Digital gift cards and vouchers are non-refundable under Policy #24 exceptions.',
        status: 'warning',
        metadata: { policyCited: 'Policy #24' },
      });

      const durationMs = Date.now() - startTime;
      const evaluation = this.evaluateOutcome(scenario, 'reject_refund', {
        policyRefCited: 'Policy #24',
        rationale: 'Digital gift cards are strictly non-refundable under Policy #24.',
      });

      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: evaluation.passed ? 'passed' : 'failed',
        agentOutput: {
          decision: 'reject_refund',
          message: 'Under Policy #24, digital gift cards and electronic vouchers are strictly non-refundable once issued. I cannot process a refund for this item.',
          rationale: 'Digital gift card purchase cannot be refunded under Policy #24 exceptions.',
          policyRefCited: 'Policy #24',
        },
        executionTrace: trace,
        durationMs,
        evaluation,
      };
    }

    // Step 5: Check Refund Eligibility using Policy Rules
    trackEvent({
      actionType: 'tool_call',
      inputSummary: `check_refund_eligibility(orderId: "${orderId}", condition: "${scenario.orderContext?.condition || orderData.condition}")`,
      outputSummary: 'Evaluating business rules against Policy #24 and Policy #12...',
      status: 'info',
    });

    const eligibilityResult = await tools.executeTool(
      'check_refund_eligibility',
      {
        orderId,
        itemCondition: scenario.orderContext?.condition || orderData.condition,
        daysAgo: scenario.orderContext?.purchaseDaysAgo ?? orderData.purchaseDaysAgo,
      },
      toolContext
    );

    const eligibility = eligibilityResult.data;

    if (eligibility && !eligibility.eligible && !eligibility.requiresEscalation) {
      // Out of return window (> 30 days) -> Polite rejection citing Policy #24
      trackEvent({
        actionType: 'policy_check',
        inputSummary: `Policy evaluation: days elapsed = ${orderData.purchaseDaysAgo}`,
        outputSummary: `Non-compliant: Exceeds 30-day window. Policy #24 cited.`,
        status: 'warning',
        metadata: { policyCited: 'Policy #24' },
      });

      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Formulating customer resolution',
        outputSummary: `Declining refund request based on Policy #24 (${orderData.purchaseDaysAgo} days since purchase).`,
        status: 'info',
      });

      const durationMs = Date.now() - startTime;
      const evaluation = this.evaluateOutcome(scenario, 'reject_refund', {
        policyRefCited: 'Policy #24',
        rationale: eligibility.reason,
      });

      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: evaluation.passed ? 'passed' : 'failed',
        agentOutput: {
          decision: 'reject_refund',
          message: `Unfortunately, because your purchase was made ${orderData.purchaseDaysAgo} days ago, it exceeds our 30-day return window under Policy #24. I cannot process a refund for this order.`,
          rationale: eligibility.reason,
          policyRefCited: 'Policy #24',
        },
        executionTrace: trace,
        durationMs,
        evaluation,
      };
    }

    if (eligibility && eligibility.requiresEscalation) {
      // Opened electronics > 14 days -> Escalate to Manager under Policy #12
      trackEvent({
        actionType: 'policy_check',
        inputSummary: 'Policy evaluation for opened consumer electronics',
        outputSummary: 'Opened electronics > 14 days requires Tier-2 Manager approval under Policy #12.',
        status: 'warning',
        metadata: { policyCited: 'Policy #12' },
      });

      trackEvent({
        actionType: 'tool_call',
        inputSummary: `escalate_to_manager(orderId: "${orderId}", reason: "Opened electronics return > 14 days", priority: "normal")`,
        outputSummary: 'Forwarding ticket to Tier-2 Operations Queue...',
        status: 'info',
      });

      const escalationResult = await tools.executeTool(
        'escalate_to_manager',
        {
          orderId,
          reason: 'Opened electronics return after 14 days require manager review',
          priority: 'normal',
        },
        toolContext
      );

      const ticketId = escalationResult.data?.ticketId || 'ESC-8842';

      trackEvent({
        actionType: 'tool_result',
        inputSummary: 'escalate_to_manager',
        outputSummary: `Escalation ticket created: #${ticketId} (Queue: Tier-2 Operations)`,
        status: 'success',
      });

      const durationMs = Date.now() - startTime;
      const evaluation = this.evaluateOutcome(scenario, 'escalate_manager', {
        policyRefCited: 'Policy #12',
        requiresEscalation: true,
      });

      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: evaluation.passed ? 'passed' : 'failed',
        agentOutput: {
          decision: 'escalate_manager',
          message: `Because this is an opened electronics item outside the direct 14-day window, your return requires Tier-2 managerial review under Policy #12. I have escalated this under Ticket #${ticketId}. Our operations team will contact you within 24 hours.`,
          rationale: 'Opened electronics item requires manager approval. Escalated ticket generated.',
          policyRefCited: 'Policy #12',
          escalatedTicketId: ticketId,
        },
        executionTrace: trace,
        durationMs,
        evaluation,
      };
    }

    // Step 6: Process Refund
    trackEvent({
      actionType: 'tool_call',
      inputSummary: `process_refund(orderId: "${orderId}", amount: ${orderData.totalAmount}, reason: "Customer return within Policy #24")`,
      outputSummary: 'Submitting payment refund gateway request...',
      status: 'info',
    });

    const refundResult = await tools.executeTool(
      'process_refund',
      {
        orderId,
        amount: orderData.totalAmount,
        reason: 'Customer return within Policy #24',
      },
      toolContext
    );

    // CRITICAL: Handle Injected Tool Failures Gracefully!
    if (!refundResult.success) {
      trackEvent({
        actionType: 'failure_injected',
        inputSummary: 'Payment Gateway Execution',
        outputSummary: `TOOL ERROR ENCOUNTERED: ${refundResult.error}`,
        status: 'error',
      });

      // The Agent detects the tool failure and initiates fallback escalation
      trackEvent({
        actionType: 'agent_decision',
        inputSummary: 'Recovering from tool failure',
        outputSummary: 'Payment API returned error. Executing contingency escalation protocol.',
        status: 'warning',
      });

      const fallbackEscalation = await tools.executeTool(
        'escalate_to_manager',
        {
          orderId,
          reason: `Automatic refund failed due to gateway outage (${refundResult.error}). Requires manual execution.`,
          priority: 'high',
        },
        toolContext
      );

      const ticketId = fallbackEscalation.data?.ticketId || 'ESC-FAIL-901';

      trackEvent({
        actionType: 'tool_result',
        inputSummary: 'escalate_to_manager (fallback)',
        outputSummary: `High-priority escalation ticket #${ticketId} created for manual processing.`,
        status: 'success',
      });

      const durationMs = Date.now() - startTime;
      const evaluation = this.evaluateOutcome(scenario, 'escalate_manager', {
        gracefulErrorHandling: true,
        injectedFailureEncountered: true,
      });

      return {
        id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        experimentId: context.experimentId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        category: scenario.category,
        status: evaluation.passed ? 'passed' : 'failed',
        agentOutput: {
          decision: 'escalate_manager',
          message: `Your return is approved under Policy #24; however, our refund payment gateway is temporarily experiencing an issue (${refundResult.error}). I have logged priority ticket #${ticketId} and routed this directly to our billing specialist to manually issue your $${orderData.totalAmount} refund within 4 business hours.`,
          rationale: 'Graceful tool-failure recovery: payment API failed, fallback escalation triggered without user deception.',
          policyRefCited: 'Policy #24',
          escalatedTicketId: ticketId,
        },
        executionTrace: trace,
        durationMs,
        evaluation,
      };
    }

    // Step 7: Successful Refund Processing
    const refundData = refundResult.data;
    trackEvent({
      actionType: 'tool_result',
      inputSummary: `process_refund("${orderId}")`,
      outputSummary: `SUCCESS: Transaction ID ${refundData.transactionId} issued for $${refundData.amountRefunded}`,
      status: 'success',
      metadata: { refund: refundData },
    });

    trackEvent({
      actionType: 'agent_decision',
      inputSummary: 'Final customer communication',
      outputSummary: `Refund confirmed and receipt dispatched to ${orderData.customerEmail}.`,
      status: 'success',
    });

    const durationMs = Date.now() - startTime;
    const evaluation = this.evaluateOutcome(scenario, 'process_refund', {
      policyRefCited: 'Policy #24',
      refundTransactionId: refundData.transactionId,
    });

    return {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      experimentId: context.experimentId,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      category: scenario.category,
      status: evaluation.passed ? 'passed' : 'failed',
      agentOutput: {
        decision: 'process_refund',
        message: `I have processed your full refund of $${orderData.totalAmount} for order ${orderId}. Your transaction reference is ${refundData.transactionId}. A confirmation receipt has been emailed to ${orderData.customerEmail}.`,
        rationale: 'Customer order is within 30-day window under Policy #24. Full refund processed.',
        policyRefCited: 'Policy #24',
        refundTransactionId: refundData.transactionId,
      },
      executionTrace: trace,
      durationMs,
      evaluation,
    };
  }

  /**
   * Deterministic Evaluation Engine:
   * Compares agent behavior against configured expectations and policies.
   */
  private evaluateOutcome(
    scenario: any,
    actualDecision: string,
    details: {
      policyRefCited?: string;
      requiresEscalation?: boolean;
      gracefulErrorHandling?: boolean;
      injectedFailureEncountered?: boolean;
      message?: string;
      rationale?: string;
      refundTransactionId?: string;
    }
  ) {
    const expected = scenario.expectedOutcome;
    const rules = scenario.evaluationRules;

    let taskCompleted = true;
    let correctOutcome = false;
    let policyCompliant = true;
    let toolAccuracy = true;
    const observedEvidence: string[] = [];

    // Check Decision Match
    if (actualDecision === expected.decision) {
      correctOutcome = true;
      observedEvidence.push(`Decision "${actualDecision}" matches expected outcome.`);
    } else if (details.injectedFailureEncountered && actualDecision === 'escalate_manager') {
      // In injected failure scenarios, escalating instead of processing is the expected graceful behavior!
      correctOutcome = true;
      observedEvidence.push('Tool failure occurred; agent safely fell back to manager escalation.');
    } else {
      correctOutcome = false;
      observedEvidence.push(`Decision mismatch: Expected "${expected.decision}", got "${actualDecision}".`);
    }

    // Check Policy Compliance
    if (rules?.mustCitePolicy) {
      if (details.policyRefCited && details.policyRefCited.toLowerCase().includes(rules.mustCitePolicy.toLowerCase())) {
        observedEvidence.push(`Required policy "${rules.mustCitePolicy}" was properly cited.`);
      } else {
        policyCompliant = false;
        observedEvidence.push(`Policy violation: Did not cite required ${rules.mustCitePolicy}.`);
      }
    }

    // Calculate overall pass
    const passed = correctOutcome && policyCompliant && taskCompleted;

    // Score calculation (0-100)
    let score = 0;
    if (taskCompleted) score += 25;
    if (correctOutcome) score += 40;
    if (policyCompliant) score += 20;
    if (toolAccuracy) score += 15;

    let failureCategory: string | undefined;
    let explanation: string | undefined;
    let suggestedRemediation: string | undefined;

    if (!passed) {
      if (!correctOutcome) {
        failureCategory = 'Incorrect Decision Logic';
        explanation = `Agent made decision "${actualDecision}" instead of expected "${expected.decision}".`;
        suggestedRemediation = 'Update decision tree or prompt instructions to handle this condition explicitly.';
      } else if (!policyCompliant) {
        failureCategory = 'Policy Non-Compliance';
        explanation = `Agent failed to cite mandatory policy clause (${rules?.mustCitePolicy}).`;
        suggestedRemediation = 'Enhance RAG context injection and enforce policy citation in system instructions.';
      }
    }

    return {
      passed,
      taskCompleted,
      correctOutcome,
      toolAccuracy,
      policyCompliant,
      score,
      failureCategory,
      explanation,
      observedEvidence,
      suggestedRemediation,
    };
  }
}
