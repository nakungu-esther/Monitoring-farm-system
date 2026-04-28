import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAgriTrack } from '../context/AgriTrackContext';
import { popupError } from '../utils/popupAlerts';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { isValidEmail } from '../utils/authValidation';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const { currentUser, requestPasswordReset } = useAgriTrack();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (currentUser) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    const trimmed = String(email).trim();
    if (!isValidEmail(trimmed)) {
      await popupError(t('forgotPage.valEmail'), t('auth.almostThere'));
      return;
    }
    setLoading(true);
    try {
      const r = await requestPasswordReset(trimmed);
      if (!r.ok) {
        await popupError(r.error);
        return;
      }
      if (r.devResetUrl) {
        await Swal.fire({
          icon: 'success',
          title: t('forgotPage.swalDev'),
          html: `${r.message}<br><br><a href="${r.devResetUrl}" rel="noreferrer" class="swal2-confirm" style="display:inline-block;margin-top:8px;padding:10px 18px;background:#059669;color:#fff;border-radius:8px;font-weight:600;text-decoration:none">${t('forgotPage.openReset')}</a><p style="margin-top:12px;font-size:12px;opacity:0.85">${t('forgotPage.swalDevNote')}</p>`,
          confirmButtonColor: '#059669',
          confirmButtonText: t('forgotPage.close'),
        });
      } else if (r.localResetPath) {
        await Swal.fire({
          icon: 'success',
          title: t('forgotPage.swalReady'),
          html: `${r.message}<br><br><a href="${r.localResetPath}" class="swal2-confirm" style="display:inline-block;margin-top:8px;padding:10px 18px;background:#059669;color:#fff;border-radius:8px;font-weight:600;text-decoration:none">${t('forgotPage.openReset')}</a>`,
          confirmButtonColor: '#059669',
          confirmButtonText: t('forgotPage.close'),
        });
      } else {
        await Swal.fire({
          icon: 'success',
          title: t('forgotPage.swalEmail'),
          text: r.message,
          confirmButtonColor: '#059669',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <Link
          to="/auth"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('forgotPage.backLogin')}
        </Link>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('forgotPage.account')}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
            {t('forgotPage.title')}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{t('forgotPage.lead')}</p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">{t('forgotPage.email')}</span>
              <input
                type="text"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('forgotPage.placeholderEmail')}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? t('forgotPage.sending') : t('forgotPage.sendInstructions')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
