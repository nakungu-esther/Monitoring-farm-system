import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getStoredToken } from '../api/auth';
import { useAgriTrack } from '../context/AgriTrackContext';

export default function RequireAuth() {
  const { currentUser, sessionResolving, apiEnabled } = useAgriTrack();
  const location = useLocation();

  // API mode: JWT is the source of truth. Do not serve the app off persisted currentUserId alone
  // (Stripe/billing calls can clear the token → must sign in again, not bounce to dashboard via /auth redirect).
  if (apiEnabled && !getStoredToken()) {
    return (
      <Navigate to="/auth?session=expired" replace state={{ from: location.pathname }} />
    );
  }

  if (apiEnabled && getStoredToken() && !currentUser) {
    if (sessionResolving) {
      return (
        <div className="flex min-h-[50dvh] w-full flex-col items-center justify-center gap-2 px-4 py-16 text-slate-600">
          <p className="text-sm font-medium">Signing you in…</p>
          <p className="text-center text-xs text-slate-500">Loading your account from the server.</p>
        </div>
      );
    }
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (!currentUser) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
