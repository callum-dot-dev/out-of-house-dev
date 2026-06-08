// Application review → approve. Approval provisions the client: upsert a
// password-less user, create their project, mark approved, and email an invite
// to claim the account. (Quote-driven project creation is layered on in Phase 8.)
import { one } from '../lib/db';
import { randomToken } from '../lib/crypto';
import { createAuthToken } from '../repos/tokens';
import { getApplication } from '../repos/applications';
import { queueEmail } from './email';
import { notify } from './notifications';
import { audit } from './audit';
import { siteUrl } from '../lib/http';
import type { Viewer } from '../types';

export type ApproveResult = { user_id: string; project_id: string };

export async function approveApplication(v: Viewer, appId: string): Promise<ApproveResult | null> {
  const app = await getApplication(appId);
  if (!app) return null;

  let user = await one<{ id: string }>('select id from users where email=$1', [app.email]);
  if (!user) {
    user = await one<{ id: string }>(
      "insert into users(email, full_name, company, role) values ($1,$2,$3,'client') returning id",
      [app.email, app.full_name, app.company],
    );
  }
  const userId = user!.id;

  const project = await one<{ id: string }>(
    `insert into projects(client_id, name, project_type, description, status, created_from_application_id)
       values ($1,$2,$3,$4,'discovery',$5) returning id`,
    [userId, app.company ?? `${app.full_name} project`, app.project_type, app.project_description, appId],
  );

  await one("update applications set status='approved', reviewed_by=$2, reviewed_at=now() where id=$1 returning id", [appId, v.id]);

  const token = randomToken(32);
  await createAuthToken({ purpose: 'invite', token, userId, email: app.email, role: 'client', ttlMs: 14 * 24 * 3600 * 1000 });
  const link = `${siteUrl()}/auth/callback?mode=invite&token=${token}`;
  await queueEmail({
    to: app.email,
    template: 'application-approved',
    subject: 'Your project is approved — set up your portal',
    text: `Welcome to out-of-house.dev. Set up your account and see your project: ${link}`,
    meta: { token },
  });
  await notify(userId, { kind: 'project_created', title: 'Your project is live in the portal', body: app.project_description, link: `/app/projects/${project!.id}` });
  await audit(v, 'application.approved', { table: 'applications', id: appId }, { project_id: project!.id, user_id: userId });

  return { user_id: userId, project_id: project!.id };
}

export async function rejectApplication(v: Viewer, appId: string, reason?: string): Promise<boolean> {
  const row = await one("update applications set status='rejected', admin_notes=$2, reviewed_by=$3, reviewed_at=now() where id=$1 returning id", [appId, reason ?? null, v.id]);
  if (row) await audit(v, 'application.rejected', { table: 'applications', id: appId }, { reason });
  return Boolean(row);
}
