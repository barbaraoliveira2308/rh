import { DataSource } from 'typeorm';
import { ExpenseReport } from '../../../expenses/entities/expense-report.entity';
import { ExpenseReportStatus } from '../../../expenses/entities/expense-report-status.enum';
import { ExpenseItem } from '../../../expenses/entities/expense-item.entity';
import { ExpenseCategory } from '../../../expenses/entities/expense-category.entity';
import { Employee } from '../../../users/entities/employee.entity';
import { Project } from '../../../projects/entities/project.entity';

interface DemoExpenseReport {
  employeeNumber: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  status: ExpenseReportStatus;
  projectCode: string | null;
  items: { categoryCode: string; description: string; amount: number; expenseDate: string }[];
}

const reports: DemoExpenseReport[] = [
  {
    employeeNumber: 'EMP-005',
    title: 'Deslocação Cliente Aurora — Agosto 2026',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-15',
    status: ExpenseReportStatus.PENDING,
    projectCode: 'AUR-2026',
    items: [
      {
        categoryCode: 'TRANSPORT',
        description: 'Táxi para reunião no cliente',
        amount: 45,
        expenseDate: '2026-08-10',
      },
      {
        categoryCode: 'MEALS',
        description: 'Almoço de trabalho',
        amount: 32.5,
        expenseDate: '2026-08-10',
      },
    ],
  },
  {
    employeeNumber: 'EMP-006',
    title: 'Formação AWS — Julho 2026',
    periodStart: '2026-07-10',
    periodEnd: '2026-07-12',
    status: ExpenseReportStatus.PAID,
    projectCode: null,
    items: [
      {
        categoryCode: 'TRAINING',
        description: 'Inscrição AWS Certified Developer',
        amount: 350,
        expenseDate: '2026-07-10',
      },
    ],
  },
  {
    employeeNumber: 'EMP-007',
    title: 'Material Kickoff Vertex',
    periodStart: '2026-08-05',
    periodEnd: '2026-08-05',
    status: ExpenseReportStatus.DRAFT,
    projectCode: 'VTX-2026',
    items: [
      {
        categoryCode: 'OFFICE_SUPPLIES',
        description: 'Material de apresentação para kickoff',
        amount: 28.9,
        expenseDate: '2026-08-05',
      },
    ],
  },
];

export async function run(dataSource: DataSource): Promise<void> {
  const employeeRepo = dataSource.getRepository(Employee);
  const projectRepo = dataSource.getRepository(Project);
  const categoryRepo = dataSource.getRepository(ExpenseCategory);
  const reportRepo = dataSource.getRepository(ExpenseReport);
  const itemRepo = dataSource.getRepository(ExpenseItem);

  const managerByEmployeeNumber: Record<string, string> = {
    'EMP-005': 'EMP-001',
    'EMP-006': 'EMP-001',
  };

  for (const seed of reports) {
    const employee = await employeeRepo.findOneBy({ employeeNumber: seed.employeeNumber });
    if (!employee) continue;

    const existing = await reportRepo.findOneBy({ employeeId: employee.id, title: seed.title });
    if (existing) continue;

    const project = seed.projectCode
      ? await projectRepo.findOneBy({ code: seed.projectCode })
      : null;
    const totalAmount = seed.items.reduce((sum, item) => sum + item.amount, 0);

    const isSubmitted = seed.status !== ExpenseReportStatus.DRAFT;
    const isApprovedOrLater =
      seed.status === ExpenseReportStatus.APPROVED ||
      seed.status === ExpenseReportStatus.SENT_FOR_PAYMENT ||
      seed.status === ExpenseReportStatus.PAID;

    const managerNumber = managerByEmployeeNumber[seed.employeeNumber];
    const manager = managerNumber
      ? await employeeRepo.findOneBy({ employeeNumber: managerNumber })
      : null;

    const report = await reportRepo.save(
      reportRepo.create({
        employeeId: employee.id,
        title: seed.title,
        periodStart: seed.periodStart,
        periodEnd: seed.periodEnd,
        status: seed.status,
        totalAmount,
        currency: 'EUR',
        projectId: project?.id ?? null,
        submittedAt: isSubmitted ? new Date() : null,
        approvedAt: isApprovedOrLater ? new Date() : null,
        approvedBy: isApprovedOrLater ? (manager?.id ?? null) : null,
        paidAt: seed.status === ExpenseReportStatus.PAID ? new Date() : null,
      }),
    );

    const items = await Promise.all(
      seed.items.map(async (item) => {
        const category = await categoryRepo.findOneBy({ code: item.categoryCode });
        return itemRepo.create({
          reportId: report.id,
          categoryId: category?.id ?? '',
          description: item.description,
          amount: item.amount,
          currency: 'EUR',
          expenseDate: item.expenseDate,
        });
      }),
    );

    await itemRepo.save(items);
  }
}
