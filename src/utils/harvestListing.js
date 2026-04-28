/**
 * Marketplace listing helpers. `price` on legacy rows = UGX per tonne; `pricePerKgUgx` = preferred.
 */
export function effectivePricePerKgUgx(h) {
  if (!h) return 0;
  const p = h.pricePerKgUgx != null && Number(h.pricePerKgUgx) > 0 ? Number(h.pricePerKgUgx) : 0;
  if (p > 0) return p;
  const perTonne = h.price != null && Number(h.price) > 0 ? Number(h.price) : 0;
  if (perTonne > 0) return perTonne / 1000;
  return 0;
}

export function availableKgForHarvest(h) {
  const t = h?.tonnage != null ? Number(h.tonnage) : 0;
  if (!Number.isFinite(t) || t <= 0) return 0;
  return t * 1000;
}

/** Total UGX for book value: tonnes × 1000 × UGX/kg */
export function suggestedUgxForTonnage(h, tonnes) {
  const p = effectivePricePerKgUgx(h);
  if (p <= 0 || !Number.isFinite(tonnes) || tonnes <= 0) return '';
  return String(Math.max(1, Math.round(tonnes * 1000 * p)));
}

/** Same as above, quantity in kilograms (trader checkout). */
export function suggestedUgxForKg(h, kg) {
  const p = effectivePricePerKgUgx(h);
  if (p <= 0 || !Number.isFinite(kg) || kg <= 0) return '';
  return String(Math.max(1, Math.round(kg * p)));
}

/** Convert kg input to tonnes for API / stock (sales use tonnes). */
export function tonnesFromKg(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n / 1000;
}

export const QUALITY_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function qualityLabel(grade) {
  const g = (grade || '').toLowerCase();
  if (g === 'high') return 'High';
  if (g === 'medium') return 'Medium';
  if (g === 'low') return 'Low';
  return grade || '—';
}
