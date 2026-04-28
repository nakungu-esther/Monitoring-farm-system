import React, { useMemo, useState } from 'react';
import { useAgriTrack } from '../context/AgriTrackContext';

export default function Transactions() {
  const { walletTransactions, visibleSales, state } = useAgriTrack();

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterProduce, setFilterProduce] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const saleById = useMemo(() => Object.fromEntries(visibleSales.map((s) => [s.id, s])), [visibleSales]);

  const rows = useMemo(() => {
    let list = walletTransactions.map((tx) => {
      const sale = tx.saleId ? saleById[tx.saleId] : null;
      const seller = sale ? state.users.find((u) => u.id === sale.userId) : null;
      return {
        ...tx,
        produceName: sale?.produceName || '',
        sellerName: seller?.profile?.name || '',
      };
    });

    if (filterDateFrom) {
      list = list.filter((r) => r.timestamp.slice(0, 10) >= filterDateFrom);
    }
    if (filterDateTo) {
      list = list.filter((r) => r.timestamp.slice(0, 10) <= filterDateTo);
    }
    if (filterProduce.trim()) {
      const q = filterProduce.trim().toLowerCase();
      list = list.filter((r) => r.produceName?.toLowerCase().includes(q));
    }
    if (filterUser.trim()) {
      const q = filterUser.trim().toLowerCase();
      list = list.filter(
        (r) =>
          String(r.from).toLowerCase().includes(q) ||
          String(r.to).toLowerCase().includes(q) ||
          (r.sellerName && r.sellerName.toLowerCase().includes(q)),
      );
    }

    return list.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [
    walletTransactions,
    saleById,
    state.users,
    filterDateFrom,
    filterDateTo,
    filterProduce,
    filterUser,
  ]);

  return (
    <div className="page">
      <p className="page-lead muted">
        SUI payment movements linked in your account — filter by date, produce, or counterparty. On{' '}
        <strong>mainnet</strong> with a real connected wallet, these reflect real SUI. Offline mock
        actions only apply when the app is not using chain-verified digests.
      </p>

      <section className="filters-bar card-like">
        <div className="filter-group">
          <label>
            <span className="filter-label">From</span>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </label>
          <label>
            <span className="filter-label">To</span>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </label>
          <label>
            <span className="filter-label">Produce</span>
            <input value={filterProduce} onChange={(e) => setFilterProduce(e.target.value)} placeholder="Filter" />
          </label>
          <label>
            <span className="filter-label">Counterparty</span>
            <input value={filterUser} onChange={(e) => setFilterUser(e.target.value)} placeholder="Name or address" />
          </label>
        </div>
      </section>

      <div className="table-wrap card-like">
        <table className="data-table striped">
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>SUI</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th>Produce / sale</th>
              <th>Memo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="muted">No transactions match.</td></tr>
            ) : (
              rows.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.timestamp).toLocaleString()}</td>
                  <td>{tx.type}</td>
                  <td>{tx.amountSUI}</td>
                  <td>{tx.from}</td>
                  <td>{tx.to}</td>
                  <td><span className="badge-status st-neutral">{tx.status}</span></td>
                  <td>
                    {tx.produceName
                      ? `${tx.produceName}${tx.saleId ? ` (${tx.saleId})` : ''}`
                      : '—'}
                  </td>
                  <td className="small">{tx.memo}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
