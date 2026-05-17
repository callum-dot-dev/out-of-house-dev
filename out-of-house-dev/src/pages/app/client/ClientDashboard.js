import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../lib/AuthProvider';
import { supabase } from '../../../lib/supabase';

const STATUS_LABELS = {
  discovery: 'Discovery',
  building:  'Building',
  live:      'Live',
  paused:    'Paused',
  completed: 'Completed',
};

const ClientDashboard = () => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('projects').select('*').eq('client_id', profile.id).order('created_at', { ascending: false });
      setProjects(p ?? []);
      if (p && p.length > 0) {
        const { data: r } = await supabase
          .from('feature_requests')
          .select('*')
          .in('project_id', p.map(x => x.id))
          .order('created_at', { ascending: false })
          .limit(8);
        setRequests(r ?? []);
      }
    })();
  }, [profile.id]);

  const firstName = (profile.full_name || profile.email).split(' ')[0];

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

      {projects.length === 0 ? (
        <div className="app-card app-empty-card">
          <h3>No projects yet</h3>
          <p>Once we kick off your first project, it'll show up here. If you haven't already, book a discovery call.</p>
          <Link to="/app/book"><button className="primary-btn"><span>Book a call</span></button></Link>
        </div>
      ) : (
        <>
          <section className="app-section">
            <h2 className="app-h2">Your projects</h2>
            <div className="project-grid">
              {projects.map(p => (
                <Link key={p.id} to={`/app/projects/${p.id}`} className="project-card">
                  <div className="project-card-head">
                    <span className={`badge badge-status badge-${p.status}`}>{STATUS_LABELS[p.status] || p.status}</span>
                    <span className="project-card-type">{p.project_type.replace('_',' ')}</span>
                  </div>
                  <h3>{p.name}</h3>
                  <p>{p.description || 'No description yet.'}</p>
                  <div className="project-card-foot">
                    <span>Started {new Date(p.created_at).toLocaleDateString()}</span>
                    <span className="project-card-cta">Open →</span>
                  </div>
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
                  {requests.map(r => (
                    <li key={r.id} className="app-list-row">
                      <div>
                        <strong>{r.title}</strong>
                        <div className="app-muted">{new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                      <span className={`badge badge-status badge-${r.status}`}>{r.status}</span>
                    </li>
                  ))}
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
