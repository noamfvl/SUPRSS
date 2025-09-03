'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Invitation } from '@/lib/types';
import { Bell, Settings, Sun, Moon } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';

type UserPrefs = {
  darkMode?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
};

// Applique les préférences de thème et de taille de police
function applyThemeAndFont(prefs: UserPrefs) {
  const html = document.documentElement;
  if (prefs.darkMode) html.classList.add('dark');
  else html.classList.remove('dark');

  const body = document.body;
  body.classList.remove('text-sm', 'text-base', 'text-lg');
  body.classList.add(
    prefs.fontSize === 'small' ? 'text-sm' :
    prefs.fontSize === 'large' ? 'text-lg' : 'text-base'
  );
}

export default function Header() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const me = useAuthStore((s) => s.me);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const router = useRouter();

  // Invitations
  const [notifOpen, setNotifOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  // Préférences utilisateur
  const [prefOpen, setPrefOpen] = useState(false);
  const [dark, setDark] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Lien Google
  const [linking, setLinking] = useState(false);

  // Changement de mot de passe
  const [showPwd, setShowPwd] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNext, setPwdNext] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const prefRef = useRef<HTMLDivElement>(null);

  // Charger profil si token présent
  useEffect(() => {
    if (!mounted) return;
    if (token && !me) {
      fetchMe().catch(() => {});
    }
  }, [mounted, token, me, fetchMe]);

  // Charger les invitations
  useEffect(() => {
    if (!mounted || !token) return;
    api.listInvitations(token).then(setInvitations).catch(() => {});
  }, [mounted, token]);

  // Charger et appliquer les préférences depuis le profil
  useEffect(() => {
    if (!mounted) return;
    const prefs: UserPrefs = (me as any)?.preferences || {};
    const nextDark = !!prefs.darkMode;
    const nextSize = prefs.fontSize ?? 'medium';
    setDark(nextDark);
    setFontSize(nextSize as any);
    applyThemeAndFont({ darkMode: nextDark, fontSize: nextSize as any });
  }, [mounted, me]);

  // Fermer les menus si clic à l’extérieur
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
      if (prefRef.current && !prefRef.current.contains(t)) {
        setPrefOpen(false);
        setShowPwd(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Déconnexion
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Invitations actions
  const accept = async (id: number) => {
    if (!token) return;
    await api.acceptInvitation(token, id);
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  };

  const decline = async (id: number) => {
    if (!token) return;
    await api.declineInvitation(token, id);
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  };

  // Sauvegarde des préférences
  const savePrefs = async (next: UserPrefs) => {
    if (!token) return;
    applyThemeAndFont(next); 
    try {
      await api.updatePreferences(token, {
        darkMode: !!next.darkMode,
        fontSize: next.fontSize ?? 'medium',
      });
      fetchMe().catch(() => {});
    } catch (e) {
      console.warn('updatePreferences failed', e);
    }
  };

  // Toggle dark mode
  const toggleDark = async () => {
    const next = !dark;
    setDark(next);
    await savePrefs({ darkMode: next, fontSize });
  };

  // Changement de taille de police
  const changeFont = async (val: 'small' | 'medium' | 'large') => {
    setFontSize(val);
    await savePrefs({ darkMode: dark, fontSize: val });
  };

  // Début du lien Google
  const startGoogleLink = async () => {
    if (!token) return;
    try {
      setLinking(true);
      const { url } = await api.googleLinkStart(token, `${window.location.origin}/settings`);
      window.location.href = url; 
    } finally {
      setLinking(false);
    }
  };

  // Changement du mot de passe
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setPwdMsg(null);
    if (pwdNext !== pwdConfirm) {
      setPwdMsg('Les mots de passe ne correspondent pas.');
      return;
    }
    if (pwdNext.length < 8) {
      setPwdMsg('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    try {
      setPwdSaving(true);
      await api.changePassword(token, pwdCurrent, pwdNext); 
      setPwdMsg('Mot de passe mis à jour ✅');
      setPwdCurrent(''); setPwdNext(''); setPwdConfirm('');
    } catch {
      setPwdMsg('Échec de la mise à jour. Vérifie le mot de passe actuel.');
    } finally {
      setPwdSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="font-semibold">SUPRSS</div>

        <div className="relative flex items-center gap-2 sm:gap-3">
          {/* Bouton toggle dark/light */}
          <button
            onClick={toggleDark}
            aria-label="Basculer le thème"
            aria-pressed={dark}
            title={dark ? 'Thème sombre activé' : 'Thème clair activé'}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Sun
              className={`h-5 w-5 transition-all duration-200 ${dark ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}
            />
            <Moon
              className={`absolute h-5 w-5 transition-all duration-200 ${dark ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
            />
          </button>

          {/* Notifications (invitations) */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Invitations"
              title="Invitations"
              aria-expanded={notifOpen}
            >
              <Bell className="h-5 w-5" />
              {invitations.length > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1 text-xs leading-5 text-white">
                  {invitations.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 z-50 w-80 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <div className="px-2 pb-2 font-medium">Invitations</div>
                {invitations.length === 0 && (
                  <div className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400">Aucune invitation</div>
                )}
                {invitations.map((inv) => (
                  <div key={inv.id} className="border-t border-slate-200 px-2 py-2 dark:border-slate-700">
                    <div className="text-sm">
                      <span className="font-medium">
                        {inv.collection?.name ?? `Collection #${inv.collectionId}`}
                      </span>
                      <span className="ml-1 text-slate-600 dark:text-slate-300">({inv.role})</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{inv.email}</div>
                    <div className="mt-2 flex gap-2">
                      <button
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                        onClick={() => accept(inv.id)}
                      >
                        Accepter
                      </button>
                      <button
                        className="rounded bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700"
                        onClick={() => decline(inv.id)}
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Menu préférences */}
          <div ref={prefRef} className="relative">
            <button
              onClick={() => setPrefOpen((o) => !o)}
              className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Préférences"
              title="Préférences"
              aria-expanded={prefOpen}
            >
              <Settings className="h-5 w-5" />
            </button>

            {prefOpen && (
              <div className="absolute right-0 top-11 z-50 w-72 rounded-md border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 font-medium">Réglages</div>

                {/* Changement taille police */}
                <label className="mb-1 block">Taille de police</label>
                <select
                  value={fontSize}
                  onChange={(e) => changeFont(e.target.value as 'small' | 'medium' | 'large')}
                  className="mb-3 w-full rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-700"
                >
                  <option value="small">Petite</option>
                  <option value="medium">Moyenne</option>
                  <option value="large">Grande</option>
                </select>

                {/* Lien Google */}
                <div className="mt-2">
                  <div className="mb-1 font-medium">Connexions</div>
                  <button
                    onClick={startGoogleLink}
                    disabled={linking || !token}
                    className="flex w-full items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-700"
                  >
                    <FcGoogle className="h-5 w-5" />
                    <span>{linking ? 'Ouverture Google…' : 'Lier mon compte à Google'}</span>
                  </button>
                </div>

                {/* Changement mot de passe */}
                <button
                  onClick={() => setShowPwd((s) => !s)}
                  className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-left hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
                >
                  {showPwd ? 'Fermer' : 'Changer le mot de passe'}
                </button>

                {showPwd && (
                  <form onSubmit={submitPassword} className="mt-3 grid gap-2">
                    <input
                      type="password"
                      placeholder="Mot de passe actuel"
                      className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-700"
                      value={pwdCurrent}
                      onChange={(e) => setPwdCurrent(e.target.value)}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Nouveau mot de passe"
                      className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-700"
                      value={pwdNext}
                      onChange={(e) => setPwdNext(e.target.value)}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Confirmer le nouveau"
                      className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-700"
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      required
                    />
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={pwdSaving}
                        className="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-100"
                      >
                        {pwdSaving ? 'Enregistrement…' : 'Mettre à jour'}
                      </button>
                      {pwdMsg && (
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          {pwdMsg}
                        </span>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Email utilisateur */}
          <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-300">
            {me?.email ?? ''}
          </span>
          <button
            onClick={handleLogout}
            className="rounded px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
