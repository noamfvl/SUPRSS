'use client';
import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function DarkToggleGuest() {
  const [mounted, setMounted] = useState(false); // pour éviter le décalage SSR/CSR
  const [dark, setDark] = useState(false);       // état actuel du thème

  useEffect(() => {
    setMounted(true);
    // Vérifie si la classe "dark" est déjà présente
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  // Bascule entre clair/sombre
  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleDark}
      aria-label="Basculer le thème"
      aria-pressed={dark}
      title={dark ? 'Thème sombre activé' : 'Thème clair activé'}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {/* Icône soleil (mode clair) */}
      <Sun
        className={`h-5 w-5 transition-all duration-200 ${
          dark ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
        }`}
      />
      {/* Icône lune (mode sombre) */}
      <Moon
        className={`absolute h-5 w-5 transition-all duration-200 ${
          dark ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      />
    </button>
  );
}
