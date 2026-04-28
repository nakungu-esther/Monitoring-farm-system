import React, { useEffect, useState, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { getPageKeyFromPath } from '../utils/i18nPageKey';

export default function AppShell() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const pageKey = getPageKeyFromPath(pathname);
  const meta = useMemo(
    () => ({
      title: t(`page.${pageKey}.title`),
      sub: t(`page.${pageKey}.sub`),
    }),
    [t, pageKey],
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileNavOpen]);

  return (
    <div className="relative min-h-[100dvh] w-full min-w-0 bg-zinc-50 dark:bg-zinc-950">
      {mobileNavOpen ? (
        <button
          type="button"
          className="sidebar-backdrop fixed inset-0 z-[1040] border-0 bg-slate-900/45 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <Sidebar mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      <div className="min-w-0 flex flex-col lg:ml-64">
        <TopBar
          title={meta.title}
          subtitle={meta.sub}
          onMenuClick={() => setMobileNavOpen((o) => !o)}
          menuOpen={mobileNavOpen}
        />
        <div className="relative isolate z-0 p-4 pb-10 sm:p-6 sm:pb-10 lg:p-8 lg:pb-12 transition-colors dark:bg-zinc-950">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
