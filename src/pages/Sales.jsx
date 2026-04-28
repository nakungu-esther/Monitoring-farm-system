import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { PRODUCE_OPTIONS } from '../constants/produce';
import { availableTonnesForUser } from '../utils/stockMath';
import { suiTxExplorerUrl } from '../utils/suiExplorer';
import { MAX_CREDIT_UGX } from '../utils/creditRules';
import ReceiptActions from '../components/ReceiptActions';
import { isNonEmptyTrimmed, isPositiveFinite, isFiniteNumberGte, isValidIsoDateString } from '../utils/authValidation';

export default function Sales() {
  const { t } = useTranslation();
  const { addSale, visibleSales, wallet, state, currentUser } = useAgriTrack();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [producePick, setProducePick] = useState(PRODUCE_OPTIONS[0]);
  const [customProduce, setCustomProduce] = useState('');
  const [filterProduce, setFilterProduce] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [form, setForm] = useState({
    buyerName: '',
    tonnage: '',
    totalPayment: '',
    paymentStatus: 'paid',
    amountPaid: '',
    creditDueDate: '',
    date: new Date().toISOString().slice(0, 10),
    mockSuiAmount: '',
    paymentProvider: 'mtn_momo',
    paymentReference: '',
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const paymentMethodLabel = useCallback(
    (sale) => {
      const m = sale.settlementMethod || 'mobile_money';
      if (m === 'sui') return t('payMethod.sui');
      if (m === 'credit') return t('payMethod.credit');
      if (m === 'mobile_money') return t('payMethod.momo');
      if (m === 'manual') return t('payMethod.cash');
      return t('payMethod.momo');
    },
    [t],
  );

  const paymentTrustNote = useCallback(
    (sale) => {
      if (sale.settlementMethod === 'sui' && sale.suiTxDigest) {
        return { kind: 'verified', text: t('payTrust.verified') };
      }
      if (sale.settlementMethod === 'sui' && sale.paymentStatus === 'pending') {
        return { kind: 'pending', text: t('payTrust.pending') };
      }
      if (sale.settlementMethod === 'mobile_money') {
        if (sale.mobileMoneyVerifiedAt || (sale.paymentReference && String(sale.paymentReference).trim())) {
          return { kind: 'momo', text: t('payTrust.momoOk') };
        }
        return { kind: 'momoPend', text: t('payTrust.momoPending') };
      }
      if (sale.settlementMethod === 'manual' && (sale.paymentStatus === 'paid' || sale.paymentStatus === 'partial')) {
        return { kind: 'offline', text: t('payTrust.offline') };
      }
      if (!sale.settlementMethod && (sale.paymentStatus === 'paid' || sale.paymentStatus === 'partial')) {
        return { kind: 'offline', text: t('payTrust.offline') };
      }
      return { kind: 'neutral', text: '—' };
    },
    [t],
  );

  const payStatusText = (raw) => {
    if (raw === 'paid' || raw === 'credit' || raw === 'partial') return t(`saleStatus.${raw}`);
    return raw;
  };

  const produceName = producePick === 'Other' ? customProduce.trim() : producePick;

  const availToSell = useMemo(() => {
    if (!currentUser?.id || !produceName) return null;
    return availableTonnesForUser(state.harvests, state.sales, currentUser.id, produceName);
  }, [state.harvests, state.sales, currentUser?.id, produceName]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (producePick === 'Other' && !customProduce.trim()) {
      toast(t('salesPage.produceError'), 'warn');
      return;
    }
    if (!isNonEmptyTrimmed(form.buyerName)) {
      toast(t('salesPage.errBuyer'), 'warn');
      return;
    }
    if (!isPositiveFinite(form.tonnage)) {
      toast(t('salesPage.errTonnage'), 'warn');
      return;
    }
    if (!isFiniteNumberGte(form.totalPayment, 0)) {
      toast(t('salesPage.errTotal'), 'warn');
      return;
    }
    if (!isValidIsoDateString(form.date)) {
      toast(t('salesPage.errDate'), 'warn');
      return;
    }
    const r = await addSale({ ...form, produceName });
    if (r?.ok === false) {
      toast(r.error || t('salesPage.saveError'), 'error');
      return;
    }
    toast(t('salesPage.toastSaved'));
    setModalOpen(false);
    setForm((f) => ({
      ...f,
      buyerName: '',
      tonnage: '',
      totalPayment: '',
      amountPaid: '',
      creditDueDate: '',
      mockSuiAmount: '',
      paymentReference: '',
      date: new Date().toISOString().slice(0, 10),
    }));
    setProducePick(PRODUCE_OPTIONS[0]);
    setCustomProduce('');
  };

  const showPartialFields = form.paymentStatus === 'partial' || form.paymentStatus === 'credit';

  const produceInSales = useMemo(() => {
    const u = new Set();
    visibleSales.forEach((s) => u.add(s.produceName));
    return Array.from(u).sort();
  }, [visibleSales]);

  const filteredSales = useMemo(() => {
    return visibleSales.filter((s) => {
      if (filterProduce && s.produceName !== filterProduce) return false;
      if (dateFrom && (s.date || '') < dateFrom) return false;
      if (dateTo && (s.date || '') > dateTo) return false;
      return true;
    });
  }, [visibleSales, filterProduce, dateFrom, dateTo]);

  return (
    <div className="page">
      <p className="page-lead muted" style={{ marginBottom: '1rem' }}>
        {t('salesPage.lead1')}{' '}
        <strong>{t('salesPage.lead2')}</strong>
        {t('salesPage.lead3')}
        <strong>{t('salesPage.lead4')}</strong>
        {t('salesPage.lead5')}
        <strong>{t('salesPage.lead6')}</strong>
        {t('salesPage.lead7')}
      </p>
      <div className="page-actions">
        <div className="inline-tools wrap" style={{ flex: 1 }}>
          <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {t('salesPage.filterProduce')}
            <select
              className="select-inline"
              value={filterProduce}
              onChange={(e) => setFilterProduce(e.target.value)}
            >
              <option value="">{t('salesPage.allProduce')}</option>
              {produceInSales.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {t('salesPage.filterFrom')}
            <input
              type="date"
              className="input-inline"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {t('salesPage.filterTo')}
            <input
              type="date"
              className="input-inline"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
        </div>
        <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
          {t('salesPage.btnRecord')}
        </button>
      </div>

      <div className="table-wrap card-like">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('salesPage.thDate')}</th>
              <th>{t('salesPage.thBuyer')}</th>
              <th>{t('salesPage.filterProduce')}</th>
              <th>{t('salesPage.thTonnage')}</th>
              <th>{t('salesPage.thAmountUgx')}</th>
              <th>{t('dashboard.thStatus')}</th>
              <th>{t('salesPage.thHowPaid')}</th>
              <th>{t('salesPage.thProof')}</th>
              <th>{t('receipt.column')}</th>
            </tr>
          </thead>
          <tbody>
            {visibleSales.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    icon="💰"
                    title={t('salesPage.emptyTitle')}
                    hint={t('salesPage.emptyHint2')}
                  />
                </td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted center">
                  {t('salesPage.noFilterMatch')}
                </td>
              </tr>
            ) : (
              filteredSales
                .slice()
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((sale) => {
                  const trust = paymentTrustNote(sale);
                  const explorer = sale.suiTxDigest ? suiTxExplorerUrl(sale.suiTxDigest) : null;
                  const farmer = state.users.find((u) => u.id === sale.userId);
                  const sellerName = farmer?.profile?.name || currentUser?.profile?.name || '—';
                  return (
                    <tr key={sale.id}>
                      <td className="small">{sale.date}</td>
                      <td className="fw-semibold">{sale.buyerName}</td>
                      <td>{sale.produceName}</td>
                      <td className="tabular">{Number(sale.tonnage).toFixed(2)} t</td>
                      <td className="tabular">{Number(sale.totalPayment).toLocaleString()}</td>
                      <td>
                        <span className={`badge-status st-${sale.paymentStatus}`}>
                          {payStatusText(sale.paymentStatus)}
                        </span>
                      </td>
                      <td className="small text-slate-700">{paymentMethodLabel(sale)}</td>
                      <td className="small">
                        {explorer ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-emerald-800">{t('salesPage.suiVerified')}</span>
                            <a
                              href={explorer}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-xs text-emerald-700 underline break-all"
                            >
                              {String(sale.suiTxDigest).slice(0, 14)}…
                            </a>
                          </div>
                        ) : (
                          <span
                            className={
                              trust.kind === 'offline'
                                ? 'text-amber-900'
                                : trust.kind === 'pending'
                                  ? 'text-slate-600'
                                  : trust.kind === 'momo'
                                    ? 'text-emerald-800'
                                    : trust.kind === 'momoPend'
                                      ? 'text-slate-600'
                                      : 'muted'
                            }
                          >
                            {trust.text}
                          </span>
                        )}
                      </td>
                      <td>
                        <ReceiptActions
                          sale={sale}
                          perspective="seller"
                          sellerName={sellerName}
                          buyerName={sale.buyerName || '—'}
                        />
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>

      <Modal title={t('salesPage.modalTitle')} isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={onSubmit} className="modal-form" noValidate>
          <label className="auth-field">
            <span className="auth-label">{t('salesPage.buyerName')}</span>
            <input name="buyerName" value={form.buyerName} onChange={onChange} />
          </label>
          <label className="auth-field">
            <span className="auth-label">{t('salesPage.filterProduce')}</span>
            <select value={producePick} onChange={(e) => setProducePick(e.target.value)}>
              {PRODUCE_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          {producePick === 'Other' ? (
            <label className="auth-field">
              <span className="auth-label">{t('salesPage.customProduce')}</span>
              <input value={customProduce} onChange={(e) => setCustomProduce(e.target.value)} />
            </label>
          ) : null}
          {availToSell != null && produceName ? (
            <p
              className={`small ${availToSell < 0.01 ? 'text-amber-800' : 'muted'}`}
              style={{ margin: '-0.25rem 0 0' }}
            >
              <strong>{t('salesPage.availToSell')}</strong> {availToSell.toFixed(2)} {t('salesPage.tOf')} {produceName}
              {availToSell < 2 && availToSell >= 0 ? t('salesPage.lowStockWarn') : ''}
            </p>
          ) : null}
          <label className="auth-field">
            <span className="auth-label">{t('salesPage.thTonnage')}</span>
            <input name="tonnage" type="number" step="0.01" value={form.tonnage} onChange={onChange} />
          </label>
          <label className="auth-field">
            <span className="auth-label">{t('salesPage.amountUgx')}</span>
            <input name="totalPayment" type="number" value={form.totalPayment} onChange={onChange} />
          </label>
          <label className="auth-field">
            <span className="auth-label">{t('salesPage.paymentStatusLbl')}</span>
            <select name="paymentStatus" value={form.paymentStatus} onChange={onChange}>
              <option value="paid">{t('saleStatus.paid')}</option>
              <option value="partial">{t('saleStatus.partial')}</option>
              <option value="credit">{t('saleStatus.credit')}</option>
            </select>
          </label>
          {showPartialFields ? (
            <>
              <p className="small text-slate-600" style={{ margin: '0 0 0.5rem' }}>
                {t('salesPage.creditRuleBlock', { max: MAX_CREDIT_UGX.toLocaleString() })}
              </p>
              <label className="auth-field">
                <span className="auth-label">{t('salesPage.paidSoFar')}</span>
                <input name="amountPaid" type="number" value={form.amountPaid} onChange={onChange} />
              </label>
              <label className="auth-field">
                <span className="auth-label">{t('salesPage.dueDate')}</span>
                <input name="creditDueDate" type="date" value={form.creditDueDate} onChange={onChange} />
              </label>
            </>
          ) : null}
          {form.paymentStatus !== 'credit' ? (
            <>
              <p className="small text-slate-600" style={{ margin: '0 0 0.5rem' }}>
                {t('salesPage.digitalMomoNote')}
              </p>
              <label className="auth-field">
                <span className="auth-label">{t('salesPage.momoProvider')}</span>
                <select
                  name="paymentProvider"
                  value={form.paymentProvider}
                  onChange={onChange}
                >
                  <option value="mtn_momo">MTN MoMo</option>
                  <option value="airtel_money">Airtel Money</option>
                  <option value="other">{t('salesPage.momoOther')}</option>
                </select>
              </label>
              <label className="auth-field">
                <span className="auth-label">{t('salesPage.momoRef')}</span>
                <input
                  name="paymentReference"
                  value={form.paymentReference}
                  onChange={onChange}
                  placeholder={t('salesPage.momoRefPh')}
                />
              </label>
            </>
          ) : null}
          <label className="auth-field">
            <span className="auth-label">{t('salesPage.saleDate')}</span>
            <input name="date" type="date" value={form.date} onChange={onChange} />
          </label>
          <label className="auth-field">
            <span className="auth-label">{t('salesPage.mockSui')}</span>
            <input
              name="mockSuiAmount"
              type="number"
              step="0.01"
              value={form.mockSuiAmount}
              onChange={onChange}
              placeholder={wallet.connected ? t('salesPage.phLink') : t('salesPage.phWallet')}
              disabled={!wallet.connected}
            />
            <span className="text-xs text-slate-500">{t('salesPage.mockSuiNote')}</span>
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn-primary">{t('salesPage.saveSale')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
