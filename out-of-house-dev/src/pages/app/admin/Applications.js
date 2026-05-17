import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/AuthProvider';

const TYPE_LABELS = {
  website: 'Website',
  automation: 'AI Automation',
  web_app: 'Web App',
  custom_software: 'Custom Software',
  platform: 'Platform',
  other: 'Other',
};

const Applications = () => {
  const { profile } = useAuth();
  const [apps, setApps] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [active, setActive] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    let q = supabase.from('applications').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setApps(data ?? []);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const open = (a) => {
    setActive(a);
    setAdminNotes(a.admin_notes || '');
    setMessage(null);
  };

  const approve = async () => {
    if (!active) return;
    setWorking(true);
    setMessage(null);

    // 1. Mark application approved
    const { error: updErr } = await supabase
      .from('applications')
      .update({
        status: 'approved',
        admin_notes: adminNotes,
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', active.id);
    if (updErr) { setMessage(`Error: ${updErr.message}`); setWorking(false); return; }

    // 2. Find an existing profile by email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', active.email)
      .maybeSingle();

    let clientId = existingProfile?.id;

    // 3. If no profile yet, send a magic-link invite. Supabase will auto-create the user, the trigger creates the profile.
    if (!clientId) {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: active.email,
        options: {
          emailRedirectTo: `${window.location.origin}/#/auth/callback`,
          shouldCreateUser: true,
          data: { full_name: active.full_name, role: 'client' },
        },
      });
      if (otpErr) {
        setMessage(`Application approved, but invite email failed: ${otpErr.message}. Send manually.`);
      } else {
        setMessage(`Approved. Magic-link invite sent to ${active.email}. They'll be created on first sign-in. Refresh after they accept to link the project.`);
      }
      setWorking(false);
      await load();
      setActive(null);
      return;
    }

    // 4. Create the project
    const { error: projErr } = await supabase.from('projects').insert([{
      client_id: clientId,
      name: active.company ? `${active.company} — ${TYPE_LABELS[active.project_type]}` : `${active.full_name}'s ${TYPE_LABELS[active.project_type]}`,
      project_type: active.project_type,
      description: active.project_description,
      created_from_application_id: active.id,
      status: 'discovery',
    }]);
    if (projErr) { setMessage(`Approved + user exists, but project insert failed: ${projErr.message}`); setWorking(false); return; }

    setMessage(`Approved. Project created for ${active.full_name}.`);
    setWorking(false);
    await load();
    setActive(null);
  };

  const reject = async () => {
    if (!active) return;
    setWorking(true);
    const { error } = await supabase.from('applications').update({
      status: 'rejected',
      admin_notes: adminNotes,
      reviewed_by: profile?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', active.id);
    setWorking(false);
    if (error) { setMessage(`Error: ${error.message}`); return; }
    await load();
    setActive(null);
  };

  const trash = async () => {
    if (!active) return;
    setWorking(true);
    const { error } = await supabase.from('applications').update({ status: 'trash' }).eq('id', active.id);
    setWorking(false);
    if (error) { setMessage(`Error: ${error.message}`); return; }
    await load();
    setActive(null);
  };

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Admin · Applications</div>
          <h1 className="app-h1">Review the queue.</h1>
        </div>
      </div>

      <div className="filter-pills">
        {['pending','approved','rejected','trash','all'].map(f => (
          <button
            key={f}
            className={`filter-pill ${filter === f ? 'is-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="apps-layout">
        <div className="app-card">
          {apps.length === 0 ? (
            <div className="app-empty">No applications in this view.</div>
          ) : (
            <ul className="app-list">
              {apps.map(a => (
                <li key={a.id} className={`app-list-row clickable ${active?.id === a.id ? 'is-active' : ''}`} onClick={() => open(a)}>
                  <div>
                    <strong>{a.full_name}</strong>
                    <div className="app-muted">{a.email} · {TYPE_LABELS[a.project_type]}</div>
                  </div>
                  <div className="app-list-meta">
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                    <span className="app-muted">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="app-card">
          {!active ? (
            <div className="app-empty">Select an application on the left.</div>
          ) : (
            <div className="app-detail">
              <h2>{active.full_name}</h2>
              <div className="kv-grid">
                <div><span>Email</span><strong>{active.email}</strong></div>
                <div><span>Company</span><strong>{active.company || '—'}</strong></div>
                <div><span>Phone</span><strong>{active.phone || '—'}</strong></div>
                <div><span>Project</span><strong>{TYPE_LABELS[active.project_type]}</strong></div>
                <div><span>Budget</span><strong>{active.budget_range || '—'}</strong></div>
                <div><span>Timeline</span><strong>{active.timeline || '—'}</strong></div>
                <div><span>Source</span><strong>{active.source || '—'}</strong></div>
                <div><span>Submitted</span><strong>{new Date(active.created_at).toLocaleString()}</strong></div>
              </div>
              <div className="app-detail-block">
                <span className="kv-label">Project description</span>
                <p>{active.project_description}</p>
              </div>
              <div className="app-detail-block">
                <span className="kv-label">Internal notes</span>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows="4"
                  placeholder="Anything we discussed on the call, red flags, follow-ups…"
                />
              </div>
              {message && <div className="auth-info">{message}</div>}
              {active.status === 'pending' && (
                <div className="app-actions">
                  <button className="primary-btn" onClick={approve} disabled={working}><span>Approve &amp; invite</span></button>
                  <button className="secondary-btn" onClick={reject} disabled={working}><span>Reject</span></button>
                  <button className="ghost-btn" onClick={trash} disabled={working}>Move to trash</button>
                </div>
              )}
              {active.status !== 'pending' && (
                <div className="app-actions">
                  <button className="secondary-btn" onClick={async () => {
                    await supabase.from('applications').update({ status: 'pending', reviewed_by: null, reviewed_at: null }).eq('id', active.id);
                    await load();
                    setActive(null);
                  }}><span>Reopen</span></button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Applications;
