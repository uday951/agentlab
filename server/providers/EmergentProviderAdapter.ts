import type { ProviderConnection } from '../types.ts';

export class EmergentProviderAdapter {
  public static readonly PROVIDER_ID = 'emergent';
  public static readonly PROVIDER_NAME = 'Emergent';

  public static getConnectionMetadata(stored?: Partial<ProviderConnection>): ProviderConnection {
    return {
      provider: 'emergent',
      name: EmergentProviderAdapter.PROVIDER_NAME,
      status: stored?.status || 'needs_configuration',
      authType: 'api_key',
      supportedOperations: [
        'GitHub Repository Import',
        'ZIP Archive Import',
        'Emergent Codebase Structural Evaluation',
      ],
      discoveredTools: [
        {
          name: 'github_import',
          description: 'Imports Emergent-generated repository from GitHub.',
        },
        {
          name: 'zip_import',
          description: 'Extracts and evaluates uploaded Emergent project ZIP files.',
        },
      ],
      directPromptGeneration: false,
      githubExportSupported: true,
      zipImportSupported: true,
      guidanceNotes:
        'Emergent applications can be exported directly to a GitHub repository or packaged into a ZIP archive for execution and benchmarking within AgentLab.',
      lastCheckedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
