import mongoose, { Schema, Document } from 'mongoose';
import type { McpConnectionRecord } from '../mcp/types.ts';

export interface IMcpConnectionDocument extends Document, Omit<McpConnectionRecord, 'id'> {}

const McpConnectionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true, index: true, default: 'default-owner' },
    displayName: { type: String, required: true },
    preset: { type: String },
    serverUrl: { type: String },
    localCommand: { type: String },
    localArgs: { type: [String], default: [] },
    localEnv: { type: Schema.Types.Mixed, default: {} },
    localCwd: { type: String },
    transport: { type: String, required: true, default: 'streamable_http' },
    authType: { type: String, required: true, default: 'none' },
    encryptedCredentials: { type: String },
    headers: { type: Schema.Types.Mixed, default: {} },
    connectionStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'connecting'],
      default: 'disconnected',
    },
    protocolVersion: { type: String },
    serverCapabilities: { type: Schema.Types.Mixed, default: {} },
    discoveredTools: { type: Schema.Types.Mixed, default: [] },
    discoveredResources: { type: Schema.Types.Mixed, default: [] },
    lastConnectedAt: { type: String },
    lastError: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
    minimize: false,
  }
);

export const McpConnectionModel =
  mongoose.models.McpConnection ||
  mongoose.model<IMcpConnectionDocument>('McpConnection', McpConnectionSchema);
