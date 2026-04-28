import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wheat, ShoppingCart, Store, ArrowRight } from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import EmptyState from '../components/EmptyState';

function matches(value, term) {
  if (!term) return false;
  return String(value ?? '')
    .toLowerCase()
    .includes(term);
}

export default function GlobalSearch() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const qRaw = (searchParams.get('q') || '').trim();
  const term = qRaw.toLowerCase();

  const { currentUser, visibleHarvests, visibleSales, marketplaceHarvests, allUsers } = useAgriTrack();
  const role = currentUser?.role || 'farmer';

  const sellerLabel = (userId) => {
    const u = allUsers?.find((x) => x.id === userId);
    return u?.profile?.name || t('profilePage.farmerFallback');
  };

  const harvestHits = useMemo(() => {
    if (!term) return [];
    return visibleHarvests
      .filter(
        (h) =>
          matches(h.produceName, term) ||
          matches(h.variety, term) ||
          matches(h.farmLocation, term) ||
          matches(h.date, term),
      )
      .slice(0, 30);
  }, [visibleHarvests, term]);

  const saleHits = useMemo(() => {
    if (!term) return [];
    return visibleSales
      .filter(
        (s) =>
          matches(s.produceName, term) ||
          matches(s.buyerName, term) ||
          matches(s.date, term),
      )
      .slice(0, 30);
  }, [visibleSales, term]);

  const marketplaceHits = useMemo(() => {
    if (!term || role === 'farmer') return [];
    return marketplaceHarvests
      .filter((h) => {
        const seller = allUsers?.find((x) => x.id === h.userId)?.profile?.name || t('profilePage.farmerFallback');
        return (
          matches(h.produceName, term) ||
          matches(h.farmLocation, term) ||
          matches(seller, term)
        );
      })
      .slice(0, 30);
  }, [marketplaceHarvests, term, role, allUsers, t]);

  const total = harvestHits.length + saleHits.length + marketplaceHits.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
          {t('page.search.title')}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">{t('searchPage.subtitle')}</p>
      </div>

      {!qRaw ? (
        <EmptyState title={t('searchPage.emptyTitle')} hint={t('searchPage.emptyHint')} />
      ) : total === 0 ? (
        <EmptyState title={t('searchPage.noMatches')} hint={t('searchPage.noMatchesHint', { q: qRaw })} />
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">{t('searchPage.resultsSummary', { count: total, q: qRaw })}</span>
          </p>

          {harvestHits.length > 0 ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-500">
                <Wheat className="size-4 text-emerald-600" aria-hidden />
                {t('searchPage.sectionHarvests')}
              </h2>
              <ul className="divide-y divide-zinc-100">
                {harvestHits.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <span className="font-semibold text-zinc-900">{h.produceName}</span>
                      {h.farmLocation ? (
                        <span className="text-zinc-600"> · {h.farmLocation}</span>
                      ) : null}
                      <div className="text-xs text-zinc-500">
                        {h.date ? `${h.date} · ` : ''}
                        {Number(h.tonnage) || 0} t
                      </div>
                    </div>
                    <Link
                      to="/farm"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline"
                    >
                      {t('searchPage.openFarm')}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {saleHits.length > 0 ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-500">
                <ShoppingCart className="size-4 text-emerald-600" aria-hidden />
                {t('searchPage.sectionSales')}
              </h2>
              <ul className="divide-y divide-zinc-100">
                {saleHits.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <span className="font-semibold text-zinc-900">{s.produceName}</span>
                      <span className="text-zinc-600"> · {s.buyerName || '—'}</span>
                      <div className="text-xs text-zinc-500">
                        {s.date ? `${s.date} · ` : ''}
                        UGX {Number(s.totalPayment).toLocaleString()}
                      </div>
                    </div>
                    <Link
                      to={role === 'trader' ? '/purchases' : '/sales'}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline"
                    >
                      {role === 'trader' ? t('searchPage.goPurchases') : t('searchPage.goSales')}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {marketplaceHits.length > 0 ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-500">
                <Store className="size-4 text-emerald-600" aria-hidden />
                {t('searchPage.sectionMarket')}
              </h2>
              <ul className="divide-y divide-zinc-100">
                {marketplaceHits.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <span className="font-semibold text-zinc-900">{h.produceName}</span>
                      <span className="text-zinc-600"> · {sellerLabel(h.userId)}</span>
                      <div className="text-xs text-zinc-500">
                        {h.farmLocation || '—'} · {Number(h.tonnage) || 0} t
                      </div>
                    </div>
                    <Link
                      to={`/marketplace?q=${encodeURIComponent(qRaw)}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline"
                    >
                      {t('nav.marketplace')}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
