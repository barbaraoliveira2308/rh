import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHelpdeskTables1829000000000 implements MigrationInterface {
  name = 'CreateHelpdeskTables1829000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE hr.ticket_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(100) NOT NULL,
        default_priority varchar(20) NOT NULL DEFAULT 'medium',
        sla_hours int NOT NULL,
        resolution_team_id uuid,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE hr.tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(200) NOT NULL,
        description text NOT NULL,
        category_id uuid REFERENCES hr.ticket_categories(id) ON DELETE SET NULL,
        submitter_id uuid NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
        assignee_id uuid REFERENCES hr.employees(id) ON DELETE SET NULL,
        team_id uuid,
        priority varchar(20) NOT NULL DEFAULT 'medium',
        status varchar(20) NOT NULL DEFAULT 'open',
        sla_deadline timestamp,
        sla_breached boolean NOT NULL DEFAULT false,
        resolved_at timestamp,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tickets_submitter_id ON hr.tickets(submitter_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tickets_assignee_id ON hr.tickets(assignee_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tickets_status ON hr.tickets(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tickets_priority ON hr.tickets(priority);
    `);

    await queryRunner.query(`
      CREATE TABLE hr.ticket_comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id uuid NOT NULL REFERENCES hr.tickets(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
        text text NOT NULL,
        is_internal boolean NOT NULL DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_ticket_comments_ticket_id ON hr.ticket_comments(ticket_id);
    `);

    await queryRunner.query(`
      CREATE TABLE hr.ticket_slas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id uuid NOT NULL REFERENCES hr.tickets(id) ON DELETE CASCADE,
        priority varchar(20) NOT NULL,
        deadline timestamp NOT NULL,
        breached boolean NOT NULL DEFAULT false,
        notified_at timestamp,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_ticket_slas_ticket_id ON hr.ticket_slas(ticket_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_ticket_slas_ticket_id;`);
    await queryRunner.query(`DROP TABLE hr.ticket_slas;`);
    await queryRunner.query(`DROP INDEX idx_ticket_comments_ticket_id;`);
    await queryRunner.query(`DROP TABLE hr.ticket_comments;`);
    await queryRunner.query(`DROP INDEX idx_tickets_priority;`);
    await queryRunner.query(`DROP INDEX idx_tickets_status;`);
    await queryRunner.query(`DROP INDEX idx_tickets_assignee_id;`);
    await queryRunner.query(`DROP INDEX idx_tickets_submitter_id;`);
    await queryRunner.query(`DROP TABLE hr.tickets;`);
    await queryRunner.query(`DROP TABLE hr.ticket_categories;`);
  }
}
