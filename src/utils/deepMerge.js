/** Deep-merge plain objects; arrays and non-objects are replaced. `base` is not mutated. */
export function deepMerge(base, overlay) {
  const out = structuredClone(base);
  if (!overlay || typeof overlay !== 'object') return out;
  for (const k of Object.keys(overlay)) {
    const v = overlay[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
