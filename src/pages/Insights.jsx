import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Wheat,
  ShoppingBag,
  BarChart3,
  Wallet2,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAgriTrack } from '../context/AgriTrackContext';

function InsightCard({ icon: Icon, label, children, accent }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        accent ? 'border-emerald-200/90 ring-1 ring-emerald-100/50' : 'border-zinc-200/80'
      }`}
    >
      {Icon ? (
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Icon className="size-5" strokeWidth={2} />
        </div>
      ) : null}
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-zinc-900">
        {children}
      </div>
    </div>
  );
}

function QuickLink({ to, children }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:border-emerald-200 hover:bg-emerald-50/60"
    >
      <span>{children}</span>
      <ArrowRight className="size-4 text-emerald-600 transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export default function Insights() {
  const { t } = useTranslation();
  const {
    currentUser,
    visibleSales,
    state,
    creditOwedAsBuyer,
    purchasesAsBuyer,
  } = useAgriTrack();

  // Deployed presentation: hide Admin experience, treat it as Farmer for UI purposes.
  const role = currentUser?.role === 'admin' ? 'farmer' : currentUser?.role || 'farmer';
  const firstName = currentUser?.profile?.name?.split(' ')[0] || 'there';

  const adminRollup = useMemo(() => {
    const revenue = state.sales.reduce(
      (sum, s) => sum + Math.min(s.amountPaid ?? 0, s.totalPayment),
      0,
    );
    return {
      users: state.users.length,
      harvests: state.harvests.length,
      sales: state.sales.length,
      revenue,
    };
  }, [state]);

  const traderSpent = useMemo(
    () => visibleSales.reduce((s, x) => s + Math.min(x.amountPaid ?? 0, x.totalPayment), 0),
    [visibleSales],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg shadow-emerald-600/20">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-5 shrink-0 opacity-90" aria-hidden />
          {t('page.insights.title')}
        </div>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Hello, {firstName}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/90">
          A focused read on your numbers and the next screens to open. Everything here respects your role: no dead
          links.
        </p>
      </div>

      {role !== 'admin' ? (
        <section className="rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">Grow revenue</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {role === 'farmer'
              ? 'Boost visibility on the marketplace, or (for traders) priority access and credit: two simple upgrades.'
              : 'Priority listing order and on-credit checkout. See plans and pay in one place.'}
          </p>
          <Link
            to="/upgrade"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700"
          >
            View upgrades
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      ) : null}

      {role === 'admin' ? (
        <>
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">System snapshot</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InsightCard icon={BarChart3} label="Users">
                {adminRollup.users}
              </InsightCard>
              <InsightCard icon={Wheat} label="Harvest records">
                {adminRollup.harvests}
              </InsightCard>
              <InsightCard icon={TrendingUp} label="Sales rows" accent>
                {adminRollup.sales}
              </InsightCard>
              <InsightCard icon={Wallet2} label="Total cash-in (UGX)" accent>
                UGX {Math.round(adminRollup.revenue).toLocaleString()}
              </InsightCard>
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Go deeper</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <QuickLink to="/reports">Reports &amp; exports</QuickLink>
              <QuickLink to="/admin">User directory</QuickLink>
              <QuickLink to="/settings">System settings</QuickLink>
              <QuickLink to="/">Back to dashboard</QuickLink>
            </div>
          </section>
        </>
      ) : null}

      {role === 'trader' ? (
        <>
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Your desk</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InsightCard icon={ShoppingBag} label="Purchases (rows tied to you)">
                {visibleSales.length}
              </InsightCard>
              <InsightCard icon={Wallet2} label="Cash paid / received (UGX)" accent>
                UGX {Math.round(traderSpent).toLocaleString()}
              </InsightCard>
              <InsightCard icon={TrendingUp} label="Open credit lines">
                {creditOwedAsBuyer.length}
              </InsightCard>
              <InsightCard icon={ShoppingBag} label="Recent purchase records">
                {purchasesAsBuyer.length}
              </InsightCard>
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Next steps</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <QuickLink to="/marketplace">Browse marketplace</QuickLink>
              <QuickLink to="/purchases">Purchase history</QuickLink>
              <QuickLink to="/orders">Orders &amp; supply</QuickLink>
              <QuickLink to="/payments">Payments</QuickLink>
            </div>
          </section>
        </>
      ) : null}

    </div>
  );
}
