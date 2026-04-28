import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Share2, Eye } from 'lucide-react';
import { downloadReceipt, shareReceipt } from '../utils/paymentReceipt';
import { useToast } from '../context/ToastContext';
import ReceiptViewModal from './ReceiptViewModal';

/**
 * @param {object} props
 * @param {object} props.sale - sale row from AgriTrack state
 * @param {'buyer'|'seller'} props.perspective
 * @param {string} [props.sellerName]
 * @param {string} [props.buyerName]
 * @param {string} [props.className]
 */
export default function ReceiptActions({ sale, perspective, sellerName, buyerName, className = '' }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const ctx = {
    perspective,
    sellerName: sellerName || '—',
    buyerName: buyerName || sale?.buyerName || '—',
  };

  const onDownload = () => {
    try {
      downloadReceipt(sale, ctx);
      toast(t('receipt.downloaded', { defaultValue: 'Receipt downloaded.' }));
    } catch (e) {
      toast(t('receipt.downloadFail', { defaultValue: 'Could not download receipt.' }), 'error');
    }
  };

  const onShare = async () => {
    setBusy(true);
    try {
      const mode = await shareReceipt(sale, ctx);
      if (mode === 'clipboard') {
        toast(t('receipt.copied', { defaultValue: 'Receipt text copied. Paste it into email or WhatsApp.' }));
      } else {
        toast(t('receipt.shared', { defaultValue: 'Shared.' }));
      }
    } catch (e) {
      if (e?.name === 'AbortError') {
        /* user cancelled */
      } else {
        toast(
          t('receipt.shareFail', {
            defaultValue: 'Could not share. Try Download and attach the file.',
          }),
          'warn',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={`inline-flex items-center gap-1 ${className}`.trim()}>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/90 px-2 py-1 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100"
          onClick={() => setViewOpen(true)}
          title={t('receipt.viewAria', { defaultValue: 'View receipt' })}
          aria-label={t('receipt.viewAria', { defaultValue: 'View receipt' })}
        >
          <Eye className="size-3.5" aria-hidden />
          {t('receipt.view', { defaultValue: 'View' })}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={onDownload}
          title={t('receipt.downloadAria', { defaultValue: 'Download receipt' })}
          aria-label={t('receipt.downloadAria', { defaultValue: 'Download receipt' })}
        >
          <Download className="size-3.5" aria-hidden />
          {t('receipt.download', { defaultValue: 'Download' })}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          onClick={() => void onShare()}
          disabled={busy}
          title={t('receipt.shareAria', { defaultValue: 'Share receipt' })}
          aria-label={t('receipt.shareAria', { defaultValue: 'Share receipt' })}
        >
          <Share2 className="size-3.5" aria-hidden />
          {t('receipt.share', { defaultValue: 'Share' })}
        </button>
      </div>
      <ReceiptViewModal isOpen={viewOpen} onClose={() => setViewOpen(false)} sale={sale} ctx={ctx} />
    </>
  );
}
