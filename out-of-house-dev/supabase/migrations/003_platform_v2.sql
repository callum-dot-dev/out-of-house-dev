-- =============================================================
-- out-of-house.dev — platform v2 schema additions
--
-- Adds: notifications, activity events, attachments, decisions,
-- digests, monthly reports, audit log, changelog entries, guest
-- tokens, and supporting indexes / RLS / triggers.
--
-- Idempotent. Safe to re-run.
-- =============================================================

-- Storage buckets (run separately in Supabase dashboard if these fail)
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'attachments') then
    insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);
  end if;
  if not exists (select 1 from storage.buckets where id = 'avatars') then
    insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
  end if;
  if not exists (select 1 from storage.buckets where id = 'voice') then
    insert into storage.buckets (id, name, public) values ('voice', 'voice', false);
  end if;
exception when others then
  raise notice 'Skipping storage bucket creation (run via dashboard if needed): %', sqlerrm;
end $$;

-- =============================================================
-- Extend existing tables
-- =============================================================
alter table public.projects
  add column if not exists preview_url text,
  add column if not exists repo_url text,
  add column if not exists health_status text default 'unknown' check (health_status in ('unknown','healthy','degraded','down')),
  add column if not exists health_checked_at timestamptz,
  add column if not exists showcase_opt_in boolean not null default false,
  add column if not exists slug text,
  add column if not exists archived_at timestamptz;

create unique index if not exists projects_slug_uniq on public.projects(slug) where slug is not null;

alter table public.feature_requests
  add column if not exists client_priority_rank int,
  add column if not exists rejection_reason text,
  add column if not exists ai_estimated_hours numeric(6,2),
  add column if not exists ai_suggested_priority text,
  add column if not exists ai_summary text,
  add column if not exists target_metric text,
  add column if not exists shipped_at timestamptz,
  add column if not exists github_issue_number int,
  add column if not exists github_repo text;

create index if not exists feature_requests_client_rank_idx
  on public.feature_requests(project_id, client_priority_rank)
  where client_priority_rank is not null;

alter table public.profiles
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_in_app boolean not null default true,
  add column if not exists timezone text default 'Europe/London',
  add column if not exists last_seen_at timestamptz;

alter table public.applications
  add column if not exists captcha_token text,
  add column if not exists submitted_ip text,
  add column if not exists user_agent text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text;

