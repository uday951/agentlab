import type { Agent, World, Scenario, ExecutionEvent, ScenarioRun } from '../../types.ts';
import { ShopSphereToolRegistry } from '../tools.ts';
import { LocalRAGPipeline } from '../rag.ts';

export interface AgentExecutionContext {
  agent: Agent;
  world: World;
  scenario: Scenario;
  experimentId: string;
  tools: ShopSphereToolRegistry;
  rag: LocalRAGPipeline;
  stepCounter: number;
  emitEvent: (event: Omit<ExecutionEvent, 'id' | 'experimentId' | 'scenarioId' | 'step' | 'timestamp'>) => ExecutionEvent;
}

export interface AgentAdapter {
  executeScenario(context: AgentExecutionContext): Promise<ScenarioRun>;
}
