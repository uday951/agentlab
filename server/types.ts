export type ConnectionType = 'builtin' | 'api' | 'cli' | 'import';

export interface Agent {
  id: string;
  name: string;
  description: string;
  connectionType: ConnectionType;
  model: string;
  endpoint?: string;
  headers?: Record<string, string>;
  requestMapping?: string;
  responseMapping?: string;
  cliCommand?: string;
  capabilities: string[];
  tools: string[];
  timeoutMs: number;
  status: 'ready' | 'needs_configuration' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  chunks?: { id: string; text: string; section: string }[];
}

export interface SimulatedTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; required?: boolean }>;
    required?: string[];
  };
  enabled: boolean;
  failProbability?: number; // 0 to 1
  forceFailure?: boolean;
  failureMessage?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  tier: 'standard' | 'vip' | 'new';
  behaviorTrait: string;
}

export interface World {
  id: string;
  name: string;
  industry: string;
  description: string;
  systemRules: string[];
  knowledgeDocuments: KnowledgeDocument[];
  simulatedTools: SimulatedTool[];
  customerProfiles: CustomerProfile[];
  eventConditions: string[];
  successCriteria: string[];
  initialData: {
    orders?: any[];
    customers?: any[];
    policies?: any[];
  };
  createdAt: string;
  updatedAt: string;
}

export type ScenarioCategory =
  | 'normal'
  | 'edge_case'
  | 'adversarial'
  | 'tool_failure'
  | 'policy_conflict'
  | 'escalation';

export interface Scenario {
  id: string;
  worldId: string;
  title: string;
  description: string;
  category: ScenarioCategory;
  customerProfile: CustomerProfile;
  inputTask: string;
  orderContext?: {
    orderId: string;
    item: string;
    amount: number;
    purchaseDaysAgo: number;
    condition: 'unopened' | 'opened' | 'damaged' | 'lost';
    category: 'electronics' | 'apparel' | 'home';
  };
  injectedFailures?: {
    toolName: string;
    failureType: 'timeout' | 'http_500' | 'permission_denied' | 'network_drop';
    failureMessage: string;
  };
  expectedOutcome: {
    decision: 'process_refund' | 'reject_refund' | 'escalate_manager' | 'request_info' | 'provide_info';
    policyRef?: string;
    requiresEscalation?: boolean;
    gracefulErrorHandling?: boolean;
  };
  evaluationRules: {
    mustCallTools?: string[];
    mustNotCallTools?: string[];
    mustCitePolicy?: string;
    maxAllowedTurns?: number;
  };
}

export type ExperimentStatus = 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';

export interface ExecutionEvent {
  id: string;
  experimentId: string;
  scenarioId: string;
  step: number;
  timestamp: string;
  actionType:
    | 'task_received'
    | 'rag_retrieval'
    | 'tool_call'
    | 'tool_result'
    | 'agent_decision'
    | 'policy_check'
    | 'failure_injected'
    | 'evaluation';
  inputSummary: string;
  outputSummary: string;
  status: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

export interface ScenarioRun {
  id: string;
  experimentId: string;
  scenarioId: string;
  scenarioTitle: string;
  category: ScenarioCategory;
  status: 'passed' | 'failed' | 'error';
  agentOutput: {
    decision: string;
    message: string;
    rationale: string;
    policyRefCited?: string;
    escalatedTicketId?: string;
    refundTransactionId?: string;
  };
  executionTrace: ExecutionEvent[];
  durationMs: number;
  evaluation: {
    passed: boolean;
    taskCompleted: boolean;
    correctOutcome: boolean;
    toolAccuracy: boolean;
    policyCompliant: boolean;
    score: number; // 0 to 100
    failureCategory?: string;
    explanation?: string;
    observedEvidence?: string[];
    suggestedRemediation?: string;
  };
}

export interface EvaluationResult {
  experimentId: string;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  taskCompletionRate: number; // e.g. 90.0%
  correctOutcomeRate: number;  // e.g. 80.0%
  toolSuccessRate: number;     // e.g. 85.5%
  policyComplianceRate: number;// e.g. 95.0%
  overallScore: number;
  toolFailureCount: number;
  incorrectDecisionCount: number;
  averageDurationMs: number;
  estimatedCost: string;
  failuresList: {
    scenarioId: string;
    scenarioTitle: string;
    expected: string;
    actual: string;
    failureCategory: string;
    explanation: string;
    observedEvidence: string[];
    suggestedRemediation: string;
  }[];
}

export interface Experiment {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  worldId: string;
  worldName: string;
  scenarioIds: string[];
  status: ExperimentStatus;
  scenarioCount: number;
  progress: number; // 0 to 100
  runs: ScenarioRun[];
  events: ExecutionEvent[];
  results?: EvaluationResult;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
