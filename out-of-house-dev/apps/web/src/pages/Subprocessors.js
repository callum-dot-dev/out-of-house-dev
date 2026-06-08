import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SUBPROCESSORS = [
  { name: 'Render', purpose: 'Hosting for the app, API, workers, Postgres database and file storage', location: 'EU (Frankfurt)', url: 'https://render.com' },
  { name: 'Stripe', purpose: 'Payments and subscription billing', location: 'EU/US', url: 'https://stripe.com' },
  { name: 'Resend', purpose: 'Transactional + inbound email (magic links, notifications)', location: 'EU/US', url: 'https://resend.com' },
  { name: 'Anthropic', purpose: 'AI (Claude) for scoping, drafting, review and the build agent', location: 'EU/US', url: 'https://anthropic.com' },
  { name: 'OpenAI', purpose: 'AI fallback model', location: 'US', url: 'https://openai.com' },
  { name: 'Cal.com', purpose: 'Discovery/coaching call scheduling', location: 'EU', url: 'https://cal.com' },
  { name: 'GitHub', purpose: 'Code repositories + client-site source hosting', location: 'US', url: 'https://github.com' },
  { name: 'Google', purpose: 'Places API for lead discovery; optional sign-in (OAuth)', location: 'EU/US', url: 'https://cloud.google.com' },
  { name: 'Companies House', purpose: 'UK company data for lead discovery', location: 'UK', url: 'https://www.gov.uk/government/organisations/companies-house' },
  { name: 'IONOS', purpose: 'DNS for client custom domains', location: 'EU', url: 'https://www.ionos.co.uk' },
  { name: 'Sentry (optional)', purpose: 'Error monitoring', location: 'EU/US', url: 'https://sentry.io' },
];

const Subprocessors = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="App">
      <section className="public-page">
        <div className="public-page-inner">
          <Link to="/" className="auth-back">‹ Back to home</Link>
          <div className="eyebrow">Sub-processors</div>
          <h1>Who else touches your data.</h1>
          <p className="public-lead">
            A complete list of vendors we use to deliver our service. We notify clients before adding a new sub-processor.
            Updates are timestamped at the bottom of this page.
          </p>

          <table className="subprocessor-table">
            <thead>
              <tr>
                <th>Vendor</th><th>What they do</th><th>Where</th><th>Link</th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((s) => (
                <tr key={s.name}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.purpose}</td>
                  <td>{s.location}</td>
                  <td><a href={s.url} target="_blank" rel="noopener noreferrer">{new URL(s.url).hostname}</a></td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="app-muted">Last updated: 2026-05-18.</p>

          <h2>Questions?</h2>
          <p>Email <a href="mailto:privacy@out-of-house.dev">privacy@out-of-house.dev</a>.</p>
        </div>
      </section>
    </div>
  );
};

export default Subprocessors;
