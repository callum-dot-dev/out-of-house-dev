import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const setRole = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id);
    load();
  };

  const filtered = users.filter(u => filter === 'all' || u.role === filter);

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Admin · Users</div>
          <h1 className="app-h1">Everyone with an account.</h1>
        </div>
      </div>

      <div className="filter-pills">
        {['all','client','developer','admin'].map(f => (
          <button key={f} className={`filter-pill ${filter === f ? 'is-active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="app-card">
        <table className="app-table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Company</th><th>Role</th><th>Joined</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>{u.full_name || '–'}</td>
                <td>{u.email}</td>
                <td>{u.company || '–'}</td>
                <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                <td className="app-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <select value={u.role} onChange={e => setRole(u.id, e.target.value)}>
                    <option value="client">Client</option>
                    <option value="developer">Developer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="6" className="app-empty">No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
