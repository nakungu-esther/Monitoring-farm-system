import React, { useState, useMemo } from 'react';
import { CalendarRange, Filter, BanknoteArrowUp, WalletCards, TrendingUp, Sprout, ReceiptText } from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import { PRODUCE_OPTIONS, canonicalProduceName } from '../constants/produce';
import { isNonEmptyTrimmed, isFiniteNumberGte, isValidIsoDateString } from '../utils/authValidation';

export default function Report() {
  const {
    visibleHarvests,
    visibleSales,
    visibleExpenses,
    addExpense,
    dashboardStats,
  } = useAgriTrack();
  const { toast } = useToast();

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterProduce, setFilterProduce] = useState('');

  const [expForm, setExpForm] = useState({
    label: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const { totalExpenses, profit } = dashboardStats;

  const filteredSales = useMemo(() => {
    return visibleSales.filter((s) => {
      if (
        filterProduce &&
        canonicalProduceName(s.produceName) !== canonicalProduceName(filterProduce)
      ) {
        return false;
      }
      const d = s.date || '';
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      return true;
    });
  }, [visibleSales, filterFrom, filterTo, filterProduce]);

  const onExpSubmit = async (e) => {
    e.preventDefault();
    if (!isNonEmptyTrimmed(expForm.label)) {
      toast('Enter an expense description.', 'warn');
      return;
    }
    if (!isFiniteNumberGte(expForm.amount, 0)) {
      toast('Enter a valid amount in UGX.', 'warn');
      return;
    }
    if (!isValidIsoDateString(expForm.date)) {
      toast('Choose a valid date.', 'warn');
      return;
    }
    const r = await addExpense(expForm);
    if (r?.ok === false) {
      toast(r.error || 'Could not save expense', 'error');
      return;
    }
    toast('Expense logged');
    setExpForm((f) => ({ ...f, label: '', amount: '' }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="size-4 text-emerald-700" aria-hidden />
          <h2 className="text-base font-bold text-slate-900">Report filters</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CalendarRange className="size-3.5" aria-hidden />
              From
            </span>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <CalendarRange className="size-3.5" aria-hidden />
              To
            </span>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
            />
          </label>
          <label className="block sm:col-span-2 xl:col-span-1">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Produce
            </span>
            <select
              value={filterProduce}
              onChange={(e) => setFilterProduce(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
            >
              <option value="">All</option>
              {PRODUCE_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <div className="hidden xl:block" />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <BanknoteArrowUp className="size-4 text-emerald-700" aria-hidden />
            Revenue (scope)
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            UGX {filteredSales.reduce((a, s) => a + Math.min(s.amountPaid ?? 0, s.totalPayment), 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <WalletCards className="size-4 text-amber-700" aria-hidden />
            Total expenses
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            UGX {totalExpenses.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-900/70">
            <TrendingUp className="size-4 text-emerald-700" aria-hidden />
            Profit (overall)
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-950">
            UGX {profit.toLocaleString()}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">Quick expense</h2>
        <form onSubmit={onExpSubmit} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" noValidate>
          <input
            placeholder="Description"
            value={expForm.label}
            onChange={(e) => setExpForm((f) => ({ ...f, label: e.target.value }))}
            className="min-h-11 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15 xl:col-span-2"
          />
          <input
            type="number"
            placeholder="UGX"
            value={expForm.amount}
            onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))}
            className="min-h-11 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
          />
          <input
            type="date"
            value={expForm.date}
            onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))}
            className="min-h-11 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
          />
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:col-span-2 xl:col-span-4">
            <ReceiptText className="mr-2 size-4" aria-hidden />
            Add expense line
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Filtered sales</h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{filteredSales.length} rows</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Produce</th>
                <th className="px-4 py-3">UGX</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">No sales match filters.</td></tr>
              ) : (
                filteredSales
                  .slice()
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-slate-600">{s.date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{s.buyerName}</td>
                      <td className="px-4 py-3 text-slate-700">{s.produceName}</td>
                      <td className="px-4 py-3 tabular-nums">UGX {Number(s.totalPayment).toLocaleString()}</td>
                      <td className="px-4 py-3"><span className={`badge-status st-${s.paymentStatus}`}>{s.paymentStatus}</span></td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg"><Sprout className="size-4 text-emerald-700" aria-hidden /> Harvests</h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{visibleHarvests.length} total</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Produce</th><th className="px-4 py-3">Tonnage</th><th className="px-4 py-3">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleHarvests.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">No harvests.</td></tr>
              ) : (
                visibleHarvests
                  .filter(
                    (h) =>
                      !filterProduce ||
                      canonicalProduceName(h.produceName) ===
                        canonicalProduceName(filterProduce),
                  )
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((h) => (
                    <tr key={h.id}>
                      <td className="px-4 py-3 text-slate-800">{h.produceName}</td>
                      <td className="px-4 py-3 tabular-nums">{Number(h.tonnage).toFixed(2)} t</td>
                      <td className="px-4 py-3 text-slate-600">{h.date}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-3 text-base font-bold text-slate-900 sm:text-lg">Expense lines</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Label</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleExpenses.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">None logged.</td></tr>
              ) : (
                visibleExpenses
                  .slice()
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((ex) => (
                    <tr key={ex.id}>
                      <td className="px-4 py-3 text-slate-800">{ex.label}</td>
                      <td className="px-4 py-3 tabular-nums">UGX {ex.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600">{ex.date}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
