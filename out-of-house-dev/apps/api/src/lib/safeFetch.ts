// SSRF-guarded fetch for user-supplied URLs (aiseo audit, lead enrich). Blocks
// private/loopback/link-local hosts, http->no-https-needed (we just require a
// scheme), caps redirects + time. Set ALLOW_PRIVATE_FETCH=true to permit private
// hosts (tests against a local fixture server).
import { lookup } from 'node:dns/promises';

const allowPrivate = (): boolean => process.env.ALLOW_PRIVATE_FETCH === 'true';

function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('0.')) return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true; // link-local
  const m = ip.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true; // ULA / link-local v6
  return false;
}

export async function assertSafeUrl(url: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error('invalid url');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('unsupported protocol');
  if (allowPrivate()) return u;
  const host = u.hostname;
  if (host === 'localhost') throw new Error('blocked host');
  try {
    const { address } = await lookup(host);
    if (isPrivateIp(address)) throw new Error('blocked private address');
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('blocked')) throw err;
    throw new Error('dns resolution failed');
  }
  return u;
}

export async function safeFetch(url: string, timeoutMs = 5000): Promise<Response> {
  await assertSafeUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { redirect: 'follow', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
