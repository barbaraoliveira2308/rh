import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenOpportunity, OpportunityStatus } from './entities/open-opportunity.entity';

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(OpenOpportunity)
    private readonly opportunityRepository: Repository<OpenOpportunity>,
  ) {}

  findOpen(): Promise<OpenOpportunity[]> {
    return this.opportunityRepository.find({
      where: { status: OpportunityStatus.OPEN },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }
}
