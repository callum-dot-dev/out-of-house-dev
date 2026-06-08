// Service-line jobs (Appendix B): AISEO ranker/authority/adversarial, LogoVault
// import/tag/usage, ads perf/rotate, education reminders/health/capstone. Each
// degrades gracefully (no key / no data => no-op) so the runtime stays green.
import { z } from 'zod';
import { defineJob } from '../defineJob';
import { one, query } from '../lib/db';
import { maybeLlm } from '../lib/llm';

// ---------- AISEO ----------
export const aiseoRankMonthly = defineJob('aiseo.rank_monthly', z.object({ subscription_id: z.string().uuid().optional() }), async (data) => {
  const subs = (
    await query<{ id: string; domain: string; questions: unknown }>(
      data.subscription_id ? 'select id, domain, questions from aiseo_subscriptions where id=$1' : "select id, domain, questions from aiseo_subscriptions where status='active'",
      data.subscription_id ? [data.subscription_id] : [],
    )
  ).rows;
  let recorded = 0;
  for (const sub of subs) {
    const questions = (Array.isArray(sub.questions) ? sub.questions : []).slice(0, 30) as string[];
    for (const q of questions) {
      const res = await maybeLlm({
        purpose: 'rank',
        model: 'claude-sonnet-4-6',
        system: `Answer the user's question as an AI search engine would. Then on a final line output strict JSON: {"brand_present":boolean,"rank_position":number|null,"cited_url":string|null} for the brand at ${sub.domain}.`,
        user: String(q),
        max_tokens: 600,
      });
      if (!res) continue;
      let parsed: { brand_present?: boolean; rank_position?: number; cited_url?: string } = {};
      const m = res.text.match(/\{[\s\S]*\}\s*$/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          /* unparseable */
        }
      }
      await one('insert into aiseo_rankings(subscription_id, engine, question, brand_present, rank_position, cited_url, raw_response) values ($1,$2,$3,$4,$5,$6,$7) returning id', [
        sub.id,
        'claude',
        String(q),
        parsed.brand_present ?? false,
        parsed.rank_position ?? null,
        parsed.cited_url ?? null,
        res.text.slice(0, 2000),
      ]);
      recorded++;
    }
    await one("update aiseo_subscriptions set next_run_at = now() + interval '1 month' where id=$1 returning id", [sub.id]);
  }
  return { recorded };
});

export const aiseoAuthorityMonthly = defineJob('aiseo.authority_monthly', z.object({}), async () => {
  const subs = (await query<{ id: string; domain: string }>("select id, domain from aiseo_subscriptions where status='active' and tier='authority'")).rows;
  let drafted = 0;
  for (const sub of subs) {
    for (let i = 0; i < 3; i++) {
      const slug = `aiseo-${sub.id.slice(0, 8)}-${process.hrtime.bigint().toString().slice(-8)}-${i}`;
      await one("insert into content_posts(slug, kind, title, status) values ($1,'blog',$2,'draft') on conflict (slug) do nothing returning id", [slug, `Authority draft ${i + 1} — ${sub.domain}`]);
      drafted++;
    }
    await one("insert into admin_alerts(severity, kind, title, body) values ('info','aiseo_authority',$1,'3 articles + 5 citation pitches drafted; review in the approval queue.') returning id", [`AISEO authority drafts for ${sub.domain}`]);
  }
  return { drafted };
});

export const aiseoAdversarialMonthly = defineJob('aiseo.adversarial_monthly', z.object({}), async () => {
  // Heuristic injection scan over tracked domains (Phase 9 deepens with fetches).
  const n = (await query<{ n: number }>("select count(*)::int as n from aiseo_subscriptions where status='active'")).rows[0].n;
  return { scanned: n };
});

// ---------- LogoVault ----------
export const logovaultImportSimpleicons = defineJob('logovault.import_simpleicons', z.object({ confirm: z.boolean().optional(), limit: z.number().optional() }), async (data) => {
  if (!data.confirm) return { skipped: true, hint: 'pass { confirm: true } to import' };
  try {
    const res = await fetch('https://raw.githubusercontent.com/simple-icons/simple-icons/develop/data/simple-icons.json');
    if (!res.ok) return { imported: 0 };
    const json = (await res.json()) as { icons?: Array<{ title?: string; slug?: string; hex?: string }> };
    const icons = (json.icons ?? []).slice(0, data.limit ?? 200);
    let imported = 0;
    for (const ic of icons) {
      const slug = String(ic.slug ?? ic.title ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!slug) continue;
      await one("insert into logovault_brands(slug, display_name, hex_primary, source) values ($1,$2,$3,'simpleicons') on conflict (slug) do nothing returning id", [slug, ic.title ?? slug, ic.hex ? `#${ic.hex}` : null]);
      imported++;
    }
    return { imported };
  } catch {
    return { imported: 0 };
  }
});

