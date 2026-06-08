import React, { useState } from 'react';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

const Settings = () => {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    company: profile?.company || '',
    timezone: profile?.timezone || 'Europe/London',
    notify_email: profile?.notify_email ?? true,
    notify_in_app: profile?.notify_in_app ?? true,
  });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [working, setWorking] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setWorking(true);
    const { error } = await supabase.from('profiles').update(form).eq('id', profile?.id);
    setWorking(false);
    if (error) toast.error(`Save failed: ${error.message}`);
    else { toast.success('Profile saved.'); refreshProfile(); }
  };

  const setNewPassword = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match.'); return; }
    if (password.length < 8) { toast.error('Use at least 8 characters.'); return; }
    setWorking(true);
    const { error } = await supabase.auth.updateUser({ password });
    setWorking(false);
    if (error) toast.error(`Password error: ${error.message}`);
    else { toast.success('Password updated.'); setPassword(''); setConfirm(''); }
  };

  const exportData = async () => {
    if (!profile?.id) return;
    toast.info('Generating export…');
    const [{ data: projects }, { data: requests }, { data: comments }, { data: attachments }, { data: notifs }] = await Promise.all([
      supabase.from('projects').select('*').eq('client_id', profile.id),
      supabase.from('feature_requests').select('*').eq('created_by', profile.id),
      supabase.from('request_comments').select('*').eq('author_id', profile.id),
      supabase.from('attachments').select('*').eq('uploader_id', profile.id),
      supabase.from('notifications').select('*').eq('user_id', profile.id),
    ]);
    const blob = new Blob([JSON.stringify({
      profile, projects, requests, comments, attachments, notifications: notifs,
      exported_at: new Date().toISOString(),
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `out-of-house-export-${profile.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export downloaded.');
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
            <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </label>
          <label>
            <span>Company</span>
            <input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
          </label>
          <label>
            <span>Email (read-only)</span>
            <input value={profile?.email || ''} disabled />
          </label>
          <label>
            <span>Time zone</span>
            <input value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} placeholder="Europe/London" />
          </label>
          <button className="primary-btn auth-submit" disabled={working}><span>Save</span></button>
        </form>
      </section>

      <section className="app-card">
        <h2 className="app-h2">Notifications</h2>
        <p className="app-muted notify-intro">Choose how we reach you. You can change this at any time.</p>

        <div className="notify-list">
          <NotifyRow
            icon={(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            )}
            title="Email updates"
            body="A short summary email when something changes on one of your projects."
            checked={form.notify_email}
            onChange={(v) => setForm((f) => ({ ...f, notify_email: v }))}
          />
          <NotifyRow
            icon={(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
            )}
            title="In-portal notifications"
            body="Show the bell-icon feed inside the app. Useful if you live in the portal day-to-day."
            checked={form.notify_in_app}
            onChange={(v) => setForm((f) => ({ ...f, notify_in_app: v }))}
          />
        </div>

        <div className="notify-actions">
          <button type="button" className="notify-save" disabled={working} onClick={save}>
            {working ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </section>

      <section className="app-card">
        <h2 className="app-h2">Security</h2>
        <p className="app-muted">Set or change your password. If you signed in with Google or a magic link, this adds email+password as a fallback.</p>
        <form className="auth-form" onSubmit={setNewPassword}>
          <label>
            <span>New password</span>
            <input type="password" minLength="8" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </label>
          <label>
            <span>Confirm</span>
            <input type="password" minLength="8" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </label>
          <button className="primary-btn auth-submit" disabled={working || password.length < 8 || password !== confirm}>
            <span>Update password</span>
          </button>
        </form>
      </section>

      <section className="app-card">
        <h2 className="app-h2">Your data</h2>
        <p className="app-muted">Download everything we hold for you as a single JSON file. Useful for audits, backups, or peace of mind.</p>
        <button type="button" className="ghost-btn" onClick={exportData}>Download my data</button>
      </section>
    </div>
  );
};

const NotifyRow = ({ icon, title, body, checked, onChange }) => (
  <label className={`notify-row ${checked ? 'is-on' : ''}`}>
    <span className="notify-row-icon" aria-hidden="true">{icon}</span>
    <span className="notify-row-text">
      <strong>{title}</strong>
      <span>{body}</span>
    </span>
    <span className="notify-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={title}
      />
      <span className="notify-switch-track" aria-hidden="true" />
      <span className="notify-switch-thumb" aria-hidden="true" />
    </span>
  </label>
);

export default Settings;
