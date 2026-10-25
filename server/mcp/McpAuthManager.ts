import crypto from 'crypto';
import type { McpOAuthMetadata, McpOAuthCredentials } from './types.ts';
import { validateSafeMcpUrl } from './ssrfValidator.ts';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const DEFAULT_SECRET_FALLBACK = 'agentlab-mcp-internal-encryption-secret-key-32b';

export class McpAuthManager {
  private encryptionKey: Buffer;

  constructor(secretKey?: string) {
    const rawKey = secretKey || process.env.MCP_ENCRYPTION_SECRET || process.env.JWT_SECRET || DEFAULT_SECRET_FALLBACK;
    this.encryptionKey = crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Discovers OAuth Authorization Server Metadata according to RFC 8414
   */
  public async discoverOAuthMetadata(serverUrl: string): Promise<McpOAuthMetadata | null> {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const discoveryUrls = [
      `${cleanUrl}/.well-known/oauth-authorization-server`,
      `${cleanUrl}/.well-known/openid-configuration`,
    ];

    for (const url of discoveryUrls) {
      try {
        await validateSafeMcpUrl(url);
        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.authorization_endpoint && json.token_endpoint) {
            return {
              issuer: json.issuer,
              authorization_endpoint: json.authorization_endpoint,
              token_endpoint: json.token_endpoint,
              registration_endpoint: json.registration_endpoint,
              jwks_uri: json.jwks_uri,
              scopes_supported: json.scopes_supported || [],
              code_challenge_methods_supported: json.code_challenge_methods_supported || [],
              token_endpoint_auth_methods_supported: json.token_endpoint_auth_methods_supported || [],
              client_id_metadata_document_supported: json.client_id_metadata_document_supported,
            };
          }
        }
      } catch {
        // Try next discovery candidate
      }
    }

    return null;
  }

  /**
   * Dynamic Client Registration according to RFC 7591
   */
  public async registerClient(
    registrationEndpoint: string,
    redirectUri: string,
    clientName = 'AgentLab Universal MCP Client'
  ): Promise<{ clientId: string; clientSecret?: string }> {
    await validateSafeMcpUrl(registrationEndpoint);

    const payload = {
      client_name: clientName,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none', // Public client with PKCE
    };

    const res = await fetch(registrationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Dynamic client registration failed (HTTP ${res.status}): ${errText || res.statusText}. Please supply registered OAuth client credentials.`
      );
    }

    const data = await res.json();
    if (!data.client_id) {
      throw new Error('Registration endpoint did not return a client_id.');
    }

    return {
      clientId: data.client_id,
      clientSecret: data.client_secret,
    };
  }

  /**
   * Generates cryptographically secure PKCE code_verifier and code_challenge (RFC 7636)
   */
  public generatePkce(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Generates authorization URL with PKCE and exact redirect URI
   */
  public buildAuthorizationUrl(options: {
    authorizationEndpoint: string;
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge?: string;
    scopes?: string[];
  }): string {
    const { authorizationEndpoint, clientId, redirectUri, state, codeChallenge, scopes } = options;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });

    if (codeChallenge) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    if (scopes && scopes.length > 0) {
      params.set('scope', scopes.join(' '));
    }

    return `${authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for OAuth tokens
   */
  public async exchangeCodeForTokens(options: {
    tokenEndpoint: string;
    code: string;
    redirectUri: string;
    clientId: string;
    clientSecret?: string;
    codeVerifier?: string;
  }): Promise<McpOAuthCredentials> {
    const { tokenEndpoint, code, redirectUri, clientId, clientSecret, codeVerifier } = options;

    await validateSafeMcpUrl(tokenEndpoint);

    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
    });

    if (codeVerifier) {
      bodyParams.set('code_verifier', codeVerifier);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };

    if (clientSecret) {
      // Basic auth or body auth
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${authHeader}`;
    }

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers,
      body: bodyParams.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Token exchange failed (HTTP ${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    return {
      clientId,
      clientSecret,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope,
    };
  }

  /**
   * Refreshes expired access tokens
   */
  public async refreshAccessToken(options: {
    tokenEndpoint: string;
    refreshToken: string;
    clientId: string;
    clientSecret?: string;
  }): Promise<McpOAuthCredentials> {
    const { tokenEndpoint, refreshToken, clientId, clientSecret } = options;

    await validateSafeMcpUrl(tokenEndpoint);

    const bodyParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };

    if (clientSecret) {
      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${authHeader}`;
    }

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers,
      body: bodyParams.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Token refresh failed (HTTP ${res.status}): ${errText || res.statusText}`);
    }

    const data = await res.json();
    return {
      clientId,
      clientSecret,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      tokenType: data.token_type || 'Bearer',
      scope: data.scope,
    };
  }

  /**
   * AES-256-GCM symmetric encryption for database credential storage
   */
  public encryptCredentials(credentials: Record<string, any>): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    const plaintext = JSON.stringify(credentials);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Pack: iv:authTag:encrypted (hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * AES-256-GCM decryption
   */
  public decryptCredentials<T = Record<string, any>>(encryptedString: string): T {
    try {
      const [ivHex, authTagHex, encryptedHex] = encryptedString.split(':');
      if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Malformed encrypted payload format.');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return JSON.parse(decrypted.toString('utf8'));
    } catch (err: any) {
      throw new Error(`Failed to decrypt credentials: ${err.message}`);
    }
  }
}
