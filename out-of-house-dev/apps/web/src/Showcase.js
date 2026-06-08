import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './lib/api';

const STATIC = [
  { id: 's1', title: 'Local agency landing site',  tag: 'Website',        meta: 'Live in 1 day',  hue: 156, accent: '#2bbf86' },
  { id: 's2', title: 'CRM enrichment automation',  tag: 'AI Automation',  meta: 'Shipped in 3 days', hue: 32,  accent: '#ff8c5a' },
  { id: 's3', title: 'Internal ops dashboard',     tag: 'Custom software', meta: '2-week MVP',     hue: 215, accent: '#5d8fff' },
  { id: 's4', title: 'Client portal MVP',          tag: 'Web app',        meta: 'Shipped in 9 days', hue: 290, accent: '#b56aff' },
  { id: 's5', title: 'Inbound triage agent',       tag: 'AI Automation',  meta: 'Live in 2 days',  hue: 12,  accent: '#e3635a' },
];

const Tile = ({ project }) => {
  const inner = (
    <>
      <div className="showcase-media" style={{
        background: `radial-gradient(circle at 30% 25%, hsla(${project.hue}, 80%, 70%, .55) 0%, transparent 55%), radial-gradient(circle at 75% 75%, hsla(${(project.hue + 40) % 360}, 70%, 50%, .35) 0%, transparent 60%), #1a1a18`,
      }}>
        <div className="showcase-overlay">
          <span className="showcase-tag-chip">{project.tag}</span>
          <span className="showcase-meta-chip">{project.meta}</span>
        </div>
      </div>
      <div className="showcase-info">
        <div className="showcase-title">{project.title}</div>
      </div>
    </>
  );
  if (project.slug) {
    return (
      <Link className={`showcase-tile showcase-${project.span || 'small'}`} to={`/changelog/${project.slug}`}>{inner}</Link>
    );
  }
  if (project.preview_url) {
    return (
      <a className={`showcase-tile showcase-${project.span || 'small'}`} href={project.preview_url} target="_blank" rel="noopener noreferrer">{inner}</a>
    );
  }
  return (
    <Link className={`showcase-tile showcase-${project.span || 'small'}`} to="/showcase">{inner}</Link>
  );
};

const Showcase = () => {
  const [live, setLive] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { projects } = await api.get('/showcase');
        const data = (projects ?? []).slice(0, 5);
        if (data.length > 0) {
          setLive(data.map((p, i) => ({
            id: p.id,
            title: p.name,
            tag: p.project_type.replace('_', ' '),
            meta: p.description?.slice(0, 60) || 'Shipped',
            hue: (i * 67) % 360,
            slug: p.slug,
            preview_url: p.preview_url,
            span: i === 0 ? 'wide' : i === 1 ? 'tall' : 'small',
          })));
        }
      } catch (e) {
        setLive([]);
      }
    })();
  }, []);

  const tiles = (live.length > 0 ? live : STATIC).slice(0, 5).map((p, i) => ({
    ...p,
    span: p.span || (i === 0 ? 'wide' : i === 1 ? 'tall' : 'small'),
  }));

  return (
    <section id="showcase" className="showcase-section fade-in">
      <div className="showcase-head">
        <div>
          <div className="eyebrow">Selected work</div>
          <h2 className="section-title">Real projects, <span className="accent">shipped fast</span>.</h2>
        </div>
        <p className="showcase-lead">
          A live slice of recent builds. Click into any one for the full timeline.
        </p>
      </div>
      <div className="showcase-grid">
        {tiles.map((p) => <Tile key={p.id} project={p} />)}
      </div>
      <div className="showcase-foot">
        <Link to="/showcase" className="showcase-all">See all public projects ›</Link>
      </div>
    </section>
  );
};

export default Showcase;
