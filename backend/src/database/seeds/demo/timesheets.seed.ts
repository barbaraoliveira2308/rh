import { DataSource } from 'typeorm';
import { TimesheetPeriod } from '../../../timesheets/entities/timesheet-period.entity';
import { TimesheetEntry } from '../../../timesheets/entities/timesheet-entry.entity';
import { TimesheetStatus } from '../../../timesheets/entities/timesheet-status.enum';
import { EntryType } from '../../../timesheets/entities/entry-type.enum';
import { Employee } from '../../../users/entities/employee.entity';
import { DEMO_EMPLOYEES } from './employees.seed';

const PLANNED_HOURS_PER_DAY = 8;

// Períodos gerados relativos à data "atual" da demo (2026-08), não à data real de execução do seed,
// para os dados fazerem sentido face ao resto do dataset (contratos, ausências, etc.).
const APPROVED_PERIOD = { year: 2026, month: 7 };
const CURRENT_PERIOD = { year: 2026, month: 8, upToDay: 17 };

// Colaboradores cuja folha do mês corrente já foi submetida, para popular a caixa de entrada.
const SUBMITTED_IN_CURRENT_PERIOD = new Set(['EMP-005', 'EMP-006']);

function weekdaysInRange(year: number, month: number, upToDay?: number): string[] {
  const lastDay = upToDay ?? new Date(year, month, 0).getDate();
  const dates: string[] = [];

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = date.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    dates.push(date.toISOString().slice(0, 10));
  }

  return dates;
}

async function createPeriod(
  dataSource: DataSource,
  employeeId: string,
  year: number,
  month: number,
  dates: string[],
  status: TimesheetStatus,
): Promise<void> {
  const periodRepo = dataSource.getRepository(TimesheetPeriod);
  const entryRepo = dataSource.getRepository(TimesheetEntry);

  const existing = await periodRepo.findOneBy({ employeeId, periodYear: year, periodMonth: month });
  if (existing) return;

  const totalHours = dates.length * PLANNED_HOURS_PER_DAY;
  const isResolved = status === TimesheetStatus.APPROVED;
  const isSubmitted = status !== TimesheetStatus.IN_PROGRESS;

  const period = await periodRepo.save(
    periodRepo.create({
      employeeId,
      periodYear: year,
      periodMonth: month,
      status,
      totalPlannedHours: totalHours,
      totalWorkedHours: totalHours,
      totalOvertimeHours: 0,
      hoursBalance: 0,
      submittedAt: isSubmitted ? new Date() : null,
      approvedAt: isResolved ? new Date() : null,
    }),
  );

  const entries = dates.map((entryDate) =>
    entryRepo.create({
      timesheetId: period.id,
      entryDate,
      plannedHours: PLANNED_HOURS_PER_DAY,
      workedHours: PLANNED_HOURS_PER_DAY,
      overtimeHours: 0,
      entryType: EntryType.WORK,
      isLocked: isResolved,
    }),
  );

  await entryRepo.save(entries);
}

export async function run(dataSource: DataSource): Promise<void> {
  const employeeRepo = dataSource.getRepository(Employee);

  const approvedDates = weekdaysInRange(APPROVED_PERIOD.year, APPROVED_PERIOD.month);
  const currentDates = weekdaysInRange(
    CURRENT_PERIOD.year,
    CURRENT_PERIOD.month,
    CURRENT_PERIOD.upToDay,
  );

  for (const seed of DEMO_EMPLOYEES) {
    const employee = await employeeRepo.findOneBy({ employeeNumber: seed.employeeNumber });
    if (!employee) continue;

    await createPeriod(
      dataSource,
      employee.id,
      APPROVED_PERIOD.year,
      APPROVED_PERIOD.month,
      approvedDates,
      TimesheetStatus.APPROVED,
    );

    const currentStatus = SUBMITTED_IN_CURRENT_PERIOD.has(seed.employeeNumber)
      ? TimesheetStatus.SUBMITTED
      : TimesheetStatus.IN_PROGRESS;

    await createPeriod(
      dataSource,
      employee.id,
      CURRENT_PERIOD.year,
      CURRENT_PERIOD.month,
      currentDates,
      currentStatus,
    );
  }
}
