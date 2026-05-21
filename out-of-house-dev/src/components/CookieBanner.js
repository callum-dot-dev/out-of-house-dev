import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const KEY = 'ooh.cookie-consent.v1';

const CookieBanner = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (!v) setOpen(true);
    } catch (_) { /* private mode */ }
  }, []);

  const accept = (mode) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ mode, at: Date.now() }));
    } catch (_) { /* ignore */ }
    setOpen(false);
    window.dispatchEvent(new CustomEvent('ooh:cookies', { detail: { mode } }));
  };

  if (!open) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <div className="cookie-banner-inner">
        <div className="cookie-banner-text">
          <strong>We use a little tea.</strong>
          <p>
            Strictly-necessary cookies keep you signed in. Analytics help us improve the site.
            You can change this any time. <Link to="/privacy-policy">Read the policy</Link>.
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button type="button" className="ghost-btn" onClick={() => accept('necessary')}>Necessary only</button>
          <button type="button" className="primary-btn" onClick={() => accept('all')}><span>Accept all</span></button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
