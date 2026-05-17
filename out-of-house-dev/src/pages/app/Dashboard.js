import React from 'react';
import { useAuth } from '../../lib/AuthProvider';
import ClientDashboard from './client/ClientDashboard';
import DevDashboard from './dev/DevDashboard';
import AdminDashboard from './admin/AdminDashboard';

const Dashboard = () => {
  const { isAdmin, isDeveloper, isClient, profile } = useAuth();
  if (!profile) return <div className="app-empty">Loading profile…</div>;
  if (isAdmin)     return <AdminDashboard />;
  if (isDeveloper) return <DevDashboard />;
  if (isClient)    return <ClientDashboard />;
  return <div className="app-empty">No role assigned to your account. Contact us.</div>;
};

export default Dashboard;
