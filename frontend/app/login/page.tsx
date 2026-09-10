'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// Pàgina de login d'Estada — auth JWT real contra POST /api/v1/auth/login
export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Traduccions trilingües (useState local — lib/i18n.ts no té hook)
  const pageT = {
    ca: { title: 'Estada · PMS Hotel', subtitle: 'Entra al teu compte', email: 'Correu electrònic', password: 'Contrasenya', enter: 'Entrar', entering: 'Entrant...', err: 'Credencials incorrectes o backend no disponible', demo: 'Demo: admin@estada.local / cambia-esta-contrasenya' },
    es: { title: 'Estada · PMS Hotel', subtitle: 'Entra en tu cuenta', email: 'Correo electrónico', password: 'Contraseña', enter: 'Entrar', entering: 'Entrando...', err: 'Credenciales incorrectas o backend no disponible', demo: 'Demo: admin@estada.local / cambia-esta-contrasenya' },
    en: { title: 'Estada · PMS Hotel', subtitle: 'Sign in to your account', email: 'Email', password: 'Password', enter: 'Sign in', entering: 'Signing in...', err: 'Wrong credentials or backend unavailable', demo: 'Demo: admin@estada.local / cambia-esta-contrasenya' },
  }[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.auth.login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(pageT.err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e] p-4">
      <div className="w-full max-w-md">
        {/* Selector d'idioma */}
        <div className="flex justify-end gap-1 mb-2">
          {(['ca', 'es', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-1 text-xs rounded ${lang === l ? 'bg-[#e2b04a] text-[#1a1a2e] font-bold' : 'bg-[#16213e] text-slate-400'}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Targeta de login */}
        <div className="bg-[#16213e] rounded-2xl shadow-2xl p-8 border border-slate-700">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🏨</div>
            <h1 className="text-2xl font-bold text-[#e2b04a]">{pageT.title}</h1>
            <p className="text-slate-400 text-sm mt-2">{pageT.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{pageT.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 rounded-lg bg-[#1a1a2e] border border-slate-700 text-white focus:ring-2 focus:ring-[#e2b04a] focus:border-[#e2b04a] outline-none"
                placeholder="admin@estada.local"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{pageT.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 rounded-lg bg-[#1a1a2e] border border-slate-700 text-white focus:ring-2 focus:ring-[#e2b04a] focus:border-[#e2b04a] outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#e2b04a] hover:bg-[#cfa03a] text-[#1a1a2e] font-bold text-lg transition-colors disabled:opacity-50 shadow-lg"
            >
              {loading ? pageT.entering : pageT.enter}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-6">{pageT.demo}</p>
        </div>
      </div>
    </div>
  );
}