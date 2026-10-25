import type {
  Experiment,
  Agent,
  World,
  Scenario,
  ExecutionEvent,
  ScenarioRun,
  EvaluationResult,
} from '../types.ts';
import { ShopSphereToolRegistry } from './tools.ts';
import { LocalRAGPipeline } from './rag.ts';
import type { AgentAdapter } from './adapters/AgentAdapter.ts';
import { SampleSupportAgent } from './adapters/SampleSupportAgent.ts';
import { ApiAgentAdapter } from './adapters/ApiAgentAdapter.ts';
import { CliAgentAdapter } from './adapters/CliAgentAdapter.ts';
import { ProjectImportAdapter } from './adapters/ProjectImportAdapter.ts';
import { DeepSeekAgentAdapter } from './adapters/DeepSeekAgentAdapter.ts';
import type { IStorageStore } from '../storage/storage.ts';

export type EventSubscriber = (event: { type: string; data: any }) => void;

export class SimulationEngine {
  private storage: IStorageStore;
  private subscribers: Map<string, Set<EventSubscriber>> = new Map();
  private runningExperiments: Set<string> = new Set();
  private cancellationTokens: Set<string> = new Set();

  constructor(storage: IStorageStore) {
    this.storage = storage;
  }

  public subscribe(experimentId: string, callback: EventSubscriber) {
    if (!this.subscribers.has(experimentId)) {
      this.subscribers.set(experimentId, new Set());
    }
    this.subscribers.get(experimentId)!.add(callback);
    return () => {
      this.subscribers.get(experimentId)?.delete(callback);
    };
  }

  private broadcast(experimentId: string, type: string, data: any) {
    const subs = this.subscribers.get(experimentId);
    if (subs) {
      for (const cb of subs) {
        try {
          cb({ type, data });
        } catch (e) {
          console.error('Subscriber notification error:', e);
        }
      }
    }
  }

  public cancel(experimentId: string) {
    if (this.runningExperiments.has(experimentId)) {
      this.cancellationTokens.add(experimentId);
      this.broadcast(experimentId, 'status', { status: 'cancelling' });
      return true;
    }
    return false;
  }

  public async runExperiment(experimentId: string): Promise<Experiment> {
    const experiment = await this.storage.getExperiment(experimentId);
    if (!experiment) throw new Error(`Experiment ${experimentId} not found`);

    const agent = await this.storage.getAgent(experiment.agentId);
    if (!agent) throw new Error(`Agent ${experiment.agentId} not found`);

    const world = await this.storage.getWorld(experiment.worldId);
    if (!world) throw new Error(`World ${experiment.worldId} not found`);

    const allWorldScenarios = await this.storage.getScenariosForWorld(world.id);
    const scenariosToRun = allWorldScenarios.filter((s) =>
      experiment.scenarioIds.length === 0 || experiment.scenarioIds.includes(s.id)
    );

    if (scenariosToRun.length === 0) {
      throw new Error(`No scenarios found to run for world ${world.name}`);
    }

    this.runningExperiments.add(experimentId);
    this.cancellationTokens.delete(experimentId);

    experiment.status = 'running';
    experiment.startedAt = new Date().toISOString();
    experiment.runs = [];
    experiment.events = [];
    await this.storage.saveExperiment(experiment);

    this.broadcast(experimentId, 'experiment_started', {
      experimentId,
      scenarioCount: scenariosToRun.length,
    });

    // Select adapter based on agent connection type and configuration
    let adapter: AgentAdapter;
    const isDeepSeek =
      (agent.connectionType as any) === 'deepseek' ||
      agent.id.includes('deepseek') ||
      agent.endpoint?.includes('deepseek') ||
      agent.model?.toLowerCase().includes('deepseek');

    if (isDeepSeek && (process.env.LLM_API_KEY || agent.authHeader)) {
      adapter = new DeepSeekAgentAdapter(
        agent.authHeader || process.env.LLM_API_KEY,
        agent.endpoint,
        agent.model
      );
    } else {
      switch (agent.connectionType) {
        case 'api':
          adapter = new ApiAgentAdapter();
          break;
        case 'cli':
          adapter = new CliAgentAdapter();
          break;
        case 'import':
          adapter = new ProjectImportAdapter();
          break;
        case 'builtin':
        default:
          adapter = new SampleSupportAgent();
          break;
      }
    }

    // Initialize environment tools & RAG pipeline
    const toolRegistry = new ShopSphereToolRegistry(world.initialData?.orders || []);
    const ragPipeline = new LocalRAGPipeline(world.knowledgeDocuments || []);

    let stepCounter = 0;
    const runs: ScenarioRun[] = [];
    const allEvents: ExecutionEvent[] = [];

    try {
      for (let i = 0; i < scenariosToRun.length; i++) {
        // Check for user cancellation
        if (this.cancellationTokens.has(experimentId)) {
          experiment.status = 'cancelled';
          this.broadcast(experimentId, 'experiment_cancelled', { experimentId });
          break;
        }

        const scenario = scenariosToRun[i];
        this.broadcast(experimentId, 'scenario_started', {
          index: i + 1,
          total: scenariosToRun.length,
          scenario,
        });

        // Pacing delay for live event streaming
        await new Promise((r) => setTimeout(r, 180));

        const emitEvent = (
          evtData: Omit<ExecutionEvent, 'id' | 'experimentId' | 'scenarioId' | 'step' | 'timestamp'>
        ): ExecutionEvent => {
          stepCounter++;
          const fullEvent: ExecutionEvent = {
            id: `evt-${Date.now()}-${stepCounter}`,
            experimentId,
            scenarioId: scenario.id,
            step: stepCounter,
            timestamp: new Date().toISOString(),
            ...evtData,
          };

          allEvents.push(fullEvent);
          this.broadcast(experimentId, 'event', fullEvent);
          return fullEvent;
        };

        const runResult = await adapter.executeScenario({
          agent,
          world,
          scenario,
          experimentId,
          tools: toolRegistry,
          rag: ragPipeline,
          stepCounter,
          emitEvent,
        });

        runs.push(runResult);
        experiment.runs = runs;
        experiment.events = allEvents;
        experiment.progress = Math.round(((i + 1) / scenariosToRun.length) * 100);

        this.broadcast(experimentId, 'scenario_completed', {
          index: i + 1,
          total: scenariosToRun.length,
          run: runResult,
        });

        // Save progress incrementally to MongoDB
        await this.storage.saveExperiment(experiment);
      }

      // Calculate final deterministic evaluation metrics
      if (experiment.status !== 'cancelled') {
        experiment.status = 'completed';
        experiment.completedAt = new Date().toISOString();
        experiment.results = this.calculateEvaluation(experimentId, runs, allEvents);
      }
    } catch (err: any) {
      experiment.status = 'failed';
      console.error(`Experiment ${experimentId} failed:`, err);
      this.broadcast(experimentId, 'experiment_error', { error: err.message });
    } finally {
      this.runningExperiments.delete(experimentId);
      this.cancellationTokens.delete(experimentId);
      await this.storage.saveExperiment(experiment);
      this.broadcast(experimentId, 'experiment_completed', {
        experimentId,
        status: experiment.status,
        results: experiment.results,
      });
    }

    return experiment;
  }

