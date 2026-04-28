/** Client-side rules before API; keep in sync with server. All user-facing checks go through these helpers — not HTML5 required/min. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(s) {
  return EMAIL_RE.test(String(s ?? '').trim());
}

/** At least 7 digits (strips non-digits for count). */
export function isValidPhoneLoose(s) {
  const digits = String(s ?? '').replace(/\D/g, '');
  return digits.length >= 7;
}

export function passwordMeetsApiRules(pwd) {
  return /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);
}

export function passwordMinLength(apiEnabled) {
  return apiEnabled ? 10 : 6;
}

export function passwordLengthOk(pwd, apiEnabled) {
  return String(pwd ?? '').length >= passwordMinLength(apiEnabled);
}

export function minTrimmedLength(s, min) {
  return String(s ?? '').trim().length >= min;
}

export function isNonEmptyTrimmed(s) {
  return minTrimmedLength(s, 1);
}

/** Parseable number and >= min (default 0). */
export function isFiniteNumberGte(value, min = 0) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && n >= min;
}

/** Strictly positive finite number. */
export function isPositiveFinite(value) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && n > 0;
}

/** YYYY-MM-DD or full ISO date string. */
export function isValidIsoDateString(s) {
  if (s == null || s === '') return false;
  const str = String(s).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const t = Date.parse(str);
  return !Number.isNaN(t);
}

/**
 * Sign-in identifier: API mode = email only; offline = email or phone rules.
 * @returns {null | 'valIdentifier' | 'valIdentifierOffline' | 'valEmail' | 'valPhone'}
 */
export function loginIdentifierValidationKey(id, apiEnabled) {
  const t = String(id ?? '').trim();
  if (apiEnabled) {
    if (!isValidEmail(t)) return 'valIdentifier';
    return null;
  }
  if (!t) return 'valIdentifierOffline';
  if (t.includes('@')) {
    if (!isValidEmail(t)) return 'valEmail';
  } else if (!isValidPhoneLoose(t)) {
    return 'valPhone';
  }
  return null;
}
