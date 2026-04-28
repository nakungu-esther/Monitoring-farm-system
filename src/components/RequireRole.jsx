import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAgriTrack } from '../context/AgriTrackContext';
import { normalizeAppRole } from '../utils/roles';

/**
 * @param {{ allowed: string[] }} props
 */
export default function RequireRole({ allowed }) {
  const { currentUser } = useAgriTrack();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  const role = normalizeAppRole(currentUser.role);
  if (!allowed.includes(role)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{
          attemptedPath: location.pathname,
          allowedRoles: allowed,
          yourRole: role,
        }}
      />
    );
  }

  return <Outlet />;
}
