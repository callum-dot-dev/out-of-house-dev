# ADR 0002 — Supabase → own-Postgres schema port

- **Status:** accepted · **Date:** 2026-06-08

Porting `supabase/migrations/001..006` into `db/migrations/0001_baseline.sql`
(faithful consolidated current model) + `0002_v4_platform.sql` (v4 delta).

## Transformations applied in 0001

1. **`profiles` → `users`.** Adds the own-auth columns (`password_hash`,
   `notify_email/in_app`, `timezone`, `avatar_path`, `last_login_at`,
   `last_seen_at`, `terms_accepted_at`, `deleted_at`). `avatar_url` → `avatar_path`.
   Every FK that referenced `profiles(id)` / `auth.users` now references `users(id)`.
2. **RLS removed entirely.** All `enable row level security`, `create policy`,
   `auth.uid()`, and the helpers `current_role()/is_admin()/is_developer_or_admin()`
   are dropped — authorization moves to the API repository layer (A2), proven by
   the Phase 2 isolation red-team suite.
3. **Supabase-only objects dropped:** `storage.buckets`/`storage.objects` blocks,
   the `handle_new_user()` + `on_auth_user_created` trigger (no `auth.users`).
4. **`auth.uid()`-dependent event triggers dropped** (`on_feature_request_change`,
   `on_comment_insert`, `on_project_change`, `on_document_visibility`). The
   activity-feed + notification + `shipped_at` writes they performed move to the
   API notifications/audit services and the orchestrator (A4; Phases 2/3/5).
   **Kept** (pure data-integrity, no auth): `set_updated_at`,
   `recount_cohort_enrolled`, `logovault_brand_tsv_refresh`.
5. **Type-check widening from 006** baked in: `plan_templates.type`,
   `projects.project_type`, `applications.project_type` include
   `maintenance|aiseo|lead_engine` (+`other` where applicable); `projects.metadata`
   jsonb added.
6. **IDs**: `gen_random_uuid()` (pgcrypto) replaces `uuid_generate_v4()`
   (uuid-ossp). `email` is `citext`.
7. **Money**: existing tables keep their numeric `*_gbp` columns (faithful port,
   the UI/edge-fn ports read them); **new** v4 money is integer **pence**
   (`quotes.total_pence`, `llm_calls.cost_pence`, `referral_credits.amount_pence`)
   per spec §4. GBP exposed only in views.

## 0002 delta (v4)

New tables: sessions, auth_tokens, oauth_identities, quotes, stripe_events,
client_sites, uptime_checks, uptime_results, status_incidents, suppression_list,
inbound_emails, meeting_bookings, testimonials, case_studies, referral_credits,
capstone_submissions, admin_alerts, llm_calls, analytics_events, email_events,
files, backups_log, feedback, content_posts, settings (kill-switches). Views:
v_llm_costs_daily, v_revenue_monthly, v_funnel_weekly. ALTERs: `feature_requests`
status widened to the Phase-5 orchestrator superset + `risk_class`; `projects`
gains `retainer_tier`.

## Migration runner

`db/migrate.ts` applies `db/migrations/*.sql` in filename order, each in a
transaction, recording `(filename, sha256 checksum, applied_at)` in
`schema_migrations`. Re-runs are no-ops; a changed checksum on an applied file is
a hard error (migrations are immutable). Local/test verification uses
`embedded-postgres`; CI uses a `postgres:16` service.
