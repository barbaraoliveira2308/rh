import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
import { dataSourceOptions } from '../data-source';
import { run as departmentsSeed } from './demo/departments.seed';
import { run as employeesSeed } from './demo/employees.seed';
import { run as teamsSeed } from './demo/teams.seed';
import { run as clientsProjectsSeed } from './demo/clients-projects.seed';
import { run as contractsSeed } from './demo/contracts.seed';
import { run as timesheetsSeed } from './demo/timesheets.seed';
import { run as absencesSeed } from './demo/absences.seed';
import { run as expensesSeed } from './demo/expenses.seed';
import { run as policiesSeed } from './demo/policies.seed';
import { run as trainingSeed } from './demo/training.seed';
import { run as helpdeskSeed } from './demo/helpdesk.seed';
import { run as calendarSeed } from './demo/calendar.seed';
import { run as workflowSeed } from './demo/workflow.seed';
import { run as notificationsSeed } from './demo/notifications.seed';
import { DEMO_PASSWORD } from './demo/employees.seed';

config({ path: resolve(__dirname, '../../../../.env') });

// Ordem importa: cada passo depende de dados criados pelo(s) anterior(es) (departamentos → colaboradores →
// equipas/clientes/projetos/contratos → timesheets/ausências/despesas → workflow/notificações, que leem os
// pedidos pendentes já semeados). Pressupõe que `pnpm run seed` (RBAC, categorias, tipos de ausência) já correu.
const steps: { label: string; run: (dataSource: DataSource) => Promise<void> }[] = [
  { label: 'Departamentos e cargos', run: departmentsSeed },
  { label: 'Colaboradores e utilizadores', run: employeesSeed },
  { label: 'Equipas', run: teamsSeed },
  { label: 'Clientes e projetos', run: clientsProjectsSeed },
  { label: 'Contratos', run: contractsSeed },
  { label: 'Timesheets', run: timesheetsSeed },
  { label: 'Ausências e saldos de férias', run: absencesSeed },
  { label: 'Despesas', run: expensesSeed },
  { label: 'Políticas internas', run: policiesSeed },
  { label: 'Formação', run: trainingSeed },
  { label: 'Helpdesk', run: helpdeskSeed },
  { label: 'Calendário', run: calendarSeed },
  { label: 'Caixa de entrada (workflow)', run: workflowSeed },
  { label: 'Notificações', run: notificationsSeed },
];

async function main(): Promise<void> {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  for (const step of steps) {
    // eslint-disable-next-line no-console
    console.log(`Running ${step.label} seed...`);
    await step.run(dataSource);
    // eslint-disable-next-line no-console
    console.log(`${step.label} seed completed.`);
  }

  await dataSource.destroy();

  // eslint-disable-next-line no-console
  console.log('\nDemo seed completo.');
  // eslint-disable-next-line no-console
  console.log(`Password de todos os utilizadores de demo: ${DEMO_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(
    'Utilizadores: mariana.ferreira (manager), tiago.rocha (manager), carla.mendes (approver), ' +
      'diogo.pinto (approver), sofia.almeida (employee), rui.cardoso (employee), beatriz.nunes (employee) ' +
      '— todos @hr-suite.local.',
  );
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Demo seed failed:', error);
  process.exit(1);
});
