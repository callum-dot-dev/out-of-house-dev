import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';

const StatTile = ({ label, value, hint, to }) => {
  const inner = (
    <>
      <div className="stat-tile-label">{label}</div>
      <div className="stat-tile-value">{value}</div>
      {hint && <div className="stat-tile-hint">{hint}</div>}
    </>
  );
  return to ? <Link to={to} className="stat-tile">{inner}</Link> : <div className="stat-tile">{inner}</div>;
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({ pending: 0, projects: 0, openRequests: 0, users: 0 });
  const [latest, setLatest] = useState([]);

  useEffect(() => {
    (async () => {
      const [applications, projects, board, users] = await Promise.all([
        api.get('/admin/applications').then((r) => r.applications || []).catch(() => []),
        api.get('/projects').then((r) => r.projects || []).catch(() => []),
        api.get('/board').then((r) => r.requests || []).catch(() => []),
        api.get('/admin/users').then((r) => r.users || []).catch(() => []),
      ]);

      const pending = applications.filter((a) => a.status === 'pending').length;
      const openRequests = board.filter((r) =>
        ['submitted', 'scoped', 'building', 'review'].includes(r.status)
      ).length;

      const sorted = [...applications].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setStats({
        pending,
        projects: projects.length,
        openRequests,
        users: users.length,
      });
      setLatest(sorted.slice(0, 5));
    })();
  }, []);

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Admin</div>
          <h1 className="app-h1">Control room.</h1>
        </div>
      </div>

      <div className="stat-tiles">
        <StatTile label="Pending applications" value={stats.pending} to="/app/admin/applications" hint="Review &amp; approve" />
        <StatTile label="Active projects"      value={stats.projects} to="/app/projects" />
        <StatTile label="Open requests"        value={stats.openRequests} to="/app/board" hint="Across all clients" />
        <StatTile label="Users"                value={stats.users} to="/app/admin/users" />
      </div>

      <section className="app-card">
        <div className="app-card-head">
          <h2>Latest applications</h2>
          <Link to="/app/admin/applications" className="app-link">View all →</Link>
        </div>
        {latest.length === 0 ? (
          <div className="app-empty">Nothing yet.</div>
        ) : (
          <ul className="app-list">
            {latest.map(a => (
              <li key={a.id} className="app-list-row">
                <div>
                  <strong>{a.full_name}</strong>
                  <span className="app-muted"> · {a.email}</span>
                </div>
                <div className="app-list-meta">
                  <span className={`badge badge-${a.status}`}>{a.status}</span>
                  <span className="app-muted">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
