import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import Modal from './Modal';
import { useToast } from '../context/ToastContext';
import {
  getReceiptViewModel,
  printReceipt,
  downloadReceipt,
  shareReceipt,
} from '../utils/paymentReceipt';

function Row({ label, children, mono }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span
        className={`min-w-0 text-right text-sm font-medium text-slate-900 ${mono ? 'break-all font-mono text-xs font-normal text-slate-800' : ''}`}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * On-screen payment receipt — same data as download; print-ready.
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {object} props.sale
 * @param {object} props.ctx
 */
export default function ReceiptViewModal({ isOpen, onClose, sale, ctx }) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const vm = useMemo(() => (sale ? getReceiptViewModel(sale, ctx) : null), [sale, ctx]);

  const onPrint = () => {
    if (!sale) return;
    try {
      printReceipt(sale, ctx);
    } catch {
      toast(t('receipt.downloadFail'), 'error');
    }
  };

  const onDownload = () => {
    if (!sale) return;
    try {
      downloadReceipt(sale, ctx);
      toast(t('receipt.downloaded'));
    } catch {
      toast(t('receipt.downloadFail'), 'error');
    }
  };

  const onShare = async () => {
    if (!sale) return;
    try {
      const mode = await shareReceipt(sale, ctx);
      if (mode === 'clipboard') {
        toast(t('receipt.copied'));
      } else {
        toast(t('receipt.shared'));
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        toast(t('receipt.shareFail'), 'warn');
      }
    }
  };

  if (!sale) return null;

  if (!isOpen) return null;

  if (!vm) return null;

  const { fmtUgx } = vm;

  return (
    <Modal
      title={t('receipt.viewTitle')}
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('receipt.close')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={onPrint}
          >
            <Printer className="size-4" aria-hidden />
            {t('receipt.print')}
          </button>
          <button type="button" className="btn-primary" onClick={onDownload}>
            {t('receipt.download')}
          </button>
          <button type="button" className="btn-primary" onClick={() => void onShare()}>
            {t('receipt.share')}
          </button>
        </div>
      }
    >
      <div className="receipt-view mx-auto max-w-md">
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl ring-1 ring-slate-900/5">
          <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 px-5 py-5 text-white">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-emerald-100/90">Payment receipt</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">{vm.appName}</p>
            <p className="mt-2 text-xs text-emerald-100/95">Sale record · internal document</p>
          </div>

          <div className="space-y-0 px-4 py-1 sm:px-5">
            <Row label="Sale ID" mono>
              {vm.saleId}
            </Row>
            <Row label="Sale date">{vm.saleDate}</Row>
            <Row label="Generated" mono>
              {new Date(vm.generatedAt).toLocaleString()}
            </Row>
          </div>

          <div className="mx-4 border-t border-dashed border-slate-200 sm:mx-5" />

          <div className="space-y-0 px-4 py-1 sm:px-5">
            <Row label="Produce">{vm.produceName}</Row>
            <Row label="Quantity">{vm.tonnage.toFixed(2)} t</Row>
            <Row label="Total (book value)">{fmtUgx(vm.totalPayment)}</Row>
            <Row label="Amount recorded as paid">{fmtUgx(vm.amountPaid)}</Row>
            <Row label="Payment status">{vm.paymentStatus}</Row>
            <Row label="Settlement">{vm.settlement}</Row>
            {vm.showLedgerSplit ? (
              <>
                <Row label="Platform fee (book)">{fmtUgx(vm.platformFeeUgx)}</Row>
                <Row label="Farmer share (book)">{fmtUgx(vm.farmerPayoutUgx)}</Row>
              </>
            ) : null}
            {vm.paymentProvider ? (
              <Row label="Provider" mono>
                {vm.paymentProvider}
              </Row>
            ) : null}
            {vm.paymentReference ? (
              <Row label="Payment reference" mono>
                {vm.paymentReference}
              </Row>
            ) : null}
            {vm.suiTxDigest ? (
              <Row label="Sui transaction" mono>
                {vm.suiTxDigest}
              </Row>
            ) : null}
            {vm.creditDueDate ? <Row label="Credit due">{vm.creditDueDate}</Row> : null}
          </div>

          <div className="mx-4 mt-2 rounded-xl bg-slate-50 px-4 py-3 sm:mx-5">
            <Row label="Seller (farmer)">{vm.sellerName}</Row>
            <Row label="Buyer">{vm.buyerName}</Row>
          </div>

          <p className="px-4 pb-1 pt-3 text-xs leading-relaxed text-slate-600 sm:px-5">
            {vm.perspective === 'buyer'
              ? 'You are listed as the buyer on this record.'
              : 'You are listed as the seller (farmer) on this record.'}
          </p>

          <p className="border-t border-slate-100 px-4 pb-5 pt-3 text-[0.7rem] leading-relaxed text-slate-500 sm:px-5">
            This receipt reflects data saved in {vm.appName}. It is not a tax invoice unless your jurisdiction requires
            further detail.
          </p>
        </div>
      </div>
    </Modal>
  );
}
