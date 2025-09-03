import { withAuth } from './auth';
import type {
  Me,
  Collection,
  Feed,
  Article,
  Message,
  Comment,
  Invitation,
  MemberRole,
  CollectionMember,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL!;

// ---- AUTH
export const api = {
  async register(email: string, password: string, name?: string) {
    const r = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!r.ok) throw new Error('register failed');
    return r.json();
  },

  async login(email: string, password: string) {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new Error('login failed');
    return r.json() as Promise<{ access_token: string }>;
  },

  async me(token: string) {
    const r = await fetch(`${BASE}/auth/me`, { headers: withAuth({}, token) });
    if (!r.ok) throw new Error('me failed');
    return r.json() as Promise<Me>;
  },

  async updatePreferences(
    token: string,
    prefs: { darkMode?: boolean; fontSize?: 'small' | 'medium' | 'large' },
  ) {
    const r = await fetch(`${BASE}/auth/preferences`, {
      method: 'PATCH',
      headers: withAuth({ 'Content-Type': 'application/json' }, token),
      body: JSON.stringify(prefs),
    });
    if (!r.ok) throw new Error('update preferences failed');
    return r.json();
  },

  async changePassword(token: string, current_password: string, new_password: string) {
    const r = await fetch(`${BASE}/auth/password`, {
      method: 'PATCH',
      headers: withAuth({ 'Content-Type': 'application/json' }, token),
      body: JSON.stringify({ current_password, new_password }),
    });
    if (!r.ok) throw new Error('change password failed');
    return r.json() as Promise<{ ok: true }>;
  },

  async googleLinkStart(token: string, redirect_uri?: string) {
    const r = await fetch(`${BASE}/auth/google/link/start`, {
      method: 'POST',
      headers: withAuth({ 'Content-Type': 'application/json' }, token),
      body: JSON.stringify({ redirect_uri }),
    });
    if (!r.ok) throw new Error('google link start failed');
    return r.json() as Promise<{ url: string }>;
  },


  // ---- Collections
  async collections(token: string) {
    const r = await fetch(`${BASE}/collections`, { headers: withAuth({}, token) });
    if (!r.ok) throw new Error('collections failed');
    return r.json() as Promise<Collection[]>;
  },

  async createCollection(
    token: string,
    data: { name: string; description?: string; isShared?: boolean },
  ) {
    const r = await fetch(`${BASE}/collections`, {
      method: 'POST',
      headers: withAuth({ 'Content-Type': 'application/json' }, token),
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error('create collection failed');
    return r.json() as Promise<Collection>;
  },

  async deleteCollection(token: string, id: number) {
    const r = await fetch(`${BASE}/collections/${id}`, {
      method: 'DELETE',
      headers: withAuth({}, token),
    });
    if (!r.ok) throw new Error('delete collection failed');
    return r.json();
  },

  async exportCollections(token: string, format: 'json' | 'opml' | 'csv' = 'json') {
    const r = await fetch(`${BASE}/collections/export?format=${format}`, {
      headers: withAuth({}, token),
    });
    if (!r.ok) throw new Error('export collections failed');
    return r.blob();
  },

  async importCollections(token: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${BASE}/collections/import`, {
      method: 'POST',
      headers: withAuth({}, token),
      body: fd,
    });
    if (!r.ok) throw new Error('import collections failed');
    return r.json();
  },

  // ---- Invitations
  async invite(
    token: string,
    data: { collectionId: number; email: string; role: MemberRole },
  ) {
    const r = await fetch(`${BASE}/collections/${data.collectionId}/invite`, {
      method: 'POST',
      headers: withAuth({ 'Content-Type': 'application/json' }, token),
      body: JSON.stringify({ email: data.email, role: data.role }),
    });
    if (!r.ok) throw new Error('invite failed');
    return r.json();
  },

  async listInvitations(token: string) {
    const r = await fetch(`${BASE}/invitations`, { headers: withAuth({}, token) });
    if (!r.ok) throw new Error('list invitations failed');
    return r.json() as Promise<Invitation[]>;
  },

  async acceptInvitation(token: string, id: number) {
    const r = await fetch(`${BASE}/invitations/${id}/accept`, {
      method: 'POST',
      headers: withAuth({}, token),
    });
    if (!r.ok) throw new Error('accept invitation failed');
    return r.json();
  },

  async declineInvitation(token: string, id: number) {
    const r = await fetch(`${BASE}/invitations/${id}/decline`, {
      method: 'POST',
      headers: withAuth({}, token),
    });
    if (!r.ok) throw new Error('decline invitation failed');
    return r.json();
  },
  
  // ---- Members
  async listMembers(token: string, collectionId: number) {
    const r = await fetch(`${BASE}/collections/${collectionId}/members`, { headers: withAuth({}, token) });
    if (!r.ok) throw new Error('list members failed');
    return r.json() as Promise<CollectionMember[]>;
  },

  async updateMemberRole(token: string, collectionId: number, userId: number, role: MemberRole) {
    const r = await fetch(`${BASE}/collections/${collectionId}/members/${userId}`, {
      method: 'PATCH',
      headers: withAuth({ 'Content-Type': 'application/json' }, token),
      body: JSON.stringify({ role }),
    });
    if (!r.ok) throw new Error('update member role failed');
    return r.json();
  },

  // ---- Feeds
  async feedsByCollection(token: string, collectionId: number) {
    const r = await fetch(`${BASE}/feeds/collection/${collectionId}`, {
      headers: withAuth({}, token),
    });
    if (!r.ok) throw new Error('feeds failed');
    return r.json() as Promise<Feed[]>;
  },

  async createFeed(
    token: string,
    data: Omit<Feed, 'id' | 'status' | 'collectionId'> & {
      collectionId: number;
      status?: 'ACTIVE' | 'INACTIVE';
    },
  ) {
    const r = await fetch(`${BASE}/feeds`, {
      method: 'POST',
      headers: withAuth({ 'Content-Type': 'application/json' }, token),
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error('create feed failed');
    return r.json() as Promise<Feed>;
  },

  async updateFeed(token: string, id: number, data: Partial<Feed>) {
    const r = await fetch(`${BASE}/feeds/${id}`, {
      method: 'PATCH',
      headers: withAuth({ 'Content-Type': 'application/json' }, token),
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error('update feed failed');
    return r.json();
  },

  async deleteFeed(token: string, id: number) {
    const r = await fetch(`${BASE}/feeds/${id}`, {
      method: 'DELETE',
      headers: withAuth({}, token),
    });
    if (!r.ok) throw new Error('delete feed failed');
    return r.json();
  },

  async refreshFeed(token: string, id: number) {
    const r = await fetch(`${BASE}/feeds/${id}/refresh`, {
      method: 'POST',
      headers: withAuth({}, token),
    });
    if (!r.ok) throw new Error('refresh feed failed');
    return r.json();
  },

  // ---- Articles + filtre
  async listArticles(
    token: string,
    params: {
      collectionId: number;
      feedId?: number;
      category?: string;
      read?: boolean;
      favorite?: boolean;
      q?: string;
      limit?: number;
      cursor?: number;
    },
  ) {
    const usp = new URLSearchParams();
    usp.set('collectionId', String(params.collectionId));
    if (params.feedId) usp.set('feedId', String(params.feedId));
    if (params.category) usp.set('category', params.category);
    if (typeof params.read === 'boolean') usp.set('read', String(params.read));
    if (typeof params.favorite === 'boolean')
      usp.set('favorite', String(params.favorite));
    if (params.q) usp.set('q', params.q);
    if (params.limit) usp.set('limit', String(params.limit));
    if (params.cursor) usp.set('cursor', String(params.cursor));
    const r = await fetch(`${BASE}/articles?${usp.toString()}`, {
      headers: withAuth({}, token),
    });
    if (!r.ok) throw new Error('articles failed');
    return r.json() as Promise<{ items: Article[]; nextCursor: number | null }>;
  },

  async markRead(token: string, articleId: number, isRead: boolean) {
    const r = await fetch(`${BASE}/articles/read`, {
      method: 'POST',
      headers: withAuth({ 'Content-Type': 'application/json' }, token),
      body: JSON.stringify({ articleId, isRead }),
    });
    if (!r.ok) throw new Error('mark read failed');
    return r.json();
  },

  async markFavorite(token: string, articleId: number, isFavorite: boolean) {
    const r = await fetch(`${BASE}/articles/favorite`, {
      method: 'POST',
      headers: withAuth({ 'Content-Type': 'application/json' }, token),
      body: JSON.stringify({ articleId, isFavorite }),
    });
    if (!r.ok) throw new Error('favorite failed');
    return r.json();
  },

  // ---- Chat
  async listMessages(token: string, collectionId: number, cursor?: number) {
    const qs = cursor ? `?cursor=${cursor}` : '';
    const r = await fetch(`${BASE}/chat/${collectionId}/messages${qs}`, {
      headers: withAuth({}, token),
    });
    if (!r.ok) throw new Error('messages failed');
    return r.json() as Promise<{ items: Message[]; nextCursor: number | null }>;
  },

  // ---- Comments
  async listComments(token: string, articleId: number, cursor?: number) {
    const qs = cursor ? `?cursor=${cursor}` : '';
    const r = await fetch(`${BASE}/comments/article/${articleId}${qs}`, {
      headers: withAuth({}, token),
    });
    if (!r.ok) throw new Error('comments failed');
    return r.json() as Promise<{ items: Comment[]; nextCursor: number | null }>;
  },
};
