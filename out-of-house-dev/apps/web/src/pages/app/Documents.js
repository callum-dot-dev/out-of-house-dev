import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/AuthProvider';
import { api } from '../../lib/api';
import { useRealtimeTable } from '../../lib/realtime';
import { STAGES, categoryLabel, stageLabel } from '../../lib/documents';
import { Skeleton, SkeletonBlock } from '../../components/Skeleton';

const Documents = () => {
  const { profile, isDeveloper } = useAuth();
  const [docs, setDocs] = useState([]);
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    let ps = [];
    try {
      const res = await api.get('/projects');
      ps = res?.projects ?? [];
    } catch {
      ps = [];
    }
    const projMap = {};
    ps.forEach((p) => { projMap[p.id] = p; });
    setProjects(projMap);

    if (!ps.length) { setDocs([]); setLoading(false); return; }

    let docList = [];
    try {
      const results = await Promise.all(
        ps.map((p) =>
          api.get('/projects/' + p.id + '/documents')
            .then((r) => r?.documents ?? [])
            .catch(() => [])
        )
      );
      docList = results.flat();
    } catch {
      docList = [];
    }
    docList.sort((a, b) => {
      if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });
    setDocs(docList);
    setLoading(false);
  }, [profile?.id, isDeveloper]);

  useEffect(() => { load(); }, [load]);

  useRealtimeTable({
    channel: profile?.id ? `documents-page-${profile.id}` : null,
    table: 'project_documents',
    onChange: () => load(),
  });

  const visible = docs.filter((d) => {
    if (stageFilter !== 'all' && d.stage !== stageFilter) return false;
    if (projectFilter !== 'all' && d.project_id !== projectFilter) return false;
    return true;
  });

  const projectsList = Object.values(projects);

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Documents</div>
          <h1 className="app-h1">All your project documents.</h1>
          <p className="app-lead">
            {isDeveloper
              ? 'Designs, specs, AI output across every project. Open a project to upload more.'
              : 'Designs, drafts, and progress documents the team has shared with you. Newest first.'}
          </p>
        </div>
      </div>

      <div className="docroom-filters" style={{ marginBottom: 18 }}>
        {projectsList.length > 1 && (
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
        <button
          type="button"
          className={`filter-pill ${stageFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setStageFilter('all')}
        >
          All
        </button>
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`filter-pill ${stageFilter === s.id ? 'is-active' : ''}`}
            onClick={() => setStageFilter(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="app-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="docroom-row docroom-row-skeleton" style={{ borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
              <Skeleton w={32} h={32} r={8} />
              <div style={{ flex: 1 }}>
                <Skeleton h={14} w="35%" />
                <div style={{ height: 8 }} />
                <SkeletonBlock rows={1} lastWidth="60%" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="app-card app-empty-card">
          <h3>{docs.length === 0 ? 'No documents yet' : 'Nothing matches that filter'}</h3>
          <p>{docs.length === 0
            ? 'When designs, specs, or notes land they will show up here.'
            : 'Adjust the stage or project filter above.'}</p>
        </div>
      ) : (
        <div className="app-card">
          <ul className="docs-all-list">
            {visible.map((d) => {
              const proj = projects[d.project_id];
              return (
                <li key={d.id}>
                  <Link to={`/app/projects/${d.project_id}?tab=docs`} className="docs-all-row">
                    <div>
                      <div className="docs-all-title">
                        {d.pinned && <span className="docroom-pin">★</span>}
                        <strong>{d.title}</strong>
                        {d.ai_generated && <span className="badge docroom-badge-ai">AI</span>}
                      </div>
                      <div className="app-muted docs-all-meta">
                        {proj?.name} · {stageLabel(d.stage)} · {categoryLabel(d.category)} · {new Date(d.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="docs-all-chev" aria-hidden="true">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Documents;
