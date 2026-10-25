import mongoose, { Schema, type Document } from 'mongoose';
import type { ProviderConnection } from '../types.ts';

export interface IProviderConnectionDocument extends ProviderConnection, Document {}

const McpDiscoveredToolSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    inputSchema: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const ProviderConnectionSchema = new Schema<IProviderConnectionDocument>(
  {
    provider: {
      type: String,
      enum: ['lovable', 'bolt', 'replit', 'emergent'],
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'expired', 'needs_configuration'],
      default: 'disconnected',
      index: true,
    },
    authType: {
      type: String,
      enum: ['oauth', 'api_key', 'unsupported_direct'],
      default: 'oauth',
    },
    accountEmail: { type: String },
    accountName: { type: String },
    workspaceId: { type: String },
    workspaceName: { type: String },
    serverUrl: { type: String },
    accessToken: { type: String }, // Server-side only
    refreshToken: { type: String }, // Server-side only
    tokenExpiresAt: { type: String },
    supportedOperations: { type: [String], default: [] },
    discoveredTools: { type: [McpDiscoveredToolSchema], default: [] },
    directPromptGeneration: { type: Boolean, default: false },
    githubExportSupported: { type: Boolean, default: true },
    zipImportSupported: { type: Boolean, default: true },
    guidanceNotes: { type: String },
    lastCheckedAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    collection: 'provider_connections',
  }
);

export const ProviderConnectionModel =
  mongoose.models.ProviderConnection ||
  mongoose.model<IProviderConnectionDocument>('ProviderConnection', ProviderConnectionSchema);
