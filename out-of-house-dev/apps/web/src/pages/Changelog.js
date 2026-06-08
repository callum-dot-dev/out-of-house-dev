import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Changelog = () => {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let projectId = null;
      if (slug) {
        const { data: p } = await supabase.from('projects').select('id, name, description').eq('slug', slug).maybeSingle();
        if (p) {
          setProject(p);
          projectId = p.id;
        }
      }
      let q = supabase
        .from('changelog_entries')
        .select('*')
        .eq('is_public', true)
        .order('published_at', { ascending: false })
        .limit(60);
      if (projectId) q = q.eq('project_id', projectId);
      const { data } = await q;
      setEntries(data ?? []);
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="App">
      <section className="public-page">
        <div className="public-page-inner">
          <Link to="/" className="auth-back">‹ Back to home</Link>
          <div className="eyebrow">Changelog</div>
          <h1>{project ? `What we shipped for ${project.name}` : 'Shipped, recently.'}</h1>
          {project?.description && <p className="public-lead">{project.description}</p>}

          {loading ? (
            <p className="app-muted">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="app-muted">Nothing public to share yet.</p>
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
