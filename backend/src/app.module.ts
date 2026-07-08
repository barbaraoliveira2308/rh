import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { RbacModule } from './rbac/rbac.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { ClientsModule } from './clients/clients.module';
import { ContractsModule } from './contracts/contracts.module';
import { DocumentsModule } from './documents/documents.module';
import { ProjectsModule } from './projects/projects.module';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { AbsencesModule } from './absences/absences.module';
import { StorageModule } from './storage/storage.module';
import { dataSourceOptions } from './database/data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    StorageModule,
    CacheModule,
    AuthModule,
    RbacModule,
    AuditModule,
    UsersModule,
    TeamsModule,
    ClientsModule,
    ContractsModule,
    DocumentsModule,
    ProjectsModule,
    TimesheetsModule,
    AbsencesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
