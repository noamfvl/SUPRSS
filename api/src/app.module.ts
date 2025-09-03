import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module'; 
import { FeedsModule } from './feeds/feeds.module';
import { CommentsModule } from './comments/comments.module';
import { ChatModule } from './chat/chat.module';
import { ArticlesModule } from './articles/articles.module';
import { RealtimeModule } from './realtime/realtime.module';
import { InvitationsModule } from './invitations/invitations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Configuration JWT globale
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN},
    }),
    // Module d'authentification
    AuthModule,
    // Module collections
    CollectionsModule,
    // Module Feeds
    FeedsModule,
    // Module Article
    ArticlesModule,
    // Module Temps réel 
    RealtimeModule,
    //Module chat
    ChatModule,
    //Module comment
    CommentsModule,
    //Module d'invitation
    InvitationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
