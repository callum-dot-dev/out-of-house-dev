import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Captcha from '../components/Captcha';
import { getBuildType, SCOPE_LABELS, formatGBP } from '../data/pricing';

// Scope summary handed over from the homepage calculator "Apply with this scope".
const readQuote = () => {
  try {
    const p = new URLSearchParams(window.location.search);
    const type = p.get('quote_type');
    const bt = getBuildType(type);
    if (!bt) return null;
    const units = Number(p.get('quote_units')) || bt.min;
    const oneoff = Number(p.get('quote_oneoff')) || 0;
    const monthly = Number(p.get('quote_monthly')) || 0;
    return { label: bt.label, scope: SCOPE_LABELS[type](units), oneoff, monthly };
  } catch { return null; }
};

const PROJECT_TYPES = [
  { value: 'website',          label: 'Website / landing page' },
  { value: 'automation',       label: 'AI automation' },
  { value: 'web_app',          label: 'Web app / SaaS' },
  { value: 'custom_software',  label: 'Custom internal software' },
  { value: 'platform',         label: 'Full platform' },
  { value: 'other',            label: 'Something else' },
];

const BUDGETS = ['Under £1,000', '£1,000 to £5,000', '£5,000 to £20,000', '£20,000+'];
const TIMELINES = ['ASAP', 'Within a month', '1 to 3 months', 'Just exploring'];

const readUtm = () => {
  try {
    const params = new URLSearchParams(window.location.search.replace('?', ''));
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
    };
  } catch { return {}; }
};

const initial = {
  full_name: '', email: '', company: '', phone: '',
  project_type: 'website', project_description: '',
  budget_range: BUDGETS[1], timeline: TIMELINES[0], source: '',
};

const Apply = () => {
  const quote = readQuote();
  const [form, setForm] = useState(initial);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const update = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload = {
      ...form,
      ...readUtm(),
      captcha_token: captchaToken,
      user_agent: navigator.userAgent,
    };
    try {
      await api.post('/apply', payload);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Unable to submit your application. Please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card-wide">
          <div className="eyebrow">Application received</div>
          <h1 className="auth-title">Got it.</h1>
          <p className="auth-lead">
            A real person replies within one business day.
          </p>
          <div className="auth-actions">
            <Link to="/"><button className="primary-btn"><span>Back to home</span></button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <Link to="/" className="auth-back">‹ Back to home</Link>
        <div className="eyebrow">Apply to work with us</div>
        <h1 className="auth-title">Tell us what you&apos;re building.</h1>
        <p className="auth-lead">
          Five fields, one business day to a reply. If a call is faster, book one instead.
        </p>
        {quote && (
          <p className="apply-quote-summary">
            Your calculator estimate: {quote.label}, {quote.scope} — <strong>{formatGBP(quote.oneoff)}</strong>
            {quote.monthly > 0 && <> + {formatGBP(quote.monthly)}/mo</>}. We&apos;ll confirm it on the call.
          </p>
        )}

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-row">
            <label>
              <span>Full name</span>
              <input required value={form.full_name} onChange={update('full_name')} />
            </label>
            <label>
              <span>Email</span>
              <input required type="email" value={form.email} onChange={update('email')} />
            </label>
          </div>
          <div className="auth-row">
            <label>
              <span>Company (optional)</span>
              <input value={form.company} onChange={update('company')} />
            </label>
            <label>
              <span>Phone (optional)</span>
              <input value={form.phone} onChange={update('phone')} type="tel" />
            </label>
          </div>

          <label>
            <span>What are we building?</span>
            <select value={form.project_type} onChange={update('project_type')}>
              {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          <label>
            <span>Project description</span>
            <textarea
              required
              rows="5"
              placeholder="What are you trying to build, and what does success look like?"
              value={form.project_description}
              onChange={update('project_description')}
            />
          </label>

          <div className="auth-row">
            <label>
              <span>Budget</span>
              <select value={form.budget_range} onChange={update('budget_range')}>
                {BUDGETS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
            <label>
              <span>Timeline</span>
              <select value={form.timeline} onChange={update('timeline')}>
                {TIMELINES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>

          <label>
            <span>How did you find us? (optional)</span>
            <input value={form.source} onChange={update('source')} placeholder="Referral, search, social..." />
          </label>

          <Captcha onToken={setCaptchaToken} />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="primary-btn auth-submit" disabled={submitting}>
            <span>{submitting ? 'Sending…' : 'Send application'}</span>
          </button>
          <p className="auth-foot">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Apply;
