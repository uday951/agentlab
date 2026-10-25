import mongoose, { Schema, Document } from 'mongoose';
import type { McpBenchmarkJob } from '../mcp/types.ts';

export interface IMcpBenchmarkJobDocument extends Document, Omit<McpBenchmarkJob, 'id'> {}

const McpBenchmarkJobSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    connectionId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, default: 'default-owner' },
    taskPrompt: { type: String, required: true },
    benchmarkCategory: { type: String, default: 'auto' },
    status: {
      type: String,
      enum: [
        'pending',
        'analyzing_capabilities',
        'submitting_task',
        'monitoring_generation',
        'retrieving_code',
        'preparing_sandbox',
        'evaluating',
        'completed',
        'failed',
      ],
      default: 'pending',
    },
    mappedTools: { type: Schema.Types.Mixed, default: {} },
    supportedCapabilities: { type: Schema.Types.Mixed, default: {} },
    providerProjectId: { type: String },
    retrievedCodeDir: { type: String },
    resultProjectId: { type: String },
    benchmarkRunId: { type: String },
    overallScore: { type: Number },
    failureReason: { type: String },
    failureType: { type: String },
    logs: { type: [String], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    completedAt: { type: String },
  },
  {
    timestamps: false,
    minimize: false,
  }
);

export const McpBenchmarkJobModel =
  mongoose.models.McpBenchmarkJob ||
  mongoose.model<IMcpBenchmarkJobDocument>('McpBenchmarkJob', McpBenchmarkJobSchema);
