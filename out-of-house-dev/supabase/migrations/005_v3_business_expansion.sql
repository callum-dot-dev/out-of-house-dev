-- =============================================================
-- out-of-house.dev — v3 business expansion
--
-- Adds:
--   * Programmes / Courses / Cohorts / Enrollments / Sessions / Certificates
--   * Coaching bookings + sessions
--   * Payments (Stripe checkout sessions + invoices mirror)
--   * SaaS apps registry (LogoVault + future)
--   * LogoVault: brand entries + brand_assets + api_keys + api_usage
--   * Leads + lead_sources + lead_signals + outreach (campaigns, templates, messages)
--   * Ads (campaigns, creatives, performance)
--   * Claude orchestrator runs (build pipeline tracking)
--   * Newsletter / waitlist
--
-- Idempotent. Safe to re-run.
-- =============================================================

-- =============================================================
-- 1. Courses, programmes, coaching
-- =============================================================
create table if not exists public.programmes (
  id              uuid primary key default uuid_generate_v4(),
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

create index if not exists programmes_audience_idx on public.programmes(audience);
create index if not exists programmes_active_idx on public.programmes(is_active);

create table if not exists public.cohorts (
  id              uuid primary key default uuid_generate_v4(),
  programme_id    uuid not null references public.programmes(id) on delete cascade,
  start_date      date not null,
  end_date        date,
  capacity        int not null default 20,
  enrolled_count  int not null default 0,
  status          text not null default 'open' check (status in ('open','filling','closed','running','completed','cancelled')),
  slack_channel   text,
  notion_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(programme_id, start_date)
);

create index if not exists cohorts_programme_idx on public.cohorts(programme_id);
create index if not exists cohorts_status_idx on public.cohorts(status);

create table if not exists public.enrollments (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  programme_id        uuid not null references public.programmes(id) on delete restrict,
  cohort_id           uuid references public.cohorts(id) on delete set null,
  status              text not null default 'pending'
                        check (status in ('pending','paid','active','completed','dropped','refunded')),
  payment_id          uuid,                                     -- forward ref; FK added later
  amount_paid_gbp     numeric(10,2),
  enrolled_at         timestamptz default now(),
  completed_at        timestamptz,
  capstone_url        text,
  capstone_grade      text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(user_id, programme_id, cohort_id)
);

create index if not exists enrollments_user_idx on public.enrollments(user_id);
create index if not exists enrollments_cohort_idx on public.enrollments(cohort_id);
create index if not exists enrollments_status_idx on public.enrollments(status);

create table if not exists public.cohort_sessions (
  id               uuid primary key default uuid_generate_v4(),
  cohort_id        uuid not null references public.cohorts(id) on delete cascade,
  scheduled_at     timestamptz not null,
  duration_min     int default 90,
  title            text not null,
  description      text,
  recording_url    text,
  zoom_link        text,
  status           text not null default 'scheduled' check (status in ('scheduled','live','done','cancelled')),
  created_at       timestamptz not null default now()
);

create index if not exists cohort_sessions_cohort_idx on public.cohort_sessions(cohort_id, scheduled_at);

create table if not exists public.certificates (
  id                 uuid primary key default uuid_generate_v4(),
  enrollment_id      uuid not null references public.enrollments(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  programme_id       uuid not null references public.programmes(id) on delete cascade,
  certificate_code   text unique not null,                         -- short public-shareable code
  pdf_url            text,
  verification_url   text,                                          -- public verify page
  grade              text,
  issued_at          timestamptz not null default now(),
  revoked_at         timestamptz
);

create index if not exists certificates_user_idx on public.certificates(user_id);
create unique index if not exists certificates_code_uniq on public.certificates(certificate_code);

create table if not exists public.coaching_bookings (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  track              text not null check (track in ('developer','business')),
  scheduled_at       timestamptz not null,
  duration_min       int default 60,
  hourly_rate_gbp    numeric(8,2) not null default 100,
  total_gbp          numeric(10,2) not null default 100,
  payment_id         uuid,                                          -- forward ref; FK added later
  status             text not null default 'pending'
                       check (status in ('pending','paid','done','cancelled','refunded','no_show')),
  topic              text,
  zoom_link          text,
  notes              text,
  created_at         timestamptz not null default now()
);

create index if not exists coaching_bookings_user_idx on public.coaching_bookings(user_id, scheduled_at);
create index if not exists coaching_bookings_status_idx on public.coaching_bookings(status);

-- =============================================================
-- 2. Payments (Stripe)
-- =============================================================
create table if not exists public.payments (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid references public.profiles(id) on delete set null,
  amount_gbp               numeric(10,2) not null,
  currency                 text not null default 'gbp',
  stripe_session_id        text unique,
  stripe_payment_intent_id text unique,
  status                   text not null default 'pending'
                             check (status in ('pending','succeeded','failed','refunded','partial_refund')),
  product_type             text not null check (product_type in (
                             'coaching_hour','course','programme','retainer','one_off_build',
                             'saas_subscription','custom'
                           )),
  product_ref              text,                                    -- e.g. 'course:ai-builder-6w', 'coaching:dev', 'subscription:logovault:studio'
  metadata                 jsonb default '{}'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists payments_user_idx on public.payments(user_id, created_at desc);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_product_idx on public.payments(product_type, product_ref);

-- Wire back enrollment + coaching FKs
alter table public.enrollments       drop constraint if exists enrollments_payment_id_fkey;
alter table public.enrollments       add  constraint enrollments_payment_id_fkey       foreign key (payment_id) references public.payments(id) on delete set null;
alter table public.coaching_bookings drop constraint if exists coaching_bookings_payment_id_fkey;
alter table public.coaching_bookings add  constraint coaching_bookings_payment_id_fkey foreign key (payment_id) references public.payments(id) on delete set null;

-- =============================================================
-- 3. SaaS apps registry
-- =============================================================
create table if not exists public.saas_apps (
  id              uuid primary key default uuid_generate_v4(),
  slug            text unique not null,
  name            text not null,
  status          text not null default 'planned' check (status in ('planned','alpha','beta','live','sunset')),
  tagline         text,
  summary         text,
  created_at      timestamptz not null default now()
);

-- LogoVault tables
create table if not exists public.logovault_brands (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  display_name  text not null,
  aliases       text[] default array[]::text[],
  primary_domain text,
  hex_primary   text,
  hex_secondary text,
  description   text,
  source        text not null default 'simpleicons'
                 check (source in ('simpleicons','brandfetch','clearbit','manual','ai_generated','user_upload')),
  ai_tags       jsonb default '{}'::jsonb,
  search_tsv    tsvector,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists logovault_brands_domain_idx on public.logovault_brands(primary_domain);
create index if not exists logovault_brands_search_idx on public.logovault_brands using gin(search_tsv);

create table if not exists public.logovault_assets (
  id          uuid primary key default uuid_generate_v4(),
  brand_id    uuid not null references public.logovault_brands(id) on delete cascade,
  format      text not null check (format in ('svg','png','jpg','webp')),
  variant     text not null check (variant in ('original','black','white','transparent','square_padded','wordmark','icon')),
  width       int,
  height      int,
  storage_path text,
  external_url text,
  size_bytes  int,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique(brand_id, format, variant, width, height)
);

create index if not exists logovault_assets_brand_idx on public.logovault_assets(brand_id);

-- API keys (issued per user, scoped per SaaS app)
create table if not exists public.api_keys (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  saas_app_slug text not null references public.saas_apps(slug) on delete cascade,
  key_hash      text not null,
  key_prefix    text not null,        -- 'olv_' + first 4 chars (UX only, never the secret)
  name          text,
  scopes        text[] default array[]::text[],
  rate_limit_per_min int default 60,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

create index if not exists api_keys_user_idx on public.api_keys(user_id);
create unique index if not exists api_keys_hash_uniq on public.api_keys(key_hash);

create table if not exists public.api_usage (
  id            bigserial primary key,
  api_key_id    uuid references public.api_keys(id) on delete set null,
  user_id       uuid references public.profiles(id) on delete set null,
  saas_app_slug text not null,
  endpoint      text,
  status_code   int,
  latency_ms    int,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists api_usage_user_day_idx on public.api_usage(user_id, created_at);
create index if not exists api_usage_app_day_idx  on public.api_usage(saas_app_slug, created_at);

-- =============================================================
-- 4. Leads (autonomous lead engine)
-- =============================================================
create table if not exists public.lead_icps (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid references public.profiles(id) on delete set null,
  client_id     uuid references public.profiles(id) on delete cascade,
  name          text not null,
  description   text,
  prompt        text not null,                         -- the LLM instruction
  rules         jsonb default '{}'::jsonb,             -- structured filters
  channels      text[] default array[]::text[],        -- ['email','linkedin','x']
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists lead_icps_client_idx on public.lead_icps(client_id);

create table if not exists public.lead_sources (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  kind        text not null check (kind in ('places','companies_house','yelp','reddit','linkedin','news','custom','manual')),
  enabled     boolean not null default true,
  rate_limit_per_hour int default 1000,
  config      jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.leads (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid references public.profiles(id) on delete cascade,
  icp_id           uuid references public.lead_icps(id) on delete set null,
  source_id        uuid references public.lead_sources(id) on delete set null,
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
  status           text not null default 'new'
                     check (status in ('new','enriched','scored','accepted','contacted','replied','meeting','won','lost','rejected','suppressed')),
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

create index if not exists leads_client_idx on public.leads(client_id, status);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_score_idx  on public.leads(llm_score desc nulls last);

create table if not exists public.lead_signals (
  id           uuid primary key default uuid_generate_v4(),
  lead_id      uuid not null references public.leads(id) on delete cascade,
  kind         text not null,                            -- 'no_website', 'hiring_ai', 'just_raised', etc
  detail       text,
  url          text,
  weight       numeric(5,2) default 1.0,
  detected_at  timestamptz not null default now()
);

create index if not exists lead_signals_lead_idx on public.lead_signals(lead_id);

-- Outreach
create table if not exists public.outreach_campaigns (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid references public.profiles(id) on delete cascade,
  icp_id        uuid references public.lead_icps(id) on delete set null,
  name          text not null,
  channel       text not null check (channel in ('email','linkedin','x','sms')),
  voice_prompt  text,                                    -- "write like this"
  status        text not null default 'draft' check (status in ('draft','running','paused','done')),
  send_rate_per_day int default 50,
  approval_mode  text not null default 'manual' check (approval_mode in ('manual','auto')),
  created_at    timestamptz not null default now()
);

create table if not exists public.outreach_messages (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references public.outreach_campaigns(id) on delete cascade,
  lead_id       uuid not null references public.leads(id) on delete cascade,
  channel       text not null,
  subject       text,
  body          text not null,
  body_html     text,
  status        text not null default 'drafted'
                  check (status in ('drafted','approved','rejected','queued','sent','failed','replied','bounced')),
  scheduled_for timestamptz,
  sent_at       timestamptz,
  reply_text    text,
  reply_at      timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists outreach_messages_campaign_idx on public.outreach_messages(campaign_id);
create index if not exists outreach_messages_status_idx on public.outreach_messages(status);

-- =============================================================
-- 5. Ads engine
-- =============================================================
create table if not exists public.ad_campaigns (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid references public.profiles(id) on delete cascade,
  platform      text not null check (platform in ('meta','google','linkedin','tiktok','x')),
  external_id   text,
  name          text not null,
  status        text not null default 'draft' check (status in ('draft','active','paused','done')),
  daily_budget_gbp numeric(8,2),
  objective     text,
  audience_json jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.ad_creatives (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references public.ad_campaigns(id) on delete cascade,
  external_id   text,
  variant       text,
  headline      text,
  body          text,
  cta           text,
  image_url     text,
  video_url     text,
  status        text not null default 'draft' check (status in ('draft','approved','live','paused','retired')),
  ai_generated  boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.ad_performance (
  id            bigserial primary key,
  creative_id   uuid not null references public.ad_creatives(id) on delete cascade,
  campaign_id   uuid not null references public.ad_campaigns(id) on delete cascade,
  date          date not null,
  impressions   int default 0,
  clicks        int default 0,
  cost_gbp      numeric(10,2) default 0,
  conversions   int default 0,
  unique(creative_id, date)
);

create index if not exists ad_perf_campaign_idx on public.ad_performance(campaign_id, date);

-- =============================================================
-- 6. Claude orchestrator runs (build pipeline)
-- =============================================================
create table if not exists public.claude_runs (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid references public.projects(id) on delete cascade,
  request_id    uuid references public.feature_requests(id) on delete set null,
  triggered_by  uuid references public.profiles(id) on delete set null,
  kind          text not null check (kind in (
                  'scope','plan','build','review','test','deploy','docs','fix','adhoc'
                )),
  status        text not null default 'queued'
                  check (status in ('queued','running','awaiting_review','succeeded','failed','cancelled')),
  prompt        text,
  result_md     text,
  branch        text,
  pr_url        text,
  preview_url   text,
  tokens_in     int,
  tokens_out    int,
  cost_gbp      numeric(8,4),
  duration_ms   int,
  metadata      jsonb default '{}'::jsonb,
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists claude_runs_project_idx on public.claude_runs(project_id, created_at desc);
create index if not exists claude_runs_status_idx on public.claude_runs(status);

-- =============================================================
-- 7a. AISEO audits + monitoring
-- =============================================================
create table if not exists public.aiseo_audits (
  id          uuid primary key default uuid_generate_v4(),
  domain      text not null,
  user_id     uuid references public.profiles(id) on delete set null,
  score       int,
  grade       text,
  result      jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists aiseo_audits_domain_idx on public.aiseo_audits(domain, created_at desc);
create index if not exists aiseo_audits_user_idx on public.aiseo_audits(user_id, created_at desc);

create table if not exists public.aiseo_subscriptions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  domain          text not null,
  tier            text not null default 'foundation' check (tier in ('foundation','authority','enterprise')),
  questions       jsonb default '[]'::jsonb,             -- buyer-intent questions to track monthly
  engines         text[] default array['chatgpt','claude','perplexity','google_aio','bing_copilot','you']::text[],
  status          text not null default 'active' check (status in ('active','paused','cancelled')),
  next_run_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id, domain)
);

create table if not exists public.aiseo_rankings (
  id            uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references public.aiseo_subscriptions(id) on delete cascade,
  engine        text not null,
  question      text not null,
  recorded_at   timestamptz not null default now(),
  brand_present boolean not null default false,
  rank_position int,                                       -- ordinal mention in answer
  cited_url     text,
  snippet       text,
  raw_response  text,
  metadata      jsonb default '{}'::jsonb
);

create index if not exists aiseo_rankings_sub_idx on public.aiseo_rankings(subscription_id, recorded_at desc);
create index if not exists aiseo_rankings_engine_idx on public.aiseo_rankings(subscription_id, engine, recorded_at desc);

alter table public.aiseo_audits          enable row level security;
alter table public.aiseo_subscriptions   enable row level security;
alter table public.aiseo_rankings        enable row level security;

drop policy if exists "aiseo public insert" on public.aiseo_audits;
create policy "aiseo public insert" on public.aiseo_audits for insert with check (true);
drop policy if exists "aiseo own read" on public.aiseo_audits;
create policy "aiseo own read" on public.aiseo_audits for select using (user_id is null or auth.uid() = user_id or public.is_admin());

drop policy if exists "aiseo subs own" on public.aiseo_subscriptions;
create policy "aiseo subs own" on public.aiseo_subscriptions for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "aiseo rankings own read" on public.aiseo_rankings;
create policy "aiseo rankings own read" on public.aiseo_rankings for select using (
  public.is_developer_or_admin()
  or exists (select 1 from public.aiseo_subscriptions s where s.id = aiseo_rankings.subscription_id and s.user_id = auth.uid())
);

drop policy if exists "aiseo rankings dev write" on public.aiseo_rankings;
create policy "aiseo rankings dev write" on public.aiseo_rankings for all
  using (public.is_developer_or_admin())
  with check (public.is_developer_or_admin());

drop trigger if exists trg_aiseo_subs_updated on public.aiseo_subscriptions;
create trigger trg_aiseo_subs_updated before update on public.aiseo_subscriptions
  for each row execute function public.set_updated_at();

-- =============================================================
-- 7. Newsletter / waitlist
-- =============================================================
create table if not exists public.waitlist (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null,
  product     text not null,           -- 'logovault','prompt-locker','course:ai-builder-6w' etc
  source      text,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique(email, product)
);

create index if not exists waitlist_product_idx on public.waitlist(product, created_at desc);

-- =============================================================
-- Trigger glue: updated_at + lead enrichment_at convenience
-- =============================================================
drop trigger if exists trg_programmes_updated  on public.programmes;
create trigger trg_programmes_updated  before update on public.programmes  for each row execute function public.set_updated_at();
drop trigger if exists trg_cohorts_updated     on public.cohorts;
create trigger trg_cohorts_updated     before update on public.cohorts     for each row execute function public.set_updated_at();
drop trigger if exists trg_enrollments_updated on public.enrollments;
create trigger trg_enrollments_updated before update on public.enrollments for each row execute function public.set_updated_at();
drop trigger if exists trg_logovault_brands_updated on public.logovault_brands;
create trigger trg_logovault_brands_updated before update on public.logovault_brands for each row execute function public.set_updated_at();
drop trigger if exists trg_leads_updated on public.leads;
create trigger trg_leads_updated before update on public.leads for each row execute function public.set_updated_at();
drop trigger if exists trg_payments_updated on public.payments;
create trigger trg_payments_updated before update on public.payments for each row execute function public.set_updated_at();

-- Auto-update cohort enrolled_count when enrollments change
create or replace function public.recount_cohort_enrolled()
returns trigger language plpgsql security definer as $$
declare
  v_cohort uuid;
begin
  v_cohort := coalesce(new.cohort_id, old.cohort_id);
  if v_cohort is null then return coalesce(new, old); end if;
  update public.cohorts
    set enrolled_count = (
      select count(*) from public.enrollments e
      where e.cohort_id = v_cohort and e.status in ('paid','active','completed')
    )
  where id = v_cohort;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_enroll_recount on public.enrollments;
create trigger trg_enroll_recount
  after insert or update or delete on public.enrollments
  for each row execute function public.recount_cohort_enrolled();

-- LogoVault: keep search vector populated
create or replace function public.logovault_brand_tsv_refresh()
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

drop trigger if exists trg_logovault_tsv on public.logovault_brands;
create trigger trg_logovault_tsv
  before insert or update on public.logovault_brands
  for each row execute function public.logovault_brand_tsv_refresh();

-- =============================================================
-- RLS
-- =============================================================
alter table public.programmes          enable row level security;
alter table public.cohorts             enable row level security;
alter table public.enrollments         enable row level security;
alter table public.cohort_sessions     enable row level security;
alter table public.certificates        enable row level security;
alter table public.coaching_bookings   enable row level security;
alter table public.payments            enable row level security;
alter table public.saas_apps           enable row level security;
alter table public.logovault_brands    enable row level security;
alter table public.logovault_assets    enable row level security;
alter table public.api_keys            enable row level security;
alter table public.api_usage           enable row level security;
alter table public.lead_icps           enable row level security;
alter table public.lead_sources        enable row level security;
alter table public.leads               enable row level security;
alter table public.lead_signals        enable row level security;
alter table public.outreach_campaigns  enable row level security;
alter table public.outreach_messages   enable row level security;
alter table public.ad_campaigns        enable row level security;
alter table public.ad_creatives        enable row level security;
alter table public.ad_performance      enable row level security;
alter table public.claude_runs         enable row level security;
alter table public.waitlist            enable row level security;

-- Programmes / cohorts / sessions = public read, admin write
drop policy if exists "programmes public read" on public.programmes;
create policy "programmes public read"  on public.programmes for select using (is_active = true or public.is_developer_or_admin());
drop policy if exists "programmes admin write" on public.programmes;
create policy "programmes admin write"  on public.programmes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "cohorts public read" on public.cohorts;
create policy "cohorts public read"     on public.cohorts for select using (true);
drop policy if exists "cohorts admin write" on public.cohorts;
create policy "cohorts admin write"     on public.cohorts for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sessions enroll read" on public.cohort_sessions;
create policy "sessions enroll read"     on public.cohort_sessions for select using (
  public.is_developer_or_admin()
  or exists (
    select 1 from public.enrollments e
    where e.cohort_id = cohort_sessions.cohort_id and e.user_id = auth.uid()
      and e.status in ('paid','active','completed')
  )
);
drop policy if exists "sessions dev write" on public.cohort_sessions;
create policy "sessions dev write"        on public.cohort_sessions for all
  using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

-- Enrollments = own + admin
drop policy if exists "enroll own read" on public.enrollments;
create policy "enroll own read"  on public.enrollments for select using (auth.uid() = user_id or public.is_developer_or_admin());
drop policy if exists "enroll own write" on public.enrollments;
create policy "enroll own write" on public.enrollments for insert with check (auth.uid() = user_id);
drop policy if exists "enroll admin manage" on public.enrollments;
create policy "enroll admin manage" on public.enrollments for all using (public.is_admin()) with check (public.is_admin());

-- Certificates: public-by-code read via verification view; own read via id
drop policy if exists "certs own read" on public.certificates;
create policy "certs own read"   on public.certificates for select using (auth.uid() = user_id or public.is_developer_or_admin());
drop policy if exists "certs admin write" on public.certificates;
create policy "certs admin write" on public.certificates for all using (public.is_admin()) with check (public.is_admin());

-- Coaching bookings: own + dev/admin
drop policy if exists "coaching own read" on public.coaching_bookings;
create policy "coaching own read"  on public.coaching_bookings for select using (auth.uid() = user_id or public.is_developer_or_admin());
drop policy if exists "coaching own write" on public.coaching_bookings;
create policy "coaching own write" on public.coaching_bookings for insert with check (auth.uid() = user_id);
drop policy if exists "coaching dev manage" on public.coaching_bookings;
create policy "coaching dev manage" on public.coaching_bookings for all using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

-- Payments: own + admin
drop policy if exists "payments own read" on public.payments;
create policy "payments own read" on public.payments for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "payments admin write" on public.payments;
create policy "payments admin write" on public.payments for all using (public.is_admin()) with check (public.is_admin());

-- SaaS apps: public read, admin write
drop policy if exists "saas public read" on public.saas_apps;
create policy "saas public read"  on public.saas_apps for select using (true);
drop policy if exists "saas admin write" on public.saas_apps;
create policy "saas admin write"  on public.saas_apps for all using (public.is_admin()) with check (public.is_admin());

-- LogoVault: public read of indexed brands; admin write
drop policy if exists "lv brands read" on public.logovault_brands;
create policy "lv brands read"     on public.logovault_brands for select using (true);
drop policy if exists "lv brands write" on public.logovault_brands;
create policy "lv brands write"    on public.logovault_brands for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lv assets read" on public.logovault_assets;
create policy "lv assets read"     on public.logovault_assets for select using (true);
drop policy if exists "lv assets write" on public.logovault_assets;
create policy "lv assets write"    on public.logovault_assets for all using (public.is_admin()) with check (public.is_admin());

-- API keys: own + admin (key_hash never returned to client app — separate edge fn)
drop policy if exists "apikey own read" on public.api_keys;
create policy "apikey own read"    on public.api_keys for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "apikey own insert" on public.api_keys;
create policy "apikey own insert"  on public.api_keys for insert with check (auth.uid() = user_id);
drop policy if exists "apikey own update" on public.api_keys;
create policy "apikey own update"  on public.api_keys for update using (auth.uid() = user_id or public.is_admin())
                                                                   with check (auth.uid() = user_id or public.is_admin());

-- API usage: own read; system inserts via service role
drop policy if exists "apiusage own read" on public.api_usage;
create policy "apiusage own read" on public.api_usage for select using (auth.uid() = user_id or public.is_admin());

-- Leads: admin/dev only (sensitive)
drop policy if exists "leads dev manage" on public.leads;
create policy "leads dev manage" on public.leads for all using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

drop policy if exists "lead_signals dev manage" on public.lead_signals;
create policy "lead_signals dev manage" on public.lead_signals for all using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

drop policy if exists "lead_icps dev manage" on public.lead_icps;
create policy "lead_icps dev manage" on public.lead_icps for all using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

drop policy if exists "lead_sources dev manage" on public.lead_sources;
create policy "lead_sources dev manage" on public.lead_sources for all using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

drop policy if exists "outreach dev manage" on public.outreach_campaigns;
create policy "outreach dev manage" on public.outreach_campaigns for all using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

drop policy if exists "outreach msgs dev manage" on public.outreach_messages;
create policy "outreach msgs dev manage" on public.outreach_messages for all using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

-- Ads: dev/admin
drop policy if exists "ads dev manage" on public.ad_campaigns;
create policy "ads dev manage" on public.ad_campaigns for all using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());
drop policy if exists "ads creatives dev manage" on public.ad_creatives;
create policy "ads creatives dev manage" on public.ad_creatives for all using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());
drop policy if exists "ads perf dev manage" on public.ad_performance;
create policy "ads perf dev manage" on public.ad_performance for all using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

-- Claude runs: project participants + dev
drop policy if exists "claude runs read" on public.claude_runs;
create policy "claude runs read" on public.claude_runs for select using (
  public.is_developer_or_admin()
  or exists (select 1 from public.projects p where p.id = claude_runs.project_id and p.client_id = auth.uid())
);
drop policy if exists "claude runs dev write" on public.claude_runs;
create policy "claude runs dev write" on public.claude_runs for all
  using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

-- Waitlist: public insert, admin read
drop policy if exists "waitlist public insert" on public.waitlist;
create policy "waitlist public insert" on public.waitlist for insert with check (true);
drop policy if exists "waitlist admin read" on public.waitlist;
create policy "waitlist admin read"    on public.waitlist for select using (public.is_admin());

-- =============================================================
-- Public verification view: certificate_lookup
-- (does NOT join profile — just returns programme + name pieces)
-- =============================================================
create or replace view public.certificate_verifications as
  select
    c.certificate_code,
    c.issued_at,
    c.revoked_at,
    c.grade,
    p.name as programme_name,
    p.audience as programme_audience,
    p.duration_weeks,
    pr.full_name as recipient_name
  from public.certificates c
  join public.programmes p on p.id = c.programme_id
  left join public.profiles pr on pr.id = c.user_id;

grant select on public.certificate_verifications to anon, authenticated;

-- =============================================================
-- Seed: SaaS apps registry + lead sources skeleton
-- =============================================================
insert into public.saas_apps (slug, name, status, tagline, summary) values
  ('logovault',      'LogoVault',      'beta',    'Every company logo, every format, one API.', 'AI-tagged logo library with SVG/PNG/JPG variants and an API for developers.'),
  ('prompt-locker',  'Prompt Locker',  'planned', 'Team prompt library + evals.', 'Versioned prompt library, A/B testing, regression evals.'),
  ('inbox-fox',      'Inbox Fox',      'planned', 'Inbox triage agent as a service.', 'Drop-in Gmail/Outlook inbox triage agent.'),
  ('fingerprint-fund','Fingerprint Fund','planned','Lead discovery for small agencies.', 'Standalone version of our lead-discovery engine.')
on conflict (slug) do update set
  name = excluded.name,
  status = excluded.status,
  tagline = excluded.tagline,
  summary = excluded.summary;

-- LogoVault: seed a handful of well-known brands so /saas/logovault
-- has something to show before a real ingest job is wired up.
insert into public.logovault_brands (slug, display_name, aliases, primary_domain, hex_primary, source)
values
  ('stripe',    'Stripe',    array['Stripe Inc','stripe.com'],  'stripe.com',    '#635bff', 'simpleicons'),
  ('notion',    'Notion',    array['Notion Labs','notion.so'],  'notion.so',     '#000000', 'simpleicons'),
  ('supabase',  'Supabase',  array['supabase.io'],              'supabase.com',  '#3ecf8e', 'simpleicons'),
  ('anthropic', 'Anthropic', array['Claude','claude.ai'],       'anthropic.com', '#d97757', 'simpleicons'),
  ('openai',    'OpenAI',    array['ChatGPT','openai.com'],     'openai.com',    '#10a37f', 'simpleicons'),
  ('vercel',    'Vercel',    array['vercel.com','Zeit'],        'vercel.com',    '#000000', 'simpleicons'),
  ('github',    'GitHub',    array['github.com'],               'github.com',    '#181717', 'simpleicons'),
  ('linear',    'Linear',    array['linear.app'],               'linear.app',    '#5e6ad2', 'simpleicons'),
  ('figma',     'Figma',     array['figma.com'],                'figma.com',     '#f24e1e', 'simpleicons'),
  ('slack',     'Slack',     array['slack.com'],                'slack.com',     '#4a154b', 'simpleicons')
on conflict (slug) do update set
  display_name = excluded.display_name,
  primary_domain = excluded.primary_domain,
  hex_primary = excluded.hex_primary;

insert into public.lead_sources (slug, name, kind, enabled, config) values
  ('google-places',     'Google Places',     'places',          true,  '{"radius_km": 50}'::jsonb),
  ('companies-house',   'Companies House',   'companies_house', true,  '{"incorporation_within_days": 365}'::jsonb),
  ('yelp',              'Yelp',              'yelp',            false, '{}'::jsonb),
  ('reddit-aspirants',  'Reddit (career switchers)', 'reddit',  true,  '{"subreddits": ["learnprogramming","cscareerquestions","ExperiencedDevs","AIDevs"]}'::jsonb),
  ('linkedin',          'LinkedIn',          'linkedin',        false, '{}'::jsonb),
  ('news-funding',      'News (funding feeds)', 'news',         true,  '{}'::jsonb)
on conflict (slug) do nothing;

-- =============================================================
-- Done.
-- =============================================================
