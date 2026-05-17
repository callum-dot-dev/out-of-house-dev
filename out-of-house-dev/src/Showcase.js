import React from 'react';

const PROJECTS = [
  {
    id: 'p1',
    title: 'Local agency landing site',
    tag: 'Website',
    meta: 'Live in 1 day',
    span: 'wide',
    img: null,
  },
  {
    id: 'p2',
    title: 'CRM enrichment automation',
    tag: 'AI Automation',
    meta: 'Shipped in 3 days',
    span: 'tall',
    img: null,
  },
  {
    id: 'p3',
    title: 'Internal ops dashboard',
    tag: 'Custom software',
    meta: '2-week MVP',
    span: 'small',
    img: null,
  },
  {
    id: 'p4',
    title: 'Client portal MVP',
    tag: 'Web app',
    meta: 'Shipped in 9 days',
    span: 'small',
    img: null,
  },
  {
    id: 'p5',
    title: 'Inbound triage agent',
    tag: 'AI Automation',
    meta: 'Live in 2 days',
    span: 'wide',
    img: null,
  },
];

const Tile = ({ project }) => (
  <a className={`showcase-tile showcase-${project.span}`} href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
    <div className="showcase-media">
      {project.img ? (
        <img src={project.img} alt={project.title} loading="lazy" />
      ) : (
        <div className="showcase-placeholder" aria-hidden="true">
          <div className="showcase-placeholder-grid" />
          <div className="showcase-placeholder-label">{project.tag}</div>
        </div>
      )}
    </div>
    <div className="showcase-info">
      <div className="showcase-tag">{project.tag}</div>
      <div className="showcase-title">{project.title}</div>
      <div className="showcase-meta">
        <span className="showcase-meta-dot" />
        {project.meta}
      </div>
    </div>
  </a>
);

const Showcase = () => {
  return (
    <section id="showcase" className="showcase-section fade-in">
      <div className="showcase-head">
        <div>
          <div className="eyebrow">Selected work</div>
          <h2 className="section-title">
            Real projects, <span className="accent">shipped fast</span>.
          </h2>
        </div>
        <p className="showcase-lead">
          A sample of recent builds. Hover any tile to see the build window &mdash; from first call to live.
        </p>
      </div>
      <div className="showcase-grid">
        {PROJECTS.map(p => <Tile key={p.id} project={p} />)}
      </div>
    </section>
  );
};

export default Showcase;
