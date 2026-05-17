import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase.auth.getSession();
      if (cancelled) return;
      if (err) {
        setError(err.message);
        return;
      }
      if (data.session) {
        navigate('/app', { replace: true });
      } else {
        // Sometimes Supabase needs a tick to settle the URL hash
        setTimeout(async () => {
          const { data: d2 } = await supabase.auth.getSession();
          if (d2.session) navigate('/app', { replace: true });
          else navigate('/login', { replace: true });
        }, 800);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="app-loader-dot" />
        <h1 className="auth-title">{error ? 'Sign-in error' : 'Signing you in…'}</h1>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
};

export default AuthCallback;
