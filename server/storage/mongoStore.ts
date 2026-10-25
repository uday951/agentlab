import type { IStorageStore } from './storage.ts';
import { DatabaseNotConfiguredError } from './storage.ts';
import type { Agent, World, Scenario, Experiment, KnowledgeDocument, ExecutionEvent } from '../types.ts';
import {
  AgentModel,
  WorldModel,
  KnowledgeDocumentModel,
  ScenarioModel,
  ExperimentModel,
  ExecutionEventModel,
  EvaluationResultModel,
} from '../models/index.ts';
import { defaultShopSphereWorld, defaultScenarios, defaultSampleAgent, defaultDeepSeekAgent } from './seedData.ts';

export class MongoStore implements IStorageStore {
  public readonly mode = 'mongodb' as const;
  private connected: boolean;
  private connectionError: string | null;

  constructor(connected: boolean, connectionError: string | null = null) {
    this.connected = connected;
    this.connectionError = connectionError;
  }

  public setConnectionState(connected: boolean, error: string | null = null) {
    this.connected = connected;
    this.connectionError = error;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getConnectionError(): string | null {
    return this.connectionError;
  }

  private assertConnected() {
    if (!this.connected) {
      throw new DatabaseNotConfiguredError(
        this.connectionError ||
          'MongoDB is not configured or connection failed. Configure MONGODB_URI in your server environment.'
      );
    }
  }

  // --- Agents ---
  public async getAgents(): Promise<Agent[]> {
    this.assertConnected();
    const docs = await AgentModel.find({}).sort({ createdAt: -1 }).lean();
    return docs.map(this.mapAgent);
  }

  public async getAgent(id: string): Promise<Agent | null> {
    this.assertConnected();
    const doc = await AgentModel.findOne({ id }).lean();
    return doc ? this.mapAgent(doc) : null;
  }

  public async saveAgent(agent: Agent): Promise<Agent> {
    this.assertConnected();
    const updated = await AgentModel.findOneAndUpdate(
      { id: agent.id },
      { $set: agent },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return this.mapAgent(updated);
  }

  public async deleteAgent(id: string): Promise<boolean> {
    this.assertConnected();
    const res = await AgentModel.deleteOne({ id });
    return (res.deletedCount || 0) > 0;
  }

  // --- Worlds ---
  public async getWorlds(): Promise<World[]> {
    this.assertConnected();
    const docs = await WorldModel.find({}).sort({ createdAt: -1 }).lean();
    const worlds: World[] = [];
    for (const doc of docs) {
      const w = this.mapWorld(doc);
      // Populate knowledge documents
      const docsForWorld = await this.getKnowledgeDocuments(w.id);
      w.knowledgeDocuments = docsForWorld;
      worlds.push(w);
    }
    return worlds;
  }

  public async getWorld(id: string): Promise<World | null> {
    this.assertConnected();
    const doc = await WorldModel.findOne({ id }).lean();
    if (!doc) return null;
    const w = this.mapWorld(doc);
    w.knowledgeDocuments = await this.getKnowledgeDocuments(w.id);
    return w;
  }

  public async saveWorld(world: World): Promise<World> {
    this.assertConnected();
    const { knowledgeDocuments, ...worldData } = world;
    const updated = await WorldModel.findOneAndUpdate(
      { id: world.id },
      { $set: worldData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    // Persist knowledge documents if provided
    if (knowledgeDocuments && knowledgeDocuments.length > 0) {
      for (const kd of knowledgeDocuments) {
        await this.saveKnowledgeDocument({ ...kd, worldId: world.id });
      }
    }

    const saved = this.mapWorld(updated);
    saved.knowledgeDocuments = await this.getKnowledgeDocuments(saved.id);
    return saved;
  }

  // --- Knowledge Documents ---
  public async getKnowledgeDocuments(worldId: string): Promise<KnowledgeDocument[]> {
    this.assertConnected();
    const docs = await KnowledgeDocumentModel.find({ worldId }).sort({ createdAt: 1 }).lean();
    return docs.map(this.mapKnowledgeDoc);
  }

  public async getKnowledgeDocument(id: string): Promise<KnowledgeDocument | null> {
    this.assertConnected();
    const doc = await KnowledgeDocumentModel.findOne({ id }).lean();
    return doc ? this.mapKnowledgeDoc(doc) : null;
  }

  public async saveKnowledgeDocument(doc: KnowledgeDocument): Promise<KnowledgeDocument> {
    this.assertConnected();
    const updated = await KnowledgeDocumentModel.findOneAndUpdate(
      { id: doc.id },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return this.mapKnowledgeDoc(updated);
  }

  public async deleteKnowledgeDocument(id: string): Promise<boolean> {
    this.assertConnected();
    const res = await KnowledgeDocumentModel.deleteOne({ id });
    return (res.deletedCount || 0) > 0;
  }

  // --- Scenarios ---
  public async getScenariosForWorld(worldId: string): Promise<Scenario[]> {
    this.assertConnected();
    const docs = await ScenarioModel.find({ worldId }).sort({ id: 1 }).lean();
    return docs.map(this.mapScenario);
  }

  public async getScenario(id: string): Promise<Scenario | null> {
    this.assertConnected();
    const doc = await ScenarioModel.findOne({ id }).lean();
    return doc ? this.mapScenario(doc) : null;
  }

  public async saveScenario(scenario: Scenario): Promise<Scenario> {
    this.assertConnected();
    const updated = await ScenarioModel.findOneAndUpdate(
      { id: scenario.id },
      { $set: scenario },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return this.mapScenario(updated);
  }

  // --- Experiments ---
  public async getExperiments(): Promise<Experiment[]> {
    this.assertConnected();
    const docs = await ExperimentModel.find({}).sort({ createdAt: -1 }).lean();
    return docs.map(this.mapExperiment);
  }

  public async getExperiment(id: string): Promise<Experiment | null> {
    this.assertConnected();
    const doc = await ExperimentModel.findOne({ id }).lean();
    if (!doc) return null;
    return this.mapExperiment(doc);
  }

  public async saveExperiment(experiment: Experiment): Promise<Experiment> {
    this.assertConnected();
    const updated = await ExperimentModel.findOneAndUpdate(
      { id: experiment.id },
      { $set: experiment },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    // Persist evaluation result to dedicated collection if present
    if (experiment.results) {
      await EvaluationResultModel.findOneAndUpdate(
        { experimentId: experiment.id },
        { $set: experiment.results },
        { upsert: true }
      );
    }

    // Persist any un-saved execution events to the event collection
    if (experiment.events && experiment.events.length > 0) {
      await this.saveEvents(experiment.events);
    }

    return this.mapExperiment(updated);
  }

  public async deleteExperiment(id: string): Promise<boolean> {
    this.assertConnected();
    const res = await ExperimentModel.deleteOne({ id });
    await ExecutionEventModel.deleteMany({ experimentId: id });
    await EvaluationResultModel.deleteOne({ experimentId: id });
    return (res.deletedCount || 0) > 0;
  }

  // --- Events ---
  public async saveEvents(events: ExecutionEvent[]): Promise<void> {
    if (!this.connected || events.length === 0) return;
    try {
      const ops = events.map(evt => ({
        updateOne: {
          filter: { id: evt.id },
          update: { $set: evt },
          upsert: true,
        },
      }));
      await ExecutionEventModel.bulkWrite(ops);
    } catch (e) {
      console.error('Error saving execution events to MongoDB:', e);
    }
  }

  public async getEventsForExperiment(experimentId: string): Promise<ExecutionEvent[]> {
    this.assertConnected();
    const docs = await ExecutionEventModel.find({ experimentId }).sort({ step: 1 }).lean();
    return docs.map(this.mapEvent);
  }

  // --- Seed Data Check ---
  public async seedDefaultDataIfNeeded(): Promise<void> {
    if (!this.connected) return;

    try {
      // 1. Check & Seed Default World
      const existingWorlds = await WorldModel.countDocuments();
      if (existingWorlds === 0) {
        console.log('🌱 [MongoDB Seed] Seeding ShopSphere e-commerce world into MongoDB...');
        const { knowledgeDocuments, ...wData } = defaultShopSphereWorld;
        await WorldModel.create(wData);

        // Seed knowledge documents
        for (const kd of defaultShopSphereWorld.knowledgeDocuments) {
          await KnowledgeDocumentModel.create({
            id: kd.id,
            worldId: defaultShopSphereWorld.id,
            title: kd.title,
            category: kd.category,
            content: kd.content,
            chunks: kd.chunks || [],
          });
        }
      }

      // 2. Check & Seed Default Scenarios
      const existingScenarios = await ScenarioModel.countDocuments();
      if (existingScenarios === 0) {
        console.log(`🌱 [MongoDB Seed] Seeding ${defaultScenarios.length} benchmark scenarios into MongoDB...`);
        for (const sc of defaultScenarios) {
          await ScenarioModel.create(sc);
        }
      }

      // 3. Check & Seed Default Agents (Deterministic & DeepSeek)
      const existingAgents = await AgentModel.countDocuments();
      if (existingAgents === 0) {
        console.log('🌱 [MongoDB Seed] Seeding default agents into MongoDB...');
        await AgentModel.create(defaultSampleAgent);
        await AgentModel.create(defaultDeepSeekAgent);
      } else {
        // Ensure DeepSeek agent exists
        const deepSeekExists = await AgentModel.findOne({ id: defaultDeepSeekAgent.id });
        if (!deepSeekExists) {
          console.log('🌱 [MongoDB Seed] Seeding DeepSeek live agent into MongoDB...');
          await AgentModel.create(defaultDeepSeekAgent);
        }
      }
    } catch (seedErr: any) {
      console.error('⚠️ [MongoDB Seed] Error checking/seeding default records:', seedErr.message);
    }
  }

  // --- Mapping Helpers ---
  private mapAgent(raw: any): Agent {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description || '',
      connectionType: raw.connectionType,
      model: raw.model || 'Custom Model',
      endpoint: raw.endpoint,
      authType: raw.authType,
      authHeader: raw.authHeader,
      requestMapping: raw.requestMapping,
      responseMapping: raw.responseMapping,
      cliCommand: raw.cliCommand,
      workingDir: raw.workingDir,
      repoUrl: raw.repoUrl,
      entrypoint: raw.entrypoint,
      projectConfig: raw.projectConfig,
      headers: raw.headers instanceof Map ? Object.fromEntries(raw.headers) : raw.headers,
      capabilities: raw.capabilities || [],
      tools: raw.tools || [],
      timeoutMs: raw.timeoutMs || 5000,
      status: raw.status || 'ready',
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  private mapWorld(raw: any): World {
    return {
      id: raw.id,
      name: raw.name,
      industry: raw.industry,
      description: raw.description || '',
      systemRules: raw.systemRules || [],
      knowledgeDocuments: [],
      simulatedTools: raw.simulatedTools || [],
      customerProfiles: raw.customerProfiles || [],
      eventConditions: raw.eventConditions || [],
      successCriteria: raw.successCriteria || [],
      initialData: raw.initialData || {},
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  private mapKnowledgeDoc(raw: any): KnowledgeDocument {
    return {
      id: raw.id,
      worldId: raw.worldId,
      title: raw.title,
      category: raw.category,
      content: raw.content,
      chunks: raw.chunks || [],
    };
  }

  private mapScenario(raw: any): Scenario {
    return {
      id: raw.id,
      worldId: raw.worldId,
      title: raw.title,
      description: raw.description || '',
      category: raw.category,
      customerProfile: raw.customerProfile,
      inputTask: raw.inputTask,
      orderContext: raw.orderContext,
      injectedFailures: raw.injectedFailures,
      expectedOutcome: raw.expectedOutcome,
      evaluationRules: raw.evaluationRules,
    };
  }

  private mapExperiment(raw: any): Experiment {
    return {
      id: raw.id,
      name: raw.name,
      agentId: raw.agentId,
      agentName: raw.agentName,
      worldId: raw.worldId,
      worldName: raw.worldName,
      scenarioIds: raw.scenarioIds || [],
      status: raw.status,
      scenarioCount: raw.scenarioCount || 0,
      progress: raw.progress || 0,
      runs: raw.runs || [],
      events: raw.events || [],
      results: raw.results,
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
      startedAt: raw.startedAt ? new Date(raw.startedAt).toISOString() : undefined,
      completedAt: raw.completedAt ? new Date(raw.completedAt).toISOString() : undefined,
    };
  }

  private mapEvent(raw: any): ExecutionEvent {
    return {
      id: raw.id,
      experimentId: raw.experimentId,
      scenarioId: raw.scenarioId,
      step: raw.step,
      timestamp: raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString(),
      actionType: raw.actionType,
      inputSummary: raw.inputSummary,
      outputSummary: raw.outputSummary,
      status: raw.status,
      metadata: raw.metadata,
    };
  }
}
