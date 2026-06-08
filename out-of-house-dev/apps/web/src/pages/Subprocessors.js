import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SUBPROCESSORS = [
  { name: 'out-of-house.dev Platform', purpose: 'Auth, database, storage, realtime', location: 'EU (Frankfurt)', url: 'https://out-of-house.dev' },
  { name: 'Cloudflare', purpose: 'CDN, DNS, edge hosting', location: 'Global', url: 'https://www.cloudflare.com' },
  { name: 'IONOS', purpose: 'Hosting (clients on the £100/month care plan)', location: 'EU', url: 'https://www.ionos.co.uk' },
  { name: 'Stripe', purpose: 'Payments and subscription billing', location: 'EU/US', url: 'https://stripe.com' },
  { name: 'Cal.com', purpose: 'Discovery call scheduling', location: 'EU', url: 'https://cal.com' },
  { name: 'Resend or Postmark', purpose: 'Transactional email (magic links, notifications)', location: 'EU/US', url: 'https://resend.com' },
  { name: 'Plausible', purpose: 'Privacy-respecting analytics on the marketing site', location: 'EU', url: 'https://plausible.io' },
  { name: 'Sentry (optional)', purpose: 'Error monitoring on the app', location: 'EU/US', url: 'https://sentry.io' },
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
