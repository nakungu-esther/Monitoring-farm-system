import React, { useState, useMemo, useCallback } from 'react';
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
    <div className="page max-w-4xl">
      <h1 className="page-title">Daily farm report</h1>
      <p className="page-lead muted">
        {canSubmit
          ? 'Log date, work done, field costs, issues, optional photo. Submitted here for traders and admin. The app cannot know your field work without you — use “Auto-fill from my records” to pull that day’s harvests, sales, and expenses from AgriTrack, then add what’s missing.'
          : 'Read-only: farmers submit reports. Traders and admins see all entries below.'}
      </p>

      {canSubmit ? (
        <form onSubmit={onSubmit} className="panel modal-form mb-8" noValidate>
          <label className="auth-field">
            <span className="auth-label">Report date</span>
            <input
              type="date"
              value={form.logDate}
              onChange={(e) => setForm((f) => ({ ...f, logDate: e.target.value }))}
            />
          </label>
          <div className="auth-field">
            <span className="auth-label">Quick draft (optional)</span>
            <p className="mb-2 text-xs text-slate-600">
              Fills the form from harvest, sale, and expense entries already saved for the report date above.
            </p>
            <button type="button" className="btn-secondary" onClick={onAutoFillFromRecords}>
              Auto-fill from my AgriTrack records (this date)
            </button>
          </div>
          <label className="auth-field">
            <span className="auth-label">Activities (planted, harvested, sprayed, labour, etc.)</span>
            <textarea
              rows={5}
              value={form.activities}
              onChange={(e) => setForm((f) => ({ ...f, activities: e.target.value }))}
              placeholder="e.g. Harvested 2t maize Block B; sprayed fungicide on beans; 3 casuals weeding."
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Field / casual expense note (optional)</span>
            <input
              value={form.expenseNote}
              onChange={(e) => setForm((f) => ({ ...f, expenseNote: e.target.value }))}
              placeholder="e.g. Diesel for pump"
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Expense amount UGX (optional)</span>
            <input
              type="number"
              value={form.expenseAmount}
              onChange={(e) => setForm((f) => ({ ...f, expenseAmount: e.target.value }))}
            />
            <span className="text-xs text-slate-500">Add larger items under Expenses as needed.</span>
          </label>
          <label className="auth-field">
            <span className="auth-label">Issues (pests, weather, delays)</span>
            <textarea
              rows={3}
              value={form.issues}
              onChange={(e) => setForm((f) => ({ ...f, issues: e.target.value }))}
              placeholder="None — or describe problems affecting the crop."
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Photo proof (optional)</span>
            <input type="file" accept="image/*" onChange={onPhoto} />
            {form.photoDataUrl ? (
              <img src={form.photoDataUrl} alt="" className="mt-2 max-h-40 rounded-lg border object-contain" />
            ) : null}
          </label>
          <div className="modal-actions">
            <button type="submit" className="btn-primary">
              Submit daily report
            </button>
          </div>
        </form>
      ) : null}

      <section className="panel">
        <h3>Recent reports {currentUser?.role === 'trader' ? '(all farmers)' : ''}</h3>
        {sortedLogs.length === 0 ? (
          <p className="muted small">No daily reports yet.</p>
        ) : (
          <ul className="space-y-4">
            {sortedLogs.slice(0, 40).map((log) => (
              <li key={log.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
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
