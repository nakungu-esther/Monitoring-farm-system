const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Build a single search string from farm form fields (address / landmark + optional name). */
export function buildFarmGeocodeQuery({ address, name }) {
  const a = typeof address === 'string' ? address.trim() : '';
  const n = typeof name === 'string' ? name.trim() : '';
  if (a && n) return `${a}, ${n}`;
  return a || n || '';
}

function pickBest(results) {
  if (!results?.length) return null;
  const ug = results.find(
    (x) => x.country_code === 'UG' || /uganda/i.test(String(x.country || '')),
  );
  if (ug) return ug;
  return results[0];
}

async function geocodeSearch(name, countryCode) {
  const sp = new URLSearchParams({
    name,
    count: '10',
    language: 'en',
    format: 'json',
  });
  if (countryCode) sp.set('countryCode', countryCode);
  const res = await fetch(`${GEOCODE_URL}?${sp}`);
  if (!res.ok) return null;
  const data = await res.json();
  return pickBest(data.results);
}

function formatOk(r) {
  const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
  return { ok: true, latitude: r.latitude, longitude: r.longitude, label };
}

const NO_MATCH =
  'No place matched that text. Try a nearby town or district plus Uganda (e.g. “Mbale, Uganda”), or use GPS / enter coordinates yourself.';

/**
 * Forward-geocode a place name or address (Open-Meteo geocoding API — no key, browser CORS).
 * Tries Uganda-first, then global, then query with ", Uganda" appended.
 * @param {string} query
 * @returns {Promise<{ ok: true, latitude: number, longitude: number, label?: string } | { ok: false, error: string }>}
 */
export async function geocodePlaceName(query) {
  const q = query?.trim();
  if (!q) return { ok: false, error: 'Enter a place name or address first.' };

  const attempts = [
    () => geocodeSearch(q, 'UG'),
    () => geocodeSearch(q, undefined),
  ];
  if (!/uganda/i.test(q)) {
    attempts.push(() => geocodeSearch(`${q}, Uganda`, 'UG'));
    attempts.push(() => geocodeSearch(`${q}, Uganda`, undefined));
  }

  try {
    for (const run of attempts) {
      const r = await run();
      if (r) return formatOk(r);
    }
    return { ok: false, error: NO_MATCH };
  } catch {
    return { ok: false, error: 'Could not reach location service — check your connection.' };
  }
}
