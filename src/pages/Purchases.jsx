import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, PackageCheck } from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import EmptyState from '../components/EmptyState';
import ReceiptActions from '../components/ReceiptActions';

export default function Purchases() {
  const { t } = useTranslation();
  const { purchasesAsBuyer, currentUser, state } = useAgriTrack();

  const statusLabel = (s) => {
    if (s.paymentStatus === 'paid') return t('saleStatus.paid');
    if (s.paymentStatus === 'credit') return t('saleStatus.credit');
    return t('saleStatus.partial');
  };

  const orderStatus = (s) => (s.paymentStatus === 'paid' ? t('purchasesPage.orderDone') : t('purchasesPage.orderPending'));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              <ShoppingCart className="size-5 text-emerald-700" aria-hidden />
              {t('nav.purchases')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t('purchasesPage.lead', { name: currentUser?.profile?.name || '—' })}
            </p>
          </div>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
            <PackageCheck className="size-4" aria-hidden />
            {purchasesAsBuyer.length} records
          </span>
        </div>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">{t('purchasesPage.thProduce')}</th>
              <th className="px-4 py-3">{t('purchasesPage.thTonnage')}</th>
              <th className="px-4 py-3">{t('purchasesPage.thAmount')}</th>
              <th className="px-4 py-3">{t('purchasesPage.thPayment')}</th>
              <th className="px-4 py-3">{t('purchasesPage.thOrder')}</th>
              <th className="px-4 py-3">{t('purchasesPage.thDate')}</th>
              <th className="px-4 py-3">{t('receipt.column')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchasesAsBuyer.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12">
                  <EmptyState
                    icon="🧾"
                    title={t('purchasesPage.emptyTitle')}
                    hint={t('purchasesPage.emptyHint')}
                  />
                </td>
              </tr>
            ) : (
              purchasesAsBuyer.map((s) => {
                const seller = state.users.find((u) => u.id === s.userId);
                const sellerName = seller?.profile?.name || '—';
                const buyerName = currentUser?.profile?.name || s.buyerName || '—';
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">{s.produceName}</td>
                    <td className="px-4 py-3 tabular-nums">{Number(s.tonnage).toFixed(2)} t</td>
                    <td className="px-4 py-3 tabular-nums">UGX {Number(s.totalPayment).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          s.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.paymentStatus === 'credit'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {statusLabel(s)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          s.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                            : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
                        }`}
                      >
                        {orderStatus(s)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.date}</td>
                    <td className="px-4 py-3">
                      <ReceiptActions
                        sale={s}
                        perspective="buyer"
                        sellerName={sellerName}
                        buyerName={buyerName}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
