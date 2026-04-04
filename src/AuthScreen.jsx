import React, { useEffect, useState } from 'react';
import { authApi, IS_API_BASE_CONFIGURED } from './api';
import { DEFAULT_LANG, getUIText } from './App.i18n';

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

export default function AuthScreen({ onAuthSuccess, canBypassAuth = false, onBypass = null, text = null }) {
  const t = text || getUIText(DEFAULT_LANG);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendReady, setBackendReady] = useState(true);
  const canBypass = Boolean(canBypassAuth && typeof onBypass === 'function');
  const benefits = [t.authBenefit1, t.authBenefit2, t.authBenefit3];

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
    <div className="auth-shell min-h-screen relative overflow-hidden">
      <style>{AUTH_STYLES}</style>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #E8F6FF 0%, #F3F8FF 55%, #EEF4FF 100%)' }} />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(14,116,144,0.2) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="absolute -top-48 -right-24 w-[420px] h-[420px] rounded-full auth-float"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.45) 0%, rgba(14,165,233,0) 70%)' }}
      />
      <div
        className="absolute -bottom-56 -left-24 w-[420px] h-[420px] rounded-full auth-float"
        style={{
          background: 'radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%)',
          animationDelay: '1.2s',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
          <section className="relative overflow-hidden rounded-[32px] p-8 md:p-10 text-white shadow-2xl border border-white/10 auth-fade" style={boxStyle}>
            <div className="absolute -top-28 right-[-60px] w-56 h-56 rounded-full bg-sky-500/25 blur-2xl" />
            <div className="absolute -bottom-24 left-[-40px] w-48 h-48 rounded-full bg-cyan-400/25 blur-2xl" />
            <div className="relative z-10">
              <p className="text-[11px] uppercase tracking-[4px] text-sky-200 font-semibold">{t.authBrand}</p>
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

          <section className="relative rounded-[32px] bg-white/85 backdrop-blur-xl p-8 md:p-10 shadow-[0_30px_80px_rgba(15,23,42,0.18)] border border-white auth-rise">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[3px] text-slate-400">{t.authBrand}</p>
                <h2 className="auth-title text-2xl text-slate-900 mt-2">
                  {mode === 'login' ? t.authSignIn : t.authCreateAccount}
                </h2>
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-sky-100/70 px-3 py-1 text-xs font-semibold text-sky-700">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                {mode === 'login' ? t.authSignIn : t.authCreateAccount}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/80 p-1">
              <button
                onClick={() => setMode('login')}
                className={`py-2.5 text-sm rounded-2xl font-semibold transition ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.authSignIn}
              </button>
              <button
                onClick={() => setMode('register')}
                className={`py-2.5 text-sm rounded-2xl font-semibold transition ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.authCreateAccount}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{t.authDisplayName}</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t.authDisplayName}
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-200 transition"
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  {mode === 'login' ? (t.authUsernameOrEmail || 'Display name or email') : t.authEmail}
                </label>
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={mode === 'login' ? (t.authUsernameOrEmail || 'Display name or email') : t.authEmail}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-200 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">{t.authPasswordHint}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={t.authPasswordHint}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-200 transition"
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
                <div className="pt-4 mt-4 border-t border-slate-200/70 space-y-2">
                  <button
                    type="button"
                    onClick={onBypass}
                    className="w-full py-2.5 rounded-2xl border border-sky-200 text-sky-700 bg-sky-50 font-semibold"
                  >
                    {t.authContinueLocal}
                  </button>
                  <p className="text-[11px] text-slate-500 text-center">
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
