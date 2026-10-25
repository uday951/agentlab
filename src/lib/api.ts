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
};
