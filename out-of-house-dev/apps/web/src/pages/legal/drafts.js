// New legal texts (verbatim from docs/content/legal-*.md), gated behind
// PUBLISH_NEW_LEGAL (config/flags.js). They are NOT rendered until Callum
// resolves the [TODO:callum:] facts + solicitor review + Render cutover, at
// which point flipping the flag is the single-commit publish. [TODO] markers
// below are intentional drafts and must be resolved before the flag flips.
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const TODO = ({ children }) => <mark className="legal-todo">[TODO: {children}]</mark>;

const LegalShell = ({ eyebrow, title, lead, children }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="App">
      <section className="public-page">
        <div className="public-page-inner">
          <Link to="/" className="auth-back">‹ Back to home</Link>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p className="public-lead">{lead}</p>
          {children}
        </div>
      </section>
    </div>
  );
};

export const TermsNew = () => (
  <LegalShell
    eyebrow="Terms and conditions"
    title="The rules of the road."
    lead={<>Effective from <TODO>callum: set date at publish</TODO>. These cover this website, the client platform, our courses and coaching, and our SaaS products. Plain English on purpose.</>}
  >
    <h2>Who we are</h2>
    <p>out-of-house.dev is a UK-based software studio. &ldquo;We&rdquo; means out-of-house.dev <TODO>callum: confirm legal trading name/entity + registered address for this line</TODO>. &ldquo;You&rdquo; means the visitor, client, learner, or signed-in user.</p>

    <h2>Using this site</h2>
    <ul>
      <li>Read, share, and link to public pages freely.</li>
      <li>The apply form is for genuine enquiries. Spam may be reported to your provider.</li>
      <li>The client platform is for clients, contracted developers, and our team. Keep your login to yourself.</li>
    </ul>

    <h2>Project work</h2>
    <p>Deliverables, pricing, acceptance criteria, and timing for project work are set in a written scope (engagement letter or statement of work) agreed before we start. That scope is the contract for the work; this page sits underneath it. Where the site shows starting prices, the fixed quote we issue after a call is the binding number.</p>

    <h2>Courses and coaching</h2>
    <ul>
      <li>Enrolment is confirmed on payment. Cohort dates are shown at enrolment; if we move a cohort by more than 14 days, you may transfer or take a full refund.</li>
      <li>You may transfer to a later cohort once, free, up to 7 days before the start date.</li>
      <li>Consumers have a statutory 14-day cancellation right for distance purchases. If your course starts inside that window, you consent to us beginning early; if you cancel mid-window after some delivery, we may deduct a proportionate amount. <TODO>solicitor: confirm CCR 2013 wording</TODO></li>
      <li>1:1 coaching sessions may be rescheduled free with 24 hours&rsquo; notice; inside 24 hours the session is chargeable.</li>
      <li>Certificates are issued on passing the relevant assessment and are revocable for plagiarism or misrepresentation. Verification is public at /verify.</li>
      <li>Course materials are for your use; don&rsquo;t resell or republish them.</li>
    </ul>

    <h2>SaaS products</h2>
    <ul>
      <li>Products like LogoVault are billed monthly per the published tiers; usage limits are enforced per tier.</li>
      <li>Fair use: no reselling API output as a competing service; no attempts to circumvent rate limits.</li>
      <li>We may change tier pricing with 30 days&rsquo; notice; changes never apply mid-billing-cycle.</li>
      <li>Logo assets are provided for legitimate identification and integration use; trademark rights remain with their owners.</li>
    </ul>

    <h2>Intellectual property</h2>
    <ul>
      <li>You own the code, designs, and assets we build for you once the invoice for that work is paid.</li>
      <li>We may describe the work in our showcase and changelog <strong>only with your opt-in</strong>, and with prior approval where anything is confidential.</li>
      <li>Site copy, our logo, course materials, and our platform code remain ours unless a scope says otherwise.</li>
    </ul>

    <h2>Payments</h2>
    <ul>
      <li>Fixed prices are invoiced on the milestones in the scope. Monthly plans (care, retainers, SaaS) bill in advance.</li>
      <li>Failed card payments retry over 21 days; repeated failure pauses the subscription and we&rsquo;ll get in touch.</li>
      <li>UK VAT is charged where applicable. <TODO>callum: confirm VAT registration status — copy elsewhere must not promise &ldquo;no VAT&rdquo; if registered</TODO></li>
    </ul>

    <h2>Refunds</h2>
    <ul>
      <li>Monthly retainers and care plans: full refund of the first month if you tell us within that month.</li>
      <li>One-off projects: if we haven&rsquo;t met the agreed acceptance criteria, we fix it; if we can&rsquo;t, we refund the unmet portion. Otherwise refunds are at our discretion.</li>
      <li>Courses: see the courses section above.</li>
    </ul>

    <h2>Cancellation and pausing</h2>
    <p>Pause or cancel any monthly plan effective from the next billing date. No cancellation fees. Paused months aren&rsquo;t billed.</p>

    <h2>Acceptable use</h2>
    <p>No illegal content, harassment, or attempts to compromise the platform; no automated scraping of authenticated areas; reasonable use of comments, attachments, and voice features. We can suspend accounts that break this, and will say why.</p>

    <h2>Liability</h2>
    <p>The platform is provided as-is. For breaches under our control, liability is capped at the fees you paid us in the previous 12 months. Nothing here excludes liability that UK law says can&rsquo;t be excluded (including death or personal injury caused by negligence, or fraud).</p>

    <h2>Changes</h2>
    <p>We may update these terms. Material changes are emailed to logged-in users and dated here.</p>

    <h2>Governing law</h2>
    <p>England and Wales; disputes in the English courts.</p>

    <h2>Contact</h2>
    <p>Questions: <a href="mailto:support@out-of-house.dev">support@out-of-house.dev</a>.</p>
  </LegalShell>
);

