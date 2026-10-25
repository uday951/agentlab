import mongoose, { Schema, type Document } from 'mongoose';

export interface IPlatformConfigDocument extends Document {
  id: string; // 'default'
  llmProvider: string;
  llmApiKey?: string;
  llmModel: string;
  githubToken?: string;
  enableCliRunner: boolean;
  agentRunnerMode: 'builtin-sandbox' | 'external-docker';
  agentRunnerUrl?: string;
  agentRunnerToken?: string;
  maxExecutionTimeoutMs: number;
  maxOutputSizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformConfigSchema = new Schema<IPlatformConfigDocument>(
  {
    id: { type: String, required: true, unique: true, default: 'default' },
    llmProvider: { type: String, default: 'deepseek' },
    llmApiKey: { type: String, default: '' },
    llmModel: { type: String, default: 'deepseek-chat' },
    githubToken: { type: String, default: '' },
    enableCliRunner: { type: Boolean, default: false },
    agentRunnerMode: {
      type: String,
      enum: ['builtin-sandbox', 'external-docker'],
      default: 'builtin-sandbox',
    },
    agentRunnerUrl: { type: String, default: '' },
    agentRunnerToken: { type: String, default: '' },
    maxExecutionTimeoutMs: { type: Number, default: 15000 },
    maxOutputSizeBytes: { type: Number, default: 65536 },
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

export const PlatformConfigModel =
  mongoose.models.PlatformConfig ||
  mongoose.model<IPlatformConfigDocument>('PlatformConfig', PlatformConfigSchema);
