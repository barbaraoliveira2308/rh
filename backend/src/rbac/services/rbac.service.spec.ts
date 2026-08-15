import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { Role } from '../../auth/entities/role.entity';
import { Permission } from '../../auth/entities/permission.entity';
import { UserRole } from '../../auth/entities/user-role.entity';
import { RolePermission } from '../../auth/entities/role-permission.entity';

describe('RbacService', () => {
  let service: RbacService;
  let mockRoleRepo: Record<string, jest.Mock>;
  let mockUserRoleRepo: Record<string, jest.Mock>;
  let mockRolePermissionRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRoleRepo = {
      findOneBy: jest.fn(),
    };
    mockUserRoleRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data: Partial<UserRole>) => data),
      save: jest.fn((data: Partial<UserRole>) => Promise.resolve(data)),
      remove: jest.fn(),
    };
    mockRolePermissionRepo = {
      find: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        { provide: getRepositoryToken(Role), useValue: mockRoleRepo },
        { provide: getRepositoryToken(UserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(RolePermission), useValue: mockRolePermissionRepo },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
  });

  describe('assignRole', () => {
    it('deve lançar ConflictException se o utilizador já tiver o perfil atribuído', async () => {
      mockUserRoleRepo.findOne.mockResolvedValue({ userId: 'u-1', roleId: 'r-1' });

      await expect(service.assignRole('u-1', 'r-1', 'admin-1')).rejects.toThrow(ConflictException);
    });

    it('deve lançar NotFoundException se o perfil não existir', async () => {
      mockUserRoleRepo.findOne.mockResolvedValue(null);
      mockRoleRepo.findOneBy.mockResolvedValue(null);

      await expect(service.assignRole('u-1', 'r-missing', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve atribuir o perfil ao utilizador', async () => {
      mockUserRoleRepo.findOne.mockResolvedValue(null);
      mockRoleRepo.findOneBy.mockResolvedValue({ id: 'r-1', name: 'manager' });

      await service.assignRole('u-1', 'r-1', 'admin-1');

      expect(mockUserRoleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u-1', roleId: 'r-1', assignedBy: 'admin-1' }),
      );
    });
  });

  describe('revokeRole', () => {
    it('deve lançar NotFoundException se o utilizador não tiver o perfil', async () => {
      mockUserRoleRepo.findOne.mockResolvedValue(null);

      await expect(service.revokeRole('u-1', 'r-1')).rejects.toThrow(NotFoundException);
    });

    it('deve remover o perfil do utilizador', async () => {
      const userRole = { userId: 'u-1', roleId: 'r-1' };
      mockUserRoleRepo.findOne.mockResolvedValue(userRole);

      await service.revokeRole('u-1', 'r-1');

      expect(mockUserRoleRepo.remove).toHaveBeenCalledWith(userRole);
    });
  });

  describe('getUserPermissions', () => {
    it('deve devolver lista vazia se o utilizador não tiver perfis', async () => {
      mockUserRoleRepo.find.mockResolvedValue([]);

      const result = await service.getUserPermissions('u-1');

      expect(result).toEqual([]);
      expect(mockRolePermissionRepo.find).not.toHaveBeenCalled();
    });

    it('deve devolver permissões únicas de todos os perfis do utilizador', async () => {
      mockUserRoleRepo.find.mockResolvedValue([{ roleId: 'r-1' }, { roleId: 'r-2' }]);
      const permissionA: Permission = { id: 'p-1' } as Permission;
      const permissionB: Permission = { id: 'p-2' } as Permission;
      mockRolePermissionRepo.find.mockResolvedValue([
        { permission: permissionA },
        { permission: permissionA },
        { permission: permissionB },
      ]);

      const result = await service.getUserPermissions('u-1');

      expect(result).toEqual([permissionA, permissionB]);
    });
  });

  describe('isAdmin', () => {
    it('deve devolver true se o utilizador tiver o perfil admin', async () => {
      mockUserRoleRepo.find.mockResolvedValue([{ roleId: 'r-1', role: { name: 'admin' } }]);

      const result = await service.isAdmin('u-1');

      expect(result).toBe(true);
    });

    it('deve devolver false se o utilizador não tiver o perfil admin', async () => {
      mockUserRoleRepo.find.mockResolvedValue([{ roleId: 'r-1', role: { name: 'manager' } }]);

      const result = await service.isAdmin('u-1');

      expect(result).toBe(false);
    });

    it('deve devolver false se o utilizador não tiver perfis', async () => {
      mockUserRoleRepo.find.mockResolvedValue([]);

      const result = await service.isAdmin('u-1');

      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('deve devolver true sempre que o utilizador tiver o perfil admin', async () => {
      mockUserRoleRepo.find.mockResolvedValue([{ roleId: 'r-1', role: { name: 'admin' } }]);

      const result = await service.hasPermission('u-1', 'projects', 'delete');

      expect(result).toBe(true);
      expect(mockRolePermissionRepo.count).not.toHaveBeenCalled();
    });

    it('deve devolver false se o utilizador não tiver perfis', async () => {
      mockUserRoleRepo.find.mockResolvedValue([]);

      const result = await service.hasPermission('u-1', 'projects', 'read');

      expect(result).toBe(false);
    });

    it('deve devolver true se algum perfil do utilizador tiver a permissão', async () => {
      mockUserRoleRepo.find.mockResolvedValue([{ roleId: 'r-1', role: { name: 'manager' } }]);
      mockRolePermissionRepo.count.mockResolvedValue(1);

      const result = await service.hasPermission('u-1', 'projects', 'approve');

      expect(result).toBe(true);
    });

    it('deve devolver false se nenhum perfil do utilizador tiver a permissão', async () => {
      mockUserRoleRepo.find.mockResolvedValue([{ roleId: 'r-1', role: { name: 'employee' } }]);
      mockRolePermissionRepo.count.mockResolvedValue(0);

      const result = await service.hasPermission('u-1', 'projects', 'delete');

      expect(result).toBe(false);
    });
  });
});
