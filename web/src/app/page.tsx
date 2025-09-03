'use client';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import DarkToggleGuest from '@/components/DarkToggleGuest';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-950 dark:to-black">
      <header className="relative flex flex-col items-center justify-center flex-1 px-6 text-center">
        {/* Toggle dark mode en haut à droite */}
        <div className="absolute top-4 right-4">
          <DarkToggleGuest />
        </div>

        {/* Titre + description */}
        <h1 className="text-5xl font-extrabold tracking-tight mb-6">
          SUP<span className="text-brand">RSS</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10">
          SUPRSS est une plateforme moderne pour suivre, organiser et partager vos flux RSS.
          Centralisez vos sources d’information, restez à jour et collaborez en toute simplicité.
        </p>

        {/* CTA vers la page login */}
        <div className="flex gap-4">
          <button
            className="bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-xl text-lg font-medium flex items-center gap-2 shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            onClick={() => router.push('/login')}
          >
            Se connecter <ArrowRight size={20} />
          </button>
        </div>
      </header>

      {/* Section avantages */}
      <section className="grid md:grid-cols-3 gap-8 px-8 py-16 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm">
        <div className="p-6 rounded-2xl border border-brand/10 bg-white dark:bg-gray-900">
          <h3 className="text-xl font-semibold mb-3 text-brand">Suivi intelligent</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Abonnez-vous à vos flux RSS préférés et restez informé sans effort.
          </p>
        </div>
        <div className="p-6 rounded-2xl border border-brand/10 bg-white dark:bg-gray-900">
          <h3 className="text-xl font-semibold mb-3 text-brand">Organisation claire</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Classez vos sources par collections et retrouvez rapidement l’info qui compte.
          </p>
        </div>
        <div className="p-6 rounded-2xl border border-brand/10 bg-white dark:bg-gray-900">
          <h3 className="text-xl font-semibold mb-3 text-brand">Partage & collaboration</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Échangez vos collections pour une veille partagée et efficace.
          </p>
        </div>
      </section>
    </div>
  );
}
