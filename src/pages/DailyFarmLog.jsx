import React, { useState, useMemo, useCallback } from 'react';
import { ClipboardCheck, CalendarDays, FileText, AlertTriangle } from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import { isValidIsoDateString, isFiniteNumberGte } from '../utils/authValidation';

/** @param {unknown} d */
function dateKey(d) {
  if (d == null) return '';
  return String(d).slice(0, 10);
}

/** Build a daily report draft from harvests, sales, and expenses on the same calendar day. */
function buildDraftFromRecords(dateStr, harvests, sales, expenses) {
  const h = harvests.filter((x) => dateKey(x.date) === dateStr);
  const s = sales.filter((x) => dateKey(x.date) === dateStr);
  const e = expenses.filter((x) => dateKey(x.date) === dateStr);
  if (h.length === 0 && s.length === 0 && e.length === 0) return null;

  const lines = [];
  lines.push(`— Auto draft from AgriTrack for ${dateStr} —`);
  lines.push('(Add anything not in the app: labour, sprays, weather, blocks, etc.)');
  lines.push('');
  if (h.length) {
    lines.push(
      'Produce / harvest logged: ' +
        h
          .map((x) => `${String(x.produceName || 'Produce').trim()} ${Number(x.tonnage || 0).toFixed(2)} t`)
          .join('; '),
    );
  }
  if (s.length) {
    lines.push(
      'Sales recorded: ' +
        s
          .map((x) => {
            const amt = Math.round(Number(x.totalPayment) || 0);
            return `${String(x.produceName || 'Produce').trim()} ${Number(x.tonnage || 0).toFixed(2)} t → UGX ${amt.toLocaleString()}`;
          })
          .join('; '),
    );
  }
  if (e.length) {
    lines.push(
      'Expenses in ledger: ' +
        e
          .map((x) => `${String(x.label || 'Item').trim()} UGX ${Math.round(Number(x.amount) || 0).toLocaleString()}`)
          .join('; '),
    );
  }
  const expTotal = e.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  const labels = e.map((x) => String(x.label || '').trim()).filter(Boolean);
  return {
    activities: lines.join('\n'),
    expenseNote: labels.length ? labels.join('; ') : expTotal > 0 ? 'Same-day expenses (see activities)' : '',
    expenseAmount: expTotal > 0 ? String(Math.round(expTotal)) : '',
  };
}

