import { one, query } from '../lib/db';

export type ApplicationRow = {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
  project_type: string;
  project_description: string;
  status: string;
  [k: string]: unknown;
};

export async function createApplication(input: {
  full_name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  project_type: string;
  project_description: string;
  budget_range?: string | null;
  timeline?: string | null;
  source?: string | null;
  submitted_ip?: string | null;
  user_agent?: string | null;
}): Promise<ApplicationRow> {
  const row = await one<ApplicationRow>(
    `insert into applications(full_name,email,company,phone,project_type,project_description,budget_range,timeline,source,submitted_ip,user_agent)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
    [
      input.full_name,
      input.email,
      input.company ?? null,
      input.phone ?? null,
      input.project_type,
      input.project_description,
      input.budget_range ?? null,
      input.timeline ?? null,
      input.source ?? null,
      input.submitted_ip ?? null,
      input.user_agent ?? null,
    ],
  );
  return row as ApplicationRow;
}

export async function listApplications(status?: string): Promise<ApplicationRow[]> {
  if (status) {
    return (await query<ApplicationRow>('select * from applications where status=$1 order by created_at desc', [status])).rows;
  }
  return (await query<ApplicationRow>('select * from applications order by created_at desc')).rows;
}

export const getApplication = (id: string): Promise<ApplicationRow | null> =>
  one<ApplicationRow>('select * from applications where id=$1', [id]);
