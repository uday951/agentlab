import mongoose, { Schema, type Document } from 'mongoose';

export interface IExecutionEventDocument extends Document {
  id: string;
  experimentId: string;
  scenarioId: string;
  step: number;
  timestamp: Date;
  actionType:
    | 'task_received'
    | 'rag_retrieval'
    | 'tool_call'
    | 'tool_result'
    | 'agent_decision'
    | 'policy_check'
    | 'failure_injected'
    | 'evaluation'
    | 'agent_thought'
    | 'error';
  inputSummary: string;
  outputSummary: string;
  status: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
  createdAt: Date;
}

export const ExecutionEventSchema = new Schema<IExecutionEventDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    experimentId: { type: String, required: true, index: true },
    scenarioId: { type: String, required: true, index: true },
    step: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    actionType: {
      type: String,
      enum: [
        'task_received',
        'rag_retrieval',
        'tool_call',
        'tool_result',
        'agent_decision',
        'policy_check',
        'failure_injected',
        'evaluation',
        'agent_thought',
        'error',
      ],
      required: true,
      index: true,
    },
    inputSummary: { type: String, required: true },
    outputSummary: { type: String, required: true },
    status: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
      index: true,
    },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

ExecutionEventSchema.index({ experimentId: 1, step: 1 });
ExecutionEventSchema.index({ experimentId: 1, scenarioId: 1 });

export const ExecutionEventModel =
  mongoose.models.ExecutionEvent ||
  mongoose.model<IExecutionEventDocument>('ExecutionEvent', ExecutionEventSchema);
