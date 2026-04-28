const KEY = 'agritrack-pw-reset-tokens';
const TTL_MS = 60 * 60 * 1000;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(rows) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export function issuePasswordResetToken(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return null;
  let rows = load().filter((x) => x.email !== clean && x.exp > Date.now());
  const token =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `rst-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  rows.push({ email: clean, token, exp: Date.now() + TTL_MS });
  save(rows);
  return token;
}

/** @returns {string|null} email if token valid */
export function consumePasswordResetToken(token) {
  const t = String(token || '').trim();
  if (!t) return null;
  const now = Date.now();
  const rows = load();
  const idx = rows.findIndex((x) => x.token === t && x.exp > now);
  if (idx === -1) return null;
  const email = rows[idx].email;
  rows.splice(idx, 1);
  save(rows);
  return email;
}
