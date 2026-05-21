import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 6;

    const probe = async () => {
      attempts += 1;
      const { data, error: err } = await supabase.auth.getSession();
      if (cancelled) return;
      if (err) { setError(err.message); return; }
      if (data.session) {
        navigate('/app', { replace: true });
      } else if (attempts < maxAttempts) {
        setTimeout(probe, 350);
      } else {
        navigate('/login', { replace: true });
      }
    };

    probe();
    return () => { cancelled = true; };
  }, [navigate]);

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
