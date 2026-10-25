import type { World, Scenario } from '../types.ts';

export interface ToolExecutionContext {
  world: World;
  scenario: Scenario;
  injectedFailure?: {
    toolName: string;
    failureType: string;
    failureMessage: string;
  };
  toolCallHistory: {
    toolName: string;
    params: any;
    result: any;
    success: boolean;
    durationMs: number;
  }[];
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  injectedFailureTriggered?: boolean;
}

export class ShopSphereToolRegistry {
  private orders: any[];
  private dynamicInjectedFailures: Map<string, any> = new Map();

  constructor(initialOrders: any[] = []) {
    this.orders = initialOrders.length > 0 ? initialOrders : DEFAULT_ORDERS;
  }

  public injectFailure(toolName: string, failure: any) {
    this.dynamicInjectedFailures.set(toolName, { toolName, ...failure });
  }

  public clearInjectedFailures() {
    this.dynamicInjectedFailures.clear();
  }

  public async executeTool(
    toolName: string,
    params: Record<string, any>,
    context: Partial<ToolExecutionContext> = {}
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const toolCallHistory = context.toolCallHistory || [];
    const injectedFailure = context.injectedFailure || this.dynamicInjectedFailures.get(toolName);

    // Check if failure is injected for this tool in this scenario
    if (injectedFailure && injectedFailure.toolName === toolName) {
      const failMsg = injectedFailure.failureMessage || `Simulated failure: ${injectedFailure.failureType}`;
      const failResult: ToolResult = {
        success: false,
        error: failMsg,
        injectedFailureTriggered: true,
      };

      toolCallHistory.push({
        toolName,
        params,
        result: failResult,
        success: false,
        durationMs: Date.now() - startTime,
      });

      return failResult;
    }

    let result: ToolResult;

    switch (toolName) {
      case 'lookup_order':
        result = this.lookupOrder(params.orderId, params.customerEmail);
        break;

      case 'retrieve_policy':
        result = this.retrievePolicy(params.policyRef, params.topic, context.world);
        break;

      case 'check_refund_eligibility':
        result = this.checkRefundEligibility(params.orderId, params.itemCondition, params.daysAgo, context.world);
        break;

      case 'process_refund':
        result = this.processRefund(params.orderId, params.amount, params.reason);
        break;

      case 'escalate_to_manager':
        result = this.escalateToManager(params.orderId, params.reason, params.priority);
        break;

      // Software Engineering & DevOps Tools
      case 'read_file': {
        const filePath = params.path || 'src/index.ts';
        const fileContent = context.world?.initialData?.files?.[filePath] || '// Virtual file contents for ' + filePath + '\nexport const ready = true;';
        result = { success: true, data: { path: filePath, content: fileContent } };
        break;
      }

      case 'run_unit_tests': {
        result = {
          success: true,
          data: {
            testSuite: params.testSuite || 'all',
            passed: true,
            totalTests: 14,
            passedTests: 14,
            failedTests: 0,
            durationMs: 420,
          },
        };
        break;
      }

      case 'lint_code': {
        result = {
          success: true,
          data: {
            clean: true,
            filesChecked: 8,
            warnings: 0,
            errors: 0,
          },
        };
        break;
      }

      case 'execute_build': {
        result = {
          success: true,
          data: {
            buildId: 'bld-' + Math.random().toString(36).slice(2, 8),
            target: params.target || 'production',
            status: 'success',
            bundleSizeKb: 148,
          },
        };
        break;
      }

      case 'create_pull_request': {
        result = {
          success: true,
          data: {
            prNumber: Math.floor(Math.random() * 50) + 1,
            title: params.title || 'Automated feature verification',
            branch: params.branch || 'feature/verification',
            status: 'opened',
            url: `https://github.com/organization/repo/pull/${Math.floor(Math.random() * 50) + 1}`,
          },
        };
        break;
      }

      // Research & Evidence Synthesis Tools
      case 'search_documents': {
        const query = (params.query || '').toLowerCase();
        const docs = context.world?.knowledgeDocuments || [];
        const matches = docs.filter(
          (d) => d.title.toLowerCase().includes(query) || d.content.toLowerCase().includes(query)
        );
        result = {
          success: true,
          data: {
            query: params.query,
            totalMatches: matches.length > 0 ? matches.length : 1,
            documents: matches.length > 0 ? matches : docs.slice(0, 2),
          },
        };
        break;
      }

      case 'fetch_source_citation': {
        const doi = params.doi || '10.1038/s41586-024-0012';
        const paper = context.world?.initialData?.papers?.find((p: any) => p.doi === doi) || {
          doi,
          title: 'Mechanistic Circuits in Large Language Models',
          year: 2024,
          verified: true,
        };
        result = { success: true, data: paper };
        break;
      }

      case 'verify_fact': {
        result = {
          success: true,
          data: {
            claim: params.claim,
            verified: true,
            confidence: 0.96,
            evidenceCitation: 'Corpus Document #01',
          },
        };
        break;
      }

      // Dynamic Custom Simulated Tools
      default: {
        const definedTool = context.world?.simulatedTools?.find((t) => t.name === toolName);
        if (definedTool) {
          result = {
            success: true,
            data: {
              tool: toolName,
              executed: true,
              inputParameters: params,
              output: `Simulated operation for ${toolName} completed successfully.`,
              timestamp: new Date().toISOString(),
            },
          };
        } else {
          result = {
            success: false,
            error: `Unknown tool: ${toolName}. Available tools: ${[
              'lookup_order',
              'retrieve_policy',
              'check_refund_eligibility',
              'process_refund',
              'escalate_to_manager',
              'read_file',
              'run_unit_tests',
              'lint_code',
              'execute_build',
              'create_pull_request',
              'search_documents',
              'fetch_source_citation',
              'verify_fact',
              ...(context.world?.simulatedTools?.map((t) => t.name) || []),
            ].join(', ')}`,
          };
        }
      }
    }

    if (context.toolCallHistory) {
      context.toolCallHistory.push({
        toolName,
        params,
        result,
        success: result.success,
        durationMs: Date.now() - startTime,
      });
    }

    return result;
  }

