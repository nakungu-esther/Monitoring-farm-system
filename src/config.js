/** API origin. Leave empty in dev so /api uses the Vite proxy to local Nest (vite.config.js). */
const raw = import.meta.env.VITE_API_URL ?? '';

export const API_BASE = typeof raw === 'string' ? raw.replace(/\/$/, '') : '';

/** Sync harvests & sales with fram-trackerBE when true or when API_BASE is non-empty. */
export const API_ENABLED =
  import.meta.env.VITE_USE_API === 'true' || API_BASE.length > 0;

/** Shown on Upgrade when API is off or plans fail; keep in sync with server env defaults. */
export const BILLING_DISPLAY_UGX = {
  featured: Math.max(0, Number(import.meta.env.VITE_BILLING_FEATURED_UGX || 100_000)),
  premium: Math.max(0, Number(import.meta.env.VITE_BILLING_PREMIUM_UGX || 180_000)),
  periodDays: 30,
};

/** Optional: set true in .env to show Stripe when GET /billing/plans failed (server must still have keys). */
export const VITE_STRIPE_UI = import.meta.env.VITE_STRIPE_ENABLED === 'true';
