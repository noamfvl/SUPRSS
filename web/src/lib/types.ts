export type MemberRole = 'OWNER' | 'MEMBER' | 'READER';

export type Me = {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
};

export type Collection = {
  id: number;
  name: string;
  description?: string | null;
  isShared: boolean;
  ownerId: number;
  createdAt: string;
  members?: Array<{ userId: number; role: MemberRole }>;
};

export type Feed = {
  id: number;
  title: string;
  url: string;
  description?: string | null;
  category?: string | null;
  updateFreq?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  collectionId: number;
};

export type Article = {
  id: number;
  feedId: number;
  title: string;
  url: string;
  author?: string | null;
  summary?: string | null;
  publishedAt?: string | null;
  isRead?: boolean;
  isFavorite?: boolean;
  feed?: { id: number; title: string; category?: string | null };
};

export type Message = {
  id: number;
  collectionId: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: { id: number; email: string; name?: string | null };
};

export type Comment = {
  id: number;
  articleId: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: { id: number; email: string; name?: string | null };
};

export type Invitation = {
  id: number;
  email: string;
  role: MemberRole;
  collectionId: number;
  collection?: { id: number; name: string };
  createdAt: string;
};

export type CollectionMember = {
  userId: number;
  collectionId: number;
  role: MemberRole;
  user?: { id: number; email: string; name?: string | null };
};

