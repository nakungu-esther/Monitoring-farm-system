import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Banknote, CheckCircle2, MessageSquare } from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import ReceiptActions from '../components/ReceiptActions';
import { isPositiveFinite } from '../utils/authValidation';

function balance(sale) {
  return Math.max(0, sale.totalPayment - (sale.amountPaid || 0));
}

function creditStatus(sale) {
  const bal = balance(sale);
  if (bal <= 0) return { label: '—', cls: 'st-neutral' };
  const today = new Date().toISOString().slice(0, 10);
  if (sale.creditDueDate && sale.creditDueDate < today) {
    return { label: 'Overdue', cls: 'st-overdue' };
  }
  if (sale.creditDueDate) {
    return { label: 'Pending', cls: 'st-pending' };
  }
  return { label: 'Open', cls: 'st-partial' };
}

export default function Debts() {
  const { t } = useTranslation();
  const {
    currentUser,
    allUsers,
    outstandingDebts,
    creditOwedAsBuyer,
    markDebtPayment,
    sendDebtReminderSms,
  } = useAgriTrack();
  const { toast } = useToast();
  const isTrader = currentUser?.role === 'trader';
  const premiumForCredit = currentUser?.isPremium;
  if (isTrader && !premiumForCredit) {
    return (
      <div className="page mx-auto max-w-lg space-y-4 px-1">
        <h1 className="page-title">Credit</h1>
        <p className="page-lead muted">
          On-credit buying and this ledger are for{' '}
          <strong className="text-zinc-800 dark:text-zinc-200">Premium Trader</strong> accounts. Upgrade to unlock
          pay-later at checkout; then you can track amounts owed here.
        </p>
        <Link
          className="inline-flex rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700"
          to="/upgrade"
        >
          View upgrades
        </Link>
      </div>
    );
  }
  const rows = isTrader ? creditOwedAsBuyer : outstandingDebts;
  const [paying, setPaying] = useState({});

  const subtitle = isTrader
    ? 'Amounts you owe farmers — record partial or full payments here.'
    : 'Credit and partial sales — record incoming payments and send a mock SMS reminder.';

  const totals = useMemo(
    () => rows.reduce((sum, s) => sum + balance(s), 0),
    [rows],
  );

  const applyPayment = async (saleId) => {
    const raw = paying[saleId];
    if (!isPositiveFinite(raw)) {
      toast('Enter payment amount (UGX)', 'warn');
      return;
    }
    const amt = Number(raw);
    const r = await markDebtPayment(saleId, amt);
    if (r.ok) {
      toast('Payment received — sale and dashboard updated.');
      setPaying((p) => ({ ...p, [saleId]: '' }));
    } else {
      toast(r.error || 'Could not apply', 'error');
    }
  };

  const markFull = async (saleId, sale) => {
    const out = balance(sale);
    if (out <= 0) return;
    const r = await markDebtPayment(saleId, out);
    if (r.ok) toast('Marked paid in full');
    else toast(r.error || 'Could not update', 'error');
  };

  return (
    <div className="page">
      <p className="page-lead muted">{subtitle}</p>

      {rows.length > 0 ? (
        <div className="kpi-grid" style={{ marginBottom: '1.25rem' }}>
          <div className="kpi-card">
            <span className="kpi-emoji" aria-hidden>📒</span>
            <div className="kpi-label">{isTrader ? 'You owe (UGX)' : 'Outstanding (UGX)'}</div>
            <div className="kpi-value tabular">{Math.round(totals).toLocaleString()}</div>
          </div>
          <div className="kpi-card">
            <span className="kpi-emoji" aria-hidden>📋</span>
            <div className="kpi-label">Open lines</div>
            <div className="kpi-value tabular">{rows.length}</div>
          </div>
        </div>
      ) : null}

      <div className="table-wrap card-like">
        <table className="data-table">
          <thead>
            <tr>
              <th>{isTrader ? 'Farmer' : 'Buyer'}</th>
              <th>Produce</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Due</th>
              <th>Actions</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted center">
                  No open credit lines.
                  {' '}
                  <Link to="/sales">Record a credit sale</Link>
                  {' '}
                  to see balances here.
                </td>
              </tr>
            ) : (
              rows.map((s) => {
                const bal = balance(s);
                const st = creditStatus(s);
                const farmer =
                  allUsers?.find((u) => u.id === s.userId)?.profile?.name || 'Farmer';
                const sellerName = isTrader ? farmer : currentUser?.profile?.name || '—';
                const buyerName = isTrader
                  ? currentUser?.profile?.name || s.buyerName || '—'
                  : s.buyerName || '—';
                return (
                  <tr key={s.id}>
                    <td className="fw-semibold">{isTrader ? farmer : s.buyerName}</td>
                    <td>{s.produceName}</td>
                    <td className="tabular">UGX {Number(s.totalPayment).toLocaleString()}</td>
                    <td className="tabular">UGX {Number(s.amountPaid || 0).toLocaleString()}</td>
                    <td className="tabular fw-semibold">UGX {bal.toLocaleString()}</td>
                    <td>
                      <span className={`badge-status ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="small muted">{s.creditDueDate || '—'}</td>
                    <td>
                      <div className="debt-actions">
                        <input
                          type="number"
                          className="input-inline"
                          placeholder="UGX"
                          value={paying[s.id] ?? ''}
                          onChange={(e) => setPaying((p) => ({ ...p, [s.id]: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="btn-secondary inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5"
                          title={t('debtsPage.applyPayment')}
                          aria-label={t('debtsPage.applyPayment')}
                          onClick={() => applyPayment(s.id)}
                        >
                          <Banknote className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          title={t('debtsPage.markFull')}
                          aria-label={t('debtsPage.markFull')}
                          onClick={() => markFull(s.id, s)}
                        >
                          <CheckCircle2 className="size-4" strokeWidth={2} aria-hidden />
                        </button>
                        {!isTrader ? (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            title={t('debtsPage.sendSms')}
                            aria-label={t('debtsPage.sendSms')}
                            onClick={() => {
                              sendDebtReminderSms(s.id);
                              toast('Mock SMS queued (see Alerts → SMS log)');
                            }}
                          >
                            <MessageSquare className="size-4" strokeWidth={2} aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <ReceiptActions
                        sale={s}
                        perspective={isTrader ? 'buyer' : 'seller'}
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

      <p className="small muted">
        SMS log is for testing only — open
        {' '}
        <Link to="/notifications">Alerts</Link>
        {' '}
        to review messages sent to the phone on your profile.
      </p>
    </div>
  );
}
