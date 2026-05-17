import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabase';

const REQUEST_STATUSES = ['submitted','scoped','building','review','shipped','rejected'];
const PROJECT_STATUSES = ['discovery','building','live','paused','completed'];

const ProjectDetail = () => {
  const { id } = useParams();
  const { profile, isDeveloper, isClient } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [requests, setRequests] = useState([]);
  const [plan, setPlan] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newReq, setNewReq] = useState({ title: '', description: '', priority: 'medium' });
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const { data: p } = await supabase.from('projects').select('*').eq('id', id).single();
    setProject(p);
    if (p) {
      const { data: c } = await supabase.from('profiles').select('*').eq('id', p.client_id).single();
      setClient(c);
      const { data: r } = await supabase.from('feature_requests').select('*').eq('project_id', id).order('created_at', { ascending: false });
      setRequests(r ?? []);
      const { data: pl } = await supabase.from('project_plans').select('*').eq('project_id', id).maybeSingle();
      setPlan(pl);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const submitRequest = async (e) => {
    e.preventDefault();
    setWorking(true);
    const { error } = await supabase.from('feature_requests').insert([{
      ...newReq,
      project_id: id,
      created_by: profile?.id,
    }]);
    setWorking(false);
    if (!error) {
      setNewReq({ title: '', description: '', priority: 'medium' });
      setShowNew(false);
      load();
    }
  };

  const updateProjectStatus = async (status) => {
    await supabase.from('projects').update({ status }).eq('id', id);
    load();
  };

  if (!project) return <div className="app-empty">Loading project…</div>;

  return (
    <div className="app-page">
      <div className="app-breadcrumb">
        <Link to="/app/projects">Projects</Link> <span>/</span> <span>{project.name}</span>
      </div>

      <div className="app-page-head">
        <div>
          <div className="eyebrow">{project.project_type.replace('_',' ')}</div>
          <h1 className="app-h1">{project.name}</h1>
          {!isClient && client && <p className="app-muted">Client: {client.full_name || client.email} {client.company && `· ${client.company}`}</p>}
          <p className="app-lead">{project.description}</p>
        </div>
        <div className="app-page-head-actions">
          {isDeveloper ? (
            <select value={project.status} onChange={e => updateProjectStatus(e.target.value)} className="status-select">
              {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          ) : (
            <span className={`badge badge-status badge-${project.status}`}>{project.status}</span>
          )}
        </div>
      </div>

      {plan && (
        <section className="app-section">
          <div className="app-section-head">
            <h2 className="app-h2">Plan of action</h2>
            <Link to={`/app/projects/${id}/plan`} className="app-link">Open plan →</Link>
          </div>
          <div className="app-card">
            <PlanProgress plan={plan} />
          </div>
        </section>
      )}

      {!plan && isDeveloper && (
        <section className="app-section">
          <div className="app-card app-empty-card">
            <h3>No plan attached</h3>
            <p>Spawn a plan-of-action template against this project to give the team (and Claude Code) a structured handoff.</p>
            <button className="primary-btn" onClick={() => navigate(`/app/plans?attach=${id}&type=${project.project_type}`)}><span>Browse plan library</span></button>
          </div>
        </section>
      )}

      <section className="app-section">
        <div className="app-section-head">
          <h2 className="app-h2">Feature requests</h2>
          <button className="primary-btn" onClick={() => setShowNew(s => !s)}><span>{showNew ? 'Cancel' : 'New request'}</span></button>
        </div>

        {showNew && (
          <div className="app-card">
            <form className="auth-form" onSubmit={submitRequest}>
              <label>
                <span>Title</span>
                <input required value={newReq.title} onChange={e => setNewReq(r => ({ ...r, title: e.target.value }))} placeholder="One sentence summary" />
              </label>
              <label>
                <span>Description</span>
                <textarea required rows="4" value={newReq.description} onChange={e => setNewReq(r => ({ ...r, description: e.target.value }))} placeholder="What do you need? What's the context?" />
              </label>
              <label>
                <span>Priority</span>
                <select value={newReq.priority} onChange={e => setNewReq(r => ({ ...r, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <button className="primary-btn auth-submit" disabled={working}><span>Submit request</span></button>
            </form>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="app-card app-empty">No requests yet.</div>
        ) : (
          <div className="request-grid">
            {requests.map(r => (
              <Link to={`/app/requests/${r.id}`} key={r.id} className="request-card">
                <div className="request-card-head">
                  <span className={`badge badge-status badge-${r.status}`}>{r.status}</span>
                  <span className={`badge badge-priority badge-priority-${r.priority}`}>{r.priority}</span>
                </div>
                <h3>{r.title}</h3>
                <p>{r.description.slice(0, 160)}{r.description.length > 160 ? '…' : ''}</p>
                <div className="request-card-foot app-muted">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const PlanProgress = ({ plan }) => {
  const phases = plan.phases || [];
  const done = phases.slice(0, plan.current_phase_index);
  return (
    <div className="plan-progress">
      <div className="plan-progress-bar">
        <div style={{ width: `${(plan.current_phase_index / Math.max(1, phases.length)) * 100}%` }} />
      </div>
      <ul className="plan-progress-list">
        {phases.map((ph, i) => (
          <li key={i} className={i < plan.current_phase_index ? 'is-done' : i === plan.current_phase_index ? 'is-current' : ''}>
            <span className="plan-progress-marker">{String(i+1).padStart(2,'0')}</span>
            <div>
              <strong>{ph.name}</strong>
              <span>{ph.goal}</span>
            </div>
          </li>
        ))}
      </ul>
      {done.length === phases.length && phases.length > 0 && <div className="app-muted">All phases complete.</div>}
    </div>
  );
};

export default ProjectDetail;
