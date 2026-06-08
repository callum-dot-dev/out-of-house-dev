import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBuild } from '../src/runner';
import { openPullRequest, mergePullRequest } from '../src/github';
import { createStaticSite, addCustomDomain } from '../src/render';
import { renderPdf, type TemplateName } from '../src/pdf';

let fixtureRepo: string;
let fileRoot: string;

beforeAll(() => {
  fixtureRepo = mkdtempSync(join(tmpdir(), 'oohfix-'));
  const git = (args: string[]) => execFileSync('git', args, { cwd: fixtureRepo, stdio: 'pipe' });
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.email', 't@t.dev']);
  git(['config', 'user.name', 'test']);
  writeFileSync(join(fixtureRepo, 'README.md'), '# fixture\n');
  git(['add', '-A']);
  git(['commit', '-q', '-m', 'init']);

  fileRoot = mkdtempSync(join(tmpdir(), 'oohbf-'));
  process.env.FILE_STORE_ROOT = fileRoot;
  process.env.BUILDER_DRY_RUN = 'true';
  delete process.env.ANTHROPIC_API_KEY;
});

afterAll(() => {
  for (const d of [fixtureRepo, fileRoot]) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  vi.unstubAllGlobals();
});

describe('builder runner (BUILDER_DRY_RUN)', () => {
  it('clones, branches, applies a change, verifies, diffs, and does not open a PR', async () => {
    const result = await runBuild({
      repo_url: fixtureRepo,
      branch: 'ooh/fixture/1-add-note',
      prompt: 'Add a build note describing the change.',
      verifyCommands: [['node', '-e', 'process.exit(0)']],
    });
    expect(result.dryRun).toBe(true);
    expect(result.prUrl).toBeNull();
    expect(result.filesChanged).toBeGreaterThanOrEqual(1);
    expect(result.diff).toContain('OOH_BUILD.md');
    expect(result.summary.tests).toBe('pass');
    expect(result.verification.passed).toBe(true);
  }, 30_000);

  it('reports a failing verification', async () => {
    const result = await runBuild({
      repo_url: fixtureRepo,
      branch: 'ooh/fixture/2-fail',
      prompt: 'Change that fails verification.',
      verifyCommands: [['node', '-e', 'process.exit(1)']],
    });
    expect(result.verification.passed).toBe(false);
  }, 30_000);
});

describe('github client (request formation)', () => {
  it('opens and merges a PR with the right calls', async () => {
    process.env.GITHUB_TOKEN = 'ghp_test';
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, opts: { method: string; body?: string }) => {
        calls.push({ url, method: opts.method, body: opts.body ? JSON.parse(opts.body) : undefined });
        return { ok: true, status: 200, json: async () => ({ number: 7, html_url: 'https://github.com/out-of-house-dev/site/pull/7', merged: true }), text: async () => '' } as unknown as Response;
      }),
    );

    const pr = await openPullRequest('out-of-house-dev/site', { title: 'feat: x', head: 'ooh/x', base: 'main', body: 'b' });
    expect(pr.html_url).toContain('/pull/7');
    expect(calls[0].url).toBe('https://api.github.com/repos/out-of-house-dev/site/pulls');
    expect(calls[0].method).toBe('POST');
    expect((calls[0].body as { head: string }).head).toBe('ooh/x');

    const merge = await mergePullRequest('out-of-house-dev/site', 7);
    expect(merge.merged).toBe(true);
    expect(calls[1].url).toBe('https://api.github.com/repos/out-of-house-dev/site/pulls/7/merge');
    expect(calls[1].method).toBe('PUT');
    expect((calls[1].body as { merge_method: string }).merge_method).toBe('squash');

    vi.unstubAllGlobals();
  });
});

describe('render client (request formation)', () => {
  it('creates a static site and adds a custom domain (returns DNS records)', async () => {
    process.env.RENDER_API_KEY = 'rnd_test';
    process.env.RENDER_OWNER_ID = 'tea_test';
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, opts: { method: string; body?: string }) => {
        calls.push({ url, method: opts.method, body: opts.body ? JSON.parse(opts.body) : undefined });
        const body = url.includes('/custom-domains')
          ? { id: 'dom-1', domain: 'client.com', dnsRecords: [{ type: 'A', host: '@', value: '1.2.3.4' }] }
          : { service: { id: 'srv-1', name: 'site', serviceDetails: { url: 'https://site.onrender.com' } }, deployId: 'dep-1' };
        return { ok: true, status: 200, json: async () => body, text: async () => '' } as unknown as Response;
      }),
    );

    const created = await createStaticSite({ name: 'site', repo: 'https://github.com/out-of-house-dev/site' });
    expect(calls[0].url).toBe('https://api.render.com/v1/services');
    expect((calls[0].body as { type: string }).type).toBe('static_site');
    expect(created.service.id).toBe('srv-1');

    const domain = await addCustomDomain('srv-1', 'client.com');
    expect(calls[1].url).toBe('https://api.render.com/v1/services/srv-1/custom-domains');
    expect(domain.dnsRecords?.[0].value).toBe('1.2.3.4');

    vi.unstubAllGlobals();
  });
});

describe('pdf service', () => {
  it('renders all four templates to artifacts', async () => {
    const samples: Record<TemplateName, Record<string, unknown>> = {
      certificate: { recipient_name: 'Jane Doe', programme_name: 'AI Builder', certificate_code: 'OH-ABCD-EFGH-12', issued_at: '2026-06-08', grade: 'Pass', verification_url: 'https://out-of-house.dev/verify/OH-ABCD-EFGH-12' },
      'monthly-report': { project_name: 'Acme', period_start: '2026-05-01', period_end: '2026-05-31', shipped: 4, uptime: '99.98%', hours_saved: 40, narrative: 'Strong month.' },
      'aiseo-report': { domain: 'acme.com', grade: 'B', score: 78, rankings: [{ engine: 'claude', brand_present: true, rank_position: 2 }], summary: 'Improving.' },
      'quote-sow': { title: 'Website refresh', line_items: [{ name: 'Build', pence: 50000 }], total_pence: 50000, deposit_pct: 50, sow_md: 'Deliver the site.' },
    };
    for (const t of Object.keys(samples) as TemplateName[]) {
      const out = join(fileRoot, 'reports', `${t}.pdf`);
      const res = await renderPdf(t, samples[t], out);
      expect(res.bytes).toBeGreaterThan(800);
      expect(existsSync(res.path)).toBe(true);
    }
  });
});

describe('template repos', () => {
  it('builds the automation-worker template green', () => {
    const dir = join(process.cwd(), 'templates', 'ooh-automation-worker');
    execFileSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'pipe', shell: true });
    execFileSync('npm', ['run', 'build'], { cwd: dir, stdio: 'pipe', shell: true });
    expect(existsSync(join(dir, 'dist', 'index.js'))).toBe(true);
  }, 180_000);

  it('has a valid starter-site structure', () => {
    const dir = join(process.cwd(), 'templates', 'ooh-starter-site');
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.scripts.build).toBe('vite build');
    expect(existsSync(join(dir, 'index.html'))).toBe(true);
    expect(existsSync(join(dir, 'src', 'main.tsx'))).toBe(true);
    expect(existsSync(join(dir, 'public', 'llms.txt'))).toBe(true);
  });
});
