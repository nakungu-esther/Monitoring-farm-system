export function isLikelySuiAddress(addr) {
  if (addr == null || typeof addr !== 'string') return false;
  const t = addr.trim();
  if (!/^0x[0-9a-fA-F]+$/.test(t)) return false;
  return t.length >= 42 && t.length <= 66;
}
