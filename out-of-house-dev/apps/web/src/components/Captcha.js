import React, { useEffect, useRef } from 'react';

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

const Captcha = ({ onToken, theme = 'light' }) => {
  const ref = useRef(null);
  const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return undefined;
    let mounted = true;

    const init = () => {
      if (!mounted || !ref.current || !window.turnstile) return;
      window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme,
        callback: (token) => onToken?.(token),
        'error-callback': () => onToken?.(null),
      });
    };

    if (!document.querySelector(`script[src="${TURNSTILE_SRC}"]`)) {
      const s = document.createElement('script');
      s.src = TURNSTILE_SRC;
      s.async = true;
      s.defer = true;
      s.onload = init;
      document.head.appendChild(s);
    } else {
      init();
    }
    return () => { mounted = false; };
  }, [siteKey, theme, onToken]);

  if (!siteKey) {
    return (
      <div className="captcha-placeholder" aria-hidden="true" data-testid="captcha-disabled">
        <span>Spam protection will load once Turnstile is configured.</span>
      </div>
    );
  }

  return <div className="captcha-host" ref={ref} />;
};

export default Captcha;
