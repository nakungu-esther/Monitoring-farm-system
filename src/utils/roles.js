/**
 * Enforce a single lowecase role string for the whole app (matches RequireRole + nav).
 * APIs sometimes return UPPERCASE or enum names — normalize on ingest.
 */
export function normalizeAppRole(role) {
  const r = String(role ?? 'farmer')
    .trim()
    .toLowerCase();
  if (r === 'admin' || r === 'farmer' || r === 'trader') return r;
  return 'farmer';
}
