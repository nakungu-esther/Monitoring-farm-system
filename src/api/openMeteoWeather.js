/**
 * Open-Meteo (https://open-meteo.com) — no API key; browser CORS allowed.
 * Precipitation signals for year-round farm planning (short forecast + May long-rains benchmark for UG-style calendars).
 */

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const GEO = 'https://geocoding-api.open-meteo.com/v1/search';

/** ~Kampala — used when profile geocoding fails */
export const DEFAULT_UG = { lat: 0.3476, lon: 32.5825, label: 'Central Uganda (default)' };

/** Day total at or above this (mm) counts as “heavy” for alerts */
export const HEAVY_RAIN_MM = 20;

/**
 * @param {string} name
 * @returns {Promise<{ lat: number; lon: number; label: string } | null>}
 */
export async function geocodeLocationName(name) {
  const q = (name || '').trim();
  if (q.length < 2) return null;
  const url = `${GEO}?${new URLSearchParams({ name: q, count: '1', language: 'en', format: 'json' })}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const r = data.results?.[0];
  if (!r) return null;
  const label = [r.name, r.admin1, r.country_code || r.country].filter(Boolean).join(', ');
  return { lat: r.latitude, lon: r.longitude, label: label || q };
}

export async function fetchPrecipitationForecast(lat, lon, forecastDays = 16) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'precipitation_sum,precipitation_probability_max',
    forecast_days: String(forecastDays),
    timezone: 'auto',
  });
  const res = await fetch(`${FORECAST}?${params}`);
  if (!res.ok) throw new Error(`Forecast HTTP ${res.status}`);
  const data = await res.json();
  return data;
}

export async function fetchPrecipitationArchive(lat, lon, startDate, endDate) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: startDate,
    end_date: endDate,
    daily: 'precipitation_sum',
    timezone: 'auto',
  });
  const res = await fetch(`${ARCHIVE}?${params}`);
  if (!res.ok) throw new Error(`Archive HTTP ${res.status}`);
  return res.json();
}

/** Multi-year daily → May totals (wet-season reference alongside all-season planning). */
export async function fetchMayHistoryStats(lat, lon) {
  const data = await fetchPrecipitationArchive(lat, lon, '2017-01-01', '2024-12-31');
  return parseMayHistory(data.daily);
}

/**
 * Sum May totals per year from daily archive series.
 * @param {{ time: string[]; precipitation_sum: (number|null)[] }|null|undefined} daily
 */
export function parseMayHistory(daily) {
  if (!daily?.time?.length) {
    return { yearCount: 0, avgMm: 0, maxYearMm: 0, wettestYear: null };
  }
  /** @type {Record<string, number>} */
  const byYear = {};
  for (let i = 0; i < daily.time.length; i += 1) {
    const t = daily.time[i];
    if (!t || t.slice(5, 7) !== '05') continue;
    const y = t.slice(0, 4);
    const p = daily.precipitation_sum[i];
    if (p == null || Number.isNaN(p)) continue;
    byYear[y] = (byYear[y] || 0) + p;
  }
  const entries = Object.entries(byYear);
  if (entries.length === 0) {
    return { yearCount: 0, avgMm: 0, maxYearMm: 0, wettestYear: null };
  }
  const totals = entries.map(([, v]) => v);
  const maxYearMm = Math.max(...totals);
  const wettestYear = entries.find(([, v]) => v === maxYearMm)?.[0] ?? null;
  const avgMm = totals.reduce((a, b) => a + b, 0) / totals.length;
  return {
    yearCount: entries.length,
    avgMm,
    maxYearMm,
    wettestYear,
  };
}

/**
 * May days in the forecast window when present (e.g. late April run may include early May).
 * @param {{ time: string[]; precipitation_sum: (number|null)[]; precipitation_probability_max?: (number|null)[] }|null|undefined} daily
 * @param {number} [heavyMm]
 */
export function sliceMayFromForecast(daily, heavyMm = HEAVY_RAIN_MM) {
  if (!daily?.time) return { days: [], totalMm: 0, heavyDays: 0 };
  const days = [];
  for (let i = 0; i < daily.time.length; i += 1) {
    const t = daily.time[i];
    if (t?.slice(5, 7) !== '05') continue;
    const mm = daily.precipitation_sum[i] ?? 0;
    const prob = daily.precipitation_probability_max?.[i] ?? null;
    const heavy = mm >= heavyMm;
    days.push({ date: t, mm, prob, heavy });
  }
  const totalMm = days.reduce((s, d) => s + d.mm, 0);
  const heavyDays = days.filter((d) => d.heavy).length;
  return { days, totalMm, heavyDays };
}

/**
 * @param {{ time: string[]; precipitation_sum: (number|null)[] }|null|undefined} daily
 * @param {number} [heavyMm]
 * @returns {{ date: string; mm: number; heavy: boolean }[]}
 */
export function listForecastDays(daily, heavyMm = HEAVY_RAIN_MM) {
  if (!daily?.time) return [];
  return daily.time.map((t, i) => {
    const mm = daily.precipitation_sum[i] ?? 0;
    return { date: t, mm, heavy: mm >= heavyMm };
  });
}

/**
 * Suggest a planning notice when the window is likely very wet (works with dry-season tasks in calmer periods).
 * @param {{ avgMm: number; maxYearMm: number; heavyInMayForecast: number; mayDaysInWindow: number; totalMayForecastMm: number }} p
 */
export function rainPlanningHint(p) {
  const { avgMm, maxYearMm, heavyInMayForecast, mayDaysInWindow, totalMayForecastMm } = p;
  const veryWetHistory = maxYearMm >= 200 || avgMm >= 120;
  const wetMayInForecast =
    mayDaysInWindow > 0 && (heavyInMayForecast >= 2 || (totalMayForecastMm ?? 0) >= 50);
  return { veryWetHistory, wetMayInForecast, showDrainageTip: veryWetHistory || wetMayInForecast };
}
