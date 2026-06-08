import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../lib/AuthProvider';
import { api } from '../../../lib/api';
import { useRealtimeTable } from '../../../lib/realtime';
import { toast } from '../../../lib/toast';
import { Skeleton, SkeletonBlock } from '../../../components/Skeleton';

const COLUMNS = [
  { id: 'submitted', label: 'Submitted', next: 'scoped' },
  { id: 'scoped',    label: 'Scoped',    next: 'building', prev: 'submitted' },
  { id: 'building',  label: 'Building',  next: 'review',   prev: 'scoped' },
  { id: 'review',    label: 'In Review', next: 'shipped',  prev: 'building' },
  { id: 'shipped',   label: 'Shipped',                     prev: 'review' },
];

const Arrow = ({ dir }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {dir === 'prev'
      ? <><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></>
      : <><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></>}
  </svg>
);

const Board = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState({});
  const [authors, setAuthors] = useState({});
  const [scope, setScope] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const lastFlipRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { requests: rs } = await api.get('/board');
      const list = (rs ?? []).filter((r) => r.status !== 'rejected');
      setRequests(list);

      const pMap = {};
      const aMap = {};
      list.forEach((r) => {
        if (r.project && r.project.id) pMap[r.project.id] = r.project;
        if (r.project_id && r.project && r.project.id == null) pMap[r.project_id] = r.project;
        if (r.author && r.author.id) aMap[r.author.id] = r.author;
        if (r.claimed_by_profile && r.claimed_by_profile.id) aMap[r.claimed_by_profile.id] = r.claimed_by_profile;
      });
      setProjects(pMap);
      setAuthors(aMap);
    } catch (e) {
      setRequests([]);
      setProjects({});
      setAuthors({});
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useRealtimeTable({
    channel: 'board-feature-requests',
    table: 'feature_requests',
    onChange: (payload) => {
      const { eventType, new: row, old } = payload;
      setRequests((rs) => {
        if (eventType === 'INSERT') return [row, ...rs.filter((r) => r.id !== row.id)];
        if (eventType === 'UPDATE') return rs.map((r) => (r.id === row.id ? { ...r, ...row } : r));
        if (eventType === 'DELETE') return rs.filter((r) => r.id !== (old?.id || row?.id));
        return rs;
      });
    },
  });

  const move = async (request, direction) => {
    const col = COLUMNS.find((c) => c.id === request.status);
    const target = direction === 'next' ? col?.next : col?.prev;
    if (!target) return;
    lastFlipRef.current = request.id;
    setRequests((rs) => rs.map((r) => (r.id === request.id ? { ...r, status: target } : r)));
    try {
      await api.patch('/requests/' + request.id, { status: target });
      toast.success(`Moved to ${target}`);
    } catch (e) {
      setRequests((rs) => rs.map((r) => (r.id === request.id ? { ...r, status: request.status } : r)));
      toast.error(`Could not move: ${e.message}`);
    }
  };

  const claim = async (request) => {
    const nextStatus = request.status === 'submitted' ? 'scoped' : request.status;
    setRequests((rs) => rs.map((r) => (r.id === request.id ? { ...r, claimed_by: profile?.id, status: nextStatus } : r)));
    try {
      await api.patch('/requests/' + request.id, { claimed_by: profile?.id, status: nextStatus });
    } catch (e) {
      setRequests((rs) => rs.map((r) => (r.id === request.id ? { ...r, claimed_by: null, status: request.status } : r)));
      toast.error(`Could not claim: ${e.message}`);
    }
  };

  const release = async (request) => {
    setRequests((rs) => rs.map((r) => (r.id === request.id ? { ...r, claimed_by: null } : r)));
    try {
      await api.patch('/requests/' + request.id, { claimed_by: null });
    } catch (e) {
      setRequests((rs) => rs.map((r) => (r.id === request.id ? { ...r, claimed_by: profile?.id } : r)));
      toast.error('Could not release');
    }
  };

  const visible = requests.filter((r) => {
    if (scope === 'mine' && r.claimed_by !== profile?.id) return false;
    if (scope === 'unclaimed' && r.claimed_by) return false;
    if (projectFilter !== 'all' && r.project_id !== projectFilter) return false;
    return true;
  });

  const projectsList = Object.values(projects);

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Work board</div>
          <h1 className="app-h1">All open requests.</h1>
        </div>
        <div className="board-filters">
          {projectsList.length > 0 && (
            <select
              className="status-select"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label="Filter by project"
            >
              <option value="all">All projects</option>
              {projectsList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="filter-pills">
            {['all', 'mine', 'unclaimed'].map((s) => (
              <button key={s} className={`filter-pill ${scope === s ? 'is-active' : ''}`} onClick={() => setScope(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="board">
        {COLUMNS.map((col) => {
          const items = visible.filter((r) => r.status === col.id);
          return (
            <div key={col.id} className="board-col">
              <div className="board-col-head">
                <span>{col.label}</span>
                <span className="board-col-count">{items.length}</span>
              </div>
              <div className="board-col-body">
                {loading && (
                  <div className="board-card board-card-skeleton">
                    <Skeleton h={12} w="40%" />
                    <div style={{ height: 8 }} />
                    <SkeletonBlock rows={2} />
                  </div>
                )}
                {!loading && items.length === 0 && <div className="board-empty">·</div>}
                {!loading && items.map((r) => {
                  const proj = projects[r.project_id];
                  const client = proj ? authors[proj.client_id] : null;
                  const claimedBy = r.claimed_by ? authors[r.claimed_by] : null;
                  const mine = r.claimed_by === profile?.id;
                  const flipping = lastFlipRef.current === r.id;
                  return (
                    <div key={r.id} className={`board-card ${flipping ? 'is-flipping' : ''}`}>
                      <div className="board-card-meta">
                        <span className={`badge badge-priority badge-priority-${r.priority}`}>{r.priority}</span>
                        {!r.claimed_by ? (
                          <button type="button" className="board-card-claim" onClick={() => claim(r)}>Claim</button>
                        ) : mine ? (
                          <button type="button" className="board-card-claim is-mine" onClick={() => release(r)}>You · Release</button>
                        ) : (
                          <span className="board-card-claimed">{claimedBy?.full_name || claimedBy?.email || 'Claimed'}</span>
                        )}
                      </div>
                      <Link to={`/app/requests/${r.id}`} className="board-card-title">{r.title}</Link>
                      {proj && (
                        <div className="board-card-project">
                          {proj.name}{client?.company ? ` · ${client.company}` : ''}
                        </div>
                      )}
                      {r.ai_estimated_hours != null && (
                        <div className="board-card-ai">AI est: {r.ai_estimated_hours}h</div>
                      )}
                      <div className="board-card-actions">
                        {col.prev && (
                          <button type="button" className="ghost-btn" title={`Move to ${col.prev}`} onClick={() => move(r, 'prev')}>
                            <Arrow dir="prev" />
                          </button>
                        )}
                        {col.next && (
                          <button type="button" className="ghost-btn primary" title={`Move to ${col.next}`} onClick={() => move(r, 'next')}>
                            <Arrow dir="next" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Board;
