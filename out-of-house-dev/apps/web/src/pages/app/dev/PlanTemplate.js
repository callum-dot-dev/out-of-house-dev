import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../../lib/api';

const PlanTemplate = () => {
  const { id } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const attachTo = search.get('attach');

  const [template, setTemplate] = useState(null);
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { template: data } = await api.get('/plan-templates/' + id);
        setTemplate(data ?? null);
      } catch (e) {
        setTemplate(null);
      }
    })();
  }, [id]);

  const copyHandoff = async () => {
    if (!template?.claude_code_handoff) return;
    await navigator.clipboard.writeText(template.claude_code_handoff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const spawnPlan = async () => {
    if (!attachTo) return;
    setWorking(true);
    try {
      await api.post('/projects/' + attachTo + '/plans', {
        template_id: template.id,
        style: template.type,
      });
      setWorking(false);
      navigate(`/app/projects/${attachTo}`);
    } catch (e) {
      setWorking(false);
      setMsg(e.message);
    }
  };

  if (!template) return <div className="app-empty">Loading…</div>;

  return (
    <div className="app-page">
      <div className="app-breadcrumb">
        <Link to="/app/plans">Plan library</Link> <span>/</span> <span>{template.name}</span>
      </div>

      <div className="app-page-head">
        <div>
          <div className="eyebrow">{template.type.replace('_',' ')}</div>
          <h1 className="app-h1">{template.name}</h1>
          <p className="app-lead">{template.summary}</p>
        </div>
        <div className="app-page-head-actions">
          {attachTo ? (
            <button className="primary-btn" onClick={spawnPlan} disabled={working}><span>Attach to project</span></button>
          ) : (
            <button className="primary-btn" onClick={copyHandoff}>
              <span>{copied ? 'Copied!' : 'Copy Claude handoff'}</span>
            </button>
          )}
        </div>
      </div>

      {msg && <div className="auth-error">{msg}</div>}

      <section className="app-section">
        <h2 className="app-h2">Phases</h2>
        <div className="phase-list">
          {template.phases.map((phase, i) => (
            <div key={i} className="phase-card">
              <div className="phase-card-head">
                <span className="phase-num">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{phase.name}</h3>
                  <p className="phase-goal">{phase.goal}</p>
                </div>
                <span className="phase-duration">{phase.duration}</span>
              </div>
              <ol className="phase-steps">
                {(phase.steps || []).map((step, j) => (
                  <li key={j}>
                    <div className="phase-step-head">
                      <strong>{step.title}</strong>
                      {step.deliverable && <span className="phase-step-deliv">→ {step.deliverable}</span>}
                    </div>
                    <p>{step.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="app-section">
        <div className="app-section-head">
          <h2 className="app-h2">Claude Code handoff brief</h2>
          <button className="ghost-btn" onClick={copyHandoff}>{copied ? 'Copied!' : 'Copy markdown'}</button>
        </div>
        <pre className="handoff-block">{template.claude_code_handoff}</pre>
      </section>
    </div>
  );
};

export default PlanTemplate;
