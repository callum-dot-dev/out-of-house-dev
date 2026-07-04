import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthProvider';
import { api } from '../../lib/api';
import { useRealtimeTable } from '../../lib/realtime';
import { toast } from '../../lib/toast';
import { renderMentions } from '../../lib/mentions';
import { requestStatusLabel, requestStatusDescription } from '../../lib/statusCopy';
import { SkeletonPage } from '../../components/Skeleton';
import CommentComposer from '../../components/CommentComposer';
import { AttachmentList } from '../../components/AttachmentDropzone';

const REQUEST_STATUSES = ['submitted', 'scoped', 'building', 'review', 'shipped', 'rejected'];

const RequestDetail = () => {
  const { id } = useParams();
  const { profile, isDeveloper } = useAuth();
  const [request, setRequest] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [authors, setAuthors] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let r = null;
    try {
      const res = await api.get('/requests/' + id);
      r = res?.request ?? null;
    } catch {
      r = null;
    }
    setRequest(r);
    if (r) {
      let p = null;
      if (r.project_id) {
        try {
          const res = await api.get('/projects/' + r.project_id);
          p = res?.project ?? null;
        } catch {
          p = null;
        }
      }
      setProject(p);

      let c = [];
      try {
        const res = await api.get('/requests/' + id + '/comments');
        c = res?.comments ?? [];
      } catch {
        c = [];
      }
      setComments(c);

      // Build an author lookup from any user objects embedded in the payloads.
      const map = {};
      const collect = (person) => {
        if (person && person.id) map[person.id] = person;
      };
      c.forEach((x) => { collect(x.author); });
      collect(r.created_by_user);
      collect(r.claimed_by_user);
      collect(p?.client);
      setAuthors(map);

      let atts = [];
      try {
        const res = await api.get('/requests/' + id + '/attachments');
        atts = res?.attachments ?? [];
      } catch {
        atts = [];
      }
      setAttachments(atts);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useRealtimeTable({
    channel: `request-${id}`,
    table: 'request_comments',
    filter: `request_id=eq.${id}`,
    onChange: () => load(),
  });

  const mentionCandidates = useMemo(() => Object.values(authors), [authors]);

  const updateStatus = async (status) => {
    if (status === 'rejected' && !rejectReason && isDeveloper) {
      setShowReject(true);
      return;
    }
    const previous = request.status;
    setRequest((r) => ({ ...r, status }));
    const patch = { status };
    if (status === 'rejected' && rejectReason) patch.rejection_reason = rejectReason;
    if (status === 'shipped') patch.shipped_at = new Date().toISOString();
    try {
      await api.patch('/requests/' + id, patch);
      toast.success(`Status: ${status}`);
      setShowReject(false);
    } catch (err) {
      setRequest((r) => ({ ...r, status: previous }));
      toast.error(`Could not update: ${err.message}`);
    }
  };

  const claim = async () => {
    const nextStatus = request.status === 'submitted' ? 'scoped' : request.status;
    setRequest((r) => ({ ...r, claimed_by: profile?.id, status: nextStatus }));
    try {
      await api.patch('/requests/' + id, { claimed_by: profile?.id, status: nextStatus });
    } catch (err) {
      setRequest((r) => ({ ...r, claimed_by: null, status: request.status }));
      toast.error(err.message);
    }
  };

  const release = async () => {
    setRequest((r) => ({ ...r, claimed_by: null }));
    try {
      await api.patch('/requests/' + id, { claimed_by: null });
    } catch (err) {
      setRequest((r) => ({ ...r, claimed_by: profile?.id }));
      toast.error(err.message);
    }
  };

  if (loading || !request) return <SkeletonPage title={70} lead={50} sections={2} />;

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
            <span className={`badge badge-status badge-${request.status}`}>{requestStatusLabel(request.status)}</span>
            <span className={`badge badge-priority badge-priority-${request.priority}`}>{request.priority}</span>
            <span className="app-muted">Created {new Date(request.created_at).toLocaleString()}</span>
            {request.shipped_at && <span className="app-muted">Shipped {new Date(request.shipped_at).toLocaleDateString()}</span>}
          </div>
          {requestStatusDescription(request.status) && (
            <p className="request-status-desc">{requestStatusDescription(request.status)}</p>
          )}
        </div>
        {isDeveloper && (
          <div className="app-page-head-actions">
            <select value={request.status} onChange={(e) => updateStatus(e.target.value)} className="status-select">
              {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            {request.claimed_by
              ? (request.claimed_by === profile?.id
                ? <button className="ghost-btn" onClick={release}>Release</button>
                : <span className="app-muted">Claimed by {authors[request.claimed_by]?.full_name || 'another dev'}</span>)
              : <button className="primary-btn" onClick={claim}><span>Claim</span></button>}
          </div>
        )}
      </div>

      {showReject && isDeveloper && (
        <section className="app-card">
          <h3>Reject this request</h3>
          <p className="app-muted">The reason will be visible to the client. Be kind, be specific.</p>
          <textarea rows="3" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why are we rejecting this?" />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="primary-btn" disabled={!rejectReason.trim()} onClick={() => updateStatus('rejected')}>
              <span>Confirm reject</span>
            </button>
            <button className="ghost-btn" onClick={() => setShowReject(false)}>Cancel</button>
          </div>
        </section>
      )}

      {request.rejection_reason && (
        <section className="app-card app-card-warning">
          <h3>Reason rejected</h3>
          <p>{request.rejection_reason}</p>
        </section>
      )}

      <section className="app-card">
        <h3>Description</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>{request.description}</p>
        {request.ai_summary && (
          <div className="ai-note">
            <span className="ai-tag">AI scoping</span>
            <p>{request.ai_summary}</p>
          </div>
        )}
      </section>

      {attachments.length > 0 && (
        <section className="app-section">
          <div className="app-section-head"><h2 className="app-h2">Attachments</h2></div>
          <div className="app-card">
            <AttachmentList items={attachments} />
          </div>
        </section>
      )}

      <section className="app-section">
        <div className="app-section-head">
          <h2 className="app-h2">Conversation</h2>
        </div>
        <div className="app-card">
          {comments.length === 0 && <div className="app-empty">No comments yet.</div>}
          <div className="comments">
            {comments.map((c) => {
              const a = authors[c.author_id];
              const mine = c.author_id === profile?.id;
              return (
                <div key={c.id} className={`comment ${mine ? 'is-mine' : ''}`}>
                  <div className="comment-head">
                    <span className="comment-avatar">{(a?.full_name || a?.email || '?').slice(0, 1).toUpperCase()}</span>
                    <strong>{a?.full_name || a?.email || 'Unknown'}</strong>
                    {a?.role && <span className={`badge badge-${a.role}`}>{a.role}</span>}
                    <span className="app-muted">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p dangerouslySetInnerHTML={{ __html: renderMentions(c.body, mentionCandidates) }} />
                </div>
              );
            })}
          </div>
          <CommentComposer requestId={id} mentionCandidates={mentionCandidates} onPosted={() => load()} />
        </div>
      </section>
    </div>
  );
};

export default RequestDetail;
