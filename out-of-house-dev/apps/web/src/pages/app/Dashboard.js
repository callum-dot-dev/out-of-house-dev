import React from 'react';
import { useAuth } from '../../lib/AuthProvider';
import ClientDashboard from './client/ClientDashboard';
import DevDashboard from './dev/DevDashboard';
import AdminDashboard from './admin/AdminDashboard';
import { SkeletonPage } from '../../components/Skeleton';

const Dashboard = () => {
  const { isAdmin, isDeveloper, isClient, profile } = useAuth();
  if (!profile) return <SkeletonPage />;
  if (isAdmin)     return <AdminDashboard />;
  if (isDeveloper) return <DevDashboard />;
  if (isClient)    return <ClientDashboard />;
  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Welcome</div>
          <h1 className="app-h1">No role assigned yet.</h1>
          <p className="app-lead">Reach out to support if this looks wrong: support@out-of-house.dev</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
