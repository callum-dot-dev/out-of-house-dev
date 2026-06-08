// Viewer-scoped project access. Clients see only their own projects; staff
// (developer/admin) see all. This scoping is the isolation boundary (A2).
import { one, query } from '../lib/db';
import { isStaff, type Viewer } from '../types';

export type ProjectRow = { id: string; client_id: string; [k: string]: unknown };

export async function getProjectScoped(v: Viewer, id: string): Promise<ProjectRow | null> {
  const row = await one<ProjectRow>('select * from projects where id=$1', [id]);
  if (!row) return null;
  if (!isStaff(v) && row.client_id !== v.id) return null;
  return row;
}

export async function listProjectsScoped(v: Viewer): Promise<ProjectRow[]> {
  if (isStaff(v)) {
    return (await query<ProjectRow>('select * from projects order by created_at desc')).rows;
  }
  return (
    await query<ProjectRow>('select * from projects where client_id=$1 order by created_at desc', [v.id])
  ).rows;
}

/** Does this viewer have read access to the project (without returning it)? */
export async function canAccessProject(v: Viewer, projectId: string): Promise<boolean> {
  if (isStaff(v)) return true;
  const row = await one<{ client_id: string }>('select client_id from projects where id=$1', [projectId]);
  return Boolean(row && row.client_id === v.id);
}
