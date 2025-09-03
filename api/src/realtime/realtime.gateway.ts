import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets';
import { UseGuards, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from './ws-jwt.guard';
import { ChatService } from '../chat/chat.service';
import { CommentsService } from '../comments/comments.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
@UseGuards(WsJwtGuard) // sécurise toutes les connexions WS via JWT
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    @Inject(forwardRef(() => ChatService)) private chat: ChatService,
    @Inject(forwardRef(() => CommentsService)) private comments: CommentsService,
  ) {}

  // Connexion WS ouverte (le guard a déjà injecté user dans client.data.user)
  handleConnection(_client: Socket) {}

  // Déconnexion WS
  handleDisconnect(_client: Socket) {}

  // ---- Rooms collections ----
  @SubscribeMessage('join:collection')
  async joinCollection(@ConnectedSocket() client: Socket, @MessageBody() data: { collectionId: number }) {
    const { userId } = (client.data as any).user;
    // Vérifie que le user est membre de la collection
    await this.chat.ensureMemberOrThrow(data.collectionId, userId);
    await client.join(`collection:${data.collectionId}`);
    return { joined: `collection:${data.collectionId}` };
  }

  @SubscribeMessage('leave:collection')
  async leaveCollection(@ConnectedSocket() client: Socket, @MessageBody() data: { collectionId: number }) {
    await client.leave(`collection:${data.collectionId}`);
    return { left: `collection:${data.collectionId}` };
  }

  // ---- Rooms articles ----
  @SubscribeMessage('join:article')
  async joinArticle(@ConnectedSocket() client: Socket, @MessageBody() data: { articleId: number }) {
    const { userId } = (client.data as any).user;
    await this.comments.ensureMemberForArticleOrThrow(data.articleId, userId);
    await client.join(`article:${data.articleId}`);
    return { joined: `article:${data.articleId}` };
  }

  @SubscribeMessage('leave:article')
  async leaveArticle(@ConnectedSocket() client: Socket, @MessageBody() data: { articleId: number }) {
    await client.leave(`article:${data.articleId}`);
    return { left: `article:${data.articleId}` };
  }

  // ---- Messages (collections) ----
  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { collectionId: number; content: string },
  ) {
    const { userId } = (client.data as any).user;
    const msg = await this.chat.sendMessage(userId, data.collectionId, data.content);
    this.server.to(`collection:${data.collectionId}`).emit('message:new', msg);
    return { ok: true, message: msg };
  }

  // ---- Commentaires (articles) ----
  @SubscribeMessage('comment:add')
  async addComment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { articleId: number; content: string },
  ) {
    const { userId } = (client.data as any).user;
    const c = await this.comments.create(userId, data.articleId, data.content);
    this.server.to(`article:${data.articleId}`).emit('comment:new', c);
    return { ok: true, comment: c };
  }

  // Méthodes utilitaires pour émettre côté REST/service
  emitCollectionMessage(collectionId: number, message: any) {
    this.server.to(`collection:${collectionId}`).emit('message:new', message);
  }
  emitArticleComment(articleId: number, comment: any) {
    this.server.to(`article:${articleId}`).emit('comment:new', comment);
  }
}
