// Minimal GitHub REST client (fetch-based). Degrades to a clear error when
// GITHUB_TOKEN is absent. Used by the builder to open/merge PRs and create
// client repos from template repos.
const API = 'https://api.github.com';

export const githubConfigured = (): boolean => Boolean(process.env.GITHUB_TOKEN);

function headers(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'content-type': 'application/json',
    'User-Agent': 'out-of-house-builder',
  };
}

async function gh<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`GitHub ${method} ${path} -> ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export type PullRequest = { number: number; html_url: string };

export function openPullRequest(repo: string, input: { title: string; head: string; base: string; body: string }): Promise<PullRequest> {
  return gh<PullRequest>('POST', `/repos/${repo}/pulls`, input);
}

export function mergePullRequest(repo: string, number: number, method: 'squash' | 'merge' | 'rebase' = 'squash'): Promise<{ merged: boolean; sha?: string }> {
  return gh('PUT', `/repos/${repo}/pulls/${number}/merge`, { merge_method: method });
}

export function deleteBranch(repo: string, branch: string): Promise<unknown> {
  return gh('DELETE', `/repos/${repo}/git/refs/heads/${branch}`);
}

export function createRepoFromTemplate(templateRepo: string, input: { owner: string; name: string; private: boolean; description?: string }): Promise<{ full_name: string; html_url: string; clone_url: string }> {
  return gh('POST', `/repos/${templateRepo}/generate`, { owner: input.owner, name: input.name, private: input.private, description: input.description });
}
