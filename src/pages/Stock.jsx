import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAgriTrack } from '../context/AgriTrackContext';
import EmptyState from '../components/EmptyState';

const LOW_TONNES = 2;

export default function Stock() {
  const { t } = useTranslation();
  const { stockByProduce, stockLedger } = useAgriTrack();

  const entries = Object.entries(stockByProduce).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="page">
      <p className="page-lead muted">
        <strong>{t('stockPage.lead1')}</strong>
        {t('stockPage.lead2')}
      </p>

      {entries.length === 0 ? (
        <div className="card-like">
          <EmptyState icon="📦" title={t('stockPage.emptyTitle')} hint={t('stockPage.emptyHint')} />
        </div>
      ) : (
        <div className="stock-cards">
          {entries.map(([produce, tonnes]) => {
            const kg = Math.round(Math.max(0, tonnes) * 1000);
            const isLow = tonnes < LOW_TONNES && tonnes >= 0;
            const isBad = tonnes < 0;
            const tier = isBad ? 'bad' : isLow ? 'low' : 'ok';
            return (
              <div key={produce} className={`stock-card tier-${tier}`}>
                <div className="stock-card-head">
                  <span className="stock-name">{produce}</span>
                  {tier === 'ok' ? <span className="stock-pill">{t('stockPage.healthy')}</span> : null}
                  {tier === 'low' ? <span className="stock-pill warn">{t('stockPage.low')}</span> : null}
                  {tier === 'bad' ? <span className="stock-pill danger">{t('stockPage.oversold')}</span> : null}
                </div>
                <div className="stock-metric">
                  <span className="stock-kg">
                    {kg.toLocaleString()} {t('common.kg')}
                  </span>
                  <span className="stock-sub">
                    {tonnes.toFixed(2)} {t('common.tonnes')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section className="panel">
        <h2 className="panel-heading">{t('stockPage.ledger')}</h2>
        <div className="table-wrap">
          <table className="data-table striped">
            <thead>
              <tr>
                <th>{t('stockPage.thType')}</th>
                <th>{t('stockPage.thProduce')}</th>
                <th>{t('stockPage.thTonnage')}</th>
                <th>{t('stockPage.thDate')}</th>
                <th>{t('stockPage.thRef')}</th>
              </tr>
            </thead>
            <tbody>
              {stockLedger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted center">
                    {t('stockPage.noMovements')}
                  </td>
                </tr>
              ) : (
                stockLedger.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className={`ledger-tag ${row.kind}`}>
                        {row.kind === 'in' ? t('common.in') : t('common.out')}
                      </span>
                    </td>
                    <td>{row.produceName}</td>
                    <td className="tabular">{row.tonnage.toFixed(2)}</td>
                    <td>{row.date}</td>
                    <td className="muted small">{row.kind === 'in' ? row.farmLocation || row.ref : row.ref}</td>
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
