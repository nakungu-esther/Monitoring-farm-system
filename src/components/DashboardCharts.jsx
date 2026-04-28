import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

/** Area chart — cumulative monthly cash-in. */
export function RevenueTrendChart({ trend }) {
  const data = useMemo(() => {
    if (!trend?.length) return [];
    return trend.slice(-10).map((r) => ({
      label: r.month.length >= 7 ? r.month.slice(5) : r.month,
      revenue: Math.round(r.revenue),
    }));
  }, [trend]);

  if (!data.length) {
    return (
      <div className="chart-empty">Record paid or partial sales to build a monthly trend.</div>
    );
  }

  return (
    <div className="h-52 w-full min-h-[13rem]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}k`)}
            width={44}
          />
          <Tooltip
            formatter={(v) => [`UGX ${Number(v).toLocaleString()}`, 'Cash-in']}
            labelFormatter={(l) => `Month ${l}`}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#059669"
            strokeWidth={2}
            fill="url(#revFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical bar chart — cash-in (UGX) by crop. */
export function ProduceCashInBarChart({ sales }) {
  const data = useMemo(() => {
    const m = {};
    sales.forEach((s) => {
      const k = s.produceName?.trim() || 'Other';
      m[k] = (m[k] || 0) + Math.min(s.amountPaid ?? 0, s.totalPayment);
    });
    return Object.entries(m)
      .map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [sales]);

  if (!data.length) {
    return (
      <div className="chart-empty">No sales yet — cash-in by produce will show as bars here.</div>
    );
  }

  return (
    <div className="h-52 w-full min-h-[13rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 56 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#64748b' }}
            angle={-32}
            textAnchor="end"
            height={52}
            interval={0}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}k`)}
            width={40}
          />
          <Tooltip
            formatter={(v) => [`UGX ${Number(v).toLocaleString()}`, 'Cash-in']}
            labelFormatter={(label) => String(label)}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
          />
          <Bar dataKey="revenue" fill="#059669" radius={[8, 8, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bar chart — revenue by produce */
export function SalesByProduceChart({ sales }) {
  const rows = useMemo(() => {
    const m = {};
    sales.forEach((s) => {
      const k = s.produceName?.trim() || 'Other';
      m[k] = (m[k] || 0) + Math.min(s.amountPaid ?? 0, s.totalPayment);
    });
    const list = Object.entries(m).map(([name, revenue]) => ({ name, revenue }));
    list.sort((a, b) => b.revenue - a.revenue);
    return list;
  }, [sales]);

  const max = Math.max(...rows.map((r) => r.revenue), 1);

  if (!rows.length) {
    return (
      <div className="chart-empty">No sales yet — revenue by produce will appear here.</div>
    );
  }

  return (
    <div className="hbar-chart">
      {rows.map((r) => (
        <div key={r.name} className="hbar-row">
          <span className="hbar-label">{r.name}</span>
          <div className="hbar-track">
            <div
              className="hbar-fill"
              style={{ width: `${Math.max(6, (r.revenue / max) * 100)}%` }}
            />
          </div>
          <span className="hbar-val">UGX {(r.revenue / 1_000_000).toFixed(1)}M</span>
        </div>
      ))}
    </div>
  );
}

/** Conic-gradient pie for stock share (non-negative tonnes only) */
export function StockPieChart({ stockByProduce }) {
  const { segments, total } = useMemo(() => {
    const entries = Object.entries(stockByProduce)
      .map(([name, t]) => [name, Math.max(0, t)])
      .filter(([, t]) => t > 0);
    const sum = entries.reduce((a, [, t]) => a + t, 0);
    return { segments: entries, total: sum };
  }, [stockByProduce]);

  const colors = ['#2E7D32', '#1565C0', '#43A047', '#6A1B9A', '#00838F', '#C62828', '#4527A0'];

  if (!segments.length || total <= 0) {
    return <div className="chart-empty">Add harvests to see stock distribution.</div>;
  }

  let acc = 0;
  const parts = segments.map(([name, t], i) => {
    const pct = (t / total) * 100;
    const start = acc;
    acc += pct;
    return { name, pct, start, color: colors[i % colors.length] };
  });

  const gradient = parts
    .map((p) => `${p.color} ${p.start}% ${p.start + p.pct}%`)
    .join(', ');

  return (
    <div className="pie-wrap">
      <div
        className="pie-disk"
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label="Stock distribution by produce"
      />
      <ul className="pie-legend">
        {parts.map((p) => (
          <li key={p.name}>
            <span className="pie-swatch" style={{ background: p.color }} />
            <span>{p.name}</span>
            <strong>{p.pct.toFixed(0)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
