import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, auth } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [mode, setMode] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    if (mode === 'password') {
      try {
        await signIn(email, password);
        navigate('/app', { replace: true });
      } catch (err) {
        setError(err.message || 'Unable to sign in.');
      }
    } else {
      try {
        await auth.magicRequest(email);
        setInfo(`Magic link sent. Check ${email} and click the link to sign in.`);
      } catch (err) {
        setError(err.message || 'Unable to send magic link.');
      }
    }
    setSubmitting(false);
  };

  const signInGoogle = async () => {
    setError(null);
    setInfo(null);
    window.location.href = `${api.base}/api/v1/auth/google?redirect=${encodeURIComponent(`${window.location.origin}/auth/callback`)}`;
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-back">‹ Back to home</Link>
        <div className="eyebrow">Sign in</div>
        <h1 className="auth-title">Welcome back.</h1>
        <p className="auth-lead">
          Sign in to follow your project, submit feature requests, or pick up dev work.
        </p>

        <div className="auth-demo">
          <div className="auth-demo-label">Try the demo</div>
          <div className="auth-demo-row">
            <button type="button" className="auth-demo-btn" onClick={() => { setEmail('demo.client@out-of-house.dev'); setPassword('demo-client-2026'); setMode('password'); }}>
              <strong>Client demo</strong>
              <span>demo.client@out-of-house.dev</span>
            </button>
            <button type="button" className="auth-demo-btn" onClick={() => { setEmail('demo.developer@out-of-house.dev'); setPassword('demo-developer-2026'); setMode('password'); }}>
              <strong>Developer demo</strong>
              <span>demo.developer@out-of-house.dev</span>
            </button>
          </div>
        </div>

        <button type="button" className="auth-google" onClick={signInGoogle}>
          <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 01-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" /><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z" /><path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" /><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A9 9 0 009 0 9 9 0 00.96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z" /></svg>
          Continue with Google
        </button>

        <div className="auth-divider"><span>or</span></div>

        <div className="auth-tabs">
          <button type="button" className={mode === 'password' ? 'is-active' : ''} onClick={() => setMode('password')}>Email and password</button>
          <button type="button" className={mode === 'magic' ? 'is-active' : ''} onClick={() => setMode('magic')}>Magic link</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Email</span>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          {mode === 'password' && (
            <label>
              <span>Password</span>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <Link to="/password-reset" className="auth-inline-link">Forgot it?</Link>
            </label>
          )}

          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}

          <button type="submit" className="primary-btn auth-submit" disabled={submitting}>
            <span>{submitting ? 'Signing in…' : mode === 'password' ? 'Sign in' : 'Send magic link'}</span>
          </button>

          <p className="auth-foot">
            New here? <Link to="/apply">Apply to work with us</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
