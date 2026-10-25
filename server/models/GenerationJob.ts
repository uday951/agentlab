import mongoose, { Schema, type Document } from 'mongoose';
import type { GenerationJob } from '../types.ts';

export interface IGenerationJobDocument extends Omit<GenerationJob, 'id'>, Document {
  id: string;
}

const GenerationJobSchema = new Schema<IGenerationJobDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    provider: {
      type: String,
      enum: ['lovable', 'bolt', 'replit', 'emergent'],
      required: true,
      index: true,
    },
    projectName: { type: String, required: true },
    userPrompt: { type: String, required: true },
    benchmarkCategory: { type: String, default: 'auto' },
    inferredBenchmarkSpec: { type: Schema.Types.Mixed },
    creditWarningAccepted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [
        'draft',
        'prompt_approved',
        'submitting',
        'generating',
        'retrieving_code',
        'completed',
        'failed',
      ],
      default: 'draft',
      index: true,
    },
    failureReason: {
      type: String,
      enum: [
        'provider_generation_failure',
        'quota_exceeded',
        'auth_error',
        'retrieval_failure',
        'preparation_failure',
      ],
    },
    errorMessage: { type: String },
    providerProjectId: { type: String },
    providerJobId: { type: String },
    providerProjectUrl: { type: String },
    resultProjectId: { type: String, index: true },
    logs: { type: [String], default: [] },
    createdAt: { type: String, required: true },
    completedAt: { type: String },
  },
  {
    timestamps: false,
    collection: 'generation_jobs',
  }
);

export const GenerationJobModel =
  mongoose.models.GenerationJob ||
  mongoose.model<IGenerationJobDocument>('GenerationJob', GenerationJobSchema);
