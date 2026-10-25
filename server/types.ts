export type ConnectionType = 'builtin' | 'api' | 'cli' | 'import';

export interface Agent {
  id: string;
  name: string;
  description: string;
  connectionType: ConnectionType;
  model: string;
  endpoint?: string;
  authType?: 'none' | 'bearer' | 'api_key' | 'basic';
  authHeader?: string;
  headers?: Record<string, string>;
  requestMapping?: string;
  responseMapping?: string;
  cliCommand?: string;
  workingDir?: string;
  repoUrl?: string;
  branch?: string;
  entrypoint?: string;
  runtime?: string;
  envVars?: Record<string, string>;
  projectConfig?: Record<string, any>;
  preparationStatus?: 'not_prepared' | 'preparing' | 'ready' | 'failed';
  preparationLogs?: string;
  detectedManifest?: Record<string, any>;
  capabilities: string[];
  tools: string[];
  timeoutMs: number;
  status: 'ready' | 'needs_configuration' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface PlatformConfig {
  id: string;
  llmProvider: string;
  llmApiKey?: string;
  llmModel: string;
  githubToken?: string;
  enableCliRunner: boolean;
  agentRunnerMode: 'builtin-sandbox' | 'external-docker';
  agentRunnerUrl?: string;
  agentRunnerToken?: string;
  maxExecutionTimeoutMs: number;
  maxOutputSizeBytes: number;
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
  sourceAgentId?: string;
  generatedBy?: 'ai' | 'fallback' | 'manual';
  generationStatus?: 'analyzing' | 'generating' | 'validating' | 'ready' | 'needs_configuration';
  detectedDomain?: string;
  detectedCapabilities?: string[];
  version?: number;
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

// ==========================================
// AI Coding Agent Benchmark Platform Types
// ==========================================

export type BenchmarkOrigin = 'lovable' | 'emergent' | 'bolt' | 'replit' | 'generic_github' | 'zip_upload' | 'agentlab_agent';

export type BenchmarkProjectSource = 'github' | 'zip';

export interface ProjectAnalysis {
  framework: string;
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'unknown';
  runtime: 'nodejs' | 'python' | 'unknown';
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'pip' | 'poetry' | 'none';
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  lockfileDetected: boolean;
  buildScript?: string;
  testScript?: string;
  startScript?: string;
  devScript?: string;
  entrypoints: {
    frontend?: string;
    backend?: string;
    root?: string;
  };
  structure: {
    isMonorepo: boolean;
    frontendDir?: string;
    backendDir?: string;
  };
  databaseDetected?: string;
  authDetected?: string;
  referencedEnvVars: string[];
  existingTestFiles: string[];
  likelyCapabilities: string[];
  supportedRuntime: boolean;
  unsupportedReasons?: string[];
}

export interface BenchmarkProject {
  id: string;
  name: string;
  description?: string;
  source: BenchmarkProjectSource;
  origin: BenchmarkOrigin;
  repoUrl?: string;
  branch?: string;
  commitSha?: string;
  zipFileName?: string;
  benchmarkCategory?: string; // e.g. 'task_management' | 'ecommerce' | 'dashboard' | 'auth' | 'saas' | 'api'
  analysis?: ProjectAnalysis;
  preparationStatus: 'not_prepared' | 'preparing' | 'ready' | 'needs_configuration' | 'failed';
  preparationLogs?: string;
  envVars?: Record<string, string>;
  missingRequirements?: string[];
  detectedServices?: string[];
  createdAt: string;
  updatedAt: string;
}

export type BenchmarkScenarioType =
  | 'browser'
  | 'api'
  | 'build'
  | 'unit_test'
  | 'static_security'
  | 'accessibility'
  | 'responsive'
  | 'persistence';

export interface BenchmarkScenario {
  id: string;
  name: string;
  objective: string;
  category: 'functional' | 'build' | 'accessibility' | 'responsive' | 'security' | 'persistence';
  type: BenchmarkScenarioType;
  preconditions?: string;
  testData?: Record<string, any>;
  executionSteps: string[];
  expectedResult: string;
  testSpec?: {
    targetUrlPath?: string;
    actionSequence?: Array<{
      action: 'navigate' | 'click' | 'fill' | 'check' | 'wait' | 'assert_text' | 'assert_element' | 'reload';
      selector?: string;
      value?: string;
      timeoutMs?: number;
    }>;
    apiEndpoint?: string;
    apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    apiHeaders?: Record<string, string>;
    apiBody?: any;
    expectedStatusCode?: number;
    expectedResponseBodyContains?: string;
  };
}

export interface ScoringWeights {
  functional: number;       // default 50
  buildReliability: number; // default 20
  accessibility: number;    // default 10
  responsive: number;       // default 10
  security: number;         // default 10
}

export interface BenchmarkDefinition {
  id: string;
  projectId: string;
  category: string;
  name: string;
  description: string;
  generatedBy: 'ai' | 'template';
  scoringWeights: ScoringWeights;
  scenarios: BenchmarkScenario[];
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkScenarioRun {
  scenarioId: string;
  name: string;
  category: 'functional' | 'build' | 'accessibility' | 'responsive' | 'security' | 'persistence';
  type: BenchmarkScenarioType;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  durationMs: number;
  expectedResult: string;
  actualResult: string;
  logs: string[];
  screenshots?: string[]; // base64 images or relative paths
  traces?: any;
  errorMessage?: string;
}

export interface BenchmarkRunSummary {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  skippedScenarios: number;
  errorScenarios: number;
  overallScore: number; // 0 to 100
  categoryScores: {
    functional: { score: number; available: boolean; weight: number };
    buildReliability: { score: number; available: boolean; weight: number };
    accessibility: { score: number; available: boolean; weight: number };
    responsive: { score: number; available: boolean; weight: number };
    security: { score: number; available: boolean; weight: number };
  };
  failureCategories: string[];
  actionableDebuggingSuggestions: string[];
}

export interface BenchmarkRun {
  id: string;
  projectId: string;
  projectName: string;
  projectOrigin: BenchmarkOrigin;
  benchmarkId: string;
  commitSha?: string;
  status: 'queued' | 'preparing' | 'needs_configuration' | 'running' | 'completed' | 'failed' | 'cancelled';
  failureType?: 'application' | 'infrastructure';
  buildStatus: 'passed' | 'failed' | 'skipped' | 'not_run';
  buildOutput?: string;
  scenarioRuns: BenchmarkScenarioRun[];
  summary: BenchmarkRunSummary;
  executionDurationMs: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface ProviderComparisonItem {
  projectId: string;
  projectName: string;
  origin: BenchmarkOrigin;
  runId: string;
  runDate: string;
  commitSha?: string;
  buildSuccess: boolean;
  functionalPassRate: number; // 0-100%
  overallScore: number;       // 0-100
  accessibilityScore: number; // 0-100
  responsiveScore: number;    // 0-100
  securityScore: number;      // 0-100
  durationMs: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failureCategories: string[];
  status: string;
  failureType?: 'application' | 'infrastructure';
}

export interface BenchmarkDashboardStats {
  totalProjects: number;
  completedRuns: number;
  failedRuns: number;
  averageTestPassRate: number;
  buildSuccessRate: number;
  averageExecutionDurationMs: number;
  mostCommonFailureCategories: Array<{ category: string; count: number }>;
  providerComparisons: Array<{
    origin: BenchmarkOrigin;
    projectCount: number;
    runsCount: number;
    averageScore: number;
    buildSuccessRate: number;
    passRate: number;
  }>;
}

// ==========================================
// AI Platform Direct Connection & MCP Types
// ==========================================

export interface McpDiscoveredTool {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
}

export type ProviderConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'needs_configuration';

export interface ProviderConnection {
  provider: 'lovable' | 'bolt' | 'replit' | 'emergent';
  name: string;
  status: ProviderConnectionStatus;
  authType: 'oauth' | 'api_key' | 'unsupported_direct';
  accountEmail?: string;
  accountName?: string;
  workspaceId?: string;
  workspaceName?: string;
  serverUrl?: string; // e.g. https://mcp.lovable.dev
  accessToken?: string; // Server-side only (never sent to client)
  refreshToken?: string; // Server-side only
  tokenExpiresAt?: string;
  supportedOperations: string[];
  discoveredTools: McpDiscoveredTool[];
  directPromptGeneration: boolean;
  githubExportSupported: boolean;
  zipImportSupported: boolean;
  guidanceNotes?: string;
  lastCheckedAt: string;
  updatedAt: string;
}

export type GenerationJobStatus =
  | 'draft'
  | 'prompt_approved'
  | 'submitting'
  | 'generating'
  | 'retrieving_code'
  | 'completed'
  | 'failed';

export type GenerationFailureReason =
  | 'provider_generation_failure'
  | 'quota_exceeded'
  | 'auth_error'
  | 'retrieval_failure'
  | 'preparation_failure';

export interface GenerationJob {
  id: string;
  provider: 'lovable' | 'bolt' | 'replit' | 'emergent';
  projectName: string;
  userPrompt: string;
  benchmarkCategory: string;
  inferredBenchmarkSpec?: {
    category: string;
    description: string;
    requiredCapabilities: string[];
    suggestedScenarios: string[];
  };
  creditWarningAccepted: boolean;
  status: GenerationJobStatus;
  failureReason?: GenerationFailureReason;
  errorMessage?: string;
  providerProjectId?: string;
  providerJobId?: string;
  providerProjectUrl?: string;
  resultProjectId?: string; // Linked to BenchmarkProject
  logs: string[];
  createdAt: string;
  completedAt?: string;
}


