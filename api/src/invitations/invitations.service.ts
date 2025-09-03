import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MemberRole } from '@prisma/client';

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  // Crée une invitation pour un utilisateur (OWNER uniquement)
  async createInvitation(ownerId: number, collectionId: number, email: string, role: MemberRole) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: { members: true },
    });
    if (!collection) throw new NotFoundException('Collection not found');

    // Vérifier que l'appelant est OWNER
    const isOwner = collection.members.some(
      m => m.userId === ownerId && m.role === MemberRole.OWNER,
    );
    if (!isOwner) throw new ForbiddenException('Only owner can invite');

    return this.prisma.invitation.create({
      data: { collectionId, email, role },
    });
  }

  // Liste toutes les invitations reçues par un utilisateur via son email
  async listForUser(email: string) {
    return this.prisma.invitation.findMany({
      where: { email },
      include: { collection: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Accepte une invitation (vérifie ownership par email) et ajoute le user comme membre
  async acceptInvitation(userId: number, id: number, email: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });
    if (!invitation || invitation.email !== email) {
      throw new NotFoundException('Invitation not found');
    }

    // Ajouter l’utilisateur comme membre
    await this.prisma.collectionMember.create({
      data: {
        collectionId: invitation.collectionId,
        userId,
        role: invitation.role,
      },
    });

    // Supprimer l’invitation après acceptation
    return this.prisma.invitation.delete({ where: { id } });
  }

  // Refuse une invitation (suppression si email correspond)
  async declineInvitation(email: string, id: number) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invitation || invitation.email !== email) {
      throw new NotFoundException('Invitation not found');
    }
    return this.prisma.invitation.delete({ where: { id } });
  }
}
