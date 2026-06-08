import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

const PrivacyPolicy = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="App">
      <section className="public-page">
        <div className="public-page-inner">
          <Link to="/" className="auth-back">‹ Back to home</Link>
          <div className="eyebrow">Privacy policy</div>
          <h1>How we look after your data.</h1>
          <p className="public-lead">Effective from 18 May 2026. Plain-English summary first, then the detail.</p>

          <h2>The short version</h2>
          <ul>
            <li>We only collect data you give us (apply form, login, project work) plus minimal analytics.</li>
            <li>We never sell your data. Ever.</li>
            <li>You can email <a href="mailto:privacy@out-of-house.dev">privacy@out-of-house.dev</a> to access, correct, export, or delete your data, and we respond within 30 days.</li>
            <li>We use a small, audited list of sub-processors (Supabase, Stripe, Cloudflare, Resend or Postmark, Cal.com). Full list on the <Link to="/subprocessors">sub-processors page</Link>.</li>
          </ul>

          <h2>Who we are</h2>
          <p>
            out-of-house.dev is a UK-based software studio. For the purposes of UK GDPR we are the data controller
            for personal data submitted through this site, and the data processor for client data we handle during delivery.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li><strong>Apply form data:</strong> name, email, company, phone (optional), project description, budget, timeline.</li>
            <li><strong>Account data:</strong> email, name, company, role, login events.</li>
            <li><strong>Project data:</strong> feature requests, comments, attachments, file uploads, voice memos.</li>
            <li><strong>Technical data:</strong> IP address (for spam protection), user agent, UTM parameters where you arrived from.</li>
            <li><strong>Cookies:</strong> strictly-necessary session cookie for auth, plus analytics cookies if you accept them.</li>
          </ul>

          <h2>Lawful bases</h2>
          <ul>
            <li><strong>Contract</strong>: processing your project work and account.</li>
            <li><strong>Legitimate interest</strong>: spam-detection on the apply form, security logs, product improvement.</li>
            <li><strong>Consent</strong>: analytics cookies, marketing emails. You can withdraw consent any time.</li>
          </ul>

          <h2>Retention</h2>
          <ul>
            <li>Rejected applications: deleted after 6 months.</li>
            <li>Project data while engaged: retained for the life of the engagement.</li>
            <li>Closed projects: archived for up to 6 years (UK tax records requirement), then deleted.</li>
            <li>Auth events: 90 days.</li>
          </ul>

          <h2>Your rights</h2>
          <p>
            You can ask us to confirm what data we hold, correct mistakes, export it, delete it, restrict how we use it, or object to a specific use.
            Email <a href="mailto:privacy@out-of-house.dev">privacy@out-of-house.dev</a> from the address tied to your account and we'll respond within 30 days.
          </p>
          <p>
            You can also complain to the UK Information Commissioner's Office (<a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>) if you think we got something wrong.
          </p>

          <h2>International transfers</h2>
          <p>
            Where data is processed outside the UK (for instance Stripe payment processing), we rely on UK adequacy decisions or
            the UK International Data Transfer Addendum for equivalent protection.
          </p>

          <h2>Security</h2>
          <p>
            TLS in transit, AES-256 at rest, row-level security on the database, MFA for admin accounts, least-privilege access for staff.
            See the <Link to="/trust">trust page</Link> for more detail.
          </p>

          <h2>Updates</h2>
          <p>We'll post the date at the top of this page whenever we update it. Material changes will also be emailed to logged-in users.</p>

          <h2>Contact</h2>
          <p>
            Email <a href="mailto:privacy@out-of-house.dev">privacy@out-of-house.dev</a>. Trading address available on the <Link to="/subprocessors">sub-processors page</Link>.
          </p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
