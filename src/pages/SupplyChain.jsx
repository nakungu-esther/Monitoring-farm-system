import React, { useMemo, useState } from 'react';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';

const STAGES = [
  { key: 'storage', label: '→ Storage' },
  { key: 'buyer', label: '→ Buyer' },
  { key: 'payment', label: '→ Payment' },
];

const STAGE_ORDER = ['farm', 'storage', 'buyer', 'payment'];

export default function SupplyChain() {
  const { visibleSales, visibleSupplyEvents, advanceSupplyChain } = useAgriTrack();
  const { toast } = useToast();
  const [saleId, setSaleId] = useState('');
  const [note, setNote] = useState('');

  const bySale = useMemo(() => {
    const m = {};
    visibleSupplyEvents.forEach((ev) => {
      if (!m[ev.saleId]) m[ev.saleId] = [];
      m[ev.saleId].push(ev);
    });
    Object.keys(m).forEach((k) => {
      m[k].sort((a, b) => (a.at < b.at ? -1 : 1));
    });
    return m;
  }, [visibleSupplyEvents]);

  const latestStage = (sid) => {
    const list = bySale[sid];
    if (!list || !list.length) return null;
    return list[list.length - 1].stage;
  };

  const nextStages = (sid) => {
    const cur = latestStage(sid);
    let idx = cur ? STAGE_ORDER.indexOf(cur) : -1;
    if (idx < 0) idx = 0;
    return STAGES.filter((st) => STAGE_ORDER.indexOf(st.key) > idx);
  };

  const onAdvance = (sid, stage) => {
    advanceSupplyChain(sid, stage, note.trim() || undefined);
    toast(`Supply step: ${stage}`);
    setNote('');
  };

  const selectedSale = visibleSales.find((s) => s.id === saleId);

  return (
    <div className="page">
      <p className="page-lead muted">
        Trace produce from farm gate to payment — each sale starts at the farm when recorded.
      </p>

      <section className="panel">
        <h2 className="panel-heading">Advance a shipment</h2>
        <div className="inline-tools wrap">
          <select
            value={saleId}
            onChange={(e) => setSaleId(e.target.value)}
            className="select-inline"
          >
            <option value="">Select sale…</option>
            {visibleSales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.buyerName} — {s.produceName} ({s.date})
              </option>
            ))}
          </select>
          <input
            className="input-inline"
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        {selectedSale ? (
          <div className="inline-tools wrap mt-md">
            {nextStages(selectedSale.id).map((st) => (
              <button
                key={st.key}
                type="button"
                className="btn-secondary"
                onClick={() => onAdvance(selectedSale.id, st.key)}
              >
                {st.label}
              </button>
            ))}
            {nextStages(selectedSale.id).length === 0 ? (
              <span className="muted small">All steps logged for this sale.</span>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2 className="panel-heading">Timeline</h2>
        {visibleSales.length === 0 ? (
          <p className="muted">No sales — record one to start the chain.</p>
        ) : (
          <ul className="supply-timeline">
            {visibleSales
              .slice()
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((s) => {
                const steps = bySale[s.id] || [];
                return (
                  <li key={s.id} className="supply-timeline-item card-like">
                    <div className="fw-semibold">
                      {s.buyerName}
                      {' · '}
                      {s.produceName}
                      {' · '}
                      UGX
                      {Number(s.totalPayment).toLocaleString()}
                    </div>
                    {steps.length === 0 ? (
                      <p className="small muted">No steps yet (sale creates farm origin in context).</p>
                    ) : (
                      <ol className="supply-steps">
                        {steps.map((ev) => (
                          <li key={ev.id}>
                            <span className="badge-status st-neutral">{ev.stage}</span>
                            {' '}
                            <span className="small">{ev.note}</span>
                            <span className="muted small">
                              {' '}
                              —
                              {new Date(ev.at).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}
