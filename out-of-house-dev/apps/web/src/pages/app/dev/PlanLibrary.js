import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';

const TYPE_LABEL = {
  website: 'Website',
  automation: 'AI Automation',
  web_app: 'Web App / SaaS',
  custom_software: 'Custom Software',
  platform: 'Full Platform',
};

const PlanLibrary = () => {
  const [templates, setTemplates] = useState([]);
  const [search] = useSearchParams();
  const attachTo = search.get('attach');
  const presetType = search.get('type');

  useEffect(() => {
    (async () => {
      try {
        const { templates: data } = await api.get('/plan-templates');
        const list = (data ?? []).slice().sort((a, b) => (a.type || '').localeCompare(b.type || ''));
        setTemplates(list);
      } catch (e) {
        setTemplates([]);
      }
    })();
  }, []);

  const types = Array.from(new Set(templates.map(t => t.type)));

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Plan library</div>
          <h1 className="app-h1">Universal plans of action.</h1>
          <p className="app-lead">
            Structured plan templates per project type, built to be handed straight to Claude Code.
            {attachTo && <strong> Pick one to attach to this project.</strong>}
          </p>
        </div>
      </div>

      {types.length === 0 && (
        <div className="app-card app-empty">No templates seeded yet. Run <code>npm run seed</code> to load them.</div>
      )}

      {types.map(type => (
        <section key={type} className={`app-section ${presetType === type ? 'is-highlighted' : ''}`}>
          <div className="app-section-head">
            <h2 className="app-h2">{TYPE_LABEL[type] || type}</h2>
          </div>
          <div className="template-grid">
            {templates.filter(t => t.type === type).map(t => (
              <Link
                key={t.id}
                to={`/app/plans/${t.id}${attachTo ? `?attach=${attachTo}` : ''}`}
                className="template-card"
              >
                <div className="template-card-meta">
                  <span className="badge badge-template">{(t.phases || []).length} phases</span>
                </div>
                <h3>{t.name}</h3>
                <p>{t.summary}</p>
                <div className="template-card-foot">
                  Open template →
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default PlanLibrary;
