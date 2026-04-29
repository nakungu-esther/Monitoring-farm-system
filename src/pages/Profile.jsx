import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, MapPin, Shield, KeyRound, ArrowRight, Smartphone, Building2, Upload, Trash2 } from 'lucide-react';
import { SLUSH_APP_URL } from '../config/suiWallets';
import { useAgriTrack } from '../context/AgriTrackContext';
import { useToast } from '../context/ToastContext';
import { isValidPhoneLoose, minTrimmedLength } from '../utils/authValidation';

export default function Profile() {
  const { t } = useTranslation();
  const { currentUser, updateProfile } = useAgriTrack();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    location: '',
    suiAddress: '',
    photoDataUrl: '',
    receiveMoneyPhone: '',
    receiveMoneyName: '',
    bankDetails: '',
  });

  useEffect(() => {
    if (currentUser) {
      setForm({
        name: currentUser.profile.name,
        phone: currentUser.profile.phone,
        location: currentUser.profile.location,
        suiAddress: currentUser.profile.suiAddress || '',
        photoDataUrl: currentUser.profile.photoDataUrl || '',
        receiveMoneyPhone: currentUser.profile.receiveMoneyPhone || '',
        receiveMoneyName: currentUser.profile.receiveMoneyName || '',
        bankDetails: currentUser.profile.bankDetails || '',
      });
    }
  }, [currentUser]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!minTrimmedLength(form.name, 1)) {
      toast(t('profilePage.errName'), 'warn');
      return;
    }
    if (!isValidPhoneLoose(form.phone)) {
      toast(t('profilePage.errPhone'), 'warn');
      return;
    }
    if (!minTrimmedLength(form.location, 1)) {
      toast(t('profilePage.errLocation'), 'warn');
      return;
    }
    const r = await updateProfile(form);
    if (r?.ok === false) {
      toast(r.error || t('profilePage.errSave'), 'error');
      return;
    }
    toast(r?.offline && r.message ? r.message : t('profilePage.updated'));
  };

  const onPhotoPicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Choose an image file.', 'warn');
      return;
    }
    if (file.size > 1_500_000) {
      toast('Image too large. Use under 1.5 MB.', 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      if (!url) {
        toast('Could not read image.', 'error');
        return;
      }
      setForm((f) => ({ ...f, photoDataUrl: url }));
    };
    reader.onerror = () => toast('Could not read image.', 'error');
    reader.readAsDataURL(file);
  };

  const jumpToEditForm = () => {
    const el = document.getElementById('pf-name');
    if (!el) return;
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!currentUser) return null;

  const displayRole = currentUser.role === 'admin' ? 'farmer' : currentUser.role;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-xl font-bold text-white shadow-md sm:size-20 sm:text-2xl">
            {form.photoDataUrl ? (
              <img
                src={form.photoDataUrl}
                alt=""
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              currentUser.profile?.name?.charAt(0) || '?'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {currentUser.profile?.name}
            </h1>
            <button
              type="button"
              onClick={jumpToEditForm}
              className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              Edit profile
            </button>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-800">
              <Shield className="size-3.5" aria-hidden />
              {displayRole}
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <Mail className="size-4 shrink-0 text-slate-400" aria-hidden />
              <span className="break-all">{currentUser.email}</span>
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-3" noValidate>
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
              <User className="size-5 text-emerald-700" aria-hidden />
              {t('profilePage.contactTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t('profilePage.contactLead')}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="pf-name">
                  {t('profilePage.fullName')}
                </label>
                <input
                  id="pf-name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-slate-900 outline-none ring-emerald-600/0 transition focus:border-emerald-500/50 focus:bg-white focus:ring-4"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="pf-phone">
                  <Phone className="size-3.5" aria-hidden />
                  {t('profilePage.phone')}
                </label>
                <input
                  id="pf-phone"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="pf-loc">
                  <MapPin className="size-3.5" aria-hidden />
                  {t('profilePage.location')}
                </label>
                <input
                  id="pf-loc"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  autoComplete="address-level1"
                />
              </div>
            </div>
          </section>

          {displayRole === 'farmer' ? (
            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm sm:p-6">
              <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-950 sm:text-base">
                <Smartphone className="size-4 text-emerald-700" aria-hidden />
                {t('profilePage.receivePaymentsTitle')}
              </h3>
              <p className="mt-1.5 text-xs text-emerald-900/80 sm:text-sm">{t('profilePage.receivePaymentsLead')}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor="pf-recv-phone">
                    {t('profilePage.receiveMoneyPhone')}
                  </label>
                  <p className="mb-2 text-xs text-slate-500">{t('profilePage.receiveMoneyPhoneHint')}</p>
                  <input
                    id="pf-recv-phone"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-600/15"
                    value={form.receiveMoneyPhone}
                    onChange={(e) => setForm((f) => ({ ...f, receiveMoneyPhone: e.target.value }))}
                    placeholder="+256…"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor="pf-recv-name">
                    {t('profilePage.receiveMoneyName')}
                  </label>
                  <input
                    id="pf-recv-name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-600/15"
                    value={form.receiveMoneyName}
                    onChange={(e) => setForm((f) => ({ ...f, receiveMoneyName: e.target.value }))}
                    placeholder="Name on MoMo wallet"
                    autoComplete="name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor="pf-bank">
                    <Building2 className="size-3.5" aria-hidden />
                    {t('profilePage.bankDetails')}
                  </label>
                  <textarea
                    id="pf-bank"
                    rows={3}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-600/15"
                    value={form.bankDetails}
                    onChange={(e) => setForm((f) => ({ ...f, bankDetails: e.target.value }))}
                    placeholder={t('profilePage.bankDetailsPlaceholder')}
                  />
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-sm font-bold text-slate-900">Profile photo (optional)</h3>
            <p className="mt-1 text-xs text-slate-500">
              Upload a photo, or leave empty to use your name initial.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <Upload className="size-4" aria-hidden />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPhotoPicked}
                />
              </label>
              {form.photoDataUrl ? (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, photoDataUrl: '' }))}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Remove
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="pf-sui">
              {t('profilePage.suiLabel')}
            </label>
            <p className="mb-2 text-xs text-slate-500">
              {t('profilePage.suiHelpStart')}
              <a className="font-semibold text-emerald-700 hover:underline" href={SLUSH_APP_URL} target="_blank" rel="noreferrer">
                Slush
              </a>
              {t('profilePage.suiHelpEnd')}
            </p>
            <input
              id="pf-sui"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-emerald-500/50 focus:bg-white focus:ring-4 focus:ring-emerald-600/15"
              value={form.suiAddress}
              onChange={(e) => setForm((f) => ({ ...f, suiAddress: e.target.value }))}
              placeholder={t('profilePage.suiPlaceholder')}
              autoComplete="off"
            />
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <KeyRound className="size-5 shrink-0 text-slate-500" aria-hidden />
              <div>
                <h3 className="font-semibold text-slate-900">{t('profilePage.securityTitle')}</h3>
                <p className="mt-1 text-sm text-slate-600">{t('profilePage.securityLead')}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs text-slate-500">{t('profilePage.passwordNote')}</p>
            <button
              type="submit"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              {t('profilePage.saveChanges')}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </section>
        </div>
      </form>
    </div>
  );
}