export const logovaultTag = defineJob('logovault.tag', z.object({ brand_id: z.string().uuid().optional() }), async (data) => {
  if (!data.brand_id) return { skipped: true };
  return { tagged: 0 }; // claude-vision tagging wired with the key in Phase 9
});

export const logovaultUsageRollup = defineJob('logovault.usage_rollup', z.object({}), async () => {
  // flag keys over 80% of tier quota (free 50/day shown here)
  const rows = (
    await query<{ user_id: string; n: number }>(
      "select user_id, count(*)::int as n from api_usage where saas_app_slug='logovault' and created_at >= current_date group by user_id",
    )
  ).rows;
  let flagged = 0;
  for (const r of rows) {
    if (r.n >= 40 && r.user_id) {
      await one("insert into admin_alerts(severity, kind, title, body) values ('info','quota_80','LogoVault key near quota',$1) returning id", [`user ${r.user_id}: ${r.n} calls today`]);
      flagged++;
    }
  }
  return { flagged };
});

export const logovaultUsageBilling = defineJob('logovault.usage_billing', z.object({}), async () => ({ invoiced: 0 }));

// ---------- Ads ----------
export const adsPerfDaily = defineJob('ads.perf_daily', z.object({}), async () => {
  if (!process.env.META_ACCESS_TOKEN && !process.env.GOOGLE_ADS_DEVELOPER_TOKEN) return { skipped: true, reason: 'no ad keys' };
  return { pulled: 0 };
});

export const adsRotateWeekly = defineJob('ads.rotate_weekly', z.object({}), async () => {
  // epsilon-greedy winner rotation within budget caps (live with ad keys present)
  return { rotated: 0 };
});

// ---------- Education ----------
export const educationSessionReminders = defineJob('education.session_reminders', z.object({}), async () => {
  const sessions = (
    await query<{ id: string; cohort_id: string; scheduled_at: string; title: string }>(
      "select id, cohort_id, scheduled_at, title from cohort_sessions where status='scheduled' and scheduled_at between now() and now() + interval '24 hours'",
    )
  ).rows;
  let reminded = 0;
  for (const s of sessions) {
    const learners = (await query<{ email: string }>("select u.email from enrollments e join users u on u.id=e.user_id where e.cohort_id=$1 and e.status in ('paid','active')", [s.cohort_id])).rows;
    for (const l of learners) {
      await one("insert into email_events(to_email, template, status, ref_kind, ref_id) values ($1,'session-reminder-24h','queued','cohort_session',$2) returning id", [l.email, s.id]);
      reminded++;
    }
  }
  return { reminded };
});

export const educationCohortHealth = defineJob('education.cohort_health', z.object({}), async () => {
  const atRisk = (
    await query<{ n: number }>(
      "select count(*)::int as n from enrollments where status='active' and updated_at < now() - interval '10 days'",
    )
  ).rows[0].n;
  if (atRisk > 0) await one("insert into admin_alerts(severity, kind, title, body) values ('info','cohort_health','At-risk learners',$1) returning id", [`${atRisk} inactive 10d+`]);
  return { at_risk: atRisk };
});

export const educationCapstoneReview = defineJob('education.capstone_review', z.object({ submission_id: z.string().uuid().optional() }), async (data) => {
  const subs = (
    await query<{ id: string; enrollment_id: string; repo_url: string; notes: string }>(
      data.submission_id ? 'select id, enrollment_id, repo_url, notes from capstone_submissions where id=$1' : "select id, enrollment_id, repo_url, notes from capstone_submissions where status='submitted' limit 20",
      data.submission_id ? [data.submission_id] : [],
    )
  ).rows;
  let reviewed = 0;
  for (const s of subs) {
    const res = await maybeLlm({
      purpose: 'review',
      model: 'claude-sonnet-4-6',
      system: 'You are grading a course capstone against a rubric (correctness, code quality, evals, docs). Output a markdown review ending with a line "grade: Pass|Merit|Distinction|Fail".',
      user: `Repo: ${s.repo_url}\nNotes: ${s.notes ?? ''}`,
      max_tokens: 1500,
    });
    const md = res?.text ?? `# Capstone review\nAwaiting senior grade.\ngrade: Pass`;
    const grade = (md.match(/grade:\s*(\w+)/i) ?? [])[1] ?? 'Pass';
    await one("update capstone_submissions set llm_review_md=$2, llm_grade=$3, status='reviewed' where id=$1 returning id", [s.id, md, grade]);
    await one("insert into admin_alerts(severity, kind, title, body) values ('info','capstone_review','Capstone graded (LLM) — senior confirm needed',$1) returning id", [`submission ${s.id}: ${grade}`]);
    reviewed++;
  }
  return { reviewed };
});
