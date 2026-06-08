import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../../lib/api';
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
  useAuth();
  const [apps, setApps] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [active, setActive] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    let list = [];
    try {
      const res = await api.get('/admin/applications');
      list = res.applications || [];
    } catch {
      list = [];
    }
    list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (filter !== 'all') list = list.filter((a) => a.status === filter);
    setApps(list);
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

    try {
      await api.post(`/admin/applications/${active.id}/approve`, {});
      setMessage(`Approved. Project created for ${active.full_name}.`);
      await load();
      setActive(null);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setWorking(false);
    }
  };

  const reject = async () => {
    if (!active) return;
    setWorking(true);
    try {
      await api.post(`/admin/applications/${active.id}/reject`, { reason: adminNotes });
      await load();
      setActive(null);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setWorking(false);
    }
  };

  const trash = async () => {
    if (!active) return;
    setWorking(true);
    try {
      await api.post(`/admin/applications/${active.id}/reject`, { reason: adminNotes || 'trash' });
      await load();
      setActive(null);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setWorking(false);
    }
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
                <div><span>Company</span><strong>{active.company || '–'}</strong></div>
                <div><span>Phone</span><strong>{active.phone || '–'}</strong></div>
                <div><span>Project</span><strong>{TYPE_LABELS[active.project_type]}</strong></div>
                <div><span>Budget</span><strong>{active.budget_range || '–'}</strong></div>
                <div><span>Timeline</span><strong>{active.timeline || '–'}</strong></div>
                <div><span>Source</span><strong>{active.source || '–'}</strong></div>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Applications;