  /**
   * Deterministic Evaluation Calculation:
   * Accurately calculates task completion, correct outcome rate, policy compliance rate,
   * tool-call success rate, duration, and categorized failure evidence.
   */
  public calculateEvaluation(
    experimentId: string,
    runs: ScenarioRun[],
    allEvents: ExecutionEvent[] = []
  ): EvaluationResult {
    const total = runs.length;
    if (total === 0) {
      return {
        experimentId,
        totalScenarios: 0,
        passedScenarios: 0,
        failedScenarios: 0,
        taskCompletionRate: 0,
        correctOutcomeRate: 0,
        toolSuccessRate: 0,
        policyComplianceRate: 0,
        overallScore: 0,
        toolFailureCount: 0,
        incorrectDecisionCount: 0,
        averageDurationMs: 0,
        estimatedCost: '$0.00',
        failuresList: [],
      };
    }

    let passedCount = 0;
    let taskCompletedCount = 0;
    let correctOutcomeCount = 0;
    let policyCompliantCount = 0;
    let totalScore = 0;
    let totalDuration = 0;
    let toolFailureCount = 0;
    let incorrectDecisionCount = 0;
    const failuresList: EvaluationResult['failuresList'] = [];

    // Calculate actual tool calls across all traces
    let totalToolCalls = 0;
    let successfulToolCalls = 0;

    for (const evt of allEvents) {
      if (evt.actionType === 'tool_call' || evt.actionType === 'tool_result') {
        totalToolCalls++;
        if (evt.status !== 'error') {
          successfulToolCalls++;
        }
      }
    }

    for (const run of runs) {
      const ev = run.evaluation;
      totalDuration += run.durationMs;
      totalScore += ev.score || 0;

      if (ev.passed) passedCount++;
      if (ev.taskCompleted) taskCompletedCount++;
      if (ev.correctOutcome) correctOutcomeCount++;
      if (ev.policyCompliant) policyCompliantCount++;

      // Check for tool failures in execution trace
      const hasToolFailure = run.executionTrace.some(
        (e) =>
          e.actionType === 'failure_injected' ||
          (e.actionType === 'tool_result' && e.status === 'error')
      );
      if (hasToolFailure) toolFailureCount++;

      if (!ev.correctOutcome) incorrectDecisionCount++;

      if (!ev.passed) {
        failuresList.push({
          scenarioId: run.scenarioId,
          scenarioTitle: run.scenarioTitle,
          expected: ev.explanation ? `Rule violation in ${run.category}` : 'Expected compliant resolution',
          actual: run.agentOutput.decision,
          failureCategory: ev.failureCategory || 'Behavioral Anomaly',
          explanation: ev.explanation || 'Outcome did not meet configured success criteria.',
          observedEvidence: ev.observedEvidence || [],
          suggestedRemediation:
            ev.suggestedRemediation || 'Adjust agent prompt instructions and test again.',
        });
      }
    }

    // Tool success rate: Percentage of tool invocations that succeeded
    const toolSuccessRate =
      totalToolCalls > 0
        ? Math.round((successfulToolCalls / totalToolCalls) * 1000) / 10
        : Math.round(((total - toolFailureCount) / total) * 1000) / 10;

    return {
      experimentId,
      totalScenarios: total,
      passedScenarios: passedCount,
      failedScenarios: total - passedCount,
      taskCompletionRate: Math.round((taskCompletedCount / total) * 1000) / 10,
      correctOutcomeRate: Math.round((correctOutcomeCount / total) * 1000) / 10,
      toolSuccessRate,
      policyComplianceRate: Math.round((policyCompliantCount / total) * 1000) / 10,
      overallScore: Math.round(totalScore / total),
      toolFailureCount,
      incorrectDecisionCount,
      averageDurationMs: Math.round(totalDuration / total),
      estimatedCost: '$0.00 (Deterministic Sample Agent)',
      failuresList,
    };
  }
}
