import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@UseGuards(AuthGuard('jwt')) // toutes les routes nécessitent un utilisateur authentifié (JWT)
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  // Récupère les messages d’une collection donnée (avec pagination et limite)
  @Get(':collectionId/messages')
  list(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Query('limit') limit = '50',
    @Query('cursor') cursor?: string,
  ) {
    return this.chat.listMessages(
      collectionId,
      Number(limit),
      cursor ? Number(cursor) : undefined,
    );
  }
}
