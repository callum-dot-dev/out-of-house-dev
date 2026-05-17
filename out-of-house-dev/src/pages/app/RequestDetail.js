import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabase';

const REQUEST_STATUSES = ['submitted','scoped','building','review','shipped','rejected'];

const RequestDetail = () => {
  const { id } = useParams();
  const { profile, isDeveloper } = useAuth();
  const [request, setRequest] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [authors, setAuthors] = useState({});
  const [body, setBody] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const { data: r } = await supabase.from('feature_requests').select('*').eq('id', id).single();
    setRequest(r);
    if (r) {
      const { data: p } = await supabase.from('projects').select('*').eq('id', r.project_id).single();
      setProject(p);
      const { data: c } = await supabase.from('request_comments').select('*').eq('request_id', id).order('created_at', { ascending: true });
      setComments(c ?? []);
      const ids = Array.from(new Set((c ?? []).map(x => x.author_id))).filter(Boolean);
      if (ids.length) {
        const { data: pp } = await supabase.from('profiles').select('id, full_name, email, role').in('id', ids);
        const map = {};
        (pp ?? []).forEach(x => { map[x.id] = x; });
        setAuthors(map);
      } else {
        setAuthors({});
      }
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (status) => {
    await supabase.from('feature_requests').update({ status }).eq('id', id);
    load();
  };

  const claim = async () => {
    await supabase.from('feature_requests').update({ claimed_by: profile.id, status: request.status === 'submitted' ? 'scoped' : request.status }).eq('id', id);
    load();
  };

  const release = async () => {
    await supabase.from('feature_requests').update({ claimed_by: null }).eq('id', id);
    load();
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setWorking(true);
    const { error } = await supabase.from('request_comments').insert([{ request_id: id, author_id: profile.id, body }]);
    setWorking(false);
    if (!error) { setBody(''); load(); }
  };

  if (!request) return <div className="app-empty">Loading…</div>;

  return (
    <div className="app-page">
      <div className="app-breadcrumb">
        <Link to="/app/projects">Projects</Link> <span>/</span>{' '}
        {project && <><Link to={`/app/projects/${project.id}`}>{project.name}</Link> <span>/</span> </>}
        <span>{request.title}</span>
      </div>

      <div className="app-page-head">
        <div>
          <div className="eyebrow">Feature request</div>
          <h1 className="app-h1">{request.title}</h1>
          <div className="request-meta">
            <span className={`badge badge-status badge-${request.status}`}>{request.status}</span>
            <span className={`badge badge-priority badge-priority-${request.priority}`}>{request.priority}</span>
            <span className="app-muted">Created {new Date(request.created_at).toLocaleString()}</span>
          </div>
        </div>
        {isDeveloper && (
          <div className="app-page-head-actions">
            <select value={request.status} onChange={e => updateStatus(e.target.value)} className="status-select">
              {REQUEST_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            {request.claimed_by ? (
              request.claimed_by === profile.id
                ? <button className="ghost-btn" onClick={release}>Release</button>
                : <span className="app-muted">Claimed by {authors[request.claimed_by]?.full_name || 'another dev'}</span>
            ) : (
              <button className="primary-btn" onClick={claim}><span>Claim</span></button>
            )}
          </div>
        )}
      </div>

      <section className="app-card">
        <h3>Description</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{request.description}</p>
      </section>

      <section className="app-section">
        <div className="app-section-head">
          <h2 className="app-h2">Conversation</h2>
        </div>
        <div className="app-card">
          {comments.length === 0 && <div className="app-empty">No comments yet.</div>}
          <div className="comments">
            {comments.map(c => {
              const a = authors[c.author_id];
              const mine = c.author_id === profile.id;
              return (
                <div key={c.id} className={`comment ${mine ? 'is-mine' : ''}`}>
                  <div className="comment-head">
                    <strong>{a?.full_name || a?.email || 'Unknown'}</strong>
                    {a?.role && <span className={`badge badge-${a.role}`}>{a.role}</span>}
                    <span className="app-muted">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p>{c.body}</p>
                </div>
              );
            })}
          </div>
          <form onSubmit={addComment} className="comment-form">
            <textarea
              rows="3"
              placeholder="Write a comment…"
              value={body}
              onChange={e => setBody(e.target.value)}
            />
            <button className="primary-btn" disabled={working || !body.trim()}><span>Send</span></button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default RequestDetail;