  private lookupOrder(orderId?: string, customerEmail?: string): ToolResult {
    if (!orderId && !customerEmail) {
      return { success: false, error: 'Must provide either orderId or customerEmail to lookup order.' };
    }

    const order = this.orders.find(o =>
      (orderId && o.orderId.toLowerCase() === orderId.toLowerCase()) ||
      (customerEmail && o.customerEmail.toLowerCase() === customerEmail.toLowerCase())
    );

    if (!order) {
      return {
        success: false,
        error: `Order not found with query: ${orderId || customerEmail}.`,
      };
    }

    return {
      success: true,
      data: order,
    };
  }

  private retrievePolicy(policyRef?: string, topic?: string, world?: World): ToolResult {
    const policies = world?.initialData?.policies || DEFAULT_POLICIES;

    if (policyRef) {
      const found = policies.find((p: any) => p.ref.toLowerCase() === policyRef.toLowerCase());
      if (found) {
        return { success: true, data: found };
      }
    }

    if (topic) {
      const matched = policies.filter((p: any) =>
        p.title.toLowerCase().includes(topic.toLowerCase()) ||
        p.rule.toLowerCase().includes(topic.toLowerCase())
      );
      if (matched.length > 0) {
        return { success: true, data: matched[0] };
      }
    }

    // Default to main refund policy #24
    return {
      success: true,
      data: policies[0] || { ref: 'Policy #24', rule: 'Refunds permitted within 30 days of delivery.' },
    };
  }

  private checkRefundEligibility(orderId: string, itemCondition?: string, daysAgo?: number, world?: World): ToolResult {
    const orderLookup = this.lookupOrder(orderId);
    if (!orderLookup.success || !orderLookup.data) {
      return { success: false, error: `Cannot check eligibility: order ${orderId} does not exist.` };
    }

    const order = orderLookup.data;
    const days = daysAgo !== undefined ? daysAgo : order.purchaseDaysAgo || 10;
    const condition = itemCondition || order.condition || 'unopened';

    // Policy #24: Refund within 30 days if unopened, within 14 days if opened electronics
    const isWithin30Days = days <= 30;
    const isElectronics = order.category === 'electronics';

    if (!isWithin30Days) {
      return {
        success: true,
        data: {
          eligible: false,
          reason: `Purchase was made ${days} days ago. Policy #24 strictly prohibits refunds after 30 days.`,
          policyCited: 'Policy #24',
          suggestedAction: 'reject_refund',
        },
      };
    }

    if (isElectronics && condition === 'opened' && days > 14) {
      return {
        success: true,
        data: {
          eligible: false,
          requiresEscalation: true,
          reason: `Opened electronics after 14 days require Tier-2 Manager approval under Policy #12.`,
          policyCited: 'Policy #12',
          suggestedAction: 'escalate_manager',
        },
      };
    }

    return {
      success: true,
      data: {
        eligible: true,
        maxRefundAmount: order.totalAmount,
        currency: 'USD',
        policyCited: 'Policy #24',
        suggestedAction: 'process_refund',
      },
    };
  }

