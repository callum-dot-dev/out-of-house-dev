import { one, query } from '../lib/db';
import { isStaff, type Viewer } from '../types';
import { canAccessProject } from './projects';

export type RequestRow = { id: string; project_id: string; [k: string]: unknown };

export async function getRequestScoped(v: Viewer, id: string): Promise<RequestRow | null> {
  const row = await one<RequestRow>('select * from feature_requests where id=$1', [id]);
  if (!row) return null;
  if (isStaff(v)) return row;
  return (await canAccessProject(v, row.project_id)) ? row : null;
}

/** Returns null when the viewer cannot access the project at all. */
export async function listRequestsForProject(v: Viewer, projectId: string): Promise<RequestRow[] | null> {
  if (!(await canAccessProject(v, projectId))) return null;
  return (
    await query<RequestRow>('select * from feature_requests where project_id=$1 order by created_at desc', [
      projectId,
    ])
  ).rows;
}
