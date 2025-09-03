import {
  Controller, Post, Get, Patch, Delete,
  Param, Body, UseGuards, Req, ParseIntPipe,
  Query, Res, UploadedFile, UseInterceptors
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FeedsService } from './feeds.service';
import { JobsService } from '../jobs/jobs.service';
import type { Response, Express } from 'express'; 
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(AuthGuard('jwt')) // toutes les routes nécessitent un JWT valide
@Controller('feeds')
export class FeedsController {
  constructor(
    private readonly feedsService: FeedsService,
    private readonly jobs: JobsService,
  ) {}

  // Création d’un flux dans une collection
  @Post()
  create(@Req() req, @Body() body: any) {
    return this.feedsService.create(req.user.userId, body);
  }

  // Liste des flux d’une collection donnée
  @Get('collection/:collectionId')
  list(@Req() req, @Param('collectionId', ParseIntPipe) collectionId: number) {
    return this.feedsService.listByCollection(req.user.userId, collectionId);
  }

  // Mise à jour d’un flux (titre, catégorie, fréquence…)
  @Patch(':id')
  update(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() patch: any) {
    return this.feedsService.update(req.user.userId, id, patch);
  }

  // Suppression d’un flux
  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.feedsService.remove(req.user.userId, id);
  }

  // Rafraîchissement manuel d’un flux (fetch immédiat)
  @Post(':id/refresh')
  refresh(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.feedsService.refresh(req.user.userId, id);
  }

  // Planification automatique d’un flux (jobs scheduler)
  @Post(':id/schedule')
  schedule(@Param('id', ParseIntPipe) id: number) {
    return this.jobs.scheduleFeed(id);
  }

  // Désactivation de la planification automatique pour un flux
  @Post(':id/unschedule')
  unschedule(@Param('id', ParseIntPipe) id: number) {
    return this.jobs.unscheduleFeed(id);
  }

  // Replanifie tous les flux existants (utile après un redémarrage)
  @Post('reschedule-all')
  rescheduleAll() {
    return this.jobs.scheduleAllFeeds();
  }
}
