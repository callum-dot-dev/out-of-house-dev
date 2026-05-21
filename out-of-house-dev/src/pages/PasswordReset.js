import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const PasswordReset = () => {
  const [stage, setStage] = useState('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    // Supabase parks a recovery session on the page when the link is clicked.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setStage('set');
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStage('set');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const requestReset = async (e) => {
    e.preventDefault();
    setError(null); setInfo(null);
    setSubmitting(true);
    const redirectTo = `${window.location.origin}/password-reset`;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setSubmitting(false);
    if (err) setError(err.message);
    else setInfo(`Reset link sent. Check ${email} and click the link to set a new password.`);
  };

  const setNewPassword = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) setError(err.message);
    else { setInfo('Password updated. Redirecting…'); setTimeout(() => { window.location.href = '/app'; }, 700); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/login" className="auth-back">‹ Back to sign in</Link>
        <div className="eyebrow">Password reset</div>
        <h1 className="auth-title">{stage === 'set' ? 'Set a new password.' : 'Reset your password.'}</h1>
        <p className="auth-lead">
          {stage === 'set'
            ? 'Pick something at least 8 characters. The form replaces your current password.'
            : "Enter your email and we'll send you a link to reset it."}
        </p>

        {!isSupabaseConfigured && (
          <div className="auth-banner">Supabase isn't configured. See README for setup.</div>
        )}

        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}

        {stage === 'request' ? (
          <form className="auth-form" onSubmit={requestReset}>
            <label>
              <span>Email</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <button type="submit" className="primary-btn auth-submit" disabled={submitting}>
              <span>{submitting ? 'Sending…' : 'Send reset link'}</span>
            </button>
            <p className="auth-foot">Remember it after all? <Link to="/login">Sign in</Link></p>
          </form>
        ) : (
          <form className="auth-form" onSubmit={setNewPassword}>
            <label>
              <span>New password</span>
              <input required type="password" minLength="8" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </label>
            <label>
              <span>Confirm</span>
              <input required type="password" minLength="8" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </label>
            <button type="submit" className="primary-btn auth-submit" disabled={submitting}>
              <span>{submitting ? 'Updating…' : 'Set password'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PasswordReset;
