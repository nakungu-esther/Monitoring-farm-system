import React, { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Users,
  Wheat,
  TrendingUp,
  ShoppingBag,
  Clock,
  Wallet2,
  Megaphone,
  ClipboardList,
  Radio,
  CloudSun,
} from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { ProduceCashInBarChart, StockPieChart, RevenueTrendChart } from '../components/DashboardCharts';
import { useToast } from '../context/ToastContext';
import { profileNameWithoutDemoPrefix } from '../utils/profileDisplayName';

function StatCard({ icon: Icon, label, children, accent, hint }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        accent
          ? 'border-emerald-200/90 ring-1 ring-emerald-100/60'
          : 'border-zinc-200/80'
      }`}
    >
      {Icon ? (
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Icon className="size-5" strokeWidth={2} />
        </div>
      ) : null}
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-zinc-900">
        {children}
      </div>
      {hint ? <p className="mt-2 text-xs font-semibold text-green-600">{hint}</p> : null}
    </div>
  );
}

export default function Dashboard() {
  const {
    state,
    dashboardStats,
    stockByProduce,
    visibleSales,
    visibleHarvests,
    currentUser,
    isAdmin,
    notifications,
    markNotificationRead,
    seasonalReminders,
    purchasesAsBuyer,
    creditOwedAsBuyer,
    outstandingDebts,
    apiEnabled,
    apiStatus,
  } = useAgriTrack();

  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const statusLabel = (s) => {
    if (s.paymentStatus === 'paid') return t('saleStatus.paid');
    if (s.paymentStatus === 'credit') return t('saleStatus.credit');
    return t('saleStatus.partial');
  };
  const lastApiErr = useRef(null);
  useEffect(() => {
    if (!apiEnabled || !apiStatus.error) return;
    if (lastApiErr.current === apiStatus.error) return;
    lastApiErr.current = apiStatus.error;
    toast(t('dashboard.apiSyncToast', { error: apiStatus.error }), 'error');
  }, [apiEnabled, apiStatus.error, toast, t]);

  const role = currentUser?.role || 'farmer';
  const firstName =
    profileNameWithoutDemoPrefix(currentUser?.profile?.name)?.split(/\s+/)[0] ||
    t('dashboard.fallbackGreetName');

  const welcomeLine = useMemo(() => {
    if (!currentUser) return '';
    const panel =
      currentUser.role === 'admin'
        ? t('welcome.adminConsole')
        : currentUser.role === 'trader'
          ? t('welcome.traderPanel')
          : t('welcome.farmerWorkspace');
    const name = profileNameWithoutDemoPrefix(currentUser.profile?.name || '');
    const roleNameEn =
      currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'trader' ? 'Trader' : 'Farmer';
    if (!name) return panel;
    if (name === roleNameEn) return panel;
    return `${name} · ${panel}`;
  }, [currentUser, t, i18n.language]);

  const {
    totalStockTonnes,
    totalRevenue,
    totalExpenses,
    profit,
    trend,
    mostProfitableCrop,
    topBuyer,
    revenueThisMonth,
    revenuePrevMonth,
    monthOverMonthPct,
    monthLabelThis,
    monthLabelPrev,
  } = dashboardStats;

  const animStock = useAnimatedNumber(Math.max(0, totalStockTonnes));
  const animRev = useAnimatedNumber(totalRevenue);
  const animExp = useAnimatedNumber(totalExpenses);
  const animProfit = useAnimatedNumber(profit);

  const recent = useMemo(
    () => [...visibleSales].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8),
    [visibleSales],
  );

  const recentPurchases = useMemo(() => purchasesAsBuyer.slice(0, 8), [purchasesAsBuyer]);

  const trendPreview = useMemo(() => (trend && trend.length ? trend.slice(-6) : []), [trend]);

  const outstandingTotal = useMemo(
    () => outstandingDebts.reduce((s, x) => s + Math.max(0, x.totalPayment - (x.amountPaid || 0)), 0),
    [outstandingDebts],
  );

  const harvestTotal = useMemo(
    () => visibleHarvests.reduce((s, h) => s + Number(h.tonnage), 0),
    [visibleHarvests],
  );

  const traderSpent = useMemo(
    () =>
      visibleSales.reduce((s, x) => s + Math.min(x.amountPaid ?? 0, x.totalPayment), 0),
    [visibleSales],
  );

  const traderPending = useMemo(
    () =>
      creditOwedAsBuyer.reduce((s, x) => s + Math.max(0, x.totalPayment - (x.amountPaid || 0)), 0),
    [creditOwedAsBuyer],
  );

  const adminStats = useMemo(() => {
    const revenue = state.sales.reduce(
      (sum, s) => sum + Math.min(s.amountPaid ?? 0, s.totalPayment),
      0,
    );
    return {
      users: state.users.length,
      harvests: state.harvests.length,
      revenue,
      activity: state.walletTransactions.length,
    };
  }, [state]);

  const greet = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.greetMorning');
    if (h < 17) return t('dashboard.greetAfternoon');
    return t('dashboard.greetEvening');
  }, [t, i18n.language]);

  const heroSub = useMemo(() => {
    const n = notifications.length;
    if (n > 0) {
      if (n === 1) return t('dashboard.heroAlertOne');
      return t('dashboard.heroAlertMany', { count: n });
    }
    if (role === 'trader') return t('dashboard.heroTraderClear');
    if (role === 'admin') return t('dashboard.heroAdmin');
    return t('dashboard.heroFarmer');
  }, [notifications.length, role, t, i18n.language]);

  const ctaTo = role === 'trader' ? '/marketplace' : role === 'admin' ? '/admin' : '/farm';
  const ctaLabel = useMemo(() => {
    if (role === 'trader') return t('dashboard.ctaMarketplace');
    if (role === 'admin') return t('dashboard.ctaAdmin');
    return t('dashboard.ctaProduce');
  }, [role, t, i18n.language]);

  const momText = useMemo(() => {
    if (monthOverMonthPct == null) {
      return revenueThisMonth > 0 ? t('dashboard.momFirst') : t('dashboard.momNone');
    }
    if (monthOverMonthPct === 0) return t('dashboard.momFlat');
    const m = monthLabelPrev?.slice(5) || '';
    if (monthOverMonthPct > 0) {
      return t('dashboard.momUp', { pct: Math.abs(monthOverMonthPct), month: m || '—' });
    }
    return t('dashboard.momDown', { pct: Math.abs(monthOverMonthPct), month: m || '—' });
  }, [monthOverMonthPct, monthLabelPrev, revenueThisMonth, t, i18n.language]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {apiEnabled ? (
        <div className="flex gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 text-sm text-sky-950 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
          <Radio className="mt-0.5 size-5 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
          <p className="m-0 leading-relaxed">
            <span className="font-semibold">{t('dashboard.connectivityTitle')}</span>
            {t('dashboard.connectivityA')}
            <strong className="font-semibold">{t('topbar.synced')}</strong>
            {t('dashboard.connectivityB')}
          </p>
        </div>
      ) : (
        <div className="flex gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-3 text-sm text-sky-950 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
          <Radio className="mt-0.5 size-5 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
          <p className="m-0 leading-relaxed">
            <span className="font-semibold">{t('dashboard.offlineModeTitle')}</span>
            {t('dashboard.offlineModeBody')}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            {welcomeLine}
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {greet}, {firstName}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-600">{heroSub}</p>
        </div>
        <Link
          to={ctaTo}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
        >
          {ctaLabel}
        </Link>
      </div>

      {role === 'farmer' ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700 shadow-sm">
          <span className="flex items-center gap-1.5 font-bold text-zinc-900">
            <Sparkles className="size-4 text-emerald-500" aria-hidden />
            {t('dashboard.wfTitle')}
          </span>
          <span className="text-zinc-300">|</span>
          <Link className="font-semibold text-emerald-700 underline-offset-2 hover:underline" to="/farm">
            {t('dashboard.wfHarvest')}
          </Link>
          <span className="text-zinc-400">→</span>
          <Link className="font-semibold text-emerald-700 underline-offset-2 hover:underline" to="/stock">
            {t('dashboard.wfStock')}
          </Link>
          <span className="text-zinc-400">→</span>
          <Link className="font-semibold text-emerald-700 underline-offset-2 hover:underline" to="/sales">
            {t('dashboard.wfSale')}
          </Link>
          <span className="text-zinc-400">→</span>
          <Link className="font-semibold text-emerald-700 underline-offset-2 hover:underline" to="/debts">
            {t('dashboard.wfPay')}
          </Link>
          <span className="text-zinc-300">|</span>
          <Link
            className="inline-flex items-center gap-1 font-semibold text-sky-800 underline-offset-2 hover:underline dark:text-sky-200"
            to="/weather"
          >
            <CloudSun className="size-3.5 shrink-0" aria-hidden />
            {t('nav.weatherPlanning')}
          </Link>
          <span className="text-zinc-400">→</span>
          <span className="text-zinc-600">{t('dashboard.wfHere')}</span>
        </div>
      ) : null}

      {role === 'admin' ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <Megaphone className="size-4" aria-hidden />
            {t('dashboard.sysOverview')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label={t('dashboard.lblUsers')}>
              {adminStats.users}
            </StatCard>
            <StatCard icon={Wheat} label={t('dashboard.lblProduceEntries')}>
              {adminStats.harvests}
            </StatCard>
            <StatCard icon={TrendingUp} label={t('dashboard.lblRevenue')} accent>
              UGX {Math.round(adminStats.revenue).toLocaleString()}
            </StatCard>
            <StatCard icon={Wallet2} label={t('dashboard.lblWalletTx')}>
              {adminStats.activity}
            </StatCard>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link className="font-semibold text-emerald-700 hover:underline" to="/admin">
              {t('dashboard.linkManageUsers')}
            </Link>
            <span className="text-slate-300">·</span>
            <Link className="font-semibold text-emerald-700 hover:underline" to="/reports">
              {t('dashboard.linkReports')}
            </Link>
            <span className="text-slate-300">·</span>
            <Link className="font-semibold text-emerald-700 hover:underline" to="/settings">
              {t('dashboard.linkSettings')}
            </Link>
          </div>
        </section>
      ) : null}

      {role === 'trader' ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <ShoppingBag className="size-4" aria-hidden />
            {t('dashboard.purchasingDesk')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={ShoppingBag} label={t('dashboard.lblTotalPurchases')}>
              {visibleSales.length}
            </StatCard>
            <StatCard icon={TrendingUp} label={t('dashboard.lblAmountPaidUgx')} accent>
              UGX {Math.round(traderSpent).toLocaleString()}
            </StatCard>
            <StatCard icon={Clock} label={t('dashboard.lblPendingUgx')}>
              UGX {Math.round(traderPending).toLocaleString()}
            </StatCard>
            <StatCard icon={ClipboardList} label={t('dashboard.lblOpenCredit')}>
              {creditOwedAsBuyer.length}
            </StatCard>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StatCard
              icon={TrendingUp}
              label={t('dashboard.lblCashIn', { m: monthLabelThis?.slice(5) || t('dashboard.thisMonth') })}
              accent
            >
              UGX {Math.round(revenueThisMonth).toLocaleString()}
            </StatCard>
            <StatCard label={t('dashboard.lblVsLast')}>
              <span className="text-lg">UGX {Math.round(revenuePrevMonth).toLocaleString()}</span>
              <p className="mt-1 text-sm font-normal text-slate-600">{momText}</p>
            </StatCard>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link to="/marketplace" className="font-semibold text-emerald-700 hover:underline">
              {t('dashboard.mkt')}
            </Link>
            <span className="text-slate-300">·</span>
            <Link to="/purchases" className="font-semibold text-emerald-700 hover:underline">
              {t('dashboard.purHist')}
            </Link>
            <span className="text-slate-300">·</span>
            <Link to="/orders" className="font-semibold text-emerald-700 hover:underline">
              {t('nav.orders')}
            </Link>
          </div>
        </section>
      ) : null}

      {role === 'farmer' && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <Wheat className="size-4" aria-hidden />
            {t('dashboard.farmPerformance')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Wheat} label={t('dashboard.lblMyHarvestT')}>
              {harvestTotal.toFixed(1)} t
            </StatCard>
            <StatCard icon={TrendingUp} label={t('dashboard.lblCurrentStockT')}>
              {animStock.toFixed(1)} t
            </StatCard>
            <StatCard icon={Wallet2} label={t('dashboard.lblMoneyIn')} accent>
              UGX {Math.round(animRev).toLocaleString()}
            </StatCard>
            <StatCard icon={Clock} label={t('dashboard.lblOutPay')}>
              UGX {Math.round(outstandingTotal).toLocaleString()}
            </StatCard>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('dashboard.lblExpenses')}>
              UGX {Math.round(animExp).toLocaleString()}
            </StatCard>
            <StatCard label={t('dashboard.lblProfit')} accent>
              UGX {Math.round(animProfit).toLocaleString()}
            </StatCard>
            <StatCard
              icon={TrendingUp}
              label={t('dashboard.lblCashIn', { m: monthLabelThis?.slice(5) || t('dashboard.mo') })}
              accent
            >
              UGX {Math.round(revenueThisMonth).toLocaleString()}
            </StatCard>
            <StatCard label={t('dashboard.lblVsLast')}>
              <span className="text-lg">UGX {Math.round(revenuePrevMonth).toLocaleString()}</span>
              <p className="mt-1 text-sm font-normal text-slate-600">{momText}</p>
            </StatCard>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link to="/farm" className="font-semibold text-emerald-700 hover:underline">
              {t('nav.myFarm')}
            </Link>
            <span className="text-slate-300">·</span>
            <Link to="/debts" className="font-semibold text-emerald-700 hover:underline">
              {t('nav.credit')}
            </Link>
            <span className="text-slate-300">·</span>
            <Link to="/supply" className="font-semibold text-emerald-700 hover:underline">
              {t('nav.supplyChain')}
            </Link>
          </div>
        </section>
      )}

      {(mostProfitableCrop || topBuyer || trendPreview.length > 0) &&
      role !== 'trader' &&
      role !== 'admin' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {mostProfitableCrop ? (
            <StatCard label={t('dashboard.mostProfitable')}>
              <span className="text-lg">{mostProfitableCrop[0]}</span>
              <div className="mt-1 text-sm font-normal text-slate-600">
                UGX {Math.round(mostProfitableCrop[1]).toLocaleString()}
              </div>
            </StatCard>
          ) : null}
          {topBuyer ? (
            <StatCard label={t('dashboard.topBuyer')}>
              <span className="text-lg">{topBuyer[0]}</span>
              <div className="mt-1 text-sm font-normal text-slate-600">
                UGX {Math.round(topBuyer[1]).toLocaleString()}
              </div>
            </StatCard>
          ) : null}
          {trendPreview.length > 0 ? (
            <StatCard label={t('dashboard.revenueTrendH')}>
              <ul className="mt-2 space-y-1 text-sm font-normal">
                {trendPreview.map((row) => (
                  <li key={row.month} className="flex justify-between gap-2 text-slate-700">
                    <span>{row.month}</span>
                    <span className="tabular-nums">UGX {Math.round(row.revenue).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </StatCard>
          ) : null}
        </div>
      ) : null}

      {seasonalReminders.length > 0 && role === 'farmer' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">{t('dashboard.seasonalH2')}</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {seasonalReminders.slice(0, 4).map((r) => (
              <li key={r.id} className="rounded-lg bg-slate-50 px-3 py-2">
                {r.message}
              </li>
            ))}
          </ul>
          <Link to="/seasonal" className="mt-3 inline-block text-sm font-semibold text-emerald-700 hover:underline">
            {t('dashboard.calLink')}
          </Link>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {role !== 'trader' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <h2 className="mb-4 text-base font-bold text-slate-900">{t('dashboard.monthlyCashIn')}</h2>
            <RevenueTrendChart trend={trend} />
          </div>
        ) : null}
        {role !== 'trader' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-900">{t('dashboard.cashInByProduce')}</h2>
            <ProduceCashInBarChart sales={visibleSales} />
          </div>
        ) : null}
        {role !== 'trader' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-base font-bold text-slate-900">{t('dashboard.stockDist')}</h2>
            <div className="max-w-md">
              <StockPieChart stockByProduce={stockByProduce} />
            </div>
          </div>
        ) : null}
        {role === 'trader' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-base font-bold text-slate-900">{t('dashboard.recentPurchases')}</h2>
            {recentPurchases.length === 0 ? (
              <p className="text-sm text-slate-600">{t('dashboard.purchasesEmpty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                      <th className="pb-2">{t('dashboard.thProduce')}</th>
                      <th className="pb-2">{t('dashboard.thAmount')}</th>
                      <th className="pb-2">{t('dashboard.thStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentPurchases.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2 font-medium">{s.produceName}</td>
                        <td className="py-2 tabular-nums">UGX {Number(s.totalPayment).toLocaleString()}</td>
                        <td className="py-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize">
                            {statusLabel(s)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {role !== 'trader' && role !== 'admin' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">{t('dashboard.recentSales')}</h2>
            <Link to="/sales" className="text-sm font-semibold text-emerald-700 hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-600">{t('dashboard.noSalesYet')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                    <th className="pb-2">{t('dashboard.thBuyer')}</th>
                    <th className="pb-2">{t('dashboard.thProduce')}</th>
                    <th className="pb-2">{t('dashboard.thAmount')}</th>
                    <th className="pb-2">{t('dashboard.thStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 font-medium">{s.buyerName}</td>
                      <td className="py-2">{s.produceName}</td>
                      <td className="py-2 tabular-nums">UGX {Number(s.totalPayment).toLocaleString()}</td>
                      <td className="py-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize">
                          {statusLabel(s)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {isAdmin ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 text-sm text-zinc-900">
          <strong>{t('dashboard.adminVisibility')}</strong>{' '}
          {t('dashboard.harvestsInView', { h: visibleHarvests.length, s: visibleSales.length })}
        </section>
      ) : null}

      {notifications.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">{t('dashboard.alertsSection')}</h2>
          <ul className="mt-3 space-y-2">
            {notifications.slice(0, 3).map((n) => (
              <li key={n.id} className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="text-left text-sm font-semibold text-slate-900 hover:text-emerald-700"
                  onClick={() => markNotificationRead(n.id)}
                >
                  {n.title}
                </button>
                <span className="text-xs text-slate-600">{n.detail}</span>
              </li>
            ))}
          </ul>
          <Link to="/notifications" className="mt-3 inline-block text-sm font-semibold text-emerald-700 hover:underline">
            {t('dashboard.allNotif')}
          </Link>
        </section>
      ) : null}
    </div>
  );
}
