import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Parser from 'rss-parser';
import { Prisma } from '@prisma/client';

type RssItem = {
  link?: string;
  id?: string;
  title?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string | string[];
  author?: string;
  contentSnippet?: string;
  content?: string;
  guid?: string;
};

@Injectable()
export class ArticlesService {
  private parser = new Parser<unknown, RssItem>(); // parser RSS

  constructor(private prisma: PrismaService) {}

  // Vérifie que l'utilisateur est membre d'une collection via un feed
  private async ensureMemberByFeedOrThrow(feedId: number, userId: number) {
    const feed = await this.prisma.feed.findUnique({
      where: { id: feedId },
      select: { collectionId: true },
    });
    if (!feed) throw new NotFoundException('Feed not found');

    const membership = await this.prisma.collectionMember.findUnique({
      where: { userId_collectionId: { userId, collectionId: feed.collectionId } },
    });
    if (!membership) throw new ForbiddenException('You are not a member of this collection');

    return feed;
  }

  // Vérifie que l'utilisateur est membre d'une collection via un article
  private async ensureMemberByArticleOrThrow(articleId: number, userId: number) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { feed: { select: { collectionId: true } } },
    });
    if (!article) throw new NotFoundException('Article not found');

    const membership = await this.prisma.collectionMember.findUnique({
      where: { userId_collectionId: { userId, collectionId: article.feed.collectionId } },
    });
    if (!membership) throw new ForbiddenException('You are not a member of this collection');
  }

  // Parse un flux RSS et stocke les nouveaux articles en base
  async fetchAndStoreArticles(feedId: number) {
    const feed = await this.prisma.feed.findUnique({ where: { id: feedId } });
    if (!feed) throw new NotFoundException('Feed not found');

    const parsed = await this.parser.parseURL(feed.url);
    const items = parsed.items ?? [];
    let createdCount = 0;

    for (const item of items) {
      const url = item.link ?? item.id ?? '';
      if (!url) continue;

      const publishedAt =
        item.isoDate ? new Date(item.isoDate) :
        item.pubDate ? new Date(item.pubDate) :
        null;

      const author =
        Array.isArray(item.creator) ? item.creator[0] :
        item.creator ?? item.author ?? null;

      try {
        await this.prisma.article.create({
          data: {
            title: item.title || 'Sans titre',
            url,
            publishedAt,
            author,
            summary: item.contentSnippet ?? null,
            contentText: item.content ? stripHtml(item.content) : null,
            guid: item.guid ?? null,
            feedId,
          },
        });
        createdCount++;
      } catch {
        // on ignore les doublons (conflits guid/url)
      }
    }

    return { message: 'Articles updated', processed: items.length, created: createdCount };
  }

  // Récupération sécurisée (vérifie que user est membre)
  async fetchAndStoreArticlesForUser(userId: number, feedId: number) {
    await this.ensureMemberByFeedOrThrow(feedId, userId);
    return this.fetchAndStoreArticles(feedId);
  }

  // Liste des articles d’un feed accessible par l'utilisateur
  async listArticlesForUser(userId: number, feedId: number) {
    await this.ensureMemberByFeedOrThrow(feedId, userId);
    return this.prisma.article.findMany({
      where: { feedId },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    });
  }

  // Marque un article comme lu / non-lu
  async markRead(userId: number, articleId: number, isRead: boolean) {
    await this.ensureMemberByArticleOrThrow(articleId, userId);
    return this.prisma.articleStatus.upsert({
      where: { userId_articleId: { userId, articleId } },
      update: { isRead },
      create: { userId, articleId, isRead },
    });
  }

  // Marque un article comme favori / non-favori
  async markFavorite(userId: number, articleId: number, isFavorite: boolean) {
    await this.ensureMemberByArticleOrThrow(articleId, userId);
    return this.prisma.articleStatus.upsert({
      where: { userId_articleId: { userId, articleId } },
      update: { isFavorite },
      create: { userId, articleId, isFavorite },
    });
  }

  // Liste filtrée des articles (collection, feed, catégorie, recherche texte, etc.)
  async listFiltered(params: {
    userId: number;
    collectionId: number;
    feedId?: number;
    category?: string;
    read?: boolean;
    favorite?: boolean;
    q?: string;
    limit: number;
    cursor?: number;
  }) {
    const { userId, collectionId, feedId, category, read, favorite, q, limit, cursor } = params;

    // Vérifie que l’utilisateur a accès à la collection
    const membership = await this.prisma.collectionMember.findUnique({
      where: { userId_collectionId: { userId, collectionId } },
    });
    if (!membership) throw new ForbiddenException('You are not a member of this collection');

    // Construit les filtres
    const feedFilter: Prisma.FeedWhereInput = {
      collectionId,
      ...(feedId ? { id: feedId } : {}),
      ...(category ? { category } : {}),
    };

    const AND: Prisma.ArticleWhereInput[] = [{ feed: feedFilter }];

    // Recherche plein texte
    if (q) {
      AND.push({
        OR: [
          { title:       { contains: q, mode: 'insensitive' } },
          { summary:     { contains: q, mode: 'insensitive' } },
          { contentText: { contains: q, mode: 'insensitive' } },
          { author:      { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    // Filtre read/unread
    if (read === true) {
      AND.push({ statuses: { some: { userId, isRead: true } } });
    } else if (read === false) {
      AND.push({
        OR: [
          { statuses: { none: { userId } } },
          { statuses: { some: { userId, isRead: false } } },
        ],
      });
    }

    // Filtre favoris
    if (favorite === true) {
      AND.push({ statuses: { some: { userId, isFavorite: true } } });
    } else if (favorite === false) {
      AND.push({
        OR: [
          { statuses: { none: { userId } } },
          { statuses: { some: { userId, isFavorite: false } } },
        ],
      });
    }

    const where: Prisma.ArticleWhereInput = AND.length ? { AND } : {};

    // Limite et pagination
    const take = Math.min(Math.max(limit || 20, 1), 100);

    const results = await this.prisma.article.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        feed: { select: { id: true, title: true, category: true } },
        statuses: { where: { userId }, select: { isRead: true, isFavorite: true } },
      },
    });

    const nextCursor = results.length === take ? results[results.length - 1].id : null;

    return {
      items: results.map((r) => ({
        id: r.id,
        title: r.title,
        url: r.url,
        author: r.author,
        summary: r.summary,
        publishedAt: r.publishedAt,
        feed: r.feed,
        isRead: r.statuses[0]?.isRead ?? false,
        isFavorite: r.statuses[0]?.isFavorite ?? false,
      })),
      nextCursor,
    };
  }
}

// Supprime les balises HTML d’un contenu
function stripHtml(html?: string): string | null {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
