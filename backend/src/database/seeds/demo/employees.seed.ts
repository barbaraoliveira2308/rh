import { DataSource } from 'typeorm';
import { hash } from 'argon2';
import { User } from '../../../auth/entities/user.entity';
import { UserRole } from '../../../auth/entities/user-role.entity';
import { Role } from '../../../auth/entities/role.entity';
import { Employee, EmployeeStatus } from '../../../users/entities/employee.entity';
import { Department } from '../../../users/entities/department.entity';
import { JobTitle } from '../../../users/entities/job-title.entity';

export const DEMO_PASSWORD = 'Demo123!';

interface DemoEmployeeSeed {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  username: string;
  roleName: 'manager' | 'approver' | 'employee';
  departmentCode: string;
  jobTitleName: string;
  managerEmployeeNumber: string | null;
  employmentStartDate: string;
  workLocation: string;
}

export const DEMO_EMPLOYEES: DemoEmployeeSeed[] = [
  {
    employeeNumber: 'EMP-001',
    firstName: 'Mariana',
    lastName: 'Ferreira',
    username: 'mariana.ferreira',
    roleName: 'manager',
    departmentCode: 'ENG',
    jobTitleName: 'Head of Engineering',
    managerEmployeeNumber: null,
    employmentStartDate: '2022-01-10',
    workLocation: 'Lisboa',
  },
  {
    employeeNumber: 'EMP-002',
    firstName: 'Tiago',
    lastName: 'Rocha',
    username: 'tiago.rocha',
    roleName: 'manager',
    departmentCode: 'CNS',
    jobTitleName: 'Head of Consulting',
    managerEmployeeNumber: null,
    employmentStartDate: '2021-06-01',
    workLocation: 'Porto',
  },
  {
    employeeNumber: 'EMP-003',
    firstName: 'Carla',
    lastName: 'Mendes',
    username: 'carla.mendes',
    roleName: 'approver',
    departmentCode: 'COM',
    jobTitleName: 'Account Director',
    managerEmployeeNumber: null,
    employmentStartDate: '2023-02-15',
    workLocation: 'Lisboa',
  },
  {
    employeeNumber: 'EMP-004',
    firstName: 'Diogo',
    lastName: 'Pinto',
    username: 'diogo.pinto',
    roleName: 'approver',
    departmentCode: 'RH',
    jobTitleName: 'HR Lead',
    managerEmployeeNumber: null,
    employmentStartDate: '2020-09-01',
    workLocation: 'Lisboa',
  },
  {
    employeeNumber: 'EMP-005',
    firstName: 'Sofia',
    lastName: 'Almeida',
    username: 'sofia.almeida',
    roleName: 'employee',
    departmentCode: 'ENG',
    jobTitleName: 'Software Engineer',
    managerEmployeeNumber: 'EMP-001',
    employmentStartDate: '2024-01-08',
    workLocation: 'Lisboa',
  },
  {
    employeeNumber: 'EMP-006',
    firstName: 'Rui',
    lastName: 'Cardoso',
    username: 'rui.cardoso',
    roleName: 'employee',
    departmentCode: 'ENG',
    jobTitleName: 'Software Engineer',
    managerEmployeeNumber: 'EMP-001',
    employmentStartDate: '2025-03-01',
    workLocation: 'Remoto',
  },
  {
    employeeNumber: 'EMP-007',
    firstName: 'Beatriz',
    lastName: 'Nunes',
    username: 'beatriz.nunes',
    roleName: 'employee',
    departmentCode: 'CNS',
    jobTitleName: 'Consultant',
    managerEmployeeNumber: 'EMP-002',
    employmentStartDate: '2025-08-01',
    workLocation: 'Porto',
  },
];

export async function run(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const userRoleRepo = dataSource.getRepository(UserRole);
  const roleRepo = dataSource.getRepository(Role);
  const employeeRepo = dataSource.getRepository(Employee);
  const departmentRepo = dataSource.getRepository(Department);
  const jobTitleRepo = dataSource.getRepository(JobTitle);

  const adminUser = await userRepo.findOneBy({ email: 'admin@hr-suite.local' });
  const passwordHash = await hash(DEMO_PASSWORD);

  for (const seed of DEMO_EMPLOYEES) {
    let user = await userRepo.findOneBy({ username: seed.username });

    user ??= await userRepo.save(
      userRepo.create({
        email: `${seed.username}@hr-suite.local`,
        username: seed.username,
        passwordHash,
        isActive: true,
        passwordChangedAt: new Date(),
      }),
    );

    const role = await roleRepo.findOneBy({ name: seed.roleName });
    if (role) {
      const existingUserRole = await userRoleRepo.findOneBy({ userId: user.id, roleId: role.id });
      if (!existingUserRole) {
        await userRoleRepo.save(
          userRoleRepo.create({
            userId: user.id,
            roleId: role.id,
            assignedBy: adminUser?.id ?? user.id,
          }),
        );
      }
    }

    const existingEmployee = await employeeRepo.findOneBy({ employeeNumber: seed.employeeNumber });
    if (existingEmployee) continue;

    const department = await departmentRepo.findOneBy({ code: seed.departmentCode });
    const jobTitle = await jobTitleRepo.findOneBy({ name: seed.jobTitleName });

    await employeeRepo.save(
      employeeRepo.create({
        id: user.id,
        userId: user.id,
        employeeNumber: seed.employeeNumber,
        firstName: seed.firstName,
        lastName: seed.lastName,
        email: user.email,
        departmentId: department?.id ?? null,
        jobTitleId: jobTitle?.id ?? null,
        managerId: null, // resolvido numa segunda passagem, depois de todos os Employee existirem
        employmentStartDate: seed.employmentStartDate,
        status: EmployeeStatus.ACTIVE,
        workLocation: seed.workLocation,
        nationality: 'Portuguesa',
      }),
    );
  }

  // Segunda passagem: liga manager_id agora que todos os Employee (e os seus User.id) existem.
  for (const seed of DEMO_EMPLOYEES) {
    const managerNumber = seed.managerEmployeeNumber;
    if (!managerNumber) continue;

    const employee = await employeeRepo.findOneBy({ employeeNumber: seed.employeeNumber });
    if (!employee || employee.managerId) continue;

    const manager = await employeeRepo.findOneBy({ employeeNumber: managerNumber });
    if (!manager) continue;

    employee.managerId = manager.id;
    await employeeRepo.save(employee);
  }
}
