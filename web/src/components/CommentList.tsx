'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Article, Comment } from '@/lib/types';
import { getSocket } from '@/lib/socket';

export default function CommentList({
  token, article, onClose
}: { token:string; article: Article; onClose: ()=>void }) {
  const [items, setItems] = useState<Comment[]>([]); // liste des commentaires
  const [content, setContent] = useState('');        // champ input
  const endRef = useRef<HTMLDivElement>(null);

  // Formatage date FR
  const fmt = (d: string | number | Date) =>
    new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(d));

  // Scroll auto vers le bas
  const scrollToEnd = () =>
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);

  useEffect(() => {
    let mounted = true;

    // Récupération initiale des commentaires
    (async () => {
      const res = await api.listComments(token, article.id);
      if (!mounted) return;
      setItems(res.items);
      scrollToEnd();
    })();

    // Connexion socket
    const s = getSocket(token);
    s.emit('join:article', { articleId: article.id });

    // Nouveau commentaire reçu
    const onNew = (c: Comment) => {
      if (c.articleId !== article.id) return;
      setItems(prev => [...prev, c]);
      scrollToEnd();
    };
    s.on('comment:new', onNew);

    // Cleanup
    return () => {
      mounted = false;
      s.off('comment:new', onNew);
      s.emit('leave:article', { articleId: article.id });
    };
  }, [token, article.id]);

  // Ajout d’un commentaire
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;

    const s = getSocket(token);
    s.emit('comment:add', { articleId: article.id, content: text });

    setContent('');
    scrollToEnd();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end md:items-center justify-center">
      <div className="card w-full md:max-w-2xl h-[80vh] flex flex-col p-3">
        {/* Header popup */}
        <div className="flex items-center gap-2 mb-2">
          <div className="font-semibold line-clamp-1 flex-1">{article.title}</div>
          <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        </div>

        {/* Liste des commentaires */}
        <div className="flex-1 overflow-auto space-y-3">
          {items.map(c => {
            const created = new Date((c as any).createdAt ?? Date.now());
            return (
              <div key={c.id} className="text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{c.user?.name || c.user?.email}</span>
                  <time
                    className="text-xs opacity-60"
                    title={created.toLocaleString('fr-FR')}
                    dateTime={created.toISOString()}
                  >
                    {fmt(created)}
                  </time>
                </div>
                <div>{c.content}</div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Formulaire ajout */}
        <form onSubmit={add} className="mt-2 flex gap-2">
          <input
            className="input"
            placeholder="Ajouter un commentaire…"
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <button className="btn btn-primary">Envoyer</button>
        </form>
      </div>
    </div>
  );
}
