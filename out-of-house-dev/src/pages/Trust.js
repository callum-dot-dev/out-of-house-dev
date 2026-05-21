import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Trust = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="App">
      <section className="public-page">
        <div className="public-page-inner">
          <Link to="/" className="auth-back">‹ Back to home</Link>
          <div className="eyebrow">Trust and security</div>
          <h1>How we look after your data.</h1>
          <p className="public-lead">
            We're a UK business. We follow UK GDPR and PECR, we're registered with the ICO, and we
            publish exactly which sub-processors touch your data. If something's not on this page that
            you need for procurement, ask us and we'll send it.
          </p>

          <h2>Hosting and architecture</h2>
          <ul>
            <li>Production app and database hosted by Supabase in EU regions, with row-level security on every table.</li>
            <li>Marketing site hosted on Cloudflare Pages or GitHub Pages with HTTPS-only and HSTS preloaded.</li>
            <li>Backups are daily with 7-day point-in-time recovery on production.</li>
          </ul>

          <h2>Encryption</h2>
          <ul>
            <li>Data in transit: TLS 1.2 or higher, HSTS enforced.</li>
            <li>Data at rest: AES-256 via Supabase storage and Postgres encryption at rest.</li>
            <li>Secrets: stored in environment variables on the host; never in code, never sent to the browser.</li>
          </ul>

          <h2>Access</h2>
          <ul>
            <li>Admin actions are gated by role. The audit log inside the platform records who did what when.</li>
            <li>Magic-link and Google OAuth, with email+password as a fallback. MFA available for admin accounts.</li>
            <li>Service-role keys live only in server-side scripts and Edge Functions, never in the bundled app.</li>
          </ul>

          <h2>Compliance and posture</h2>
          <ul>
            <li>UK GDPR. ICO registration: details available on request.</li>
            <li>Cyber Essentials certification: in progress.</li>
            <li>Annual external review of dependencies and RLS policies.</li>
          </ul>

          <h2>Reporting an issue</h2>
          <p>
            Security disclosures: <a href="mailto:security@out-of-house.dev">security@out-of-house.dev</a>.
            We respond within one business day and never penalise good-faith research.
          </p>

          <h2>More</h2>
          <ul>
            <li><Link to="/subprocessors">Sub-processor list</Link></li>
            <li><Link to="/privacy-policy">Privacy policy</Link></li>
            <li><Link to="/terms-and-conditions">Terms and conditions</Link></li>
            <li><a href="https://status.out-of-house.dev" target="_blank" rel="noopener noreferrer">Status page</a></li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default Trust;
