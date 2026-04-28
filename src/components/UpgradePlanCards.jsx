import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Sparkles, Gem } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import {
  fetchBillingPlans,
  createStripeCheckoutSession,
  verifyStripeCheckoutSession,
} from '../api/agritrackApi';
import { apiErrorMessage } from '../api/auth';
import { BILLING_DISPLAY_UGX, VITE_STRIPE_UI } from '../config';

function parseApiProcurementId(harvestId) {
  const s = String(harvestId || '');
  if (!s.startsWith('api-')) return null;
  const n = Number(s.slice(4));
  return Number.isFinite(n) ? n : null;
}

/**
 * Upgrade plan cards: Stripe Checkout in the same tab (stays your AgriTrack session; return
 * URL is /upgrade?stripe=…). On return we verify the session server-side.
 * User-facing strings: `t('upgradeCards.*')` in `src/locales/.../translation.json` (editing JSX alone may not change labels).
 */
export default function UpgradePlanCards() {
  const { t } = useTranslation();
  const { currentUser, apiEnabled, visibleHarvests, refreshFromApi, applyServerUser } = useAgriTrack();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(false);
  const [procKey, setProcKey] = useState('');
  const [busyPlan, setBusyPlan] = useState(/** @type {null | 'featured' | 'premium'} */ (null));

  const role = currentUser?.role;
  const isFarmer = role === 'farmer';
  const isTrader = role === 'trader';

  const stripeOn = useMemo(
    () => apiEnabled && (Boolean(plans?.stripeEnabled) || VITE_STRIPE_UI),
    [apiEnabled, plans?.stripeEnabled],
  );

  useEffect(() => {
    if (!apiEnabled) {
      setPlansLoading(false);
      setPlans(null);
      setPlansError(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setPlansLoading(true);
      setPlansError(false);
      try {
        const p = await fetchBillingPlans();
        if (!cancelled) setPlans(p);
      } catch {
        if (!cancelled) {
          setPlans(null);
          setPlansError(true);
        }
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiEnabled]);

  const apiListings = useMemo(
    () => visibleHarvests.filter((h) => String(h.id).startsWith('api-')),
    [visibleHarvests],
  );

  useEffect(() => {
    if (!procKey && apiListings.length > 0) {
      setProcKey(apiListings[0].id);
    }
  }, [apiListings, procKey]);

  /** Stripe return: /upgrade?stripe=success&session_id=… */
  useEffect(() => {
    if (!apiEnabled) return;
    const st = searchParams.get('stripe');
    const sid = searchParams.get('session_id');
    if (st === 'cancel') {
      toast(t('upgradeCards.stripeCancelled'), 'info');
      setSearchParams({}, { replace: true });
      return;
    }
    if (st !== 'success' || !sid) return;
    const doneKey = `agritrack_stripe_ok_${sid}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(doneKey)) {
      setSearchParams({}, { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await verifyStripeCheckoutSession(sid);
        if (cancelled) return;
        if (res.user) applyServerUser(res.user);
        await refreshFromApi();
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(doneKey, '1');
        toast(
          res.alreadyCompleted ? t('upgradeCards.stripeAlreadyDone') : t('upgradeCards.stripeSuccess'),
          'success',
        );
      } catch (err) {
        if (!cancelled) toast(apiErrorMessage(err), 'error');
      } finally {
        if (!cancelled) {
          setSearchParams({}, { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiEnabled, searchParams, setSearchParams, applyServerUser, refreshFromApi, toast, t]);

  const premiumUntilLabel = useMemo(() => {
    const raw = currentUser?.premiumUntil;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
  }, [currentUser?.premiumUntil]);

  if (!role || role === 'admin') {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('upgradeCards.adminBlurb')}</p>;
  }

  const startStripe = async (planId) => {
    if (planId === 'featured_listing') {
      const pid = parseApiProcurementId(procKey);
      if (pid == null) {
        toast(t('upgradeCards.toastPickListing'), 'warn');
        return;
      }
    }
    setBusyPlan(planId === 'featured_listing' ? 'featured' : 'premium');
    try {
      const body = {
        plan: planId,
        successUrlBase: typeof window !== 'undefined' ? window.location.origin : undefined,
      };
      if (planId === 'featured_listing') {
        body.procurementId = parseApiProcurementId(procKey);
      }
      const { url } = await createStripeCheckoutSession(body);
      if (url) {
        window.location.assign(url);
        return;
      }
      toast(t('upgradeCards.stripeNoUrl'), 'error');
    } catch (err) {
      if (err?.response?.status === 401) return;
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusyPlan(null);
    }
  };

  const fmtUgx = (n) =>
    typeof n === 'number' && Number.isFinite(n) ? `UGX ${Math.round(n).toLocaleString()}` : '—';

  const featuredPrice = plans?.featuredListing?.priceUgx ?? BILLING_DISPLAY_UGX.featured;
  const premiumPrice = plans?.premiumMonthly?.priceUgx ?? BILLING_DISPLAY_UGX.premium;
  const showFeaturedPay = isFarmer;
  const showPremiumPay = isTrader;
  const showCardGrid = true;

  const baseCard =
    'upgrade-card flex h-full min-h-0 flex-col rounded-3xl border p-6 sm:p-8 transition-shadow duration-200';
  const hitFeatured = `${baseCard} border-emerald-200/90 bg-gradient-to-b from-emerald-50/90 to-white shadow-[0_10px_40px_-12px_rgba(16,185,129,0.28)] ring-2 ring-emerald-300/50 dark:border-emerald-800/50 dark:from-emerald-950/35 dark:to-zinc-950/50 dark:ring-emerald-600/40`;
  const dimFeatured = `${baseCard} border-emerald-100/80 bg-gradient-to-b from-emerald-50/50 to-white/80 shadow-sm dark:border-emerald-900/30 dark:from-emerald-950/20 dark:to-zinc-950/30`;
  const hitPremium = `${baseCard} border-sky-200/90 bg-gradient-to-b from-sky-50/90 to-white shadow-[0_10px_40px_-12px_rgba(14,165,233,0.25)] ring-2 ring-sky-300/50 dark:border-sky-800/50 dark:from-sky-950/35 dark:to-zinc-950/50 dark:ring-sky-600/40`;
  const dimPremium = `${baseCard} border-sky-100/80 bg-gradient-to-b from-sky-50/50 to-white/80 shadow-sm dark:border-sky-900/30 dark:from-sky-950/20 dark:to-zinc-950/30`;

  return (
    <div className="upgrade-container mx-auto w-full max-w-5xl">
      {apiEnabled && plansError ? (
        <p className="mb-8 rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {t('upgradeCards.plansError')}
        </p>
      ) : null}

      {apiEnabled && plansLoading ? (
        <p className="mb-8 text-sm text-zinc-500">{t('upgradeCards.loadingPlans')}</p>
      ) : null}

      {showCardGrid ? (
        <div
          className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch lg:gap-10"
          role="list"
        >
          <article
            className={isFarmer ? hitFeatured : dimFeatured}
            role="listitem"
            aria-label={t('upgradeCards.featured.title')}
          >
            <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-300/90">
              <Sparkles className="size-5 shrink-0" aria-hidden />
              <span className="text-[11px] font-bold uppercase tracking-widest">
                {t('upgradeCards.visibility')}
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t('upgradeCards.featured.title')}
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
              {t('upgradeCards.featured.desc')}
            </p>
            <h3 className="mt-8 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
              {fmtUgx(featuredPrice)}
              <span className="text-base font-semibold text-zinc-500 dark:text-zinc-400">
                {t('upgradeCards.priceSuffixListing')}
              </span>
            </h3>
            {isFarmer && !plansError && apiListings.length === 0 ? (
              <p className="mt-3 text-sm text-amber-800 dark:text-amber-200/90">
                <Link className="font-semibold underline" to="/farm">
                  {t('upgradeCards.needListing')}
                </Link>
              </p>
            ) : null}
            {isTrader ? (
              <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                {t('upgradeCards.forFarmersOnly')}
              </p>
            ) : null}

            {showFeaturedPay && apiEnabled && !plansLoading && !plansError ? (
              <div className="mt-6 space-y-4 border-t border-emerald-100/80 pt-6 dark:border-emerald-800/40">
                {apiListings.length > 0 ? (
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    {t('upgradeCards.listingLabel')}
                    <select
                      className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm dark:border-zinc-600 dark:bg-zinc-900"
                      value={procKey}
                      onChange={(e) => setProcKey(e.target.value)}
                    >
                      <option value="">{t('upgradeCards.listingSelect')}</option>
                      {apiListings.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.produceName} · {Number(h.tonnage).toFixed(2)} t · {h.date}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {stripeOn ? (
                  <div className="space-y-2 rounded-2xl border border-emerald-200/80 bg-white/80 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/20">
                    <p className="m-0 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      {t('upgradeCards.stripeFirstTitle')}
                    </p>
                    <p className="m-0 flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                      <CreditCard className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      <span>{t('upgradeCards.stripeCardBlurb')}</span>
                    </p>
                    <button
                      type="button"
                      disabled={busyPlan !== null}
                      onClick={() => startStripe('featured_listing')}
                      className="btn-upgrade w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyPlan === 'featured' ? t('upgradeCards.working') : t('upgradeCards.payWithCard')}
                    </button>
                  </div>
                ) : (
                  <p className="m-0 text-sm text-amber-800 dark:text-amber-200/90">
                    {t('upgradeCards.cardNotConfigured')}
                  </p>
                )}
              </div>
            ) : null}
          </article>

          <article
            className={isTrader ? hitPremium : dimPremium}
            role="listitem"
            aria-label={t('upgradeCards.premium.title')}
          >
            <div className="mb-2 flex items-center gap-2 text-sky-800 dark:text-sky-200/90">
              <Gem className="size-5 shrink-0" aria-hidden />
              <span className="text-[11px] font-bold uppercase tracking-widest">{t('upgradeCards.speed')}</span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t('upgradeCards.premium.title')}
            </h2>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
              {t('upgradeCards.premium.desc')}
            </p>
            <h3 className="mt-8 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
              {fmtUgx(premiumPrice)}
              <span className="text-base font-semibold text-zinc-500 dark:text-zinc-400">
                {t('upgradeCards.priceSuffixMonth')}
              </span>
            </h3>
            {isTrader && currentUser?.isPremium && premiumUntilLabel ? (
              <p className="mt-2 text-sm font-medium text-sky-900 dark:text-sky-200/90">
                {t('upgradeCards.activeUntil', { date: premiumUntilLabel })}
              </p>
            ) : null}
            {isTrader && stripeOn ? (
              <p className="mt-2 text-xs text-sky-800/90 dark:text-sky-200/80">
                {t('upgradeCards.premiumSubscriptionStripe')}
              </p>
            ) : null}
            {isFarmer ? (
              <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                {t('upgradeCards.forTradersOnly')}
              </p>
            ) : null}

            {showPremiumPay && apiEnabled && !plansLoading && !plansError ? (
              <div className="mt-6 space-y-4 border-t border-sky-100/80 pt-6 dark:border-sky-800/40">
                {stripeOn ? (
                  <div className="space-y-2 rounded-2xl border border-sky-200/80 bg-white/80 p-4 dark:border-sky-800/50 dark:bg-sky-950/20">
                    <p className="m-0 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                      {t('upgradeCards.stripeFirstTitle')}
                    </p>
                    <p className="m-0 flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                      <CreditCard className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      <span>{t('upgradeCards.stripeCardBlurb')}</span>
                    </p>
                    <button
                      type="button"
                      disabled={busyPlan !== null}
                      onClick={() => startStripe('premium_monthly')}
                      className="btn-upgrade w-full rounded-2xl bg-sky-600 py-3.5 text-sm font-bold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 disabled:opacity-50"
                    >
                      {busyPlan === 'premium' ? t('upgradeCards.working') : t('upgradeCards.payWithCard')}
                    </button>
                  </div>
                ) : (
                  <p className="m-0 text-sm text-amber-800 dark:text-amber-200/90">
                    {t('upgradeCards.cardNotConfigured')}
                  </p>
                )}
              </div>
            ) : null}
          </article>
        </div>
      ) : null}
    </div>
  );
}
