import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';

const Changelog = () => {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let matchedProject = null;
      if (slug) {
        try {
          const { projects } = await api.get('/showcase');
          matchedProject = (projects || []).find((p) => p.slug === slug) || null;
        } catch {
          matchedProject = null;
        }
        if (matchedProject && !cancelled) setProject(matchedProject);
      }

      let list = [];
      try {
        const projectId = matchedProject?.id;
        const res = projectId
          ? await api.get('/projects/' + projectId + '/changelog')
          : await api.get('/changelog');
        list = res.entries || [];
      } catch {
        list = [];
      }
      if (!cancelled) {
        setEntries(list);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <div className="App">
      <section className="public-page">
        <div className="public-page-inner">
          <Link to="/" className="auth-back">‹ Back to home</Link>
          <div className="eyebrow">Changelog</div>
          <h1>{project ? `What we shipped for ${project.name}` : 'What shipped.'}</h1>
          {project?.description
            ? <p className="public-lead">{project.description}</p>
            : !project && <p className="public-lead">Public build notes from projects that opted in. Newest first.</p>}

          {loading ? (
            <p className="app-muted">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="app-muted">Nothing public yet — check the showcase, or ask us directly.</p>
          ) : (
            <ul className="changelog-public">
              {entries.map((e) => (
                <li key={e.id}>
                  <span className="changelog-date">{new Date(e.published_at || e.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <div>
                    <h3>{e.title}</h3>
                    {e.body_md && <p>{e.body_md}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};

export default Changelog;
