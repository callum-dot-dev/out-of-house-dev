import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabase';
import { useRealtimeTable } from '../../lib/realtime';
import { toast } from '../../lib/toast';
import VoiceCapture from '../../components/VoiceCapture';
import DocumentRoom from '../../components/DocumentRoom';
import { SkeletonPage } from '../../components/Skeleton';

const PROJECT_STATUSES = ['discovery', 'building', 'live', 'paused', 'completed'];

const TYPE_LABEL = {
  website: 'Website', automation: 'AI automation', web_app: 'Web app',
  custom_software: 'Custom software', platform: 'Platform', other: 'Other',
};

const ProjectDetail = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, isDeveloper, isClient } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [requests, setRequests] = useState([]);
  const [plan, setPlan] = useState(null);
  const [activity, setActivity] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newReq, setNewReq] = useState({ title: '', description: '', priority: 'medium' });
  const [working, setWorking] = useState(false);
  const [tab, setTab] = useState(searchParams.get('tab') || 'requests');
  const [decisions, setDecisions] = useState([]);
  const [changelog, setChangelog] = useState([]);
  const [reordering, setReordering] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const changeTab = (next) => {
    setTab(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'requests') nextParams.delete('tab');
    else nextParams.set('tab', next);
    setSearchParams(nextParams, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data: p } = await supabase.from('projects').select('*').eq('id', id).single();
    setProject(p);
    if (p) {
      const { data: c } = await supabase.from('profiles').select('*').eq('id', p.client_id).single();
      setClient(c);
      const { data: r } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('project_id', id)
        .order('client_priority_rank', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      setRequests(r ?? []);
      const { data: pl } = await supabase.from('project_plans').select('*').eq('project_id', id).maybeSingle();
      setPlan(pl);
      const { data: ev } = await supabase
        .from('activity_events')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(40);
      setActivity(ev ?? []);
      const { data: dec } = await supabase
        .from('decisions')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      setDecisions(dec ?? []);
      const { data: ch } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      setChangelog(ch ?? []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useRealtimeTable({
    channel: `project-${id}`,
    table: 'feature_requests',
    filter: `project_id=eq.${id}`,
    onChange: () => load(),
  });

  useRealtimeTable({
    channel: `project-activity-${id}`,
    table: 'activity_events',
    filter: `project_id=eq.${id}`,
    onChange: (payload) => {
      if (payload.eventType === 'INSERT') setActivity((xs) => [payload.new, ...xs].slice(0, 40));
    },
  });

  const submitRequest = async (e) => {
    e.preventDefault();
    setWorking(true);
    const { data, error } = await supabase
      .from('feature_requests')
      .insert([{ ...newReq, project_id: id, created_by: profile?.id }])
      .select()
      .maybeSingle();
    setWorking(false);
    if (error) {
      toast.error(`Could not submit: ${error.message}`);
    } else {
      toast.success('Request submitted.');
      setNewReq({ title: '', description: '', priority: 'medium' });
      setShowNew(false);
      if (data) setRequests((rs) => [data, ...rs]);
    }
  };

  const updateProjectStatus = async (status) => {
    const prev = project.status;
    setProject((p) => ({ ...p, status }));
    const { error } = await supabase.from('projects').update({ status }).eq('id', id);
    if (error) {
      setProject((p) => ({ ...p, status: prev }));
      toast.error(error.message);
    } else {
      toast.success(`Project status: ${status}`);
    }
  };

  const updatePreviewUrl = async () => {
    const next = window.prompt('Preview URL (staging build link)', project.preview_url || 'https://');
    if (next == null) return;
    const trimmed = next.trim();
    setProject((p) => ({ ...p, preview_url: trimmed || null }));
    await supabase.from('projects').update({ preview_url: trimmed || null }).eq('id', id);
    toast.success('Preview URL saved.');
  };

  const toggleShowcase = async () => {
    const next = !project.showcase_opt_in;
    setProject((p) => ({ ...p, showcase_opt_in: next }));
    await supabase.from('projects').update({ showcase_opt_in: next }).eq('id', id);
    toast.success(next ? 'Listed on public showcase.' : 'Removed from showcase.');
  };

  // Drag-to-prioritize
  const onDragStart = (e, rId) => {
    if (!isClient) return;
    setDraggedId(rId);
    setReordering(true);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e, overId) => {
    if (!isClient || !draggedId || draggedId === overId) return;
    e.preventDefault();
    setRequests((rs) => {
      const draggedIdx = rs.findIndex((x) => x.id === draggedId);
      const overIdx = rs.findIndex((x) => x.id === overId);
      if (draggedIdx < 0 || overIdx < 0) return rs;
      const next = rs.slice();
      const [removed] = next.splice(draggedIdx, 1);
      next.splice(overIdx, 0, removed);
      return next;
    });
  };
  const onDragEnd = async () => {
    setDraggedId(null);
    if (!reordering) return;
    setReordering(false);
    const updates = requests.map((r, i) => ({ id: r.id, rank: i }));
    const { error } = await supabase.rpc('reorder_requests', { items: updates }).catch(async () => {
      // Fallback: do individual updates
      for (const u of updates) {
        await supabase.from('feature_requests').update({ client_priority_rank: u.rank }).eq('id', u.id);
      }
      return { error: null };
    });
    if (error) toast.error('Could not save order.');
    else toast.success('Priority saved.');
  };

  const onVoiceCaptured = ({ placeholder }) => {
    setShowNew(true);
    setNewReq((r) => ({ ...r, description: r.description ? `${r.description}\n\n${placeholder}` : placeholder }));
  };

  if (loading || !project) return <SkeletonPage title={70} sections={2} />;

  return (
    <div className="app-page">
      <div className="app-breadcrumb">
        <Link to="/app/projects">Projects</Link> <span>/</span> <span>{project.name}</span>
      </div>

      <div className="app-page-head">
        <div>
          <div className="eyebrow">{TYPE_LABEL[project.project_type] || project.project_type}</div>
          <h1 className="app-h1">{project.name}</h1>
          {!isClient && client && <p className="app-muted">Client: {client.full_name || client.email} {client.company && `· ${client.company}`}</p>}
          <p className="app-lead">{project.description}</p>
          {project.preview_url && (
            <a className="preview-link" href={project.preview_url} target="_blank" rel="noopener noreferrer">
              See latest build <span aria-hidden="true">›</span>
            </a>
          )}
        </div>
        <div className="app-page-head-actions">
          {isDeveloper ? (
            <select value={project.status} onChange={(e) => updateProjectStatus(e.target.value)} className="status-select">
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          ) : (
            <span className={`badge badge-status badge-${project.status}`}>{project.status}</span>
          )}
          {isDeveloper && (
            <>
              <button type="button" className="ghost-btn" onClick={updatePreviewUrl}>Set preview URL</button>
              <button type="button" className="ghost-btn" onClick={toggleShowcase}>
                {project.showcase_opt_in ? 'Showcase: on' : 'Showcase: off'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tab-row">
        {[
          { id: 'requests',  label: 'Requests' },
          ...(plan ? [{ id: 'plan', label: 'Plan' }] : []),
          { id: 'docs',      label: 'Document Room' },
          { id: 'activity',  label: 'Activity' },
          { id: 'decisions', label: 'Decisions' },
          { id: 'changelog', label: 'Changelog' },
          { id: 'brain',     label: 'Project Brain' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-btn ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => changeTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <>
          {!plan && isDeveloper && (
            <div className="app-card app-empty-card">
              <h3>No plan attached</h3>
              <p>Spawn a plan-of-action template against this project to give the team (and Claude Code) a structured handoff.</p>
              <button className="primary-btn" onClick={() => navigate(`/app/plans?attach=${id}&type=${project.project_type}`)}>
                <span>Browse plan library</span>
              </button>
            </div>
          )}

          <section className="app-section">
            <div className="app-section-head">
              <h2 className="app-h2">Feature requests</h2>
              <div style={{ display: 'flex', gap: 10 }}>
                {isClient && (
                  <VoiceCapture
                    projectId={id}
                    label="Voice memo"
                    onTranscript={onVoiceCaptured}
                  />
                )}
                <button className="primary-btn" onClick={() => setShowNew((s) => !s)}>
                  <span>{showNew ? 'Cancel' : 'New request'}</span>
                </button>
              </div>
            </div>

            <div className={`new-request-wrap ${showNew ? 'is-open' : ''}`}>
              <div className="new-request-inner">
                <div className="app-card">
                  <form className="auth-form" onSubmit={submitRequest}>
                    <label>
                      <span>Title</span>
                      <input required value={newReq.title} onChange={(e) => setNewReq((r) => ({ ...r, title: e.target.value }))} placeholder="One sentence summary" />
                    </label>
                    <label>
                      <span>Description</span>
                      <textarea required rows="5" value={newReq.description} onChange={(e) => setNewReq((r) => ({ ...r, description: e.target.value }))} placeholder="What do you need? What's the context? Type @ to mention someone." />
                    </label>
                    <label>
                      <span>Priority</span>
                      <select value={newReq.priority} onChange={(e) => setNewReq((r) => ({ ...r, priority: e.target.value }))}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </label>
                    <button className="primary-btn auth-submit" disabled={working || !newReq.title.trim()}>
                      <span>{working ? 'Submitting…' : 'Submit request'}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {requests.length === 0 ? (
              <div className="app-card app-empty">No requests yet.</div>
            ) : (
              <div className={`request-grid ${isClient ? 'is-draggable' : ''}`} onDragEnd={onDragEnd}>
                {requests.map((r, idx) => (
                  <div
                    key={r.id}
                    className={`request-card-wrap ${draggedId === r.id ? 'is-dragging' : ''}`}
                    draggable={isClient}
                    onDragStart={(e) => onDragStart(e, r.id)}
                    onDragOver={(e) => onDragOver(e, r.id)}
                  >
                    {isClient && (
                      <span className="request-rank" title="Drag to reorder">{String(idx + 1).padStart(2, '0')}</span>
                    )}
                    <Link to={`/app/requests/${r.id}`} className="request-card">
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
                  </div>
                ))}
              </div>
            )}
            {isClient && requests.length > 1 && (
              <p className="app-muted" style={{ marginTop: 10 }}>Drag cards to reorder. The team works top to bottom.</p>
            )}
          </section>
        </>
      )}

      {tab === 'plan' && plan && (
        <section className="app-section">
          <div className="app-section-head">
            <h2 className="app-h2">Plan of action</h2>
          </div>
          <div className="app-card">
            <PlanProgress plan={plan} canEdit={isDeveloper} onAdvance={async (nextIdx) => {
              setPlan((pl) => ({ ...pl, current_phase_index: nextIdx }));
              await supabase.from('project_plans').update({ current_phase_index: nextIdx }).eq('id', plan.id);
              toast.success('Plan advanced.');
            }} />
          </div>
        </section>
      )}

      {tab === 'docs' && (
        <DocumentRoom projectId={id} />
      )}

      {tab === 'activity' && (
        <section className="app-section">
          <div className="app-section-head">
            <h2 className="app-h2">Live activity</h2>
          </div>
          <div className="app-card">
            {activity.length === 0 ? (
              <div className="app-empty">Nothing yet.</div>
            ) : (
              <ul className="activity-feed">
                {activity.map((ev) => (
                  <li key={ev.id} className={`activity-row activity-${ev.kind?.split('.')[0]}`}>
                    <span className="activity-dot" />
                    <div>
                      <strong>{ev.title}</strong>
                      {ev.body && <p>{ev.body}</p>}
                      <span className="app-muted">{new Date(ev.created_at).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {tab === 'decisions' && (
        <DecisionsTab project={project} decisions={decisions} canEdit={isDeveloper} onChange={load} />
      )}

      {tab === 'changelog' && (
        <ChangelogTab project={project} changelog={changelog} canEdit={isDeveloper} onChange={load} />
      )}

      {tab === 'brain' && (
        <BrainTab project={project} />
      )}
    </div>
  );
};

const PlanProgress = ({ plan, canEdit, onAdvance }) => {
  const phases = plan.phases || [];
  const idx = plan.current_phase_index || 0;
  const total = Math.max(1, phases.length);
  const pct = Math.min(100, (idx / total) * 100);
  return (
    <div className="plan-progress">
      <div className="plan-progress-bar">
        <div style={{ width: `${pct}%` }} />
      </div>
      <ul className="plan-progress-list">
        {phases.map((ph, i) => (
          <li key={i} className={i < idx ? 'is-done' : i === idx ? 'is-current' : ''}>
            <span className="plan-progress-marker">
              {i < idx ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              ) : String(i + 1).padStart(2, '0')}
            </span>
            <div className="plan-progress-text">
              <strong>{ph.name}</strong>
              <span>{ph.goal}</span>
              {ph.duration && <em className="app-muted">{ph.duration}</em>}
            </div>
          </li>
        ))}
      </ul>
      {canEdit && idx < phases.length && (
        <div className="plan-progress-actions">
          <button type="button" className="primary-btn" onClick={() => onAdvance(idx + 1)}>
            <span>Advance to phase {String(idx + 2).padStart(2, '0')}</span>
          </button>
          {idx > 0 && (
            <button type="button" className="ghost-btn" onClick={() => onAdvance(idx - 1)}>Step back</button>
          )}
        </div>
      )}
      {idx >= phases.length && phases.length > 0 && <div className="plan-progress-complete">All phases complete.</div>}
    </div>
  );
};

const DecisionsTab = ({ project, decisions, canEdit, onChange }) => {
  const [summary, setSummary] = useState('');
  const [detail, setDetail] = useState('');
  const { profile } = useAuth();

  const add = async (e) => {
    e.preventDefault();
    if (!summary.trim()) return;
    const { error } = await supabase.from('decisions').insert([{
      project_id: project.id, summary: summary.trim(), detail: detail.trim() || null, created_by: profile?.id, confirmed: true,
    }]);
    if (error) toast.error(error.message);
    else {
      toast.success('Decision logged.');
      setSummary(''); setDetail('');
      onChange?.();
    }
  };

  return (
    <section className="app-section">
      <div className="app-section-head"><h2 className="app-h2">Decisions log</h2></div>
      <div className="app-card">
        {canEdit && (
          <form className="auth-form" onSubmit={add} style={{ marginBottom: 24 }}>
            <label>
              <span>Decision</span>
              <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="We're going with…" />
            </label>
            <label>
              <span>Context (optional)</span>
              <textarea rows="3" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Why, what was considered, who decided." />
            </label>
            <button className="primary-btn auth-submit" disabled={!summary.trim()}><span>Log decision</span></button>
          </form>
        )}
        {decisions.length === 0 ? (
          <div className="app-empty">No decisions logged yet. As the team makes choices, they land here.</div>
        ) : (
          <ul className="decisions-list">
            {decisions.map((d) => (
              <li key={d.id} className="decision-row">
                <span className="decision-dot" />
                <div>
                  <strong>{d.summary}</strong>
                  {d.detail && <p>{d.detail}</p>}
                  <span className="app-muted">{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

const ChangelogTab = ({ project, changelog, canEdit, onChange }) => {
  const togglePublic = async (entry) => {
    await supabase.from('changelog_entries').update({
      is_public: !entry.is_public,
      published_at: !entry.is_public ? new Date().toISOString() : entry.published_at,
    }).eq('id', entry.id);
    toast.success(!entry.is_public ? 'Published.' : 'Hidden.');
    onChange?.();
  };

  return (
    <section className="app-section">
      <div className="app-section-head">
        <h2 className="app-h2">Changelog</h2>
        {project.slug && <Link className="app-link" to={`/changelog/${project.slug}`}>Public page →</Link>}
      </div>
      <div className="app-card">
        {changelog.length === 0 ? (
          <div className="app-empty">Shipped requests will draft changelog entries here.</div>
        ) : (
          <ul className="changelog-list">
            {changelog.map((c) => (
              <li key={c.id} className="changelog-row">
                <div>
                  <h3>{c.title}</h3>
                  {c.body_md && <p>{c.body_md}</p>}
                  <span className="app-muted">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                {canEdit && (
                  <button type="button" className="ghost-btn" onClick={() => togglePublic(c)}>
                    {c.is_public ? 'Public' : 'Draft'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

const BrainTab = ({ project }) => {
  const [q, setQ] = useState('');
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState([]);

  const ask = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setThinking(true);
    const question = q.trim();
    setQ('');
    setHistory((h) => [...h, { role: 'user', text: question }]);
    // Placeholder — when AI worker is configured, route through an Edge Function.
    setTimeout(() => {
      setHistory((h) => [...h, {
        role: 'assistant',
        text:
          'Project Brain answers questions across every request, comment, and decision on this project. ' +
          'Wire up an OpenAI / Anthropic key + Supabase Edge Function and pgvector, and I will answer ' +
          'with citations from your project history.',
      }]);
      setThinking(false);
    }, 600);
  };

  return (
    <section className="app-section">
      <div className="app-section-head">
        <h2 className="app-h2">Project Brain</h2>
        <span className="app-muted">AI memory across this project</span>
      </div>
      <div className="app-card brain-card">
        <div className="brain-history">
          {history.length === 0 && (
            <div className="brain-empty">
              <strong>Ask anything about {project.name}.</strong>
              <p className="app-muted">"What did we decide about pricing?" · "Show me everything tagged urgent." · "Summarize last week."</p>
            </div>
          )}
          {history.map((m, i) => (
            <div key={i} className={`brain-msg brain-msg-${m.role}`}>
              <p>{m.text}</p>
            </div>
          ))}
          {thinking && <div className="brain-msg brain-msg-assistant"><p className="app-muted">Thinking…</p></div>}
        </div>
        <form onSubmit={ask} className="brain-form">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask the brain…" />
          <button className="primary-btn" disabled={thinking || !q.trim()}><span>Ask</span></button>
        </form>
      </div>
    </section>
  );
};

export default ProjectDetail;
