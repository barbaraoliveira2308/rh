import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGdprTables1826000000000 implements MigrationInterface {
  name = 'CreateGdprTables1826000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE hr.legal_basis AS ENUM (
        'consent', 'contract', 'legal_obligation', 'vital_interest',
        'public_interest', 'legitimate_interest'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE hr.data_subject_request_type AS ENUM (
        'access', 'rectification', 'erasure', 'restriction', 'portability', 'objection'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE hr.data_subject_request_status AS ENUM (
        'pending', 'in_progress', 'completed', 'rejected'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE hr.retention_action AS ENUM ('delete', 'anonymize');
    `);

    await queryRunner.query(`
      CREATE TYPE hr.security_incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
    `);

    await queryRunner.query(`
      CREATE TYPE hr.security_incident_status AS ENUM ('open', 'investigating', 'resolved');
    `);

    await queryRunner.query(`
      CREATE TABLE hr.consent_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_id uuid NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
        purpose varchar(200) NOT NULL,
        legal_basis hr.legal_basis NOT NULL,
        version varchar(20),
        granted_at timestamp,
        revoked_at timestamp,
        is_active boolean NOT NULL DEFAULT true,
        ip_address varchar(45),
        collected_by varchar(100),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_consent_records_subject_id ON hr.consent_records(subject_id);
    `);

    await queryRunner.query(`
      CREATE TABLE hr.data_subject_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_id uuid NOT NULL REFERENCES hr.employees(id) ON DELETE CASCADE,
        request_type hr.data_subject_request_type NOT NULL,
        status hr.data_subject_request_status NOT NULL DEFAULT 'pending',
        requested_at timestamp NOT NULL DEFAULT now(),
        deadline timestamp,
        completed_at timestamp,
        response_notes text,
        response_payload jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_data_subject_requests_subject_id ON hr.data_subject_requests(subject_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_data_subject_requests_status ON hr.data_subject_requests(status);
    `);

    await queryRunner.query(`
      CREATE TABLE hr.retention_policies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        data_category varchar(100) NOT NULL,
        retention_years int NOT NULL,
        legal_reference text,
        action_after_retention hr.retention_action NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE hr.security_incidents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(200) NOT NULL,
        description text,
        severity hr.security_incident_severity NOT NULL,
        detected_at timestamp NOT NULL DEFAULT now(),
        reported_to_authority_at timestamp,
        affected_subjects int,
        status hr.security_incident_status NOT NULL DEFAULT 'open',
        resolution_notes text,
        reported_by uuid,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_security_incidents_status ON hr.security_incidents(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_security_incidents_status;`);
    await queryRunner.query(`DROP TABLE hr.security_incidents;`);
    await queryRunner.query(`DROP TABLE hr.retention_policies;`);
    await queryRunner.query(`DROP INDEX idx_data_subject_requests_status;`);
    await queryRunner.query(`DROP INDEX idx_data_subject_requests_subject_id;`);
    await queryRunner.query(`DROP TABLE hr.data_subject_requests;`);
    await queryRunner.query(`DROP INDEX idx_consent_records_subject_id;`);
    await queryRunner.query(`DROP TABLE hr.consent_records;`);
    await queryRunner.query(`DROP TYPE hr.security_incident_status;`);
    await queryRunner.query(`DROP TYPE hr.security_incident_severity;`);
    await queryRunner.query(`DROP TYPE hr.retention_action;`);
    await queryRunner.query(`DROP TYPE hr.data_subject_request_status;`);
    await queryRunner.query(`DROP TYPE hr.data_subject_request_type;`);
    await queryRunner.query(`DROP TYPE hr.legal_basis;`);
  }
}