export const PrivacyNew = () => (
  <LegalShell
    eyebrow="Privacy policy"
    title="How we look after your data."
    lead={<>Effective from <TODO>callum: set date at publish</TODO>. Plain-English summary first, then the detail.</>}
  >
    <h2>The short version</h2>
    <ul>
      <li>We only collect what you give us (apply form, account, project work, course enrolment) plus minimal analytics.</li>
      <li>We never sell your data.</li>
      <li>Email <a href="mailto:privacy@out-of-house.dev">privacy@out-of-house.dev</a> to access, correct, export, or delete your data — we respond within 30 days.</li>
      <li>A short, audited list of sub-processors handles specific jobs (hosting, payments, email, AI, scheduling). Full list, with what each one sees, on the <Link to="/subprocessors">sub-processors page</Link>.</li>
    </ul>

    <h2>Who we are</h2>
    <p>out-of-house.dev is a UK software studio. Under UK GDPR we&rsquo;re the <strong>controller</strong> for personal data submitted through this site, and a <strong>processor</strong> for client data we handle during delivery. ICO registration: <TODO>callum: registration number</TODO>.</p>

    <h2>What we collect</h2>
    <ul>
      <li><strong>Apply form:</strong> name, email, company, phone (optional), project description, budget, timeline.</li>
      <li><strong>Account:</strong> email, name, company, role, login events.</li>
      <li><strong>Project data:</strong> requests, comments, attachments, uploads, voice memos.</li>
      <li><strong>Course data:</strong> enrolment details, cohort, submissions, assessment results, certificates issued.</li>
      <li><strong>Technical:</strong> IP (spam protection), user agent, UTM parameters.</li>
      <li><strong>Cookies:</strong> a strictly-necessary session cookie for auth; analytics cookies only if you accept them via the banner.</li>
    </ul>

    <h2>Lawful bases</h2>
    <p><strong>Contract</strong> — your account, projects, and course delivery. <strong>Legitimate interest</strong> — apply-form spam detection, security logs, product improvement. <strong>Consent</strong> — analytics cookies and marketing email; withdraw any time.</p>

    <h2>AI processing</h2>
    <p>We use AI models (Anthropic&rsquo;s Claude; OpenAI as fallback) as tooling in scoping, drafting, and delivery. Client project data sent to these providers is sent under their business terms, which exclude training on your data. We don&rsquo;t use your data to train models of our own.</p>

    <h2>Retention</h2>
    <p>Rejected applications: 6 months. Active engagements: life of the engagement. Closed projects: archived up to 6 years (UK tax records), then deleted. Auth events: 90 days. Certificates: retained indefinitely so verification keeps working (name + course + date only).</p>

    <h2>Your rights</h2>
    <p>Access, correction, export, deletion, restriction, objection — email <a href="mailto:privacy@out-of-house.dev">privacy@out-of-house.dev</a> from your account address; response within 30 days. Complaints: the ICO at ico.org.uk.</p>

    <h2>International transfers</h2>
    <p>Where processing leaves the UK (e.g. Stripe, AI providers), we rely on UK adequacy or the UK International Data Transfer Addendum.</p>

    <h2>Security</h2>
    <p>TLS 1.2+ in transit, AES-256 at rest, role-scoped access with audit logging, MFA on admin accounts, least-privilege for staff. Detail on the <Link to="/trust">trust page</Link>.</p>

    <h2>Updates</h2>
    <p>Date at the top changes when this page does; material changes are emailed to logged-in users.</p>

    <h2>Contact</h2>
    <p><a href="mailto:privacy@out-of-house.dev">privacy@out-of-house.dev</a>. Trading address: <TODO>callum: address, or keep the &ldquo;available on request&rdquo; pattern deliberately</TODO>.</p>
  </LegalShell>
);

