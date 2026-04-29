import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { PRODUCE_OPTIONS, resolveProduceOption } from '../constants/produce';
import FarmerWeatherCard from '../components/FarmerWeatherCard';
import { isNonEmptyTrimmed, isValidIsoDateString } from '../utils/authValidation';
import { Pencil, Trash2, CalendarClock, Sprout } from 'lucide-react';

function initForm() {
  return {
    plantDate: new Date().toISOString().slice(0, 10),
    expectedHarvestDate: '',
    farmId: '',
    notes: '',
  };
}

export default function Seasonal() {
  const { t } = useTranslation();
  const {
    visibleSeasonalPlans,
    visibleFarms,
    addSeasonalPlan,
    updateSeasonalPlan,
    deleteSeasonalPlan,
    seasonalReminders,
    currentUser,
  } = useAgriTrack();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [cropPick, setCropPick] = useState(PRODUCE_OPTIONS[0]);
  const [customCrop, setCustomCrop] = useState('');
  const [form, setForm] = useState(() => initForm());

  const crop = cropPick === 'Other' ? customCrop.trim() : cropPick;

  const openAdd = () => {
    setEditingPlan(null);
    setCropPick(PRODUCE_OPTIONS[0]);
    setCustomCrop('');
    setForm(initForm());
    setOpen(true);
  };

  const openEdit = (p) => {
    const resolved = resolveProduceOption(p.crop);
    const inList = PRODUCE_OPTIONS.includes(resolved);
    setEditingPlan(p);
    setCropPick(inList ? resolved : 'Other');
    setCustomCrop(inList ? '' : p.crop);
    setForm({
      plantDate: p.plantDate,
      expectedHarvestDate: p.expectedHarvestDate,
      farmId: p.farmId || '',
      notes: p.notes || '',
    });
    setOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (cropPick === 'Other' && !isNonEmptyTrimmed(customCrop)) {
      toast('Enter crop name', 'warn');
      return;
    }
    if (!isValidIsoDateString(form.plantDate)) {
      toast('Set a valid plant date.', 'warn');
      return;
    }
    if (!isValidIsoDateString(form.expectedHarvestDate)) {
      toast('Set an expected harvest date.', 'warn');
      return;
    }
    const row = {
      crop,
      plantDate: form.plantDate,
      expectedHarvestDate: form.expectedHarvestDate,
      farmId: form.farmId || null,
      notes: form.notes,
    };
    if (editingPlan) {
      const r = await updateSeasonalPlan(editingPlan.id, row);
      if (r?.ok === false) {
        toast(r.error || t('seasonalPage.errSave'), 'error');
        return;
      }
      toast(t('seasonalPage.updated'));
    } else {
      const r = await addSeasonalPlan(row);
      if (r?.ok === false) {
        toast(r.error || t('seasonalPage.errSave'), 'error');
        return;
      }
      toast(t('seasonalPage.addSaved'));
    }
    setOpen(false);
    setEditingPlan(null);
    setCropPick(PRODUCE_OPTIONS[0]);
    setCustomCrop('');
    setForm(initForm());
  };

  const onDelete = async (p) => {
    if (typeof window !== 'undefined' && !window.confirm(t('seasonalPage.deleteConfirm'))) {
      return;
    }
    const r = await deleteSeasonalPlan(p.id);
    if (r?.ok === false) {
      toast(r.error || t('seasonalPage.errDelete'), 'error');
      return;
    }
    toast(t('seasonalPage.deleted'));
  };

  const closeModal = () => {
    setOpen(false);
    setEditingPlan(null);
  };

  const farmLabel = (id) => visibleFarms.find((f) => f.id === id)?.name || '—';

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              <CalendarClock className="size-5 text-emerald-700" aria-hidden />
              Seasonal planning
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Planting and harvest windows for operational planning and reminders.
            </p>
          </div>
          <button type="button" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800" onClick={openAdd}>
          {t('seasonalPage.addPlan')}
          </button>
        </div>
      </section>

      {currentUser?.role === 'farmer' ? (
        <section id="season-weather" className="mb-8" aria-label={t('farmerWeather.title')}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-sm text-slate-600">
              {t('seasonalPage.weatherHint')}{' '}
              <Link className="font-semibold text-sky-800 hover:underline" to="/weather">
                {t('page.weather.title')}
              </Link>
            </p>
          </div>
          <FarmerWeatherCard profileLocation={currentUser?.profile?.location || ''} />
        </section>
      ) : null}

      {seasonalReminders.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-slate-900">Upcoming reminders</h2>
          <ul className="mt-3 space-y-2">
            {seasonalReminders.slice(0, 8).map((r) => (
              <li key={r.id} className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-950">
                {r.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
          <Sprout className="size-4 text-emerald-700" aria-hidden />
          Planting calendar
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Crop</th>
                <th className="px-4 py-3">Plant</th>
                <th className="px-4 py-3">Expected harvest</th>
                <th className="px-4 py-3">Farm</th>
                <th className="px-4 py-3">Notes</th>
                <th className="w-[1%] whitespace-nowrap px-4 py-3">{t('seasonalPage.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleSeasonalPlans.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon="📅"
                      title="No seasonal plans"
                      hint="Add maize, beans, or other crops with target dates."
                    />
                  </td>
                </tr>
              ) : (
                visibleSeasonalPlans
                  .slice()
                  .sort((a, b) => (a.plantDate < b.plantDate ? 1 : -1))
                  .map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.crop}</td>
                      <td className="px-4 py-3 text-slate-700">{p.plantDate}</td>
                      <td className="px-4 py-3 text-slate-700">{p.expectedHarvestDate}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{farmLabel(p.farmId)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                          <button
                            type="button"
                            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            title={t('seasonalPage.edit')}
                            aria-label={t('seasonalPage.edit')}
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="size-4" strokeWidth={2} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/40"
                            title={t('seasonalPage.delete')}
                            aria-label={t('seasonalPage.delete')}
                            onClick={() => onDelete(p)}
                          >
                            <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title={editingPlan ? t('seasonalPage.modalEdit') : t('seasonalPage.modalAdd')} isOpen={open} onClose={closeModal}>
        <form onSubmit={onSubmit} className="modal-form" noValidate>
          <label className="auth-field">
            <span className="auth-label">Crop</span>
            <select value={cropPick} onChange={(e) => setCropPick(e.target.value)}>
              {PRODUCE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          {cropPick === 'Other' ? (
            <label className="auth-field">
              <span className="auth-label">Custom crop</span>
              <input
                value={customCrop}
                onChange={(e) => setCustomCrop(e.target.value)}
              />
            </label>
          ) : null}
          <label className="auth-field">
            <span className="auth-label">Plant date</span>
            <input
              type="date"
              value={form.plantDate}
              onChange={(e) => setForm((f) => ({ ...f, plantDate: e.target.value }))}
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Expected harvest</span>
            <input
              type="date"
              value={form.expectedHarvestDate}
              onChange={(e) => setForm((f) => ({ ...f, expectedHarvestDate: e.target.value }))}
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Farm (optional)</span>
            <select
              value={form.farmId}
              onChange={(e) => setForm((f) => ({ ...f, farmId: e.target.value }))}
            >
              <option value="">—</option>
              {visibleFarms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="auth-field">
            <span className="auth-label">Notes</span>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Variety, rains, inputs…"
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {t('seasonalPage.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
