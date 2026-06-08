import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabase';
import { useRealtimeTable } from '../../lib/realtime';
import { toast } from '../../lib/toast';
import { renderMentions } from '../../lib/mentions';
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
    const { data: r } = await supabase.from('feature_requests').select('*').eq('id', id).single();
    setRequest(r);
    if (r) {
      const { data: p } = await supabase.from('projects').select('*').eq('id', r.project_id).single();
      setProject(p);
      const { data: c } = await supabase
        .from('request_comments')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: true });
      setComments(c ?? []);
      const ids = Array.from(new Set([
        ...(c ?? []).map((x) => x.author_id),
        r.claimed_by,
        r.created_by,
        p?.client_id,
      ].filter(Boolean)));
      const { data: pp } = ids.length
        ? await supabase.from('profiles').select('id, full_name, email, role').in('id', ids)
        : { data: [] };
      const map = {};
      (pp ?? []).forEach((x) => { map[x.id] = x; });
      setAuthors(map);

      const { data: atts } = await supabase
        .from('attachments')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: true });
      setAttachments(atts ?? []);
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
    const { error } = await supabase.from('feature_requests').update(patch).eq('id', id);
    if (error) {
      setRequest((r) => ({ ...r, status: previous }));
      toast.error(`Could not update: ${error.message}`);
    } else {
      toast.success(`Status: ${status}`);
      setShowReject(false);
      if (status === 'shipped') {
        // Auto-draft a changelog entry the dev can edit
        await supabase.from('changelog_entries').insert([{
          project_id: request.project_id,
          request_id: id,
          title: request.title,
          body_md: request.description?.slice(0, 600) || '',
          is_public: false,
        }]).then(() => toast.info('Changelog entry drafted.'));
      }
    }
  };

  const claim = async () => {
    const nextStatus = request.status === 'submitted' ? 'scoped' : request.status;
    setRequest((r) => ({ ...r, claimed_by: profile?.id, status: nextStatus }));
    const { error } = await supabase.from('feature_requests').update({ claimed_by: profile?.id, status: nextStatus }).eq('id', id);
    if (error) {
      setRequest((r) => ({ ...r, claimed_by: null, status: request.status }));
      toast.error(error.message);
    }
  };

  const release = async () => {
    setRequest((r) => ({ ...r, claimed_by: null }));
    const { error } = await supabase.from('feature_requests').update({ claimed_by: null }).eq('id', id);
    if (error) {
      setRequest((r) => ({ ...r, claimed_by: profile?.id }));
      toast.error(error.message);
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
            <span className={`badge badge-status badge-${request.status}`}>{request.status}</span>
            <span className={`badge badge-priority badge-priority-${request.priority}`}>{request.priority}</span>
            <span className="app-muted">Created {new Date(request.created_at).toLocaleString()}</span>
            {request.shipped_at && <span className="app-muted">Shipped {new Date(request.shipped_at).toLocaleDateString()}</span>}
          </div>
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
