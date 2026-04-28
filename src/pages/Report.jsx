import React, { useState, useMemo } from 'react';
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
    <div className="page report-page">
      <section className="filters-bar card-like">
        <div className="filter-group">
          <label>
            <span className="filter-label">From</span>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          </label>
          <label>
            <span className="filter-label">To</span>
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          </label>
          <label>
            <span className="filter-label">Produce</span>
            <select value={filterProduce} onChange={(e) => setFilterProduce(e.target.value)}>
              <option value="">All</option>
              {PRODUCE_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="kpi-grid kpi-sm">
        <div className="kpi-card">
          <div className="kpi-label">Revenue (scope)</div>
          <div className="kpi-value">
            <span className="num-prefix">UGX</span>
            <span className="num-lg">{filteredSales.reduce((a, s) => a + Math.min(s.amountPaid ?? 0, s.totalPayment), 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total expenses</div>
          <div className="kpi-value">
            <span className="num-prefix">UGX</span>
            <span className="num-lg">{totalExpenses.toLocaleString()}</span>
          </div>
        </div>
        <div className="kpi-card kpi-accent">
          <div className="kpi-label">Profit (overall)</div>
          <div className="kpi-value">
            <span className="num-prefix">UGX</span>
            <span className="num-lg">{profit.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <section className="panel">
        <h2 className="panel-heading sm">Quick expense</h2>
        <form onSubmit={onExpSubmit} className="inline-tools wrap" noValidate>
          <input
            placeholder="Description"
            value={expForm.label}
            onChange={(e) => setExpForm((f) => ({ ...f, label: e.target.value }))}
            className="input-inline grow"
          />
          <input
            type="number"
            placeholder="UGX"
            value={expForm.amount}
            onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))}
            className="input-inline"
          />
          <input
            type="date"
            value={expForm.date}
            onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))}
            className="input-inline"
          />
          <button type="submit" className="btn-secondary">Add</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-heading">Filtered sales</h2>
          <span className="muted small">{filteredSales.length} rows</span>
        </div>
        <div className="table-wrap">
          <table className="data-table striped">
            <thead>
              <tr>
                <th>Date</th>
                <th>Buyer</th>
                <th>Produce</th>
                <th>UGX</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr><td colSpan={5} className="muted center">No sales match filters.</td></tr>
              ) : (
                filteredSales
                  .slice()
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((s) => (
                    <tr key={s.id}>
                      <td>{s.date}</td>
                      <td className="fw-semibold">{s.buyerName}</td>
                      <td>{s.produceName}</td>
                      <td className="tabular">{Number(s.totalPayment).toLocaleString()}</td>
                      <td><span className={`badge-status st-${s.paymentStatus}`}>{s.paymentStatus}</span></td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-heading">Harvests</h2>
          <span className="muted small">{visibleHarvests.length} total</span>
        </div>
        <div className="table-wrap">
          <table className="data-table striped">
            <thead>
              <tr><th>Produce</th><th>Tonnage</th><th>Date</th></tr>
            </thead>
            <tbody>
              {visibleHarvests.length === 0 ? (
                <tr><td colSpan={3} className="muted center">No harvests.</td></tr>
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
                      <td>{h.produceName}</td>
                      <td className="tabular">{Number(h.tonnage).toFixed(2)}</td>
                      <td>{h.date}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-heading sm">Expense lines</h2>
        <div className="table-wrap">
          <table className="data-table striped">
            <thead>
              <tr><th>Label</th><th>Amount</th><th>Date</th></tr>
            </thead>
            <tbody>
              {visibleExpenses.length === 0 ? (
                <tr><td colSpan={3} className="muted center">None logged.</td></tr>
              ) : (
                visibleExpenses
                  .slice()
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((ex) => (
                    <tr key={ex.id}>
                      <td>{ex.label}</td>
                      <td className="tabular">{ex.amount.toLocaleString()}</td>
                      <td>{ex.date}</td>
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
