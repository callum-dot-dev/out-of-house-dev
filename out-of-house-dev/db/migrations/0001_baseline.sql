-- =============================================================
-- 0001_baseline — consolidated current data model (ports
-- supabase/migrations/001..006), with RLS/auth.uid() removed and
-- profiles -> users. See docs/adr/0002-schema-port.md.
-- =============================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;      -- case-insensitive email

-- shared updated_at trigger fn
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =============================================================
-- users  (was profiles; own-auth columns added)
-- =============================================================
create table users (
  id                uuid primary key default gen_random_uuid(),
  email             citext unique not null,
  password_hash     text,
  full_name         text,
  company           text,
  role              text not null default 'client' check (role in ('client','developer','admin')),
  avatar_path       text,
  notify_email      boolean not null default true,
  notify_in_app     boolean not null default true,
  timezone          text default 'Europe/London',
  last_login_at     timestamptz,
  last_seen_at      timestamptz,
  terms_accepted_at timestamptz,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index users_role_idx on users(role);

-- =============================================================
-- applications  (public submissions, pre-auth)
-- =============================================================
create table applications (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  email               text not null,
  company             text,
  phone               text,
  project_type        text not null check (project_type in ('website','automation','web_app','custom_software','platform','maintenance','aiseo','lead_engine','other')),
  project_description  text not null,
  budget_range        text,
  timeline            text,
  source              text,
  status              text not null default 'pending' check (status in ('pending','approved','rejected','trash')),
  admin_notes         text,
  reviewed_by         uuid references users(id) on delete set null,
  reviewed_at         timestamptz,
  captcha_token       text,
  submitted_ip        text,
  user_agent          text,
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  created_at          timestamptz not null default now()
);
create index applications_status_idx on applications(status);

-- =============================================================
-- projects
-- =============================================================
create table projects (
  id                          uuid primary key default gen_random_uuid(),
  client_id                   uuid not null references users(id) on delete cascade,
  name                        text not null,
  project_type                text not null check (project_type in ('website','automation','web_app','custom_software','platform','maintenance','aiseo','lead_engine','other')),
  description                 text,
  status                      text not null default 'discovery' check (status in ('discovery','building','live','paused','completed')),
  created_from_application_id  uuid references applications(id) on delete set null,
  preview_url                 text,
  repo_url                    text,
  health_status               text default 'unknown' check (health_status in ('unknown','healthy','degraded','down')),
  health_checked_at           timestamptz,
  showcase_opt_in             boolean not null default false,
  slug                        text,
  archived_at                 timestamptz,
  metadata                    jsonb not null default '{}'::jsonb,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index projects_client_idx on projects(client_id);
create index projects_status_idx on projects(status);
create unique index projects_slug_uniq on projects(slug) where slug is not null;

-- =============================================================
-- feature_requests
-- =============================================================
create table feature_requests (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  created_by          uuid references users(id) on delete set null,
  title               text not null,
  description         text not null,
  priority            text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status              text not null default 'submitted' check (status in ('submitted','scoped','building','review','shipped','rejected')),
  claimed_by          uuid references users(id) on delete set null,
  estimated_hours     int,
  client_priority_rank int,
  rejection_reason    text,
  ai_estimated_hours  numeric(6,2),
  ai_suggested_priority text,
  ai_summary          text,
  target_metric       text,
  shipped_at          timestamptz,
  github_issue_number int,
  github_repo         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index feature_requests_project_idx on feature_requests(project_id);
create index feature_requests_status_idx on feature_requests(status);
create index feature_requests_claimed_idx on feature_requests(claimed_by);
create index feature_requests_client_rank_idx on feature_requests(project_id, client_priority_rank) where client_priority_rank is not null;

-- =============================================================
-- request_comments
-- =============================================================
create table request_comments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references feature_requests(id) on delete cascade,
  author_id   uuid references users(id) on delete set null,
  body        text not null,
  mentions    uuid[] default array[]::uuid[],
  edited_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index request_comments_request_idx on request_comments(request_id);

-- =============================================================
-- plan_templates  (8 types after 006)
-- =============================================================
create table plan_templates (
  id                   uuid primary key default gen_random_uuid(),
  type                 text not null check (type in ('website','automation','web_app','custom_software','platform','maintenance','aiseo','lead_engine')),
  name                 text not null,
  summary              text,
  phases               jsonb not null,
  claude_code_handoff  text not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique(type, name)
);

-- =============================================================
-- project_plans
-- =============================================================
create table project_plans (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  template_id         uuid references plan_templates(id) on delete set null,
  phases              jsonb not null,
  current_phase_index int not null default 0,
  current_step_index  int not null default 0,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index project_plans_project_idx on project_plans(project_id);

-- =============================================================
-- notifications
-- =============================================================
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  link       text,
  payload    jsonb default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on notifications(user_id, created_at desc) where read_at is null;
create index notifications_user_idx on notifications(user_id, created_at desc);

-- =============================================================
-- activity_events
-- =============================================================
create table activity_events (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  request_id uuid references feature_requests(id) on delete cascade,
  actor_id   uuid references users(id) on delete set null,
  kind       text not null,
  title      text not null,
  body       text,
  payload    jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_events_project_idx on activity_events(project_id, created_at desc);
create index activity_events_request_idx on activity_events(request_id, created_at desc);

-- =============================================================
-- attachments
-- =============================================================
create table attachments (
  id           uuid primary key default gen_random_uuid(),
  uploader_id  uuid references users(id) on delete set null,
  project_id   uuid references projects(id) on delete cascade,
  request_id   uuid references feature_requests(id) on delete cascade,
  comment_id   uuid references request_comments(id) on delete cascade,
  storage_path text not null,
  filename     text not null,
  mime_type    text,
  size_bytes   int,
  kind         text default 'file' check (kind in ('file','image','video','audio','voice')),
  duration_ms  int,
  created_at   timestamptz not null default now()
);
create index attachments_request_idx on attachments(request_id);
create index attachments_project_idx on attachments(project_id);
create index attachments_comment_idx on attachments(comment_id);

-- =============================================================
-- decisions
-- =============================================================
create table decisions (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects(id) on delete cascade,
  source_comment_id uuid references request_comments(id) on delete set null,
  summary           text not null,
  detail            text,
  confirmed         boolean default false,
  created_by        uuid references users(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index decisions_project_idx on decisions(project_id, created_at desc);

-- =============================================================
-- digests / monthly_reports / changelog_entries
-- =============================================================
create table digests (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  content_md   text not null,
  sent_at      timestamptz,
  generated_by text default 'system',
  created_at   timestamptz not null default now(),
  unique(project_id, period_start)
);
create index digests_project_idx on digests(project_id, period_start desc);

create table monthly_reports (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  metrics      jsonb default '{}'::jsonb,
  narrative_md text,
  pdf_url      text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique(project_id, period_start)
);

create table changelog_entries (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  request_id   uuid references feature_requests(id) on delete set null,
  title        text not null,
  body_md      text,
  is_public    boolean default false,
  published_at timestamptz,
  created_at   timestamptz not null default now()
);
create index changelog_project_idx on changelog_entries(project_id, published_at desc);
create index changelog_public_idx on changelog_entries(is_public, published_at desc) where is_public = true;

-- =============================================================
-- audit_events / guest_tokens / referrals / subscriptions / automation_runs
-- =============================================================
create table audit_events (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references users(id) on delete set null,
  action       text not null,
  target_table text,
  target_id    uuid,
  payload      jsonb default '{}'::jsonb,
  ip           text,
  created_at   timestamptz not null default now()
);
create index audit_events_actor_idx on audit_events(actor_id, created_at desc);
create index audit_events_target_idx on audit_events(target_table, target_id);

create table guest_tokens (
  token      text primary key,
  project_id uuid references projects(id) on delete cascade,
  request_id uuid references feature_requests(id) on delete cascade,
  scope_kind text not null check (scope_kind in ('request','project','preview')),
  created_by uuid references users(id) on delete set null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index guest_tokens_expires_idx on guest_tokens(expires_at);

create table referrals (
  id             uuid primary key default gen_random_uuid(),
  referrer_id    uuid not null references users(id) on delete cascade,
  code           text not null unique,
  referred_email text,
  application_id uuid references applications(id) on delete set null,
  status         text not null default 'pending' check (status in ('pending','converted','expired')),
  credit_amount  numeric(8,2) default 0,
  converted_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index referrals_referrer_idx on referrals(referrer_id);

create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references users(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text,
  status                 text default 'inactive',
  current_period_end     timestamptz,
  cancel_at              timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index subscriptions_client_idx on subscriptions(client_id);

create table automation_runs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  run_count   int not null default 1,
  hours_saved numeric(8,2) default 0,
  status      text default 'success',
  metadata    jsonb default '{}'::jsonb,
  ran_at      timestamptz not null default now()
);
create index automation_runs_project_idx on automation_runs(project_id, ran_at desc);

-- =============================================================
-- project_documents (document room)
-- =============================================================
create table project_documents (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects(id) on delete cascade,
  uploaded_by        uuid references users(id) on delete set null,
  title              text not null,
  description        text,
  stage              text not null default 'general' check (stage in ('discovery','design','build','review','ship','general','ai-output')),
  category           text not null default 'doc' check (category in ('design','doc','spec','code-review','ai-output','meeting-notes','asset','other')),
  storage_path       text,
  external_url       text,
  thumbnail_path     text,
  ai_generated       boolean not null default false,
  ai_model           text,
  visible_to_client  boolean not null default true,
  pinned             boolean not null default false,
  size_bytes         int,
  mime_type          text,
  version            int not null default 1,
  parent_document_id uuid references project_documents(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index project_documents_project_idx on project_documents(project_id, created_at desc);
create index project_documents_stage_idx on project_documents(project_id, stage);
create index project_documents_visible_idx on project_documents(project_id, visible_to_client);

-- =============================================================
-- Education: programmes / cohorts / enrollments / sessions / certificates
-- =============================================================
create table programmes (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  audience        text not null check (audience in ('developer','business')),
  name            text not null,
  tagline         text,
  summary         text,
  duration_weeks  int,
  price_gbp       numeric(10,2),
  price_label     text,
  cert_difficulty text,
  certificate     boolean not null default false,
  flag            text,
  is_active       boolean not null default true,
  module_outline  jsonb default '[]'::jsonb,
  outcomes        jsonb default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index programmes_audience_idx on programmes(audience);
create index programmes_active_idx on programmes(is_active);

create table cohorts (
  id             uuid primary key default gen_random_uuid(),
  programme_id   uuid not null references programmes(id) on delete cascade,
  start_date     date not null,
  end_date       date,
  capacity       int not null default 20,
  enrolled_count int not null default 0,
  status         text not null default 'open' check (status in ('open','filling','closed','running','completed','cancelled')),
  slack_channel  text,
  notion_url     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(programme_id, start_date)
);
create index cohorts_programme_idx on cohorts(programme_id);
create index cohorts_status_idx on cohorts(status);

create table enrollments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  programme_id    uuid not null references programmes(id) on delete restrict,
  cohort_id       uuid references cohorts(id) on delete set null,
  status          text not null default 'pending' check (status in ('pending','paid','active','completed','dropped','refunded')),
  payment_id      uuid,
  amount_paid_gbp numeric(10,2),
  enrolled_at     timestamptz default now(),
  completed_at    timestamptz,
  capstone_url    text,
  capstone_grade  text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id, programme_id, cohort_id)
);
create index enrollments_user_idx on enrollments(user_id);
create index enrollments_cohort_idx on enrollments(cohort_id);
create index enrollments_status_idx on enrollments(status);

create table cohort_sessions (
  id            uuid primary key default gen_random_uuid(),
  cohort_id     uuid not null references cohorts(id) on delete cascade,
  scheduled_at  timestamptz not null,
  duration_min  int default 90,
  title         text not null,
  description   text,
  recording_url text,
  zoom_link     text,
  status        text not null default 'scheduled' check (status in ('scheduled','live','done','cancelled')),
  created_at    timestamptz not null default now()
);
create index cohort_sessions_cohort_idx on cohort_sessions(cohort_id, scheduled_at);

create table certificates (
  id               uuid primary key default gen_random_uuid(),
  enrollment_id    uuid not null references enrollments(id) on delete cascade,
  user_id          uuid not null references users(id) on delete cascade,
  programme_id     uuid not null references programmes(id) on delete cascade,
  certificate_code text unique not null,
  pdf_url          text,
  verification_url text,
  grade            text,
  issued_at        timestamptz not null default now(),
  revoked_at       timestamptz
);
create index certificates_user_idx on certificates(user_id);

create table coaching_bookings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  track           text not null check (track in ('developer','business')),
  scheduled_at    timestamptz not null,
  duration_min    int default 60,
  hourly_rate_gbp numeric(8,2) not null default 100,
  total_gbp       numeric(10,2) not null default 100,
  payment_id      uuid,
  status          text not null default 'pending' check (status in ('pending','paid','done','cancelled','refunded','no_show')),
  topic           text,
  zoom_link       text,
  notes           text,
  created_at      timestamptz not null default now()
);
create index coaching_bookings_user_idx on coaching_bookings(user_id, scheduled_at);
create index coaching_bookings_status_idx on coaching_bookings(status);

-- =============================================================
-- payments  (Stripe mirror)
-- =============================================================
create table payments (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references users(id) on delete set null,
  amount_gbp               numeric(10,2) not null,
  currency                 text not null default 'gbp',
  stripe_session_id        text unique,
  stripe_payment_intent_id text unique,
  status                   text not null default 'pending' check (status in ('pending','succeeded','failed','refunded','partial_refund')),
  product_type             text not null check (product_type in ('coaching_hour','course','programme','retainer','one_off_build','saas_subscription','custom')),
  product_ref              text,
  metadata                 jsonb default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index payments_user_idx on payments(user_id, created_at desc);
create index payments_status_idx on payments(status);
create index payments_product_idx on payments(product_type, product_ref);

alter table enrollments       add constraint enrollments_payment_id_fkey       foreign key (payment_id) references payments(id) on delete set null;
alter table coaching_bookings add constraint coaching_bookings_payment_id_fkey foreign key (payment_id) references payments(id) on delete set null;

-- =============================================================
-- SaaS apps + LogoVault
-- =============================================================
create table saas_apps (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  status     text not null default 'planned' check (status in ('planned','alpha','beta','live','sunset')),
  tagline    text,
  summary    text,
  created_at timestamptz not null default now()
);

create table logovault_brands (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  display_name   text not null,
  aliases        text[] default array[]::text[],
  primary_domain text,
  hex_primary    text,
  hex_secondary  text,
  description    text,
  source         text not null default 'simpleicons' check (source in ('simpleicons','brandfetch','clearbit','manual','ai_generated','user_upload')),
  ai_tags        jsonb default '{}'::jsonb,
  takedown       boolean not null default false,
  search_tsv     tsvector,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index logovault_brands_domain_idx on logovault_brands(primary_domain);
create index logovault_brands_search_idx on logovault_brands using gin(search_tsv);

create table logovault_assets (
  id           uuid primary key default gen_random_uuid(),
  brand_id     uuid not null references logovault_brands(id) on delete cascade,
  format       text not null check (format in ('svg','png','jpg','webp')),
  variant      text not null check (variant in ('original','black','white','transparent','square_padded','wordmark','icon')),
  width        int,
  height       int,
  storage_path text,
  external_url text,
  size_bytes   int,
  uploaded_by  uuid references users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique(brand_id, format, variant, width, height)
);
create index logovault_assets_brand_idx on logovault_assets(brand_id);

create table api_keys (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  saas_app_slug      text not null references saas_apps(slug) on delete cascade,
  key_hash           text not null,
  key_prefix         text not null,
  name               text,
  scopes             text[] default array[]::text[],
  tier               text not null default 'free' check (tier in ('free','indie','studio','agency')),
  rate_limit_per_min int default 60,
  created_at         timestamptz not null default now(),
  last_used_at       timestamptz,
  revoked_at         timestamptz
);
create index api_keys_user_idx on api_keys(user_id);
create unique index api_keys_hash_uniq on api_keys(key_hash);

create table api_usage (
  id            bigserial primary key,
  api_key_id    uuid references api_keys(id) on delete set null,
  user_id       uuid references users(id) on delete set null,
  saas_app_slug text not null,
  endpoint      text,
  status_code   int,
  latency_ms    int,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index api_usage_user_day_idx on api_usage(user_id, created_at);
create index api_usage_app_day_idx on api_usage(saas_app_slug, created_at);

-- =============================================================
-- Lead engine
-- =============================================================
create table lead_icps (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references users(id) on delete set null,
  client_id   uuid references users(id) on delete cascade,
  name        text not null,
  description text,
  prompt      text not null,
  rules       jsonb default '{}'::jsonb,
  channels    text[] default array[]::text[],
  threshold   numeric(4,2) default 6.0,
  approval_mode text not null default 'manual' check (approval_mode in ('manual','auto')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index lead_icps_client_idx on lead_icps(client_id);

create table lead_sources (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  name                text not null,
  kind                text not null check (kind in ('places','companies_house','yelp','reddit','linkedin','news','custom','manual')),
  enabled             boolean not null default true,
  rate_limit_per_hour int default 1000,
  config              jsonb default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create table leads (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references users(id) on delete cascade,
  icp_id           uuid references lead_icps(id) on delete set null,
  source_id        uuid references lead_sources(id) on delete set null,
  company_name     text not null,
  domain           text,
  website_url      text,
  website_status   text check (website_status in ('none','wix','squarespace','wordpress','custom','broken','unknown')),
  region           text,
  industry         text,
  employee_count   int,
  contact_name     text,
  contact_email    text,
  contact_phone    text,
  contact_linkedin text,
  enrichment       jsonb default '{}'::jsonb,
  llm_score        numeric(4,2),
  llm_reason       text,
  status           text not null default 'new' check (status in ('new','enriched','scored','accepted','contacted','replied','meeting','won','lost','rejected','suppressed')),
  metadata         jsonb default '{}'::jsonb,
  discovered_at    timestamptz not null default now(),
  enriched_at      timestamptz,
  scored_at        timestamptz,
  contacted_at     timestamptz,
  replied_at       timestamptz,
  won_at           timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index leads_client_idx on leads(client_id, status);
create index leads_status_idx on leads(status);
create index leads_score_idx on leads(llm_score desc nulls last);

create table lead_signals (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  kind        text not null,
  detail      text,
  url         text,
  weight      numeric(5,2) default 1.0,
  detected_at timestamptz not null default now()
);
create index lead_signals_lead_idx on lead_signals(lead_id);

create table outreach_campaigns (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid references users(id) on delete cascade,
  icp_id            uuid references lead_icps(id) on delete set null,
  name              text not null,
  channel           text not null check (channel in ('email','linkedin','x','sms')),
  voice_prompt      text,
  from_address      text,
  status            text not null default 'draft' check (status in ('draft','running','paused','done')),
  send_rate_per_day int default 50,
  approval_mode     text not null default 'manual' check (approval_mode in ('manual','auto')),
  created_at        timestamptz not null default now()
);

create table outreach_messages (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references outreach_campaigns(id) on delete cascade,
  lead_id       uuid not null references leads(id) on delete cascade,
  channel       text not null,
  subject       text,
  body          text not null,
  body_html     text,
  status        text not null default 'drafted' check (status in ('drafted','approved','rejected','queued','sent','failed','replied','bounced')),
  scheduled_for timestamptz,
  sent_at       timestamptz,
  reply_text    text,
  reply_at      timestamptz,
  created_at    timestamptz not null default now()
);
create index outreach_messages_campaign_idx on outreach_messages(campaign_id);
create index outreach_messages_status_idx on outreach_messages(status);

-- =============================================================
-- Ads
-- =============================================================
create table ad_campaigns (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references users(id) on delete cascade,
  platform         text not null check (platform in ('meta','google','linkedin','tiktok','x')),
  external_id      text,
  name             text not null,
  status           text not null default 'draft' check (status in ('draft','active','paused','done')),
  daily_budget_gbp numeric(8,2),
  objective        text,
  audience_json    jsonb default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create table ad_creatives (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references ad_campaigns(id) on delete cascade,
  external_id  text,
  variant      text,
  headline     text,
  body         text,
  cta          text,
  image_url    text,
  video_url    text,
  status       text not null default 'draft' check (status in ('draft','approved','live','paused','retired')),
  ai_generated boolean not null default true,
  created_at   timestamptz not null default now()
);

create table ad_performance (
  id          bigserial primary key,
  creative_id uuid not null references ad_creatives(id) on delete cascade,
  campaign_id uuid not null references ad_campaigns(id) on delete cascade,
  date        date not null,
  impressions int default 0,
  clicks      int default 0,
  cost_gbp    numeric(10,2) default 0,
  conversions int default 0,
  unique(creative_id, date)
);
create index ad_perf_campaign_idx on ad_performance(campaign_id, date);

-- =============================================================
-- Claude orchestrator runs
-- =============================================================
create table claude_runs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade,
  request_id   uuid references feature_requests(id) on delete set null,
  triggered_by uuid references users(id) on delete set null,
  kind         text not null check (kind in ('scope','quote','plan','build','build_prompt','review','test','deploy','docs','fix','adhoc')),
  status       text not null default 'queued' check (status in ('queued','running','awaiting_review','succeeded','failed','cancelled')),
  prompt       text,
  result_md    text,
  branch       text,
  pr_url       text,
  preview_url  text,
  tokens_in    int,
  tokens_out   int,
  cost_gbp     numeric(8,4),
  duration_ms  int,
  automerged   boolean not null default false,
  metadata     jsonb default '{}'::jsonb,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index claude_runs_project_idx on claude_runs(project_id, created_at desc);
create index claude_runs_status_idx on claude_runs(status);
create index claude_runs_request_idx on claude_runs(request_id, kind);

-- =============================================================
-- AISEO
-- =============================================================
create table aiseo_audits (
  id         uuid primary key default gen_random_uuid(),
  domain     text not null,
  user_id    uuid references users(id) on delete set null,
  score      int,
  grade      text,
  result     jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index aiseo_audits_domain_idx on aiseo_audits(domain, created_at desc);
create index aiseo_audits_user_idx on aiseo_audits(user_id, created_at desc);

create table aiseo_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  domain      text not null,
  tier        text not null default 'foundation' check (tier in ('foundation','authority','enterprise')),
  questions   jsonb default '[]'::jsonb,
  engines     text[] default array['chatgpt','claude','perplexity','google_aio','bing_copilot','you']::text[],
  status      text not null default 'active' check (status in ('active','paused','cancelled')),
  next_run_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, domain)
);

create table aiseo_rankings (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references aiseo_subscriptions(id) on delete cascade,
  engine          text not null,
  question        text not null,
  recorded_at     timestamptz not null default now(),
  brand_present   boolean not null default false,
  rank_position   int,
  cited_url       text,
  snippet         text,
  raw_response    text,
  metadata        jsonb default '{}'::jsonb
);
create index aiseo_rankings_sub_idx on aiseo_rankings(subscription_id, recorded_at desc);
create index aiseo_rankings_engine_idx on aiseo_rankings(subscription_id, engine, recorded_at desc);

-- =============================================================
-- waitlist
-- =============================================================
create table waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  product    text not null,
  source     text,
  metadata   jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(email, product)
);
create index waitlist_product_idx on waitlist(product, created_at desc);

-- =============================================================
-- updated_at triggers (pure; no auth)
-- =============================================================
create trigger trg_users_updated             before update on users             for each row execute function set_updated_at();
create trigger trg_projects_updated           before update on projects           for each row execute function set_updated_at();
create trigger trg_feature_requests_updated   before update on feature_requests   for each row execute function set_updated_at();
create trigger trg_plan_templates_updated     before update on plan_templates     for each row execute function set_updated_at();
create trigger trg_project_plans_updated      before update on project_plans      for each row execute function set_updated_at();
create trigger trg_subscriptions_updated      before update on subscriptions      for each row execute function set_updated_at();
create trigger trg_project_documents_updated  before update on project_documents  for each row execute function set_updated_at();
create trigger trg_programmes_updated         before update on programmes         for each row execute function set_updated_at();
create trigger trg_cohorts_updated            before update on cohorts            for each row execute function set_updated_at();
create trigger trg_enrollments_updated        before update on enrollments        for each row execute function set_updated_at();
create trigger trg_logovault_brands_updated   before update on logovault_brands   for each row execute function set_updated_at();
create trigger trg_leads_updated              before update on leads              for each row execute function set_updated_at();
create trigger trg_payments_updated           before update on payments           for each row execute function set_updated_at();
create trigger trg_aiseo_subs_updated         before update on aiseo_subscriptions for each row execute function set_updated_at();

-- cohort enrolled_count maintenance
create or replace function recount_cohort_enrolled()
returns trigger language plpgsql as $$
declare v_cohort uuid;
begin
  v_cohort := coalesce(new.cohort_id, old.cohort_id);
  if v_cohort is null then return coalesce(new, old); end if;
  update cohorts set enrolled_count = (
    select count(*) from enrollments e
    where e.cohort_id = v_cohort and e.status in ('paid','active','completed')
  ) where id = v_cohort;
  return coalesce(new, old);
end $$;
create trigger trg_enroll_recount after insert or update or delete on enrollments
  for each row execute function recount_cohort_enrolled();

-- LogoVault search vector
create or replace function logovault_brand_tsv_refresh()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.display_name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.slug,'')),         'A') ||
    setweight(to_tsvector('simple', coalesce(new.primary_domain,'')),'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.aliases, array[]::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.description,'')), 'C');
  return new;
end $$;
create trigger trg_logovault_tsv before insert or update on logovault_brands
  for each row execute function logovault_brand_tsv_refresh();

-- =============================================================
-- Views
-- =============================================================
create view user_unread_count as
  select user_id, count(*) as unread
  from notifications where read_at is null group by user_id;

create view certificate_verifications as
  select
    c.certificate_code,
    c.issued_at,
    c.revoked_at,
    c.grade,
    p.name as programme_name,
    p.audience as programme_audience,
    p.duration_weeks,
    u.full_name as recipient_name
  from certificates c
  join programmes p on p.id = c.programme_id
  left join users u on u.id = c.user_id;
