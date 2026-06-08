import { one, query } from '../lib/db';

export const listPlanTemplates = async () =>
  (await query('select id, type, name, summary, phases from plan_templates order by type, name')).rows;

export const getPlanTemplate = (id: string) =>
  one('select * from plan_templates where id=$1', [id]);

export const listProgrammes = async () =>
  (await query('select * from programmes where is_active = true order by audience, price_gbp')).rows;

export const listSaasApps = async () => (await query('select * from saas_apps order by name')).rows;

export const listChangelog = async (limit = 50) =>
  (
    await query(
      'select id, project_id, title, body_md, published_at from changelog_entries where is_public = true order by published_at desc nulls last limit $1',
      [limit],
    )
  ).rows;
