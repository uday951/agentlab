export interface Agent {
  id: string;
  name: string;
  description: string;
  connectionType: 'builtin' | 'api' | 'cli' | 'import';
  model: string;
  endpoint?: string;
  authType?: 'none' | 'bearer' | 'api_key' | 'basic';
  authHeader?: string;
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
  detectedManifest?: {
    language?: string;
    runtimeVersion?: string;
    dependencies?: string[];
    suggestedEntrypoints?: string[];
  };
  headers?: Record<string, string>;
  capabilities: string[];
  tools: string[];
  timeoutMs: number;
  status: 'ready' | 'needs_configuration' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  worldId?: string;
  title: string;
  category: string;
  content: string;
  chunks?: {
    id?: string;
    chunkId?: string;
    section: string;
    text: string;
    tokenCount?: number;
  }[];
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
  simulatedTools: {
    name: string;
    description: string;
    parameters: any;
    enabled: boolean;
  }[];
  customerProfiles: {
    id: string;
    name: string;
    email: string;
    tier: string;
    behaviorTrait: string;
  }[];
  eventConditions: string[];
  successCriteria: string[];
  initialData: any;
  createdAt: string;
  updatedAt: string;
}

export interface Scenario {
  id: string;
  worldId: string;
  title: string;
  description: string;
  category: string;
  customerProfile: any;
  inputTask: string;
  orderContext?: any;
  injectedFailures?: any;
  expectedOutcome: {
    decision: string;
    policyRef?: string;
    requiresEscalation?: boolean;
    gracefulErrorHandling?: boolean;
  };
  evaluationRules: any;
}

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
  metadata?: any;
}

