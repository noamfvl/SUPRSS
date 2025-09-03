import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Express } from 'express';
import { PrismaService } from '../prisma.service';
import { FeedStatus, MemberRole } from '@prisma/client';

// ---------- Types d’échange (export/import) — AU NIVEAU MODULE ----------
export type ExportedFeed = {
  title: string;
  url: string;
  description?: string | null;
  category?: string | null;
  updateFreq?: 'hourly' | '6h' | 'daily' | null;
  status: 'ACTIVE' | 'INACTIVE';
};

export type ExportedCollection = {
  name: string;
  description?: string | null;
  isShared: boolean;
  feeds: ExportedFeed[];
};

export type CollectionsExport = {
  version: '1.0';
  exportedAt: string;
  ownerNote: string;
  collections: ExportedCollection[];
};

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  // ---------- CRUD de base ----------

  // Crée une nouvelle collection + ajoute le créateur comme OWNER
  async create(userId: number, name: string, description?: string, isShared = false) {
    return this.prisma.collection.create({
      data: {
        name,
        description: description ?? null,
        isShared,
        owner: { connect: { id: userId } },
        members: {
          create: {
            user: { connect: { id: userId } },
            role: 'OWNER',
          },
        },
      },
      include: { members: true },
    });
  }

  // Liste toutes les collections auxquelles l’utilisateur participe
  async findAllForUser(userId: number) {
    return this.prisma.collection.findMany({
      where: { members: { some: { userId } } },
      include: { members: true },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  // ---------- Membres / rôles ----------

  // Ajoute un membre à une collection (OWNER seulement)
  async addMember(collectionId: number, ownerId: number, newUserId: number, role: MemberRole) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: { members: true },
    });
    if (!collection) throw new NotFoundException('Collection not found');

    const isOwner = collection.members.some(
      (m) => m.userId === ownerId && m.role === MemberRole.OWNER,
    );
    if (!isOwner) throw new ForbiddenException('Only the owner can add members');

    return this.prisma.collectionMember.create({
      data: { collectionId, userId: newUserId, role },
    });
  }

  // Retourne les membres d’une collection (accès réservé aux membres)
  async getMembers(collectionId: number, requesterId: number) {
    const membership = await this.prisma.collectionMember.findUnique({
      where: { userId_collectionId: { userId: requesterId, collectionId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this collection');

    return this.prisma.collectionMember.findMany({
      where: { collectionId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { role: 'asc' },
    });
  }

  // Modifie le rôle d’un membre (OWNER seulement, avec vérifications)
  async updateMemberRole(
    collectionId: number,
    ownerId: number,
    targetUserId: number,
    role: MemberRole,
  ) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: { members: true },
    });
    if (!collection) throw new NotFoundException('Collection not found');

    const isOwner = collection.members.some(
      (m) => m.userId === ownerId && m.role === MemberRole.OWNER,
    );
    if (!isOwner) throw new ForbiddenException('Only the owner can update roles');

    const target = collection.members.find((m) => m.userId === targetUserId);
    if (!target) throw new NotFoundException('Target member not found');

    // Empêche de rétrograder le dernier OWNER restant
    const ownersCount = collection.members.filter((m) => m.role === MemberRole.OWNER).length;
    const isDemotingOwner = target.role === MemberRole.OWNER && role !== MemberRole.OWNER;
    if (isDemotingOwner && ownersCount <= 1) {
      throw new BadRequestException('Cannot demote the last owner');
    }

    return this.prisma.collectionMember.update({
      where: { userId_collectionId: { userId: targetUserId, collectionId } },
      data: { role },
    });
  }

  // ---------- Suppression complète (OWNER only) ----------

  async deleteCollection(collectionId: number, requesterId: number) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: { members: true },
    });
    if (!collection) throw new NotFoundException('Collection not found');

    const isOwner = collection.members.some(
      (m) => m.userId === requesterId && m.role === MemberRole.OWNER,
    );
    if (!isOwner) throw new ForbiddenException('Only the owner can delete the collection');

    // Suppression en cascade dans une transaction (feeds, articles, commentaires, etc.)
    await this.prisma.$transaction(async (tx) => {
      const feeds = await tx.feed.findMany({
        where: { collectionId },
        select: { id: true },
      });
      const feedIds = feeds.map((f) => f.id);

      if (feedIds.length > 0) {
        const articles = await tx.article.findMany({
          where: { feedId: { in: feedIds } },
          select: { id: true },
        });
        const articleIds = articles.map((a) => a.id);

        if (articleIds.length > 0) {
          await tx.comment.deleteMany({ where: { articleId: { in: articleIds } } });
          await tx.articleStatus.deleteMany({ where: { articleId: { in: articleIds } } });
          await tx.article.deleteMany({ where: { id: { in: articleIds } } });
        }

        await tx.feed.deleteMany({ where: { id: { in: feedIds } } });
      }

      await tx.message.deleteMany({ where: { collectionId } });
      await tx.collectionMember.deleteMany({ where: { collectionId } });
      await tx.collection.delete({ where: { id: collectionId } });
    });

    return { success: true };
  }

  // ---------- EXPORT ----------

  // Exporte les collections d’un utilisateur (format JSON / OPML / CSV)
  async exportCollections(
    userId: number,
    format: 'json' | 'opml' | 'csv' = 'json',
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const memberships = await this.prisma.collectionMember.findMany({
      where: { userId },
      select: {
        collection: {
          select: {
            id: true,
            name: true,
            description: true,
            isShared: true,
            ownerId: true,
            feeds: {
              select: {
                title: true,
                url: true,
                description: true,
                category: true,
                updateFreq: true,
                status: true,
              },
              orderBy: [{ id: 'asc' }],
            },
          },
        },
      },
    });

    // Seules les collections perso ou possédées (shared) sont exportées
    const exportables = memberships
      .map((m) => m.collection)
      .filter((c) => !c.isShared || c.ownerId === userId);

    const payload: CollectionsExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      ownerNote:
        'Export SUPRSS: vos collections personnelles + les collections partagées que vous possédez.',
      collections: exportables.map((c) => ({
        name: c.name,
        description: c.description ?? null,
        isShared: c.isShared,
        feeds: c.feeds.map((f) => ({
          title: f.title,
          url: f.url,
          description: f.description ?? null,
          category: f.category ?? null,
          updateFreq: (f.updateFreq as any) ?? null,
          status: (f.status as FeedStatus) === FeedStatus.INACTIVE ? 'INACTIVE' : 'ACTIVE',
        })),
      })),
    };

    // Retourne le format demandé
    if (format === 'json') {
      const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');
      return {
        buffer,
        filename: 'suprss-collections.json',
        contentType: 'application/json; charset=utf-8',
      };
    }

    if (format === 'opml') {
      const xml = this.toOPML(payload);
      return {
        buffer: Buffer.from(xml, 'utf8'),
        filename: 'suprss-collections.opml',
        contentType: 'text/xml; charset=utf-8',
      };
    }

    if (format === 'csv') {
      const csv = this.toCSV(payload);
      return {
        buffer: Buffer.from(csv, 'utf8'),
        filename: 'suprss-collections.csv',
        contentType: 'text/csv; charset=utf-8',
      };
    }

    throw new BadRequestException('Unsupported format');
  }

  // ---------- IMPORT ----------

  // Importe des collections depuis un fichier (JSON / OPML / CSV)
  async importCollections(
    userId: number,
    file: Express.Multer.File,
  ): Promise<{ imported: number; createdCollections: number[] }> {
    const content = file.buffer.toString('utf8').trim();
    const filename = file.originalname.toLowerCase();

    let data: CollectionsExport;

    // Détection du format par extension/mimetype
    if (filename.endsWith('.json') || file.mimetype.includes('json')) {
      data = this.fromJSON(content);
    } else if (
      filename.endsWith('.opml') ||
      filename.endsWith('.xml') ||
      file.mimetype.includes('xml')
    ) {
      data = this.fromOPML(content);
    } else if (filename.endsWith('.csv') || file.mimetype.includes('csv')) {
      data = this.fromCSV(content);
    } else {
      throw new BadRequestException('Unsupported file type');
    }

    if (!data.collections?.length) {
      return { imported: 0, createdCollections: [] };
    }

    // Création des collections + feeds
    const created: number[] = [];
    let importedCount = 0;

    for (const col of data.collections) {
      const createdCol = await this.prisma.collection.create({
        data: {
          name: col.name,
          description: col.description ?? null,
          isShared: !!col.isShared,
          owner: { connect: { id: userId } },
          members: {
            create: [{ user: { connect: { id: userId } }, role: 'OWNER' }],
          },
        },
      });
      created.push(createdCol.id);

      for (const f of col.feeds || []) {
        await this.prisma.feed.create({
          data: {
            title: f.title || f.url,
            url: f.url,
            description: f.description ?? null,
            category: f.category ?? null,
            updateFreq: (f.updateFreq as any) ?? null,
            status:
              (f.status as any) === 'INACTIVE' ? FeedStatus.INACTIVE : FeedStatus.ACTIVE,
            collectionId: createdCol.id,
          },
        });
        importedCount++;
      }
    }

    return { imported: importedCount, createdCollections: created };
  }

  // ---------- Helpers de sérialisation ----------

  // Génère un OPML à partir du payload export
  private toOPML(payload: CollectionsExport): string {
    const esc = (s?: string | null) =>
      (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

    const outlines = payload.collections
      .map((c) => {
        const feeds = (c.feeds || [])
          .map((f) => {
            const attrs = [
              `text="${esc(f.title || f.url)}"`,
              `title="${esc(f.title || f.url)}"`,
              `type="rss"`,
              `xmlUrl="${esc(f.url)}"`,
            ];
            if (f.description) attrs.push(`description="${esc(f.description)}"`);
            if (f.category) attrs.push(`category="${esc(f.category)}"`);
            if (f.updateFreq) attrs.push(`suprss:updateFreq="${esc(f.updateFreq)}"`);
            if (f.status) attrs.push(`suprss:status="${esc(f.status)}"`);

            return `      <outline ${attrs.join(' ')} />`;
          })
          .join('\n');

        const colAttrs = [`text="${esc(c.name)}"`, `title="${esc(c.name)}"`];
        if (c.description) colAttrs.push(`description="${esc(c.description)}"`);
        colAttrs.push(`suprss:isShared="${c.isShared ? 'true' : 'false'}"`);

        return `    <outline ${colAttrs.join(' ')}>\n${feeds}\n    </outline>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>SUPRSS Collections Export</title>
    <dateCreated>${payload.exportedAt}</dateCreated>
  </head>
  <body>
${outlines}
  </body>
</opml>
`;
  }

  // Génère un CSV à partir du payload export
  private toCSV(payload: CollectionsExport): string {
    const rows = [
      [
        'collection_name',
        'collection_description',
        'isShared',
        'feed_title',
        'feed_url',
        'feed_description',
        'category',
        'updateFreq',
        'status',
      ].join(','),
    ];

    const q = (v?: string | null) => `"${(v ?? '').replace(/"/g, '""')}"`;

    for (const c of payload.collections) {
      if ((c.feeds?.length ?? 0) === 0) {
        // Collection sans feeds → ligne vide pour feeds
        rows.push(
          [
            q(c.name),
            q(c.description ?? ''),
            c.isShared ? 'true' : 'false',
            q(''),
            q(''),
            q(''),
            q(''),
            q(''),
            q(''),
          ].join(','),
        );
      } else {
        for (const f of c.feeds) {
          rows.push(
            [
              q(c.name),
              q(c.description ?? ''),
              c.isShared ? 'true' : 'false',
              q(f.title || f.url),
              q(f.url),
              q(f.description ?? ''),
              q(f.category ?? ''),
              q(f.updateFreq ?? ''),
              q(f.status ?? 'ACTIVE'),
            ].join(','),
          );
        }
      }
    }
    return rows.join('\n');
  }

  // Parse JSON en CollectionsExport
  private fromJSON(text: string): CollectionsExport {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BadRequestException('Invalid JSON');
    }
    if (!parsed || !Array.isArray(parsed.collections)) {
      throw new BadRequestException('Invalid JSON structure');
    }
    parsed.collections = parsed.collections.map((c: any) => ({
      name: String(c.name || 'Sans nom'),
      description: c.description ?? null,
      isShared: !!c.isShared,
      feeds: Array.isArray(c.feeds)
        ? c.feeds.map((f: any) => ({
            title: String(f.title || f.url || ''),
            url: String(f.url || ''),
            description: f.description ?? null,
            category: f.category ?? null,
            updateFreq: f.updateFreq ?? null,
            status: (f.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
          }))
        : [],
    }));
    return parsed as CollectionsExport;
  }

  // Parse OPML en CollectionsExport (regex simple)
  private fromOPML(xml: string): CollectionsExport {
    const collections: ExportedCollection[] = [];

    const bodyMatch = xml.match(/<body>([\s\S]*?)<\/body>/i);
    const body = bodyMatch ? bodyMatch[1] : xml;

    const getAttr = (s: string, name: string) => {
      const m = new RegExp(`${name}="([^"]*)"`, 'i').exec(s);
      return m ? m[1] : undefined;
    };

    // Collections (outline niveau 1)
    const colRegex = /<outline([^>]*)>([\s\S]*?)<\/outline>/g;
    let colMatch: RegExpExecArray | null;

    while ((colMatch = colRegex.exec(body))) {
      const colAttrs = colMatch[1] || '';
      const inner = colMatch[2] || '';

      const colName = getAttr(colAttrs, 'title') || getAttr(colAttrs, 'text') || 'Sans nom';
      const colDesc = getAttr(colAttrs, 'description');
      const colShared = (getAttr(colAttrs, 'suprss:isShared') || 'false') === 'true';

      const feeds: ExportedFeed[] = [];

      // Feeds (outline auto-fermants)
      const feedRegex = /<outline([^\/>]*)\/>/g;
      let fMatch: RegExpExecArray | null;
      while ((fMatch = feedRegex.exec(inner))) {
        const fAttrs = fMatch[1] || '';
        const xmlUrl = getAttr(fAttrs, 'xmlUrl') || getAttr(fAttrs, 'url');
        if (!xmlUrl) continue;

        const title = getAttr(fAttrs, 'title') || getAttr(fAttrs, 'text') || xmlUrl;
        const description = getAttr(fAttrs, 'description');
        const category = getAttr(fAttrs, 'category');
        const updateFreq = getAttr(fAttrs, 'suprss:updateFreq') as any;
        const status = (getAttr(fAttrs, 'suprss:status') as any) || 'ACTIVE';

        feeds.push({
          title,
          url: xmlUrl,
          description: description ?? null,
          category: category ?? null,
          updateFreq: (updateFreq as any) ?? null,
          status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        });
      }

      collections.push({
        name: colName,
        description: colDesc ?? null,
        isShared: colShared,
        feeds,
      });
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      ownerNote: 'Imported from OPML',
      collections,
    };
  }

  // Parse CSV en CollectionsExport
  private fromCSV(csv: string): CollectionsExport {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (!lines.length) throw new BadRequestException('Empty CSV');

    const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const idx = (name: string) => header.indexOf(name);

    const iColName = idx('collection_name');
    const iColDesc = idx('collection_description');
    const iColShared = idx('isShared');
    const iTitle = idx('feed_title');
    const iUrl = idx('feed_url');
    const iDesc = idx('feed_description');
    const iCat = idx('category');
    const iFreq = idx('updateFreq');
    const iStatus = idx('status');

    if (iColName < 0 || iUrl < 0) {
      throw new BadRequestException('Invalid CSV header');
    }

    const unq = (s: string) => s.replace(/^\s*"/, '').replace(/"\s*$/, '').replace(/""/g, '"');

    const map = new Map<string, ExportedCollection>();

    for (let i = 1; i < lines.length; i++) {
      const row = this.splitCsvLine(lines[i], header.length);
      if (!row) continue;

      const colName = unq(row[iColName] ?? '') || 'Sans nom';
      const colDesc = iColDesc >= 0 ? unq(row[iColDesc] ?? '') : '';
      const colSharedStr = iColShared >= 0 ? (row[iColShared] ?? '').toLowerCase() : 'false';
      const colShared = colSharedStr === 'true';

      if (!map.has(colName)) {
        map.set(colName, {
          name: colName,
          description: colDesc || null,
          isShared: colShared,
          feeds: [],
        });
      }
      const col = map.get(colName)!;

      const feedUrl = iUrl >= 0 ? unq(row[iUrl] ?? '') : '';
      const feedTitle = iTitle >= 0 ? unq(row[iTitle] ?? '') : '';
      const feedDesc = iDesc >= 0 ? unq(row[iDesc] ?? '') : '';
      const feedCat = iCat >= 0 ? unq(row[iCat] ?? '') : '';
      const feedFreq = iFreq >= 0 ? unq(row[iFreq] ?? '') : '';
      const feedStatus = iStatus >= 0 ? unq(row[iStatus] ?? '') : '';

      if (feedUrl) {
        col.feeds.push({
          title: feedTitle || feedUrl,
          url: feedUrl,
          description: feedDesc || null,
          category: feedCat || null,
          updateFreq: (feedFreq as any) || null,
          status: (feedStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as any,
        });
      }
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      ownerNote: 'Imported from CSV',
      collections: Array.from(map.values()),
    };
  }

  // Split CSV line en champs, en préservant les valeurs entre guillemets
  private splitCsvLine(line: string, cols: number): string[] | null {
    const out: string[] = [];
    let cur = '';
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            quoted = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          quoted = true;
        } else if (ch === ',') {
          out.push(`"${cur.replace(/"/g, '""')}"`);
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    out.push(`"${cur.replace(/"/g, '""')}"`);
    if (out.length < cols) while (out.length < cols) out.push('""');
    return out;
  }
}
