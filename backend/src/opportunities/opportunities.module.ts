import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';
import { OpenOpportunity } from './entities/open-opportunity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OpenOpportunity])],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class OpportunitiesModule {}
