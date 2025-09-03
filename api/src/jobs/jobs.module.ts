import { Module, forwardRef } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma.service';
import { FeedsModule } from '../feeds/feeds.module';

@Module({
  imports: [forwardRef(() => FeedsModule)], 
  providers: [JobsService, PrismaService],
  exports: [JobsService], 
})
export class JobsModule {}
