import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MemberRole, FeedStatus } from '@prisma/client';
import Parser from 'rss-parser';
import { JobsService } from '../jobs/jobs.service';
import { stringify as csvStringify } from 'csv-stringify/sync';
import { parse as csvParse } from 'csv-parse/sync';
import { parseStringPromise } from 'xml2js';
import dayjs from 'dayjs';

@Injectable()
export class FeedsService {
  constructor(
    private prisma: PrismaService,
    private jobs: JobsService
  ) {}

  // --- helpers permissions ---
  private async ensureMemberOrThrow(collectionId: number, userId: number) {
    const membership = await this.prisma.collectionMember.findUnique({
      where: { userId_collectionId: { userId, collectionId } },
    });
    if (!membership) throw new ForbiddenException('You are not a member of this collection');
    return membership;
  }
  private ensureCanEdit(role: MemberRole) {
    if (role === MemberRole.READER) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  // --- CRUD ---
  async create(userId: number, dto: {
    collectionId: number;
    title: string;
    url: string;
    description?: string;
    category?: string;
    updateFreq?: string;
    status?: FeedStatus;
  }) {
    const membership = await this.ensureMemberOrThrow(dto.collectionId, userId);
    this.ensureCanEdit(membership.role); // seule écriture pour rôles >= EDITOR

    const created = await this.prisma.feed.create({
      data: {
        collectionId: dto.collectionId,
        title: dto.title,
        url: dto.url,
        description: dto.description,
        category: dto.category,
        updateFreq: dto.updateFreq,
        status: dto.status ?? FeedStatus.ACTIVE,
      },
    });

    await this.jobs.scheduleFeed(created.id); // planifie le job de refresh selon updateFreq
    return created;
  }

  async listByCollection(userId: number, collectionId: number) {
    await this.ensureMemberOrThrow(collectionId, userId); // lecture réservée aux membres
    return this.prisma.feed.findMany({
      where: { collectionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: number, feedId: number, patch: {
    title?: string;
    description?: string;
    category?: string;
    updateFreq?: string;
    status?: FeedStatus;
  }) {
    const feed = await this.prisma.feed.findUnique({ where: { id: feedId } });
    if (!feed) throw new NotFoundException('Feed not found');

    const membership = await this.ensureMemberOrThrow(feed.collectionId, userId);
    this.ensureCanEdit(membership.role);

    const updated = await this.prisma.feed.update({
      where: { id: feedId },
      data: { ...patch },
    });

    // si la fréquence change, on reprogramme le job
    if (patch.updateFreq !== undefined) {
      await this.jobs.scheduleFeed(feedId);
    }
    return updated;
  }

  async remove(userId: number, feedId: number) {
    const feed = await this.prisma.feed.findUnique({ where: { id: feedId } });
    if (!feed) throw new NotFoundException('Feed not found');

    const membership = await this.ensureMemberOrThrow(feed.collectionId, userId);
    this.ensureCanEdit(membership.role);

    await this.jobs.unscheduleFeed(feedId); // stoppe la planification

    // Récupérer les ids d’articles pour supprimer status/comments avant
    const articles = await this.prisma.article.findMany({
      where: { feedId },
      select: { id: true },
    });
    const articleIds = articles.map(a => a.id);

    if (articleIds.length > 0) {
      await this.prisma.comment.deleteMany({ where: { articleId: { in: articleIds } } });
      await this.prisma.articleStatus.deleteMany({ where: { articleId: { in: articleIds } } });
      await this.prisma.article.deleteMany({ where: { id: { in: articleIds } } });
    }

    return this.prisma.feed.delete({ where: { id: feedId } });
  }

  async refresh(userId: number, feedId: number) {
    const feed = await this.prisma.feed.findUnique({ where: { id: feedId } });
    if (!feed) throw new NotFoundException('Feed not found');

    await this.ensureMemberOrThrow(feed.collectionId, userId); // autorisation lecture/refresh

    // 🚦 bloquer refresh si INACTIVE
    if (feed.status === FeedStatus.INACTIVE) {
      throw new BadRequestException('Feed is inactive');
    }

    // Parse le flux RSS/Atom via rss-parser
    const parser = new Parser();
    const parsed = await parser.parseURL(feed.url);
    const items = parsed.items || [];

    // Normalise les items en Articles à créer (en filtrant ceux sans URL)
    const toCreate = items
      .map((it) => ({
        feedId: feed.id,
        guid: it.guid ?? null,
        url: it.link || (it.id ?? ''),
        title: it.title ?? '(sans titre)',
        author:
          (Array.isArray(it.creator) ? it.creator[0] : it.creator) ??
          (it as any).author ??
          null,
        publishedAt: (it as any).isoDate
          ? new Date((it as any).isoDate)
          : it.pubDate
          ? new Date(it.pubDate)
          : null,
        summary: it.contentSnippet ?? null,
        contentText: it.content ? stripHtml(it.content) : null,
      }))
      .filter((a) => a.url);

    // insert en bulk (skipDuplicates pour éviter doublons par guid/url)
    if (toCreate.length > 0) {
      await this.prisma.article.createMany({ data: toCreate, skipDuplicates: true });
    }

    // met à jour la date de dernier fetch
    await this.prisma.feed.update({
      where: { id: feed.id },
      data: { lastFetchedAt: new Date() },
    });

    // renvoie le delta + total pour feedback UI
    const count = await this.prisma.article.count({ where: { feedId: feed.id } });
    return { added: toCreate.length, totalArticlesForFeed: count };
  }
}

// utils
function stripHtml(html?: string): string | null {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