-- =============================================================
-- notifications
-- =============================================================
create table if not exists public.notifications (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  kind         text not null,
  title        text not null,
  body         text,
  link         text,
  payload      jsonb default '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- =============================================================
-- activity_events  (live build feed per project)
-- =============================================================
create table if not exists public.activity_events (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade,
  request_id  uuid references public.feature_requests(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  kind        text not null,
  title       text not null,
  body        text,
  payload     jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_events_project_idx on public.activity_events(project_id, created_at desc);
create index if not exists activity_events_request_idx on public.activity_events(request_id, created_at desc);

-- =============================================================
-- attachments (polymorphic: requests / comments / projects)
-- =============================================================
create table if not exists public.attachments (
  id            uuid primary key default uuid_generate_v4(),
  uploader_id   uuid not null references public.profiles(id) on delete set null,
  project_id    uuid references public.projects(id) on delete cascade,
  request_id    uuid references public.feature_requests(id) on delete cascade,
  comment_id    uuid references public.request_comments(id) on delete cascade,
  storage_path  text not null,
  filename      text not null,
  mime_type     text,
  size_bytes    int,
  kind          text default 'file' check (kind in ('file','image','video','audio','voice')),
  duration_ms   int,
  created_at    timestamptz not null default now()
);

create index if not exists attachments_request_idx on public.attachments(request_id);
create index if not exists attachments_project_idx on public.attachments(project_id);
create index if not exists attachments_comment_idx on public.attachments(comment_id);

-- =============================================================
-- comment mentions
-- =============================================================
alter table public.request_comments
  add column if not exists mentions uuid[] default array[]::uuid[],
  add column if not exists edited_at timestamptz;

-- =============================================================
-- decisions (extracted from comments)
-- =============================================================
create table if not exists public.decisions (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  source_comment_id uuid references public.request_comments(id) on delete set null,
  summary           text not null,
  detail            text,
  confirmed         boolean default false,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists decisions_project_idx on public.decisions(project_id, created_at desc);

-- =============================================================
-- digests (weekly AI summary per project)
-- =============================================================
create table if not exists public.digests (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  content_md   text not null,
  sent_at      timestamptz,
  generated_by text default 'system',
  created_at   timestamptz not null default now(),
  unique(project_id, period_start)
);

create index if not exists digests_project_idx on public.digests(project_id, period_start desc);

-- =============================================================
-- monthly_reports (impact report)
-- =============================================================
create table if not exists public.monthly_reports (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  metrics      jsonb default '{}'::jsonb,
  narrative_md text,
  pdf_url      text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique(project_id, period_start)
);

-- =============================================================
-- changelog_entries (per project, optional public)
-- =============================================================
create table if not exists public.changelog_entries (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  request_id    uuid references public.feature_requests(id) on delete set null,
  title         text not null,
  body_md       text,
  is_public     boolean default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists changelog_project_idx on public.changelog_entries(project_id, published_at desc);
create index if not exists changelog_public_idx on public.changelog_entries(is_public, published_at desc) where is_public = true;

-- =============================================================
-- audit_events (admin / sensitive actions)
-- =============================================================
create table if not exists public.audit_events (
  id           uuid primary key default uuid_generate_v4(),
  actor_id     uuid references public.profiles(id) on delete set null,
  action       text not null,
  target_table text,
  target_id    uuid,
  payload      jsonb default '{}'::jsonb,
  ip           text,
  created_at   timestamptz not null default now()
);

create index if not exists audit_events_actor_idx on public.audit_events(actor_id, created_at desc);
create index if not exists audit_events_target_idx on public.audit_events(target_table, target_id);

-- =============================================================
-- guest_tokens (share a request or preview with a non-account stakeholder)
-- =============================================================
create table if not exists public.guest_tokens (
  token        text primary key,
  project_id   uuid references public.projects(id) on delete cascade,
  request_id   uuid references public.feature_requests(id) on delete cascade,
  scope_kind   text not null check (scope_kind in ('request','project','preview')),
  created_by   uuid references public.profiles(id) on delete set null,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists guest_tokens_expires_idx on public.guest_tokens(expires_at);

-- =============================================================
-- referrals
-- =============================================================
create table if not exists public.referrals (
  id            uuid primary key default uuid_generate_v4(),
  referrer_id   uuid not null references public.profiles(id) on delete cascade,
  code          text not null unique,
  referred_email text,
  application_id uuid references public.applications(id) on delete set null,
  status        text not null default 'pending' check (status in ('pending','converted','expired')),
  credit_amount numeric(8,2) default 0,
  converted_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists referrals_referrer_idx on public.referrals(referrer_id);

-- =============================================================
-- subscriptions / billing mirror (read-only mirror of Stripe state)
-- =============================================================
create table if not exists public.subscriptions (
  id                   uuid primary key default uuid_generate_v4(),
  client_id            uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id   text,
  stripe_subscription_id text,
  plan                 text,
  status               text default 'inactive',
  current_period_end   timestamptz,
  cancel_at            timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists subscriptions_client_idx on public.subscriptions(client_id);

-- =============================================================
-- automation_runs (live odometer for automation-type projects)
-- =============================================================
create table if not exists public.automation_runs (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  run_count    int not null default 1,
  hours_saved  numeric(8,2) default 0,
  status       text default 'success',
  metadata     jsonb default '{}'::jsonb,
  ran_at       timestamptz not null default now()
);

create index if not exists automation_runs_project_idx on public.automation_runs(project_id, ran_at desc);

-- =============================================================
-- Triggers
-- =============================================================
drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Auto-write activity events when feature_requests change
create or replace function public.on_feature_request_change()
returns trigger language plpgsql security definer as $$
declare
  v_actor uuid := auth.uid();
  v_title text;
begin
  if (tg_op = 'INSERT') then
    v_title := 'New request: ' || coalesce(new.title, 'untitled');
    insert into public.activity_events(project_id, request_id, actor_id, kind, title)
      values (new.project_id, new.id, v_actor, 'request.created', v_title);
  elsif (tg_op = 'UPDATE') then
    if (new.status is distinct from old.status) then
      v_title := 'Status: ' || old.status || ' -> ' || new.status;
      insert into public.activity_events(project_id, request_id, actor_id, kind, title, payload)
        values (new.project_id, new.id, v_actor, 'request.status_changed', v_title,
                jsonb_build_object('from', old.status, 'to', new.status));
      if (new.status = 'shipped' and old.status is distinct from 'shipped') then
        update public.feature_requests set shipped_at = now() where id = new.id and shipped_at is null;
      end if;
    end if;
    if (new.claimed_by is distinct from old.claimed_by) then
      if new.claimed_by is null then
        v_title := 'Request released';
      else
        v_title := 'Request claimed';
      end if;
      insert into public.activity_events(project_id, request_id, actor_id, kind, title, payload)
        values (new.project_id, new.id, v_actor, 'request.claimed', v_title,
                jsonb_build_object('claimed_by', new.claimed_by));
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_feature_request_activity on public.feature_requests;
create trigger trg_feature_request_activity
  after insert or update on public.feature_requests
  for each row execute function public.on_feature_request_change();

-- Notify mentioned users when comments are inserted
create or replace function public.on_comment_insert()
returns trigger language plpgsql security definer as $$
declare
  v_mention uuid;
  v_project_id uuid;
  v_request_title text;
  v_author_name text;
begin
  select project_id, title into v_project_id, v_request_title
    from public.feature_requests where id = new.request_id;
  select coalesce(full_name, email) into v_author_name
    from public.profiles where id = new.author_id;

  insert into public.activity_events(project_id, request_id, actor_id, kind, title, body)
    values (v_project_id, new.request_id, new.author_id, 'comment.posted',
            coalesce(v_author_name, 'Someone') || ' commented',
            left(new.body, 240));

  if new.mentions is not null then
    foreach v_mention in array new.mentions loop
      if v_mention is distinct from new.author_id then
        insert into public.notifications(user_id, kind, title, body, link, payload)
          values (
            v_mention, 'mention',
            coalesce(v_author_name, 'Someone') || ' mentioned you',
            left(new.body, 200),
            '/app/requests/' || new.request_id::text,
            jsonb_build_object('request_id', new.request_id, 'comment_id', new.id)
          );
      end if;
    end loop;
  end if;

  return new;
end $$;

drop trigger if exists trg_comment_insert_notify on public.request_comments;
create trigger trg_comment_insert_notify
  after insert on public.request_comments
  for each row execute function public.on_comment_insert();

-- Notify client when their project gets a status change
create or replace function public.on_project_change()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.activity_events(project_id, actor_id, kind, title, payload)
      values (new.id, auth.uid(), 'project.status_changed',
              'Project status: ' || old.status || ' -> ' || new.status,
              jsonb_build_object('from', old.status, 'to', new.status));
    insert into public.notifications(user_id, kind, title, body, link, payload)
      values (new.client_id, 'project_status',
              'Your project moved to ' || new.status,
              new.name,
              '/app/projects/' || new.id::text,
              jsonb_build_object('project_id', new.id, 'status', new.status));
  end if;
  return new;
end $$;

drop trigger if exists trg_project_status_notify on public.projects;
create trigger trg_project_status_notify
  after update on public.projects
  for each row execute function public.on_project_change();

-- =============================================================
-- RLS
-- =============================================================
alter table public.notifications     enable row level security;
alter table public.activity_events   enable row level security;
alter table public.attachments       enable row level security;
alter table public.decisions         enable row level security;
alter table public.digests           enable row level security;
alter table public.monthly_reports   enable row level security;
alter table public.changelog_entries enable row level security;
alter table public.audit_events      enable row level security;
alter table public.guest_tokens      enable row level security;
alter table public.referrals         enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.automation_runs   enable row level security;

-- notifications
drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications system insert" on public.notifications;
create policy "notifications system insert" on public.notifications for insert
  with check (public.is_developer_or_admin() or auth.uid() = user_id);

-- activity_events  (read: project participants; insert: triggers + devs)
drop policy if exists "activity read" on public.activity_events;
create policy "activity read" on public.activity_events for select using (
  public.is_developer_or_admin()
  or exists (select 1 from public.projects p where p.id = activity_events.project_id and p.client_id = auth.uid())
);

drop policy if exists "activity insert dev" on public.activity_events;
create policy "activity insert dev" on public.activity_events for insert
  with check (public.is_developer_or_admin());

-- attachments
drop policy if exists "attach read" on public.attachments;
create policy "attach read" on public.attachments for select using (
  public.is_developer_or_admin()
  or exists (select 1 from public.projects p where p.id = attachments.project_id and p.client_id = auth.uid())
  or exists (
    select 1 from public.feature_requests r
    join public.projects p on p.id = r.project_id
    where r.id = attachments.request_id and (p.client_id = auth.uid() or public.is_developer_or_admin())
  )
);

drop policy if exists "attach insert" on public.attachments;
create policy "attach insert" on public.attachments for insert with check (
  auth.uid() = uploader_id
);

drop policy if exists "attach delete owner" on public.attachments;
create policy "attach delete owner" on public.attachments for delete using (
  auth.uid() = uploader_id or public.is_developer_or_admin()
);

-- decisions
drop policy if exists "decisions read" on public.decisions;
create policy "decisions read" on public.decisions for select using (
  public.is_developer_or_admin()
  or exists (select 1 from public.projects p where p.id = decisions.project_id and p.client_id = auth.uid())
);

drop policy if exists "decisions write dev" on public.decisions;
create policy "decisions write dev" on public.decisions for all
  using (public.is_developer_or_admin())
  with check (public.is_developer_or_admin());

-- digests
drop policy if exists "digests read" on public.digests;
create policy "digests read" on public.digests for select using (
  public.is_developer_or_admin()
  or exists (select 1 from public.projects p where p.id = digests.project_id and p.client_id = auth.uid())
);

drop policy if exists "digests write dev" on public.digests;
create policy "digests write dev" on public.digests for all
  using (public.is_developer_or_admin())
  with check (public.is_developer_or_admin());

-- monthly_reports
drop policy if exists "reports read" on public.monthly_reports;
create policy "reports read" on public.monthly_reports for select using (
  public.is_developer_or_admin()
  or exists (select 1 from public.projects p where p.id = monthly_reports.project_id and p.client_id = auth.uid())
);

drop policy if exists "reports write dev" on public.monthly_reports;
create policy "reports write dev" on public.monthly_reports for all
  using (public.is_developer_or_admin())
  with check (public.is_developer_or_admin());

-- changelog
drop policy if exists "changelog read public" on public.changelog_entries;
create policy "changelog read public" on public.changelog_entries for select using (
  is_public = true
  or public.is_developer_or_admin()
  or exists (select 1 from public.projects p where p.id = changelog_entries.project_id and p.client_id = auth.uid())
);

drop policy if exists "changelog write dev" on public.changelog_entries;
create policy "changelog write dev" on public.changelog_entries for all
  using (public.is_developer_or_admin())
  with check (public.is_developer_or_admin());

-- audit_events
drop policy if exists "audit read admin" on public.audit_events;
create policy "audit read admin" on public.audit_events for select using (public.is_admin());

drop policy if exists "audit insert any auth" on public.audit_events;
create policy "audit insert any auth" on public.audit_events for insert with check (auth.uid() is not null);

-- guest_tokens
drop policy if exists "guest_tokens dev" on public.guest_tokens;
create policy "guest_tokens dev" on public.guest_tokens for all
  using (public.is_developer_or_admin())
  with check (public.is_developer_or_admin());

-- referrals  (own + admin)
drop policy if exists "referrals read own" on public.referrals;
create policy "referrals read own" on public.referrals for select using (
  auth.uid() = referrer_id or public.is_admin()
);

drop policy if exists "referrals write own" on public.referrals;
create policy "referrals write own" on public.referrals for insert
  with check (auth.uid() = referrer_id);

-- subscriptions
drop policy if exists "subs read own" on public.subscriptions;
create policy "subs read own" on public.subscriptions for select using (
  auth.uid() = client_id or public.is_developer_or_admin()
);

drop policy if exists "subs write dev" on public.subscriptions;
create policy "subs write dev" on public.subscriptions for all
  using (public.is_developer_or_admin())
  with check (public.is_developer_or_admin());

-- automation_runs
drop policy if exists "automation read" on public.automation_runs;
create policy "automation read" on public.automation_runs for select using (
  public.is_developer_or_admin()
  or exists (select 1 from public.projects p where p.id = automation_runs.project_id and p.client_id = auth.uid())
);

drop policy if exists "automation write dev" on public.automation_runs;
create policy "automation write dev" on public.automation_runs for all
  using (public.is_developer_or_admin())
  with check (public.is_developer_or_admin());

-- =============================================================
-- Storage policies  (best-effort — run via dashboard if blocked)
-- =============================================================
do $$
begin
  begin
    create policy "attachments read for project members" on storage.objects for select using (
      bucket_id = 'attachments' and (
        public.is_developer_or_admin() or auth.uid() is not null
      )
    );
  exception when duplicate_object then null; end;
  begin
    create policy "attachments upload auth" on storage.objects for insert with check (
      bucket_id = 'attachments' and auth.uid() is not null
    );
  exception when duplicate_object then null; end;
  begin
    create policy "avatars public read" on storage.objects for select using (
      bucket_id = 'avatars'
    );
  exception when duplicate_object then null; end;
  begin
    create policy "avatars upload own" on storage.objects for insert with check (
      bucket_id = 'avatars' and auth.uid() is not null
    );
  exception when duplicate_object then null; end;
  begin
    create policy "voice upload auth" on storage.objects for insert with check (
      bucket_id = 'voice' and auth.uid() is not null
    );
  exception when duplicate_object then null; end;
  begin
    create policy "voice read auth" on storage.objects for select using (
      bucket_id = 'voice' and auth.uid() is not null
    );
  exception when duplicate_object then null; end;
exception when others then
  raise notice 'Skipped storage policies (existing or insufficient perms): %', sqlerrm;
end $$;

-- =============================================================
-- Convenience view: unread notification count
-- =============================================================
create or replace view public.user_unread_count as
  select user_id, count(*) as unread
  from public.notifications
  where read_at is null
  group by user_id;

grant select on public.user_unread_count to authenticated, anon;

-- =============================================================
-- Done.
-- =============================================================
