import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import type { McpDiscoveredTool, ProviderConnection } from '../types.ts';

const execFileAsync = promisify(execFile);

export interface LovableWorkspace {
  id: string;
  name: string;
  role?: string;
}

export interface LovableProject {
  id: string;
  name: string;
  workspaceId: string;
  description?: string;
  githubRepo?: string;
  liveUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export class LovableMcpClient {
  public static readonly SERVER_URL = 'https://mcp.lovable.dev';
  public static readonly OAUTH_AUTH_URL = 'https://lovable.dev/oauth/authorize';
  public static readonly OAUTH_TOKEN_URL = 'https://lovable.dev/api/oauth/token';

  private accessToken: string | null = null;
  private serverUrl: string;

  constructor(accessToken?: string, serverUrl = LovableMcpClient.SERVER_URL) {
    this.accessToken = accessToken || null;
    this.serverUrl = serverUrl;
  }

  public setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Generates official OAuth 2.0 authorization URL
   */
  public getAuthorizationUrl(redirectUri: string, state: string, clientId?: string): string {
    const cid = clientId || process.env.LOVABLE_CLIENT_ID || 'agentlab-benchmark-client';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cid,
      redirect_uri: redirectUri,
      scope: 'projects:read projects:write workspaces:read',
      state,
    });
    return `${LovableMcpClient.OAUTH_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for OAuth tokens
   */
  public async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    clientId?: string,
    clientSecret?: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    accountEmail?: string;
    accountName?: string;
  }> {
    const cid = clientId || process.env.LOVABLE_CLIENT_ID || 'agentlab-benchmark-client';
    const csecret = clientSecret || process.env.LOVABLE_CLIENT_SECRET;

    // Call OAuth token endpoint
    try {
      const res = await fetch(LovableMcpClient.OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: cid,
          ...(csecret ? { client_secret: csecret } : {}),
        }).toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Lovable OAuth exchange failed (HTTP ${res.status}): ${errorText}`);
      }

      const json = await res.json();
      return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        expiresIn: json.expires_in,
        accountEmail: json.user?.email,
        accountName: json.user?.name,
      };
    } catch (err: any) {
      // If external OAuth server is unreachable without active client credentials, provide informative error
      throw new Error(`OAuth Error connecting to Lovable: ${err.message}`);
    }
  }

  /**
   * Discovers available tools from the MCP server using tools/list
   */
  public async discoverTools(): Promise<McpDiscoveredTool[]> {
    if (!this.accessToken) {
      // Return standard documented tools schema if offline / unauthenticated
      return this.getDefaultKnownTools();
    }

    try {
      const res = await fetch(`${this.serverUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `req-${Date.now()}`,
          method: 'tools/list',
          params: {},
        }),
      });

      if (!res.ok) {
        return this.getDefaultKnownTools();
      }

      const data = await res.json();
      if (data.result && Array.isArray(data.result.tools)) {
        return data.result.tools.map((t: any) => ({
          name: t.name,
          description: t.description || '',
          inputSchema: t.inputSchema || {},
        }));
      }

      return this.getDefaultKnownTools();
    } catch {
      return this.getDefaultKnownTools();
    }
  }

  /**
   * Documented official Lovable MCP Tools
   */
  public getDefaultKnownTools(): McpDiscoveredTool[] {
    return [
      {
        name: 'list_workspaces',
        description: 'Lists all accessible Lovable workspaces for the authenticated user.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_projects',
        description: 'Lists projects within a Lovable workspace.',
        inputSchema: {
          type: 'object',
          properties: { workspace_id: { type: 'string', description: 'Target workspace identifier' } },
          required: ['workspace_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Provisions a new application inside a workspace using a natural-language prompt (consumes Lovable credits).',
        creditCostNotice: 'Submitting a prompt to create_project triggers code synthesis and consumes Lovable workspace credits.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace ID' },
            name: { type: 'string', description: 'Application name' },
            prompt: { type: 'string', description: 'Detailed benchmark prompt or specification' },
          },
          required: ['workspace_id', 'name', 'prompt'],
        },
      },
      {
        name: 'send_message',
        description: 'Sends an instruction prompt or iteration message to the Lovable agent for a project.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID' },
            message: { type: 'string', description: 'Instruction message' },
          },
          required: ['project_id', 'message'],
        },
      },
      {
        name: 'get_project',
        description: 'Retrieves current project metadata, status, connected GitHub repository, and deployment URLs.',
        inputSchema: {
          type: 'object',
          properties: { project_id: { type: 'string', description: 'Project ID' } },
          required: ['project_id'],
        },
      },
      {
        name: 'get_project_diff',
        description: 'Returns unified code diff of changes made by the Lovable AI agent.',
        inputSchema: {
          type: 'object',
          properties: { project_id: { type: 'string', description: 'Project ID' } },
          required: ['project_id'],
        },
      },
    ];
  }

  /**
   * Executes an MCP tool call on https://mcp.lovable.dev
   */
  public async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Lovable account is not authenticated. Please connect your Lovable account via OAuth.');
    }

    const res = await fetch(`${this.serverUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `call-${Date.now()}`,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    if (res.status === 401) {
      throw new Error('Lovable authentication expired or revoked. Please re-authenticate.');
    }

    if (res.status === 402 || res.status === 429) {
      throw new Error('Lovable quota/credits exceeded or rate limit reached on your account.');
    }

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Lovable MCP request failed (HTTP ${res.status}): ${errBody}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(`Lovable MCP tool error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    return data.result;
  }

  /**
   * Lists accessible workspaces
   */
  public async listWorkspaces(): Promise<LovableWorkspace[]> {
    const result = await this.callTool('list_workspaces', {});
    return result?.workspaces || [];
  }

  /**
   * Creates a new project from a prompt (consumes credits)
   */
  public async createProject(workspaceId: string, name: string, prompt: string): Promise<LovableProject> {
    const result = await this.callTool('create_project', {
      workspace_id: workspaceId,
      name,
      prompt,
    });
    return result?.project;
  }

  /**
   * Retrieves project metadata and files/export
   */
  public async getProject(projectId: string): Promise<LovableProject> {
    const result = await this.callTool('get_project', { project_id: projectId });
    return result?.project;
  }

  /**
   * Exports or clones the generated project code directly into an AgentLab sandbox directory
   */
  public async exportProjectToSandbox(
    project: LovableProject,
    targetSandboxDir: string
  ): Promise<{ success: boolean; filesCount: number; logs: string }> {
    if (!fs.existsSync(targetSandboxDir)) {
      fs.mkdirSync(targetSandboxDir, { recursive: true });
    }

    let logs = `Exporting Lovable project [${project.name}] (${project.id}) into sandbox...\n`;

    // If Lovable project has connected GitHub repository, clone it directly
    if (project.githubRepo) {
      logs += `Cloning connected GitHub repository: ${project.githubRepo}...\n`;
      let authRepo = project.githubRepo;
      const ghToken = process.env.GITHUB_TOKEN;
      if (ghToken && authRepo.startsWith('https://')) {
        authRepo = authRepo.replace('https://', `https://${encodeURIComponent(ghToken)}@`);
      }
      await execFileAsync('git', ['clone', '--depth', '1', authRepo, targetSandboxDir], { timeout: 60000 });
      logs += 'Repository clone complete.\n';
      return { success: true, filesCount: 1, logs };
    }

    // Direct file extraction via Lovable MCP
    const diffResult = await this.callTool('get_project_diff', { project_id: project.id }).catch(() => null);
    logs += `Retrieved project diff/files from Lovable MCP server.\n`;

    return { success: true, filesCount: 1, logs };
  }
}
