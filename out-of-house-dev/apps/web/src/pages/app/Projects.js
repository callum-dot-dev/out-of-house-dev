import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthProvider';
import { api } from '../../lib/api';

const STATUS_LABELS = {
  discovery: 'Discovery', building: 'Building', live: 'Live', paused: 'Paused', completed: 'Completed',
};

const Projects = () => {
  const { isClient, profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/projects');
        setProjects(res?.projects ?? []);
      } catch {
        setProjects([]);
      }
    })();
  }, [isClient, profile?.id]);

  const filtered = projects.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['completed','paused'].includes(p.status);
    return p.status === filter;
  });

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Projects</div>
          <h1 className="app-h1">{isClient ? 'Your projects' : 'All projects'}</h1>
        </div>
      </div>

      <div className="filter-pills">
        {['active','discovery','building','live','paused','completed','all'].map(f => (
          <button key={f} className={`filter-pill ${filter === f ? 'is-active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="app-card app-empty">No projects in this view.</div>
      ) : (
        <div className="project-grid">
          {filtered.map(p => (
            <Link key={p.id} to={`/app/projects/${p.id}`} className="project-card">
              <div className="project-card-head">
                <span className={`badge badge-status badge-${p.status}`}>{STATUS_LABELS[p.status]}</span>
                <span className="project-card-type">{p.project_type.replace('_',' ')}</span>
              </div>
              <h3>{p.name}</h3>
              {!isClient && p.profiles && (
                <div className="app-muted">{p.profiles.company || p.profiles.full_name}</div>
              )}
              <p>{p.description || 'No description yet.'}</p>
              <div className="project-card-foot">
                <span>Started {new Date(p.created_at).toLocaleDateString()}</span>
                <span className="project-card-cta">Open →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
