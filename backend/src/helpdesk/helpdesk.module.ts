import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelpdeskController } from './helpdesk.controller';
import { HelpdeskService } from './helpdesk.service';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketSla } from './entities/ticket-sla.entity';
import { TicketCategory } from './entities/ticket-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketComment, TicketSla, TicketCategory])],
  controllers: [HelpdeskController],
  providers: [HelpdeskService],
  exports: [HelpdeskService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HelpdeskModule {}
