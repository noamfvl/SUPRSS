import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient() as Socket;

    const token =
      (client.handshake.auth && client.handshake.auth.token) ||
      (typeof client.handshake.headers.authorization === 'string' &&
        client.handshake.headers.authorization.startsWith('Bearer ')
        ? client.handshake.headers.authorization.slice(7)
        : undefined);

    if (!token) throw new UnauthorizedException('Missing WS token');

    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET || 'default_secret',
      });
      (client.data as any).user = { userId: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid WS token');
    }
  }
}
