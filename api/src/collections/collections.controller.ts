import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  Param,
  Patch,
  Delete,
  UploadedFile,
  UseInterceptors,
  Res,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response, Request } from 'express';
import { MemberRole } from '@prisma/client';
import { CollectionsService } from './collections.service';

@UseGuards(AuthGuard('jwt')) // toutes les routes sont protégées par JWT
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  // Création d’une collection (par l’utilisateur courant)
  @Post()
  create(
    @Req() req: Request & { user: { userId: number } },
    @Body() body: { name: string; description?: string; isShared?: boolean },
  ) {
    return this.collectionsService.create(
      req.user.userId,
      body.name,
      body.description,
      body.isShared,
    );
  }

  // Liste toutes les collections de l’utilisateur
  @Get()
  findAll(@Req() req: Request & { user: { userId: number } }) {
    return this.collectionsService.findAllForUser(req.user.userId);
  }

  // Ajoute un membre à une collection
  @Post('add-member')
  addMember(
    @Req() req: Request & { user: { userId: number } },
    @Body() body: { collectionId: number; userId: number; role: MemberRole },
  ) {
    return this.collectionsService.addMember(
      body.collectionId,
      req.user.userId,
      body.userId,
      body.role,
    );
  }

  // Récupère la liste des membres d’une collection
  @Get(':id/members')
  listMembers(
    @Req() req: Request & { user: { userId: number } },
    @Param('id') id: string,
  ) {
    return this.collectionsService.getMembers(Number(id), req.user.userId);
  }

  // Met à jour le rôle d’un membre dans une collection
  @Patch(':id/members/:userId')
  updateMemberRole(
    @Req() req: Request & { user: { userId: number } },
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { role: MemberRole },
  ) {
    return this.collectionsService.updateMemberRole(
      Number(id),
      req.user.userId,
      Number(userId),
      body.role,
    );
  }

  // Supprime une collection
  @Delete(':id')
  deleteCollection(
    @Req() req: Request & { user: { userId: number } },
    @Param('id') id: string,
  ) {
    return this.collectionsService.deleteCollection(Number(id), req.user.userId);
  }

  // --- Export des collections (JSON/OPML/CSV) ---
  @Get('export')
  async exportCollections(
    @Req() req: Request & { user: { userId: number } },
    @Res() res: Response,
    @Query('format') format: 'json' | 'opml' | 'csv' = 'json',
  ) {
    const { buffer, filename, contentType } =
      await this.collectionsService.exportCollections(req.user.userId, format);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // --- Import des collections (JSON/OPML/CSV) ---
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCollections(
    @Req() req: Request & { user: { userId: number } },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Missing file');
    const result = await this.collectionsService.importCollections(req.user.userId, file);
    return { imported: result.imported, collections: result.createdCollections };
  }
}
