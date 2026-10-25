import mongoose, { Schema, type Document } from 'mongoose';
import type { BenchmarkProject } from '../types.ts';

export interface IBenchmarkProjectDocument extends Omit<BenchmarkProject, 'id'>, Document {
  id: string;
}

const ProjectAnalysisSchema = new Schema(
  {
    framework: { type: String, required: true },
    language: { type: String, required: true },
    runtime: { type: String, required: true },
    packageManager: { type: String, required: true },
    dependencies: { type: Schema.Types.Mixed, default: {} },
    devDependencies: { type: Schema.Types.Mixed, default: {} },
    lockfileDetected: { type: Boolean, default: false },
    buildScript: { type: String },
    testScript: { type: String },
    startScript: { type: String },
    devScript: { type: String },
    entrypoints: {
      frontend: { type: String },
      backend: { type: String },
      root: { type: String },
    },
    structure: {
      isMonorepo: { type: Boolean, default: false },
      frontendDir: { type: String },
      backendDir: { type: String },
    },
    databaseDetected: { type: String },
    authDetected: { type: String },
    referencedEnvVars: { type: [String], default: [] },
    existingTestFiles: { type: [String], default: [] },
    likelyCapabilities: { type: [String], default: [] },
    supportedRuntime: { type: Boolean, default: true },
    unsupportedReasons: { type: [String], default: [] },
  },
  { _id: false }
);

const BenchmarkProjectSchema = new Schema<IBenchmarkProjectDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    source: { type: String, enum: ['github', 'zip'], required: true },
    origin: {
      type: String,
      enum: ['lovable', 'emergent', 'bolt', 'replit', 'generic_github', 'zip_upload', 'agentlab_agent'],
      required: true,
      index: true,
    },
    repoUrl: { type: String },
    branch: { type: String },
    commitSha: { type: String },
    zipFileName: { type: String },
    benchmarkCategory: { type: String, index: true },
    analysis: { type: ProjectAnalysisSchema },
    preparationStatus: {
      type: String,
      enum: ['not_prepared', 'preparing', 'ready', 'needs_configuration', 'failed'],
      default: 'not_prepared',
      index: true,
    },
    preparationLogs: { type: String, default: '' },
    envVars: { type: Schema.Types.Mixed, default: {} },
    missingRequirements: { type: [String], default: [] },
    detectedServices: { type: [String], default: [] },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    collection: 'benchmark_projects',
  }
);

export const BenchmarkProjectModel =
  mongoose.models.BenchmarkProject ||
  mongoose.model<IBenchmarkProjectDocument>('BenchmarkProject', BenchmarkProjectSchema);
