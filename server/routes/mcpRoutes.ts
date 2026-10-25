import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import type { IStorageStore } from '../storage/storage.ts';
import type {
  McpConnectionRecord,
  McpBenchmarkJob,
  McpTransport,
  McpAuthType,
} from '../mcp/types.ts';
import { validateSafeMcpUrl, SsrfError } from '../mcp/ssrfValidator.ts';
import { McpAuthManager } from '../mcp/McpAuthManager.ts';
import { UniversalMcpClient } from '../mcp/UniversalMcpClient.ts';
import { McpBenchmarkOrchestrator } from '../mcp/McpBenchmarkOrchestrator.ts';

// In-memory PKCE state session cache (state -> oauth context)
const pkceSessionStore = new Map<
  string,
  {
    codeVerifier: string;
    clientId: string;
    clientSecret?: string;
    tokenEndpoint: string;
    serverUrl: string;
    redirectUri: string;
    displayName: string;
    preset?: any;
    ownerId: string;
    createdAt: number;
  }
>();

// Clean up old PKCE states every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pkceSessionStore.entries()) {
    if (now - v.createdAt > 15 * 60 * 1000) {
      pkceSessionStore.delete(k);
    }
  }
}, 5 * 60 * 1000);

export function createMcpRouter(storage: IStorageStore): Router {
  const router = Router();
  const authManager = new McpAuthManager();
  const orchestrator = new McpBenchmarkOrchestrator(storage);

  // Helper to sanitize connection credentials before sending to client
  const sanitizeConnection = (conn: McpConnectionRecord): Partial<McpConnectionRecord> => {
    const { encryptedCredentials, headers, ...rest } = conn;
    return {
      ...rest,
      // Report whether credentials are saved without exposing any secret bytes
      hasCredentials: !!encryptedCredentials,
    } as any;
  };

  // ==========================================
  // 1. List MCP Connections
  // ==========================================
  router.get('/connections', async (req: Request, res: Response) => {
    try {
      const ownerId = (req.query.ownerId as string) || 'default-owner';
      const connections = await storage.getMcpConnections(ownerId);
      res.json({ success: true, connections: connections.map(sanitizeConnection) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 2. Discover Capabilities & Auth on a Target URL
  // ==========================================
  router.post('/discover', async (req: Request, res: Response) => {
    try {
      const { serverUrl, transport = 'streamable_http' } = req.body;

      if (!serverUrl || typeof serverUrl !== 'string') {
        return res.status(400).json({ success: false, error: 'serverUrl is required for discovery.' });
      }

      // SSRF Validation
      try {
        await validateSafeMcpUrl(serverUrl);
      } catch (ssrfErr: any) {
        return res.status(400).json({
          success: false,
          error: `Security Validation Failed: ${ssrfErr.message}`,
          code: 'SSRF_BLOCKED',
        });
      }

      // Check OAuth Discovery (RFC 8414)
      const oauthMetadata = await authManager.discoverOAuthMetadata(serverUrl);

      const supportedAuth: McpAuthType[] = ['bearer', 'api_key'];
      let dynamicRegistrationSupported = false;

      if (oauthMetadata) {
        if (oauthMetadata.registration_endpoint) {
          dynamicRegistrationSupported = true;
          supportedAuth.unshift('oauth_dcr');
        }
        supportedAuth.unshift('oauth_client_credentials');
      }

      // Check if unauthenticated initialize works
      let publicAccess = false;
      try {
        const client = new UniversalMcpClient({ transport, serverUrl, timeoutMs: 4000 });
        const initRes = await client.initialize();
        if (initRes) publicAccess = true;
      } catch {
        publicAccess = false;
      }

      if (publicAccess) supportedAuth.push('none');

      res.json({
        success: true,
        serverUrl,
        supportedAuth,
        oauthMetadata,
        dynamicRegistrationSupported,
        publicAccess,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 3. Connect MCP Server (Handshake & Tool Discovery)
  // ==========================================
  router.post('/connect', async (req: Request, res: Response) => {
    try {
      const {
        displayName,
        preset = 'custom',
        transport = 'streamable_http',
        serverUrl,
        localCommand,
        localArgs = [],
        localEnv = {},
        localCwd,
        authType = 'none',
        bearerToken,
        apiKey,
        headers = {},
        ownerId = 'default-owner',
      } = req.body;

      if (!displayName) {
        return res.status(400).json({ success: false, error: 'displayName is required.' });
      }

      if (transport !== 'stdio' && !serverUrl) {
        return res.status(400).json({ success: false, error: 'serverUrl is required for remote MCP transports.' });
      }

      if (transport === 'stdio' && !localCommand) {
        return res.status(400).json({ success: false, error: 'localCommand is required for stdio transport.' });
      }

      // SSRF check for remote
      if (serverUrl) {
        try {
          await validateSafeMcpUrl(serverUrl);
        } catch (ssrfErr: any) {
          return res.status(400).json({
            success: false,
            error: `Security Validation Failed: ${ssrfErr.message}`,
            code: 'SSRF_BLOCKED',
          });
        }
      }

      // Encrypt credentials before saving
      let encryptedCredentials: string | undefined;
      const credsToEncrypt: Record<string, any> = {};
      if (bearerToken) credsToEncrypt.bearerToken = bearerToken;
      if (apiKey) credsToEncrypt.apiKey = apiKey;

      if (Object.keys(credsToEncrypt).length > 0) {
        encryptedCredentials = authManager.encryptCredentials(credsToEncrypt);
      }

      // Initialize Universal Client & Verify Handshake
      const client = new UniversalMcpClient({
        transport,
        serverUrl,
        localCommand,
        localArgs,
        localEnv,
        localCwd,
        bearerToken,
        apiKey,
        headers,
      });

      let initResult;
      try {
        initResult = await client.initialize();
      } catch (handshakeErr: any) {
        client.close();
        return res.status(400).json({
          success: false,
          error: `MCP Handshake Failed: ${handshakeErr.message}. Verify that the server is running and credentials are valid.`,
          code: 'HANDSHAKE_FAILED',
        });
      }

      // Discover Tools and Resources
      const discoveredTools = await client.listTools();
      const discoveredResources = await client.listResources();
      client.close();

      const connectionId = `mcp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      const record: McpConnectionRecord = {
        id: connectionId,
        ownerId,
        displayName: displayName.trim(),
        preset,
        serverUrl: serverUrl?.trim(),
        localCommand,
        localArgs,
        localEnv,
        localCwd,
        transport,
        authType,
        encryptedCredentials,
        headers,
        connectionStatus: 'connected',
        protocolVersion: initResult.protocolVersion,
        serverCapabilities: initResult.capabilities,
        discoveredTools,
        discoveredResources,
        lastConnectedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saved = await storage.saveMcpConnection(record);
      res.json({ success: true, connection: sanitizeConnection(saved) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 4. Get Connection Details
  // ==========================================
  router.get('/connections/:id', async (req: Request, res: Response) => {
    try {
      const conn = await storage.getMcpConnection(req.params.id);
      if (!conn) return res.status(404).json({ success: false, error: 'Connection not found.' });
      res.json({ success: true, connection: sanitizeConnection(conn) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 5. Reconnect / Refresh Handshake & Tools
  // ==========================================
  router.post('/connections/:id/reconnect', async (req: Request, res: Response) => {
    try {
      const conn = await storage.getMcpConnection(req.params.id);
      if (!conn) return res.status(404).json({ success: false, error: 'Connection not found.' });

      let bearerToken: string | undefined;
      let apiKey: string | undefined;

      if (conn.encryptedCredentials) {
        try {
          const creds = authManager.decryptCredentials<any>(conn.encryptedCredentials);
          bearerToken = creds.accessToken || creds.bearerToken;
          apiKey = creds.apiKey;
        } catch {
          // Keep existing
        }
      }

      const client = new UniversalMcpClient({
        transport: conn.transport,
        serverUrl: conn.serverUrl,
        localCommand: conn.localCommand,
        localArgs: conn.localArgs,
        localEnv: conn.localEnv,
        localCwd: conn.localCwd,
        bearerToken,
        apiKey,
        headers: conn.headers,
      });

      try {
        const initResult = await client.initialize();
        const tools = await client.listTools();
        const resources = await client.listResources();
        client.close();

        conn.connectionStatus = 'connected';
        conn.protocolVersion = initResult.protocolVersion;
        conn.serverCapabilities = initResult.capabilities;
        conn.discoveredTools = tools;
        conn.discoveredResources = resources;
        conn.lastConnectedAt = new Date().toISOString();
        conn.lastError = undefined;

        const updated = await storage.saveMcpConnection(conn);
        res.json({ success: true, connection: sanitizeConnection(updated) });
      } catch (err: any) {
        client.close();
        conn.connectionStatus = 'error';
        conn.lastError = err.message;
        await storage.saveMcpConnection(conn);
        res.status(400).json({ success: false, error: `Reconnection failed: ${err.message}` });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 6. Disconnect MCP Server
  // ==========================================
  router.post('/connections/:id/disconnect', async (req: Request, res: Response) => {
    try {
      const conn = await storage.getMcpConnection(req.params.id);
      if (!conn) return res.status(404).json({ success: false, error: 'Connection not found.' });

      conn.connectionStatus = 'disconnected';
      const updated = await storage.saveMcpConnection(conn);
      res.json({ success: true, connection: sanitizeConnection(updated) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 7. Delete MCP Connection & Credentials
  // ==========================================
  router.delete('/connections/:id', async (req: Request, res: Response) => {
    try {
      await storage.deleteMcpConnection(req.params.id);
      res.json({ success: true, message: 'Connection and credentials permanently deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 8. Safe Tool Invocation Explorer
  // ==========================================
  router.post('/connections/:id/tools/call', async (req: Request, res: Response) => {
    try {
      const { toolName, arguments: toolArgs = {}, approvalConfirmed = false } = req.body;
      const conn = await storage.getMcpConnection(req.params.id);
      if (!conn) return res.status(404).json({ success: false, error: 'Connection not found.' });

      const tool = conn.discoveredTools.find((t) => t.name === toolName);
      if (!tool) {
        return res.status(404).json({ success: false, error: `Tool "${toolName}" was not discovered on this server.` });
      }

      // Safety Approval Gate
      if (tool.requiresApproval && !approvalConfirmed) {
        return res.status(403).json({
          success: false,
          requiresApproval: true,
          message: `Tool [${toolName}] modifies external state, creates projects, or may consume credits. Explicit confirmation is required.`,
        });
      }

      let bearerToken: string | undefined;
      let apiKey: string | undefined;
      if (conn.encryptedCredentials) {
        const creds = authManager.decryptCredentials<any>(conn.encryptedCredentials);
        bearerToken = creds.accessToken || creds.bearerToken;
        apiKey = creds.apiKey;
      }

      const client = new UniversalMcpClient({
        transport: conn.transport,
        serverUrl: conn.serverUrl,
        localCommand: conn.localCommand,
        localArgs: conn.localArgs,
        localEnv: conn.localEnv,
        localCwd: conn.localCwd,
        bearerToken,
        apiKey,
        headers: conn.headers,
      });

      await client.initialize();
      const result = await client.callTool(toolName, toolArgs);
      client.close();

      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 9. Standards-Based OAuth Flow (with DCR & PKCE)
  // ==========================================
  router.get('/oauth/authorize', async (req: Request, res: Response) => {
    try {
      const {
        serverUrl = 'https://mcp.lovable.dev',
        displayName = 'Lovable Platform',
        preset = 'lovable',
        ownerId = 'default-owner',
      } = req.query as Record<string, string>;

      let clientId = req.query.clientId as string | undefined;
      let clientSecret = req.query.clientSecret as string | undefined;

      // 1. Validate URL against SSRF
      await validateSafeMcpUrl(serverUrl);

      // 2. Discover OAuth Authorization Server Metadata (RFC 8414)
      const metadata = await authManager.discoverOAuthMetadata(serverUrl);
      if (!metadata || !metadata.authorization_endpoint || !metadata.token_endpoint) {
        return res.status(400).json({
          success: false,
          error: `OAuth discovery failed for "${serverUrl}". Ensure the server hosts a valid RFC 8414 /.well-known/oauth-authorization-server document.`,
          code: 'OAUTH_DISCOVERY_FAILED',
        });
      }

      // Compute exact redirect URI
      const redirectUri = `${req.protocol}://${req.get('host')}/api/mcp/oauth/callback`;

      // 3. Dynamic Client Registration (RFC 7591) if client ID is missing
      if (!clientId) {
        if (metadata.registration_endpoint) {
          try {
            const regResult = await authManager.registerClient(
              metadata.registration_endpoint,
              redirectUri,
              'AgentLab Universal MCP Client'
            );
            clientId = regResult.clientId;
            if (regResult.clientSecret) clientSecret = regResult.clientSecret;
          } catch (regErr: any) {
            return res.status(400).json({
              success: false,
              error: `Dynamic client registration failed: ${regErr.message}. Please register a client on ${metadata.issuer || serverUrl} and provide your OAuth Client ID manually.`,
              code: 'DCR_FAILED',
            });
          }
        } else {
          // Server requires manual registered client credentials!
          return res.status(400).json({
            success: false,
            error: `Server at "${serverUrl}" does not support RFC 7591 Dynamic Client Registration. OAuth Client ID is required. Please supply your registered OAuth client credentials.`,
            code: 'CLIENT_ID_REQUIRED',
          });
        }
      }

      // 4. Generate PKCE code_verifier and code_challenge (RFC 7636)
      const { codeVerifier, codeChallenge } = authManager.generatePkce();

      // State token for CSRF protection
      const state = `state-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

      // Save PKCE session
      pkceSessionStore.set(state, {
        codeVerifier,
        clientId,
        clientSecret,
        tokenEndpoint: metadata.token_endpoint,
        serverUrl,
        redirectUri,
        displayName,
        preset,
        ownerId,
        createdAt: Date.now(),
      });

      // Filter to approved scopes
      const scopes = metadata.scopes_supported && metadata.scopes_supported.length > 0
        ? metadata.scopes_supported.filter((s) => !['openid', 'profile', 'email'].includes(s) || s === 'offline')
        : ['projects:read', 'projects:write', 'workspaces:read'];

      const authUrl = authManager.buildAuthorizationUrl({
        authorizationEndpoint: metadata.authorization_endpoint,
        clientId,
        redirectUri,
        state,
        codeChallenge,
        scopes,
      });

      // Return authUrl to client or redirect
      if (req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, authUrl, state, redirectUri });
      }

      res.redirect(authUrl);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 10. OAuth Callback Handler
  // ==========================================
  router.get('/oauth/callback', async (req: Request, res: Response) => {
    try {
      const { code, state, error: oauthErr, error_description } = req.query as Record<string, string>;

      if (oauthErr) {
        return res.redirect(`/?tab=benchmarks&mcp_error=${encodeURIComponent(error_description || oauthErr)}`);
      }

      if (!code || !state) {
        return res.redirect('/?tab=benchmarks&mcp_error=Missing+authorization+code+or+state');
      }

      const session = pkceSessionStore.get(state);
      if (!session) {
        return res.redirect('/?tab=benchmarks&mcp_error=Invalid+or+expired+OAuth+state+token');
      }
      pkceSessionStore.delete(state);

      // Exchange code + PKCE code_verifier for tokens
      let tokens;
      try {
        tokens = await authManager.exchangeCodeForTokens({
          tokenEndpoint: session.tokenEndpoint,
          code,
          redirectUri: session.redirectUri,
          clientId: session.clientId,
          clientSecret: session.clientSecret,
          codeVerifier: session.codeVerifier,
        });
      } catch (exchangeErr: any) {
        return res.redirect(`/?tab=benchmarks&mcp_error=${encodeURIComponent(exchangeErr.message)}`);
      }

      if (!tokens.accessToken) {
        return res.redirect('/?tab=benchmarks&mcp_error=No+access_token+returned+by+token+endpoint');
      }

      // Handshake and discover tools using access token
      const client = new UniversalMcpClient({
        transport: 'streamable_http',
        serverUrl: session.serverUrl,
        bearerToken: tokens.accessToken,
      });

      const initResult = await client.initialize();
      const discoveredTools = await client.listTools();
      const discoveredResources = await client.listResources();
      client.close();

      const connectionId = `mcp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const encryptedCredentials = authManager.encryptCredentials({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        clientId: session.clientId,
        clientSecret: session.clientSecret,
        tokenEndpoint: session.tokenEndpoint,
      });

      const record: McpConnectionRecord = {
        id: connectionId,
        ownerId: session.ownerId,
        displayName: session.displayName,
        preset: session.preset,
        serverUrl: session.serverUrl,
        transport: 'streamable_http',
        authType: 'oauth_dcr',
        encryptedCredentials,
        connectionStatus: 'connected',
        protocolVersion: initResult.protocolVersion,
        serverCapabilities: initResult.capabilities,
        discoveredTools,
        discoveredResources,
        lastConnectedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await storage.saveMcpConnection(record);
      res.redirect(`/?tab=benchmarks&mcp_connected=${encodeURIComponent(connectionId)}`);
    } catch (err: any) {
      res.redirect(`/?tab=benchmarks&mcp_error=${encodeURIComponent(err.message)}`);
    }
  });

  // ==========================================
  // 11. Run Benchmark against Connected MCP Server
  // ==========================================
  router.post('/benchmark', async (req: Request, res: Response) => {
    try {
      const {
        connectionId,
        prompt,
        benchmarkCategory = 'auto',
        ownerId = 'default-owner',
      } = req.body;

      if (!connectionId) {
        return res.status(400).json({ success: false, error: 'connectionId is required.' });
      }

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ success: false, error: 'Benchmark prompt is required.' });
      }

      const connection = await storage.getMcpConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ success: false, error: 'MCP Connection not found.' });
      }

      const jobId = `mcp-job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      const job: McpBenchmarkJob = {
        id: jobId,
        connectionId,
        ownerId,
        taskPrompt: prompt.trim(),
        benchmarkCategory,
        status: 'pending',
        mappedTools: {},
        supportedCapabilities: {
          canCreateProject: false,
          canGenerateCode: false,
          canRetrieveCode: false,
          canExecuteTests: false,
        },
        logs: [
          `[${new Date().toISOString()}] MCP Benchmark initialized for server "${connection.displayName}".`,
          `Transport: ${connection.transport} | Auth: ${connection.authType}`,
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await storage.saveMcpBenchmarkJob(job);

      // Execute asynchronously
      orchestrator.executeBenchmark(job, connection).catch((e) => {
        console.error('Async MCP benchmark error:', e);
      });

      res.json({ success: true, job });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 12. Get Benchmark Job Status
  // ==========================================
  router.get('/benchmark/:jobId', async (req: Request, res: Response) => {
    try {
      const job = await storage.getMcpBenchmarkJob(req.params.jobId);
      if (!job) return res.status(404).json({ success: false, error: 'Benchmark job not found.' });
      res.json({ success: true, job });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
