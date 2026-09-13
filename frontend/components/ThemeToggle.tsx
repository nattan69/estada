'use client';

import { useEffect, useState } from 'react';

/**
 * Toggle dia/nit global (decisió Tomeu 13/09 — al header, part dreta).
 * Persistència: localStorage + class 'dark' a <html>.
 * En el header es mostra compacte: només la icona sol/lluna.
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('estada-theme') : null;
    const isDark = saved ? saved === 'dark' : true; // nit per defecte (blau fosc de la casa)
    document.documentElement.classList.toggle('dark', isDark);
    setDark(isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('estada-theme', next ? 'dark' : 'light');
  };

  if (dark === null) return null; // evita el flash abans de llegir localStorage

  return (
    <button
      onClick={toggle}
      title={dark ? 'Mode dia' : 'Mode nit'}
      aria-label={dark ? 'Mode dia' : 'Mode nit'}
      className="shrink-0 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
      style={{ width: 42, height: 42, fontSize: 20, lineHeight: 1, cursor: 'pointer' }}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}