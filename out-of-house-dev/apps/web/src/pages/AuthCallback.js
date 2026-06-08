import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 6;

    const readToken = () => {
      try {
        const params = new URLSearchParams(window.location.search.replace('?', ''));
        const hash = new URLSearchParams((window.location.hash || '').replace('#', ''));
        return params.get('token') || hash.get('token') || null;
      } catch {
        return null;
      }
    };

    const finish = async () => {
      await refreshProfile();
      if (!cancelled) navigate('/app', { replace: true });
    };

    const probe = async () => {
      attempts += 1;
      try {
        await auth.me();
        if (cancelled) return;
        await finish();
      } catch (err) {
        if (cancelled) return;
        if (attempts < maxAttempts) {
          setTimeout(probe, 350);
        } else {
          navigate('/login', { replace: true });
        }
      }
    };

    (async () => {
      const token = readToken();
      if (token) {
        try {
          await auth.magicConsume(token);
          if (cancelled) return;
          await finish();
          return;
        } catch (err) {
          if (cancelled) return;
          setError(err.message || 'This sign-in link is invalid or has expired.');
          return;
        }
      }
      probe();
    })();

    return () => { cancelled = true; };
  }, [navigate, refreshProfile]);

  return (
    <div className="auth-page">
      <div className="auth-card auth-callback">
        <div className="app-loader-dots"><span /><span /><span /></div>
        <h1 className="auth-title">{error ? 'Sign-in error' : 'Signing you in…'}</h1>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
};

export default AuthCallback;
