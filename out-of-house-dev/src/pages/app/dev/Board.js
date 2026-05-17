import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../lib/AuthProvider';
import { supabase } from '../../../lib/supabase';

const COLUMNS = [
  { id: 'submitted', label: 'Submitted',  next: 'scoped'   },
  { id: 'scoped',    label: 'Scoped',     next: 'building', prev: 'submitted' },
  { id: 'building',  label: 'Building',   next: 'review',   prev: 'scoped' },
  { id: 'review',    label: 'In Review',  next: 'shipped',  prev: 'building' },
  { id: 'shipped',   label: 'Shipped',                       prev: 'review' },
];

const Board = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState({});
  const [authors, setAuthors] = useState({});
  const [scope, setScope] = useState('all'); // 'all' | 'mine' | 'unclaimed'

  const load = useCallback(async () => {
    const { data: rs } = await supabase
      .from('feature_requests')
      .select('*')
      .neq('status', 'rejected')
      .order('updated_at', { ascending: false });
    setRequests(rs ?? []);

    const projectIds = Array.from(new Set((rs ?? []).map(r => r.project_id)));
    if (projectIds.length) {
      const { data: ps } = await supabase.from('projects').select('id, name, client_id').in('id', projectIds);
      const pMap = {}; (ps ?? []).forEach(p => { pMap[p.id] = p; });
      setProjects(pMap);

      const clientIds = Array.from(new Set((ps ?? []).map(p => p.client_id)));
      const claimedIds = Array.from(new Set((rs ?? []).map(r => r.claimed_by).filter(Boolean)));
      const ids = Array.from(new Set([...clientIds, ...claimedIds]));
      if (ids.length) {
        const { data: pp } = await supabase.from('profiles').select('id, full_name, email, company').in('id', ids);
        const aMap = {}; (pp ?? []).forEach(p => { aMap[p.id] = p; });
        setAuthors(aMap);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const move = async (request, direction) => {
    const col = COLUMNS.find(c => c.id === request.status);
    const target = direction === 'next' ? col?.next : col?.prev;
    if (!target) return;
    await supabase.from('feature_requests').update({ status: target }).eq('id', request.id);
    load();
  };

  const claim = async (request) => {
    await supabase.from('feature_requests').update({ claimed_by: profile?.id, status: request.status === 'submitted' ? 'scoped' : request.status }).eq('id', request.id);
    load();
  };

  const release = async (request) => {
    await supabase.from('feature_requests').update({ claimed_by: null }).eq('id', request.id);
    load();
  };

  const visible = requests.filter(r => {
    if (scope === 'mine')      return r.claimed_by === profile?.id;
    if (scope === 'unclaimed') return !r.claimed_by;
    return true;
  });

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Work board</div>
          <h1 className="app-h1">All open requests.</h1>
        </div>
        <div className="filter-pills">
          {['all','mine','unclaimed'].map(s => (
            <button key={s} className={`filter-pill ${scope === s ? 'is-active' : ''}`} onClick={() => setScope(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="board">
        {COLUMNS.map(col => {
          const items = visible.filter(r => r.status === col.id);
          return (
            <div key={col.id} className="board-col">
              <div className="board-col-head">
                <span>{col.label}</span>
                <span className="board-col-count">{items.length}</span>
              </div>
              <div className="board-col-body">
                {items.length === 0 && <div className="board-empty">—</div>}
                {items.map(r => {
                  const proj = projects[r.project_id];
                  const client = proj ? authors[proj.client_id] : null;
                  const claimedBy = r.claimed_by ? authors[r.claimed_by] : null;
                  const mine = r.claimed_by === profile?.id;
                  return (
                    <div key={r.id} className="board-card">
                      <div className="board-card-meta">
                        <span className={`badge badge-priority badge-priority-${r.priority}`}>{r.priority}</span>
                        {claimedBy && <span className="board-card-claimed">{mine ? 'You' : claimedBy.full_name || claimedBy.email}</span>}
                      </div>
                      <Link to={`/app/requests/${r.id}`} className="board-card-title">{r.title}</Link>
                      {proj && (
                        <div className="board-card-project">
                          {proj.name}{client?.company ? ` · ${client.company}` : ''}
                        </div>
                      )}
                      <div className="board-card-actions">
                        {col.prev && (
                          <button className="ghost-btn" title={`Move to ${col.prev}`} onClick={() => move(r, 'prev')}>←</button>
                        )}
                        {!r.claimed_by && (
                          <button className="ghost-btn" onClick={() => claim(r)}>Claim</button>
                        )}
                        {mine && (
                          <button className="ghost-btn" onClick={() => release(r)}>Release</button>
                        )}
                        {col.next && (
                          <button className="ghost-btn primary" title={`Move to ${col.next}`} onClick={() => move(r, 'next')}>→</button>
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
