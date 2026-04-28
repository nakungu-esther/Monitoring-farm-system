import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import UpgradePlanCards from '../components/UpgradePlanCards';
import { useAgriTrack } from '../context/AgriTrackContext';
import { Navigate } from 'react-router-dom';
import { normalizeAppRole } from '../utils/roles';

// Visible copy: upgradePage / upgradeCards in src/locales/.../translation.json (not hardcoded in JSX).

export default function Upgrade() {
  const { t } = useTranslation();
  const { currentUser } = useAgriTrack();
  const role = normalizeAppRole(currentUser?.role);

  if (role === 'admin') {
    return <Navigate to="/" replace />;
  }
  if (role !== 'farmer' && role !== 'trader') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page mx-auto max-w-6xl space-y-8 px-1 sm:px-2">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/40 sm:p-8">
        <div className="mb-1 flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
          <Sparkles className="size-5" aria-hidden />
          {t('upgradePage.kicker')}
        </div>
        <h1 className="page-title text-zinc-900 dark:text-zinc-100">
          {role === 'farmer' ? t('upgradePage.farmerTitle') : t('upgradePage.traderTitle')}
        </h1>
        <p className="page-lead muted mt-2 max-w-xl">
          {role === 'farmer' ? t('upgradePage.farmerSub') : t('upgradePage.traderSub')}
        </p>
      </div>
      <UpgradePlanCards />
    </div>
  );
}
