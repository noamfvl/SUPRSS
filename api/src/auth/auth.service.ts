import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import type { User } from '@prisma/client';

// Typage pour les préférences utilisateur
type FontSizePref = 'small' | 'medium' | 'large';
export type UserPrefs = { darkMode?: boolean; fontSize?: FontSizePref };

// Utilitaire pour normaliser les préférences (éviter null/undefined)
function asPrefs(json: unknown): UserPrefs {
  return (json as UserPrefs | null) ?? {};
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // --------------------------------
  // Helpers
  // --------------------------------
  private signToken(user: Pick<User, 'id' | 'email'>): string {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  private createOAuthState(payload: { mode: 'link'; sub: number; redirect?: string }) {
    // Génère un state signé valable 10 minutes pour sécuriser le flow OAuth
    return this.jwtService.sign(payload, { expiresIn: '10m' });
  }

  async tryDecodeOAuthState(state: string | null) {
    if (!state) return null;
    try {
      return this.jwtService.verify(state);
    } catch {
      return null; // state expiré ou invalide
    }
  }

  // --------------------------------
  // Register / Login
  // --------------------------------
  async register(email: string, password: string, name?: string) {
    // Vérifie si l'email est déjà utilisé
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email déjà utilisé');

    // Vérification basique de sécurité du mot de passe
    if (!password || password.length < 8) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères.');
    }

    // Hash du mot de passe avant insertion
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, preferences: true, createdAt: true },
    });

    return { ...user, preferences: asPrefs(user.preferences) };
  }

  async login(email: string, password: string) {
    // Recherche de l’utilisateur
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Vérifie la validité du mot de passe
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');

    // Génération du JWT
    const access_token = this.signToken(user);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        preferences: asPrefs(user.preferences),
        createdAt: user.createdAt,
      },
    };
  }

  // --------------------------------
  // Changement de mot de passe
  // --------------------------------
  async changePassword(userId: number, current: string, nextPwd: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Compte sans mot de passe local.');
    }

    // Vérifie le mot de passe actuel
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Mot de passe actuel invalide.');

    // Vérifie la force du nouveau mot de passe
    if (!nextPwd || nextPwd.length < 8) {
      throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    }

    // Remplace le hash
    const newHash = await bcrypt.hash(nextPwd, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { ok: true };
  }

  // --------------------------------
  // Profil & Préférences
  // --------------------------------
  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, preferences: true, createdAt: true },
    });
    if (!user) return null;
    return { ...user, preferences: asPrefs(user.preferences) };
  }

  async updatePreferences(userId: number, prefs: UserPrefs) {
    // Récupère les préférences actuelles
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    // Fusionne les prefs existantes avec les nouvelles
    const currentPrefs = asPrefs(current?.preferences);
    const merged = { ...currentPrefs, ...prefs };

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: merged },
      select: { id: true, email: true, name: true, preferences: true },
    });

    return { ...user, preferences: asPrefs(user.preferences) };
  }

  // --------------------------------
  // OAuth - Lier Google à un compte existant
  // --------------------------------
  async startGoogleLink(userId: number, redirect_uri?: string) {
    // Génère une URL OAuth Google avec state sécurisé
    const state = this.createOAuthState({ mode: 'link', sub: userId, redirect: redirect_uri });
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const cb = encodeURIComponent(
      process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    );
    const scope = encodeURIComponent('email profile');

    const url =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${cb}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${encodeURIComponent(state)}` +
      `&access_type=offline` +
      `&include_granted_scopes=true` +
      `&prompt=consent`;

    return { url };
  }

  async linkOAuthAccount(
    userId: number,
    provider: 'google',
    profile: any,
    accessToken?: string,
    refreshToken?: string,
  ) {
    const providerId: string | undefined = profile?.id;
    if (!providerId) throw new UnauthorizedException('Profil OAuth invalide (id manquant)');

    // Vérifie si ce compte Google est déjà lié à un autre utilisateur
    const existing = await this.prisma.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId: providerId } },
      include: { user: true },
    });
    if (existing && existing.userId !== userId) {
      throw new ConflictException('Ce compte Google est déjà lié à un autre utilisateur.');
    }

    // Crée ou met à jour le lien OAuth
    if (!existing) {
      await this.prisma.account.create({
        data: {
          provider,
          providerAccountId: providerId,
          userId,
          accessToken,
          refreshToken,
        },
      });
    } else {
      // Met à jour les tokens si dispo
      if (accessToken || refreshToken) {
        await this.prisma.account.update({
          where: { provider_providerAccountId: { provider, providerAccountId: providerId } },
          data: { accessToken, refreshToken },
        });
      }
    }

    // Récupère le user et renvoie un JWT
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, preferences: true },
    });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');

    const jwt = this.signToken(user);
    return {
      access_token: jwt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        preferences: asPrefs(user.preferences),
      },
    };
  }

  // --------------------------------
  // OAuth - Login / Signup Google (flow existant)
  // --------------------------------
  async validateOAuthLogin(
    profile: any,
    provider: string,
    accessToken?: string,
    refreshToken?: string,
  ) {
    const email: string | undefined = profile?.emails?.[0]?.value;
    const providerId: string | undefined = profile?.id;

    if (!providerId) {
      throw new UnauthorizedException('Profil OAuth invalide (id manquant)');
    }
    if (!email) {
      throw new BadRequestException("Impossible d'obtenir l’e-mail depuis le fournisseur OAuth.");
    }

    // Recherche si un compte OAuth existe déjà
    let account = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId: providerId },
      },
      include: { user: true },
    });

    if (!account) {
      // Pas trouvé → tente de retrouver un utilisateur existant via l'email
      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Création d'un nouvel utilisateur avec compte OAuth
        user = await this.prisma.user.create({
          data: {
            email,
            name: profile?.displayName || '',
            accounts: {
              create: { provider, providerAccountId: providerId, accessToken, refreshToken },
            },
          },
        });
      } else {
        // Lien OAuth ajouté à un utilisateur existant
        await this.prisma.account.create({
          data: {
            provider,
            providerAccountId: providerId,
            userId: user.id,
            accessToken,
            refreshToken,
          },
        });
      }

      // Recharge l’account nouvellement lié
      account = await this.prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId: providerId } },
        include: { user: true },
      });
    }

    if (!account?.user) throw new UnauthorizedException('Échec de la connexion OAuth');

    // Retourne un JWT + infos user
    const jwt = this.signToken(account.user);
    return {
      access_token: jwt,
      user: {
        id: account.user.id,
        email: account.user.email,
        name: account.user.name,
        preferences: asPrefs(account.user.preferences),
      },
    };
  }
}