export interface ScenarioRun {
  id: string;
  experimentId: string;
  scenarioId: string;
  scenarioTitle: string;
  category: string;
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
    score: number;
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
  taskCompletionRate: number;
  correctOutcomeRate: number;
  toolSuccessRate: number;
  policyComplianceRate: number;
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
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  scenarioCount: number;
  progress: number;
  runs: ScenarioRun[];
  events: ExecutionEvent[];
  results?: EvaluationResult;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SystemHealth {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  database: {
    type: string;
    connected: boolean;
    error: string | null;
  };
  infrastructure: {
    isolatedRunnerConfigured: boolean;
    cliRunnerEnabled: boolean;
    githubTokenConfigured: boolean;
    llmProvider: string;
  };
  uptimeSeconds: number;
  timestamp: string;
}

const API_BASE = '/api';

export const api = {
  // Health & Telemetry
  getHealth: async (): Promise<SystemHealth> => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await res.json();
    } catch (e: any) {
      return {
        status: 'degraded',
        service: 'AgentLab Simulation Backend',
        version: '2.0.0-production',
        database: { type: 'mongodb', connected: false, error: 'Cannot connect to backend API server.' },
        infrastructure: {
          isolatedRunnerConfigured: false,
          cliRunnerEnabled: false,
          githubTokenConfigured: false,
          llmProvider: 'builtin-deterministic',
        },
        uptimeSeconds: 0,
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Agents
  getAgents: async (): Promise<Agent[]> => {
    const res = await fetch(`${API_BASE}/agents`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to fetch agents');
    return json.data || [];
  },

  createAgent: async (data: Partial<Agent>): Promise<Agent> => {
    const res = await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to create agent');
    return json.data;
  },

  testAgent: async (id: string) => {
    const res = await fetch(`${API_BASE}/agents/${id}/test`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Agent connection test failed');
    return json;
  },

  prepareAgent: async (id: string) => {
    const res = await fetch(`${API_BASE}/agents/${id}/prepare`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Agent preparation failed');
    return json;
  },

  updateAgent: async (id: string, data: Partial<Agent>): Promise<Agent> => {
    const res = await fetch(`${API_BASE}/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to update agent');
    return json.data;
  },

  inspectRepo: async (repoUrl: string) => {
    const res = await fetch(`${API_BASE}/agents/inspect-repo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Repository inspection failed');
    return json;
  },

  deleteAgent: async (id: string) => {
    const res = await fetch(`${API_BASE}/agents/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to delete agent');
    return json;
  },

  // Worlds
  getWorlds: async (): Promise<World[]> => {
    const res = await fetch(`${API_BASE}/worlds`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to fetch worlds');
    return json.data || [];
  },

  getWorld: async (id: string): Promise<World> => {
    const res = await fetch(`${API_BASE}/worlds/${id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to fetch world');
    return json.data;
  },

  updateWorld: async (id: string, data: Partial<World>): Promise<World> => {
    const res = await fetch(`${API_BASE}/worlds/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to update world');
    return json.data;
  },

  // Knowledge Documents & Local RAG
  getKnowledgeDocuments: async (worldId: string): Promise<KnowledgeDocument[]> => {
    const res = await fetch(`${API_BASE}/worlds/${worldId}/documents`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to fetch knowledge documents');
    return json.data || [];
  },

  createKnowledgeDocument: async (
    worldId: string,
    data: { title: string; category: string; content: string }
  ): Promise<KnowledgeDocument> => {
    const res = await fetch(`${API_BASE}/worlds/${worldId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to create knowledge document');
    return json.data;
  },

  deleteKnowledgeDocument: async (worldId: string, docId: string) => {
    const res = await fetch(`${API_BASE}/worlds/${worldId}/documents/${docId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to delete knowledge document');
    return json;
  },

  searchKnowledge: async (
    worldId: string,
    query: string,
    topK = 3
  ): Promise<{ data: any[]; retriever: string; queriedDocumentsCount: number }> => {
    const res = await fetch(`${API_BASE}/worlds/${worldId}/documents/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Knowledge search failed');
    return json;
  },

  getScenarios: async (worldId: string): Promise<Scenario[]> => {
    const res = await fetch(`${API_BASE}/worlds/${worldId}/scenarios`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to fetch scenarios');
    return json.data || [];
  },

  // Experiments
  getExperiments: async (): Promise<Experiment[]> => {
    const res = await fetch(`${API_BASE}/experiments`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to fetch experiments');
    return json.data || [];
  },

  getExperiment: async (id: string): Promise<Experiment> => {
    const res = await fetch(`${API_BASE}/experiments/${id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to fetch experiment');
    return json.data;
  },

  createExperiment: async (data: {
    name: string;
    agentId: string;
    worldId: string;
    scenarioIds: string[];
  }): Promise<Experiment> => {
    const res = await fetch(`${API_BASE}/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to create experiment');
    return json.data;
  },

  runExperiment: async (id: string) => {
    const res = await fetch(`${API_BASE}/experiments/${id}/run`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to run experiment');
    return json;
  },

  cancelExperiment: async (id: string) => {
    const res = await fetch(`${API_BASE}/experiments/${id}/cancel`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to cancel experiment');
    return json;
  },

  // 1-Click College Review Demo
  runQuickDemo: async (): Promise<{ success: boolean; experiment: Experiment }> => {
    const res = await fetch(`${API_BASE}/demo/run-quick`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to initiate quick demo');
    return json;
  },

  // Export URLs
  getExportUrl: (id: string, format: 'json' | 'csv') => {
    return `${API_BASE}/experiments/${id}/export?format=${format}`;
  },

  // Real-time SSE Stream
  createEventStream: (experimentId: string, onMessage: (event: any) => void) => {
    const es = new EventSource(`${API_BASE}/experiments/${experimentId}/stream`);
    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onMessage(parsed);
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };
    return es;
  },

  // Infrastructure & Admin Settings
  getInfrastructure: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/infrastructure`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to fetch infrastructure status');
    return json.data;
  },

  updateInfrastructure: async (data: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/infrastructure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || 'Failed to update infrastructure');
    return json;
  },

  testLlmProvider: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/infrastructure/test-llm`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.message || 'LLM ping test failed');
    return json;
  },

  testGitHubToken: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/infrastructure/test-github`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.message || 'GitHub token test failed');
    return json;
  },

  // Auto-Generate Environment for Agent
  autoGenerateWorld: async (
    agentId: string,
    forceRegenerate = false
  ): Promise<{
    world: World;
    scenarios: Scenario[];
    isNew: boolean;
    generatedBy: 'ai' | 'fallback';
    detectedDomain: string;
    detectedCapabilities: string[];
  }> => {
    const res = await fetch(`${API_BASE}/worlds/auto-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, forceRegenerate }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.message || 'Failed to generate environment');
    return json.data;
  },

  getWorldForAgent: async (
    agentId: string
  ): Promise<{ world: World; scenarios: Scenario[] } | null> => {
    const res = await fetch(`${API_BASE}/worlds/agent/${agentId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || json.message || 'Failed to fetch agent world');
    return json.data;
  },

  // --- AI Coding Benchmark APIs ---
  getBenchmarkStats: async (): Promise<BenchmarkDashboardStats> => {
    const res = await fetch(`${API_BASE}/benchmark/stats`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch benchmark stats');
    return json.stats;
  },

  getBenchmarkProjects: async (): Promise<BenchmarkProject[]> => {
    const res = await fetch(`${API_BASE}/benchmark/projects`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch benchmark projects');
    return json.projects;
  },

  getBenchmarkProject: async (id: string): Promise<BenchmarkProject> => {
    const res = await fetch(`${API_BASE}/benchmark/projects/${id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch project details');
    return json.project;
  },

  addBenchmarkProject: async (data: FormData | Record<string, any>): Promise<BenchmarkProject> => {
    let res: Response;
    if (data instanceof FormData) {
      res = await fetch(`${API_BASE}/benchmark/projects`, {
        method: 'POST',
        body: data,
      });
    } else {
      res = await fetch(`${API_BASE}/benchmark/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to add benchmark project');
    return json.project;
  },

  prepareBenchmarkProject: async (id: string, githubToken?: string): Promise<BenchmarkProject> => {
    const res = await fetch(`${API_BASE}/benchmark/projects/${id}/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubToken }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to prepare environment');
    return json.project;
  },

  updateBenchmarkProjectConfig: async (id: string, config: { envVars?: Record<string, string>; benchmarkCategory?: string }): Promise<BenchmarkProject> => {
    const res = await fetch(`${API_BASE}/benchmark/projects/${id}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update project configuration');
    return json.project;
  },

  deleteBenchmarkProject: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/benchmark/projects/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete project');
  },

  getBenchmarkDefinitions: async (projectId: string): Promise<BenchmarkDefinition[]> => {
    const res = await fetch(`${API_BASE}/benchmark/projects/${projectId}/benchmarks`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch benchmarks');
    return json.benchmarks;
  },

  generateBenchmark: async (projectId: string, category?: string): Promise<BenchmarkDefinition> => {
    const res = await fetch(`${API_BASE}/benchmark/projects/${projectId}/generate-benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to generate benchmark');
    return json.benchmark;
  },

  updateBenchmarkDefinition: async (id: string, data: Partial<BenchmarkDefinition>): Promise<BenchmarkDefinition> => {
    const res = await fetch(`${API_BASE}/benchmark/benchmarks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update benchmark definition');
    return json.benchmark;
  },

  executeBenchmarkRun: async (projectId: string, benchmarkId?: string): Promise<BenchmarkRun> => {
    const res = await fetch(`${API_BASE}/benchmark/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, benchmarkId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to execute benchmark run');
    return json.run;
  },

  getBenchmarkRuns: async (projectId?: string): Promise<BenchmarkRun[]> => {
    const url = projectId ? `${API_BASE}/benchmark/runs?projectId=${projectId}` : `${API_BASE}/benchmark/runs`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch benchmark runs');
    return json.runs;
  },

  getBenchmarkRun: async (id: string): Promise<BenchmarkRun> => {
    const res = await fetch(`${API_BASE}/benchmark/runs/${id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch benchmark run details');
    return json.run;
  },

  getProviderComparisons: async (projectIds?: string[]): Promise<ProviderComparisonItem[]> => {
    const url = projectIds && projectIds.length > 0
      ? `${API_BASE}/benchmark/compare?projectIds=${projectIds.join(',')}`
      : `${API_BASE}/benchmark/compare`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch provider comparisons');
    return json.comparisons;
  },

  // --- Direct Provider & Generation APIs ---
  getProviders: async (): Promise<ProviderConnection[]> => {
    const res = await fetch(`${API_BASE}/benchmark/providers`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch providers');
    return json.providers;
  },

  getProvider: async (provider: string): Promise<ProviderConnection> => {
    const res = await fetch(`${API_BASE}/benchmark/providers/${provider}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch provider details');
    return json.provider;
  },

  getLovableAuthUrl: async (workspaceId?: string): Promise<{ authUrl: string; state: string }> => {
    const url = workspaceId
      ? `${API_BASE}/benchmark/providers/lovable/oauth/authorize?workspaceId=${encodeURIComponent(workspaceId)}`
      : `${API_BASE}/benchmark/providers/lovable/oauth/authorize`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to get authorization URL');
    return json;
  },

  connectProvider: async (provider: string, data: { apiKey?: string; accessToken?: string; workspaceId?: string; authCode?: string; state?: string }): Promise<ProviderConnection> => {
    const res = await fetch(`${API_BASE}/benchmark/providers/${provider}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to connect provider');
    return json.connection;
  },

  disconnectProvider: async (provider: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/benchmark/providers/${provider}/disconnect`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to disconnect provider');
  },

  getProviderWorkspaces: async (provider: string): Promise<Array<{ id: string; name: string }>> => {
    const res = await fetch(`${API_BASE}/benchmark/providers/${provider}/workspaces`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch workspaces');
    return json.workspaces;
  },

  previewGeneration: async (data: { provider?: BenchmarkOrigin; prompt: string; name?: string; category?: string }): Promise<{ inferredSpec: any }> => {
    const res = await fetch(`${API_BASE}/benchmark/generate/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to generate preview');
    return json;
  },

  startGeneration: async (data: {
    provider?: BenchmarkOrigin;
    name?: string;
    prompt: string;
    workspaceId?: string;
    benchmarkCategory?: string;
    creditWarningAccepted: boolean;
  }): Promise<GenerationJob> => {
    const res = await fetch(`${API_BASE}/benchmark/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to start generation job');
    return json.job;
  },

  getGenerationJob: async (jobId: string): Promise<GenerationJob> => {
    const res = await fetch(`${API_BASE}/benchmark/generate/${jobId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to get generation job status');
    return json.job;
  },

  getGenerationJobs: async (): Promise<GenerationJob[]> => {
    const res = await fetch(`${API_BASE}/benchmark/generate`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to get generation jobs');
    return json.jobs;
  },

  // ==========================================
  // Universal MCP Client & Registry APIs
  // ==========================================
  getMcpConnections: async (ownerId?: string): Promise<McpConnectionRecord[]> => {
    const url = ownerId ? `${API_BASE}/mcp/connections?ownerId=${encodeURIComponent(ownerId)}` : `${API_BASE}/mcp/connections`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch MCP connections');
    return json.connections;
  },

  getMcpConnection: async (id: string): Promise<McpConnectionRecord> => {
    const res = await fetch(`${API_BASE}/mcp/connections/${id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch MCP connection details');
    return json.connection;
  },

  discoverMcpServer: async (serverUrl: string, transport: McpTransport = 'streamable_http'): Promise<any> => {
    const res = await fetch(`${API_BASE}/mcp/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUrl, transport }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'MCP discovery failed');
    return json;
  },

  connectMcpServer: async (data: {
    displayName: string;
    preset?: string;
    transport?: McpTransport;
    serverUrl?: string;
    localCommand?: string;
    localArgs?: string[];
    localEnv?: Record<string, string>;
    localCwd?: string;
    authType?: McpAuthType;
    bearerToken?: string;
    apiKey?: string;
    headers?: Record<string, string>;
  }): Promise<McpConnectionRecord> => {
    const res = await fetch(`${API_BASE}/mcp/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to connect MCP server');
    return json.connection;
  },

  reconnectMcpConnection: async (id: string): Promise<McpConnectionRecord> => {
    const res = await fetch(`${API_BASE}/mcp/connections/${id}/reconnect`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to reconnect MCP server');
    return json.connection;
  },

  disconnectMcpConnection: async (id: string): Promise<McpConnectionRecord> => {
    const res = await fetch(`${API_BASE}/mcp/connections/${id}/disconnect`, {
      method: 'POST',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to disconnect MCP server');
    return json.connection;
  },

  deleteMcpConnection: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/mcp/connections/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to delete MCP connection');
  },

  callMcpTool: async (
    connectionId: string,
    toolName: string,
    args: Record<string, any> = {},
    approvalConfirmed = false
  ): Promise<any> => {
    const res = await fetch(`${API_BASE}/mcp/connections/${connectionId}/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName, arguments: args, approvalConfirmed }),
    });
    const json = await res.json();
    if (!res.ok) {
      if (json.requiresApproval) {
        return { requiresApproval: true, message: json.message };
      }
      throw new Error(json.error || 'Failed to invoke MCP tool');
    }
    return json.result;
  },

  getMcpOAuthAuthorizeUrl: async (options: {
    serverUrl?: string;
    displayName?: string;
    preset?: string;
    clientId?: string;
    clientSecret?: string;
  }): Promise<{ authUrl: string; state: string }> => {
    const params = new URLSearchParams();
    if (options.serverUrl) params.set('serverUrl', options.serverUrl);
    if (options.displayName) params.set('displayName', options.displayName);
    if (options.preset) params.set('preset', options.preset);
    if (options.clientId) params.set('clientId', options.clientId);
    if (options.clientSecret) params.set('clientSecret', options.clientSecret);

    const res = await fetch(`${API_BASE}/mcp/oauth/authorize?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to initialize OAuth flow');
    return json;
  },

  startMcpBenchmark: async (data: {
    connectionId: string;
    prompt: string;
    benchmarkCategory?: string;
  }): Promise<McpBenchmarkJob> => {
    const res = await fetch(`${API_BASE}/mcp/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to start MCP benchmark');
    return json.job;
  },

  getMcpBenchmarkJob: async (jobId: string): Promise<McpBenchmarkJob> => {
    const res = await fetch(`${API_BASE}/mcp/benchmark/${jobId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to get MCP benchmark job');
    return json.job;
  },
};

// ==========================================
// AI Coding Agent Benchmark Types for Frontend
// ==========================================

export type BenchmarkOrigin = 'lovable' | 'emergent' | 'bolt' | 'replit' | 'generic_github' | 'zip_upload' | 'agentlab_agent';

export interface ProjectAnalysis {
  framework: string;
  language: string;
  runtime: string;
  packageManager: string;
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
  source: 'github' | 'zip';
  origin: BenchmarkOrigin;
  repoUrl?: string;
  branch?: string;
  commitSha?: string;
  zipFileName?: string;
  benchmarkCategory?: string;
  analysis?: ProjectAnalysis;
  preparationStatus: 'not_prepared' | 'preparing' | 'ready' | 'needs_configuration' | 'failed';
  preparationLogs?: string;
  envVars?: Record<string, string>;
  missingRequirements?: string[];
  detectedServices?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkScenario {
  id: string;
  name: string;
  objective: string;
  category: 'functional' | 'build' | 'accessibility' | 'responsive' | 'security' | 'persistence';
  type: string;
  preconditions?: string;
  executionSteps: string[];
  expectedResult: string;
  testSpec?: any;
}

export interface BenchmarkDefinition {
  id: string;
  projectId: string;
  category: string;
  name: string;
  description: string;
  generatedBy: 'ai' | 'template';
  scoringWeights: {
    functional: number;
    buildReliability: number;
    accessibility: number;
    responsive: number;
    security: number;
  };
  scenarios: BenchmarkScenario[];
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkScenarioRun {
  scenarioId: string;
  name: string;
  category: 'functional' | 'build' | 'accessibility' | 'responsive' | 'security' | 'persistence';
  type: string;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  durationMs: number;
  expectedResult: string;
  actualResult: string;
  logs: string[];
  screenshots?: string[];
  traces?: any;
  errorMessage?: string;
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
  summary: {
    totalScenarios: number;
    passedScenarios: number;
    failedScenarios: number;
    skippedScenarios: number;
    errorScenarios: number;
    overallScore: number;
    categoryScores: {
      functional: { score: number; available: boolean; weight: number };
      buildReliability: { score: number; available: boolean; weight: number };
      accessibility: { score: number; available: boolean; weight: number };
      responsive: { score: number; available: boolean; weight: number };
      security: { score: number; available: boolean; weight: number };
    };
    failureCategories: string[];
    actionableDebuggingSuggestions: string[];
  };
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
  functionalPassRate: number;
  overallScore: number;
  accessibilityScore: number;
  responsiveScore: number;
  securityScore: number;
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

export interface McpDiscoveredTool {
  name: string;
  description: string;
  inputSchema?: any;
  creditCostNotice?: string;
}

export type ProviderConnectionStatus = 'disconnected' | 'connected' | 'error' | 'not_supported';

export interface ProviderConnection {
  id: string;
  provider: BenchmarkOrigin;
  name: string;
  status: ProviderConnectionStatus;
  authMethod: 'oauth' | 'api_key' | 'git_sync' | 'export_import';
  endpoint?: string;
  accountEmail?: string;
  workspaceName?: string;
  discoveredTools?: McpDiscoveredTool[];
  supportsDirectGeneration: boolean;
  supportsExport: boolean;
  syncStrategyNotes?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  lastError?: string;
  creditNotice?: string;
}

export type GenerationJobStatus =
  | 'pending'
  | 'prompt_approved'
  | 'submitting'
  | 'generating'
  | 'retrieving_code'
  | 'preparing_environment'
  | 'executing_benchmark'
  | 'completed'
  | 'failed';

export interface GenerationJob {
  id: string;
  provider: BenchmarkOrigin;
  projectName: string;
  userPrompt: string;
  benchmarkCategory?: string;
  creditWarningAccepted: boolean;
  status: GenerationJobStatus;
  providerProjectId?: string;
  providerProjectUrl?: string;
  createdProjectId?: string;
  benchmarkRunId?: string;
  failureReason?: string;
  failureType?: 'quota' | 'auth' | 'generation' | 'retrieval' | 'preparation' | 'testing' | 'other';
  logs: string[];
  createdAt: string;
  completedAt?: string;
}

// ==========================================
// Universal MCP Client & Benchmarking Types
// ==========================================

export type McpTransport = 'streamable_http' | 'sse' | 'stdio';

export type McpAuthType =
  | 'none'
  | 'bearer'
  | 'api_key'
  | 'oauth_dcr'
  | 'oauth_client_credentials';

export type McpConnectionStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

export type McpToolCategory =
  | 'project_creation'
  | 'code_generation'
  | 'code_retrieval'
  | 'execution'
  | 'utility';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  isReadOnly: boolean;
  requiresApproval: boolean;
  isBenchmarkCapable: boolean;
  category: McpToolCategory;
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpConnectionRecord {
  id: string;
  ownerId: string;
  displayName: string;
  preset?: 'lovable' | 'bolt' | 'replit' | 'emergent' | 'custom';
  serverUrl?: string;
  localCommand?: string;
  localArgs?: string[];
  localEnv?: Record<string, string>;
  localCwd?: string;
  transport: McpTransport;
  authType: McpAuthType;
  hasCredentials?: boolean;
  connectionStatus: McpConnectionStatus;
  protocolVersion?: string;
  serverCapabilities?: any;
  discoveredTools: McpToolDefinition[];
  discoveredResources: McpResourceDefinition[];
  lastConnectedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface McpBenchmarkJob {
  id: string;
  connectionId: string;
  ownerId: string;
  taskPrompt: string;
  benchmarkCategory: string;
  status:
    | 'pending'
    | 'analyzing_capabilities'
    | 'submitting_task'
    | 'monitoring_generation'
    | 'retrieving_code'
    | 'preparing_sandbox'
    | 'evaluating'
    | 'completed'
    | 'failed';
  mappedTools: {
    creationTool?: string;
    generationTool?: string;
    retrievalTool?: string;
  };
  supportedCapabilities: {
    canCreateProject: boolean;
    canGenerateCode: boolean;
    canRetrieveCode: boolean;
    canExecuteTests: boolean;
  };
  providerProjectId?: string;
  retrievedCodeDir?: string;
  benchmarkRunId?: string;
  overallScore?: number;
  failureReason?: string;
  failureType?: 'auth' | 'quota' | 'unsupported' | 'generation' | 'retrieval' | 'execution' | 'other';
  logs: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
