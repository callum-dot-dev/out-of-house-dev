// Stage prompts (ported from claude-orchestrate) + deterministic template
// fallbacks (used when no LLM key is configured, so the pipeline + tests run
// green without credentials) + buildHandoff composition for build_prompt.
import { join } from 'node:path';
import type { LlmModel, LlmPurpose } from '@oohdev/shared';

export type Stage = 'scope' | 'quote' | 'plan' | 'build_prompt' | 'review' | 'deploy';

export type RequestRow = { id: string; title: string; description: string; project_id: string };
export type ProjectRow = {
  id: string;
  name: string;
  project_type: string;
  repo_url: string | null;
  preview_url: string | null;
  retainer_tier: string | null;
  metadata: Record<string, unknown> | null;
};

export const STAGE_TITLE: Record<Stage, string> = {
  scope: 'Scope drafted',
  quote: 'Quote drafted',
  plan: 'Plan written',
  build_prompt: 'Build prompt prepared',
  review: 'Review complete',
  deploy: 'Deployment runbook ready',
};

export const MODEL_BY_STAGE: Record<Stage, LlmModel> = {
  scope: 'claude-sonnet-4-6',
  quote: 'claude-sonnet-4-6',
  plan: 'claude-opus-4-8',
  build_prompt: 'claude-opus-4-8',
  review: 'claude-sonnet-4-6',
  deploy: 'claude-haiku-4-5-20251001',
};

export const PURPOSE_BY_STAGE: Record<Stage, LlmPurpose> = {
  scope: 'scope',
  quote: 'quote',
  plan: 'plan',
  build_prompt: 'build_prompt',
  review: 'review',
  deploy: 'deploy',
};

export const SYSTEM_BY_STAGE: Record<Stage, string> = {
  scope: `You are a senior delivery lead at out-of-house.dev. Read the client's request and write a 1-page scope: problem, what we will ship, what we will NOT ship, acceptance criteria, and risks. Be specific, terse, and grounded. Output markdown with "## Acceptance criteria" and "## Risks" sections.`,
  quote: `You are pricing a fixed-scope build at out-of-house.dev. From the scope, produce line items (name + price in GBP) and a one-paragraph statement of work. Output markdown.`,
  plan: `You are a senior staff engineer planning a build. Produce a step-by-step plan with: files to create/edit (paths), data model changes, and a verification checklist. Output markdown with a "## Verification" section.`,
  build_prompt: `(handled by buildHandoff — deterministic composition)`,
  review: `You are a senior reviewer. Given a diff and a target spec, identify correctness issues, missing acceptance criteria, security risks, and regressions. End with a "status: pass | needs_changes" line.`,
  deploy: `You are a release engineer. Output the deployment runbook: merge target, DB migrations (in order), env vars, smoke tests, and rollback procedure. Output markdown.`,
};

export function buildUserPrompt(stage: Stage, request: RequestRow, project: ProjectRow): string {
  return (
    `Project: ${project.name}\nType: ${project.project_type}\nRepo: ${project.repo_url ?? '(none)'}\nPreview: ${project.preview_url ?? '(none)'}\n\n` +
    `Request title: ${request.title}\nRequest body:\n${request.description}\n`
  );
}

export const TEMPLATE_BY_STAGE: Record<Exclude<Stage, 'build_prompt' | 'review' | 'quote'>, (r: RequestRow, p: ProjectRow) => string> = {
  scope: (r) =>
    `# Scope — ${r.title}\n\n**Problem.** ${r.description.slice(0, 600)}\n\n**We will ship:** the change described above, integrated to the project's conventions.\n\n**We will NOT ship:** unrelated refactors or scope beyond the request.\n\n## Acceptance criteria\n- [ ] The request "${r.title}" is implemented\n- [ ] Lint, typecheck, build and tests pass\n\n## Risks\n- Standard delivery risk; mitigated by the review gate.\n`,
  plan: (r, p) =>
    `# Plan — ${r.title}\n\n## Files\n- To be determined by the builder against ${p.repo_url ?? 'the project repo'}, mirroring existing patterns.\n\n## Data changes\n- None anticipated (flag in PR if a migration is required).\n\n## Verification\n- [ ] npm run lint\n- [ ] npm run build\n- [ ] npm test\n`,
  deploy: (r) =>
    `# Deployment runbook — ${r.title}\n\n- **Merge target:** main (via PR)\n- **Migrations:** none (run \`npm run migrate\` if the PR added any)\n- **Env vars:** none new\n- **Smoke tests:** \`npm run smoke\`\n- **Rollback:** Render → roll back to the previous deploy.\n`,
};

export function quoteFallback(request: RequestRow): { md: string; linePence: number } {
  const linePence = 75000; // £750 default fixed line; adjusted by admin before send
  const md = `# Quote — ${request.title}\n\n## Line items\n- ${request.title}: £${(linePence / 100).toFixed(0)}\n\n## Statement of work\nDeliver "${request.title}" to the project's conventions, verified by lint/build/tests and the review gate.\n`;
  return { md, linePence };
}

export function reviewMarkdown(request: RequestRow, risk: string, verdict: 'pass' | 'needs_changes'): string {
  return `# Review — ${request.title}\n\nHeuristic reviewer: no blocking issues detected.\n\nrisk: ${risk}\nstatus: ${verdict}\n`;
}

// buildHandoff from the canonical prompt pack (CommonJS). Path is workspace-root
// relative so it resolves from the worker's cwd at runtime + the repo root in tests.
const planTemplatesPath = join(process.cwd(), 'apps', 'web', 'src', 'data', 'planTemplates.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildHandoff } = require(planTemplatesPath) as {
  buildHandoff: (type: string, style: string | undefined, context: Record<string, unknown>) => string | null;
};

export function composeBuildPrompt(project: ProjectRow, request: RequestRow, context: Record<string, unknown>): string {
  const style = (project.metadata?.style as string | undefined) ?? undefined;
  const handoff = buildHandoff(project.project_type, style, {
    repo_url: project.repo_url,
    preview_url: project.preview_url,
    request_title: request.title,
    request_body: request.description,
    ...context,
  });
  return handoff ?? `# Build prompt — ${request.title}\n\n${request.description}\n`;
}
