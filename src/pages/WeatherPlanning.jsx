import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, CloudSun } from 'lucide-react';
import FarmerWeatherCard from '../components/FarmerWeatherCard';
import { useAgriTrack } from '../context/AgriTrackContext';

/**
 * Full-page seasonal weather (Open-Meteo): forecasts + long-rains reference. Same card as on Seasonal for farmers.
 */
export default function WeatherPlanning() {
  const { t } = useTranslation();
  const { currentUser } = useAgriTrack();

  return (
    <div className="page mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CloudSun className="size-7 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden />
            {t('page.weather.title')}
          </h1>
          <p className="page-lead muted max-w-2xl">{t('page.weather.sub')}</p>
        </div>
        <Link
          to="/seasonal"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-100"
        >
          <Calendar className="size-4" aria-hidden />
          {t('page.weather.linkSeasonal')}
        </Link>
      </div>
      <FarmerWeatherCard
        showTitle={false}
        profileLocation={currentUser?.profile?.location || ''}
      />
    </div>
  );
}
