import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { Employee } from '../../users/entities/employee.entity';

describe('TeamsService', () => {
  let service: TeamsService;
  let mockTeamRepo: Record<string, jest.Mock>;
  let mockTeamMemberRepo: Record<string, jest.Mock>;
  let mockEmployeeRepo: Record<string, jest.Mock>;
  let mockEventEmitter: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockTeamRepo = {
      create: jest.fn((data: Partial<Team>) => data),
      save: jest.fn((data: Partial<Team>) => Promise.resolve(data)),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    mockTeamMemberRepo = {
      create: jest.fn((data: Partial<TeamMember>) => data),
      save: jest.fn((data: Partial<TeamMember>) => Promise.resolve(data)),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    mockEmployeeRepo = {
      findOne: jest.fn(),
    };
    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getRepositoryToken(Team), useValue: mockTeamRepo },
        { provide: getRepositoryToken(TeamMember), useValue: mockTeamMemberRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  describe('create', () => {
    it('deve lançar ConflictException se já existir uma equipa com o mesmo nome', async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: 't-1', name: 'Equipa A' });

      await expect(service.create({ name: 'Equipa A' } as never)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve criar a equipa quando o nome está disponível', async () => {
      mockTeamRepo.findOne.mockResolvedValue(null);

      const result = await service.create({ name: 'Equipa B' } as never);

      expect(result).toEqual(expect.objectContaining({ name: 'Equipa B' }));
    });
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException se a equipa não existir', async () => {
      mockTeamRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve lançar ConflictException se o novo nome já existir noutra equipa', async () => {
      mockTeamRepo.findOne
        .mockResolvedValueOnce({ id: 't-1', name: 'Equipa A' })
        .mockResolvedValueOnce({ id: 't-2', name: 'Equipa B' });

      await expect(service.update('t-1', { name: 'Equipa B' })).rejects.toThrow(ConflictException);
    });

    it('deve atualizar a equipa quando o nome não muda', async () => {
      mockTeamRepo.findOne
        .mockResolvedValueOnce({ id: 't-1', name: 'Equipa A' })
        .mockResolvedValueOnce({ id: 't-1', name: 'Equipa A' });

      const result = await service.update('t-1', { name: 'Equipa A' });

      expect(mockTeamRepo.update).toHaveBeenCalledWith('t-1', { name: 'Equipa A' });
      expect(result).toEqual({ id: 't-1', name: 'Equipa A' });
    });
  });

  describe('addMember', () => {
    it('deve lançar BadRequestException se a equipa estiver inativa', async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: 't-1', isActive: false });

      await expect(service.addMember('t-1', { employeeId: 'e-1', role: 'member' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar NotFoundException se o colaborador não existir', async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: 't-1', isActive: true });
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(service.addMember('t-1', { employeeId: 'e-1', role: 'member' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ConflictException se o colaborador já pertencer à equipa', async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: 't-1', isActive: true });
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'e-1' });
      mockTeamMemberRepo.findOne.mockResolvedValue({ id: 'm-1' });

      await expect(service.addMember('t-1', { employeeId: 'e-1', role: 'member' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve adicionar o membro e emitir o evento team.member.changed', async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: 't-1', isActive: true });
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'e-1' });
      mockTeamMemberRepo.findOne.mockResolvedValue(null);

      const result = await service.addMember('t-1', {
        employeeId: 'e-1',
        role: 'member',
      });

      expect(result).toEqual(
        expect.objectContaining({ teamId: 't-1', employeeId: 'e-1', roleInTeam: 'member' }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'team.member.changed',
        expect.objectContaining({ teamId: 't-1', employeeId: 'e-1' }),
      );
    });
  });

  describe('removeMember', () => {
    it('deve lançar NotFoundException se o membro não existir ou já tiver sido removido', async () => {
      mockTeamMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.removeMember('t-1', 'e-1')).rejects.toThrow(NotFoundException);
    });

    it('deve definir endDate e emitir o evento team.member.changed', async () => {
      const member = { id: 'm-1', teamId: 't-1', employeeId: 'e-1', endDate: null };
      mockTeamMemberRepo.findOne.mockResolvedValue(member);

      await service.removeMember('t-1', 'e-1');

      expect(mockTeamMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ endDate: expect.any(String) as string }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'team.member.changed',
        expect.objectContaining({ teamId: 't-1', employeeId: 'e-1' }),
      );
    });
  });

  describe('getMembers', () => {
    it('deve validar a existência da equipa antes de listar membros', async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: 't-1' });
      mockTeamMemberRepo.find.mockResolvedValue([]);

      await service.getMembers('t-1');

      expect(mockTeamRepo.findOne).toHaveBeenCalled();
      expect(mockTeamMemberRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teamId: 't-1' } }),
      );
    });
  });

  describe('isTeamLeader', () => {
    it('deve devolver false se a equipa não tiver líder definido', async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: 't-1', leaderId: null });

      const result = await service.isTeamLeader('t-1', 'u-1');

      expect(result).toBe(false);
    });

    it('deve devolver false se o colaborador do utilizador não existir', async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: 't-1', leaderId: 'e-1' });
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      const result = await service.isTeamLeader('t-1', 'u-1');

      expect(result).toBe(false);
    });

    it('deve devolver true se o colaborador for o líder da equipa', async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: 't-1', leaderId: 'e-1' });
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'e-1' });

      const result = await service.isTeamLeader('t-1', 'u-1');

      expect(result).toBe(true);
    });

    it('deve devolver false se o colaborador não for o líder da equipa', async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: 't-1', leaderId: 'e-1' });
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'e-2' });

      const result = await service.isTeamLeader('t-1', 'u-1');

      expect(result).toBe(false);
    });
  });

  describe('getTeamCapacity', () => {
    it('deve somar os dias ativos dos membros dentro do mês', async () => {
      mockTeamRepo.findOne.mockResolvedValue({ id: 't-1' });
      mockTeamMemberRepo.find.mockResolvedValue([
        { startDate: '2026-03-01', endDate: '2026-03-10' },
        { startDate: '2026-03-05', endDate: null },
      ]);

      const result = await service.getTeamCapacity('t-1', '2026-03');

      expect(result).toBeGreaterThan(0);
      expect(mockTeamMemberRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teamId: 't-1' }) as Record<string, unknown>,
        }),
      );
    });
  });
});
