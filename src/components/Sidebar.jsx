import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAgriTrack } from '../context/AgriTrackContext';
import { getNavForRole, Bell } from '../config/navConfig';
import { BriefcaseBusiness } from 'lucide-react';

function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default function Sidebar({ mobileOpen = false, onNavigate }) {
  const { t } = useTranslation();
  const { currentUser, unreadCount } = useAgriTrack();
  const role = currentUser?.role || 'farmer';
  const items = getNavForRole(role).filter((item) => {
    if (role === 'trader' && item.to === '/debts' && !currentUser?.isPremium) {
      return false;
    }
    return true;
  });

  const closeIfMobile = () => {
    if (onNavigate) onNavigate();
  };

  const linkClass = ({ isActive }) =>
    cn(
      'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
      isActive
        ? 'bg-emerald-100/90 text-emerald-950 shadow-sm ring-1 ring-emerald-900/10 dark:bg-emerald-950/55 dark:text-emerald-100 dark:ring-emerald-700/30'
        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100',
    );

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-[1050] flex h-[100dvh] w-[min(288px,88vw)] shrink-0 flex-col border-r border-zinc-200/80 bg-zinc-50/95 shadow-xl backdrop-blur-sm transition-transform duration-200 ease-out lg:w-64 lg:max-w-none lg:shadow-sm dark:border-emerald-950/40 dark:bg-zinc-900/98',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
    >
      <div className="flex items-center gap-3 border-b border-zinc-200/80 px-4 py-5 dark:border-zinc-700/80">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 shadow-md shadow-emerald-900/30 dark:bg-emerald-700 dark:shadow-emerald-950/40">
          <img src="/logo.png" alt="" className="size-8 object-contain" width={32} height={32} />
        </div>
        <div className="min-w-0">
          <div className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">AgriTrack</div>
          <div className="text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
            {t('sidebar.brandSub')}
          </div>
        </div>
      </div>

      <nav id="app-sidebar-nav" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3" aria-label="Main">
        {items.map((item) => {
          const { to, end, labelKey, Icon: ItemIcon } = item;
          return (
            <NavLink key={to} to={to} end={end} onClick={closeIfMobile} className={linkClass}>
              <ItemIcon className="size-[1.15rem] shrink-0" aria-hidden strokeWidth={2} />
              <span className="truncate">{t(labelKey)}</span>
            </NavLink>
          );
        })}

        <NavLink
          to="/notifications"
          onClick={closeIfMobile}
          className={({ isActive }) => cn(linkClass({ isActive }), 'mt-2')}
        >
          <Bell className="size-[1.1rem] shrink-0" aria-hidden strokeWidth={2} />
          <span className="flex-1">{t('nav.notifications')}</span>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-emerald-800 px-2 py-0.5 text-[0.65rem] font-bold text-white dark:bg-emerald-600 dark:text-emerald-950">
              {unreadCount}
            </span>
          ) : null}
        </NavLink>
      </nav>

      <div className="border-t border-zinc-200/80 p-3">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-lg shadow-emerald-600/20">
          <div className="flex items-center gap-2 text-sm font-bold">
            <BriefcaseBusiness className="size-4 shrink-0 opacity-90" aria-hidden />
            {t('sidebar.proInsight')}
          </div>
          <p className="mt-1 text-xs text-white/90">{t('sidebar.proInsightBody')}</p>
          <Link
            to="/upgrade"
            onClick={closeIfMobile}
            className="mt-3 block w-full rounded-lg bg-white py-2 text-center text-xs font-bold text-emerald-900 transition hover:bg-emerald-50 dark:bg-emerald-100 dark:text-emerald-950 dark:hover:bg-white"
          >
            {t('sidebar.upgradeCta')}
          </Link>
        </div>
      </div>
    </aside>
  );
}
