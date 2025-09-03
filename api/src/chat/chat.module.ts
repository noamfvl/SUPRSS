import { Module, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaService } from '../prisma.service';
import { PassportModule } from '@nestjs/passport';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PassportModule,
    forwardRef(() => RealtimeModule), 
  ],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
  exports: [ChatService], 
})
export class ChatModule {}
