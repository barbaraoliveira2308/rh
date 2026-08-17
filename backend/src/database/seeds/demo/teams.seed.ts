import { DataSource } from 'typeorm';
import { Team } from '../../../teams/entities/team.entity';
import { TeamMember } from '../../../teams/entities/team-member.entity';
import { Employee } from '../../../users/entities/employee.entity';
import { Department } from '../../../users/entities/department.entity';

const teams = [
  {
    name: 'Equipa Engenharia',
    departmentCode: 'ENG',
    leaderEmployeeNumber: 'EMP-001',
    memberEmployeeNumbers: ['EMP-001', 'EMP-005', 'EMP-006'],
    description: 'Equipa de desenvolvimento de software',
  },
  {
    name: 'Equipa Consultoria',
    departmentCode: 'CNS',
    leaderEmployeeNumber: 'EMP-002',
    memberEmployeeNumbers: ['EMP-002', 'EMP-007'],
    description: 'Equipa de consultoria e implementação',
  },
];

export async function run(dataSource: DataSource): Promise<void> {
  const teamRepo = dataSource.getRepository(Team);
  const teamMemberRepo = dataSource.getRepository(TeamMember);
  const employeeRepo = dataSource.getRepository(Employee);
  const departmentRepo = dataSource.getRepository(Department);

  for (const seed of teams) {
    let team = await teamRepo.findOneBy({ name: seed.name });

    if (!team) {
      const department = await departmentRepo.findOneBy({ code: seed.departmentCode });
      const leader = await employeeRepo.findOneBy({ employeeNumber: seed.leaderEmployeeNumber });

      team = await teamRepo.save(
        teamRepo.create({
          name: seed.name,
          departmentId: department?.id ?? '',
          leaderId: leader?.id ?? null,
          description: seed.description,
        }),
      );
    }

    for (const employeeNumber of seed.memberEmployeeNumbers) {
      const employee = await employeeRepo.findOneBy({ employeeNumber });
      if (!employee) continue;

      const existing = await teamMemberRepo.findOneBy({ teamId: team.id, employeeId: employee.id });
      if (existing) continue;

      await teamMemberRepo.save(
        teamMemberRepo.create({
          teamId: team.id,
          employeeId: employee.id,
          startDate: employee.employmentStartDate,
          roleInTeam: employee.id === team.leaderId ? 'Lead' : 'Membro',
        }),
      );
    }
  }
}
