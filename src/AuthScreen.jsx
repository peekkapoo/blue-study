import React, { useEffect, useState } from 'react';
import { Languages, Moon, Sun } from 'lucide-react';
import { authApi, IS_API_BASE_CONFIGURED } from './api';
import { DEFAULT_LANG, LANG_META } from './App.i18n';
import BrandMark from './BrandMark';

const AUTH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

  .auth-shell {
    font-family: 'Plus Jakarta Sans', sans-serif;
    --auth-ink: #0B1F3A;
    --auth-sky: #0EA5E9;
    --auth-cyan: #22D3EE;
    --auth-navy: #07162A;
    --auth-navy-2: #0D2F62;
  }

  .auth-title { font-family: 'Syne', sans-serif; }

  .auth-fade { animation: authFade .6s ease both; }
  .auth-rise { animation: authRise .6s ease both; }
  .auth-delay-1 { animation-delay: .1s; }
  .auth-delay-2 { animation-delay: .2s; }
  .auth-delay-3 { animation-delay: .3s; }

  @keyframes authFade {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes authRise {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes authFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .auth-float { animation: authFloat 7s ease-in-out infinite; }
`;

const boxStyle = {
  background: 'linear-gradient(150deg, #07162A 0%, #0E2B60 50%, #0B3D85 100%)',
};

const DISPLAY_NAME_TAKEN_MESSAGE = 'Display name is already in use. Please choose another one.';
const DISPLAY_NAME_DUPLICATED_LOGIN_MESSAGE = 'Display name is duplicated. Use email to sign in.';

export default function AuthScreen({
  onAuthSuccess,
  canBypassAuth = false,
  onBypass = null,
  text,
  theme = 'light',
  onToggleTheme = null,
  lang = DEFAULT_LANG,
  onLangChange = null,
}) {
  const t = text;
  if (!t) {
    throw new Error('[i18n] AuthScreen requires localized text from parent.');
  }
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendReady, setBackendReady] = useState(true);
  const canBypass = Boolean(canBypassAuth && typeof onBypass === 'function');
  const benefits = [t.authBenefit1, t.authBenefit2, t.authBenefit3];
  const isDarkTheme = theme === 'dark';
  const canSwitchTheme = typeof onToggleTheme === 'function';
  const canSwitchLang = typeof onLangChange === 'function';
  const activeLang = LANG_META[lang] ? lang : DEFAULT_LANG;

  const cardClass = isDarkTheme
    ? 'relative rounded-[32px] bg-slate-900/80 backdrop-blur-xl p-8 md:p-10 shadow-[0_30px_80px_rgba(2,6,23,0.65)] border border-sky-500/20 auth-rise'
    : 'relative rounded-[32px] bg-white/85 backdrop-blur-xl p-8 md:p-10 shadow-[0_30px_80px_rgba(15,23,42,0.18)] border border-white auth-rise';
  const tabWrapClass = isDarkTheme
    ? 'mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-800/80 p-1'
    : 'mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/80 p-1';
  const activeTabClass = isDarkTheme ? 'bg-slate-900 text-slate-100 shadow-sm' : 'bg-white text-slate-900 shadow-sm';
  const inactiveTabClass = isDarkTheme ? 'text-slate-300 hover:text-slate-100' : 'text-slate-500 hover:text-slate-700';
  const formLabelClass = isDarkTheme ? 'text-xs font-semibold text-slate-300' : 'text-xs font-semibold text-slate-500';
  const inputClass = isDarkTheme
    ? 'w-full px-4 py-3 rounded-2xl border border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition'
    : 'w-full px-4 py-3 rounded-2xl border border-slate-200/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-200 transition';

  useEffect(() => {
    if (!IS_API_BASE_CONFIGURED) {
      setBackendReady(false);
      return undefined;
    }

    let mounted = true;
    let timerId;

    const bootstrap = async () => {
      try {
        const healthRes = await authApi.health();
        if (!mounted) return;
        setBackendReady(healthRes?.status === 'ok');
      } catch {
        if (!mounted) return;
        setBackendReady(false);
      }

      if (!mounted) return;
      timerId = setTimeout(bootstrap, 3000);
    };

    bootstrap();
    return () => {
      mounted = false;
      clearTimeout(timerId);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const credential = form.email.trim();
      const data = mode === 'register'
        ? await authApi.register({
          name: form.name.trim(),
          email: credential,
          password: form.password,
        })
        : await authApi.login({
          identifier: credential,
          password: form.password,
        });

      await onAuthSuccess(data.token, data.user);
    } catch (err) {
      const message = String(err?.message || '').trim();
      if (message === DISPLAY_NAME_TAKEN_MESSAGE) {
        setError(t.authDisplayNameTaken || message);
      } else if (message === DISPLAY_NAME_DUPLICATED_LOGIN_MESSAGE) {
        setError(t.authDisplayNameDuplicateLogin || message);
      } else {
        setError(message || t.authFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen relative overflow-hidden" data-theme={isDarkTheme ? 'dark' : 'light'}>
      <style>{AUTH_STYLES}</style>
      <div
        className="absolute inset-0"
        style={{
          background: isDarkTheme
            ? 'linear-gradient(180deg, #020617 0%, #0A1326 55%, #0F172A 100%)'
            : 'linear-gradient(180deg, #E8F6FF 0%, #F3F8FF 55%, #EEF4FF 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: isDarkTheme
            ? 'radial-gradient(circle at 1px 1px, rgba(56,189,248,0.14) 1px, transparent 0)'
            : 'radial-gradient(circle at 1px 1px, rgba(14,116,144,0.2) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="absolute -top-48 -right-24 w-[420px] h-[420px] rounded-full auth-float"
        style={{
          background: isDarkTheme
            ? 'radial-gradient(circle, rgba(56,189,248,0.34) 0%, rgba(56,189,248,0) 70%)'
            : 'radial-gradient(circle, rgba(14,165,233,0.45) 0%, rgba(14,165,233,0) 70%)',
        }}
      />
      <div
        className="absolute -bottom-56 -left-24 w-[420px] h-[420px] rounded-full auth-float"
        style={{
          background: isDarkTheme
            ? 'radial-gradient(circle, rgba(34,211,238,0.28) 0%, rgba(34,211,238,0) 70%)'
            : 'radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%)',
          animationDelay: '1.2s',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 py-12">
        {(canSwitchTheme || canSwitchLang) && (
          <div className="mb-4 flex justify-end auth-fade">
            <div className={`inline-flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 backdrop-blur-xl ${isDarkTheme ? 'bg-slate-900/70 border-sky-500/30 text-slate-200' : 'bg-white/80 border-sky-100 text-slate-700'}`}>
              {canSwitchTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  role="switch"
                  aria-checked={isDarkTheme}
                  aria-label={`${t.theme}: ${isDarkTheme ? t.dark : t.light}`}
                  className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-semibold transition-all duration-300 ${isDarkTheme ? 'border-sky-400/40 bg-slate-900 text-slate-100' : 'border-sky-100 bg-white text-slate-700'}`}
                >
                  <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${isDarkTheme ? 'bg-sky-500/80' : 'bg-slate-300/80'}`}>
                    <span className={`absolute left-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ${isDarkTheme ? 'translate-x-5' : 'translate-x-0'}`}>
                      {isDarkTheme
                        ? <Moon size={12} className="text-indigo-600" />
                        : <Sun size={12} className="text-amber-500" />}
                    </span>
                  </span>
                  <span>{t.theme}: {isDarkTheme ? t.dark : t.light}</span>
                </button>
              )}
              {canSwitchTheme && canSwitchLang && <span className={`h-5 w-px ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-200'}`} />}
              {canSwitchLang && (
                <div className="inline-flex items-center gap-2">
                  <Languages size={15} className={isDarkTheme ? 'text-sky-300' : 'text-sky-500'} />
                  <select
                    value={activeLang}
                    onChange={(e) => onLangChange(e.target.value)}
                    aria-label={t.language}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 ${isDarkTheme ? 'bg-slate-900 border border-slate-700 text-slate-100 focus:ring-sky-400/30' : 'bg-white border border-sky-100 text-slate-700 focus:ring-sky-300/40'}`}
                  >
                    {Object.entries(LANG_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.flag} {v.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
          <section className="relative overflow-hidden rounded-[32px] p-8 md:p-10 text-white shadow-2xl border border-white/10 auth-fade" style={boxStyle}>
            <div className="absolute -top-28 right-[-60px] w-56 h-56 rounded-full bg-sky-500/25 blur-2xl" />
            <div className="absolute -bottom-24 left-[-40px] w-48 h-48 rounded-full bg-cyan-400/25 blur-2xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-3">
                <BrandMark
                  className="w-11 h-11 rounded-2xl ring-1 ring-sky-200/40 shadow-lg shadow-sky-900/30"
                  iconSize={22}
                  ariaLabel={`${t.authBrand} logo`}
                />
                <p className="text-[11px] uppercase tracking-[4px] text-sky-200 font-semibold">{t.authBrand}</p>
              </div>
              <h1 className="auth-title text-4xl md:text-5xl mt-5 leading-tight">{t.authHeadline}</h1>
              <p className="mt-4 text-sky-100 text-sm md:text-base leading-relaxed">
                {t.authSubhead}
              </p>
              <div className="mt-7 space-y-3">
                {benefits.map((item, idx) => (
                  <div
                    key={item}
                    className={`flex items-start gap-3 rounded-2xl bg-white/10 border border-white/10 px-4 py-3 auth-fade auth-delay-${idx + 1}`}
                  >
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
                    <p className="text-sm text-sky-100 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2.5">
                  <BrandMark
                    className={`w-8 h-8 rounded-xl ring-1 ${isDarkTheme ? 'ring-sky-400/40' : 'ring-sky-100'}`}
                    iconSize={16}
                    strokeWidth={2.4}
                    ariaLabel={`${t.authBrand} logo`}
                  />
                  <p className="text-[11px] uppercase tracking-[3px] text-slate-400">{t.authBrand}</p>
                </div>
                <h2 className={`auth-title text-2xl mt-2 ${isDarkTheme ? 'text-slate-100' : 'text-slate-900'}`}>
                  {mode === 'login' ? t.authSignIn : t.authCreateAccount}
                </h2>
              </div>
              <div className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isDarkTheme ? 'bg-sky-500/15 text-sky-200 border border-sky-400/30' : 'bg-sky-100/70 text-sky-700'}`}>
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                {mode === 'login' ? t.authSignIn : t.authCreateAccount}
              </div>
            </div>

            <div className={tabWrapClass}>
              <button
                onClick={() => setMode('login')}
                className={`py-2.5 text-sm rounded-2xl font-semibold transition ${mode === 'login' ? activeTabClass : inactiveTabClass}`}
              >
                {t.authSignIn}
              </button>
              <button
                onClick={() => setMode('register')}
                className={`py-2.5 text-sm rounded-2xl font-semibold transition ${mode === 'register' ? activeTabClass : inactiveTabClass}`}
              >
                {t.authCreateAccount}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className={formLabelClass}>{t.authDisplayName}</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t.authDisplayName}
                    required
                    className={inputClass}
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className={formLabelClass}>
                  {mode === 'login' ? (t.authUsernameOrEmail || 'Display name or email') : t.authEmail}
                </label>
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={mode === 'login' ? (t.authUsernameOrEmail || 'Display name or email') : t.authEmail}
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={formLabelClass}>{t.authPasswordHint}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={t.authPasswordHint}
                  required
                  minLength={6}
                  className={inputClass}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {!backendReady && (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-2xl px-3 py-2">
                  {IS_API_BASE_CONFIGURED
                    ? t.authBackendOffline
                    : t.authBackendMissing}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !backendReady}
                className="w-full py-3 rounded-2xl text-white font-semibold shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%)' }}
              >
                {loading ? t.authProcessing : mode === 'login' ? t.authSignIn : t.authCreateAccount}
              </button>

              {canBypass && (
                <div className={`pt-4 mt-4 border-t space-y-2 ${isDarkTheme ? 'border-slate-700/70' : 'border-slate-200/70'}`}>
                  <button
                    type="button"
                    onClick={onBypass}
                    className={`w-full py-2.5 rounded-2xl border font-semibold ${isDarkTheme ? 'border-sky-500/40 text-sky-200 bg-sky-500/10' : 'border-sky-200 text-sky-700 bg-sky-50'}`}
                  >
                    {t.authContinueLocal}
                  </button>
                  <p className={`text-[11px] text-center ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t.authLocalHint}
                  </p>
                </div>
              )}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
