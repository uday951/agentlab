import mongoose, { Schema, type Document } from 'mongoose';
import type { BenchmarkRun } from '../types.ts';

export interface IBenchmarkRunDocument extends Omit<BenchmarkRun, 'id'>, Document {
  id: string;
}

const BenchmarkScenarioRunSchema = new Schema(
  {
    scenarioId: { type: String, required: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['functional', 'build', 'accessibility', 'responsive', 'security', 'persistence'],
      required: true,
    },
    type: { type: String, required: true },
    status: { type: String, enum: ['passed', 'failed', 'error', 'skipped'], required: true },
    durationMs: { type: Number, default: 0 },
    expectedResult: { type: String, required: true },
    actualResult: { type: String, required: true },
    logs: { type: [String], default: [] },
    screenshots: { type: [String], default: [] },
    traces: { type: Schema.Types.Mixed },
    errorMessage: { type: String },
  },
  { _id: false }
);

const CategoryScoreSchema = new Schema(
  {
    score: { type: Number, required: true },
    available: { type: Boolean, required: true },
    weight: { type: Number, required: true },
  },
  { _id: false }
);

const BenchmarkRunSummarySchema = new Schema(
  {
    totalScenarios: { type: Number, default: 0 },
    passedScenarios: { type: Number, default: 0 },
    failedScenarios: { type: Number, default: 0 },
    skippedScenarios: { type: Number, default: 0 },
    errorScenarios: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },
    categoryScores: {
      functional: { type: CategoryScoreSchema, required: true },
      buildReliability: { type: CategoryScoreSchema, required: true },
      accessibility: { type: CategoryScoreSchema, required: true },
      responsive: { type: CategoryScoreSchema, required: true },
      security: { type: CategoryScoreSchema, required: true },
    },
    failureCategories: { type: [String], default: [] },
    actionableDebuggingSuggestions: { type: [String], default: [] },
  },
  { _id: false }
);

const BenchmarkRunSchema = new Schema<IBenchmarkRunDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    projectName: { type: String, required: true },
    projectOrigin: { type: String, required: true, index: true },
    benchmarkId: { type: String, required: true },
    commitSha: { type: String },
    status: {
      type: String,
      enum: ['queued', 'preparing', 'needs_configuration', 'running', 'completed', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    failureType: { type: String, enum: ['application', 'infrastructure'] },
    buildStatus: { type: String, enum: ['passed', 'failed', 'skipped', 'not_run'], default: 'not_run' },
    buildOutput: { type: String },
    scenarioRuns: { type: [BenchmarkScenarioRunSchema], default: [] },
    summary: { type: BenchmarkRunSummarySchema, required: true },
    executionDurationMs: { type: Number, default: 0 },
    startedAt: { type: String, required: true },
    completedAt: { type: String },
    createdAt: { type: String, required: true },
  },
  {
    timestamps: false,
    collection: 'benchmark_runs',
  }
);

export const BenchmarkRunModel =
  mongoose.models.BenchmarkRun ||
  mongoose.model<IBenchmarkRunDocument>('BenchmarkRun', BenchmarkRunSchema);