export default function DailyFarmLog() {
  const {
    currentUser,
    addFarmDailyLog,
    visibleFarmDailyLogs,
    allUsers,
    apiEnabled,
    visibleHarvests,
    visibleSales,
    visibleExpenses,
  } = useAgriTrack();
  const { toast } = useToast();
  const [form, setForm] = useState({
    logDate: new Date().toISOString().slice(0, 10),
    activities: '',
    expenseNote: '',
    expenseAmount: '',
    issues: '',
    photoDataUrl: '',
  });

  const canSubmit = currentUser?.role === 'farmer';
  const farmerName = (uid) => allUsers?.find((u) => u.id === uid)?.profile?.name || uid?.slice(0, 8) || '—';

  const sortedLogs = useMemo(
    () =>
      [...visibleFarmDailyLogs].sort((a, b) =>
        (b.logDate || '').localeCompare(a.logDate || '') || (b.createdAt || '').localeCompare(a.createdAt || ''),
      ),
    [visibleFarmDailyLogs],
  );

  const onAutoFillFromRecords = useCallback(() => {
    const d = form.logDate;
    const draft = buildDraftFromRecords(d, visibleHarvests, visibleSales, visibleExpenses);
    if (!draft) {
      toast(
        'No harvests, sales, or expenses on that date in AgriTrack — record them first, or type the report manually.',
        'warn',
      );
      return;
    }
    setForm((f) => ({
      ...f,
      activities: draft.activities,
      expenseNote: draft.expenseNote,
      expenseAmount: draft.expenseAmount,
    }));
    toast('Draft filled from your records — review and add field details, then submit.');
  }, [form.logDate, visibleHarvests, visibleSales, visibleExpenses, toast]);

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast('Choose an image file', 'warn');
      return;
    }
    if (file.size > 450_000) {
      toast('Image too large — try under 450 KB', 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      setForm((f) => ({ ...f, photoDataUrl: url }));
      toast('Photo attached to this report');
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!form.activities.trim()) {
      toast('Describe today’s activities (planting, harvest, spray, etc.)', 'warn');
      return;
    }
    if (String(form.expenseAmount ?? '').trim() !== '' && !isFiniteNumberGte(form.expenseAmount, 0)) {
      toast('Enter a valid expense amount (UGX) or leave it empty.', 'warn');
      return;
    }
    const r = await addFarmDailyLog({
      logDate: form.logDate,
      activities: form.activities,
      expenseNote: form.expenseNote,
      expenseAmount: form.expenseAmount,
      issues: form.issues,
      photoDataUrl: form.photoDataUrl || null,
    });
    if (!r.ok) {
      toast(r.error || 'Could not save log', 'error');
      return;
    }
    toast(apiEnabled ? 'Daily log saved — visible to admin & traders.' : 'Daily log saved locally.');
    setForm((f) => ({
      ...f,
      activities: '',
      expenseNote: '',
      expenseAmount: '',
      issues: '',
      photoDataUrl: '',
    }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          <ClipboardCheck className="size-5 text-emerald-700" aria-hidden />
          Daily farm report
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {canSubmit
            ? 'Log date, work done, field costs, issues, and optional photo. Submit for trader/admin visibility.'
            : 'Read-only: farmers submit reports. Traders and admins can review entries below.'}
        </p>
      </section>

      {canSubmit ? (
        <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <CalendarDays className="size-3.5" aria-hidden />
                Report date
              </span>
              <input
                type="date"
                value={form.logDate}
                onChange={(e) => setForm((f) => ({ ...f, logDate: e.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
              />
            </label>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Quick draft</p>
              <p className="mt-1 text-xs text-slate-600">
                Pull same-day harvest, sale, and expense entries into this report.
              </p>
              <button type="button" className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50" onClick={onAutoFillFromRecords}>
                Auto-fill from records
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <FileText className="size-3.5" aria-hidden />
                Activities
              </span>
              <textarea
                rows={5}
                value={form.activities}
                onChange={(e) => setForm((f) => ({ ...f, activities: e.target.value }))}
                placeholder="Harvested 2t maize Block B; sprayed fungicide; 3 casuals weeding."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Expense note</span>
                <input
                  value={form.expenseNote}
                  onChange={(e) => setForm((f) => ({ ...f, expenseNote: e.target.value }))}
                  placeholder="Diesel for pump"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Expense amount (UGX)</span>
                <input
                  type="number"
                  value={form.expenseAmount}
                  onChange={(e) => setForm((f) => ({ ...f, expenseAmount: e.target.value }))}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <AlertTriangle className="size-3.5" aria-hidden />
                Issues (pests, weather, delays)
              </span>
              <textarea
                rows={3}
                value={form.issues}
                onChange={(e) => setForm((f) => ({ ...f, issues: e.target.value }))}
                placeholder="None — or describe problems affecting the crop."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Photo proof (optional)</span>
              <input type="file" accept="image/*" onChange={onPhoto} className="block w-full text-sm text-slate-700" />
              {form.photoDataUrl ? (
                <img src={form.photoDataUrl} alt="" className="mt-2 max-h-40 rounded-lg border object-contain" />
              ) : null}
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800">
              Submit daily report
            </button>
          </div>
        </form>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-bold text-slate-900">
          Recent reports {currentUser?.role === 'trader' ? '(all farmers)' : ''}
        </h3>
        {sortedLogs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No daily reports yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {sortedLogs.slice(0, 40).map((log) => (
              <li key={log.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong className="text-slate-900">{log.logDate}</strong>
                  <span className="text-xs text-slate-500">
                    {farmerName(log.userId)}
                    {' · '}
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-slate-800">{log.activities}</p>
                {log.expenseNote || log.expenseAmount != null ? (
                  <p className="mt-2 text-xs text-slate-600">
                    <strong>Expense:</strong> {log.expenseNote || '—'}
                    {log.expenseAmount != null
                      ? ` · UGX ${Number(log.expenseAmount).toLocaleString()}`
                      : ''}
                  </p>
                ) : null}
                {log.issues ? (
                  <p className="mt-2 whitespace-pre-wrap text-amber-900/90">
                    <strong>Issues:</strong> {log.issues}
                  </p>
                ) : null}
                {log.photoDataUrl ? (
                  <img
                    src={log.photoDataUrl}
                    alt="Report"
                    className="mt-3 max-h-56 rounded-lg border object-contain"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
