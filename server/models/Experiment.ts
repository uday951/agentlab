import mongoose, { Schema, type Document } from 'mongoose';
import { EvaluationResultSchema, type IEvaluationResultDocument } from './EvaluationResult.ts';

export interface IScenarioRunSubdoc {
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
  executionTrace?: any[];
}

export interface IExperimentDocument extends Document {
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
  runs: IScenarioRunSubdoc[];
  events?: any[];
  results?: IEvaluationResultDocument;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  updatedAt: Date;
}

const ScenarioRunSchema = new Schema<IScenarioRunSubdoc>(
  {
    id: { type: String, required: true },
    experimentId: { type: String, required: true },
    scenarioId: { type: String, required: true },
    scenarioTitle: { type: String, required: true },
    category: { type: String, required: true },
    status: { type: String, enum: ['passed', 'failed', 'error'], required: true },
    agentOutput: {
      decision: { type: String, required: true },
      message: { type: String, default: '' },
      rationale: { type: String, default: '' },
      policyRefCited: { type: String },
      escalatedTicketId: { type: String },
      refundTransactionId: { type: String },
    },
    durationMs: { type: Number, default: 0 },
    evaluation: {
      passed: { type: Boolean, required: true },
      taskCompleted: { type: Boolean, required: true },
      correctOutcome: { type: Boolean, required: true },
      toolAccuracy: { type: Boolean, required: true },
      policyCompliant: { type: Boolean, required: true },
      score: { type: Number, default: 0 },
      failureCategory: { type: String },
      explanation: { type: String },
      observedEvidence: { type: [String], default: [] },
      suggestedRemediation: { type: String },
    },
    executionTrace: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const ExperimentSchema = new Schema<IExperimentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    agentId: { type: String, required: true, index: true },
    agentName: { type: String, required: true },
    worldId: { type: String, required: true, index: true },
    worldName: { type: String, required: true },
    scenarioIds: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'cancelled', 'failed'],
      default: 'pending',
      index: true,
    },
    scenarioCount: { type: Number, default: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    runs: { type: [ScenarioRunSchema], default: [] },
    events: { type: [Schema.Types.Mixed], default: [] },
    results: { type: EvaluationResultSchema },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ExperimentSchema.index({ status: 1, createdAt: -1 });
ExperimentSchema.index({ agentId: 1, worldId: 1 });

export const ExperimentModel =
  mongoose.models.Experiment || mongoose.model<IExperimentDocument>('Experiment', ExperimentSchema);
