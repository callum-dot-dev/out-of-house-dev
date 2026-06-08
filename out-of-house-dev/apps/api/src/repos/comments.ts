import { one, query } from '../lib/db';
import type { Viewer } from '../types';
import { getRequestScoped } from './featureRequests';

export type CommentRow = { id: string; request_id: string; author_id: string | null; body: string; [k: string]: unknown };

/** Returns null when the viewer can't access the parent request. */
export async function listComments(v: Viewer, requestId: string): Promise<CommentRow[] | null> {
  const req = await getRequestScoped(v, requestId);
  if (!req) return null;
  return (
    await query<CommentRow>('select * from request_comments where request_id=$1 order by created_at asc', [requestId])
  ).rows;
}

export async function addComment(v: Viewer, requestId: string, body: string): Promise<CommentRow | null> {
  const req = await getRequestScoped(v, requestId);
  if (!req) return null;
  return one<CommentRow>(
    'insert into request_comments(request_id, author_id, body) values ($1,$2,$3) returning *',
    [requestId, v.id, body],
  );
}
