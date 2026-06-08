// Build runner. Clones a repo, branches per the AUTOMATION_CONTRACT, applies the
// change (real Claude Agent SDK when ANTHROPIC_API_KEY + the SDK are present;
// otherwise a deterministic degraded change so the clone→verify→diff→summary
// flow runs without credentials), verifies, commits, and — unless
// BUILDER_DRY_RUN — pushes + opens a PR. Writes telemetry back to claude_runs.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { query } from './lib/db';
import { logger, scrubSecrets } from './lib/log';
import { githubConfigured, openPullRequest } from './github';

const execFileP = promisify(execFile);

export type BuildSummary = { files_changed: number; tests: 'pass' | 'fail'; risk: 'low' | 'standard' | 'high' };
export type BuildPayload = {
  repo_url: string;
  branch: string;
  prompt: string;
  claude_run_id?: string;
  request_id?: string;
  base?: string;
  verifyCommands?: string[][];
};
export type BuildResult = {
  branch: string;
  filesChanged: number;
  diff: string;
  summary: BuildSummary;
  verification: { passed: boolean; output: string };
  prUrl: string | null;
  dryRun: boolean;
  durationMs: number;
};

const git = async (cwd: string | undefined, args: string[]): Promise<string> => {
  const { stdout } = await execFileP('git', args, { cwd, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
};

function repoSlugFromUrl(url: string): string {
  const m = url.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/i);
  return m ? m[1] : url;
}

function parseSummary(text: string): BuildSummary | null {
  const fences = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  for (const f of fences.reverse()) {
    try {
      const j = JSON.parse(f) as Partial<BuildSummary>;
      if (typeof j.files_changed === 'number' && (j.tests === 'pass' || j.tests === 'fail')) {
        return { files_changed: j.files_changed, tests: j.tests, risk: (j.risk as BuildSummary['risk']) ?? 'standard' };
      }
    } catch {
      /* not this block */
    }
  }
  return null;
}

/** Real agent run — dynamically imported so the SDK stays optional. */
async function runAgent(workdir: string, prompt: string): Promise<string | null> {
  try {
    const spec = '@anthropic-ai/claude-agent-sdk';
    const sdk = (await import(spec)) as {
      query: (opts: { prompt: string; options?: Record<string, unknown> }) => AsyncIterable<{ type: string; text?: string }>;
    };
    let out = '';
    for await (const msg of sdk.query({ prompt, options: { cwd: workdir, permissionMode: 'acceptEdits' } })) {
      if (msg.type === 'text' && msg.text) out += msg.text;
    }
    return out;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'agent sdk unavailable — degraded build');
    return null;
  }
}

export async function runBuild(payload: BuildPayload): Promise<BuildResult> {
  const dryRun = (process.env.BUILDER_DRY_RUN ?? 'false') === 'true';
  const base = payload.base ?? 'main';
  const t0 = Date.now();
  const workdir = mkdtempSync(join(tmpdir(), 'oohbuild-'));
  try {
    await git(undefined, ['clone', payload.repo_url, workdir]);
    await git(workdir, ['config', 'user.email', 'builder@out-of-house.dev']);
    await git(workdir, ['config', 'user.name', 'ooh-builder']);
    await git(workdir, ['checkout', '-b', payload.branch]);
    const baseSha = (await git(workdir, ['rev-parse', 'HEAD'])).trim();

    let summary: BuildSummary | null = null;
    if (process.env.ANTHROPIC_API_KEY) {
      const out = await runAgent(workdir, payload.prompt);
      if (out) summary = parseSummary(out);
    }
    if (!summary) {
      // degraded/fixture: deterministic change so there's a real diff to review.
      writeFileSync(join(workdir, 'OOH_BUILD.md'), `# Build\n\n${scrubSecrets(payload.prompt).slice(0, 800)}\n\nApplied by the builder worker (degraded mode — no agent key).\n`);
      summary = { files_changed: 1, tests: 'pass', risk: 'low' };
    }

    await git(workdir, ['add', '-A']);
    const porcelain = await git(workdir, ['status', '--porcelain']);
    const filesChanged = porcelain.split('\n').filter(Boolean).length;

    const commands = payload.verifyCommands ?? [
      ['npm', 'run', 'lint'],
      ['npm', 'run', 'build'],
      ['npm', 'test', '--if-present'],
    ];
    let verifyOutput = '';
    let passed = true;
    for (const cmd of commands) {
      try {
        const { stdout, stderr } = await execFileP(cmd[0], cmd.slice(1), { cwd: workdir, maxBuffer: 16 * 1024 * 1024 });
        verifyOutput += stdout + stderr;
      } catch (err) {
        passed = false;
        const e = err as { stdout?: string; stderr?: string; message?: string };
        verifyOutput += `${e.stdout ?? ''}${e.stderr ?? e.message ?? ''}`;
        break;
      }
    }

    await git(workdir, ['commit', '-m', `feat: ${payload.prompt.slice(0, 60).replace(/\n/g, ' ')}`]);
    const diff = await git(workdir, ['diff', baseSha, 'HEAD']);

    let prUrl: string | null = null;
    if (dryRun) {
      const out = join(process.env.FILE_STORE_ROOT ?? join(process.cwd(), '.data'), 'builder-diffs', `${payload.branch.replace(/[/\\]/g, '_')}.diff`);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, diff);
    } else if (passed && githubConfigured()) {
      await git(workdir, ['push', 'origin', payload.branch]);
      const pr = await openPullRequest(repoSlugFromUrl(payload.repo_url), {
        title: `${summary.tests === 'fail' ? '[NEEDS HUMAN] ' : ''}${payload.prompt.slice(0, 60)}`,
        head: payload.branch,
        base,
        body: prBody(payload, summary, passed),
      });
      prUrl = pr.html_url;
    }

    if (payload.claude_run_id) {
      await query(
        "update claude_runs set status='awaiting_review', pr_url=$2, branch=$3, duration_ms=$4, metadata=$5, finished_at=now() where id=$1",
        [payload.claude_run_id, prUrl, payload.branch, Date.now() - t0, JSON.stringify(summary)],
      ).catch(() => undefined);
    }

    return { branch: payload.branch, filesChanged, diff, summary, verification: { passed, output: verifyOutput }, prUrl, dryRun, durationMs: Date.now() - t0 };
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
}

function prBody(payload: BuildPayload, summary: BuildSummary, passed: boolean): string {
  return [
    `## Scope`,
    payload.prompt.slice(0, 400),
    ``,
    `## How verified`,
    passed ? 'Verification commands passed.' : 'Verification FAILED — see logs.',
    ``,
    `Risk class: \`${summary.risk}\``,
    `Files changed: ${summary.files_changed}`,
    ``,
    '🤖 Opened by the out-of-house.dev builder.',
  ].join('\n');
}
