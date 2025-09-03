import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MemberRole } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  // Vérifie que l'utilisateur est membre de la collection liée à l'article
  async ensureMemberForArticleOrThrow(articleId: number, userId: number) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { feed: { select: { collectionId: true } } },
    });
    if (!article) throw new NotFoundException('Article not found');

    const membership = await this.prisma.collectionMember.findUnique({
      where: {
        userId_collectionId: {
          userId,
          collectionId: article.feed.collectionId,
        },
      },
      select: { role: true },
    });
    if (!membership) throw new ForbiddenException('Not a member of this collection');
    return { collectionId: article.feed.collectionId, role: membership.role as MemberRole };
  }

  // Crée un commentaire pour un article (réservé aux membres de la collection)
  async create(userId: number, articleId: number, content: string) {
    await this.ensureMemberForArticleOrThrow(articleId, userId);
    return this.prisma.comment.create({
      data: { userId, articleId, content },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  // Liste les commentaires d'un article avec pagination par curseur
  async listForArticle(articleId: number, limit = 50, cursor?: number) {
    // borne la limite (1..200)
    const take = Math.min(Math.max(limit, 1), 200);
    const items = await this.prisma.comment.findMany({
      where: { articleId },
      orderBy: { createdAt: 'asc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }
}
