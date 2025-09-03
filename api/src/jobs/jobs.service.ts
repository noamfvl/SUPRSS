import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma.service';
import { FeedsService } from '../feeds/feeds.service';

// Mapping fréquence -> cron
const FREQ_TO_CRON: Record<string, string> = {
  hourly: '0 * * * *',
  '6h': '0 */6 * * *',
  daily: '0 6 * * *',
};

@Injectable()
export class JobsService {
  private logger = new Logger(JobsService.name);

  private connection = new IORedis(process.env.REDIS_URL || 'redis://redis:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  private queue = new Queue('feed-refresh', { connection: this.connection });
  private worker: Worker;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => FeedsService)) private feeds: FeedsService,
  ) {
    // Worker qui exécute les jobs de refresh de flux
    this.worker = new Worker(
      'feed-refresh',
      async job => {
        const { feedId, userId } = job.data as { feedId: number; userId?: number };
        await this.feeds.refresh(userId ?? 1, feedId);
        this.logger.log(`Refreshed feed #${feedId}`);
      },
      { connection: this.connection },
    );
  }

  // Renvoie le pattern cron correspondant à une fréquence
  private getPattern(freq?: string): string | null {
    return freq ? FREQ_TO_CRON[freq] ?? null : null;
  }

  // Programme un job récurrent pour un feed
  async scheduleFeed(feedId: number) {
    const feed = await this.prisma.feed.findUnique({
      where: { id: feedId },
      include: { collection: { select: { ownerId: true } } },
    });
    if (!feed) return;

    const jobName = `feed:${feedId}`;
    // Supprime tout ancien job pour ce feed
    const existing = await this.queue.getRepeatableJobs();
    for (const j of existing) {
      if (j.name === jobName) await this.queue.removeRepeatableByKey(j.key);
    }

    const pattern = this.getPattern(feed.updateFreq || 'daily');
    if (!pattern) return;

    await this.queue.add(
      jobName,
      { feedId: feed.id, userId: feed.collection.ownerId },
      { repeat: { pattern }, removeOnComplete: 50, removeOnFail: 100 },
    );
  }

  // Programme tous les feeds existants (utile au démarrage de l’app)
  async scheduleAllFeeds() {
    const feeds = await this.prisma.feed.findMany({ select: { id: true } });
    for (const f of feeds) await this.scheduleFeed(f.id);
    return { scheduled: feeds.length };
  }

  // Supprime la planification d’un feed
  async unscheduleFeed(feedId: number) {
    const jobName = `feed:${feedId}`;
    const existing = await this.queue.getRepeatableJobs();
    for (const j of existing) {
      if (j.name === jobName) await this.queue.removeRepeatableByKey(j.key);
    }
  }
}
