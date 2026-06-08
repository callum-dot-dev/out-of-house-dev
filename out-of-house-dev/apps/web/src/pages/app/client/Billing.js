import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/AuthProvider';
import { api } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const Billing = () => {
  const { profile } = useAuth();
  const [sub, setSub] = useState(null);
  const [portalUrl, setPortalUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const data = await api.get('/billing');
        const subs = data?.subscriptions ?? [];
        setSub(subs.length > 0 ? subs[0] : null);
        setPortalUrl(data?.portal_url ?? null);
      } catch {
        setSub(null);
        setPortalUrl(null);
      }
      setLoading(false);
    })();
  }, [profile?.id]);

  const openPortal = () => {
    if (portalUrl) {
      window.location.href = portalUrl;
      return;
    }
    toast.info('Customer portal opens once Stripe is configured. Email us at support@out-of-house.dev for now.');
  };

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Billing</div>
          <h1 className="app-h1">Your plan and invoices.</h1>
          <p className="app-lead">Everything billing-related in one place. No surprises.</p>
        </div>
        <button type="button" className="primary-btn" onClick={openPortal}><span>Manage in Stripe portal</span></button>
      </div>

      <section className="app-card">
        <h2 className="app-h2">Current plan</h2>
        {loading ? (
          <p className="app-muted">Loading…</p>
        ) : sub ? (
          <div className="billing-summary">
            <div>
              <span className="kv-label">Plan</span>
              <strong>{sub.plan || 'Custom'}</strong>
            </div>
            <div>
              <span className="kv-label">Status</span>
              <span className={`badge badge-${sub.status === 'active' ? 'live' : 'paused'}`}>{sub.status}</span>
            </div>
            <div>
              <span className="kv-label">Renews</span>
              <strong>{sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '–'}</strong>
            </div>
          </div>
        ) : (
          <div className="app-empty">
            No active subscription. If you're on a one-off project, billing is by invoice; reach out at support@out-of-house.dev to get a copy.
          </div>
        )}
      </section>

      <section className="app-card">
        <h2 className="app-h2">What you're billed for</h2>
        <ul className="billing-list">
          <li>
            <strong>Hosting and care (£100/month)</strong>
            <p className="app-muted">IONOS hosting, updates, backups, uptime monitoring, monthly status report.</p>
          </li>
          <li>
            <strong>Monthly engagement (from £1,500/month)</strong>
            <p className="app-muted">Dedicated senior engineer, continuous shipping, Slack access, pause anytime.</p>
          </li>
          <li>
            <strong>One-off builds (fixed price)</strong>
            <p className="app-muted">Quoted on the call, invoiced on milestones. No hourly billing.</p>
          </li>
        </ul>
      </section>

      <section className="app-card">
        <h2 className="app-h2">VAT</h2>
        <p className="app-muted">
          We invoice from a UK business. Where VAT applies, invoices show the breakdown. If your accountant
          needs a different format, email support@out-of-house.dev and we'll sort it.
        </p>
      </section>
    </div>
  );
};

export default Billing;
