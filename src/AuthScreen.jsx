import React, { useEffect, useState } from 'react';
import { authApi } from './api';

const boxStyle = {
  background: 'linear-gradient(140deg, #08142A 0%, #0E2B60 100%)',
};

export default function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendReady, setBackendReady] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timerId;

    const bootstrap = async () => {
      try {
        const healthRes = await authApi.health();
        if (!mounted) return;
        setBackendReady(Boolean(healthRes?.ok));
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
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'linear-gradient(180deg, #E0F2FE 0%, #EFF6FF 100%)' }}>
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-6 items-stretch">
        <section className="rounded-3xl p-8 text-white shadow-2xl" style={boxStyle}>
          <p className="text-xs uppercase tracking-[3px] text-sky-300 font-semibold">Blue Study</p>
          <h1 className="text-4xl mt-4 font-bold leading-tight">Study smarter with one secure account</h1>
          <p className="mt-5 text-sky-100 text-sm leading-relaxed">
            Tao tai khoan de luu toan bo ghi chu, lich hoc va thiet lap cua ban. Du lieu duoc dong bo theo tung user.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-sky-100">
            <li>Dang ky / Dang nhap bang email</li>
            <li>Xac thuc backend theo JWT</li>
            <li>Dong bo du lieu hoc tap theo user</li>
          </ul>
        </section>

        <section className="bg-white rounded-3xl p-8 shadow-xl border border-sky-100">
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 text-sm rounded-lg font-semibold transition ${mode === 'login' ? 'bg-white text-sky-700 shadow' : 'text-slate-500'}`}
            >
              Dang nhap
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 text-sm rounded-lg font-semibold transition ${mode === 'register' ? 'bg-white text-sky-700 shadow' : 'text-slate-500'}`}
            >
              Dang ky
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ten hien thi"
                required
                className="w-full px-4 py-3 rounded-xl border border-sky-100 bg-sky-50/40 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            )}
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              required
              className="w-full px-4 py-3 rounded-xl border border-sky-100 bg-sky-50/40 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Mat khau (toi thieu 6 ky tu)"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-sky-100 bg-sky-50/40 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />

            {error && <p className="text-sm text-red-500">{error}</p>}
            {!backendReady && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                Backend dang tat. Hay chay npm run dev de bat ca frontend va backend.
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !backendReady}
              className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #0EA5E9 0%, #1D4ED8 100%)' }}
            >
              {loading ? 'Dang xu ly...' : mode === 'login' ? 'Dang nhap' : 'Tao tai khoan'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
