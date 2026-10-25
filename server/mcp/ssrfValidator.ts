import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const lookupAsync = promisify(dns.lookup);

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfError';
  }
}

/**
 * Validates whether an IP address belongs to private, loopback, link-local,
 * cloud metadata, or reserved ranges.
 */
export function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return false;

  // IPv4 Checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    const [p0, p1] = parts;

    // 0.0.0.0/8 (Current network)
    if (p0 === 0) return true;

    // 10.0.0.0/8 (Private)
    if (p0 === 10) return true;

    // 127.0.0.0/8 (Loopback / Localhost)
    if (p0 === 127) return true;

    // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Metadata 169.254.169.254)
    if (p0 === 169 && p1 === 254) return true;

    // 172.16.0.0/12 (Private)
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;

    // 192.168.0.0/16 (Private)
    if (p0 === 192 && p1 === 168) return true;

    // 100.64.0.0/10 (Carrier-grade NAT)
    if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;

    // 255.255.255.255 (Broadcast)
    if (ip === '255.255.255.255') return true;

    return false;
  }

  // IPv6 Checks
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    // ::1 (Loopback)
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    // :: (Unspecified)
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
    // fe80::/10 (Link-local)
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
      return true;
    }
    // fc00::/7 (Unique local)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (normalized.startsWith('::ffff:')) {
      const v4part = normalized.replace('::ffff:', '');
      return isPrivateIp(v4part);
    }
    return false;
  }

  return false;
}

/**
 * Validates a target MCP server URL against SSRF and private-network access risks.
 * Resolves the hostname via DNS and checks the resolved IP addresses.
 */
export async function validateSafeMcpUrl(
  targetUrl: string,
  allowLoopback = process.env.ALLOW_LOCAL_MCP_TESTING === 'true'
): Promise<{ safe: boolean; resolvedIp?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new SsrfError(`Invalid URL format: "${targetUrl}"`);
  }

  // Protocol validation: Only HTTP and HTTPS are permitted for remote MCP
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfError(`Protocol "${parsed.protocol}" is not supported. Remote MCP servers must use http: or https:.`);
  }

  const hostname = parsed.hostname;

  // Direct IP literal validation
  if (net.isIP(hostname)) {
    if (allowLoopback && (hostname === '127.0.0.1' || hostname === '::1')) {
      return { safe: true, resolvedIp: hostname };
    }
    if (isPrivateIp(hostname)) {
      throw new SsrfError(`Access to private/internal network IP (${hostname}) is blocked for security.`);
    }
    return { safe: true, resolvedIp: hostname };
  }

  // Special case: 'localhost'
  if (hostname.toLowerCase() === 'localhost' || hostname.toLowerCase().endsWith('.localhost')) {
    if (allowLoopback) {
      return { safe: true, resolvedIp: '127.0.0.1' };
    }
    throw new SsrfError('Access to localhost is blocked for security.');
  }

  // Resolve DNS to verify all destination IPs
  try {
    const lookupResult = await lookupAsync(hostname, { all: true });
    for (const entry of lookupResult) {
      if (allowLoopback && (entry.address === '127.0.0.1' || entry.address === '::1')) {
        continue;
      }
      if (isPrivateIp(entry.address)) {
        throw new SsrfError(`Domain "${hostname}" resolved to blocked private IP address: ${entry.address}.`);
      }
    }
    return { safe: true, resolvedIp: lookupResult[0]?.address };
  } catch (err: any) {
    if (err instanceof SsrfError) throw err;
    throw new SsrfError(`DNS resolution failed for hostname "${hostname}": ${err.message}`);
  }
}
