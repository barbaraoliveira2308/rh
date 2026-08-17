import { DataSource } from 'typeorm';
import { AbsenceRequest } from '../../../absences/entities/absence-request.entity';
import { AbsenceStatus } from '../../../absences/entities/absence-status.enum';
import { AbsenceType } from '../../../absences/entities/absence-type.entity';
import { LeaveBalance } from '../../../absences/entities/leave-balance.entity';
import { Employee } from '../../../users/entities/employee.entity';
import { DEMO_EMPLOYEES } from './employees.seed';

const VACATION_ENTITLED_DAYS = 22;
const LEAVE_BALANCE_YEAR = 2026;

const requests: {
  employeeNumber: string;
  typeCode: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: AbsenceStatus;
  reason: string;
}[] = [
  {
    employeeNumber: 'EMP-005',
    typeCode: 'VACATION',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    totalDays: 5,
    status: AbsenceStatus.PENDING,
    reason: 'Férias de verão',
  },
  {
    employeeNumber: 'EMP-006',
    typeCode: 'VACATION',
    startDate: '2026-06-15',
    endDate: '2026-06-19',
    totalDays: 5,
    status: AbsenceStatus.APPROVED,
    reason: 'Férias de família',
  },
  {
    employeeNumber: 'EMP-007',
    typeCode: 'SICK',
    startDate: '2026-07-06',
    endDate: '2026-07-07',
    totalDays: 2,
    status: AbsenceStatus.APPROVED,
    reason: 'Baixa médica',
  },
];

export async function run(dataSource: DataSource): Promise<void> {
  const employeeRepo = dataSource.getRepository(Employee);
  const absenceTypeRepo = dataSource.getRepository(AbsenceType);
  const requestRepo = dataSource.getRepository(AbsenceRequest);
  const balanceRepo = dataSource.getRepository(LeaveBalance);

  const vacationType = await absenceTypeRepo.findOneBy({ code: 'VACATION' });
  if (!vacationType) return;

  // Saldo de férias 2026 para todos os colaboradores de demo, ajustado depois pelos pedidos abaixo.
  const usedByEmployee = new Map<string, number>();
  const pendingByEmployee = new Map<string, number>();

  for (const req of requests) {
    if (req.typeCode !== 'VACATION') continue;
    if (req.status === AbsenceStatus.APPROVED) {
      usedByEmployee.set(
        req.employeeNumber,
        (usedByEmployee.get(req.employeeNumber) ?? 0) + req.totalDays,
      );
    } else if (req.status === AbsenceStatus.PENDING) {
      pendingByEmployee.set(
        req.employeeNumber,
        (pendingByEmployee.get(req.employeeNumber) ?? 0) + req.totalDays,
      );
    }
  }

  for (const seed of DEMO_EMPLOYEES) {
    const employee = await employeeRepo.findOneBy({ employeeNumber: seed.employeeNumber });
    if (!employee) continue;

    const existing = await balanceRepo.findOneBy({
      employeeId: employee.id,
      absenceTypeId: vacationType.id,
      year: LEAVE_BALANCE_YEAR,
    });
    if (existing) continue;

    const used = usedByEmployee.get(seed.employeeNumber) ?? 0;
    const pending = pendingByEmployee.get(seed.employeeNumber) ?? 0;

    await balanceRepo.save(
      balanceRepo.create({
        employeeId: employee.id,
        absenceTypeId: vacationType.id,
        year: LEAVE_BALANCE_YEAR,
        entitledDays: VACATION_ENTITLED_DAYS,
        usedDays: used,
        pendingDays: pending,
        remainingDays: VACATION_ENTITLED_DAYS - used - pending,
        carryOverDays: 0,
      }),
    );
  }

  for (const req of requests) {
    const employee = await employeeRepo.findOneBy({ employeeNumber: req.employeeNumber });
    if (!employee) continue;

    const absenceType = await absenceTypeRepo.findOneBy({ code: req.typeCode });
    if (!absenceType) continue;

    const existing = await requestRepo.findOneBy({
      employeeId: employee.id,
      absenceTypeId: absenceType.id,
      startDate: req.startDate,
    });
    if (existing) continue;

    await requestRepo.save(
      requestRepo.create({
        employeeId: employee.id,
        absenceTypeId: absenceType.id,
        startDate: req.startDate,
        endDate: req.endDate,
        totalDays: req.totalDays,
        status: req.status,
        reason: req.reason,
      }),
    );
  }
}
