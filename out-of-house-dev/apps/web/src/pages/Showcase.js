import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const ShowcasePage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { projects: list } = await api.get('/showcase');
        setProjects((list ?? []).slice(0, 24));
      } catch (e) {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="App">
      <section className="public-page">
        <div className="public-page-inner">
          <Link to="/" className="auth-back">‹ Back to home</Link>
          <div className="eyebrow">Showcase</div>
          <h1>What we've shipped.</h1>
          <p className="public-lead">A live list of projects clients have opted into showing.</p>

          {loading ? (
            <p className="app-muted">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="app-muted">Client work goes up here only with written permission, and most of ours is internal tooling their competitors would love to see. Want a reference anyway? Book a call — we&apos;ll show you relevant work privately.</p>
          ) : (
            <div className="showcase-public-grid">
              {projects.map((p) => (
                <article key={p.id} className="showcase-public-tile">
                  <div className="showcase-public-tag">{p.project_type.replace('_', ' ')}</div>
                  <h3>{p.name}</h3>
                  {p.description && <p>{p.description}</p>}
                  <div className="showcase-public-foot">
                    {p.preview_url ? (
                      <a href={p.preview_url} target="_blank" rel="noopener noreferrer">Visit ›</a>
                    ) : p.slug ? (
                      <Link to={`/changelog/${p.slug}`}>See changelog ›</Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ShowcasePage;
