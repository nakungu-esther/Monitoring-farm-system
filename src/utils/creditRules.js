/**
 * Hard limits for offline UGX credit (ledger). Not applied to pending Sui checkout.
 * Change only with product/legal review.
 */
export const MAX_CREDIT_UGX = 500_000;

/** Identify buyer for aggregation: prefer linked account id, else normalized name. */
export function creditBuyerKey(buyerName, buyerUserId) {
  const uid = buyerUserId != null && String(buyerUserId).trim() !== '' ? String(buyerUserId).trim() : '';
  if (uid) return `id:${uid}`;
  return `n:${String(buyerName || '')
    .trim()
    .toLowerCase()}`;
}

function saleBuyerKey(sale) {
  return creditBuyerKey(sale.buyerName, sale.buyerUserId);
}

/** Unpaid portion of a sale (UGX), counted toward open credit exposure. */
export function saleOutstandingBalance(sale) {
  const st = sale.paymentStatus;
  if (st === 'paid') return 0;
  const tp = Number(sale.totalPayment) || 0;
  const ap = Number(sale.amountPaid) || 0;
  if (tp <= 0) return 0;
  // pending Sui: not treated as UGX credit line for these caps
  if (sale.settlementMethod === 'sui' && st === 'pending') return 0;
  return Math.max(0, Math.min(tp, tp - ap));
}

/**
 * Sum of open balances for this farmer + buyer (same linked trader or same name).
 */
export function outstandingCreditForFarmerBuyer(sales, farmerUserId, buyerName, buyerUserId) {
  if (!farmerUserId) return 0;
  const key = creditBuyerKey(buyerName, buyerUserId);
  return (sales || []).reduce((sum, s) => {
    if (s.userId !== farmerUserId) return sum;
    if (saleBuyerKey(s) !== key) return sum;
    return sum + saleOutstandingBalance(s);
  }, 0);
}

/**
 * New UGX balance this sale adds (credit or unpaid part of partial).
 */
export function newCreditBalanceUg(totalPayment, paymentStatus, amountPaid) {
  const tp = Number(totalPayment) || 0;
  const ap = Number(amountPaid) || 0;
  if (paymentStatus === 'paid') return 0;
  if (paymentStatus === 'credit') return tp;
  if (paymentStatus === 'partial') return Math.max(0, tp - ap);
  if (paymentStatus === 'pending') return 0;
  return 0;
}

/**
 * Skip caps for on-chain checkout until settled (different risk model).
 */
export function shouldApplyUgCreditRules({ settlementMethod, paymentStatus }) {
  if (settlementMethod === 'sui' && paymentStatus === 'pending') return false;
  return true;
}

/**
 * @param {object} p
 * @param {Array} p.sales - all sales in state (same scope as backend would see for farmer).
 * @param {string} p.farmerUserId
 * @param {string} p.buyerName
 * @param {string} [p.buyerUserId]
 * @param {number|string} p.totalPayment
 * @param {string} p.paymentStatus
 * @param {number|string} [p.amountPaid]
 * @param {string} [p.settlementMethod]
 */
export function validateUgCreditLimits({
  sales,
  farmerUserId,
  buyerName,
  buyerUserId,
  totalPayment,
  paymentStatus,
  amountPaid,
  settlementMethod,
}) {
  if (!shouldApplyUgCreditRules({ settlementMethod, paymentStatus })) {
    return { ok: true };
  }

  const newBal = newCreditBalanceUg(totalPayment, paymentStatus, amountPaid);
  if (newBal <= 0) return { ok: true };

  if (!String(buyerName || '').trim()) {
    return {
      ok: false,
      error: 'Credit and partial payment sales require a buyer name so limits can be enforced.',
    };
  }

  if (newBal > MAX_CREDIT_UGX) {
    return {
      ok: false,
      error: `Credit for one sale cannot exceed UGX ${MAX_CREDIT_UGX.toLocaleString()} (this sale’s balance would be UGX ${Math.round(newBal).toLocaleString()}).`,
    };
  }

  const existing = outstandingCreditForFarmerBuyer(sales, farmerUserId, buyerName, buyerUserId);
  if (existing + newBal > MAX_CREDIT_UGX) {
    return {
      ok: false,
      error: `Trusted credit cap: total open credit per buyer cannot exceed UGX ${MAX_CREDIT_UGX.toLocaleString()}. Already outstanding for this buyer: UGX ${Math.round(existing).toLocaleString()}. This sale would add UGX ${Math.round(newBal).toLocaleString()}.`,
    };
  }

  return { ok: true };
}
