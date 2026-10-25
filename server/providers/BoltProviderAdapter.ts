import type { ProviderConnection } from '../types.ts';

export class BoltProviderAdapter {
  public static readonly PROVIDER_ID = 'bolt';
  public static readonly PROVIDER_NAME = 'Bolt.new';

  public static getConnectionMetadata(stored?: Partial<ProviderConnection>): ProviderConnection {
    return {
      provider: 'bolt',
      name: BoltProviderAdapter.PROVIDER_NAME,
      status: stored?.status || 'needs_configuration',
      authType: 'unsupported_direct',
      supportedOperations: [
        'StackBlitz GitHub Repository Sync',
        'ZIP Project Archive Download & Import',
        'WebContainer Code Inspection',
      ],
      discoveredTools: [
        {
          name: 'export_to_github',
          description: 'Exports generated StackBlitz Bolt application to a GitHub repository.',
        },
        {
          name: 'download_zip',
          description: 'Downloads full application source code as a ZIP archive.',
        },
      ],
      directPromptGeneration: false,
      githubExportSupported: true,
      zipImportSupported: true,
      guidanceNotes:
        'StackBlitz Bolt.new does not offer a public external prompt-execution API for third-party benchmarking. To evaluate a Bolt.new application, use the "Connect to GitHub" button inside Bolt or download the project ZIP, and import it into AgentLab.',
      lastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
