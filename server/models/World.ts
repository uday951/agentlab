import mongoose, { Schema, type Document } from 'mongoose';

export interface IWorldDocument extends Document {
  id: string;
  name: string;
  industry: string;
  description: string;
  sourceAgentId?: string;
  generatedBy?: 'ai' | 'fallback' | 'manual';
  generationStatus?: 'analyzing' | 'generating' | 'validating' | 'ready' | 'needs_configuration';
  detectedDomain?: string;
  detectedCapabilities?: string[];
  version?: number;
  systemRules: string[];
  simulatedTools: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
    enabled: boolean;
    failProbability?: number;
    forceFailure?: boolean;
    failureMessage?: string;
  }>;
  customerProfiles: Array<{
    id: string;
    name: string;
    email: string;
    tier: 'standard' | 'vip' | 'new';
    behaviorTrait: string;
  }>;
  eventConditions: string[];
  successCriteria: string[];
  initialData: {
    orders?: any[];
    customers?: any[];
    policies?: any[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const WorldSchema = new Schema<IWorldDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    industry: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    sourceAgentId: { type: String, index: true },
    generatedBy: { type: String, enum: ['ai', 'fallback', 'manual'], default: 'manual' },
    generationStatus: {
      type: String,
      enum: ['analyzing', 'generating', 'validating', 'ready', 'needs_configuration'],
      default: 'ready',
    },
    detectedDomain: { type: String },
    detectedCapabilities: { type: [String], default: [] },
    version: { type: Number, default: 1 },
    systemRules: { type: [String], default: [] },
    simulatedTools: [
      {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        parameters: { type: Schema.Types.Mixed, default: {} },
        enabled: { type: Boolean, default: true },
        failProbability: { type: Number, default: 0 },
        forceFailure: { type: Boolean, default: false },
        failureMessage: { type: String },
      },
    ],
    customerProfiles: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
        tier: { type: String, enum: ['standard', 'vip', 'new'], default: 'standard' },
        behaviorTrait: { type: String, default: '' },
      },
    ],
    eventConditions: { type: [String], default: [] },
    successCriteria: { type: [String], default: [] },
    initialData: {
      orders: { type: [Schema.Types.Mixed], default: [] },
      customers: { type: [Schema.Types.Mixed], default: [] },
      policies: { type: [Schema.Types.Mixed], default: [] },
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

export const WorldModel =
  mongoose.models.World || mongoose.model<IWorldDocument>('World', WorldSchema);
