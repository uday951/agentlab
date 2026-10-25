import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IStorageStore } from './storage.ts';
import type { Agent, World, Scenario, Experiment } from '../types.ts';
import { SEED_AGENT, SEED_WORLD, SEED_SCENARIOS } from './seedData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

export class LocalFileStore implements IStorageStore {
  public mode: 'local_file' = 'local_file';

  private agentsFile = path.join(DATA_DIR, 'agents.json');
  private worldsFile = path.join(DATA_DIR, 'worlds.json');
  private scenariosFile = path.join(DATA_DIR, 'scenarios.json');
  private experimentsFile = path.join(DATA_DIR, 'experiments.json');

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private readJson<T>(filePath: string, fallback: T): T {
    try {
      if (!fs.existsSync(filePath)) return fallback;
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`Error reading ${filePath}, using fallback:`, err);
      return fallback;
    }
  }

  private writeJson<T>(filePath: string, data: T): void {
    try {
      const tempPath = `${filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      console.error(`Error writing ${filePath}:`, err);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
  }

  public async seedDefaultDataIfNeeded(): Promise<void> {
    const agents = this.readJson<Agent[]>(this.agentsFile, []);
    if (agents.length === 0) {
      this.writeJson(this.agentsFile, [SEED_AGENT]);
      console.log('📦 [LocalStore] Seeded default SampleSupportAgent');
    }

    const worlds = this.readJson<World[]>(this.worldsFile, []);
    if (worlds.length === 0) {
      this.writeJson(this.worldsFile, [SEED_WORLD]);
      console.log('📦 [LocalStore] Seeded default ShopSphere E-commerce World');
    }

    const scenarios = this.readJson<Scenario[]>(this.scenariosFile, []);
    if (scenarios.length === 0) {
      this.writeJson(this.scenariosFile, SEED_SCENARIOS);
      console.log(`📦 [LocalStore] Seeded ${SEED_SCENARIOS.length} test scenarios`);
    }

    if (!fs.existsSync(this.experimentsFile)) {
      this.writeJson(this.experimentsFile, []);
    }
  }

  // Agents
  public async getAgents(): Promise<Agent[]> {
    return this.readJson<Agent[]>(this.agentsFile, []);
  }

  public async getAgent(id: string): Promise<Agent | null> {
    const list = await this.getAgents();
    return list.find(a => a.id === id) || null;
  }

  public async saveAgent(agent: Agent): Promise<Agent> {
    const list = await this.getAgents();
    const idx = list.findIndex(a => a.id === agent.id);
    if (idx >= 0) {
      list[idx] = { ...agent, updatedAt: new Date().toISOString() };
    } else {
      list.push(agent);
    }
    this.writeJson(this.agentsFile, list);
    return agent;
  }

  public async deleteAgent(id: string): Promise<boolean> {
    const list = await this.getAgents();
    const filtered = list.filter(a => a.id !== id);
    this.writeJson(this.agentsFile, filtered);
    return filtered.length < list.length;
  }

  // Worlds
  public async getWorlds(): Promise<World[]> {
    return this.readJson<World[]>(this.worldsFile, []);
  }

  public async getWorld(id: string): Promise<World | null> {
    const list = await this.getWorlds();
    return list.find(w => w.id === id) || null;
  }

  public async saveWorld(world: World): Promise<World> {
    const list = await this.getWorlds();
    const idx = list.findIndex(w => w.id === world.id);
    if (idx >= 0) {
      list[idx] = { ...world, updatedAt: new Date().toISOString() };
    } else {
      list.push(world);
    }
    this.writeJson(this.worldsFile, list);
    return world;
  }

  // Scenarios
  public async getScenariosForWorld(worldId: string): Promise<Scenario[]> {
    const list = this.readJson<Scenario[]>(this.scenariosFile, []);
    return list.filter(s => s.worldId === worldId);
  }

  public async getScenario(id: string): Promise<Scenario | null> {
    const list = this.readJson<Scenario[]>(this.scenariosFile, []);
    return list.find(s => s.id === id) || null;
  }

  public async saveScenario(scenario: Scenario): Promise<Scenario> {
    const list = this.readJson<Scenario[]>(this.scenariosFile, []);
    const idx = list.findIndex(s => s.id === scenario.id);
    if (idx >= 0) {
      list[idx] = scenario;
    } else {
      list.push(scenario);
    }
    this.writeJson(this.scenariosFile, list);
    return scenario;
  }

  // Experiments
  public async getExperiments(): Promise<Experiment[]> {
    return this.readJson<Experiment[]>(this.experimentsFile, []);
  }

  public async getExperiment(id: string): Promise<Experiment | null> {
    const list = await this.getExperiments();
    return list.find(e => e.id === id) || null;
  }

  public async saveExperiment(experiment: Experiment): Promise<Experiment> {
    const list = await this.getExperiments();
    const idx = list.findIndex(e => e.id === experiment.id);
    if (idx >= 0) {
      list[idx] = experiment;
    } else {
      list.unshift(experiment); // Keep newest at top
    }
    this.writeJson(this.experimentsFile, list);
    return experiment;
  }

  public async deleteExperiment(id: string): Promise<boolean> {
    const list = await this.getExperiments();
    const filtered = list.filter(e => e.id !== id);
    this.writeJson(this.experimentsFile, filtered);
    return filtered.length < list.length;
  }
}
