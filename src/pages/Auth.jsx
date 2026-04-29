import React, { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
  Mail,
  User,
  Sprout,
  Store,
  Check,
  Globe,
  BookOpen,
  Star,
  ArrowRight,
  Loader2,
  Radio,
} from 'lucide-react';
import { useAgriTrack } from '../context/AgriTrackContext';
import { API_ENABLED } from '../config';
import { getStoredToken } from '../api/auth';
import { popupError, popupSuccess } from '../utils/popupAlerts';
import PasswordFieldWithEye from '../components/PasswordFieldWithEye';
import {
  isValidPhoneLoose,
  isValidEmail,
  passwordMeetsApiRules,
  loginIdentifierValidationKey,
  passwordLengthOk,
  minTrimmedLength,
} from '../utils/authValidation';

const QUICK_LOGIN_PRESETS = {
  farmer: { identifier: 'farmer@agritrack.demo', password: 'farmer123' },
  trader: { identifier: 'trader@agritrack.demo', password: 'trader123' },
};

const REG_BULLETS = ['regBullet1', 'regBullet2', 'regBullet3', 'regBullet4', 'regBullet5'];

export default function Auth() {
  const { t, i18n } = useTranslation();
  const { currentUser, login, register } = useAgriTrack();

  const [mode, setMode] = useState('login');
  const [quickAccountRole, setQuickAccountRole] = useState('farmer');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [regForm, setRegForm] = useState({
    email: '',
    password: '',
    role: 'farmer',
    name: '',
    phone: '',
    location: '',
  });
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  const loginLeftHeadline = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('auth.headlineMorning');
    if (hour < 17) return t('auth.headlineNoon');
    return t('auth.headlineEvening');
  }, [t, i18n.language]);

  /** Keep demo presets available unless explicitly hidden by env flag. */
  const showQuickLogin = import.meta.env.VITE_HIDE_QUICK_LOGIN !== 'true';

  /** In API mode, only treat as signed-in when JWT exists — avoids loop: 401 clears token → /auth → Navigate to /. */
  const hasEffectiveSession =
    !!currentUser && (!API_ENABLED || !!getStoredToken());

  if (hasEffectiveSession) {
    return <Navigate to="/" replace />;
  }

  const applyQuickAccount = (role) => {
    setQuickAccountRole(role);
    const d = QUICK_LOGIN_PRESETS[role];
    if (d) setLoginForm({ identifier: d.identifier, password: d.password });
  };

  const onLogin = async (e) => {
    e.preventDefault();
    const id = String(loginForm.identifier).trim();
    const pwd = loginForm.password;
    if (!pwd) {
      await popupError(t('auth.valPasswordEmpty'), t('auth.almostThere'));
      return;
    }
    const idKey = loginIdentifierValidationKey(id, API_ENABLED);
    if (idKey) {
      await popupError(t(`auth.${idKey}`), t('auth.almostThere'));
      return;
    }
    setLoginBusy(true);
    try {
      const r = await login(id, pwd);
      if (!r.ok) {
        await popupError(r.error, t('auth.signInFailed'));
        return;
      }
      if (r.offline && r.message) {
        await popupSuccess(r.message, t('auth.workingOffline'));
      }
    } finally {
      setLoginBusy(false);
    }
  };

  const onRegister = async (e) => {
    e.preventDefault();
    if (!agreedTerms) {
      await popupError(t('auth.acceptTerms'), t('auth.almostThere'));
      return;
    }
    if (API_ENABLED && regForm.role === 'admin') {
      await popupError(t('auth.registerFailAdmin'), t('auth.regNotAllowed'));
      return;
    }
    const name = regForm.name.trim();
    const location = regForm.location.trim();
    const email = regForm.email.trim();
    const pwd = regForm.password;
    if (!minTrimmedLength(name, 2)) {
      await popupError(t('auth.valNameMin'), t('auth.almostThere'));
      return;
    }
    if (!isValidPhoneLoose(regForm.phone)) {
      await popupError(t('auth.valPhone'), t('auth.almostThere'));
      return;
    }
    if (!minTrimmedLength(location, 2)) {
      await popupError(t('auth.valLocationMin'), t('auth.almostThere'));
      return;
    }
    if (!isValidEmail(email)) {
      await popupError(t('auth.valEmail'), t('auth.almostThere'));
      return;
    }
    if (!passwordLengthOk(pwd, API_ENABLED)) {
      const minPwd = API_ENABLED ? 10 : 6;
      await popupError(t('auth.valPasswordShort', { min: minPwd }), t('auth.almostThere'));
      return;
    }
    if (API_ENABLED && !passwordMeetsApiRules(pwd)) {
      await popupError(t('auth.valPasswordRules'), t('auth.almostThere'));
      return;
    }
    const r = await register({ ...regForm, email, name, location });
    if (!r.ok) {
      await popupError(r.error, t('auth.regFailed'));
      return;
    }
    if (r.offline && r.message) {
      await popupSuccess(r.message, t('auth.savedDevice'));
    } else {
      await popupSuccess(t('auth.accountCreated'), t('auth.accountCreatedTitle'));
    }
    setLoginForm((f) => ({ ...f, identifier: email }));
    setMode('login');
  };

  const quickRoleRows = [
    { id: 'farmer', key: 'farmer', Icon: Sprout },
    { id: 'trader', key: 'trader', Icon: Store },
  ];

  return (
    <div className="w-full min-h-[100dvh] overflow-y-auto bg-white">
      <div className="grid min-h-[100dvh] lg:grid-cols-2">
        <div
          className={`relative flex min-h-0 flex-col justify-between px-8 py-10 text-white sm:px-12 lg:px-14 lg:py-14 ${
            mode === 'login'
              ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700'
              : 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800'
          }`}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
            <div className="absolute -left-20 top-20 size-72 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-10 right-0 size-96 rounded-full bg-white blur-3xl" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/20 shadow-lg ring-1 ring-white/30">
                <img src="/logo.png" alt="" className="size-8 object-contain" width={32} height={32} />
              </div>
              <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">AgriTrack</span>
            </div>
            <h1 className="mt-10 max-w-md font-[family-name:var(--font-display)] text-3xl font-bold leading-tight sm:text-4xl">
              {mode === 'login' ? loginLeftHeadline : t('auth.newAccountFarmerTrader')}
            </h1>
            {mode === 'login' ? (
              <ul className="mt-8 space-y-4 text-sm font-medium text-white/95 sm:text-base">
                <li className="flex items-center gap-3">
                  <Globe className="size-5 shrink-0 opacity-90" aria-hidden />
                  {t('auth.bullet1')}
                </li>
                <li className="flex items-center gap-3">
                  <BookOpen className="size-5 shrink-0 opacity-90" aria-hidden />
                  {t('auth.bullet2')}
                </li>
                <li className="flex items-center gap-3">
                  <Star className="size-5 shrink-0 opacity-90" aria-hidden />
                  {t('auth.bullet3')}
                </li>
                <li className="flex items-center gap-3">
                  <Radio className="size-5 shrink-0 opacity-90" aria-hidden />
                  {t('auth.bullet4')}
                </li>
              </ul>
            ) : (
              <ul className="mt-8 space-y-3 text-sm text-white/95 sm:text-base">
                {REG_BULLETS.map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    {t(`auth.${key}`)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="relative mt-12 text-xs text-white/70 lg:mt-0">{t('auth.footer')}</p>
        </div>

        <div className="relative flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-md">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-zinc-900">
              {mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              {mode === 'login' ? (
                <>
                  {t('auth.noAccount')}{' '}
                  <button
                    type="button"
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                    onClick={() => setMode('register')}
                  >
                    {t('auth.signUpFree')}
                  </button>
                </>
              ) : (
                <>
                  {t('auth.haveAccount')}{' '}
                  <button
                    type="button"
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                    onClick={() => setMode('login')}
                  >
                    {t('auth.signInLink')}
                  </button>
                </>
              )}
            </p>

            {mode === 'login' ? (
              <form onSubmit={onLogin} className="mt-8 space-y-5" noValidate>
                {showQuickLogin ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('auth.quickLogin')}</p>
                    <div className="flex rounded-xl bg-zinc-100 p-1">
                      {quickRoleRows.map((row) => {
                        const { id, key, Icon: RoleIcon } = row;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => applyQuickAccount(id)}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                              quickAccountRole === id
                                ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-zinc-200/80'
                                : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                          >
                            <RoleIcon className="size-3.5 sm:size-4" aria-hidden />
                            {t(`auth.${key}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <fieldset disabled={loginBusy} className="min-w-0 space-y-5 border-0 p-0">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                      {API_ENABLED ? t('auth.email') : t('auth.emailOrPhone')}
                    </span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400" aria-hidden />
                      <input
                        type="text"
                        inputMode={API_ENABLED ? 'email' : 'text'}
                        autoComplete="username"
                        value={loginForm.identifier}
                        onChange={(e) => setLoginForm((f) => ({ ...f, identifier: e.target.value }))}
                        placeholder={t('auth.placeholderEmail')}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-3 pl-11 pr-4 text-zinc-900 outline-none ring-emerald-500/0 transition placeholder:text-zinc-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/15 disabled:bg-zinc-100 disabled:opacity-90"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-700">{t('auth.password')}</span>
                      <Link to="/auth/forgot-password" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
                        {t('auth.forgotPassword')}
                      </Link>
                    </div>
                    <PasswordFieldWithEye
                      id="auth-login-password"
                      name="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                      show={showLoginPwd}
                      onToggleShow={() => setShowLoginPwd((v) => !v)}
                      showLabel={t('auth.showPassword')}
                      hideLabel={t('auth.hidePassword')}
                      autoComplete="current-password"
                      placeholder={t('auth.placeholderPassword')}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loginBusy}
                    aria-busy={loginBusy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-80"
                  >
                    {loginBusy ? (
                      <>
                        <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
                        {t('auth.signInLoading')}
                      </>
                    ) : (
                      <>
                        {t('auth.signIn')}
                        <ArrowRight className="size-4" aria-hidden />
                      </>
                    )}
                  </button>
                </fieldset>

                {showQuickLogin && !API_ENABLED ? (
                  <p className="text-center text-xs text-zinc-500">{t('auth.offlineQuick')}</p>
                ) : null}
                {showQuickLogin && API_ENABLED ? (
                  <p className="text-center text-xs text-zinc-500">{t('auth.quickLoginApiHint')}</p>
                ) : null}
                {!showQuickLogin ? (
                  <p className="text-xs text-zinc-500">{t('auth.productionSignIn')}</p>
                ) : null}
              </form>
            ) : (
              <form onSubmit={onRegister} className="mt-8 space-y-5" noValidate>
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-700">{t('auth.joinAs')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegForm((f) => ({ ...f, role: 'farmer' }))}
                      className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-5 transition ${
                        regForm.role === 'farmer'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      <Sprout className={`size-8 ${regForm.role === 'farmer' ? 'text-emerald-600' : 'text-zinc-400'}`} />
                      <span className="text-sm font-bold">{t('auth.farmer')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegForm((f) => ({ ...f, role: 'trader' }))}
                      className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-5 transition ${
                        regForm.role === 'trader'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      <Store className={`size-8 ${regForm.role === 'trader' ? 'text-emerald-600' : 'text-zinc-400'}`} />
                      <span className="text-sm font-bold">{t('auth.trader')}</span>
                    </button>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">{t('auth.fullName')}</span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400" aria-hidden />
                    <input
                      value={regForm.name}
                      onChange={(e) => setRegForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder={t('auth.placeholderName')}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-3 pl-11 pr-4 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">{t('auth.phone')}</span>
                  <input
                    value={regForm.phone}
                    onChange={(e) => setRegForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder={t('auth.placeholderPhone')}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-3 px-4 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                    inputMode="tel"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">{t('auth.location')}</span>
                  <input
                    value={regForm.location}
                    onChange={(e) => setRegForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder={t('auth.placeholderLocation')}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-3 px-4 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">{t('auth.emailField')}</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400" aria-hidden />
                    <input
                      type="text"
                      inputMode="email"
                      autoComplete="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder={t('auth.placeholderEmail')}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-3 pl-11 pr-4 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-zinc-700">{t('auth.passwordCreate')}</span>
                  <PasswordFieldWithEye
                    id="auth-register-password"
                    name="new-password"
                    value={regForm.password}
                    onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
                    show={showRegPwd}
                    onToggleShow={() => setShowRegPwd((v) => !v)}
                    showLabel={t('auth.showPassword')}
                    hideLabel={t('auth.hidePassword')}
                    autoComplete="new-password"
                    placeholder={t('auth.passwordCreatePlaceholder')}
                  />
                </label>
                {API_ENABLED ? <p className="text-xs text-zinc-500">{t('auth.passwordPolicy')}</p> : null}

                <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-1 size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <Trans
                      i18nKey="auth.termsRich"
                      components={[
                        <span className="font-semibold text-emerald-600" />,
                        <span className="font-semibold text-emerald-600" />,
                      ]}
                    />
                  </span>
                </label>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
                >
                  {t('auth.createBtn')}
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </form>
            )}
          </div>

          {mode === 'login' && loginBusy ? (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-center"
              aria-hidden
            >
              <div className="mt-4 w-full max-w-md rounded-2xl border border-emerald-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t('auth.signInLoading')}
                </div>
                <div className="mt-1 text-xs text-emerald-900/80">
                  Waiting for the server… (this can take a moment on slow connections)
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
