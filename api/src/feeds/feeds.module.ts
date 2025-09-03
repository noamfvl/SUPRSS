import { Module, forwardRef } from '@nestjs/common';
import { FeedsService } from './feeds.service';
import { FeedsController } from './feeds.controller';
import { PrismaService } from '../prisma.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [forwardRef(() => JobsModule)], 
  controllers: [FeedsController],
  providers: [FeedsService, PrismaService],
  exports: [FeedsService], 
})
export class FeedsModule {}

