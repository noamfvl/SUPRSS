import { Module, forwardRef } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { PrismaService } from '../prisma.service';
import { PassportModule } from '@nestjs/passport';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PassportModule,
    forwardRef(() => RealtimeModule), 
  ],
  controllers: [CommentsController],
  providers: [CommentsService, PrismaService],
  exports: [CommentsService], 
})
export class CommentsModule {}
