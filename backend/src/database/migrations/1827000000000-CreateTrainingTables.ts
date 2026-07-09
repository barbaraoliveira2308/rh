import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrainingTables1827000000000 implements MigrationInterface {
  name = 'CreateTrainingTables1827000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE hr.course_status AS ENUM ('planned', 'ongoing', 'completed');
    `);

    await queryRunner.query(`
      CREATE TYPE hr.enrollment_status AS ENUM ('enrolled', 'started', 'in_progress', 'completed', 'no_show');
    `);

    await queryRunner.query(`
      CREATE TYPE hr.review_status AS ENUM ('draft', 'submitted', 'acknowledged');
    `);

    await queryRunner.query(`
      CREATE TABLE hr.courses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(200) NOT NULL,
        description text,
        provider varchar(100),
        duration_hours decimal(5,1),
        is_mandatory boolean NOT NULL DEFAULT false,
        category varchar(100),
        start_date date,
        end_date date,
        status hr.course_status NOT NULL DEFAULT 'planned',
        prerequisite_course_id uuid REFERENCES hr.courses(id) ON DELETE SET NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE hr.course_enrollments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id uuid NOT NULL REFERENCES hr.courses(id) ON DELETE CASCADE,
        employee_id uuid NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
        status hr.enrollment_status NOT NULL DEFAULT 'enrolled',
        completion_date date,
        score decimal(5,2),
        certificate_url varchar(512),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_course_enrollments_employee_id ON hr.course_enrollments(employee_id);
    `);

    await queryRunner.query(`
      CREATE TABLE hr.training_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id uuid NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
        course_id uuid NOT NULL REFERENCES hr.courses(id) ON DELETE CASCADE,
        enrollment_id uuid REFERENCES hr.course_enrollments(id) ON DELETE SET NULL,
        completed_at timestamp NOT NULL,
        score decimal(5,2),
        certificate_url varchar(512),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_training_records_employee_id ON hr.training_records(employee_id);
    `);

    await queryRunner.query(`
      CREATE TABLE hr.performance_reviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id uuid NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
        reviewer_id uuid NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
        period varchar(50) NOT NULL,
        status hr.review_status NOT NULL DEFAULT 'draft',
        overall_rating int,
        potential_rating int,
        strengths text,
        improvement_areas text,
        objectives_next text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_performance_reviews_employee_id ON hr.performance_reviews(employee_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_performance_reviews_period ON hr.performance_reviews(period);
    `);

    await queryRunner.query(`
      CREATE TABLE hr.competencies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(100) NOT NULL,
        category varchar(100),
        description text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE hr.employee_competencies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id uuid NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
        competency_id uuid NOT NULL REFERENCES hr.competencies(id) ON DELETE CASCADE,
        level int NOT NULL,
        assessed_at date NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uq_employee_competency UNIQUE (employee_id, competency_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_employee_competencies_employee_id ON hr.employee_competencies(employee_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_employee_competencies_employee_id;`);
    await queryRunner.query(`DROP TABLE hr.employee_competencies;`);
    await queryRunner.query(`DROP TABLE hr.competencies;`);
    await queryRunner.query(`DROP INDEX idx_performance_reviews_period;`);
    await queryRunner.query(`DROP INDEX idx_performance_reviews_employee_id;`);
    await queryRunner.query(`DROP TABLE hr.performance_reviews;`);
    await queryRunner.query(`DROP INDEX idx_training_records_employee_id;`);
    await queryRunner.query(`DROP TABLE hr.training_records;`);
    await queryRunner.query(`DROP INDEX idx_course_enrollments_employee_id;`);
    await queryRunner.query(`DROP TABLE hr.course_enrollments;`);
    await queryRunner.query(`DROP TABLE hr.courses;`);
    await queryRunner.query(`DROP TYPE hr.review_status;`);
    await queryRunner.query(`DROP TYPE hr.enrollment_status;`);
    await queryRunner.query(`DROP TYPE hr.course_status;`);
  }
}
