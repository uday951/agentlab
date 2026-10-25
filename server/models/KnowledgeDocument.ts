import mongoose, { Schema, type Document } from 'mongoose';

export interface IChunk {
  chunkId: string;
  section: string;
  text: string;
  tokenCount?: number;
}

export interface IKnowledgeDocument extends Document {
  id: string;
  worldId: string;
  title: string;
  category: string;
  content: string;
  chunks: IChunk[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ChunkSchema = new Schema<IChunk>(
  {
    chunkId: { type: String, required: true },
    section: { type: String, required: true },
    text: { type: String, required: true },
    tokenCount: { type: Number },
  },
  { _id: false }
);

const KnowledgeDocumentSchema = new Schema<IKnowledgeDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    worldId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, index: true },
    content: { type: String, required: true },
    chunks: { type: [ChunkSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
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

KnowledgeDocumentSchema.index({ worldId: 1, category: 1 });

export const KnowledgeDocumentModel =
  mongoose.models.KnowledgeDocument ||
  mongoose.model<IKnowledgeDocument>('KnowledgeDocument', KnowledgeDocumentSchema);
