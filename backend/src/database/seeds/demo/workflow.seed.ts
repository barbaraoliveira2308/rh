import { DataSource } from 'typeorm';
import { WorkflowItem } from '../../../workflow/entities/workflow-item.entity';
import { WorkflowItemType } from '../../../workflow/entities/workflow-item-type.enum';
import { WorkflowItemStatus } from '../../../workflow/entities/workflow-item-status.enum';
import { Employee } from '../../../users/entities/employee.entity';
import { AbsenceRequest } from '../../../absences/entities/absence-request.entity';
import { AbsenceStatus } from '../../../absences/entities/absence-status.enum';
import { TimesheetPeriod } from '../../../timesheets/entities/timesheet-period.entity';
import { TimesheetStatus } from '../../../timesheets/entities/timesheet-status.enum';
import { ExpenseReport } from '../../../expenses/entities/expense-report.entity';
import { ExpenseReportStatus } from '../../../expenses/entities/expense-report-status.enum';

// Cria os itens de caixa de entrada correspondentes aos pedidos pendentes já semeados
// pelos seeds de absences/timesheets/expenses (que não passam pelos eventos reais do
// EventEmitter2, ao contrário do fluxo normal via API, daí WorkflowItem não ser criado sozinho).
async function seedFromPendingAbsence(
  dataSource: DataSource,
  employeeNumber: string,
  assigneeEmployeeNumber: string,
): Promise<void> {
  const employeeRepo = dataSource.getRepository(Employee);
  const requestRepo = dataSource.getRepository(AbsenceRequest);
  const workflowRepo = dataSource.getRepository(WorkflowItem);

  const employee = await employeeRepo.findOneBy({ employeeNumber });
  const assignee = await employeeRepo.findOneBy({ employeeNumber: assigneeEmployeeNumber });
  if (!employee || !assignee) return;

  const request = await requestRepo.findOneBy({
    employeeId: employee.id,
    status: AbsenceStatus.PENDING,
  });
  if (!request) return;

  const existing = await workflowRepo.findOneBy({
    referenceId: request.id,
    referenceType: 'AbsenceRequest',
  });
  if (existing) return;

  await workflowRepo.save(
    workflowRepo.create({
      type: WorkflowItemType.ABSENCE,
      referenceId: request.id,
      referenceType: 'AbsenceRequest',
      requesterId: employee.id,
      assigneeId: assignee.id,
      status: WorkflowItemStatus.PENDING,
    }),
  );
}

async function seedFromSubmittedTimesheet(
  dataSource: DataSource,
  employeeNumber: string,
  assigneeEmployeeNumber: string,
): Promise<void> {
  const employeeRepo = dataSource.getRepository(Employee);
  const periodRepo = dataSource.getRepository(TimesheetPeriod);
  const workflowRepo = dataSource.getRepository(WorkflowItem);

  const employee = await employeeRepo.findOneBy({ employeeNumber });
  const assignee = await employeeRepo.findOneBy({ employeeNumber: assigneeEmployeeNumber });
  if (!employee || !assignee) return;

  const period = await periodRepo.findOneBy({
    employeeId: employee.id,
    status: TimesheetStatus.SUBMITTED,
  });
  if (!period) return;

  const existing = await workflowRepo.findOneBy({
    referenceId: period.id,
    referenceType: 'TimesheetPeriod',
  });
  if (existing) return;

  await workflowRepo.save(
    workflowRepo.create({
      type: WorkflowItemType.TIMESHEET,
      referenceId: period.id,
      referenceType: 'TimesheetPeriod',
      requesterId: employee.id,
      assigneeId: assignee.id,
      status: WorkflowItemStatus.PENDING,
    }),
  );
}

async function seedFromPendingExpense(
  dataSource: DataSource,
  employeeNumber: string,
  assigneeEmployeeNumber: string,
): Promise<void> {
  const employeeRepo = dataSource.getRepository(Employee);
  const reportRepo = dataSource.getRepository(ExpenseReport);
  const workflowRepo = dataSource.getRepository(WorkflowItem);

  const employee = await employeeRepo.findOneBy({ employeeNumber });
  const assignee = await employeeRepo.findOneBy({ employeeNumber: assigneeEmployeeNumber });
  if (!employee || !assignee) return;

  const report = await reportRepo.findOneBy({
    employeeId: employee.id,
    status: ExpenseReportStatus.PENDING,
  });
  if (!report) return;

  const existing = await workflowRepo.findOneBy({
    referenceId: report.id,
    referenceType: 'ExpenseReport',
  });
  if (existing) return;

  await workflowRepo.save(
    workflowRepo.create({
      type: WorkflowItemType.EXPENSE,
      referenceId: report.id,
      referenceType: 'ExpenseReport',
      requesterId: employee.id,
      assigneeId: assignee.id,
      status: WorkflowItemStatus.PENDING,
    }),
  );
}

export async function run(dataSource: DataSource): Promise<void> {
  await seedFromPendingAbsence(dataSource, 'EMP-005', 'EMP-001');
  await seedFromSubmittedTimesheet(dataSource, 'EMP-005', 'EMP-001');
  await seedFromSubmittedTimesheet(dataSource, 'EMP-006', 'EMP-001');
  await seedFromPendingExpense(dataSource, 'EMP-005', 'EMP-001');
}
