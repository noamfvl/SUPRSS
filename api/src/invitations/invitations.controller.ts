import { Controller, Post, Get, Param, Req, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvitationsService } from './invitations.service';
import { MemberRole } from '@prisma/client';

@UseGuards(AuthGuard('jwt')) // toutes les routes nécessitent un utilisateur connecté
@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  // Crée une invitation à rejoindre une collection (OWNER/ADMIN uniquement en principe)
  @Post('collections/:id/invite')
  create(
    @Req() req,
    @Param('id') collectionId: number,
    @Body() body: { email: string; role: MemberRole },
  ) {
    return this.invitations.createInvitation(
      req.user.userId,
      Number(collectionId),
      body.email,
      body.role,
    );
  }

  // Liste toutes les invitations reçues par l’utilisateur courant
  @Get('invitations')
  list(@Req() req) {
    return this.invitations.listForUser(req.user.email);
  }

  // Accepte une invitation à rejoindre une collection
  @Post('invitations/:id/accept')
  accept(@Req() req, @Param('id') id: number) {
    return this.invitations.acceptInvitation(
      req.user.userId,
      Number(id),
      req.user.email,
    );
  }

  // Refuse une invitation
  @Post('invitations/:id/decline')
  decline(@Req() req, @Param('id') id: number) {
    return this.invitations.declineInvitation(req.user.email, Number(id));
  }
}
