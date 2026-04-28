import { api } from './client';

function dateOnly(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export function mapProcurementToHarvest(p) {
  const farmRaw = p.farmId ?? p.farm_id;
  const photo = p.photoDataUrl ?? p.photo_data_url ?? null;
  const priceRaw = p.price;
  const ppg = p.pricePerKgUgx ?? p.price_per_kg_ugx;
  const sp = p.sellerPayout ?? p.seller_payout;
  return {
    id: `api-${p.id}`,
    produceName: p.produce,
    tonnage: p.quantity,
    price:
      priceRaw != null && priceRaw !== '' && Number.isFinite(Number(priceRaw))
        ? Number(priceRaw)
        : 0,
    variety: p.variety != null && String(p.variety).trim() !== '' ? String(p.variety).trim() : '',
    qualityGrade:
      p.qualityGrade != null && String(p.qualityGrade).trim() !== ''
        ? String(p.qualityGrade).trim()
        : '',
    pricePerKgUgx:
      ppg != null && ppg !== '' && Number.isFinite(Number(ppg)) ? Math.max(0, Number(ppg)) : 0,
    pricingNote: p.pricingNote ?? p.pricing_note ?? '',
    date: dateOnly(p.date),
    farmLocation: p.farmLocation || p.farm_location || '',
    userId: p.userId || p.user_id || null,
    createdAt: p.date,
    farmId:
      farmRaw != null && String(farmRaw).trim() !== ''
        ? `api-${farmRaw}`
        : null,
    imageDataUrl: photo && typeof photo === 'string' ? photo : null,
    isFeatured: Boolean(p.isFeatured ?? p.is_featured),
    featuredUntil:
      p.featuredUntil || p.featured_until
        ? new Date(p.featuredUntil ?? p.featured_until).toISOString()
        : null,
    sellerPayout:
      sp && typeof sp === 'object'
        ? {
            sellerName: String(sp.sellerName ?? sp.seller_name ?? ''),
            moMoNumber: sp.moMoNumber ?? sp.mo_mo_number ?? null,
            registeredName: sp.registeredName ?? sp.registered_name ?? null,
            bankDetails: sp.bankDetails ?? sp.bank_details ?? null,
          }
        : null,
  };
}

/** Map API farm row to client shape (`api-` id prefix). */
export function mapFarmFromApi(f) {
  const id = f.id;
  return {
    id: `api-${id}`,
    userId: f.userId ?? f.user_id ?? null,
    name: f.name ?? '',
    address: f.address ?? '',
    latitude: f.latitude != null && f.latitude !== '' ? Number(f.latitude) : null,
    longitude: f.longitude != null && f.longitude !== '' ? Number(f.longitude) : null,
  };
}

export async function fetchFarms() {
  const { data } = await api.get('/api/farms');
  return data;
}

export async function createFarm(body) {
  const { data } = await api.post('/api/farms', body);
  return data;
}

/** Procurement `farmId` must be a server UUID; local `farm-*` ids are not sent. */
export function procurementFarmRestId(clientFarmId) {
  if (clientFarmId == null || clientFarmId === '') return undefined;
  const s = String(clientFarmId);
  if (!s.startsWith('api-')) return undefined;
  const raw = s.slice(4);
  return raw || undefined;
}

export function mapSaleFromApi(s) {
  const credit = s.creditDueDate ? dateOnly(s.creditDueDate) : '';
  const mnoAt = s.mobileMoneyVerifiedAt
    ? new Date(s.mobileMoneyVerifiedAt).toISOString()
    : null;
  return {
    id: `api-${s.id}`,
    buyerName: s.buyer,
    produceName: s.produce,
    tonnage: s.quantity,
    totalPayment: s.amount,
    paymentStatus: s.paymentStatus || 'paid',
    settlementMethod: s.settlementMethod ?? null,
    amountPaid: s.amountPaid ?? s.amount,
    creditDueDate: credit,
    date: dateOnly(s.date),
    userId: s.userId || null,
    buyerUserId: s.buyerUserId || null,
    procurementId: s.procurementId != null ? s.procurementId : null,
    suiTxDigest: s.suiTxDigest || null,
    paymentProvider: s.paymentProvider ?? null,
    paymentReference: s.paymentReference ?? null,
    payerPhoneMsisdn: s.payerPhoneMsisdn ?? s.payer_phone_msisdn ?? null,
    mobileMoneyVerifiedAt: mnoAt,
    platformFeeUgx: s.platformFeeUgx != null ? Number(s.platformFeeUgx) : 0,
    farmerPayoutUgx: s.farmerPayoutUgx != null ? Number(s.farmerPayoutUgx) : Number(s.amount ?? 0),
    walletTxIds: [],
    createdAt: s.date,
  };
}

export async function fetchProcurements() {
  const { data } = await api.get('/api/procurements');
  return data;
}

export async function fetchSales() {
  const { data } = await api.get('/api/sales');
  return data;
}

export async function createProcurement(body) {
  const { data } = await api.post('/api/procurements', body);
  return data;
}

export async function createSale(body) {
  const { data } = await api.post('/api/sales', body);
  return data;
}

/** @param {string} clientId harvest id e.g. `api-uuid` (never local-only ids) */
export function procurementRestId(clientId) {
  const s = String(clientId);
  return s.startsWith('api-') ? s.slice(4) : s;
}

/** PATCH /api/procurements/:id — wire in Nest when ready */
export async function updateProcurement(clientId, body) {
  const id = procurementRestId(clientId);
  const { data } = await api.patch(`/api/procurements/${id}`, body);
  return data;
}

/** DELETE /api/procurements/:id */
export async function deleteProcurement(clientId) {
  const id = procurementRestId(clientId);
  await api.delete(`/api/procurements/${id}`);
}

/** PATCH /api/sales/:id — e.g. { amountPaid, paymentStatus } */
export async function patchSale(clientId, body) {
  const id = procurementRestId(clientId);
  const { data } = await api.patch(`/api/sales/${id}`, body);
  return data;
}

/** POST /api/sales/:id/confirm-sui — after wallet signs transfer */
export async function confirmSaleSuiPayment(clientId, body) {
  const id = procurementRestId(clientId);
  const { data } = await api.post(`/api/sales/${id}/confirm-sui`, body);
  return data;
}

/** POST /api/sales/:id/verify-mobile-money — MTN / Airtel reference (stub until MNO API) */
export async function verifySaleMobileMoney(clientId, body) {
  const id = procurementRestId(clientId);
  const { data } = await api.post(`/api/sales/${id}/verify-mobile-money`, body);
  return data;
}

export async function checkHealth() {
  const { data } = await api.get('/api/health');
  return data;
}

/** Public checkout copy: platform MoMo / name + fee bps (matches server split). */
export async function fetchCheckoutConfig() {
  const { data } = await api.get('/api/config/checkout');
  return data;
}

/** Admin only — who changed what (integrity trail). */
export async function fetchAuditLogs() {
  const { data } = await api.get('/api/audit-logs');
  return data;
}

/* ——— Expenses ——— */

export function mapExpenseFromApi(e) {
  return {
    id: `api-${e.id}`,
    userId: e.userId ?? e.user_id ?? null,
    label: e.label ?? '',
    amount: Number(e.amount ?? 0),
    date: dateOnly(e.date),
  };
}

export async function fetchExpenses() {
  const { data } = await api.get('/api/expenses');
  return data;
}

export async function createExpense(body) {
  const { data } = await api.post('/api/expenses', body);
  return data;
}

/* ——— Farm daily logs (farmer reports) ——— */

export function mapFarmDailyLogFromApi(row) {
  const d = row.logDate ?? row.log_date;
  return {
    id: `api-${row.id}`,
    userId: row.userId ?? row.user_id ?? null,
    logDate: d ? dateOnly(d) : '',
    activities: row.activities ?? '',
    expenseNote: row.expenseNote ?? row.expense_note ?? '',
    expenseAmount:
      row.expenseAmount != null || row.expense_amount != null
        ? Number(row.expenseAmount ?? row.expense_amount)
        : null,
    issues: row.issues ?? '',
    photoDataUrl: row.photoDataUrl ?? row.photo_data_url ?? null,
    createdAt:
      row.createdAt != null
        ? new Date(row.createdAt).toISOString()
        : new Date().toISOString(),
  };
}

export async function fetchFarmDailyLogs(params = {}) {
  const { data } = await api.get('/api/farm-daily-logs', { params });
  return data;
}

export async function createFarmDailyLog(body) {
  const { data } = await api.post('/api/farm-daily-logs', body);
  return data;
}

/* ——— Seasonal plans ——— */

export function mapSeasonalPlanFromApi(p) {
  const farmRaw = p.farmId ?? p.farm_id;
  return {
    id: `api-${p.id}`,
    userId: p.userId ?? p.user_id ?? null,
    crop: p.crop ?? '',
    plantDate: dateOnly(p.plantDate ?? p.plant_date),
    expectedHarvestDate: dateOnly(p.expectedHarvestDate ?? p.expected_harvest_date),
    farmId: farmRaw != null && String(farmRaw).trim() !== '' ? `api-${farmRaw}` : null,
    notes: p.notes ?? '',
  };
}

export async function fetchSeasonalPlans() {
  const { data } = await api.get('/api/seasonal-plans');
  return data;
}

export async function createSeasonalPlan(body) {
  const { data } = await api.post('/api/seasonal-plans', body);
  return data;
}

export function seasonalPlanRestId(clientPlanId) {
  if (clientPlanId == null || clientPlanId === '') return null;
  const s = String(clientPlanId);
  if (!s.startsWith('api-')) return null;
  const raw = s.slice(4);
  return raw || null;
}

export async function patchSeasonalPlan(clientPlanId, body) {
  const restId = seasonalPlanRestId(clientPlanId);
  if (!restId) throw new Error('Invalid plan id');
  const { data } = await api.patch(`/api/seasonal-plans/${restId}`, body);
  return data;
}

export async function deleteSeasonalPlanById(clientPlanId) {
  const restId = seasonalPlanRestId(clientPlanId);
  if (!restId) throw new Error('Invalid plan id');
  await api.delete(`/api/seasonal-plans/${restId}`);
}

/* ——— Supply chain ——— */

export function mapSupplyEventFromApi(e) {
  return {
    id: `api-${e.id}`,
    saleId: String(e.saleId ?? e.sale_id ?? ''),
    stage: e.stage ?? '',
    note: e.note ?? '',
    userId: e.userId ?? e.user_id ?? null,
    at:
      e.at != null
        ? new Date(e.at).toISOString()
        : new Date().toISOString(),
  };
}

export async function fetchSupplyChainEvents() {
  const { data } = await api.get('/api/supply-chain-events');
  return data;
}

export async function createSupplyChainEvent(body) {
  const { data } = await api.post('/api/supply-chain-events', body);
  return data;
}

/* ——— Notification read state (keys = computed notification ids) ——— */

export async function fetchNotificationReadKeys() {
  const { data } = await api.get('/api/notification-reads');
  return data;
}

export async function markNotificationReadKey(key) {
  const { data } = await api.post('/api/notification-reads', { key });
  return data;
}

/* ——— SMS preview log ——— */

export function mapSmsLogFromApi(s) {
  return {
    id: `api-${s.id}`,
    userId: s.userId ?? s.user_id ?? null,
    to: s.to ?? '',
    body: s.body ?? '',
    kind: s.kind ?? '',
    at:
      s.at != null
        ? new Date(s.at).toISOString()
        : new Date().toISOString(),
  };
}

export async function fetchSmsLogs() {
  const { data } = await api.get('/api/sms-logs');
  return data;
}

export async function createSmsLog(body) {
  const { data } = await api.post('/api/sms-logs', body);
  return data;
}

export async function fetchBillingPlans() {
  const { data } = await api.get('/api/billing/plans');
  return data;
}

export async function purchaseBillingPlan(body) {
  const { data } = await api.post('/api/billing/purchase', body);
  return data;
}

/** Stripe Checkout: returns { url, sessionId } */
export async function createStripeCheckoutSession(body) {
  const { data } = await api.post('/api/billing/stripe/checkout', body);
  return data;
}

export async function verifyStripeCheckoutSession(sessionId) {
  const { data } = await api.get('/api/billing/stripe/verify', {
    params: { session_id: sessionId },
  });
  return data;
}
