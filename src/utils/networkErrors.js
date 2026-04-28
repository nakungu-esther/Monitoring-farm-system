/** True when the request likely failed due to no network / DNS / CORS (no HTTP response). */
export function isLikelyNetworkError(err) {
  if (err == null) return false;
  if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') return true;
  const msg = String(err.message || '').toLowerCase();
  if (
    msg.includes('network error')
    || msg.includes('failed to fetch')
    || msg.includes('load failed')
    || msg.includes('network request failed')
  ) {
    return true;
  }
  if (typeof TypeError !== 'undefined' && err instanceof TypeError) return true;
  // Axios: no response but request went out
  if (err.request && !err.response) return true;
  return false;
}
