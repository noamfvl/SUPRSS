import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import type { Request } from 'express';
import { AuthService } from './auth.service';

type OAuthState =
  | { mode?: 'link'; sub?: number; redirect?: string; iat?: number; exp?: number }
  | null;

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
      // Nécessaire pour accéder à req dans validate (afin de lire le state du callback OAuth)
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback
  ): Promise<any> {
    try {
      // 1) Récupération du paramètre "state" transmis par Google (utile pour mode "link")
      const rawState = (req.query?.state as string) ?? '';
      let state: OAuthState = null;

      if (rawState && typeof this.authService.tryDecodeOAuthState === 'function') {
        state = await this.authService.tryDecodeOAuthState(rawState);
      }

      // 2) Cas d’un "link" → lier un compte Google à un utilisateur existant
      if (state && state.mode === 'link' && typeof state.sub === 'number') {
        const linked = await this.authService.linkOAuthAccount(
          state.sub,
          'google',
          profile,
          accessToken,
          refreshToken
        );
        return done(null, linked); // Retourne { access_token, user }
      }

      // 3) Sinon → flow OAuth standard (login/signup)
      const user = await this.authService.validateOAuthLogin(
        profile,
        'google',
        accessToken,
        refreshToken
      );
      return done(null, user);
    } catch (err) {
      // En cas d’erreur, l’auth échoue
      return done(err, false);
    }
  }
}