  private processRefund(orderId: string, amount: number, reason: string): ToolResult {
    if (!orderId || amount <= 0) {
      return { success: false, error: 'Invalid refund payload. orderId and positive amount required.' };
    }

    const orderIndex = this.orders.findIndex(o => o.orderId.toLowerCase() === orderId.toLowerCase());
    const order = orderIndex >= 0 ? this.orders[orderIndex] : null;

    if (order && amount > order.totalAmount) {
      return {
        success: false,
        error: `Refund amount ($${amount}) exceeds order total ($${order.totalAmount}).`,
      };
    }

    const refundId = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      success: true,
      data: {
        transactionId: refundId,
        orderId,
        amountRefunded: amount,
        status: 'COMPLETED',
        paymentMethod: order?.paymentMethod || 'Credit Card (Visa ending in 4242)',
        processedAt: new Date().toISOString(),
        receiptEmail: order?.customerEmail || 'customer@example.com',
      },
    };
  }

  private escalateToManager(orderId: string, reason: string, priority = 'normal'): ToolResult {
    const ticketId = `ESC-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      success: true,
      data: {
        ticketId,
        orderId,
        assignedQueue: 'Tier-2 Customer Operations',
        priority,
        reason,
        slaHours: priority === 'high' ? 4 : 24,
        createdAt: new Date().toISOString(),
      },
    };
  }
}

export const DEFAULT_ORDERS = [
  {
    orderId: 'ORD-9821',
    customerEmail: 'sarah.j@example.com',
    customerName: 'Sarah Jenkins',
    items: ['Ergonomic Leather Desk Chair'],
    category: 'home',
    totalAmount: 249.99,
    purchaseDaysAgo: 12,
    deliveryStatus: 'Delivered',
    condition: 'unopened',
    paymentMethod: 'Mastercard ending in 1182',
  },
  {
    orderId: 'ORD-5412',
    customerEmail: 'alex.rivera@example.com',
    customerName: 'Alex Rivera',
    items: ['Noise Cancelling Headphones V3'],
    category: 'electronics',
    totalAmount: 189.50,
    purchaseDaysAgo: 45, // >30 days!
    deliveryStatus: 'Delivered',
    condition: 'opened',
    paymentMethod: 'Visa ending in 9021',
  },
  {
    orderId: 'ORD-7734',
    customerEmail: 'marcus.v@example.com',
    customerName: 'Marcus Vance',
    items: ['Smart 4K Projector'],
    category: 'electronics',
    totalAmount: 499.00,
    purchaseDaysAgo: 18, // Opened electronics between 14-30 days -> Requires Manager escalation!
    deliveryStatus: 'Delivered',
    condition: 'opened',
    paymentMethod: 'PayPal',
  },
  {
    orderId: 'ORD-1099',
    customerEmail: 'elena.rodriguez@example.com',
    customerName: 'Elena Rodriguez',
    items: ['Merino Wool Winter Coat'],
    category: 'apparel',
    totalAmount: 129.00,
    purchaseDaysAgo: 5,
    deliveryStatus: 'Delivered',
    condition: 'damaged',
    paymentMethod: 'Apple Pay',
  },
];

export const DEFAULT_POLICIES = [
  {
    ref: 'Policy #24',
    title: 'Standard Product Refund Policy',
    rule: 'Full refunds are permitted within 30 days of delivery if products are unopened, in original packaging, or arrived damaged with photographic proof.',
    exceptions: 'Excludes digital gift cards, custom items, and opened hygiene products.',
  },
  {
    ref: 'Policy #12',
    title: 'Consumer Electronics Return Guidelines',
    rule: 'Consumer electronics opened within 14 days may be refunded with a 10% restocking fee. Electronics opened between 15-30 days require Tier-2 Manager escalation.',
    exceptions: 'Defective units covered under 1-year manufacturer warranty.',
  },
  {
    ref: 'Policy #05',
    title: 'Security and Authentication Guardrails',
    rule: 'Agents must verify order ownership via matching customer email or order ID before disclosing order amounts or initiating refunds. Never process unauthenticated refunds.',
    exceptions: 'None.',
  },
];
