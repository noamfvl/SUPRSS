import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ArticlesService } from './articles.service';

@UseGuards(AuthGuard('jwt')) // toutes les routes nécessitent un JWT valide
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  // Récupérer & stocker les articles d’un feed pour l’utilisateur connecté
  @Post('fetch/:feedId')
  fetch(@Req() req, @Param('feedId', ParseIntPipe) feedId: number) {
    return this.articlesService.fetchAndStoreArticlesForUser(req.user.userId, feedId);
  }

  // Lister les articles d’un feed précis
  @Get('feed/:feedId')
  list(@Req() req, @Param('feedId', ParseIntPipe) feedId: number) {
    return this.articlesService.listArticlesForUser(req.user.userId, feedId);
  }

  // Marquer un article comme lu / non-lu
  @Post('read')
  markRead(@Req() req, @Body() body: { articleId: number; isRead: boolean }) {
    return this.articlesService.markRead(req.user.userId, body.articleId, body.isRead);
  }

  // Marquer un article comme favori / non-favori
  @Post('favorite')
  markFavorite(@Req() req, @Body() body: { articleId: number; isFavorite: boolean }) {
    return this.articlesService.markFavorite(req.user.userId, body.articleId, body.isFavorite);
  }

  // Lister les articles avec filtres (collection, feed, catégorie, recherche, etc.)
  @Get()
  listFiltered(
    @Req() req,
    @Query('collectionId') collectionId: string,
    @Query('feedId') feedId?: string,
    @Query('category') category?: string,
    @Query('read') read?: 'true' | 'false',
    @Query('favorite') favorite?: 'true' | 'false',
    @Query('q') q?: string,
    @Query('limit') limit = '20',
    @Query('cursor') cursor?: string,
  ) {
    return this.articlesService.listFiltered({
      userId: req.user.userId,
      collectionId: Number(collectionId),
      feedId: feedId ? Number(feedId) : undefined,
      category,
      read: typeof read === 'string' ? read === 'true' : undefined,
      favorite: typeof favorite === 'string' ? favorite === 'true' : undefined,
      q: q?.trim(),
      limit: Number(limit),
      cursor: cursor ? Number(cursor) : undefined,
    });
  }
}
