// cert-issue
//
// Issues a certificate for a completed enrollment. Generates a public
// verification URL and stores it on the certificates table. Idempotent
// on enrollment_id (only one cert per enrollment).

import { handleOptions, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase-admin.ts';

const PUBLIC_BASE = Deno.env.get('PUBLIC_SITE_URL') || 'https://out-of-house.dev';

Deno.serve(async (req) => {
  const opts = handleOptions(req);
  if (opts) return opts;

  try {
    const { enrollment_id, grade } = await req.json();
    if (!enrollment_id) return json(req, { error: 'enrollment_id required' }, { status: 400 });

    const { data: enrollment } = await admin
      .from('enrollments')
      .select('id, user_id, programme_id, programmes:programme_id(name, certificate)')
      .eq('id', enrollment_id)
      .single();
    if (!enrollment) return json(req, { error: 'enrollment not found' }, { status: 404 });
    if (!(enrollment as any).programmes?.certificate) return json(req, { error: 'programme does not issue certificates' }, { status: 400 });

    const { data: existing } = await admin
      .from('certificates')
      .select('id, certificate_code, verification_url')
      .eq('enrollment_id', enrollment_id)
      .maybeSingle();
    if (existing) return json(req, { reused: true, certificate: existing });

    const code = newCode();
    const verification_url = `${PUBLIC_BASE}/verify/${code}`;
    const { data: cert, error } = await admin.from('certificates').insert({
      enrollment_id,
      user_id: enrollment.user_id,
      programme_id: enrollment.programme_id,
      certificate_code: code,
      verification_url,
      grade: grade || 'Pass',
    }).select().single();
    if (error) throw error;

    await admin.from('enrollments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', enrollment_id);

    return json(req, { certificate: cert });
  } catch (e) {
    console.error('cert-issue error', e);
    return json(req, { error: String(e?.message || e) }, { status: 500 });
  }
});

// Short, friendly, copy-paste-safe codes: OH-XXXX-YYYY-ZZ
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => {
  const r = (n: number) => Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  return `OH-${r(4)}-${r(4)}-${r(2)}`;
};
