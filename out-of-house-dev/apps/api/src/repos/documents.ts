import { one } from '../lib/db';
import { isStaff, type Viewer } from '../types';
import { canAccessProject } from './projects';

export type DocumentRow = {
  id: string;
  project_id: string;
  visible_to_client: boolean;
  [k: string]: unknown;
};

export async function getDocumentScoped(v: Viewer, id: string): Promise<DocumentRow | null> {
  const row = await one<DocumentRow>('select * from project_documents where id=$1', [id]);
  if (!row) return null;
  if (isStaff(v)) return row;
  if (!row.visible_to_client) return null; // clients never see internal docs
  return (await canAccessProject(v, row.project_id)) ? row : null;
}
