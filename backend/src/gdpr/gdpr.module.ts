import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GdprController } from './gdpr.controller';
import { GdprService } from './services/gdpr.service';
import { ConsentRecord } from './entities/consent-record.entity';
import { DataSubjectRequest } from './entities/data-subject-request.entity';
import { RetentionPolicy } from './entities/retention-policy.entity';
import { SecurityIncident } from './entities/security-incident.entity';
import { Employee } from '../users/entities/employee.entity';
import { User } from '../auth/entities/user.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConsentRecord,
      DataSubjectRequest,
      RetentionPolicy,
      SecurityIncident,
      Employee,
      User,
      AuditLog,
    ]),
  ],
  controllers: [GdprController],
  providers: [GdprService],
  exports: [GdprService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class GdprModule {}
