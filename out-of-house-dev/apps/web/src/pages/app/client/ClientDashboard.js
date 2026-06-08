import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../lib/AuthProvider';
import { api } from '../../../lib/api';
import { useRealtimeTable } from '../../../lib/realtime';
import { SkeletonGrid, Skeleton } from '../../../components/Skeleton';

const STATUS_LABELS = {
  discovery: 'Discovery', building: 'Building', live: 'Live', paused: 'Paused', completed: 'Completed',
};

const ClientDashboard = () => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    let p = [];
    try {
      const res = await api.get('/projects');
      p = res?.projects ?? [];
    } catch {
      p = [];
    }
    setProjects(p);
    if (p.length > 0) {
      try {
        const results = await Promise.all(
          p.map((proj) =>
            Promise.all([
              api.get('/projects/' + proj.id + '/requests').then((r) => r?.requests ?? []).catch(() => []),
              api.get('/projects/' + proj.id + '/activity').then((a) => a?.activity ?? []).catch(() => []),
            ])
          )
        );
        const allRequests = results.flatMap((r) => r[0]);
        const allActivity = results.flatMap((r) => r[1]);
        allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        allActivity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRequests(allRequests.slice(0, 8));
        setActivity(allActivity.slice(0, 6));
      } catch {
        setRequests([]);
        setActivity([]);
      }
    } else {
      setRequests([]);
      setActivity([]);
    }
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  useRealtimeTable({
    channel: profile?.id ? `client-dash-${profile.id}` : null,
    table: 'feature_requests',
    onChange: () => load(),
  });

  const firstName = (profile?.full_name || profile?.email || 'there').split(' ')[0];

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Your portal</div>
          <h1 className="app-h1">Hey, {firstName}.</h1>
          <p className="app-lead">Here's where your projects live. Submit features, track progress, book follow-up calls.</p>
        </div>
        <Link to="/app/book"><button className="primary-btn"><span>Book a call</span></button></Link>
      </div>

      {loading ? (
        <>
          <Skeleton h={16} w={140} />
          <div style={{ height: 16 }} />
          <SkeletonGrid count={2} />
        </>
      ) : projects.length === 0 ? (
        <div className="app-card app-empty-card">
          <h3>No projects yet</h3>
          <p>Once we kick off your first project, it'll show up here. If you haven't already, book a discovery call.</p>
          <Link to="/app/book"><button className="primary-btn"><span>Book a call</span></button></Link>
        </div>
      ) : (
        <>
          {activity.length > 0 && (
            <section className="app-section">
              <div className="app-section-head"><h2 className="app-h2">Since you were last here</h2></div>
              <div className="app-card">
                <ul className="activity-feed">
                  {activity.slice(0, 6).map((ev) => (
                    <li key={ev.id} className={`activity-row activity-${ev.kind?.split('.')[0]}`}>
                      <span className="activity-dot" />
                      <div>
                        <strong>{ev.title}</strong>
                        <span className="app-muted">{new Date(ev.created_at).toLocaleString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className="app-section">
            <h2 className="app-h2">Your projects</h2>
            <div className="project-grid">
              {projects.map((p) => (
                <Link key={p.id} to={`/app/projects/${p.id}`} className="project-card">
                  <div className="project-card-head">
                    <span className={`badge badge-status badge-${p.status}`}>{STATUS_LABELS[p.status] || p.status}</span>
                    <span className="project-card-type">{p.project_type.replace('_', ' ')}</span>
                  </div>
                  <h3>{p.name}</h3>
                  <p>{p.description || 'No description yet.'}</p>
                  <div className="project-card-foot">
                    <span>Started {new Date(p.created_at).toLocaleDateString()}</span>
                    <span className="project-card-cta">Open ›</span>
                  </div>
                  {p.preview_url && <div className="project-card-preview">Latest build: {new URL(p.preview_url).hostname}</div>}
                </Link>
              ))}
            </div>
          </section>

          <section className="app-section">
            <div className="app-section-head">
              <h2 className="app-h2">Recent requests</h2>
            </div>
            {requests.length === 0 ? (
              <div className="app-card app-empty">No requests yet. Open a project to submit your first one.</div>
            ) : (
              <div className="app-card">
                <ul className="app-list">
                  {requests.map((r) => {
                    const proj = projects.find((x) => x.id === r.project_id);
                    return (
                      <li key={r.id} className="app-list-row">
                        <div>
                          <Link to={`/app/requests/${r.id}`}><strong>{r.title}</strong></Link>
                          <div className="app-muted">
                            {proj ? proj.name : 'project'} · {new Date(r.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <span className={`badge badge-status badge-${r.status}`}>{r.status}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default ClientDashboard;
