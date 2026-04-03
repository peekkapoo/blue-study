import React, { useEffect, useState } from 'react';
import { authApi, IS_API_BASE_CONFIGURED } from './api';
import { DEFAULT_LANG, getUIText } from './App.i18n';

const boxStyle = {
  background: 'linear-gradient(140deg, #08142A 0%, #0E2B60 100%)',
};

export default function AuthScreen({ onAuthSuccess, canBypassAuth = false, onBypass = null, text = null }) {
  const t = text || getUIText(DEFAULT_LANG);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendReady, setBackendReady] = useState(true);
  const canBypass = Boolean(canBypassAuth && typeof onBypass === 'function');

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
      const payload = {
        email: form.email.trim(),
        password: form.password,
      };
      const data = mode === 'register'
        ? await authApi.register({ ...payload, name: form.name.trim() })
        : await authApi.login(payload);

      await onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || t.authFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'linear-gradient(180deg, #E0F2FE 0%, #EFF6FF 100%)' }}>
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6 items-stretch">
        <section className="rounded-3xl p-8 text-white shadow-2xl" style={boxStyle}>
          <p className="text-xs uppercase tracking-[3px] text-sky-300 font-semibold">{t.authBrand}</p>
          <h1 className="text-4xl mt-4 font-bold leading-tight">{t.authHeadline}</h1>
          <p className="mt-5 text-sky-100 text-sm leading-relaxed">
            {t.authSubhead}
          </p>
          <ul className="mt-6 space-y-2 text-sm text-sky-100">
            <li>{t.authBenefit1}</li>
            <li>{t.authBenefit2}</li>
            <li>{t.authBenefit3}</li>
          </ul>
        </section>

        <section className="bg-white rounded-3xl p-8 shadow-xl border border-sky-100">
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 text-sm rounded-lg font-semibold transition ${mode === 'login' ? 'bg-white text-sky-700 shadow' : 'text-slate-500'}`}
            >
              {t.authSignIn}
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 text-sm rounded-lg font-semibold transition ${mode === 'register' ? 'bg-white text-sky-700 shadow' : 'text-slate-500'}`}
            >
              {t.authCreateAccount}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t.authDisplayName}
                required
                className="w-full px-4 py-3 rounded-xl border border-sky-100 bg-sky-50/40 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            )}
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder={t.authEmail}
              required
              className="w-full px-4 py-3 rounded-xl border border-sky-100 bg-sky-50/40 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder={t.authPasswordHint}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-sky-100 bg-sky-50/40 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}
            {!backendReady && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                {IS_API_BASE_CONFIGURED
                  ? t.authBackendOffline
                  : t.authBackendMissing}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !backendReady}
              className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%)' }}
            >
              {loading ? t.authProcessing : mode === 'login' ? t.authSignIn : t.authCreateAccount}
            </button>

            {canBypass && (
              <>
                <button
                  type="button"
                  onClick={onBypass}
                  className="w-full py-2.5 rounded-xl border border-sky-200 text-sky-700 bg-sky-50 font-semibold"
                >
                  {t.authContinueLocal}
                </button>
                <p className="text-[11px] text-slate-500 text-center">
                  {t.authLocalHint}
                </p>
              </>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
