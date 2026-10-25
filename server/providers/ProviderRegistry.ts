import type { IStorageStore } from '../storage/storage.ts';
import type { ProviderConnection } from '../types.ts';
import { LovableMcpClient } from './LovableMcpClient.ts';
import { BoltProviderAdapter } from './BoltProviderAdapter.ts';
import { ReplitProviderAdapter } from './ReplitProviderAdapter.ts';
import { EmergentProviderAdapter } from './EmergentProviderAdapter.ts';

export class ProviderRegistry {
  private storage: IStorageStore;

  constructor(storage: IStorageStore) {
    this.storage = storage;
  }

  /**
   * Returns all available providers with real connection status from database
   */
  public async getProviders(): Promise<ProviderConnection[]> {
    const stored = await this.storage.getProviderConnections();
    const storedMap = new Map(stored.map((p) => [p.provider, p]));

    const lovableStored = storedMap.get('lovable');
    const lovableClient = new LovableMcpClient(lovableStored?.accessToken);
    const discoveredTools = await lovableClient.discoverTools();

    const lovableConn: ProviderConnection = {
      provider: 'lovable',
      name: 'Lovable',
      status: lovableStored?.status || 'disconnected',
      authType: 'oauth',
      accountEmail: lovableStored?.accountEmail,
      accountName: lovableStored?.accountName,
      workspaceId: lovableStored?.workspaceId,
      workspaceName: lovableStored?.workspaceName,
      accessToken: lovableStored?.accessToken,
      refreshToken: lovableStored?.refreshToken,
      serverUrl: LovableMcpClient.SERVER_URL,
      supportedOperations: [
        'Direct Prompt-to-App Generation (Consumes Credits)',
        'Live Task & Agent Build Polling',
        'Official MCP Integration (https://mcp.lovable.dev)',
        'GitHub Export Synchronization',
        'Unified Diff & Code Inspection',
      ],
      discoveredTools,
      directPromptGeneration: true,
      githubExportSupported: true,
      zipImportSupported: true,
      guidanceNotes:
        'Connect your official Lovable account using OAuth. AgentLab will submit your approved benchmark prompt directly to the Lovable MCP server to scaffold, generate, and benchmark the app.',
      lastCheckedAt: new Date().toISOString(),
      updatedAt: lovableStored?.updatedAt || new Date().toISOString(),
    };

    const boltConn = BoltProviderAdapter.getConnectionMetadata(storedMap.get('bolt'));
    const replitConn = ReplitProviderAdapter.getConnectionMetadata(storedMap.get('replit'));
    const emergentConn = EmergentProviderAdapter.getConnectionMetadata(storedMap.get('emergent'));

    return [lovableConn, boltConn, replitConn, emergentConn];
  }

  /**
   * Retrieves single provider details
   */
  public async getProvider(providerId: string): Promise<ProviderConnection | null> {
    const all = await this.getProviders();
    return all.find((p) => p.provider === providerId) || null;
  }

  /**
   * Connects or updates a provider (e.g. after OAuth code exchange or API key config)
   */
  public async connectProvider(
    providerId: string,
    data: {
      accessToken?: string;
      refreshToken?: string;
      accountEmail?: string;
      accountName?: string;
      workspaceId?: string;
      workspaceName?: string;
    }
  ): Promise<ProviderConnection> {
    const existing = await this.getProvider(providerId);
    if (!existing) throw new Error(`Unknown provider: ${providerId}`);

    const updated: ProviderConnection = {
      ...existing,
      status: 'connected',
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accountEmail: data.accountEmail || existing.accountEmail,
      accountName: data.accountName || existing.accountName,
      workspaceId: data.workspaceId || existing.workspaceId,
      workspaceName: data.workspaceName || existing.workspaceName,
      lastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await this.storage.saveProviderConnection(updated);
  }

  /**
   * Disconnects a provider and removes stored tokens
   */
  public async disconnectProvider(providerId: string): Promise<boolean> {
    return await this.storage.deleteProviderConnection(providerId);
  }

  /**
   * Gets Lovable client initialized with stored token
   */
  public async getLovableClient(): Promise<LovableMcpClient> {
    const conn = await this.storage.getProviderConnection('lovable');
    return new LovableMcpClient(conn?.accessToken);
  }
}
