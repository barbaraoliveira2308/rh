import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmployeeProfileDetails1840000000000 implements MigrationInterface {
  name = 'CreateEmployeeProfileDetails1840000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS hr.employee_profile_details (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id uuid NOT NULL UNIQUE REFERENCES hr.employees(id) ON DELETE CASCADE,
        preferred_name varchar(100),
        pronouns varchar(80),
        hide_birthday boolean NOT NULL DEFAULT false,
        id_document_type varchar(60),
        id_document_number varchar(100),
        id_document_expiry date,
        social_security_number varchar(30),
        retirement_regime varchar(100),
        address_line_2 varchar(200),
        city varchar(100),
        postal_code varchar(20),
        province varchar(100),
        country varchar(100),
        disability_percentage decimal(5, 2),
        emergency_contact_name varchar(150),
        emergency_contact_phone varchar(30),
        bank_account_format varchar(20),
        swift_bic varchar(11),
        irs_percentage decimal(5, 2),
        absence_approver_id uuid REFERENCES hr.employees(id) ON DELETE SET NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_employee_profile_details_approver ON hr.employee_profile_details(absence_approver_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS hr.employee_profile_details');
  }
}
