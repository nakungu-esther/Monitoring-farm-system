import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudSun, Loader2, MapPin, Radio, RefreshCw } from 'lucide-react';
import {
  DEFAULT_UG,
  geocodeLocationName,
  fetchPrecipitationForecast,
  fetchMayHistoryStats,
  listForecastDays,
  sliceMayFromForecast,
  rainPlanningHint,
  HEAVY_RAIN_MM,
} from '../api/openMeteoWeather';

/**
 * @param {{ profileLocation: string; now?: Date; showTitle?: boolean }} props
 */
export default function FarmerWeatherCard({ profileLocation, now = new Date(), showTitle = true }) {
  const { t } = useTranslation();
  const [lat, setLat] = useState(DEFAULT_UG.lat);
  const [lon, setLon] = useState(DEFAULT_UG.lon);
  const [placeLabel, setPlaceLabel] = useState(() => t('farmerWeather.defaultPlace'));
  const [geocodeTried, setGeocodeTried] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(/** @type {string | null} */ (null));
  const [mayHistory, setMayHistory] = useState(
    /** @type {{ yearCount: number; avgMm: number; maxYearMm: number; wettestYear: string | null } | null} */ (null),
  );
  const [forecastDays, setForecastDays] = useState(
    /** @type { { date: string; mm: number; heavy: boolean }[] } */ ([]),
  );
  const [mayFC, setMayFC] = useState(
    /** @type {{ days: { date: string; mm: number; prob: number | null; heavy: boolean }[]; totalMm: number; heavyDays: number }} */ ({
      days: [],
      totalMm: 0,
      heavyDays: 0,
    }),
  );

  const load = useCallback(async (latitude, longitude) => {
    setLoading(true);
    setErr(null);
    try {
      const [fc, hist] = await Promise.all([
        fetchPrecipitationForecast(latitude, longitude, 16),
        fetchMayHistoryStats(latitude, longitude),
      ]);
      const daily = fc.daily;
      setMayHistory(hist);
      setForecastDays(listForecastDays(daily));
      setMayFC(sliceMayFromForecast(daily));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('farmerWeather.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loc = (profileLocation || '').trim();
      if (loc.length >= 2) {
        const g = await geocodeLocationName(loc);
        if (cancelled) return;
        if (g) {
          setLat(g.lat);
          setLon(g.lon);
          setPlaceLabel(g.label);
          setGeocodeTried(true);
          setGeocodeFailed(false);
          await load(g.lat, g.lon);
          return;
        }
        if (cancelled) return;
        setGeocodeTried(true);
        setGeocodeFailed(true);
        setPlaceLabel(t('farmerWeather.defaultPlace'));
        await load(DEFAULT_UG.lat, DEFAULT_UG.lon);
        return;
      }
      if (cancelled) return;
      setGeocodeTried(true);
      setGeocodeFailed(false);
      setPlaceLabel(t('farmerWeather.defaultPlace'));
      await load(DEFAULT_UG.lat, DEFAULT_UG.lon);
    })();
    return () => {
      cancelled = true;
    };
  }, [profileLocation, load, t]);

  const onUseDeviceLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErr(t('farmerWeather.noGeolocation'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setGeocodeFailed(false);
        setLat(la);
        setLon(lo);
        setPlaceLabel(t('farmerWeather.deviceLocation'));
        await load(la, lo);
      },
      () => {
        setErr(t('farmerWeather.geoDenied'));
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 20_000 },
    );
  }, [load, t]);

  const hint = useMemo(() => {
    if (!mayHistory) return { showDrainageTip: false, veryWetHistory: false, wetMayInForecast: false };
    return rainPlanningHint({
      avgMm: mayHistory.avgMm,
      maxYearMm: mayHistory.maxYearMm,
      heavyInMayForecast: mayFC.heavyDays,
      mayDaysInWindow: mayFC.days.length,
      totalMayForecastMm: mayFC.totalMm,
    });
  }, [mayHistory, mayFC]);

  const monthNameMay = t('farmerWeather.monthMay');
  const currentMonth = now.getMonth() + 1; // 1–12
  const isApril = currentMonth === 4;

  return (
    <section
      className="rounded-2xl border border-sky-200/80 bg-gradient-to-b from-sky-50/90 to-white p-5 shadow-sm dark:border-sky-900/50 dark:from-sky-950/40 dark:to-zinc-950/40"
      aria-labelledby={showTitle ? 'farmer-weather-h' : undefined}
      aria-label={showTitle ? undefined : t('farmerWeather.title')}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
            <CloudSun className="size-6" aria-hidden />
          </div>
          <div className="min-w-0">
            {showTitle ? (
              <h2 id="farmer-weather-h" className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {t('farmerWeather.title')}
              </h2>
            ) : null}
            <p className={showTitle ? 'mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400' : 'flex flex-wrap items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400'}>
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 break-words font-medium text-zinc-800 dark:text-zinc-200">{placeLabel}</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{t('farmerWeather.lead')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onUseDeviceLocation}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-900 shadow-sm transition hover:bg-sky-50 dark:border-sky-800 dark:bg-zinc-900 dark:text-sky-100 dark:hover:bg-zinc-800"
          >
            <Radio className="size-3.5" aria-hidden />
            {t('farmerWeather.useGps')}
          </button>
          <button
            type="button"
            onClick={() => load(lat, lon)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
            {t('farmerWeather.refresh')}
          </button>
        </div>
      </div>

      {err ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {err}
        </p>
      ) : null}

      {loading && !mayHistory && !err ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t('common.loading')}
        </div>
      ) : null}

      {!loading || mayHistory ? (
        <div className="mt-4 space-y-4 text-sm text-zinc-800 dark:text-zinc-200">
          {geocodeTried && geocodeFailed ? (
            <p className="m-0 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              {t('farmerWeather.fallbackGeocode')}
            </p>
          ) : null}

          {hint.showDrainageTip ? (
            <div
              className="rounded-xl border border-amber-300/80 bg-amber-50/90 px-3 py-2.5 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-50"
              role="status"
            >
              <p className="m-0 font-bold">{t('farmerWeather.alertHead')}</p>
              <p className="m-0 mt-1.5 text-sm font-normal leading-relaxed">{t('farmerWeather.alertBody')}</p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200/90 bg-white/80 p-3 dark:border-zinc-700/80 dark:bg-zinc-900/30">
              <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-zinc-500">{t('farmerWeather.histMay', { month: monthNameMay })}</h3>
              {mayHistory && mayHistory.yearCount > 0 ? (
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  <li>
                    {t('farmerWeather.avgMayMm', { mm: mayHistory.avgMm.toFixed(0), years: mayHistory.yearCount })}
                  </li>
                  <li>
                    {t('farmerWeather.wettestMay', {
                      mm: mayHistory.maxYearMm.toFixed(0),
                      year: mayHistory.wettestYear || '—',
                    })}
                  </li>
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">{t('farmerWeather.noHistory')}</p>
              )}
              <p className="m-0 mt-2 text-xs text-zinc-500">{t('farmerWeather.histHint', { month: monthNameMay })}</p>
            </div>

            <div className="rounded-xl border border-zinc-200/90 bg-white/80 p-3 dark:border-zinc-700/80 dark:bg-zinc-900/30">
              <h3 className="m-0 text-xs font-bold uppercase tracking-wide text-zinc-500">{t('farmerWeather.forecast16')}</h3>
              {mayFC.days.length > 0 ? (
                <p className="m-0 mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {t('farmerWeather.mayInWindow', {
                    days: mayFC.days.length,
                    total: mayFC.totalMm.toFixed(0),
                    heavy: mayFC.heavyDays,
                    mm: HEAVY_RAIN_MM,
                    month: monthNameMay,
                  })}
                </p>
              ) : isApril ? (
                <p className="m-0 mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {t('farmerWeather.mayNotIn16', { month: monthNameMay })}
                </p>
              ) : (
                <p className="m-0 mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {t('farmerWeather.mayNotIn16Generic', { month: monthNameMay })}
                </p>
              )}

              {forecastDays.length > 0 ? (
                <ul className="mt-2 max-h-28 overflow-y-auto text-xs text-zinc-600 dark:text-zinc-400">
                  {forecastDays.slice(0, 7).map((d) => (
                    <li key={d.date} className="flex justify-between gap-2 border-b border-zinc-100 py-0.5 last:border-0 dark:border-zinc-800">
                      <span>{d.date}</span>
                      <span>
                        {d.mm.toFixed(1)} mm
                        {d.heavy ? ` · ${t('farmerWeather.heavy')}` : ''}
                      </span>
                    </li>
                  ))}
                  {forecastDays.length > 7 ? (
                    <li className="pt-0.5 text-zinc-500">+{forecastDays.length - 7} {t('farmerWeather.moreDays')}</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          </div>

          <p className="m-0 text-xs text-zinc-500">
            {t('farmerWeather.attrib')}
            {t('farmerWeather.profileHint')}
          </p>
        </div>
      ) : null}
    </section>
  );
}
