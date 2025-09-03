'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { FcGoogle } from 'react-icons/fc';
import DarkToggleGuest from '@/components/DarkToggleGuest';

export default function LoginPage() {
  const router = useRouter();
  const token = useAuthStore(s => s.token);
  const setToken = useAuthStore(s => s.setToken);
  const fetchMe = useAuthStore(s => s.fetchMe);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => { 
    // Si déjà connecté → redirection
    if (token) router.replace('/collections'); 
  }, [token, router]);

  // Connexion utilisateur
  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.login(email, password);
    setToken(res.access_token);
    await fetchMe();
    router.replace('/collections');
  };

  // Inscription puis login auto
  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.register(email, password);
    await doLogin(e);
  };

  // Connexion Google 
  const googleLogin = () => {
    const base = process.env.NEXT_PUBLIC_API_URL!;
    window.location.href = `${base}/auth/google`;
  };

  return (
    <div className="relative min-h-screen grid place-items-center
                    bg-gradient-to-br from-white to-gray-100
                    dark:from-gray-900 dark:to-gray-950">
      {/* Toggle dark mode */}
      <div className="absolute top-4 right-4">
        <DarkToggleGuest />
      </div>

      <div className="card w-full max-w-md p-6
                      bg-white text-gray-900 border border-gray-200
                      dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 rounded-2xl">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          SUPRSS — Connexion
        </h1>

        {/* Formulaire email/password */}
        <form onSubmit={doLogin} className="space-y-3">
          <input
            className="input w-full
                       bg-white text-gray-900 border border-gray-300
                       dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700
                       placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            required
          />
          <input
            className="input w-full
                       bg-white text-gray-900 border border-gray-300
                       dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700
                       placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <div className="flex gap-2">
            <button className="btn btn-primary w-full" type="submit">
              Se connecter
            </button>
            <button className="btn btn-ghost w-full" onClick={doRegister}>
              Créer un compte
            </button>
          </div>
        </form>

        {/* Connexion Google */}
        <div className="mt-4">
          <button
            onClick={googleLogin}
            className="btn w-full border flex items-center justify-center gap-2
                       border-gray-300 dark:border-gray-600"
          >
            <FcGoogle className="w-5 h-5" />
            Continuer avec Google
          </button>
        </div>
      </div>
    </div>
  );
}
