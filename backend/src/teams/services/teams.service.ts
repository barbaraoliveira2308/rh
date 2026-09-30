import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { AddTeamMemberDto } from '../dto/add-team-member.dto';
import { TeamMemberChangedEvent } from '../events/team-member-changed.event';
import { Employee } from '../../users/entities/employee.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateTeamDto): Promise<Team> {
    const existing = await this.teamRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Equipa já existe');
    }

    const team = this.teamRepository.create(dto as Partial<Team>);
    return this.teamRepository.save(team);
  }

  async findAll(): Promise<Team[]> {
    return this.teamRepository.find({
      relations: ['department', 'leader'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['department', 'leader'],
    });
    if (!team) {
      throw new NotFoundException('Equipa não encontrada');
    }
    return team;
  }

  async update(id: string, dto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(id);

    if (dto.name && dto.name !== team.name) {
      const existing = await this.teamRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException('Equipa já existe');
      }
    }

    await this.teamRepository.update(id, dto);
    return this.findOne(id);
  }

  async addMember(teamId: string, dto: AddTeamMemberDto): Promise<TeamMember> {
    const team = await this.findOne(teamId);

    if (!team.isActive) {
      throw new BadRequestException('Equipa inativa não aceita novos membros');
    }

    const employee = await this.employeeRepository.findOne({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    const existingMembership = await this.teamMemberRepository.findOne({
      where: {
        teamId,
        employeeId: dto.employeeId,
        endDate: IsNull(),
      },
    });
    if (existingMembership) {
      throw new ConflictException('Colaborador já pertence a esta equipa');
    }

    const member = this.teamMemberRepository.create({
      teamId,
      employeeId: dto.employeeId,
      startDate: new Date().toISOString().split('T')[0],
      roleInTeam: dto.role,
    });

    const saved = await this.teamMemberRepository.save(member);

    this.eventEmitter.emit(
      'team.member.changed',
      new TeamMemberChangedEvent(teamId, dto.employeeId, 'added'),
    );

    return saved;
  }

  async removeMember(teamId: string, employeeId: string): Promise<void> {
    const member = await this.teamMemberRepository.findOne({
      where: {
        teamId,
        employeeId,
        endDate: IsNull(),
      },
    });
    if (!member) {
      throw new NotFoundException('Membro não encontrado ou já removido');
    }

    member.endDate = new Date().toISOString().split('T')[0];
    await this.teamMemberRepository.save(member);

    this.eventEmitter.emit(
      'team.member.changed',
      new TeamMemberChangedEvent(teamId, employeeId, 'removed'),
    );
  }

  async getMembers(teamId: string): Promise<TeamMember[]> {
    await this.findOne(teamId);

    return this.teamMemberRepository.find({
      where: { teamId },
      relations: ['employee'],
      order: { startDate: 'ASC' },
    });
  }

  async isTeamLeader(teamId: string, userId: string): Promise<boolean> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      select: ['id', 'leaderId'],
    });
    if (!team?.leaderId) {
      return false;
    }

    const employee = await this.employeeRepository.findOne({
      where: { userId },
      select: ['id'],
    });
    if (!employee) {
      return false;
    }

    return team.leaderId === employee.id;
  }

  async getTeamCapacity(teamId: string, month: string): Promise<number> {
    await this.findOne(teamId);

    const [year, mon] = month.split('-').map(Number);
    const startOfMonth = new Date(year, mon - 1, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, mon, 0).toISOString().split('T')[0];

    const members = await this.teamMemberRepository.find({
      where: {
        teamId,
        startDate: Between(startOfMonth, endOfMonth),
      },
    });

    const totalDaysInMonth = new Date(year, mon, 0).getDate();

    const capacity = members.reduce((sum, member) => {
      const start = new Date(member.startDate);
      const end = member.endDate ? new Date(member.endDate) : new Date();
      const startDay = Math.max(start.getDate(), 1);
      const endDay = Math.min(end.getDate(), totalDaysInMonth);
      const daysActive = Math.max(0, endDay - startDay + 1);
      return sum + daysActive;
    }, 0);

    return capacity;
  }
}
