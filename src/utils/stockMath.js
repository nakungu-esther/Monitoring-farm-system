import { canonicalProduceName } from '../constants/produce';

/** Net tonnes available for one farmer + produce (harvests − sales). */
export function availableTonnesForUser(harvests, sales, userId, produceName) {
  const k = canonicalProduceName(produceName);
  if (!k || !userId) return 0;
  let q = 0;
  harvests.forEach((h) => {
    if (h.userId === userId && canonicalProduceName(h.produceName || '') === k) {
      q += Number(h.tonnage) || 0;
    }
  });
  sales.forEach((s) => {
    if (s.userId === userId && canonicalProduceName(s.produceName || '') === k) {
      q -= Number(s.tonnage) || 0;
    }
  });
  return q;
}
