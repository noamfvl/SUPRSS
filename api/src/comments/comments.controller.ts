import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentsService } from './comments.service';

@UseGuards(AuthGuard('jwt')) // toutes les routes nécessitent un utilisateur authentifié (JWT)
@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  // Liste les commentaires d’un article donné (pagination par curseur + limite)
  @Get('article/:articleId')
  list(
    @Param('articleId', ParseIntPipe) articleId: number,
    @Query('limit') limit = '50',
    @Query('cursor') cursor?: string,
  ) {
    return this.comments.listForArticle(
      articleId,
      Number(limit),
      cursor ? Number(cursor) : undefined,
    );
  }
}
