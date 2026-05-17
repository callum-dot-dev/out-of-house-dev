import React, { useState } from 'react';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabase';

const Settings = () => {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    company: profile?.company || '',
  });
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setWorking(true);
    const { error } = await supabase.from('profiles').update(form).eq('id', profile.id);
    setWorking(false);
    setMsg(error ? `Error: ${error.message}` : 'Saved.');
    if (!error) refreshProfile();
  };

  const setNewPassword = async (e) => {
    e.preventDefault();
    if (!password) return;
    setWorking(true);
    const { error } = await supabase.auth.updateUser({ password });
    setWorking(false);
    if (error) setMsg(`Password error: ${error.message}`);
    else { setMsg('Password updated.'); setPassword(''); }
  };

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Settings</div>
          <h1 className="app-h1">Your account.</h1>
        </div>
      </div>

      <section className="app-card">
        <h2 className="app-h2">Profile</h2>
        <form className="auth-form" onSubmit={save}>
          <label>
            <span>Full name</span>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </label>
          <label>
            <span>Company</span>
            <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
          </label>
          <label>
            <span>Email (read-only)</span>
            <input value={profile?.email || ''} disabled />
          </label>
          <button className="primary-btn auth-submit" disabled={working}><span>Save</span></button>
        </form>
      </section>

      <section className="app-card">
        <h2 className="app-h2">Set a password</h2>
        <p className="app-muted">If you signed in with magic link or Google and want to add an email + password login.</p>
        <form className="auth-form" onSubmit={setNewPassword}>
          <label>
            <span>New password</span>
            <input type="password" minLength="8" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <button className="primary-btn auth-submit" disabled={working || password.length < 8}><span>Update password</span></button>
        </form>
      </section>

      {msg && <div className="auth-info">{msg}</div>}
    </div>
  );
};

export default Settings;
