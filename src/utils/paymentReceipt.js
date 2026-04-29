/**
 * Build downloadable / shareable payment receipts for sale records.
 */

function safeId(sale) {
  return String(sale?.id || 'sale').replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function fmtUgx(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return `UGX ${Math.round(x).toLocaleString()}`;
}

function settlementLabel(s) {
  const m = (s.settlementMethod || '').toLowerCase();
  if (m === 'sui') return 'Sui (on-chain)';
  if (m === 'credit') return 'Credit (UGX)';
  if (m === 'mobile_money') return 'Mobile money (UGX)';
  if (m === 'manual') return 'Manual / cash (record)';
  return m || '—';
}

function statusLabel(s) {
  const p = s.paymentStatus || 'paid';
  if (p === 'paid') return 'Paid';
  if (p === 'pending') return 'Pending';
  if (p === 'credit') return 'Credit';
  if (p === 'partial') return 'Partial';
  return p;
}

function escHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Structured fields for on-screen receipt preview (same data as download/share).
 * @param {object} sale
 * @param {object} ctx
 * @param {'buyer'|'seller'} [ctx.perspective]
 */
export function getReceiptViewModel(sale, ctx = {}) {
  const seller = ctx.sellerName || '—';
  const buyer = ctx.buyerName || sale?.buyerName || '—';
  const showLedgerSplit = Number(sale?.platformFeeUgx) > 0 || Number(sale?.farmerPayoutUgx) > 0;
  return {
    appName: ctx.appName || 'AgriTrack',
    saleId: String(sale?.id ?? '—'),
    saleDate: sale?.date || '—',
    generatedAt: new Date().toISOString(),
    produceName: sale?.produceName || '—',
    tonnage: Number(sale?.tonnage || 0),
    totalPayment: Number(sale?.totalPayment),
    amountPaid: Number(sale?.amountPaid ?? sale?.totalPayment),
    paymentStatus: statusLabel(sale),
    settlement: settlementLabel(sale),
    showLedgerSplit,
    platformFeeUgx: showLedgerSplit ? Number(sale?.platformFeeUgx || 0) : null,
    farmerPayoutUgx: showLedgerSplit ? Number(sale?.farmerPayoutUgx ?? sale?.totalPayment) : null,
    paymentProvider: sale?.paymentProvider || null,
    paymentReference: sale?.paymentReference || null,
    suiTxDigest: sale?.suiTxDigest || null,
    creditDueDate: sale?.creditDueDate || null,
    sellerName: seller,
    buyerName: buyer,
    perspective: ctx.perspective || 'seller',
    fmtUgx,
  };
}

/**
 * @param {object} sale - client sale shape
 * @param {object} ctx
 * @param {'buyer'|'seller'} ctx.perspective
 * @param {string} [ctx.sellerName]
 * @param {string} [ctx.buyerName]
 * @param {string} [ctx.appName]
 */
export function buildReceiptPlainText(sale, ctx = {}) {
  const seller = ctx.sellerName || '—';
  const buyer = ctx.buyerName || sale.buyerName || '—';
  const lines = [
    `${ctx.appName || 'AgriTrack'} — PAYMENT RECEIPT`,
    '—'.repeat(40),
    `Sale ID: ${sale.id}`,
    `Sale date: ${sale.date || '—'}`,
    `Record generated: ${new Date().toISOString()}`,
    '',
    'Produce: ' + (sale.produceName || '—'),
    `Quantity: ${Number(sale.tonnage || 0).toFixed(2)} t`,
    `Total (book value): ${fmtUgx(sale.totalPayment)}`,
    `Amount recorded as paid: ${fmtUgx(sale.amountPaid ?? sale.totalPayment)}`,
    `Payment status: ${statusLabel(sale)}`,
    `Settlement: ${settlementLabel(sale)}`,
  ];
  if (sale.platformFeeUgx > 0 || sale.farmerPayoutUgx > 0) {
    lines.push(`Platform fee (book): ${fmtUgx(sale.platformFeeUgx || 0)}`);
    lines.push(`Farmer share (book): ${fmtUgx(sale.farmerPayoutUgx ?? sale.totalPayment)}`);
  }
  if (sale.paymentProvider) {
    lines.push(`Provider: ${sale.paymentProvider}`);
  }
  if (sale.paymentReference) {
    lines.push(`Payment reference: ${sale.paymentReference}`);
  }
  if (sale.suiTxDigest) {
    lines.push(`Sui transaction: ${sale.suiTxDigest}`);
  }
  if (sale.creditDueDate) {
    lines.push(`Credit due: ${sale.creditDueDate}`);
  }
  lines.push('');
  lines.push(`Seller (farmer): ${seller}`);
  lines.push(`Buyer: ${buyer}`);
  lines.push('');
  lines.push(
    ctx.perspective === 'buyer'
      ? 'You are listed as the buyer on this record.'
      : 'You are listed as the seller (farmer) on this record.',
  );
  lines.push('');
  lines.push('This receipt reflects data saved in AgriTrack. It is not a tax invoice unless your jurisdiction requires further detail.');
  return lines.join('\n');
}

/**
 * Self-contained HTML file for download / print.
 */
export function buildReceiptHtmlDocument(sale, ctx = {}) {
  const vm = getReceiptViewModel(sale, ctx);
  const generatedAt = new Date(vm.generatedAt).toLocaleString();
  const statusTone =
    vm.paymentStatus === 'Paid'
      ? '#065f46'
      : vm.paymentStatus === 'Credit' || vm.paymentStatus === 'Partial'
        ? '#92400e'
        : '#1e3a8a';
  const detailRows = [
    ['Produce', vm.produceName],
    ['Quantity', `${Number(vm.tonnage || 0).toFixed(2)} t`],
    ['Total amount', vm.fmtUgx(vm.totalPayment)],
    ['Amount paid', vm.fmtUgx(vm.amountPaid)],
    ['Settlement', vm.settlement],
    ['Payment status', vm.paymentStatus],
    ['Seller', vm.sellerName],
    ['Buyer', vm.buyerName],
  ];
  if (vm.showLedgerSplit) {
    detailRows.push(['Platform fee', vm.fmtUgx(vm.platformFeeUgx)]);
    detailRows.push(['Farmer share', vm.fmtUgx(vm.farmerPayoutUgx)]);
  }
  if (vm.paymentProvider) detailRows.push(['Provider', vm.paymentProvider]);
  if (vm.paymentReference) detailRows.push(['Reference', vm.paymentReference]);
  if (vm.suiTxDigest) detailRows.push(['Sui digest', vm.suiTxDigest]);
  if (vm.creditDueDate) detailRows.push(['Credit due', vm.creditDueDate]);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Receipt ${safeId(sale)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { font-family: "Inter", system-ui, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .sheet { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
    .head { padding: 18px 22px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .sub { margin-top: 4px; font-size: 12px; color: #475569; }
    .badge { font-size: 12px; font-weight: 700; padding: 6px 10px; border-radius: 999px; border: 1px solid #cbd5e1; background: #f8fafc; color: ${statusTone}; }
    .meta { padding: 14px 22px; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px 20px; border-bottom: 1px solid #e2e8f0; }
    .meta div { font-size: 12px; color: #334155; }
    .meta strong { color: #0f172a; }
    .body { padding: 18px 22px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; vertical-align: top; }
    th { width: 34%; color: #475569; font-weight: 600; }
    td { color: #0f172a; font-weight: 600; }
    .foot { padding: 14px 22px 20px; font-size: 12px; color: #475569; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { border: 0; border-radius: 0; max-width: none; }
      .head, .meta, .body, .foot { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <article class="sheet">
    <header class="head">
      <div>
        <div class="brand">${escHtml(vm.appName)} Payment Receipt</div>
        <div class="sub">Operational settlement record</div>
      </div>
      <div class="badge">${escHtml(vm.paymentStatus)}</div>
    </header>
    <section class="meta">
      <div><strong>Receipt ID:</strong> ${escHtml(vm.saleId)}</div>
      <div><strong>Sale date:</strong> ${escHtml(vm.saleDate)}</div>
      <div><strong>Generated:</strong> ${escHtml(generatedAt)}</div>
      <div><strong>Perspective:</strong> ${escHtml(vm.perspective === 'buyer' ? 'Buyer' : 'Seller')}</div>
    </section>
    <section class="body">
      <table aria-label="Receipt details">
        <tbody>
          ${detailRows
            .map(
              ([k, v]) =>
                `<tr><th scope="row">${escHtml(k)}</th><td>${escHtml(v)}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </section>
    <footer class="foot">
      This receipt reflects data recorded in ${escHtml(vm.appName)} and can be used for operational reconciliation.
    </footer>
  </article>
</body>
</html>`;
}

export function receiptFilename(sale) {
  const d = (sale.date || 'date').replace(/[^0-9-]/g, '');
  return `agritrack-receipt-${safeId(sale)}-${d}.html`;
}

/** Open print dialog for the same HTML document used for download. */
export function printReceipt(sale, ctx) {
  const html = buildReceiptHtmlDocument(sale, ctx);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return;
  }
  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      /* ignore */
    }
  };
  win.addEventListener('afterprint', cleanup);
  win.addEventListener('focus', () => setTimeout(cleanup, 2_000));
  setTimeout(() => {
    win.focus();
    win.print();
  }, 150);
}

export function downloadReceipt(sale, ctx) {
  const html = buildReceiptHtmlDocument(sale, ctx);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = receiptFilename(sale);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * @returns {Promise<'shared'|'clipboard'>}
 */
export async function shareReceipt(sale, ctx) {
  const plain = buildReceiptPlainText(sale, ctx);
  const html = buildReceiptHtmlDocument(sale, ctx);
  const name = receiptFilename(sale);
  const file = new File([html], name, { type: 'text/html' });

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Payment receipt',
          text: plain.slice(0, 2000),
        });
        return 'shared';
      }
      await navigator.share({
        title: 'Payment receipt',
        text: plain,
      });
      return 'shared';
    } catch (e) {
      if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) {
        throw e;
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(plain);
    return 'clipboard';
  }

  throw new Error('Share not available. Use Download instead.');
}
