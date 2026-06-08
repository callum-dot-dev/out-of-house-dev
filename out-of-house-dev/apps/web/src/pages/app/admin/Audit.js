import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { SkeletonGrid } from '../../../components/Skeleton';

const Audit = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('audit_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setEvents(data ?? []);
      setLoading(false);
    })();
  }, []);

  const visible = filter === 'all' ? events : events.filter((e) => e.action?.startsWith(filter));

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Admin · Audit</div>
          <h1 className="app-h1">Who did what.</h1>
          <p className="app-lead">Append-only log of admin and sensitive actions.</p>
        </div>
      </div>

      <div className="filter-pills">
        {['all', 'application', 'project', 'user', 'plan'].map((f) => (
          <button key={f} className={`filter-pill ${filter === f ? 'is-active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonGrid count={2} />
      ) : visible.length === 0 ? (
        <div className="app-card app-empty">No audit events yet.</div>
      ) : (
        <div className="app-card">
          <table className="app-table">
            <thead>
              <tr><th>When</th><th>Action</th><th>Target</th><th>Actor</th><th>Payload</th></tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id}>
                  <td className="app-muted">{new Date(e.created_at).toLocaleString()}</td>
                  <td><code>{e.action}</code></td>
                  <td className="app-muted">{e.target_table || '–'} {e.target_id ? `· ${e.target_id.slice(0, 8)}` : ''}</td>
                  <td className="app-muted">{e.actor_id ? e.actor_id.slice(0, 8) : 'system'}</td>
                  <td className="app-muted"><pre className="audit-payload">{JSON.stringify(e.payload || {}, null, 0)}</pre></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Audit;
