import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './services/documents.service';
import { Document } from './entities/document.entity';
import { Employee } from '../users/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Employee])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService, TypeOrmModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DocumentsModule {}
