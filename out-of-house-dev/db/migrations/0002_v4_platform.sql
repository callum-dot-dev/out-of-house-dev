-- =============================================================
-- 0002_v4_platform — v4 delta: own-auth, commerce, hosting, growth,
-- education, ops tables + reporting views, plus ALTERs that give the
-- orchestrator its state machine. See docs/adr/0002-schema-port.md.
-- =============================================================

-- =============================================================
-- Auth / sessions
-- =============================================================
create table sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  refresh_hash text not null unique,
  family_id    uuid not null default gen_random_uuid(),   -- refresh-token reuse-detection family
  user_agent   text,
  ip           text,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index sessions_user_idx on sessions(user_id);
create index sessions_family_idx on sessions(family_id);

create table auth_tokens (
  id         uuid primary key default gen_random_uuid(),
  purpose    text not null check (purpose in ('magic','reset','invite','guest')),
  token_hash text not null unique,
  user_id    uuid references users(id) on delete cascade,
  email      citext,
  role       text,                                          -- invite: role to assign
  metadata   jsonb default '{}'::jsonb,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index auth_tokens_email_idx on auth_tokens(email);

create table oauth_identities (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null,
  provider_user_id text not null,
  user_id          uuid not null references users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  unique(provider, provider_user_id)
);

-- =============================================================
-- Commerce
-- =============================================================
create table quotes (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid references applications(id) on delete set null,
  project_id      uuid references projects(id) on delete set null,
  client_email    citext,
  status          text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired')),
  line_items      jsonb not null default '[]'::jsonb,
  total_pence     int not null default 0,
  deposit_pct     int not null default 50,
  sow_md          text,
  valid_until     timestamptz,
  sent_at         timestamptz,
  accepted_at     timestamptz,
  acceptance_ip   text,
  acceptance_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index quotes_application_idx on quotes(application_id);
create index quotes_status_idx on quotes(status);

create table stripe_events (
  id           text primary key,    -- Stripe event id (webhook idempotency)
  type         text,
  processed_at timestamptz not null default now()
);

-- =============================================================
-- Hosting / status
-- =============================================================
create table client_sites (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references projects(id) on delete cascade,
  repo_url             text,
  render_service_id    text,
  render_url           text,
  custom_domain        text,
  dns_records          jsonb default '[]'::jsonb,
  status               text not null default 'provisioning' check (status in ('provisioning','live','suspended','error')),
  care_subscription_id uuid references subscriptions(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index client_sites_project_idx on client_sites(project_id);

create table uptime_checks (
  id             uuid primary key default gen_random_uuid(),
  client_site_id uuid references client_sites(id) on delete cascade,
  target_url     text not null,
  interval_s     int not null default 300,
  enabled        boolean not null default true,
  created_at     timestamptz not null default now()
);

create table uptime_results (
  id          bigserial primary key,
  check_id    uuid not null references uptime_checks(id) on delete cascade,
  ts          timestamptz not null default now(),
  ok          boolean not null,
  status_code int,
  latency_ms  int
);
create index uptime_results_check_idx on uptime_results(check_id, ts desc);

create table status_incidents (
  id             uuid primary key default gen_random_uuid(),
  client_site_id uuid references client_sites(id) on delete set null,
  started_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  title          text not null,
  body           text,
  severity       text not null default 'minor' check (severity in ('minor','major','critical'))
);
create index status_incidents_open_idx on status_incidents(started_at desc) where resolved_at is null;

-- =============================================================
-- Growth
-- =============================================================
create table suppression_list (
  id         uuid primary key default gen_random_uuid(),
  email      citext unique not null,
  reason     text,
  source     text,
  created_at timestamptz not null default now()
);

create table inbound_emails (
  id           uuid primary key default gen_random_uuid(),
  resend_id    text unique,
  from_email   citext,
  to_email     citext,
  subject      text,
  text_body    text,
  html_body    text,
  in_reply_to  text,
  lead_id      uuid references leads(id) on delete set null,
  intent       text check (intent in ('positive','meeting','question','objection','unsubscribe','bounce','other')),
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index inbound_emails_lead_idx on inbound_emails(lead_id);
create index inbound_emails_unprocessed_idx on inbound_emails(created_at) where processed_at is null;

create table meeting_bookings (
  id             uuid primary key default gen_random_uuid(),
  calcom_uid     text unique,
  kind           text not null check (kind in ('discovery','coaching','aiseo','lead_engine')),
  email          citext,
  name           text,
  starts_at      timestamptz,
  ends_at        timestamptz,
  lead_id        uuid references leads(id) on delete set null,
  application_id uuid references applications(id) on delete set null,
  status         text not null default 'booked' check (status in ('booked','cancelled','completed','no_show')),
  created_at     timestamptz not null default now()
);
create index meeting_bookings_starts_idx on meeting_bookings(starts_at);

create table testimonials (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade,
  client_name text,
  quote       text not null,
  rating      int check (rating between 1 and 5),
  approved    boolean not null default false,
  public      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table case_studies (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete set null,
  slug         text unique not null,
  title        text not null,
  body_md      text,
  status       text not null default 'draft' check (status in ('draft','approved','published')),
  published_at timestamptz,
  created_at   timestamptz not null default now()
);

create table referral_credits (
  id           uuid primary key default gen_random_uuid(),
  referral_id  uuid not null references referrals(id) on delete cascade,
  amount_pence int not null default 0,
  status       text not null default 'pending' check (status in ('pending','applied','expired')),
  created_at   timestamptz not null default now()
);

-- =============================================================
-- Education
-- =============================================================
create table capstone_submissions (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  repo_url      text,
  notes         text,
  llm_review_md text,
  llm_grade     text,
  senior_grade  text,
  status        text not null default 'submitted' check (status in ('submitted','reviewed','passed','failed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index capstone_enrollment_idx on capstone_submissions(enrollment_id);

-- =============================================================
-- Ops / observability
-- =============================================================
create table admin_alerts (
  id              uuid primary key default gen_random_uuid(),
  severity        text not null default 'info' check (severity in ('info','warn','critical')),
  kind            text not null,
  title           text not null,
  body            text,
  acknowledged_at timestamptz,
  created_at      timestamptz not null default now()
);
create index admin_alerts_unack_idx on admin_alerts(created_at desc) where acknowledged_at is null;

create table llm_calls (
  id         bigserial primary key,
  purpose    text not null,
  model      text not null,
  tokens_in  int not null default 0,
  tokens_out int not null default 0,
  cost_pence int not null default 0,
  ref_kind   text,
  ref_id     uuid,
  created_at timestamptz not null default now()
);
create index llm_calls_created_idx on llm_calls(created_at);
create index llm_calls_purpose_idx on llm_calls(purpose, created_at);

create table analytics_events (
  id         bigserial primary key,
  session_id text,
  user_id    uuid references users(id) on delete set null,
  name       text not null,
  path       text,
  props      jsonb default '{}'::jsonb,
  ts         timestamptz not null default now()
);
create index analytics_events_ts_idx on analytics_events(ts);
create index analytics_events_name_idx on analytics_events(name, ts);

create table email_events (
  id        bigserial primary key,
  resend_id text,
  to_email  citext,
  template  text,
  status    text not null default 'queued' check (status in ('queued','sent','delivered','bounced','complained')),
  ref_kind  text,
  ref_id    uuid,
  ts        timestamptz not null default now()
);
create index email_events_to_idx on email_events(to_email, ts desc);
create index email_events_resend_idx on email_events(resend_id);

create table files (
  id         uuid primary key default gen_random_uuid(),
  path       text unique not null,
  store      text not null default 'disk',
  size       bigint,
  mime       text,
  owner_id   uuid references users(id) on delete set null,
  scope      text not null default 'attachments',
  created_at timestamptz not null default now()
);
create index files_owner_idx on files(owner_id);
create index files_scope_idx on files(scope);

create table backups_log (
  id    bigserial primary key,
  kind  text not null,
  path  text,
  bytes bigint,
  ok    boolean not null default true,
  ts    timestamptz not null default now()
);

create table feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete set null,
  page       text,
  body       text not null,
  created_at timestamptz not null default now()
);

create table content_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  kind         text not null check (kind in ('blog','changelog')),
  title        text not null,
  body_md      text,
  status       text not null default 'draft' check (status in ('draft','approved','published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index content_posts_status_idx on content_posts(kind, status, published_at desc);

-- key/value settings: kill switches + global config
create table settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- =============================================================
-- ALTERs giving the orchestrator its state machine (Phase 5)
-- =============================================================
alter table feature_requests drop constraint if exists feature_requests_status_check;
alter table feature_requests add constraint feature_requests_status_check
  check (status in ('submitted','scoped','quoted','planned','building','review','approved','deploying','shipped','rejected','blocked'));
alter table feature_requests add column if not exists risk_class text check (risk_class in ('low','standard','high'));

alter table projects add column if not exists retainer_tier text check (retainer_tier in ('lightweight','standard','heavy'));

-- =============================================================
-- updated_at triggers for new tables
-- =============================================================
create trigger trg_quotes_updated        before update on quotes               for each row execute function set_updated_at();
create trigger trg_client_sites_updated  before update on client_sites         for each row execute function set_updated_at();
create trigger trg_capstone_updated      before update on capstone_submissions for each row execute function set_updated_at();
create trigger trg_content_posts_updated before update on content_posts        for each row execute function set_updated_at();

-- =============================================================
-- Reporting views
-- =============================================================
create view v_llm_costs_daily as
  select date_trunc('day', created_at)::date as day, purpose, model,
    sum(cost_pence) as cost_pence, sum(tokens_in) as tokens_in, sum(tokens_out) as tokens_out, count(*) as calls
  from llm_calls group by 1, 2, 3;

create view v_revenue_monthly as
  select date_trunc('month', created_at)::date as month,
    coalesce(sum(amount_gbp) filter (where status = 'succeeded'), 0) as revenue_gbp,
    count(*) filter (where status = 'succeeded') as payments
  from payments group by 1;

create view v_funnel_weekly as
  with stages as (
    select date_trunc('week', created_at)::date as week, 'application'::text as stage from applications
    union all select date_trunc('week', created_at)::date, 'quote' from quotes
    union all select date_trunc('week', created_at)::date, 'project' from projects
  )
  select week,
    count(*) filter (where stage = 'application') as applications,
    count(*) filter (where stage = 'quote') as quotes,
    count(*) filter (where stage = 'project') as projects
  from stages group by week;

-- =============================================================
-- Default kill switches
-- =============================================================
insert into settings(key, value) values
  ('auto_merge_enabled', 'true'::jsonb),
  ('outreach_enabled',   'true'::jsonb),
  ('builder_enabled',    'true'::jsonb)
on conflict (key) do nothing;
