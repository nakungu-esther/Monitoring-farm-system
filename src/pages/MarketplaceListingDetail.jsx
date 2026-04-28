import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, BadgeCheck } from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import {
  effectivePricePerKgUgx,
  availableKgForHarvest,
  qualityLabel,
} from '../utils/harvestListing';

export default function MarketplaceListingDetail() {
  const { harvestId } = useParams();
  const { marketplaceHarvests, allUsers, currentUser } = useAgriTrack();

  const id = harvestId ? decodeURIComponent(harvestId) : '';
  const h = marketplaceHarvests.find((x) => x.id === id);

  if (!id) {
    return <Navigate to="/marketplace" replace />;
  }
  if (!h) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-slate-600">This listing was not found or is no longer available.</p>
        <Link to="/marketplace" className="font-semibold text-emerald-700 hover:underline">
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  const farmer = allUsers?.find((u) => u.id === h.userId);
  const name = farmer?.profile?.name || 'Farmer';
  const ppg = effectivePricePerKgUgx(h);
  const kg = availableKgForHarvest(h);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to listings
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {h.imageDataUrl ? (
          <div className="aspect-[2/1] w-full bg-slate-100">
            <img src={h.imageDataUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="space-y-4 p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Produce listing</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900 sm:text-3xl">
              {h.produceName}
            </h1>
            {h.variety ? (
              <p className="mt-1 text-lg text-slate-700">
                <span className="font-semibold text-slate-800">Type / variety:</span> {h.variety}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
              <BadgeCheck className="size-3.5 text-emerald-600" aria-hidden />
              Quality: {qualityLabel(h.qualityGrade)}
            </span>
            {ppg > 0 ? (
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200">
                UGX {ppg.toLocaleString(undefined, { maximumFractionDigits: 0 })}/kg
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                Ask farmer for price
              </span>
            )}
          </div>

          <dl className="grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <User className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Farmer</dt>
                <dd className="font-medium text-slate-900">{name}</dd>
              </div>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Available (approx.)</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {Number(h.tonnage).toFixed(2)} t
                {kg > 0 ? <> · {Math.round(kg).toLocaleString()} kg</> : null}
              </dd>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Location</dt>
                <dd className="text-slate-800">{h.farmLocation || '—'}</dd>
              </div>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Harvest date</dt>
              <dd className="text-slate-800">{h.date || '—'}</dd>
            </div>
          </dl>

          <div className="rounded-xl bg-slate-50 p-4">
            <h2 className="text-sm font-bold text-slate-900">Why this price?</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {h.pricingNote?.trim() ? h.pricingNote : 'The farmer has not added a pricing note yet.'}
            </p>
          </div>

          {currentUser?.role === 'trader' ? (
            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-6">
              <Link
                to={`/marketplace/checkout/${encodeURIComponent(h.id)}`}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                Start purchase
              </Link>
              <Link
                to="/marketplace"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sign in as a trader to purchase from the marketplace.</p>
          )}
        </div>
      </div>
    </div>
  );
}
