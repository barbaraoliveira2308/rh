import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppRoles1842000000000 implements MigrationInterface {
  name = 'AddAppRoles1842000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO hr.roles (name, description, is_system) VALUES
         ('director',        'Director - toda a empresa', true),
         ('people_manager',  'People Manager - a sua linha hierarquica', true),
         ('account_manager', 'Account Manager - os seus clientes e projectos', true),
         ('hr',              'RH - admissoes, saidas, dados pessoais, GDPR', true),
         ('office_finance',  'Office and Finance - pagamentos, calendario, documentos', true),
         ('system_admin',    'System Admin - SSO, MFA, API keys, app roles', true)
       ON CONFLICT (name) DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM hr.user_roles ur
        USING hr.roles r
        WHERE ur.role_id = r.id
          AND r.name IN ('director', 'people_manager', 'account_manager',
                         'hr', 'office_finance', 'system_admin')`,
    );
    await queryRunner.query(
      `DELETE FROM hr.roles
        WHERE name IN ('director', 'people_manager', 'account_manager',
                       'hr', 'office_finance', 'system_admin')`,
    );
  }
}
