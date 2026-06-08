-- =============================================================
-- 006 · Plan template types expansion (v4, 2026-06-08)
--
-- planTemplates.js v4 adds three new template types:
--   maintenance, aiseo, lead_engine
-- This migration relaxes the CHECK constraints that pinned
-- plan_templates.type / projects.project_type / applications.project_type
-- to the original five build types, so the seed script can upsert the
-- new templates and projects can be created against them.
--
-- Also adds projects.metadata + style knob used by the v4 handoffs.
-- Idempotent: safe to re-run.
-- =============================================================

-- plan_templates.type
alter table public.plan_templates
  drop constraint if exists plan_templates_type_check;
alter table public.plan_templates
  add constraint plan_templates_type_check
  check (type in ('website','automation','web_app','custom_software','platform','maintenance','aiseo','lead_engine'));

-- projects.project_type
alter table public.projects
  drop constraint if exists projects_project_type_check;
alter table public.projects
  add constraint projects_project_type_check
  check (project_type in ('website','automation','web_app','custom_software','platform','maintenance','aiseo','lead_engine','other'));

-- applications.project_type
alter table public.applications
  drop constraint if exists applications_project_type_check;
alter table public.applications
  add constraint applications_project_type_check
  check (project_type in ('website','automation','web_app','custom_software','platform','maintenance','aiseo','lead_engine','other'));

-- Per-project tweak knobs used by v4 handoffs (style adapter selection etc.)
alter table public.projects
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.projects.metadata is
  'Tweak knobs fed to Claude runs: style, brand_colors, target_audience, tenancy, auth_providers, billing_model, ai_features, integrations, workflow_dag, existing_tools, operator_personas, niche, voice_guide, competitors, domain...';
