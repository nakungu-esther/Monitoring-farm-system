import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { Store, Star } from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import EmptyState from '../components/EmptyState';
import {
  effectivePricePerKgUgx,
  qualityLabel,
  QUALITY_OPTIONS,
} from '../utils/harvestListing';

export default function Marketplace() {
  const { marketplaceHarvests, currentUser, allUsers } = useAgriTrack();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [filterMinP, setFilterMinP] = useState('');
  const [filterMaxP, setFilterMaxP] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterQuality, setFilterQuality] = useState('');

  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
  }, [searchParams]);

  const sellerName = (userId) => {
    const u = allUsers?.find((x) => x.id === userId);
    return u?.profile?.name || 'Farmer';
  };

  const isFeaturedActive = (h) => {
    if (!h?.isFeatured) return false;
    if (!h.featuredUntil) return true;
    const t = new Date(h.featuredUntil).getTime();
    return !Number.isNaN(t) && t > Date.now();
  };

  const rows = useMemo(() => {
    /* Order from context: featured first, then by date */
    const list = [...marketplaceHarvests];
    const tq = q.trim().toLowerCase();
    const tt = filterType.trim().toLowerCase();
    const minP = filterMinP.trim() ? Number(filterMinP) : null;
    const maxP = filterMaxP.trim() ? Number(filterMaxP) : null;

    return list.filter((h) => {
      if (tq) {
        const sellerLower = sellerName(h.userId).toLowerCase();
        const matchText =
          (h.produceName || '').toLowerCase().includes(tq) ||
          (h.farmLocation || '').toLowerCase().includes(tq) ||
          (h.variety || '').toLowerCase().includes(tq) ||
          sellerLower.includes(tq);
        if (!matchText) return false;
      }
      if (tt) {
        const blob = `${h.produceName || ''} ${h.variety || ''}`.toLowerCase();
        if (!blob.includes(tt)) return false;
      }
      if (filterQuality) {
        if ((h.qualityGrade || '').toLowerCase() !== filterQuality.toLowerCase()) return false;
      }
      const p = effectivePricePerKgUgx(h);
      if (minP != null && Number.isFinite(minP) && p > 0 && p < minP) return false;
      if (maxP != null && Number.isFinite(maxP) && p > 0 && p > maxP) return false;
      if (minP != null && Number.isFinite(minP) && p <= 0) return false;
      if (maxP != null && Number.isFinite(maxP) && p <= 0) return false;
      return true;
    });
  }, [marketplaceHarvests, allUsers, q, filterType, filterQuality, filterMinP, filterMaxP]);

  const buyerLabel = currentUser?.profile?.name?.trim() || '—';

  const traderPriority = useMemo(() => {
    if (currentUser?.role !== 'trader' || !currentUser?.isPremium) return false;
    const raw = currentUser.premiumUntil;
    if (!raw) return true;
    const t = new Date(raw).getTime();
    return !Number.isNaN(t) && t > Date.now();
  }, [currentUser]);

  const buyParam = searchParams.get('buy');
  if (buyParam) {
    return <Navigate to={`/marketplace/checkout/${encodeURIComponent(buyParam)}`} replace />;
  }

  return (
    <div className="max-w-6xl pb-6">
      {currentUser?.role === 'trader' ? (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            traderPriority
              ? 'border-sky-200 bg-sky-50/90 text-sky-950'
              : 'border-amber-200 bg-amber-50/90 text-amber-950'
          }`}
        >
          {traderPriority ? (
            <>
              <strong className="font-bold">Premium Trader:</strong> new listings are sorted first after featured
              items — you see fresh stock before non‑premium buyers.
            </>
          ) : (
            <>
              <strong>Want new listings first + credit at checkout?</strong>{' '}
              <Link className="font-bold text-emerald-800 underline" to="/upgrade">
                Upgrade to Premium Trader
              </Link>
              .
            </>
          )}
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-[160px] flex-1 text-xs font-semibold text-slate-600">
          Search
          <input
            type="search"
            placeholder="Produce, type, or location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="min-w-[120px] text-xs font-semibold text-slate-600">
          Type / variety
          <input
            type="text"
            placeholder="e.g. NARO, maize"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="w-full min-w-[8rem] text-xs font-semibold text-slate-600 sm:w-36">
          Quality
          <select
            value={filterQuality}
            onChange={(e) => setFilterQuality(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
          >
            {QUALITY_OPTIONS.map((o) => (
              <option key={o.value || 'any'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="w-full min-w-[5rem] text-xs font-semibold text-slate-600 sm:w-24">
          Min UGX/kg
          <input
            type="number"
            placeholder="0"
            value={filterMinP}
            onChange={(e) => setFilterMinP(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
          />
        </label>
        <label className="w-full min-w-[5rem] text-xs font-semibold text-slate-600 sm:w-24">
          Max UGX/kg
          <input
            type="number"
            placeholder="∞"
            value={filterMaxP}
            onChange={(e) => setFilterMaxP(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => {
            setFilterMinP('');
            setFilterMaxP('');
            setFilterType('');
            setFilterQuality('');
            setQ('');
          }}
        >
          Clear filters
        </button>
      </div>

      <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Produce</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Quality</th>
              <th className="px-4 py-3">UGX/kg</th>
              <th className="px-4 py-3">Seller</th>
              <th className="px-4 py-3">Qty (t)</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12">
                  <EmptyState icon="🛒" title="No listings yet" hint="Farmers add produce under My Farm." />
                </td>
              </tr>
            ) : (
              rows.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {h.produceName}
                      {isFeaturedActive(h) ? (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900"
                          title="Featured listing"
                        >
                          <Star className="size-3 fill-amber-500 text-amber-600" aria-hidden />
                          Featured
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="max-w-[140px] px-4 py-3 text-slate-700">{h.variety || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{qualityLabel(h.qualityGrade)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-800">
                    {effectivePricePerKgUgx(h) > 0
                      ? effectivePricePerKgUgx(h).toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{sellerName(h.userId)}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{Number(h.tonnage).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">{h.date}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {h.farmLocation ? (
                      <>
                        <span className="font-semibold text-emerald-900">Farm: </span>
                        {h.farmLocation}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {currentUser?.role === 'trader' ? (
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Link
                          to={`/marketplace/listing/${encodeURIComponent(h.id)}`}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>
                        <Link
                          to={`/marketplace/checkout/${encodeURIComponent(h.id)}`}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Buy
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {currentUser?.role === 'trader' ? (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Store className="size-4 shrink-0" aria-hidden />
          Your buyer name on sales:&nbsp;
          <strong>{buyerLabel}</strong>
          {' '}
          (
          <Link to="/profile" className="font-semibold text-emerald-700 hover:underline">
            Profile
          </Link>
          ) ·
          <Link to="/purchases" className="font-semibold text-emerald-700 hover:underline">
            Purchases
          </Link>
          ·
          <Link to="/orders" className="font-semibold text-emerald-700 hover:underline">
            Orders
          </Link>
        </p>
      ) : null}
    </div>
  );
}
