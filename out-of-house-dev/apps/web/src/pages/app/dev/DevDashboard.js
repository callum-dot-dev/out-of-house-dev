import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../lib/AuthProvider';
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

const DevDashboard = () => {
  const { profile } = useAuth();
  const [counts, setCounts] = useState({ assigned: 0, submitted: 0, building: 0, review: 0 });
  const [mine, setMine] = useState([]);

  useEffect(() => {
    (async () => {
      let board = [];
      try {
        const { requests } = await api.get('/board');
        board = requests ?? [];
      } catch (e) {
        board = [];
      }

      const assigned = board.filter((r) => r.claimed_by === profile?.id && ['scoped', 'building', 'review'].includes(r.status));
      const submitted = board.filter((r) => r.status === 'submitted');
      const building = board.filter((r) => r.status === 'building');
      const review = board.filter((r) => r.status === 'review');

      setCounts({
        assigned: assigned.length,
        submitted: submitted.length,
        building: building.length,
        review: review.length,
      });

      const mineData = board
        .filter((r) => r.claimed_by === profile?.id)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 6);
      setMine(mineData);
    })();
  }, [profile?.id]);

  const firstName = (profile.full_name || profile.email).split(' ')[0];

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Developer</div>
          <h1 className="app-h1">Hey, {firstName}.</h1>
          <p className="app-lead">Here's the state of the queue.</p>
        </div>
        <Link to="/app/board"><button className="primary-btn"><span>Open board</span></button></Link>
      </div>

      <div className="stat-tiles">
        <StatTile label="Your active work"      value={counts.assigned}  to="/app/board" />
        <StatTile label="Unclaimed in queue"    value={counts.submitted} to="/app/board" hint="Up for grabs" />
        <StatTile label="In build"              value={counts.building}  to="/app/board" />
        <StatTile label="Awaiting review"       value={counts.review}    to="/app/board" />
      </div>

      <section className="app-section">
        <div className="app-section-head">
          <h2 className="app-h2">Your current work</h2>
          <Link to="/app/board" className="app-link">View board →</Link>
        </div>
        {mine.length === 0 ? (
          <div className="app-card app-empty">Nothing claimed. Go grab something from the board.</div>
        ) : (
          <div className="app-card">
            <ul className="app-list">
              {mine.map(r => (
                <li key={r.id} className="app-list-row">
                  <div>
                    <Link to={`/app/requests/${r.id}`}><strong>{r.title}</strong></Link>
                    <div className="app-muted">{new Date(r.updated_at).toLocaleDateString()}</div>
                  </div>
                  <div className="app-list-meta">
                    <span className={`badge badge-priority badge-priority-${r.priority}`}>{r.priority}</span>
                    <span className={`badge badge-status badge-${r.status}`}>{r.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};

export default DevDashboard;
