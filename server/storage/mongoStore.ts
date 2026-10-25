import type { IStorageStore } from './storage.ts';
import { DatabaseNotConfiguredError } from './storage.ts';
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
  BenchmarkOrigin,
  ProviderConnection,
  GenerationJob,
} from '../types.ts';
import type { McpConnectionRecord, McpBenchmarkJob } from '../mcp/types.ts';
import {
  AgentModel,
  WorldModel,
  KnowledgeDocumentModel,
  ScenarioModel,
  ExperimentModel,
  ExecutionEventModel,
  EvaluationResultModel,
  PlatformConfigModel,
  BenchmarkProjectModel,
  BenchmarkDefinitionModel,
  BenchmarkRunModel,
  ProviderConnectionModel,
  GenerationJobModel,
  McpConnectionModel,
  McpBenchmarkJobModel,
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

  // --- Platform Configuration ---
  public async getPlatformConfig(): Promise<PlatformConfig> {
    this.assertConnected();
    let config = await PlatformConfigModel.findOne({ id: 'default' }).lean();
    if (!config) {
      const created = await PlatformConfigModel.create({
        id: 'default',
        llmProvider: process.env.LLM_PROVIDER || 'deepseek',
        llmApiKey: process.env.LLM_API_KEY || '',
        llmModel: process.env.LLM_MODEL || 'deepseek-chat',
        githubToken: process.env.GITHUB_TOKEN || '',
        enableCliRunner: process.env.ENABLE_CLI_RUNNER === 'true',
        agentRunnerMode: (process.env.AGENT_RUNNER_URL ? 'external-docker' : 'builtin-sandbox') as any,
        agentRunnerUrl: process.env.AGENT_RUNNER_URL || '',
        agentRunnerToken: process.env.AGENT_RUNNER_TOKEN || '',
        maxExecutionTimeoutMs: 15000,
        maxOutputSizeBytes: 65536,
      });
      config = created.toObject();
    }
    return {
      id: config.id,
      llmProvider: config.llmProvider || 'deepseek',
      llmApiKey: config.llmApiKey || '',
      llmModel: config.llmModel || 'deepseek-chat',
      githubToken: config.githubToken || '',
      enableCliRunner: !!config.enableCliRunner,
      agentRunnerMode: config.agentRunnerMode || 'builtin-sandbox',
      agentRunnerUrl: config.agentRunnerUrl || '',
      agentRunnerToken: config.agentRunnerToken || '',
      maxExecutionTimeoutMs: config.maxExecutionTimeoutMs || 15000,
      maxOutputSizeBytes: config.maxOutputSizeBytes || 65536,
      updatedAt: config.updatedAt ? new Date(config.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  public async savePlatformConfig(updates: Partial<PlatformConfig>): Promise<PlatformConfig> {
    this.assertConnected();
    const doc = await PlatformConfigModel.findOneAndUpdate(
      { id: 'default' },
      { $set: updates },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();

    return {
      id: doc.id,
      llmProvider: doc.llmProvider || 'deepseek',
      llmApiKey: doc.llmApiKey || '',
      llmModel: doc.llmModel || 'deepseek-chat',
      githubToken: doc.githubToken || '',
      enableCliRunner: !!doc.enableCliRunner,
      agentRunnerMode: doc.agentRunnerMode || 'builtin-sandbox',
      agentRunnerUrl: doc.agentRunnerUrl || '',
      agentRunnerToken: doc.agentRunnerToken || '',
      maxExecutionTimeoutMs: doc.maxExecutionTimeoutMs || 15000,
      maxOutputSizeBytes: doc.maxOutputSizeBytes || 65536,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    };
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

  // --- Benchmark Projects ---
  public async getBenchmarkProjects(): Promise<BenchmarkProject[]> {
    this.assertConnected();
    const docs = await BenchmarkProjectModel.find({}).sort({ createdAt: -1 }).lean();
    return docs.map(this.mapBenchmarkProject);
  }

  public async getBenchmarkProject(id: string): Promise<BenchmarkProject | null> {
    this.assertConnected();
    const doc = await BenchmarkProjectModel.findOne({ id }).lean();
    return doc ? this.mapBenchmarkProject(doc) : null;
  }

  public async saveBenchmarkProject(project: BenchmarkProject): Promise<BenchmarkProject> {
    this.assertConnected();
    const updated = await BenchmarkProjectModel.findOneAndUpdate(
      { id: project.id },
      { $set: project },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    return this.mapBenchmarkProject(updated);
  }

  public async deleteBenchmarkProject(id: string): Promise<boolean> {
    this.assertConnected();
    const res = await BenchmarkProjectModel.deleteOne({ id });
    await BenchmarkDefinitionModel.deleteMany({ projectId: id });
    await BenchmarkRunModel.deleteMany({ projectId: id });
    return (res.deletedCount || 0) > 0;
  }

  // --- Benchmark Definitions ---
  public async getBenchmarkDefinitions(projectId?: string): Promise<BenchmarkDefinition[]> {
    this.assertConnected();
    const query = projectId ? { projectId } : {};
    const docs = await BenchmarkDefinitionModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map(this.mapBenchmarkDefinition);
  }

  public async getBenchmarkDefinition(id: string): Promise<BenchmarkDefinition | null> {
    this.assertConnected();
    const doc = await BenchmarkDefinitionModel.findOne({ id }).lean();
    return doc ? this.mapBenchmarkDefinition(doc) : null;
  }

  public async saveBenchmarkDefinition(def: BenchmarkDefinition): Promise<BenchmarkDefinition> {
    this.assertConnected();
    const updated = await BenchmarkDefinitionModel.findOneAndUpdate(
      { id: def.id },
      { $set: def },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    return this.mapBenchmarkDefinition(updated);
  }

  public async deleteBenchmarkDefinition(id: string): Promise<boolean> {
    this.assertConnected();
    const res = await BenchmarkDefinitionModel.deleteOne({ id });
    return (res.deletedCount || 0) > 0;
  }

  // --- Benchmark Runs ---
  public async getBenchmarkRuns(projectId?: string): Promise<BenchmarkRun[]> {
    this.assertConnected();
    const query = projectId ? { projectId } : {};
    const docs = await BenchmarkRunModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map(this.mapBenchmarkRun);
  }

  public async getBenchmarkRun(id: string): Promise<BenchmarkRun | null> {
    this.assertConnected();
    const doc = await BenchmarkRunModel.findOne({ id }).lean();
    return doc ? this.mapBenchmarkRun(doc) : null;
  }

  public async saveBenchmarkRun(run: BenchmarkRun): Promise<BenchmarkRun> {
    this.assertConnected();
    const updated = await BenchmarkRunModel.findOneAndUpdate(
      { id: run.id },
      { $set: run },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    return this.mapBenchmarkRun(updated);
  }

  public async deleteBenchmarkRun(id: string): Promise<boolean> {
    this.assertConnected();
    const res = await BenchmarkRunModel.deleteOne({ id });
    return (res.deletedCount || 0) > 0;
  }

  // --- Benchmark Dashboard Stats ---
  public async getBenchmarkStats(): Promise<BenchmarkDashboardStats> {
    this.assertConnected();
    const totalProjects = await BenchmarkProjectModel.countDocuments();
    const allRuns = await BenchmarkRunModel.find({}).lean();

    const completedRuns = allRuns.filter((r: any) => r.status === 'completed');
    const failedRuns = allRuns.filter((r: any) => r.status === 'failed' || r.status === 'cancelled');

    let totalPassRateSum = 0;
    let buildPassedCount = 0;
    let buildEvaluatedCount = 0;
    let durationSum = 0;
    const failureCategoryMap: Record<string, number> = {};

    for (const run of completedRuns) {
      const summary = run.summary;
      if (summary) {
        if (summary.totalScenarios > 0) {
          totalPassRateSum += (summary.passedScenarios / summary.totalScenarios) * 100;
        }
        if (summary.failureCategories && Array.isArray(summary.failureCategories)) {
          for (const cat of summary.failureCategories) {
            failureCategoryMap[cat] = (failureCategoryMap[cat] || 0) + 1;
          }
        }
      }
      if (run.buildStatus === 'passed') buildPassedCount++;
      if (run.buildStatus === 'passed' || run.buildStatus === 'failed') buildEvaluatedCount++;
      durationSum += run.executionDurationMs || 0;
    }

    const averageTestPassRate = completedRuns.length > 0
      ? Math.round((totalPassRateSum / completedRuns.length) * 10) / 10
      : 0;

    const buildSuccessRate = buildEvaluatedCount > 0
      ? Math.round((buildPassedCount / buildEvaluatedCount) * 1000) / 10
      : 0;

    const averageExecutionDurationMs = completedRuns.length > 0
      ? Math.round(durationSum / completedRuns.length)
      : 0;

    const mostCommonFailureCategories = Object.entries(failureCategoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Group by provider origin
    const providerMap: Record<BenchmarkOrigin, {
      projectCount: number;
      runsCount: number;
      scoreSum: number;
      buildPassed: number;
      buildTotal: number;
      passRateSum: number;
    }> = {
      lovable: { projectCount: 0, runsCount: 0, scoreSum: 0, buildPassed: 0, buildTotal: 0, passRateSum: 0 },
      emergent: { projectCount: 0, runsCount: 0, scoreSum: 0, buildPassed: 0, buildTotal: 0, passRateSum: 0 },
      bolt: { projectCount: 0, runsCount: 0, scoreSum: 0, buildPassed: 0, buildTotal: 0, passRateSum: 0 },
      replit: { projectCount: 0, runsCount: 0, scoreSum: 0, buildPassed: 0, buildTotal: 0, passRateSum: 0 },
      generic_github: { projectCount: 0, runsCount: 0, scoreSum: 0, buildPassed: 0, buildTotal: 0, passRateSum: 0 },
      zip_upload: { projectCount: 0, runsCount: 0, scoreSum: 0, buildPassed: 0, buildTotal: 0, passRateSum: 0 },
      agentlab_agent: { projectCount: 0, runsCount: 0, scoreSum: 0, buildPassed: 0, buildTotal: 0, passRateSum: 0 },
    };

    const projects = await BenchmarkProjectModel.find({}).lean();
    for (const p of projects) {
      const orig = p.origin as BenchmarkOrigin;
      if (providerMap[orig]) {
        providerMap[orig].projectCount++;
      }
    }

    for (const r of completedRuns) {
      const orig = r.projectOrigin as BenchmarkOrigin;
      if (providerMap[orig]) {
        providerMap[orig].runsCount++;
        providerMap[orig].scoreSum += r.summary?.overallScore || 0;
        if (r.buildStatus === 'passed') providerMap[orig].buildPassed++;
        if (r.buildStatus === 'passed' || r.buildStatus === 'failed') providerMap[orig].buildTotal++;
        if (r.summary && r.summary.totalScenarios > 0) {
          providerMap[orig].passRateSum += (r.summary.passedScenarios / r.summary.totalScenarios) * 100;
        }
      }
    }

    const providerComparisons = Object.entries(providerMap).map(([origin, data]) => ({
      origin: origin as BenchmarkOrigin,
      projectCount: data.projectCount,
      runsCount: data.runsCount,
      averageScore: data.runsCount > 0 ? Math.round((data.scoreSum / data.runsCount) * 10) / 10 : 0,
      buildSuccessRate: data.buildTotal > 0 ? Math.round((data.buildPassed / data.buildTotal) * 1000) / 10 : 0,
      passRate: data.runsCount > 0 ? Math.round((data.passRateSum / data.runsCount) * 10) / 10 : 0,
    })).filter(p => p.projectCount > 0 || p.runsCount > 0);

    return {
      totalProjects,
      completedRuns: completedRuns.length,
      failedRuns: failedRuns.length,
      averageTestPassRate,
      buildSuccessRate,
      averageExecutionDurationMs,
      mostCommonFailureCategories,
      providerComparisons,
    };
  }

  // --- Provider Comparisons ---
  public async getProviderComparisons(projectIds?: string[]): Promise<ProviderComparisonItem[]> {
    this.assertConnected();
    const query = projectIds && projectIds.length > 0 ? { projectId: { $in: projectIds } } : {};
    const runs = await BenchmarkRunModel.find(query).sort({ createdAt: -1 }).lean();

    const items: ProviderComparisonItem[] = [];

    for (const raw of runs) {
      const summary = raw.summary || {
        totalScenarios: 0,
        passedScenarios: 0,
        failedScenarios: 0,
        overallScore: 0,
        categoryScores: {} as any,
        failureCategories: [],
      };

      const functionalPassRate = summary.totalScenarios > 0
        ? Math.round((summary.passedScenarios / summary.totalScenarios) * 1000) / 10
        : 0;

      items.push({
        projectId: raw.projectId,
        projectName: raw.projectName,
        origin: raw.projectOrigin as BenchmarkOrigin,
        runId: raw.id,
        runDate: raw.createdAt,
        commitSha: raw.commitSha,
        buildSuccess: raw.buildStatus === 'passed',
        functionalPassRate,
        overallScore: summary.overallScore || 0,
        accessibilityScore: summary.categoryScores?.accessibility?.score ?? 0,
        responsiveScore: summary.categoryScores?.responsive?.score ?? 0,
        securityScore: summary.categoryScores?.security?.score ?? 0,
        durationMs: raw.executionDurationMs || 0,
        totalTests: summary.totalScenarios,
        passedTests: summary.passedScenarios,
        failedTests: summary.failedScenarios,
        failureCategories: summary.failureCategories || [],
        status: raw.status,
        failureType: raw.failureType,
      });
    }

    return items;
  }

  // --- Provider Connections ---
  public async getProviderConnections(): Promise<ProviderConnection[]> {
    this.assertConnected();
    const docs = await ProviderConnectionModel.find({}).lean();
    return docs.map(this.mapProviderConnection);
  }

  public async getProviderConnection(provider: string): Promise<ProviderConnection | null> {
    this.assertConnected();
    const doc = await ProviderConnectionModel.findOne({ provider }).lean();
    return doc ? this.mapProviderConnection(doc) : null;
  }

  public async saveProviderConnection(conn: ProviderConnection): Promise<ProviderConnection> {
    this.assertConnected();
    const updated = await ProviderConnectionModel.findOneAndUpdate(
      { provider: conn.provider },
      { $set: conn },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    return this.mapProviderConnection(updated);
  }

  public async deleteProviderConnection(provider: string): Promise<boolean> {
    this.assertConnected();
    const res = await ProviderConnectionModel.deleteOne({ provider });
    return (res.deletedCount || 0) > 0;
  }

  // --- Generation Jobs ---
  public async getGenerationJobs(): Promise<GenerationJob[]> {
    this.assertConnected();
    const docs = await GenerationJobModel.find({}).sort({ createdAt: -1 }).lean();
    return docs.map(this.mapGenerationJob);
  }

  public async getGenerationJob(id: string): Promise<GenerationJob | null> {
    this.assertConnected();
    const doc = await GenerationJobModel.findOne({ id }).lean();
    return doc ? this.mapGenerationJob(doc) : null;
  }

  public async saveGenerationJob(job: GenerationJob): Promise<GenerationJob> {
    this.assertConnected();
    const updated = await GenerationJobModel.findOneAndUpdate(
      { id: job.id },
      { $set: job },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    return this.mapGenerationJob(updated);
  }

  // ==========================================
  // Universal MCP Registry & Connections
  // ==========================================
  public async getMcpConnections(ownerId?: string): Promise<McpConnectionRecord[]> {
    this.assertConnected();
    const query = ownerId ? { ownerId } : {};
    const docs = await McpConnectionModel.find(query).sort({ updatedAt: -1 }).lean();
    return docs.map((d: any) => this.mapMcpConnection(d));
  }

  public async getMcpConnection(id: string, ownerId?: string): Promise<McpConnectionRecord | null> {
    this.assertConnected();
    const query: any = { id };
    if (ownerId) query.ownerId = ownerId;
    const doc = await McpConnectionModel.findOne(query).lean();
    return doc ? this.mapMcpConnection(doc) : null;
  }

  public async saveMcpConnection(conn: McpConnectionRecord): Promise<McpConnectionRecord> {
    this.assertConnected();
    const updated = await McpConnectionModel.findOneAndUpdate(
      { id: conn.id },
      { $set: { ...conn, updatedAt: new Date().toISOString() } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    return this.mapMcpConnection(updated);
  }

  public async deleteMcpConnection(id: string, ownerId?: string): Promise<boolean> {
    this.assertConnected();
    const query: any = { id };
    if (ownerId) query.ownerId = ownerId;
    const res = await McpConnectionModel.deleteOne(query);
    return res.deletedCount > 0;
  }

  // ==========================================
  // MCP Benchmark Jobs
  // ==========================================
  public async getMcpBenchmarkJobs(ownerId?: string): Promise<McpBenchmarkJob[]> {
    this.assertConnected();
    const query = ownerId ? { ownerId } : {};
    const docs = await McpBenchmarkJobModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map((d: any) => this.mapMcpBenchmarkJob(d));
  }

  public async getMcpBenchmarkJob(id: string, ownerId?: string): Promise<McpBenchmarkJob | null> {
    this.assertConnected();
    const query: any = { id };
    if (ownerId) query.ownerId = ownerId;
    const doc = await McpBenchmarkJobModel.findOne(query).lean();
    return doc ? this.mapMcpBenchmarkJob(doc) : null;
  }

  public async saveMcpBenchmarkJob(job: McpBenchmarkJob): Promise<McpBenchmarkJob> {
    this.assertConnected();
    const updated = await McpBenchmarkJobModel.findOneAndUpdate(
      { id: job.id },
      { $set: { ...job, updatedAt: new Date().toISOString() } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    return this.mapMcpBenchmarkJob(updated);
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
      branch: raw.branch || 'main',
      entrypoint: raw.entrypoint,
      runtime: raw.runtime || 'nodejs',
      envVars: raw.envVars instanceof Map ? Object.fromEntries(raw.envVars) : raw.envVars,
      projectConfig: raw.projectConfig,
      preparationStatus: raw.preparationStatus || 'ready',
      preparationLogs: raw.preparationLogs || '',
      detectedManifest: raw.detectedManifest,
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
      sourceAgentId: raw.sourceAgentId,
      generatedBy: raw.generatedBy || 'manual',
      generationStatus: raw.generationStatus || 'ready',
      detectedDomain: raw.detectedDomain,
      detectedCapabilities: raw.detectedCapabilities || [],
      version: raw.version || 1,
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

  private mapBenchmarkProject(raw: any): BenchmarkProject {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description || '',
      source: raw.source,
      origin: raw.origin,
      repoUrl: raw.repoUrl,
      branch: raw.branch || 'main',
      commitSha: raw.commitSha,
      zipFileName: raw.zipFileName,
      benchmarkCategory: raw.benchmarkCategory,
      analysis: raw.analysis ? {
        framework: raw.analysis.framework || 'Unknown',
        language: raw.analysis.language || 'unknown',
        runtime: raw.analysis.runtime || 'unknown',
        packageManager: raw.analysis.packageManager || 'none',
        dependencies: raw.analysis.dependencies instanceof Map
          ? Object.fromEntries(raw.analysis.dependencies)
          : (raw.analysis.dependencies || {}),
        devDependencies: raw.analysis.devDependencies instanceof Map
          ? Object.fromEntries(raw.analysis.devDependencies)
          : (raw.analysis.devDependencies || {}),
        lockfileDetected: !!raw.analysis.lockfileDetected,
        buildScript: raw.analysis.buildScript,
        testScript: raw.analysis.testScript,
        startScript: raw.analysis.startScript,
        devScript: raw.analysis.devScript,
        entrypoints: raw.analysis.entrypoints || {},
        structure: raw.analysis.structure || { isMonorepo: false },
        databaseDetected: raw.analysis.databaseDetected,
        authDetected: raw.analysis.authDetected,
        referencedEnvVars: raw.analysis.referencedEnvVars || [],
        existingTestFiles: raw.analysis.existingTestFiles || [],
        likelyCapabilities: raw.analysis.likelyCapabilities || [],
        supportedRuntime: raw.analysis.supportedRuntime !== false,
        unsupportedReasons: raw.analysis.unsupportedReasons || [],
      } : undefined,
      preparationStatus: raw.preparationStatus || 'not_prepared',
      preparationLogs: raw.preparationLogs || '',
      envVars: raw.envVars instanceof Map ? Object.fromEntries(raw.envVars) : (raw.envVars || {}),
      missingRequirements: raw.missingRequirements || [],
      detectedServices: raw.detectedServices || [],
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  private mapBenchmarkDefinition(raw: any): BenchmarkDefinition {
    return {
      id: raw.id,
      projectId: raw.projectId,
      category: raw.category,
      name: raw.name,
      description: raw.description || '',
      generatedBy: raw.generatedBy || 'template',
      scoringWeights: raw.scoringWeights || {
        functional: 50,
        buildReliability: 20,
        accessibility: 10,
        responsive: 10,
        security: 10,
      },
      scenarios: raw.scenarios || [],
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  private mapBenchmarkRun(raw: any): BenchmarkRun {
    return {
      id: raw.id,
      projectId: raw.projectId,
      projectName: raw.projectName,
      projectOrigin: raw.projectOrigin,
      benchmarkId: raw.benchmarkId,
      commitSha: raw.commitSha,
      status: raw.status || 'queued',
      failureType: raw.failureType,
      buildStatus: raw.buildStatus || 'not_run',
      buildOutput: raw.buildOutput,
      scenarioRuns: raw.scenarioRuns || [],
      summary: raw.summary || {
        totalScenarios: 0,
        passedScenarios: 0,
        failedScenarios: 0,
        skippedScenarios: 0,
        errorScenarios: 0,
        overallScore: 0,
        categoryScores: {
          functional: { score: 0, available: false, weight: 50 },
          buildReliability: { score: 0, available: false, weight: 20 },
          accessibility: { score: 0, available: false, weight: 10 },
          responsive: { score: 0, available: false, weight: 10 },
          security: { score: 0, available: false, weight: 10 },
        },
        failureCategories: [],
        actionableDebuggingSuggestions: [],
      },
      executionDurationMs: raw.executionDurationMs || 0,
      startedAt: raw.startedAt ? new Date(raw.startedAt).toISOString() : new Date().toISOString(),
      completedAt: raw.completedAt ? new Date(raw.completedAt).toISOString() : undefined,
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  private mapProviderConnection(raw: any): ProviderConnection {
    return {
      provider: raw.provider,
      name: raw.name,
      status: raw.status || 'disconnected',
      authType: raw.authType || 'oauth',
      accountEmail: raw.accountEmail,
      accountName: raw.accountName,
      workspaceId: raw.workspaceId,
      workspaceName: raw.workspaceName,
      serverUrl: raw.serverUrl,
      accessToken: raw.accessToken, // Kept in memory/server-side only
      refreshToken: raw.refreshToken,
      tokenExpiresAt: raw.tokenExpiresAt,
      supportedOperations: raw.supportedOperations || [],
      discoveredTools: raw.discoveredTools || [],
      directPromptGeneration: !!raw.directPromptGeneration,
      githubExportSupported: raw.githubExportSupported !== false,
      zipImportSupported: raw.zipImportSupported !== false,
      guidanceNotes: raw.guidanceNotes,
      lastCheckedAt: raw.lastCheckedAt ? new Date(raw.lastCheckedAt).toISOString() : new Date().toISOString(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  private mapGenerationJob(raw: any): GenerationJob {
    return {
      id: raw.id,
      provider: raw.provider,
      projectName: raw.projectName,
      userPrompt: raw.userPrompt,
      benchmarkCategory: raw.benchmarkCategory || 'auto',
      inferredBenchmarkSpec: raw.inferredBenchmarkSpec,
      creditWarningAccepted: !!raw.creditWarningAccepted,
      status: raw.status || 'draft',
      failureReason: raw.failureReason,
      errorMessage: raw.errorMessage,
      providerProjectId: raw.providerProjectId,
      providerJobId: raw.providerJobId,
      providerProjectUrl: raw.providerProjectUrl,
      resultProjectId: raw.resultProjectId,
      logs: raw.logs || [],
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
      completedAt: raw.completedAt ? new Date(raw.completedAt).toISOString() : undefined,
    };
  }

  private mapMcpConnection(raw: any): McpConnectionRecord {
    return {
      id: raw.id,
      ownerId: raw.ownerId || 'default-owner',
      displayName: raw.displayName,
      preset: raw.preset,
      serverUrl: raw.serverUrl,
      localCommand: raw.localCommand,
      localArgs: raw.localArgs || [],
      localEnv: raw.localEnv || {},
      localCwd: raw.localCwd,
      transport: raw.transport || 'streamable_http',
      authType: raw.authType || 'none',
      encryptedCredentials: raw.encryptedCredentials,
      headers: raw.headers || {},
      connectionStatus: raw.connectionStatus || 'disconnected',
      protocolVersion: raw.protocolVersion,
      serverCapabilities: raw.serverCapabilities || {},
      discoveredTools: raw.discoveredTools || [],
      discoveredResources: raw.discoveredResources || [],
      lastConnectedAt: raw.lastConnectedAt,
      lastError: raw.lastError,
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  private mapMcpBenchmarkJob(raw: any): McpBenchmarkJob {
    return {
      id: raw.id,
      connectionId: raw.connectionId,
      ownerId: raw.ownerId || 'default-owner',
      taskPrompt: raw.taskPrompt,
      benchmarkCategory: raw.benchmarkCategory || 'auto',
      status: raw.status || 'pending',
      mappedTools: raw.mappedTools || {},
      supportedCapabilities: raw.supportedCapabilities || {
        canCreateProject: false,
        canGenerateCode: false,
        canRetrieveCode: false,
        canExecuteTests: false,
      },
      providerProjectId: raw.providerProjectId,
      retrievedCodeDir: raw.retrievedCodeDir,
      resultProjectId: raw.resultProjectId,
      benchmarkRunId: raw.benchmarkRunId,
      overallScore: raw.overallScore,
      failureReason: raw.failureReason,
      failureType: raw.failureType,
      logs: raw.logs || [],
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
      completedAt: raw.completedAt ? new Date(raw.completedAt).toISOString() : undefined,
    };
  }
}
