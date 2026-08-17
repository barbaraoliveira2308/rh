import { DataSource } from 'typeorm';
import { Course } from '../../../training/entities/course.entity';
import { CourseStatus } from '../../../training/entities/course-status.enum';
import { CourseEnrollment } from '../../../training/entities/course-enrollment.entity';
import { EnrollmentStatus } from '../../../training/entities/enrollment-status.enum';
import { Employee } from '../../../users/entities/employee.entity';

const courses: {
  name: string;
  description: string;
  provider: string;
  durationHours: number;
  isMandatory: boolean;
  category: string;
  status: CourseStatus;
  startDate: string | null;
  endDate: string | null;
}[] = [
  {
    name: 'Segurança da Informação — Onboarding',
    description: 'Formação obrigatória de segurança da informação para novos colaboradores.',
    provider: 'Interno',
    durationHours: 2,
    isMandatory: true,
    category: 'Compliance',
    status: CourseStatus.ONGOING,
    startDate: '2026-01-01',
    endDate: null,
  },
  {
    name: 'Liderança para Gestores',
    description:
      'Programa de desenvolvimento de competências de liderança para gestores de equipa.',
    provider: 'Externo',
    durationHours: 16,
    isMandatory: false,
    category: 'Soft Skills',
    status: CourseStatus.COMPLETED,
    startDate: '2026-03-01',
    endDate: '2026-03-15',
  },
];

const enrollments: {
  courseName: string;
  employeeNumber: string;
  status: EnrollmentStatus;
  completionDate: string | null;
  score: number | null;
}[] = [
  {
    courseName: 'Segurança da Informação — Onboarding',
    employeeNumber: 'EMP-005',
    status: EnrollmentStatus.IN_PROGRESS,
    completionDate: null,
    score: null,
  },
  {
    courseName: 'Segurança da Informação — Onboarding',
    employeeNumber: 'EMP-006',
    status: EnrollmentStatus.COMPLETED,
    completionDate: '2026-02-01',
    score: 95,
  },
  {
    courseName: 'Segurança da Informação — Onboarding',
    employeeNumber: 'EMP-007',
    status: EnrollmentStatus.ENROLLED,
    completionDate: null,
    score: null,
  },
  {
    courseName: 'Liderança para Gestores',
    employeeNumber: 'EMP-001',
    status: EnrollmentStatus.COMPLETED,
    completionDate: '2026-03-15',
    score: 88,
  },
  {
    courseName: 'Liderança para Gestores',
    employeeNumber: 'EMP-002',
    status: EnrollmentStatus.COMPLETED,
    completionDate: '2026-03-15',
    score: 91,
  },
];

export async function run(dataSource: DataSource): Promise<void> {
  const courseRepo = dataSource.getRepository(Course);
  const enrollmentRepo = dataSource.getRepository(CourseEnrollment);
  const employeeRepo = dataSource.getRepository(Employee);

  for (const seed of courses) {
    const existing = await courseRepo.findOneBy({ name: seed.name });
    if (existing) continue;

    await courseRepo.save(
      courseRepo.create({
        name: seed.name,
        description: seed.description,
        provider: seed.provider,
        durationHours: seed.durationHours,
        isMandatory: seed.isMandatory,
        category: seed.category,
        status: seed.status,
        startDate: seed.startDate,
        endDate: seed.endDate,
      }),
    );
  }

  for (const seed of enrollments) {
    const course = await courseRepo.findOneBy({ name: seed.courseName });
    const employee = await employeeRepo.findOneBy({ employeeNumber: seed.employeeNumber });
    if (!course || !employee) continue;

    const existing = await enrollmentRepo.findOneBy({
      courseId: course.id,
      employeeId: employee.id,
    });
    if (existing) continue;

    await enrollmentRepo.save(
      enrollmentRepo.create({
        courseId: course.id,
        employeeId: employee.id,
        status: seed.status,
        completionDate: seed.completionDate,
        score: seed.score,
      }),
    );
  }
}
