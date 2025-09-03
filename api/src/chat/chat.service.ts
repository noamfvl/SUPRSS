import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // Vérifie qu’un utilisateur est membre d’une collection, sinon lève une exception
  async ensureMemberOrThrow(collectionId: number, userId: number) {
    const membership = await this.prisma.collectionMember.findUnique({
      where: { userId_collectionId: { userId, collectionId } },
      select: { role: true },
    });
    if (!membership) throw new ForbiddenException('Not a member of this collection');
    return membership;
  }

  // Envoie un message dans une collection (uniquement si membre autorisé)
  async sendMessage(userId: number, collectionId: number, content: string) {
    await this.ensureMemberOrThrow(collectionId, userId);
    return this.prisma.message.create({
      data: { userId, collectionId, content },
      include: { user: { select: { id: true, email: true, name: true } } }, // inclut info auteur
    });
  }

  // Liste les messages d’une collection avec pagination par curseur
  async listMessages(collectionId: number, limit = 50, cursor?: number) {
    // borne les limites pour éviter abus (min 1 / max 200)
    const take = Math.min(Math.max(limit, 1), 200);

    const items = await this.prisma.message.findMany({
      where: { collectionId },
      orderBy: { createdAt: 'asc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), // pagination si curseur fourni
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    // nextCursor = dernier id si on a atteint la limite
    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }
}
