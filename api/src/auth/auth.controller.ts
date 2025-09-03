import { Controller, Post, Body, Get, Req, UseGuards, Res, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Route d'inscription utilisateur
  @Post('register')
  register(@Body() body: { email: string; password: string; name?: string }) {
    return this.authService.register(body.email, body.password, body.name);
  }

  // Route de connexion utilisateur
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  // Récupération des infos utilisateur courant (protégé par JWT)
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: any) {
    return this.authService.me(req.user.userId);
  }

  // AJOUT : persister les préférences utilisateur (dark mode, font size, etc.)
  @UseGuards(AuthGuard('jwt'))
  @Patch('preferences')
  updatePreferences(
    @Req() req: any,
    @Body() body: { darkMode?: boolean; fontSize?: 'small' | 'medium' | 'large' }
  ) {
    return this.authService.updatePreferences(req.user.userId, body);
  }

  // Authentification Google (déclenche le flow OAuth)
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  // Callback Google OAuth (après succès, redirection vers le front avec token)
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const { access_token } = req.user;
    res.redirect(`http://localhost:5173/auth/callback?token=${access_token}`);
  }

  // Changement de mot de passe (protégé par JWT)
  @UseGuards(AuthGuard('jwt'))
  @Patch('password')
  changePassword(
    @Req() req: any,
    @Body() body: { current_password: string; new_password: string }
  ) {
    return this.authService.changePassword(req.user.userId, body.current_password, body.new_password);
  }

  // Démarrage du processus de lien avec un compte Google (ex: lier compte existant)
  @UseGuards(AuthGuard('jwt'))
  @Post('google/link/start')
  async googleLinkStart(
    @Req() req: any,
    @Body() body: { redirect_uri?: string } // optionnel, ex: revenir sur /settings
  ) {
    return this.authService.startGoogleLink(req.user.userId, body.redirect_uri);
  }
}
