import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';

export default function Unauthorized() {
  const { t } = useTranslation();
  const location = useLocation();
  const { currentUser } = useAgriTrack();
  const st = location.state || {};
  const yourRole = st.yourRole || currentUser?.role || '—';
  const attempted = st.attemptedPath || t('unauthorized.pathFallback');
  const need = Array.isArray(st.allowedRoles) ? st.allowedRoles.join(', ') : null;

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <ShieldAlert className="mx-auto mb-4 size-14 text-amber-500" aria-hidden />
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-slate-900">
          {t('unauthorized.title')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {t('unauthorized.signedInAs')} <strong className="text-slate-900">{yourRole}</strong>
          {need ? (
            <>
              . {t('unauthorized.pathOnly', { path: attempted, roles: need })}
            </>
          ) : (
            <> {t('unauthorized.areaNA')}</>
          )}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">{t('unauthorized.help')}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          {t('unauthorized.backHome')}
        </Link>
      </div>
    </div>
  );
}