const SUBPROCESSORS = [
  ['Render', 'Hosting: app, API, workers, Postgres, file storage', 'EU (Frankfurt)'],
  ['Stripe', 'Payments and subscription billing', 'EU/US'],
  ['Resend', 'Transactional + inbound email', 'EU/US'],
  ['Anthropic', 'AI (Claude) for scoping, drafting, review and build tooling', 'EU/US'],
  ['OpenAI', 'AI fallback model', 'US'],
  ['Cal.com', 'Discovery/coaching call scheduling', 'EU'],
  ['GitHub', 'Code repositories; static-site hosting for some client sites', 'US'],
  ['Google', 'Places API (lead discovery); optional OAuth sign-in', 'EU/US'],
  ['Companies House', 'UK company data for lead discovery', 'UK'],
  ['IONOS', 'DNS and hosting for client custom domains', 'EU'],
  ['Sentry (optional)', 'Error monitoring', 'EU/US'],
];

export const SubprocessorsNew = () => (
  <LegalShell
    eyebrow="Sub-processors"
    title="Who else touches your data."
    lead="The complete list of vendors we use to deliver our service, what each one does, and where they run. We email platform users at least 14 days before adding a new sub-processor. Updates are dated below."
  >
    <div className="legal-table-wrap">
      <table className="legal-table">
        <thead>
          <tr><th>Vendor</th><th>What they do</th><th>Where</th></tr>
        </thead>
        <tbody>
          {SUBPROCESSORS.map(([v, w, loc]) => (
            <tr key={v}><td>{v}</td><td>{w}</td><td>{loc}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
    <p>Last updated: <TODO>callum: set at publish</TODO>.</p>
    <h2>Questions?</h2>
    <p><a href="mailto:privacy@out-of-house.dev">privacy@out-of-house.dev</a>.</p>
  </LegalShell>
);

export const TrustNew = () => (
  <LegalShell
    eyebrow="Trust and security"
    title="How we look after your data."
    lead="We're a UK business. We follow UK GDPR and PECR, we're registered with the ICO, and we publish exactly which sub-processors touch your data. If procurement needs something that isn't on this page, ask — we'll send it."
  >
    <h2>Hosting and architecture</h2>
    <ul>
      <li>Production app, API, workers, and database run on Render in EU regions, with API-layer authorisation scoping every resource.</li>
      <li>The marketing site is served as a static site over HTTPS with HSTS.</li>
      <li>Backups: nightly logical dumps plus point-in-time recovery on the production database.</li>
    </ul>

    <h2>Encryption</h2>
    <ul>
      <li>In transit: TLS 1.2+, HSTS enforced.</li>
      <li>At rest: AES-256 on database and persistent disks.</li>
      <li>Secrets live in environment variables on the host — never in code, never in the browser bundle.</li>
    </ul>

    <h2>Access</h2>
    <ul>
      <li>Admin actions are role-gated; the in-platform audit log records who did what, when.</li>
      <li>Sign-in: magic link and Google OAuth, with email+password fallback. MFA available for admin accounts.</li>
      <li>Service credentials exist only server-side, never in the shipped app.</li>
    </ul>

    <h2>AI and your data</h2>
    <p>We use Claude (Anthropic) and, as fallback, OpenAI models as delivery tooling, under business terms that exclude training on your data. Client work is isolated per project — one client&rsquo;s data is never used in another client&rsquo;s delivery.</p>

    <h2>Compliance and posture</h2>
    <ul>
      <li>UK GDPR. ICO registration <TODO>callum: number — &ldquo;details on request&rdquo; is currently on the page but a number reads stronger</TODO>.</li>
      <li>Cyber Essentials: <TODO>callum: confirm current status — page says &ldquo;in progress&rdquo; since May</TODO>.</li>
      <li>Annual external review of dependencies and access policies.</li>
    </ul>

    <h2>Reporting an issue</h2>
    <p><a href="mailto:security@out-of-house.dev">security@out-of-house.dev</a> — response within one business day. We never penalise good-faith research.</p>

    <h2>More</h2>
    <ul>
      <li><Link to="/subprocessors">Sub-processor list</Link></li>
      <li><Link to="/privacy-policy">Privacy policy</Link></li>
      <li><Link to="/terms-and-conditions">Terms</Link></li>
      <li>Status page <TODO>callum: confirm status.out-of-house.dev actually exists before we link it</TODO></li>
    </ul>
  </LegalShell>
);
