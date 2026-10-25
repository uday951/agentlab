import type { ProviderConnection } from '../types.ts';

export class ReplitProviderAdapter {
  public static readonly PROVIDER_ID = 'replit';
  public static readonly PROVIDER_NAME = 'Replit Agent';

  public static getConnectionMetadata(stored?: Partial<ProviderConnection>): ProviderConnection {
    return {
      provider: 'replit',
      name: ReplitProviderAdapter.PROVIDER_NAME,
      status: stored?.status || 'needs_configuration',
      authType: 'api_key',
      supportedOperations: [
        'Replit Git Repository Synchronization',
        'Repl ZIP / Archive Export',
        'Nix Environment & Manifest Detection (.replit, replit.nix)',
      ],
      discoveredTools: [
        {
          name: 'git_sync',
          description: 'Synchronizes Replit Repl workspace to an authorized GitHub repository.',
        },
        {
          name: 'export_repl',
          description: 'Downloads workspace source code and configurations as an archive.',
        },
      ],
      directPromptGeneration: false,
      githubExportSupported: true,
      zipImportSupported: true,
      guidanceNotes:
        'Replit Agent codebases are maintained within isolated Repls. Export the Repl to an authorized GitHub repository using Replit Git Sync, or upload the exported archive to run real 5-pillar evaluations in AgentLab.',
      lastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
