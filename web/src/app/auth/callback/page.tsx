'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

export default function CallbackPage() {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);

  useEffect(() => {
    // Récupère le token depuis l'URL
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');

    if (token) {
      setToken(token); 
      router.push('/collections'); // Redirige après login
    }
  }, [setToken, router]);

  return <p>Connexion avec Google en cours...</p>;
}
