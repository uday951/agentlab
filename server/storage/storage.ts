import type { Agent, World, Scenario, Experiment, KnowledgeDocument, ExecutionEvent } from '../types.ts';

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

  // Seed check
  seedDefaultDataIfNeeded(): Promise<void>;
}
