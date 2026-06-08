// Minimal Render API v1 client (fetch-based). Creates static sites for client
// websites, adds custom domains (returns the DNS records to set at IONOS),
// triggers + inspects deploys. Degrades clearly when RENDER_API_KEY is absent.
const API = 'https://api.render.com/v1';

export const renderConfigured = (): boolean => Boolean(process.env.RENDER_API_KEY);

function headers(): Record<string, string> {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error('RENDER_API_KEY not set');
  return { Authorization: `Bearer ${key}`, Accept: 'application/json', 'content-type': 'application/json' };
}

async function rnd<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`Render ${method} ${path} -> ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export type RenderService = { id: string; name: string; serviceDetails?: { url?: string } };

export function createStaticSite(input: { name: string; repo: string; branch?: string; buildCommand?: string; publishPath?: string }): Promise<{ service: RenderService }> {
  return rnd('POST', '/services', {
    type: 'static_site',
    name: input.name,
    ownerId: process.env.RENDER_OWNER_ID,
    repo: input.repo,
    branch: input.branch ?? 'main',
    serviceDetails: {
      buildCommand: input.buildCommand ?? 'npm install && npm run build',
      publishPath: input.publishPath ?? 'dist',
    },
  });
}

export type DnsRecord = { type: string; host: string; value: string };

export function addCustomDomain(serviceId: string, domain: string): Promise<{ id: string; domain: string; dnsRecords?: DnsRecord[] }> {
  return rnd('POST', `/services/${serviceId}/custom-domains`, { name: domain });
}

export function triggerDeploy(serviceId: string): Promise<{ id: string; status: string }> {
  return rnd('POST', `/services/${serviceId}/deploys`, {});
}

export function getDeployStatus(serviceId: string, deployId: string): Promise<{ id: string; status: string }> {
  return rnd('GET', `/services/${serviceId}/deploys/${deployId}`);
}
