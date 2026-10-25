import type { Agent, World, Scenario, Experiment } from '../types.ts';

export interface IStorageStore {
  mode: 'local_file' | 'mongodb';

  // Agents
  getAgents(): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | null>;
  saveAgent(agent: Agent): Promise<Agent>;
  deleteAgent(id: string): Promise<boolean>;

  // Worlds
  getWorlds(): Promise<World[]>;
  getWorld(id: string): Promise<World | null>;
  saveWorld(world: World): Promise<World>;

  // Scenarios
  getScenariosForWorld(worldId: string): Promise<Scenario[]>;
  getScenario(id: string): Promise<Scenario | null>;
  saveScenario(scenario: Scenario): Promise<Scenario>;

  // Experiments
  getExperiments(): Promise<Experiment[]>;
  getExperiment(id: string): Promise<Experiment | null>;
  saveExperiment(experiment: Experiment): Promise<Experiment>;
  deleteExperiment(id: string): Promise<boolean>;

  // Seed check
  seedDefaultDataIfNeeded(): Promise<void>;
}
