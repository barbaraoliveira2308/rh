import { DataSource } from 'typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationChannel } from '../entities/notification-channel.enum';

interface TemplateDefinition {
  code: string;
  name: string;
  subject: string;
  file: string;
}

const templates: TemplateDefinition[] = [
  {
    code: 'timesheet-submitted',
    name: 'Timesheet Submetida',
    subject: 'Timesheet submetida para aprovação',
    file: 'timesheet-submitted.hbs',
  },
  {
    code: 'timesheet-approved',
    name: 'Timesheet Aprovada',
    subject: 'A tua timesheet foi aprovada',
    file: 'timesheet-approved.hbs',
  },
  {
    code: 'timesheet-rejected',
    name: 'Timesheet Rejeitada',
    subject: 'A tua timesheet foi rejeitada',
    file: 'timesheet-rejected.hbs',
  },
  {
    code: 'absence-requested',
    name: 'Pedido de Ausência Submetido',
    subject: 'Novo pedido de ausência para aprovação',
    file: 'absence-requested.hbs',
  },
  {
    code: 'absence-approved',
    name: 'Pedido de Ausência Aprovado',
    subject: 'O teu pedido de ausência foi aprovado',
    file: 'absence-approved.hbs',
  },
  {
    code: 'absence-rejected',
    name: 'Pedido de Ausência Rejeitado',
    subject: 'O teu pedido de ausência foi rejeitado',
    file: 'absence-rejected.hbs',
  },
  {
    code: 'contract-expiring',
    name: 'Contrato a Expirar',
    subject: 'O teu contrato está próximo do fim',
    file: 'contract-expiring.hbs',
  },
  {
    code: 'project-ending',
    name: 'Projeto Próximo do Fim',
    subject: 'Projeto próximo do fim',
    file: 'project-ending.hbs',
  },
  {
    code: 'expense-approved',
    name: 'Despesa Aprovada',
    subject: 'A tua despesa foi aprovada',
    file: 'expense-approved.hbs',
  },
  {
    code: 'expense-rejected',
    name: 'Despesa Rejeitada',
    subject: 'A tua despesa foi rejeitada',
    file: 'expense-rejected.hbs',
  },
  {
    code: 'overallocation-detected',
    name: 'Sobrealocação Detetada',
    subject: 'Sobrealocação detetada num colaborador',
    file: 'overallocation-detected.hbs',
  },
  {
    code: 'timesheet-pending',
    name: 'Timesheet por Submeter',
    subject: 'A tua timesheet ainda não foi submetida',
    file: 'timesheet-pending.hbs',
  },
  {
    code: 'gdpr-request-completed',
    name: 'Pedido de Titular Concluído',
    subject: 'O teu pedido de titular de dados foi concluído',
    file: 'gdpr-request-completed.hbs',
  },
  {
    code: 'gdpr-data-exported',
    name: 'Dados Pessoais Exportados',
    subject: 'Os teus dados pessoais foram exportados',
    file: 'gdpr-data-exported.hbs',
  },
  {
    code: 'password-reset',
    name: 'Reset de Password',
    subject: 'Recuperação de password',
    file: 'password-reset.hbs',
  },
];

export async function run(dataSource: DataSource): Promise<void> {
  const templateRepo = dataSource.getRepository(NotificationTemplate);
  const templatesDir = path.join(__dirname, '..', 'templates');

  for (const template of templates) {
    const existing = await templateRepo.findOne({ where: { code: template.code } });

    if (existing) {
      continue;
    }

    const filePath = path.join(templatesDir, template.file);
    const body = fs.readFileSync(filePath, 'utf-8');

    const created = templateRepo.create({
      code: template.code,
      name: template.name,
      subject: template.subject,
      body,
      channel: NotificationChannel.EMAIL,
      isActive: true,
    });

    await templateRepo.save(created);
  }
}
