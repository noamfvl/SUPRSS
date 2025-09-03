'use client';
import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Me } from '@/lib/types';

type S = {
  token: string | null;
  me: Me | null;
  setToken: (t: string | null) => void;
  fetchMe: () => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<S>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  me: null,
  setToken: (t) => {
    if (typeof window !== 'undefined') {
      t ? localStorage.setItem('token', t) : localStorage.removeItem('token');
    }
    set({ token: t });
  },
  fetchMe: async () => {
    const token = get().token;
    if (!token) return set({ me: null });
    const me = await api.me(token);
    set({ me });
  },
  logout: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('token');
    set({ token: null, me: null });
  }
}));
