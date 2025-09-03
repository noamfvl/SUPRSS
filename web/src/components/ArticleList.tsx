'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import type { Article, Feed } from '@/lib/types';
import clsx from 'clsx';

export default function ArticleList({
  token, collectionId, feeds, onOpenArticle
}: { token:string; collectionId:number; feeds:Feed[]; onOpenArticle:(a:Article)=>void }) {
  // Filtres
  const [feedId, setFeedId] = useState<number|undefined>();
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [read, setRead] = useState<'all'|'true'|'false'>('all');
  const [favorite, setFavorite] = useState<'all'|'true'|'false'>('all');

  // Articles + pagination
  const [items, setItems] = useState<Article[]>([]);
  const [cursor, setCursor] = useState<number|null>(null);
  const [loading, setLoading] = useState(false);

  // Chargement des articles
  const load = async (reset=false) => {
    setLoading(true);
    const res = await api.listArticles(token, {
      collectionId,
      feedId,
      category: category || undefined,
      q: q || undefined,
      read: read==='all'?undefined:read==='true',
      favorite: favorite==='all'?undefined:favorite==='true',
      limit: 30,
      cursor: reset? undefined : cursor ?? undefined
    });
    setItems(reset ? res.items : [...items, ...res.items]);
    setCursor(res.nextCursor);
    setLoading(false);
  };

  // Recharge quand filtres changent
  useEffect(()=>{ load(true); }, [feedId, category, q, read, favorite]);

  // Marquer comme lu / non lu
  const toggleRead = async (a: Article) => {
    const newVal = !a.isRead;
    await api.markRead(token, a.id, newVal);
    setItems(prev => prev.map(x => x.id===a.id ? { ...x, isRead:newVal } : x));
  };

  // Ajouter / retirer des favoris
  const toggleFav = async (a: Article) => {
    const newVal = !a.isFavorite;
    await api.markFavorite(token, a.id, newVal);
    setItems(prev => prev.map(x => x.id===a.id ? { ...x, isFavorite:newVal } : x));
  };

  // Liste des catégories disponibles
  const cats = Array.from(new Set(feeds.map(f=>f.category).filter(Boolean))) as string[];

  return (
    <div className="space-y-3">
      {/* Filtres */}
      <div className="card p-3 grid grid-cols-1 md:grid-cols-6 gap-2">
        <select className="input" value={feedId ?? ''} onChange={e=>setFeedId(e.target.value?Number(e.target.value):undefined)}>
          <option value="">Tous les flux</option>
          {feeds.map(f=><option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
        <select className="input" value={category} onChange={e=>setCategory(e.target.value)}>
          <option value="">Toutes catégories</option>
          {cats.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" value={read} onChange={e=>setRead(e.target.value as any)}>
          <option value="all">Tous</option>
          <option value="false">Non lus</option>
          <option value="true">Lus</option>
        </select>
        <select className="input" value={favorite} onChange={e=>setFavorite(e.target.value as any)}>
          <option value="all">Tous</option>
          <option value="true">Favoris</option>
          <option value="false">Non favoris</option>
        </select>
        <input className="input md:col-span-2" placeholder="Recherche plein texte…" value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      {/* Liste des articles */}
      <div className="space-y-2">
        {items.map(a=>(
          <div key={a.id} className="card p-3 flex gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <button onClick={()=>toggleRead(a)} className={clsx('badge', a.isRead ? 'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700')}>
                  {a.isRead ? 'Lu' : 'À lire'}
                </button>
                {a.isFavorite && <span className="badge">★ Favori</span>}
                <span className="badge">{a.feed?.title}</span>
                {a.author && <span className="text-xs text-gray-500">par {a.author}</span>}
                <span className="ml-auto text-xs text-gray-500">{fmtDate(a.publishedAt)}</span>
              </div>
              <a href={a.url} target="_blank" className="block font-semibold mt-1">{a.title}</a>
              {a.summary && <p className="text-sm text-gray-800 dark:text-gray-300 line-clamp-3 mt-1">{a.summary}</p>}
              <div className="mt-2 flex gap-2">
                <button className="btn btn-ghost" onClick={()=>toggleFav(a)}>{a.isFavorite?'Retirer des favoris':'Ajouter aux favoris'}</button>
                <button className="btn btn-ghost" onClick={()=>onOpenArticle(a)}>Commentaires</button>
              </div>
            </div>
          </div>
        ))}
        {/* Pagination */}
        {cursor && (
          <div className="text-center">
            <button disabled={loading} onClick={()=>load(false)} className="btn btn-primary">{loading?'Chargement…':'Charger plus'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
