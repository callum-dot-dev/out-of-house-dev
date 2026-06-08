import { createRepoFromTemplate } from './github';

const TEMPLATE_REPO: Record<'site' | 'automation', string> = {
  site: 'ooh-starter-site',
  automation: 'ooh-automation-worker',
};

export function createClientRepo(kind: 'site' | 'automation', name: string, description?: string): Promise<{ full_name: string; html_url: string; clone_url: string }> {
  const org = process.env.GITHUB_ORG ?? 'out-of-house-dev';
  return createRepoFromTemplate(`${org}/${TEMPLATE_REPO[kind]}`, { owner: org, name, private: false, description });
}
