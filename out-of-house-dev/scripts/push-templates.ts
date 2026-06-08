// Publishes the local template folders as GitHub template repositories. Requires
// GITHUB_TOKEN + GITHUB_ORG. Degrades to a clear message when unconfigured.
//   tsx scripts/push-templates.ts
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TEMPLATES = ['ooh-starter-site', 'ooh-automation-worker'];

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const org = process.env.GITHUB_ORG ?? 'out-of-house-dev';
  if (!token) {
    console.log('GITHUB_TOKEN not set — skipping. (Set it to publish the template repos.)');
    return;
  }
  for (const name of TEMPLATES) {
    // create the repo (idempotent: 422 == already exists)
    const res = await fetch(`https://api.github.com/orgs/${org}/repos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'content-type': 'application/json' },
      body: JSON.stringify({ name, private: false, is_template: true, auto_init: false }),
    });
    if (!res.ok && res.status !== 422) throw new Error(`create ${name}: ${res.status} ${await res.text()}`);

    // copy to a throwaway dir so we never nest a git repo inside the monorepo
    const src = join(__dirname, '..', 'templates', name);
    const dir = mkdtempSync(join(tmpdir(), `tpl-${name}-`));
    cpSync(src, dir, { recursive: true });

    const remote = `https://x-access-token:${token}@github.com/${org}/${name}.git`;
    const git = (args: string[]) => execFileSync('git', args, { cwd: dir, stdio: 'inherit' });
    git(['init', '-q']);
    git(['add', '-A']);
    git(['commit', '-q', '-m', 'chore: publish template']);
    git(['branch', '-M', 'main']);
    git(['remote', 'add', 'origin', remote]);
    git(['push', '-u', '-f', 'origin', 'main']);
    console.log(`pushed ${name}`);
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
