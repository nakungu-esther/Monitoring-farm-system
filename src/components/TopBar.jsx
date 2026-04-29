import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Bell, User, LogOut, Search, Moon, Sun, WifiOff } from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { isDarkScheme, toggleStoredColorScheme } from '../theme/initColorScheme';
import LanguageSwitcher from './LanguageSwitcher';

function cn(...p) {
  return p.filter(Boolean).join(' ');
}

function SearchField({ value, onChange, id, placeholder, searchAria }) {
  return (
    <>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" aria-hidden />
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600/40 focus:bg-white focus:ring-2 focus:ring-emerald-800/15 dark:border-emerald-900/40 dark:bg-zinc-900/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-emerald-600/50 dark:focus:bg-zinc-900"
        aria-label={searchAria}
      />
    </>
  );
}

export default function TopBar({ title, subtitle, onMenuClick, menuOpen = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { apiEnabled, apiStatus, refreshFromApi, unreadCount, logout, currentUser } = useAgriTrack();
  const online = useOnlineStatus();
  const [q, setQ] = useState('');
  const [darkUi, setDarkUi] = useState(() => isDarkScheme());

  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDarkUi(isDarkScheme()));
    obs.observe(el, { attributes: true, attributeFilter: ['data-color-scheme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (location.pathname !== '/search') return;
    setQ(searchParams.get('q') || '');
  }, [location.pathname, searchParams]);

  useEffect(() => {
    if (location.pathname === '/search') return;
    setQ('');
  }, [location.pathname]);

  const onSearch = (e) => {
    e.preventDefault();
    const s = q.trim();
    if (!s) return;
    navigate(`/search?q=${encodeURIComponent(s)}`);
  };

  return (
    <header className="sticky top-0 z-[1040] shrink-0 border-b border-zinc-200/90 bg-white/95 shadow-sm backdrop-blur-md dark:border-emerald-950/50 dark:bg-zinc-950/90">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {onMenuClick ? (
            <button
              type="button"
              className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 lg:hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              onClick={onMenuClick}
              aria-expanded={menuOpen}
              aria-controls="app-sidebar-nav"
              aria-label={menuOpen ? t('topbar.closeMenu') : t('topbar.openMenu')}
            >
              {menuOpen ? <X className="size-5" strokeWidth={2} /> : <Menu className="size-5" strokeWidth={2} />}
            </button>
          ) : null}

          <form onSubmit={onSearch} className="relative hidden min-w-0 lg:block lg:w-[14rem] xl:w-[18rem]">
            <SearchField
              id="header-search-desktop"
              value={q}
              onChange={setQ}
              placeholder={t('topbar.searchPlaceholder')}
              searchAria={t('topbar.searchAria')}
            />
          </form>

          <div className="min-w-0 flex-1 lg:max-w-xs lg:flex-none">
            <h1 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-50">
              {title}
            </h1>
            {subtitle ? (
              <p className="line-clamp-2 text-xs text-zinc-500 sm:text-sm lg:line-clamp-2 dark:text-zinc-400">{subtitle}</p>
            ) : null}
          </div>

          <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            {apiEnabled ? (
              <button
                type="button"
                className={cn(
                  'hidden rounded-full px-2.5 py-1 text-xs font-semibold xl:inline-flex',
                  apiStatus.error
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                    : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
                )}
                onClick={() => refreshFromApi()}
                title={
                  apiStatus.error
                    ? `${apiStatus.error} ${t('topbar.apiErrorHint')}`
                    : t('topbar.syncedHint')
                }
              >
                {apiStatus.loading ? t('topbar.syncing') : apiStatus.error ? t('topbar.apiError') : t('topbar.synced')}
              </button>
            ) : null}
            <div className="min-w-[9.75rem] shrink-0">
              <LanguageSwitcher />
            </div>
            <button
              type="button"
              onClick={() => {
                toggleStoredColorScheme();
                setDarkUi(isDarkScheme());
              }}
              className="flex size-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50/90 hover:text-emerald-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-200"
              title={darkUi ? t('topbar.themeLight') : t('topbar.themeDark')}
              aria-label={darkUi ? t('topbar.themeLight') : t('topbar.themeDark')}
            >
              {darkUi ? <Sun className="size-5" strokeWidth={2} /> : <Moon className="size-5" strokeWidth={2} />}
            </button>
            <Link
              to="/notifications"
              className="relative flex size-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50/90 hover:text-emerald-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-200"
              aria-label={t('topbar.alerts')}
            >
              <Bell className="size-5" strokeWidth={2} />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-emerald-800 px-1 text-[0.65rem] font-bold text-white dark:bg-emerald-500 dark:text-emerald-950">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
            <Link
              to="/profile"
              className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-1.5 pl-1.5 pr-3 text-zinc-800 transition hover:border-emerald-300 hover:bg-emerald-50/90 lg:flex dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40"
              title={currentUser?.profile?.name ? `${t('topbar.profile')} — ${currentUser.profile.name}` : t('topbar.profile')}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
                {currentUser?.profile?.name?.charAt(0) || '?'}
              </span>
              <span className="max-w-[7rem] truncate text-xs font-semibold capitalize">{currentUser?.role || '—'}</span>
            </Link>
            <Link
              to="/profile"
              className="flex size-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 lg:hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              aria-label={t('topbar.profile')}
            >
              <User className="size-5" strokeWidth={2} />
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex size-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-300"
              aria-label={t('topbar.logout')}
              title={t('topbar.logout')}
            >
              <LogOut className="size-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {!online ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-xs leading-snug text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            <WifiOff className="mt-0.5 size-4 shrink-0 text-amber-800 dark:text-amber-300" aria-hidden />
            <div>
              <span className="font-semibold">{t('offlineBar.offline')}</span> {t('offlineBar.offlineA')}
              <strong>{t('topbar.synced')}</strong>
              {t('offlineBar.offlineB')}
            </div>
          </div>
        ) : apiEnabled && apiStatus.error ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-xs leading-snug text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
            <WifiOff className="mt-0.5 size-4 shrink-0 text-amber-800 opacity-80 dark:text-amber-300" aria-hidden />
            <div>
              <span className="font-semibold">{t('offlineBar.apiTitle')}</span>
              {t('offlineBar.apiBeforeSync')}
              <strong>{t('topbar.synced')}</strong>
              {t('offlineBar.apiAfterSync')}
            </div>
          </div>
        ) : null}

        <form onSubmit={onSearch} className="relative w-full lg:hidden">
          <SearchField
            id="header-search-mobile"
            value={q}
            onChange={setQ}
            placeholder={t('topbar.searchPlaceholder')}
            searchAria={t('topbar.searchAria')}
          />
        </form>
      </div>
    </header>
  );
}
