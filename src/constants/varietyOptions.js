/**
 * Type / variety choices per produce (dropdown on My farm harvest form).
 * Add or edit lines here; keys must match PRODUCE_OPTIONS exactly.
 */
export const VARIETY_BY_PRODUCE = {
  'Maize (Corn)': [
    'Dent maize',
    'Flint maize',
    'Sweet corn',
    'Popcorn',
    'Flour corn',
    'Waxy corn',
    'Hybrid maize (e.g., SC627, DK8031)',
  ],
  Beans: [
    'Kidney beans',
    'Black beans',
    'Pinto beans',
    'Navy beans',
    'Lima beans (butter beans)',
    'Cranberry beans',
    'Mung beans',
  ],
  Rice: [
    'Basmati',
    'Jasmine',
    'Arborio',
    'Brown rice',
    'White rice',
    'Wild rice',
  ],
  Wheat: [
    'Hard Red Wheat',
    'Soft Red Wheat',
    'Durum wheat',
    'White wheat',
  ],
  Barley: [
    'Malting barley',
    'Feed barley',
    'Hulless barley',
    'Other (note in price note if needed)',
  ],
  Oats: [
    'Milling oats',
    'Feed oats',
    'Naked/hulless oats',
    'Other (note in price note if needed)',
  ],
  Sorghum: [
    'Grain sorghum',
    'Sweet sorghum',
    'Forage sorghum',
    'Broomcorn',
    'Hybrid sorghum (commercial types)',
  ],
  Millet: [
    'Pearl millet',
    'Finger millet (Ragi)',
    'Foxtail millet',
    'Proso millet',
    'Barnyard millet',
    'Little millet',
    'Kodo millet',
  ],
  'Groundnuts (Peanuts)': [
    'Virginia type',
    'Spanish type',
    'Runner type',
    'Valencia type',
  ],
  Soybeans: [
    'Yellow soybeans',
    'Green soybeans (edamame)',
    'Black soybeans',
  ],
  Cowpeas: [
    'Black-eyed pea type',
    'Brown crowder / field types',
    'Local landrace',
    'Other (note in price note if needed)',
  ],
  Chickpeas: [
    'Desi (small, dark)',
    'Kabuli (large, light)',
    'Mixed',
  ],
  Lentils: [
    'Red lentils',
    'Green lentils',
    'Brown lentils',
    'Other (note in price note if needed)',
  ],
  Cassava: [
    'Sweet cassava',
    'Bitter cassava',
  ],
  'Sweet potatoes': [
    'Orange-fleshed',
    'White-fleshed',
    'Purple / other flesh',
    'Other (note in price note if needed)',
  ],
  'Irish potatoes': [
    'Red-skinned',
    'White / yellow-flesh',
    'Other (note in price note if needed)',
  ],
  Coffee: [
    'Arabica',
    'Typica',
    'Bourbon',
    'SL28 / SL34',
    'Robusta',
    'Liberica',
  ],
  Tea: [
    'Black tea',
    'Green tea',
    'Oolong',
    'Other (white / purple / blended)',
  ],
  Cotton: [
    'Upland cotton',
    'Long-staple / Pima',
    'Other (note in price note if needed)',
  ],
  Tobacco: [
    'Flue-cured',
    'Burley',
    'Other (air-cured, sun, etc.)',
  ],
  Sugarcane: [
    'Commercial hybrid',
    'Local variety',
    'Other (note in price note if needed)',
  ],
  Onions: [
    'Red onions',
    'White onions',
    'Yellow onions',
  ],
  Tomatoes: [
    'Roma / plum',
    'Cherry / grape',
    'Beefsteak / large slicer',
    'Other (note in price note if needed)',
  ],
  Cabbage: [
    'Green cabbage',
    'Red cabbage',
    'Savoy cabbage',
  ],
  Spinach: [
    'Flat-leaf spinach',
    'Savoy spinach',
    'Other / baby leaf',
  ],
  'Other vegetables': [
    'Peppers (bell / hot)',
    'Eggplant',
    'Lettuce / salad greens',
    'Other (use price note)',
  ],
  /** Custom crop name typed under Other — generic list. */
  Other: [
    'Local landrace / farmer seed',
    'Certified / commercial variety',
    'Mix / not sure',
    'Other (describe in price note)',
  ],
};

/**
 * @param {string} producePick — from PRODUCE_OPTIONS, or "Other" with custom name
 */
export function getVarietyOptionsForProduce(producePick) {
  if (producePick && producePick !== 'Other' && VARIETY_BY_PRODUCE[producePick]) {
    return VARIETY_BY_PRODUCE[producePick];
  }
  return VARIETY_BY_PRODUCE.Other;
}
