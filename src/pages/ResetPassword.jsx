import React, { useState } from 'react';
import { Link, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import { API_ENABLED } from '../config';
import { popupError, popupSuccess } from '../utils/popupAlerts';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PasswordFieldWithEye from '../components/PasswordFieldWithEye';
import { passwordMeetsApiRules, passwordLengthOk } from '../utils/authValidation';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() || '';
  const { currentUser, resetPasswordWithToken } = useAgriTrack();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  if (currentUser) return <Navigate to="/" replace />;

  const minLen = API_ENABLED ? 10 : 6;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      await popupError(t('resetPage.errMismatch'));
      return;
    }
    if (!passwordLengthOk(password, API_ENABLED)) {
      await popupError(t('resetPage.errMin', { n: minLen }));
      return;
    }
    if (API_ENABLED && !passwordMeetsApiRules(password)) {
      await popupError(t('resetPage.errRules'));
      return;
    }
    if (!token) {
      await popupError(t('resetPage.errMissingToken'));
      return;
    }
    setLoading(true);
    try {
      const r = await resetPasswordWithToken(token, password);
      if (!r.ok) {
        await popupError(r.error);
        return;
      }
      await popupSuccess(t('resetPage.success'), t('resetPage.successTitle'));
      navigate('/auth');
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
          {t('resetPage.backLogin')}
        </Link>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('resetPage.account')}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
            {t('resetPage.title')}
          </h1>

          {!token ? (
            <p className="mt-4 text-sm text-slate-700">
              {t('resetPage.needToken')}{' '}
              <Link to="/auth/forgot-password" className="font-semibold text-emerald-700 hover:underline">
                {t('resetPage.requestNew')}
              </Link>
              .
            </p>
          ) : null}

          {token ? (
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">{t('resetPage.newPassword')}</span>
                <PasswordFieldWithEye
                  id="reset-new-password"
                  name="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  show={showNew}
                  onToggleShow={() => setShowNew((v) => !v)}
                  showLabel={t('resetPage.showPassword')}
                  hideLabel={t('resetPage.hidePassword')}
                  autoComplete="new-password"
                  leftIcon={false}
                  variant="slate"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">{t('resetPage.confirm')}</span>
                <PasswordFieldWithEye
                  id="reset-confirm-password"
                  name="new-password-confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  show={showConfirm}
                  onToggleShow={() => setShowConfirm((v) => !v)}
                  showLabel={t('resetPage.showPassword')}
                  hideLabel={t('resetPage.hidePassword')}
                  autoComplete="new-password"
                  leftIcon={false}
                  variant="slate"
                />
              </label>
              {API_ENABLED ? <p className="text-xs text-slate-500">{t('resetPage.minRules')}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? t('resetPage.saving') : t('resetPage.submit')}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
