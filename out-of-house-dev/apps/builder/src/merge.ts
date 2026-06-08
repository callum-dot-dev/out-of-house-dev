import { deleteBranch, mergePullRequest } from './github';

export async function runMerge(payload: { pr_url: string; branch?: string }): Promise<{ merged: boolean }> {
  const m = payload.pr_url.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (!m) throw new Error(`bad pr_url: ${payload.pr_url}`);
  const repo = m[1];
  const number = Number(m[2]);
  const res = await mergePullRequest(repo, number, 'squash');
  if (res.merged && payload.branch) {
    await deleteBranch(repo, payload.branch).catch(() => undefined);
  }
  return { merged: Boolean(res.merged) };
}
