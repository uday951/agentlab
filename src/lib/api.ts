export interface Agent {
  id: string;
  name: string;
  description: string;
  connectionType: 'builtin' | 'api' | 'cli' | 'import';
  model: string;
  endpoint?: string;
  headers?: Record<string, string>;
  cliCommand?: string;
  capabilities: string[];
  tools: string[];
  timeoutMs: number;
  status: 'ready' | 'needs_configuration' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface World {
  id: string;
  name: string;
  industry: string;
  description: string;
  systemRules: string[];
  knowledgeDocuments: {
    id: string;
    title: string;
    category: string;
    content: string;
  }[];
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

const API_BASE = '/api';

export const api = {
  // Health
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Agents
  getAgents: async (): Promise<Agent[]> => {
    const res = await fetch(`${API_BASE}/agents`);
    const json = await res.json();
    return json.data || [];
  },

  createAgent: async (data: Partial<Agent>): Promise<Agent> => {
    const res = await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to create agent');
    return json.data;
  },

  testAgent: async (id: string) => {
    const res = await fetch(`${API_BASE}/agents/${id}/test`, { method: 'POST' });
    return res.json();
  },

  deleteAgent: async (id: string) => {
    const res = await fetch(`${API_BASE}/agents/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Worlds
  getWorlds: async (): Promise<World[]> => {
    const res = await fetch(`${API_BASE}/worlds`);
    const json = await res.json();
    return json.data || [];
  },

  getWorld: async (id: string): Promise<World> => {
    const res = await fetch(`${API_BASE}/worlds/${id}`);
    const json = await res.json();
    return json.data;
  },

  updateWorld: async (id: string, data: Partial<World>): Promise<World> => {
    const res = await fetch(`${API_BASE}/worlds/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.data;
  },

  getScenarios: async (worldId: string): Promise<Scenario[]> => {
    const res = await fetch(`${API_BASE}/worlds/${worldId}/scenarios`);
    const json = await res.json();
    return json.data || [];
  },

  // Experiments
  getExperiments: async (): Promise<Experiment[]> => {
    const res = await fetch(`${API_BASE}/experiments`);
    const json = await res.json();
    return json.data || [];
  },

  getExperiment: async (id: string): Promise<Experiment> => {
    const res = await fetch(`${API_BASE}/experiments/${id}`);
    const json = await res.json();
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
    if (!res.ok) throw new Error(json.error || 'Failed to create experiment');
    return json.data;
  },

  runExperiment: async (id: string) => {
    const res = await fetch(`${API_BASE}/experiments/${id}/run`, { method: 'POST' });
    return res.json();
  },

  cancelExperiment: async (id: string) => {
    const res = await fetch(`${API_BASE}/experiments/${id}/cancel`, { method: 'POST' });
    return res.json();
  },

  // 1-Click College Review Demo
  runQuickDemo: async (): Promise<{ success: boolean; experiment: Experiment }> => {
    const res = await fetch(`${API_BASE}/demo/run-quick`, { method: 'POST' });
    return res.json();
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
};
