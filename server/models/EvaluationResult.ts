import mongoose, { Schema, type Document } from 'mongoose';

export interface IEvaluationResultDocument extends Document {
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
  failuresList: Array<{
    scenarioId: string;
    scenarioTitle: string;
    expected: string;
    actual: string;
    failureCategory: string;
    explanation: string;
    observedEvidence: string[];
    suggestedRemediation: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export const EvaluationResultSchema = new Schema<IEvaluationResultDocument>(
  {
    experimentId: { type: String, required: true },
    totalScenarios: { type: Number, required: true },
    passedScenarios: { type: Number, required: true },
    failedScenarios: { type: Number, required: true },
    taskCompletionRate: { type: Number, required: true },
    correctOutcomeRate: { type: Number, required: true },
    toolSuccessRate: { type: Number, required: true },
    policyComplianceRate: { type: Number, required: true },
    overallScore: { type: Number, required: true },
    toolFailureCount: { type: Number, required: true },
    incorrectDecisionCount: { type: Number, required: true },
    averageDurationMs: { type: Number, required: true },
    estimatedCost: { type: String, default: 'N/A (Built-in Testing Agent)' },
    failuresList: [
      {
        scenarioId: { type: String, required: true },
        scenarioTitle: { type: String, required: true },
        expected: { type: String, required: true },
        actual: { type: String, required: true },
        failureCategory: { type: String, required: true },
        explanation: { type: String, required: true },
        observedEvidence: { type: [String], default: [] },
        suggestedRemediation: { type: String, required: true },
      },
    ],
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

export const EvaluationResultModel =
  mongoose.models.EvaluationResult ||
  mongoose.model<IEvaluationResultDocument>('EvaluationResult', EvaluationResultSchema);
