import mongoose, { Schema, type Document } from 'mongoose';

export interface IScenarioDocument extends Document {
  id: string;
  worldId: string;
  title: string;
  description: string;
  category: 'normal' | 'edge_case' | 'adversarial' | 'tool_failure' | 'policy_conflict' | 'escalation';
  customerProfile: {
    id: string;
    name: string;
    email: string;
    tier: string;
    behaviorTrait: string;
  };
  inputTask: string;
  orderContext?: {
    orderId: string;
    item: string;
    amount: number;
    purchaseDaysAgo: number;
    condition: string;
    category: string;
  };
  injectedFailures?: {
    toolName: string;
    failureType: 'timeout' | 'http_500' | 'permission_denied' | 'network_drop';
    failureMessage: string;
  };
  expectedOutcome: {
    decision: 'process_refund' | 'reject_refund' | 'escalate_manager' | 'request_info' | 'provide_info';
    policyRef?: string;
    requiresEscalation?: boolean;
    gracefulErrorHandling?: boolean;
  };
  evaluationRules: {
    mustCallTools?: string[];
    mustNotCallTools?: string[];
    mustCitePolicy?: string;
    maxAllowedTurns?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ScenarioSchema = new Schema<IScenarioDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    worldId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['normal', 'edge_case', 'adversarial', 'tool_failure', 'policy_conflict', 'escalation'],
      required: true,
      index: true,
    },
    customerProfile: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      tier: { type: String, default: 'standard' },
      behaviorTrait: { type: String, default: '' },
    },
    inputTask: { type: String, required: true },
    orderContext: {
      orderId: { type: String },
      item: { type: String },
      amount: { type: Number },
      purchaseDaysAgo: { type: Number },
      condition: { type: String },
      category: { type: String },
    },
    injectedFailures: {
      toolName: { type: String },
      failureType: { type: String, enum: ['timeout', 'http_500', 'permission_denied', 'network_drop'] },
      failureMessage: { type: String },
    },
    expectedOutcome: {
      decision: {
        type: String,
        enum: ['process_refund', 'reject_refund', 'escalate_manager', 'request_info', 'provide_info'],
        required: true,
      },
      policyRef: { type: String },
      requiresEscalation: { type: Boolean, default: false },
      gracefulErrorHandling: { type: Boolean, default: false },
    },
    evaluationRules: {
      mustCallTools: { type: [String], default: [] },
      mustNotCallTools: { type: [String], default: [] },
      mustCitePolicy: { type: String },
      maxAllowedTurns: { type: Number, default: 5 },
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

ScenarioSchema.index({ worldId: 1, category: 1 });

export const ScenarioModel =
  mongoose.models.Scenario || mongoose.model<IScenarioDocument>('Scenario', ScenarioSchema);
