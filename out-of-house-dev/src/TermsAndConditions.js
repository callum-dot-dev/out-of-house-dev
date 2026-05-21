import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

const TermsAndConditions = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="App">
      <section className="public-page">
        <div className="public-page-inner">
          <Link to="/" className="auth-back">‹ Back to home</Link>
          <div className="eyebrow">Terms and conditions</div>
          <h1>The rules of the road.</h1>
          <p className="public-lead">Effective from 18 May 2026. These cover use of this website and the client platform.</p>

          <h2>Who we are</h2>
          <p>out-of-house.dev is a UK-based software studio. "We" means out-of-house.dev. "You" means the visitor or signed-in user.</p>

          <h2>Using this site</h2>
          <ul>
            <li>You can read, share, and link to public pages freely.</li>
            <li>The apply form is for genuine project enquiries. Spam submissions may be reported to your provider.</li>
            <li>The client platform is for clients, contracted developers, and our team. Don't share login details.</li>
          </ul>

          <h2>Project work</h2>
          <p>
            Project deliverables, pricing, acceptance criteria, and timing are covered by a separate engagement letter
            or statement of work signed before the project starts. This page does not replace that contract.
          </p>

          <h2>Intellectual property</h2>
          <ul>
            <li>You own the code, designs, and assets we build for you on payment of the invoice.</li>
            <li>We may describe the work in case studies and showcase, with your prior approval where the work is confidential.</li>
            <li>Site copy, logo, and platform code remain ours unless stated otherwise.</li>
          </ul>

          <h2>Payments</h2>
          <ul>
            <li>Fixed prices invoiced on milestones. Monthly retainers billed in advance.</li>
            <li>Failed card payments are retried over 21 days. Repeated failure pauses the subscription and we'll be in touch.</li>
            <li>UK VAT charged where applicable.</li>
          </ul>

          <h2>Refunds</h2>
          <ul>
            <li>Monthly retainers: full refund of the first month if you tell us within that month.</li>
            <li>One-off projects: refunds at our discretion if we haven't met agreed acceptance criteria.</li>
          </ul>

          <h2>Cancellation and pausing</h2>
          <p>You can pause or cancel a monthly retainer any month. No cancellation fees.</p>

          <h2>Acceptable use</h2>
          <ul>
            <li>No illegal content, harassment, or attempts to compromise the platform.</li>
            <li>No automated scraping of authenticated areas.</li>
            <li>Reasonable use of the comments, attachments, and voice features.</li>
          </ul>

          <h2>Liability</h2>
          <p>
            We provide the platform as-is. Liability for breaches under our control is capped at fees paid in the previous 12 months.
            We don't exclude liability for things UK law says we can't.
          </p>

          <h2>Changes</h2>
          <p>We may update these terms. Material changes will be emailed to logged-in users and dated on this page.</p>

          <h2>Governing law</h2>
          <p>England and Wales. Disputes resolved in the English courts.</p>

          <h2>Contact</h2>
          <p>Questions: <a href="mailto:support@out-of-house.dev">support@out-of-house.dev</a>.</p>
        </div>
      </section>
    </div>
  );
};

export default TermsAndConditions;
