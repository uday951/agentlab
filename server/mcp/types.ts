export type McpTransport = 'streamable_http' | 'sse' | 'stdio';

export type McpAuthType =
  | 'none'
  | 'bearer'
  | 'api_key'
  | 'oauth_dcr'
  | 'oauth_client_credentials';

export type McpConnectionStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

export type McpToolCategory =
  | 'project_creation'
  | 'code_generation'
  | 'code_retrieval'
  | 'execution'
  | 'utility';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  isReadOnly: boolean;
  requiresApproval: boolean;
  isBenchmarkCapable: boolean;
  category: McpToolCategory;
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: Record<string, any>;
}

export interface McpConnectionRecord {
  id: string;
  ownerId: string;
  displayName: string;
  preset?: 'lovable' | 'bolt' | 'replit' | 'emergent' | 'custom';
  serverUrl?: string;
  localCommand?: string;
  localArgs?: string[];
  localEnv?: Record<string, string>;
  localCwd?: string;
  transport: McpTransport;
  authType: McpAuthType;
  encryptedCredentials?: string;
  headers?: Record<string, string>;
  connectionStatus: McpConnectionStatus;
  protocolVersion?: string;
  serverCapabilities?: McpServerCapabilities;
  discoveredTools: McpToolDefinition[];
  discoveredResources: McpResourceDefinition[];
  lastConnectedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface McpOAuthMetadata {
  issuer?: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  jwks_uri?: string;
  scopes_supported?: string[];
  code_challenge_methods_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  client_id_metadata_document_supported?: boolean;
}

export interface McpOAuthCredentials {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  codeVerifier?: string;
  redirectUri?: string;
}

export interface McpBenchmarkJob {
  id: string;
  connectionId: string;
  ownerId: string;
  taskPrompt: string;
  benchmarkCategory: string;
  status:
    | 'pending'
    | 'analyzing_capabilities'
    | 'submitting_task'
    | 'monitoring_generation'
    | 'retrieving_code'
    | 'preparing_sandbox'
    | 'evaluating'
    | 'completed'
    | 'failed';
  mappedTools: {
    creationTool?: string;
    generationTool?: string;
    retrievalTool?: string;
  };
  supportedCapabilities: {
    canCreateProject: boolean;
    canGenerateCode: boolean;
    canRetrieveCode: boolean;
    canExecuteTests: boolean;
  };
  providerProjectId?: string;
  retrievedCodeDir?: string;
  resultProjectId?: string;
  benchmarkRunId?: string;
  overallScore?: number;
  failureReason?: string;
  failureType?: 'auth' | 'quota' | 'unsupported' | 'generation' | 'retrieval' | 'execution' | 'other';
  logs: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
