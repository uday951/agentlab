import mongoose, { Schema, type Document } from 'mongoose';

export interface IAgentDocument extends Document {
  id: string;
  name: string;
  description: string;
  connectionType: 'builtin' | 'api' | 'cli' | 'import';
  model: string;
  endpoint?: string;
  authType?: 'none' | 'bearer' | 'api_key' | 'basic';
  authHeader?: string;
  requestMapping?: string;
  responseMapping?: string;
  cliCommand?: string;
  workingDir?: string;
  repoUrl?: string;
  entrypoint?: string;
  projectConfig?: Record<string, any>;
  headers?: Record<string, string>;
  capabilities: string[];
  tools: string[];
  timeoutMs: number;
  status: 'ready' | 'needs_configuration' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgentDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    connectionType: {
      type: String,
      enum: ['builtin', 'api', 'cli', 'import'],
      required: true,
      default: 'builtin',
      index: true,
    },
    model: { type: String, default: 'Custom Model' },
    endpoint: { type: String, trim: true },
    authType: { type: String, enum: ['none', 'bearer', 'api_key', 'basic'], default: 'none' },
    authHeader: { type: String },
    requestMapping: { type: String },
    responseMapping: { type: String },
    cliCommand: { type: String },
    workingDir: { type: String },
    repoUrl: { type: String },
    entrypoint: { type: String },
    projectConfig: { type: Schema.Types.Mixed },
    headers: { type: Map, of: String },
    capabilities: { type: [String], default: ['simulated_tools'] },
    tools: {
      type: [String],
      default: ['lookup_order', 'check_refund_eligibility', 'process_refund'],
    },
    timeoutMs: { type: Number, default: 5000, min: 500, max: 60000 },
    status: {
      type: String,
      enum: ['ready', 'needs_configuration', 'error'],
      default: 'ready',
      index: true,
    },
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

export const AgentModel =
  mongoose.models.Agent || mongoose.model<IAgentDocument>('Agent', AgentSchema);
