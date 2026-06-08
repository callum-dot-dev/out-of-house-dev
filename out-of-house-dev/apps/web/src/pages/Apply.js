import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Captcha from '../components/Captcha';

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
          <h1 className="auth-title">Thanks, {form.full_name.split(' ')[0]}.</h1>
          <p className="auth-lead">
            We've got your details. We'll reach out within one business day to book a discovery call.
            If we're a fit, we'll create your account so you can log in and follow the build live.
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
        <h1 className="auth-title">Tell us about the project.</h1>
        <p className="auth-lead">
          A quick form. We review, book a call, and if it's a fit we spin up your client account so you can follow the build inside this site.
        </p>

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
            <span>{submitting ? 'Sending…' : 'Submit application'}</span>
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
