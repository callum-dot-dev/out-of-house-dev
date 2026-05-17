-- =============================================================
-- out-of-house.dev — initial schema
-- Run this in the Supabase SQL editor (Project → SQL → New query).
-- =============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- =============================================================
-- profiles  (1-1 with auth.users)
-- =============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  company       text,
  role          text not null default 'client' check (role in ('client','developer','admin')),
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- =============================================================
-- applications  (public submissions, pre-auth)
-- =============================================================
create table if not exists public.applications (
  id                  uuid primary key default uuid_generate_v4(),
  full_name           text not null,
  email               text not null,
  company             text,
  phone               text,
  project_type        text not null check (project_type in ('website','automation','web_app','custom_software','platform','other')),
  project_description text not null,
  budget_range        text,
  timeline            text,
  source              text,
  status              text not null default 'pending' check (status in ('pending','approved','rejected','trash')),
  admin_notes         text,
  reviewed_by         uuid references public.profiles(id) on delete set null,
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists applications_status_idx on public.applications(status);

-- =============================================================
-- projects
-- =============================================================
create table if not exists public.projects (
  id                          uuid primary key default uuid_generate_v4(),
  client_id                   uuid not null references public.profiles(id) on delete cascade,
  name                        text not null,
  project_type                text not null check (project_type in ('website','automation','web_app','custom_software','platform','other')),
  description                 text,
  status                      text not null default 'discovery' check (status in ('discovery','building','live','paused','completed')),
  created_from_application_id uuid references public.applications(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists projects_client_idx on public.projects(client_id);
create index if not exists projects_status_idx on public.projects(status);

-- =============================================================
-- feature_requests
-- =============================================================
create table if not exists public.feature_requests (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  created_by      uuid not null references public.profiles(id) on delete set null,
  title           text not null,
  description     text not null,
  priority        text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status          text not null default 'submitted' check (status in ('submitted','scoped','building','review','shipped','rejected')),
  claimed_by      uuid references public.profiles(id) on delete set null,
  estimated_hours int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists feature_requests_project_idx on public.feature_requests(project_id);
create index if not exists feature_requests_status_idx on public.feature_requests(status);
create index if not exists feature_requests_claimed_idx on public.feature_requests(claimed_by);

-- =============================================================
-- request_comments
-- =============================================================
create table if not exists public.request_comments (
  id          uuid primary key default uuid_generate_v4(),
  request_id  uuid not null references public.feature_requests(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists request_comments_request_idx on public.request_comments(request_id);

-- =============================================================
-- plan_templates  (universal plans-of-action per project type)
-- =============================================================
create table if not exists public.plan_templates (
  id                   uuid primary key default uuid_generate_v4(),
  type                 text not null check (type in ('website','automation','web_app','custom_software','platform')),
  name                 text not null,
  summary              text,
  phases               jsonb not null,  -- [{ name, goal, steps:[{title, detail, deliverable}], duration }]
  claude_code_handoff  text not null,   -- markdown brief ready to paste into Claude Code
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique(type, name)
);

-- =============================================================
-- project_plans  (instances of a template against a project)
-- =============================================================
create table if not exists public.project_plans (
  id                  uuid primary key default uuid_generate_v4(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  template_id         uuid references public.plan_templates(id) on delete set null,
  phases              jsonb not null,
  current_phase_index int not null default 0,
  current_step_index  int not null default 0,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists project_plans_project_idx on public.project_plans(project_id);

-- =============================================================
-- updated_at triggers
-- =============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated         before update on public.profiles         for each row execute function public.set_updated_at();
drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated         before update on public.projects         for each row execute function public.set_updated_at();
drop trigger if exists trg_feature_requests_updated on public.feature_requests;
create trigger trg_feature_requests_updated before update on public.feature_requests for each row execute function public.set_updated_at();
drop trigger if exists trg_plan_templates_updated on public.plan_templates;
create trigger trg_plan_templates_updated   before update on public.plan_templates   for each row execute function public.set_updated_at();
drop trigger if exists trg_project_plans_updated on public.project_plans;
create trigger trg_project_plans_updated    before update on public.project_plans    for each row execute function public.set_updated_at();

-- =============================================================
-- Profile auto-creation on signup
-- =============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- Role helper (avoid recursive RLS lookups)
-- =============================================================
create or replace function public.current_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_developer_or_admin()
returns boolean language sql stable security definer as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('developer','admin'));
$$;

-- =============================================================
-- Row-Level Security
-- =============================================================
alter table public.profiles         enable row level security;
alter table public.applications     enable row level security;
alter table public.projects         enable row level security;
alter table public.feature_requests enable row level security;
alter table public.request_comments enable row level security;
alter table public.plan_templates   enable row level security;
alter table public.project_plans    enable row level security;

-- profiles
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id or public.is_developer_or_admin());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
drop policy if exists "admin profile manage" on public.profiles;
create policy "admin profile manage" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- applications  (public can submit; only admins read/update)
drop policy if exists "public submit application" on public.applications;
create policy "public submit application" on public.applications for insert with check (true);
drop policy if exists "admin read applications" on public.applications;
create policy "admin read applications"   on public.applications for select using (public.is_admin());
drop policy if exists "admin update applications" on public.applications;
create policy "admin update applications" on public.applications for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete applications" on public.applications;
create policy "admin delete applications" on public.applications for delete using (public.is_admin());

-- projects
drop policy if exists "client own projects" on public.projects;
create policy "client own projects" on public.projects for select using (auth.uid() = client_id or public.is_developer_or_admin());
drop policy if exists "admin manage projects" on public.projects;
create policy "admin manage projects" on public.projects for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "developer update projects" on public.projects;
create policy "developer update projects" on public.projects for update using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

-- feature_requests
drop policy if exists "client see own project requests" on public.feature_requests;
create policy "client see own project requests" on public.feature_requests for select using (
  public.is_developer_or_admin()
  or exists (select 1 from public.projects p where p.id = feature_requests.project_id and p.client_id = auth.uid())
);
drop policy if exists "client create on own project" on public.feature_requests;
create policy "client create on own project" on public.feature_requests for insert with check (
  public.is_developer_or_admin()
  or exists (select 1 from public.projects p where p.id = feature_requests.project_id and p.client_id = auth.uid())
);
drop policy if exists "dev update requests" on public.feature_requests;
create policy "dev update requests" on public.feature_requests for update using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());

-- request_comments
drop policy if exists "comment read" on public.request_comments;
create policy "comment read" on public.request_comments for select using (
  public.is_developer_or_admin()
  or exists (
    select 1 from public.feature_requests r
    join public.projects p on p.id = r.project_id
    where r.id = request_comments.request_id and p.client_id = auth.uid()
  )
);
drop policy if exists "comment create" on public.request_comments;
create policy "comment create" on public.request_comments for insert with check (
  auth.uid() = author_id
);

-- plan_templates (devs + admins read; admins write)
drop policy if exists "dev read templates" on public.plan_templates;
create policy "dev read templates" on public.plan_templates for select using (public.is_developer_or_admin());
drop policy if exists "admin manage templates" on public.plan_templates;
create policy "admin manage templates" on public.plan_templates for all using (public.is_admin()) with check (public.is_admin());

-- project_plans
drop policy if exists "plan read" on public.project_plans;
create policy "plan read" on public.project_plans for select using (
  public.is_developer_or_admin()
  or exists (select 1 from public.projects p where p.id = project_plans.project_id and p.client_id = auth.uid())
);
drop policy if exists "dev manage plans" on public.project_plans;
create policy "dev manage plans" on public.project_plans for all using (public.is_developer_or_admin()) with check (public.is_developer_or_admin());
