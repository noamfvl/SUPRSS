'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
const Header = dynamic(() => import('@/components/Header'), { ssr: false });

import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import type { Feed, Article, CollectionMember, MemberRole } from '@/lib/types';
import FeedForm from '@/components/FeedForm';
import ArticleList from '@/components/ArticleList';
import CommentList from '@/components/CommentList';
import Link from 'next/link';

export default function CollectionDetail() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const params = useParams<{ id: string }>();
  const router = useRouter();
  const collectionId = Number(params.id);
  const token = useAuthStore(s => s.token);
  const me = useAuthStore(s => s.me);

  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [openArticle, setOpenArticle] = useState<Article | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('READER');

  const [members, setMembers] = useState<CollectionMember[]>([]);

  // Edition feed
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUpdateFreq, setEditUpdateFreq] = useState<'hourly'|'6h'|'daily'>('daily');
  const [editStatus, setEditStatus] = useState<'ACTIVE'|'INACTIVE'>('ACTIVE');
  const [saving, setSaving] = useState(false);

  // Refresh/Loading flags
  const [articleListKey, setArticleListKey] = useState(0);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingCollection, setDeletingCollection] = useState(false);

  // Chat
  const Chat = dynamic(() => import('@/components/Chat'), { ssr: false });

  useEffect(() => {
    if (!mounted || !token || !collectionId) return;
    api.feedsByCollection(token, collectionId).then(setFeeds).catch(() => {});
    api.listMembers(token, collectionId).then(setMembers).catch(() => {});
  }, [mounted, token, collectionId]);

  const myRole = useMemo<MemberRole | null>(() => {
    const m = members.find(m => m.userId === me?.id);
    return m?.role ?? null;
  }, [members, me]);

  const isOwnerOrEditor = myRole === 'OWNER' || myRole === 'MEMBER';
  const isOwner = myRole === 'OWNER';

  // Invitations
  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await api.invite(token, { collectionId, email: inviteEmail, role: inviteRole });
    setInviteEmail('');
    setInviteRole('READER');
    alert('Invitation envoyée');
  };

  // Roles
  const changeRole = async (userId: number, role: MemberRole) => {
    if (!token) return;
    const prev = members;
    setMembers(prev => prev.map(m => (m.userId === userId ? { ...m, role } : m)));
    try {
      await api.updateMemberRole(token, collectionId, userId, role);
    } catch {
      setMembers(prev);
      alert('Impossible de modifier le rôle');
    }
  };

  // Edit feed
  const openEdit = (f: Feed) => {
    setEditingId(f.id);
    setEditTitle(f.title || '');
    setEditDescription(f.description || '');
    setEditCategory(f.category || '');
    setEditUpdateFreq((f.updateFreq as any) || 'daily');
    setEditStatus(f.status);
  };

  const cancelEdit = () => { setEditingId(null); setSaving(false); };

  const saveEdit = async () => {
    if (!token || editingId == null) return;
    try {
      setSaving(true);
      const patch = {
        title: editTitle || undefined,
        description: editDescription || undefined,
        category: editCategory || undefined,
        updateFreq: editUpdateFreq,
        status: editStatus,
      };
      await api.updateFeed(token, editingId, patch);
      setFeeds(prev => prev.map(f => (f.id === editingId ? { ...f, ...patch } : f)));
      setEditingId(null);
    } catch (e) {
      console.error(e);
      alert('Impossible de mettre à jour le flux');
    } finally {
      setSaving(false);
    }
  };

  // Delete feed
  const deleteFeed = async (id: number) => {
    if (!token) return;
    const ok = confirm('Supprimer ce flux ?');
    if (!ok) return;
    setDeletingId(id);
    try {
      await api.deleteFeed(token, id);
      setFeeds(prev => prev.filter(x => x.id !== id));
      setArticleListKey(k => k + 1);
    } catch (e) {
      console.error(e);
      alert('Suppression impossible.');
    } finally {
      setDeletingId(null);
    }
  };

  // Refresh feed
  const handleRefreshFeed = async (feedId: number) => {
    if (!token) return;
    setRefreshingId(feedId);
    try {
      await api.refreshFeed(token, feedId);
      const updated = await api.feedsByCollection(token, collectionId);
      setFeeds(updated);
      setArticleListKey(k => k + 1);
    } catch (e) {
      console.error(e);
      alert('Refresh impossible.');
    } finally {
      setRefreshingId(null);
    }
  };

  // Delete collection (OWNER only)
  const deleteCollection = async () => {
    if (!token) return;
    const ok = confirm(
      'Supprimer cette collection ?\n\n' +
      'Cette action supprimera également les flux et leurs articles associés.'
    );
    if (!ok) return;
    try {
      setDeletingCollection(true);
      await api.deleteCollection(token, collectionId);
      router.push('/collections');
    } catch (e) {
      console.error(e);
      alert('Suppression de la collection impossible.');
    } finally {
      setDeletingCollection(false);
    }
  };

  if (!mounted) return null;
  if (!token) return <div className="p-6">Non connecté</div>;

  return (
    <div className="min-h-screen">
      <Header />

      <div className="max-w-7xl mx-auto px-4 pt-4 flex items-center justify-between gap-2">
        <Link href="/collections" className="btn btn-ghost px-2">← Retour aux collections</Link>
        {isOwner && (
          <button
            className="btn btn-error"
            onClick={deleteCollection}
            disabled={deletingCollection}
            title="Supprimer la collection"
          >
            {deletingCollection ? 'Suppression…' : 'Supprimer la collection'}
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <aside className="space-y-3 lg:col-span-1">
          <div className="card p-3 space-y-2">
            <div className="font-medium">Flux ({feeds.length})</div>

            {isOwnerOrEditor && (
              <FeedForm
                token={token}
                collectionId={collectionId}
                onCreated={f => setFeeds([f, ...feeds])}
              />
            )}

            <div className="max-h-[420px] overflow-auto divide-y divide-gray-200 dark:divide-gray-800">
              {feeds.map(f => (
                <div key={f.id} className="py-3">
                  {editingId === f.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          className="input w-full bg-white text-gray-900 border border-gray-300
                                     dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700
                                     placeholder-gray-400 dark:placeholder-gray-500"
                          placeholder="Titre"
                          value={editTitle}
                          onChange={e=>setEditTitle(e.target.value)}
                        />
                        <input
                          className="input w-full bg-white text-gray-900 border border-gray-300
                                     dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700
                                     placeholder-gray-400 dark:placeholder-gray-500"
                          placeholder="Catégorie / Tags"
                          value={editCategory}
                          onChange={e=>setEditCategory(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">Description</label>
                        <textarea
                          className="textarea w-full resize-y bg-white text-gray-900 border border-gray-300
                                     dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700
                                     placeholder-gray-400 dark:placeholder-gray-500"
                          placeholder="Décrivez le flux…"
                          value={editDescription}
                          onChange={e=>setEditDescription(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">Fréquence</label>
                          <select
                            className="select w-full bg-white text-gray-900 border border-gray-300
                                       dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                            value={editUpdateFreq}
                            onChange={e=>setEditUpdateFreq(e.target.value as any)}
                          >
                            <option value="hourly">Toutes les heures</option>
                            <option value="6h">Toutes les 6 heures</option>
                            <option value="daily">Quotidien</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1 block">Statut</label>
                          <select
                            className="select w-full bg-white text-gray-900 border border-gray-300
                                       dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                            value={editStatus}
                            onChange={e=>setEditStatus(e.target.value as any)}
                          >
                            <option value="ACTIVE">Actif</option>
                            <option value="INACTIVE">Inactif</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button className="btn btn-ghost" onClick={cancelEdit}>Annuler</button>
                        <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                          {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium">{f.title}</div>
                        {f.status === 'ACTIVE'
                          ? <span className="badge">Actif</span>
                          : <span className="badge">Inactif</span>}
                      </div>

                      <div className="text-xs text-gray-500 mt-0.5">
                        {f.category || '—'} · MAJ: {f.updateFreq || 'daily'}
                      </div>

                      {f.description && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{f.description}</div>
                      )}

                      {isOwnerOrEditor && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleRefreshFeed(f.id)}
                            disabled={refreshingId === f.id}
                          >
                            {refreshingId === f.id ? 'Rafraîchissement…' : 'Rafraîchir'}
                          </button>
                          <button className="btn btn-ghost" onClick={() => openEdit(f)}>
                            Modifier
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => deleteFeed(f.id)}
                            disabled={deletingId === f.id}
                          >
                            {deletingId === f.id ? 'Suppression…' : 'Supprimer'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card p-3 space-y-2">
            <div className="font-medium">Partager la collection</div>
            <form onSubmit={sendInvite} className="flex flex-col gap-2">
              <input
                className="input bg-white text-gray-900 border border-gray-300
                           dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700
                           placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Email de l’utilisateur"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                type="email"
                required
              />
              <select
                className="select bg-white text-gray-900 border border-gray-300
                           dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as MemberRole)}
              >
                <option value="OWNER">Propriétaire</option>
                <option value="MEMBER">Membre</option>
                <option value="READER">Lecteur</option>
              </select>
              <button className="btn btn-primary">Inviter</button>
            </form>
          </div>

          <div className="card p-3 space-y-2">
            <div className="font-medium">Membres ({members.length})</div>
            <div className="space-y-2 max-h-[260px] overflow-auto">
              {members.map(m => (
                <div key={m.userId} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {m.user?.name || m.user?.email || `User #${m.userId}`}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{m.user?.email}</div>
                  </div>

                  {isOwner ? (
                    <select
                      className="select select-xs bg-white text-gray-900 border border-gray-300
                                 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                      value={m.role}
                      onChange={e => changeRole(m.userId, e.target.value as MemberRole)}
                    >
                      <option value="OWNER">Owner</option>
                      <option value="MEMBER">Member</option>
                      <option value="READER">Reader</option>
                    </select>
                  ) : (
                    <span className="badge">{m.role}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>


        <main className="lg:col-span-2 space-y-3">
          <ArticleList
            key={articleListKey}
            token={token}
            collectionId={collectionId}
            feeds={feeds}
            onOpenArticle={setOpenArticle}
          />
        </main>
      </div>

      {openArticle && (
        <CommentList token={token} article={openArticle} onClose={() => setOpenArticle(null)} />
      )}

      <Chat token={token} collectionId={collectionId} />
    </div>
  );
}
