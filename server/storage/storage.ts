import type {
  Agent,
  World,
  Scenario,
  Experiment,
  KnowledgeDocument,
  ExecutionEvent,
  PlatformConfig,
  BenchmarkProject,
  BenchmarkDefinition,
  BenchmarkRun,
  BenchmarkDashboardStats,
  ProviderComparisonItem,
  ProviderConnection,
  GenerationJob,
} from '../types.ts';
import type { McpConnectionRecord, McpBenchmarkJob } from '../mcp/types.ts';

export class DatabaseNotConfiguredError extends Error {
  constructor(message = 'MongoDB is not configured or reachable. Please set MONGODB_URI in your environment.') {
    super(message);
    this.name = 'DatabaseNotConfiguredError';
  }
}

export interface IStorageStore {
  mode: 'mongodb';
  isConnected(): boolean;
  getConnectionError(): string | null;

  // Agents
  getAgents(): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | null>;
  saveAgent(agent: Agent): Promise<Agent>;
  deleteAgent(id: string): Promise<boolean>;

  // Worlds
  getWorlds(): Promise<World[]>;
  getWorld(id: string): Promise<World | null>;
  saveWorld(world: World): Promise<World>;

  // Knowledge Documents
  getKnowledgeDocuments(worldId: string): Promise<KnowledgeDocument[]>;
  getKnowledgeDocument(id: string): Promise<KnowledgeDocument | null>;
  saveKnowledgeDocument(doc: KnowledgeDocument): Promise<KnowledgeDocument>;
  deleteKnowledgeDocument(id: string): Promise<boolean>;

  // Scenarios
  getScenariosForWorld(worldId: string): Promise<Scenario[]>;
  getScenario(id: string): Promise<Scenario | null>;
  saveScenario(scenario: Scenario): Promise<Scenario>;

  // Experiments
  getExperiments(): Promise<Experiment[]>;
  getExperiment(id: string): Promise<Experiment | null>;
  saveExperiment(experiment: Experiment): Promise<Experiment>;
  deleteExperiment(id: string): Promise<boolean>;

  // Events
  saveEvents(events: ExecutionEvent[]): Promise<void>;
  getEventsForExperiment(experimentId: string): Promise<ExecutionEvent[]>;

  // Platform Config
  getPlatformConfig(): Promise<PlatformConfig>;
  savePlatformConfig(config: Partial<PlatformConfig>): Promise<PlatformConfig>;

  // Benchmark Projects
  getBenchmarkProjects(): Promise<BenchmarkProject[]>;
  getBenchmarkProject(id: string): Promise<BenchmarkProject | null>;
  saveBenchmarkProject(project: BenchmarkProject): Promise<BenchmarkProject>;
  deleteBenchmarkProject(id: string): Promise<boolean>;

  // Benchmark Definitions
  getBenchmarkDefinitions(projectId?: string): Promise<BenchmarkDefinition[]>;
  getBenchmarkDefinition(id: string): Promise<BenchmarkDefinition | null>;
  saveBenchmarkDefinition(def: BenchmarkDefinition): Promise<BenchmarkDefinition>;
  deleteBenchmarkDefinition(id: string): Promise<boolean>;

  // Benchmark Runs
  getBenchmarkRuns(projectId?: string): Promise<BenchmarkRun[]>;
  getBenchmarkRun(id: string): Promise<BenchmarkRun | null>;
  saveBenchmarkRun(run: BenchmarkRun): Promise<BenchmarkRun>;
  deleteBenchmarkRun(id: string): Promise<boolean>;

  // Benchmark Dashboard Stats & Comparisons
  getBenchmarkStats(): Promise<BenchmarkDashboardStats>;
  getProviderComparisons(projectIds?: string[]): Promise<ProviderComparisonItem[]>;

  // AI Platform Provider Connections (Lovable, Bolt, Replit, Emergent)
  getProviderConnections(): Promise<ProviderConnection[]>;
  getProviderConnection(provider: string): Promise<ProviderConnection | null>;
  saveProviderConnection(connection: ProviderConnection): Promise<ProviderConnection>;
  deleteProviderConnection(provider: string): Promise<boolean>;

  // Generation Jobs (Direct Prompt-to-Benchmark)
  getGenerationJobs(): Promise<GenerationJob[]>;
  getGenerationJob(id: string): Promise<GenerationJob | null>;
  saveGenerationJob(job: GenerationJob): Promise<GenerationJob>;

  // Universal MCP Registry & Connections
  getMcpConnections(ownerId?: string): Promise<McpConnectionRecord[]>;
  getMcpConnection(id: string, ownerId?: string): Promise<McpConnectionRecord | null>;
  saveMcpConnection(conn: McpConnectionRecord): Promise<McpConnectionRecord>;
  deleteMcpConnection(id: string, ownerId?: string): Promise<boolean>;

  // MCP Benchmarking Jobs
  getMcpBenchmarkJob(id: string, ownerId?: string): Promise<McpBenchmarkJob | null>;
  saveMcpBenchmarkJob(job: McpBenchmarkJob): Promise<McpBenchmarkJob>;
  getMcpBenchmarkJobs(ownerId?: string): Promise<McpBenchmarkJob[]>;

  // Seed check
  seedDefaultDataIfNeeded(): Promise<void>;
}
