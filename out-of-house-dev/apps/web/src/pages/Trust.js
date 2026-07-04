import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PUBLISH_NEW_LEGAL } from '../config/flags';
import { TrustNew } from './legal/drafts';

const Trust = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  if (PUBLISH_NEW_LEGAL) return <TrustNew />;
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
            {/* Fallback line (legal-trust.md): the previous copy over-claimed Render hosting
                before the cutover. Ships now regardless of PUBLISH_NEW_LEGAL. */}
            <li>Client platform services run on Render in EU regions, with API-layer authorisation scoping every resource; the marketing site is currently served via GitHub Pages during our hosting transition.</li>
            <li>The marketing site is served over HTTPS with HSTS.</li>
            <li>Backups: nightly logical dumps plus point-in-time recovery on the production database.</li>
          </ul>

          <h2>Encryption</h2>
          <ul>
            <li>Data in transit: TLS 1.2 or higher, HSTS enforced.</li>
            <li>Data at rest: AES-256 via Render Postgres and persistent-disk encryption at rest.</li>
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
            {/* Status-page link held until status.out-of-house.dev is confirmed (BLOCKERS A6). */}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default Trust;
