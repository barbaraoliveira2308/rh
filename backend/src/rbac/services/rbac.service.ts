import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../../auth/entities/role.entity';
import { Permission } from '../../auth/entities/permission.entity';
import { UserRole } from '../../auth/entities/user-role.entity';
import { RolePermission } from '../../auth/entities/role-permission.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async assignRole(userId: string, roleId: string, assignedBy: string): Promise<void> {
    const existing = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (existing) {
      throw new ConflictException('Utilizador já tem este perfil atribuído');
    }

    const role = await this.roleRepository.findOneBy({ id: roleId });
    if (!role) {
      throw new NotFoundException('Perfil não encontrado');
    }

    const userRole = this.userRoleRepository.create({
      userId,
      roleId,
      assignedBy,
    });

    await this.userRoleRepository.save(userRole);
  }

  async revokeRole(userId: string, roleId: string): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (!userRole) {
      throw new NotFoundException('Utilizador não tem este perfil atribuído');
    }

    await this.userRoleRepository.remove(userRole);
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: { role: true },
    });

    if (userRoles.length === 0) {
      return [];
    }

    const roleIds = userRoles.map((ur) => ur.roleId);

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId: In(roleIds) },
      relations: { permission: true },
    });

    const uniquePermissions = new Map<string, Permission>();

    for (const rp of rolePermissions) {
      if (!uniquePermissions.has(rp.permission.id)) {
        uniquePermissions.set(rp.permission.id, rp.permission);
      }
    }

    return Array.from(uniquePermissions.values());
  }

  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: { role: true },
    });

    const isAdmin = userRoles.some((ur) => ur.role.name === 'admin');
    if (isAdmin) {
      return true;
    }

    if (userRoles.length === 0) {
      return false;
    }

    const roleIds = userRoles.map((ur) => ur.roleId);

    const count = await this.rolePermissionRepository.count({
      where: {
        roleId: In(roleIds),
        permission: { resource, action },
      },
    });

    return count > 0;
  }
}
