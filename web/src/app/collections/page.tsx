'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const Header = dynamic(() => import('@/components/Header'), { ssr: false });

import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import type { Collection } from '@/lib/types';
import Link from 'next/link';
import ImportExport from '@/components/ImportExport';

export default function CollectionsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const token = useAuthStore(s => s.token);
  const me = useAuthStore(s => s.me);
  const fetchMe = useAuthStore(s => s.fetchMe);

  const [items, setItems] = useState<Collection[]>([]);
  const [name, setName] = useState('');

  useEffect(() => { if (token) fetchMe(); }, [token, fetchMe]);

  const refreshCollections = async () => {
    if (!token) return;
    const list = await api.collections(token);
    setItems(list);
  };

  useEffect(() => {
    if (!token) return;
    refreshCollections().catch(console.error);
  }, [token]);

  if (!mounted) return null;
  if (!token) return <div className="p-6">Non connecté</div>;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const col = await api.createCollection(token, { name }); 
    setItems([col, ...items]);
    setName('');
  };

  return (
    <div>
      <Header />
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <h1 className="text-xl font-semibold">Bonjour {me?.name || me?.email}</h1>

        <form onSubmit={create} className="card p-3 flex gap-2 items-center">
          <input
            className="input flex-1"
            placeholder="Nom de la collection"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <button className="btn btn-primary">Créer</button>
        </form>

        <ImportExport token={token} onImported={refreshCollections} />

        <div className="grid md:grid-cols-2 gap-3">
          {items.map(c => (
            <Link key={c.id} href={`/collections/${c.id}`} className="card p-4 hover:shadow-md transition">
              <div className="flex items-center gap-2">
                <div className="font-semibold">{c.name}</div>
                {c.isShared && <span className="badge">Partagée</span>}
              </div>
              {c.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{c.description}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
