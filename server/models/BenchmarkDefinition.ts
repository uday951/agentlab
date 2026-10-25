import mongoose, { Schema, type Document } from 'mongoose';
import type { BenchmarkDefinition } from '../types.ts';

export interface IBenchmarkDefinitionDocument extends Omit<BenchmarkDefinition, 'id'>, Document {
  id: string;
}

const BenchmarkScenarioSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    objective: { type: String, required: true },
    category: {
      type: String,
      enum: ['functional', 'build', 'accessibility', 'responsive', 'security', 'persistence'],
      required: true,
    },
    type: {
      type: String,
      enum: ['browser', 'api', 'build', 'unit_test', 'static_security', 'accessibility', 'responsive', 'persistence'],
      required: true,
    },
    preconditions: { type: String },
    testData: { type: Schema.Types.Mixed },
    executionSteps: { type: [String], default: [] },
    expectedResult: { type: String, required: true },
    testSpec: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const ScoringWeightsSchema = new Schema(
  {
    functional: { type: Number, default: 50 },
    buildReliability: { type: Number, default: 20 },
    accessibility: { type: Number, default: 10 },
    responsive: { type: Number, default: 10 },
    security: { type: Number, default: 10 },
  },
  { _id: false }
);

const BenchmarkDefinitionSchema = new Schema<IBenchmarkDefinitionDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    generatedBy: { type: String, enum: ['ai', 'template'], default: 'template' },
    scoringWeights: { type: ScoringWeightsSchema, default: () => ({}) },
    scenarios: { type: [BenchmarkScenarioSchema], default: [] },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    collection: 'benchmark_definitions',
  }
);

export const BenchmarkDefinitionModel =
  mongoose.models.BenchmarkDefinition ||
  mongoose.model<IBenchmarkDefinitionDocument>('BenchmarkDefinition', BenchmarkDefinitionSchema);
