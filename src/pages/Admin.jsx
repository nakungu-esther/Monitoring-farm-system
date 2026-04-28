import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Activity, TrendingDown, Wallet, Sprout, Bell, ClipboardList } from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import { fetchAuditLogs } from '../api/agritrackApi';

const LOW_STOCK_T = 2;
const CREDIT_WARN_UGX = 1_000_000;

function summarizeAuditJson(v) {
  if (v == null) return '—';
  try {
    const s = JSON.stringify(v);
    return s.length > 280 ? `${s.slice(0, 280)}…` : s;
  } catch {
    return String(v);
  }
}

export default function Admin() {
  const {
    allUsers,
    state,
    setUserRole,
    apiEnabled,
    isAdmin,
    currentUser,
  } = useAgriTrack();
  const { toast } = useToast();
  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    if (!apiEnabled || !isAdmin) return;
    setAuditLoading(true);
    try {
      const rows = await fetchAuditLogs();
      setAuditRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Could not load audit log';
      toast(msg, 'error');
      setAuditRows([]);
    } finally {
      setAuditLoading(false);
    }
  }, [apiEnabled, isAdmin, toast]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const orgStockByProduce = useMemo(() => {
    const m = {};
    (state.harvests || []).forEach((h) => {
      const k = (h.produceName || '').trim();
      if (!k) return;
      m[k] = (m[k] || 0) + Number(h.tonnage);
    });
    (state.sales || []).forEach((s) => {
      const k = (s.produceName || '').trim();
      if (!k) return;
      m[k] = (m[k] || 0) - Number(s.tonnage);
    });
    return m;
  }, [state.harvests, state.sales]);

  const financeOrg = useMemo(() => {
    const revenue = (state.sales || []).reduce(
      (sum, s) => sum + Math.min(s.amountPaid ?? 0, s.totalPayment),
      0,
    );
    const expenses = (state.expenses || []).reduce((sum, e) => sum + e.amount, 0);
    const creditOutstanding = (state.sales || []).reduce((sum, s) => {
      const out = s.totalPayment - (s.amountPaid ?? 0);
      if (out > 0 && (s.paymentStatus === 'credit' || s.paymentStatus === 'partial')) {
        return sum + out;
      }
      return sum;
    }, 0);
    return {
      revenue,
      expenses,
      netProfit: revenue - expenses,
      creditOutstanding,
    };
  }, [state.sales, state.expenses]);

  const farmers = useMemo(
    () => allUsers.filter((u) => u.role === 'farmer'),
    [allUsers],
  );

  const farmersMissingLogToday = useMemo(() => {
    const withLog = new Set(
      (state.farmDailyLogs || [])
        .filter((l) => l.logDate === todayStr)
        .map((l) => l.userId),
    );
    return farmers.filter((f) => !withLog.has(f.id));
  }, [farmers, state.farmDailyLogs, todayStr]);

  const lowStockRows = useMemo(() => {
    return Object.entries(orgStockByProduce).filter(
      ([, t]) => t >= 0 && t < LOW_STOCK_T,
    );
  }, [orgStockByProduce]);

  const oversoldRows = useMemo(() => {
    return Object.entries(orgStockByProduce).filter(([, t]) => t < 0);
  }, [orgStockByProduce]);

  const salesLast7 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const prevStart = new Date(cutoff);
    prevStart.setDate(prevStart.getDate() - 7);
    let cur = 0;
    let prev = 0;
    (state.sales || []).forEach((s) => {
      const d = new Date(`${s.date}T12:00:00`);
      if (Number.isNaN(d.getTime())) return;
      const cash = Math.min(s.amountPaid ?? 0, s.totalPayment);
      if (d >= cutoff) cur += cash;
      else if (d >= prevStart && d < cutoff) prev += cash;
    });
    return { cur, prev };
  }, [state.sales]);

  const alerts = useMemo(() => {
    const list = [];
    farmersMissingLogToday.forEach((f) => {
      list.push({
        id: `no-log-${f.id}`,
        level: 'warn',
        title: 'No daily farm report today',
        detail: `${f.profile?.name || f.email} has not submitted a log for ${todayStr}.`,
      });
    });
    lowStockRows.forEach(([produce, t]) => {
      list.push({
        id: `low-${produce}`,
        level: 'warn',
        title: `Low stock: ${produce}`,
        detail: `About ${t.toFixed(2)} t remaining (threshold ${LOW_STOCK_T} t).`,
      });
    });
    oversoldRows.forEach(([produce]) => {
      list.push({
        id: `over-${produce}`,
        level: 'error',
        title: `Oversold / data mismatch: ${produce}`,
        detail: 'Sales exceed recorded harvests — reconcile harvests or sales.',
      });
    });
    if (financeOrg.creditOutstanding >= CREDIT_WARN_UGX) {
      list.push({
        id: 'credit-high',
        level: 'warn',
        title: 'High outstanding credit',
        detail: `UGX ${financeOrg.creditOutstanding.toLocaleString()} unpaid across partial/credit sales.`,
      });
    }
    if (salesLast7.prev > 0 && salesLast7.cur < salesLast7.prev * 0.5) {
      list.push({
        id: 'sales-drop',
        level: 'warn',
        title: 'Cash-in dropped vs prior week',
        detail: 'Last 7 days cash recorded is less than half the previous 7 days.',
      });
    }
    return list;
  }, [
    farmersMissingLogToday,
    lowStockRows,
    oversoldRows,
    financeOrg.creditOutstanding,
    salesLast7,
    todayStr,
  ]);

  const farmStatus = useMemo(() => {
    const inactive = farmersMissingLogToday.length;
    const totalF = farmers.length;
    if (totalF === 0) {
      return { label: 'No farmer users', tone: 'muted' };
    }
    if (inactive === 0) {
      return { label: "Today's report: all farmers", tone: 'ok' };
    }
    if (inactive === totalF) {
      return { label: "Today's report: none yet", tone: 'bad' };
    }
    return {
      label: `Today's report: missing for ${inactive} of ${totalF} farmers`,
      tone: 'warn',
    };
  }, [farmers.length, farmersMissingLogToday.length]);

  const stockStatus = useMemo(() => {
    if (oversoldRows.length > 0) return { label: 'Stock: fix harvest/sales mismatch', tone: 'bad' };
    if (lowStockRows.length > 0) return { label: 'Stock: low', tone: 'warn' };
    return { label: 'Stock: OK', tone: 'ok' };
  }, [oversoldRows.length, lowStockRows.length]);

  const creditStatus = useMemo(() => {
    if (financeOrg.creditOutstanding >= CREDIT_WARN_UGX * 2) {
      return { label: 'Credit: high', tone: 'bad' };
    }
    if (financeOrg.creditOutstanding >= CREDIT_WARN_UGX) {
      return { label: 'Credit: elevated', tone: 'warn' };
    }
    return { label: 'Credit: OK', tone: 'ok' };
  }, [financeOrg.creditOutstanding]);

  const activityFeed = useMemo(() => {
    const items = [];
    (state.sales || []).forEach((s) => {
      items.push({
        sort: `${s.date}T23:59:59`,
        icon: 'sale',
        line: `Sale · ${s.produceName} · UGX ${Number(s.totalPayment).toLocaleString()} · ${s.paymentStatus}`,
        sub: `${s.buyerName} · farmer ${(s.userId || '').slice(0, 8)}…`,
      });
    });
    (state.expenses || []).forEach((e) => {
      items.push({
        sort: `${e.date}T12:00:00`,
        icon: 'expense',
        line: `Expense · ${e.label} · UGX ${e.amount.toLocaleString()}`,
        sub: `User ${(e.userId || '').slice(0, 8)}…`,
      });
    });
    (state.harvests || []).forEach((h) => {
      items.push({
        sort: `${h.date}T10:00:00`,
        icon: 'harvest',
        line: `Harvest recorded · ${h.produceName} · ${Number(h.tonnage).toFixed(2)} t`,
        sub: h.farmLocation || '',
      });
    });
    (state.farmDailyLogs || []).forEach((l) => {
      items.push({
        sort: `${l.logDate}T${(l.createdAt || '').slice(11, 19) || '12:00:00'}`,
        icon: 'log',
        line: `Daily report · ${(l.activities || '').slice(0, 120)}${(l.activities || '').length > 120 ? '…' : ''}`,
        sub: `${allUsers.find((u) => u.id === l.userId)?.profile?.name || 'Farmer'} · ${l.logDate}`,
      });
    });
    (state.supplyChainEvents || []).forEach((ev) => {
      items.push({
        sort: ev.at || '',
        icon: 'supply',
        line: `Supply chain · ${ev.stage}`,
        sub: ev.note || ev.saleId,
      });
    });
    items.sort((a, b) => (a.sort < b.sort ? 1 : -1));
    return items.slice(0, 35);
  }, [state.sales, state.expenses, state.harvests, state.farmDailyLogs, state.supplyChainEvents, allUsers]);

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify({ users: allUsers, sales: state.sales, farmDailyLogs: state.farmDailyLogs }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agritrack-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toneClass = (tone) => {
    if (tone === 'ok') return 'border-emerald-200 bg-emerald-50/80 text-emerald-900';
    if (tone === 'warn') return 'border-amber-200 bg-amber-50/90 text-amber-950';
    if (tone === 'bad') return 'border-red-200 bg-red-50/90 text-red-950';
    return 'border-slate-200 bg-slate-50 text-slate-700';
  };

  return (
    <div className="page">
      <p className="page-lead muted">
        Summary, alerts, activity, audit log, users.{' '}
        <Link to="/daily-log" className="font-semibold text-emerald-700 hover:underline">
          Daily farm reports
        </Link>
        .
      </p>

      {/* 1 — Executive summary */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Finance overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <Wallet className="size-4" aria-hidden />
              Revenue (cash recorded)
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              UGX {financeOrg.revenue.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <TrendingDown className="size-4" aria-hidden />
              Expenses
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              UGX {financeOrg.expenses.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm ring-1 ring-emerald-100">
            <div className="text-xs font-semibold uppercase text-emerald-800">Net (revenue − expenses)</div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-950">
              UGX {financeOrg.netProfit.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase text-amber-900">Credit outstanding</div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-amber-950">
              UGX {financeOrg.creditOutstanding.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* 2 — Health signals */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Farm health signals</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className={`rounded-xl border p-4 text-sm font-semibold ${toneClass(farmStatus.tone)}`}>
            <div className="flex items-center gap-2">
              <Activity className="size-4 shrink-0" aria-hidden />
              {farmStatus.label}
            </div>
          </div>
          <div className={`rounded-xl border p-4 text-sm font-semibold ${toneClass(stockStatus.tone)}`}>
            <div className="flex items-center gap-2">
              <Sprout className="size-4 shrink-0" aria-hidden />
              {stockStatus.label}
            </div>
          </div>
          <div className={`rounded-xl border p-4 text-sm font-semibold ${toneClass(creditStatus.tone)}`}>
            <div className="flex items-center gap-2">
              <Bell className="size-4 shrink-0" aria-hidden />
              {creditStatus.label}
            </div>
          </div>
        </div>
      </section>

      {/* 3 — Alerts */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600" aria-hidden />
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Alerts ({alerts.length})
          </h2>
        </div>
        {alerts.length === 0 ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-900">
            No alerts.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className={`rounded-xl border p-4 text-sm ${
                  a.level === 'error'
                    ? 'border-red-200 bg-red-50/80'
                    : 'border-amber-200 bg-amber-50/70'
                }`}
              >
                <strong className="text-slate-900">{a.title}</strong>
                <p className="mt-1 text-slate-700">{a.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4 — Activity feed */}
      <section className="mb-8 panel">
        <h3>Recent activity</h3>
        <p className="small muted mb-3">Sales, expenses, harvests, daily reports, supply steps — newest first.</p>
        <ul className="max-h-[28rem] space-y-2 overflow-y-auto text-sm">
          {activityFeed.length === 0 ? (
            <li className="muted">No activity yet.</li>
          ) : (
            activityFeed.map((item, i) => (
              <li
                key={`${item.sort}-${i}`}
                className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
              >
                <span className="text-xs font-semibold uppercase text-slate-400">{item.icon}</span>
                <div className="font-medium text-slate-900">{item.line}</div>
                {item.sub ? <div className="text-xs text-slate-600">{item.sub}</div> : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mb-8 panel">
        <div className="row-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-slate-600" aria-hidden />
            <h3 className="m-0">Audit log</h3>
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={!apiEnabled || !isAdmin || auditLoading}
            onClick={loadAuditLogs}
          >
            {auditLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        <p className="small muted mb-3">
          Backend: who changed what (actor, action, entity, before/after). Use Refresh after API is on.
        </p>
        {!apiEnabled ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            API off — no server audit. Set <code className="text-xs">VITE_USE_API</code> / API URL to load entries.
          </p>
        ) : !isAdmin ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Use an admin account to load this list.
          </p>
        ) : auditRows.length === 0 && !auditLoading ? (
          <p className="muted text-sm">No entries returned (empty log or filter).</p>
        ) : (
          <div className="table-scroll max-h-[24rem] overflow-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Time (UTC)</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Before / after</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row) => {
                  const t = row.createdAt
                    ? new Date(row.createdAt).toISOString().replace('T', ' ').slice(0, 19)
                    : '—';
                  const actor =
                    row.actorName || row.actorEmail || currentUser?.profile?.name || '—';
                  const entity = `${row.entityType || '—'} ${row.entityId != null ? `#${row.entityId}` : ''}`;
                  return (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap font-mono text-xs">{t}</td>
                      <td className="font-semibold">{row.action}</td>
                      <td className="small">
                        {actor}
                        {row.actorRole ? (
                          <span className="text-slate-500">
                            {' '}
                            (
                            {row.actorRole}
                            )
                          </span>
                        ) : null}
                      </td>
                      <td className="small">{entity}</td>
                      <td className="max-w-[min(28rem,40vw)]">
                        <div className="text-xs text-slate-600">
                          <strong className="text-slate-800">Was:</strong>
                          {' '}
                          {summarizeAuditJson(row.oldValue)}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          <strong className="text-slate-800">Now:</strong>
                          {' '}
                          {summarizeAuditJson(row.newValue)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="row-between">
          <h3>All users</h3>
          <button type="button" className="btn-secondary" onClick={handleExport}>
            Export JSON report
          </button>
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.profile.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="select-inline"
                      value={u.role}
                      disabled={apiEnabled}
                      title={
                        apiEnabled
                          ? 'Role edits need an admin API — export users and update in DB for now.'
                          : 'Change role (offline only)'
                      }
                      onChange={async (e) => {
                        const role = e.target.value;
                        const r = await setUserRole(u.id, role);
                        if (r.ok) toast(`Role updated to ${role}`);
                        else toast(r.error || 'Could not change role', 'error');
                      }}
                    >
                      <option value="farmer">farmer</option>
                      <option value="trader">trader</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>{u.profile.phone}</td>
                  <td>{u.profile.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Recent sales (all)</h3>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Farmer id</th>
                <th>Buyer</th>
                <th>Produce</th>
                <th>UGX</th>
                <th>Fee</th>
                <th>Farmer net</th>
                <th>Status</th>
                <th>Rail</th>
                <th>Ref / digest</th>
              </tr>
            </thead>
            <tbody>
              {state.sales
                .slice()
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .slice(0, 25)
                .map((s) => (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td className="small">{s.userId}</td>
                    <td>{s.buyerName}</td>
                    <td>{s.produceName}</td>
                    <td>{s.totalPayment.toLocaleString()}</td>
                    <td className="tabular-nums">
                      {s.platformFeeUgx != null && s.platformFeeUgx > 0
                        ? s.platformFeeUgx.toLocaleString()
                        : '—'}
                    </td>
                    <td className="tabular-nums">
                      {s.farmerPayoutUgx != null ? s.farmerPayoutUgx.toLocaleString() : '—'}
                    </td>
                    <td>{s.paymentStatus}</td>
                    <td className="small">{s.settlementMethod || '—'}</td>
                    <td className="small font-mono">
                      {s.suiTxDigest
                        ? `${s.suiTxDigest.slice(0, 12)}…`
                        : s.paymentReference
                          ? String(s.paymentReference).slice(0, 14)
                          : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-sm text-slate-600">
        <Link to="/transactions" className="font-semibold text-emerald-700 hover:underline">
          Wallet &amp; on-chain activity →
        </Link>
      </p>
    </div>
  );
}
