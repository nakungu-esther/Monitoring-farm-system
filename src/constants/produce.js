/** Standard produce list for fast data entry (dropdowns). */

export const PRODUCE_OPTIONS = [
  'Maize (Corn)',
  'Beans',
  'Rice',
  'Wheat',
  'Barley',
  'Oats',
  'Sorghum',
  'Millet',
  'Groundnuts (Peanuts)',
  'Soybeans',
  'Cowpeas',
  'Chickpeas',
  'Lentils',
  'Cassava',
  'Sweet potatoes',
  'Irish potatoes',
  'Coffee',
  'Tea',
  'Cotton',
  'Tobacco',
  'Sugarcane',
  'Onions',
  'Tomatoes',
  'Cabbage',
  'Spinach',
  'Other vegetables',
  'Other',
];

/**
 * Older saved rows may use shorter names; map to the current option so dropdowns + stock match.
 */
export const LEGACY_PRODUCE_ALIASES = {
  Maize: 'Maize (Corn)',
  Groundnuts: 'Groundnuts (Peanuts)',
};

/**
 * Single string used for harvest/sale stock math and filters (legacy → new label).
 */
export function canonicalProduceName(name) {
  const t = String(name ?? '').trim();
  if (!t) return t;
  return LEGACY_PRODUCE_ALIASES[t] || t;
}

/**
 * When loading a saved harvest/plan/sale, resolve to a PRODUCE_OPTIONS value if possible.
 */
export function resolveProduceOption(storedName) {
  const t = String(storedName ?? '').trim();
  if (!t) return t;
  const mapped = LEGACY_PRODUCE_ALIASES[t] || t;
  if (PRODUCE_OPTIONS.includes(mapped)) return mapped;
  return t;
}
