'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Message } from '@/lib/types';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';

export default function Chat({
  token,
  collectionId,
}: { token: string; collectionId: number }) {
  const me = useAuthStore((s) => s.me);

  const [open, setOpen] = useState(false);        // état ouverture du chat
  const [items, setItems] = useState<Message[]>([]); // messages chargés
  const [content, setContent] = useState('');     // input utilisateur
  const [unread, setUnread] = useState(0);        // compteur messages non lus

  const bottomRef = useRef<HTMLDivElement>(null);

  // Formatage des dates
  const fmt = (d: string | number | Date) =>
    new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
      .format(new Date(d));

  // Scroll vers le bas (pour afficher le dernier msg)
  const scrollToEnd = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);

  useEffect(() => {
    let mounted = true;

    // Récupération des messages initiaux
    (async () => {
      const res = await api.listMessages(token, collectionId);
      if (!mounted) return;
      setItems(res.items);
      scrollToEnd();
    })();

    const s = getSocket(token);
    s.emit('join:collection', { collectionId });

    // Nouveau message reçu via socket
    const onNew = (m: Message) => {
      if (m.collectionId !== collectionId) return;
      setItems((prev) => [...prev, m]);
      if (!open) setUnread((u) => u + 1);
      scrollToEnd();
    };

    s.on('message:new', onNew);

    // Fermeture avec Escape
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);

    // Cleanup
    return () => {
      mounted = false;
      s.off('message:new', onNew);
      s.emit('leave:collection', { collectionId });
      window.removeEventListener('keydown', onKey);
    };
  }, [token, collectionId, open]);

  // Envoi message
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    const s = getSocket(token);
    s.emit('message:send', { collectionId, content: text });
    setContent('');
  };

  // Reset compteur si ouverture
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  return (
    <>
      {/* Bouton flottant ouverture chat */}
      <button
        type="button"
        className="fixed right-4 bottom-4 z-50 btn btn-primary rounded-full w-14 h-14 shadow-xl flex items-center justify-center"
        onClick={() => setOpen(o => !o)}
        aria-label="Ouvrir le chat"
      >
        <span className="text-xl">💬</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 badge badge-error rounded-full">
            {unread}
          </span>
        )}
      </button>

      {/* Fenêtre du chat */}
      {open && (
        <div className="fixed right-4 bottom-20 z-[60] w-[min(92vw,380px)] h-[65vh] md:h-[520px]">
          <div className="card h-full p-3 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Chat de la collection</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                Fermer
              </button>
            </div>

            {/* Liste des messages */}
            <div className="flex-1 overflow-auto space-y-2">
              {items.map((m) => {
                const mine = m.userId === me?.id;
                const created = new Date((m as any).createdAt ?? Date.now());

                const bubble = mine
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-base-content';

                return (
                  <div key={m.id} className={`max-w-[85%] ${mine ? 'ml-auto text-right' : ''}`}>
                    <div className={`px-3 py-2 rounded-2xl ${bubble}`}>
                      <div className="text-[11px] opacity-70">
                        {m.user?.name || m.user?.email}{' · '}
                        <time title={created.toLocaleString('fr-FR')} dateTime={created.toISOString()}>
                          {fmt(created)}
                        </time>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Formulaire envoi */}
            <form onSubmit={send} className="mt-2 flex gap-2">
              <input
                className="input flex-1"
                placeholder="Écrire un message…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                autoFocus
              />
              <button className="btn btn-primary">Envoyer</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
