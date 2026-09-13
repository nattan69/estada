'use client';

import { useEffect, useState } from 'react';

/**
 * Toggle dia/nit global (decisió Tomeu 13/09).
 * Persistència: localStorage + class 'dark' a <html>.
 * Colors: tokens a globals.css (--bg, --fg, --card, ...) que canvien segons .dark.
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
      className="mt-auto flex items-center justify-center gap-2 w-full p-2 rounded bg-white/10 hover:bg-white/20 text-sm transition"
      style={{ color: 'inherit' }}
    >
      {dark ? '☀️ Mode dia' : '🌙 Mode nit'}
    </button>
  );
}