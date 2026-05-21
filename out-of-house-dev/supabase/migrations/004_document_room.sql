-- =============================================================
-- out-of-house.dev — Document Room
--
-- Per-project documents organised by build stage. Clients see
-- read-only filtered list; devs/admins manage upload and visibility.
-- Idempotent. Safe to re-run.
-- =============================================================

create table if not exists public.project_documents (
  id                 uuid primary key default uuid_generate_v4(),
  project_id         uuid not null references public.projects(id) on delete cascade,
  uploaded_by        uuid references public.profiles(id) on delete set null,
  title              text not null,
  description        text,
  stage              text not null default 'general'
                       check (stage in ('discovery','design','build','review','ship','general','ai-output')),
  category           text not null default 'doc'
                       check (category in ('design','doc','spec','code-review','ai-output','meeting-notes','asset','other')),
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
  parent_document_id uuid references public.project_documents(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists project_documents_project_idx on public.project_documents(project_id, created_at desc);
create index if not exists project_documents_stage_idx on public.project_documents(project_id, stage);
create index if not exists project_documents_visible_idx on public.project_documents(project_id, visible_to_client);

drop trigger if exists trg_project_documents_updated on public.project_documents;
create trigger trg_project_documents_updated before update on public.project_documents
  for each row execute function public.set_updated_at();

-- Notify the client when a doc becomes visible to them
create or replace function public.on_document_visibility()
returns trigger language plpgsql security definer as $$
declare
  v_client_id uuid;
  v_project_name text;
begin
  if (new.visible_to_client and (tg_op = 'INSERT' or old.visible_to_client = false)) then
    select client_id, name into v_client_id, v_project_name
      from public.projects where id = new.project_id;
    if v_client_id is not null and v_client_id is distinct from new.uploaded_by then
      insert into public.notifications(user_id, kind, title, body, link, payload)
        values (
          v_client_id,
          'document_published',
          'New document in the Document Room',
          new.title,
          '/app/projects/' || new.project_id::text || '?tab=docs',
          jsonb_build_object('document_id', new.id, 'project_id', new.project_id, 'stage', new.stage, 'ai_generated', new.ai_generated)
        );
    end if;
    -- Activity event for the project feed
    insert into public.activity_events(project_id, actor_id, kind, title, body, payload)
      values (
        new.project_id,
        new.uploaded_by,
        case when new.ai_generated then 'document.ai_published' else 'document.published' end,
        case when new.ai_generated then 'AI output published: ' || new.title else 'Document published: ' || new.title end,
        new.description,
        jsonb_build_object('document_id', new.id, 'stage', new.stage, 'category', new.category)
      );
  end if;
  return new;
end $$;

drop trigger if exists trg_document_visibility on public.project_documents;
create trigger trg_document_visibility
  after insert or update on public.project_documents
  for each row execute function public.on_document_visibility();

-- =============================================================
-- RLS
-- =============================================================
alter table public.project_documents enable row level security;

-- Clients can only see docs marked visible_to_client; devs/admins see all.
drop policy if exists "docs read" on public.project_documents;
create policy "docs read" on public.project_documents for select using (
  public.is_developer_or_admin()
  or (
    visible_to_client = true
    and exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id and p.client_id = auth.uid()
    )
  )
);

drop policy if exists "docs insert dev" on public.project_documents;
create policy "docs insert dev" on public.project_documents for insert
  with check (public.is_developer_or_admin());

drop policy if exists "docs update dev" on public.project_documents;
create policy "docs update dev" on public.project_documents for update
  using (public.is_developer_or_admin())
  with check (public.is_developer_or_admin());

drop policy if exists "docs delete dev" on public.project_documents;
create policy "docs delete dev" on public.project_documents for delete
  using (public.is_developer_or_admin());

-- =============================================================
-- Storage bucket
-- =============================================================
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'documents') then
    insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
  end if;
exception when others then
  raise notice 'Skipping documents bucket creation: %', sqlerrm;
end $$;

do $$
begin
  begin
    create policy "documents read for project members" on storage.objects for select using (
      bucket_id = 'documents' and auth.uid() is not null
    );
  exception when duplicate_object then null; end;
  begin
    create policy "documents upload dev" on storage.objects for insert with check (
      bucket_id = 'documents' and auth.uid() is not null
    );
  exception when duplicate_object then null; end;
exception when others then
  raise notice 'Skipped documents storage policies: %', sqlerrm;
end $$;

-- =============================================================
-- Done.
-- =============================================================
