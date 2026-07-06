import { DataSource } from 'typeorm';
import { hash } from 'argon2';
import { Role } from '../../auth/entities/role.entity';
import { Permission } from '../../auth/entities/permission.entity';
import { RolePermission } from '../../auth/entities/role-permission.entity';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/entities/user-role.entity';

const RESOURCES = ['users', 'teams', 'projects', 'timesheets', 'absences', 'expenses'] as const;
const ACTIONS = ['create', 'read', 'update', 'delete', 'approve'] as const;

type Resource = (typeof RESOURCES)[number];
type Action = (typeof ACTIONS)[number];

const ADMIN = 'admin' as const;
const MANAGER = 'manager' as const;
const APPROVER = 'approver' as const;
const EMPLOYEE = 'employee' as const;

type RoleName = typeof ADMIN | typeof MANAGER | typeof APPROVER | typeof EMPLOYEE;

const rolePermissionsMap: Record<RoleName, Array<{ resource: Resource; action: Action }>> = {
  admin: RESOURCES.flatMap((r) => ACTIONS.map((a) => ({ resource: r, action: a }))),
  manager: [
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'update' },
    { resource: 'teams', action: 'read' },
    { resource: 'teams', action: 'create' },
    { resource: 'teams', action: 'update' },
    { resource: 'projects', action: 'read' },
    { resource: 'projects', action: 'create' },
    { resource: 'projects', action: 'update' },
    { resource: 'timesheets', action: 'read' },
    { resource: 'timesheets', action: 'create' },
    { resource: 'timesheets', action: 'update' },
    { resource: 'timesheets', action: 'approve' },
    { resource: 'absences', action: 'read' },
    { resource: 'absences', action: 'create' },
    { resource: 'absences', action: 'update' },
    { resource: 'absences', action: 'approve' },
    { resource: 'expenses', action: 'read' },
    { resource: 'expenses', action: 'create' },
    { resource: 'expenses', action: 'update' },
    { resource: 'expenses', action: 'approve' },
  ],
  approver: [
    { resource: 'users', action: 'read' },
    { resource: 'teams', action: 'read' },
    { resource: 'projects', action: 'read' },
    { resource: 'timesheets', action: 'read' },
    { resource: 'timesheets', action: 'approve' },
    { resource: 'absences', action: 'read' },
    { resource: 'absences', action: 'approve' },
    { resource: 'expenses', action: 'read' },
    { resource: 'expenses', action: 'approve' },
  ],
  employee: [
    { resource: 'timesheets', action: 'create' },
    { resource: 'timesheets', action: 'read' },
    { resource: 'timesheets', action: 'update' },
    { resource: 'absences', action: 'create' },
    { resource: 'absences', action: 'read' },
    { resource: 'absences', action: 'update' },
    { resource: 'expenses', action: 'create' },
    { resource: 'expenses', action: 'read' },
    { resource: 'expenses', action: 'update' },
  ],
};

export async function run(dataSource: DataSource): Promise<void> {
  const roleRepo = dataSource.getRepository(Role);
  const permissionRepo = dataSource.getRepository(Permission);
  const rolePermissionRepo = dataSource.getRepository(RolePermission);
  const userRepo = dataSource.getRepository(User);
  const userRoleRepo = dataSource.getRepository(UserRole);

  const existingRoles = await roleRepo.find();
  if (existingRoles.length > 0) {
    return;
  }

  const roles = await roleRepo.save([
    { name: 'admin', description: 'Administrador do sistema', isSystem: true },
    { name: 'manager', description: 'Gestor de equipa', isSystem: true },
    { name: 'approver', description: 'Aprovador de fluxos', isSystem: true },
    { name: 'employee', description: 'Colaborador', isSystem: true },
  ]);

  const roleMap = new Map<string, Role>();
  for (const role of roles) {
    roleMap.set(role.name, role);
  }

  const allPermissions: Permission[] = [];

  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      const existing = await permissionRepo.findOneBy({ resource, action });

      if (existing) {
        allPermissions.push(existing);
      } else {
        const permission = permissionRepo.create({ resource, action });
        const saved = await permissionRepo.save(permission);
        allPermissions.push(saved);
      }
    }
  }

  const permMap = new Map<string, Permission>();
  for (const perm of allPermissions) {
    permMap.set(`${perm.resource}:${perm.action}`, perm);
  }

  const rolePermissions: RolePermission[] = [];

  for (const [roleName, perms] of Object.entries(rolePermissionsMap)) {
    const role = roleMap.get(roleName);
    if (!role) continue;

    for (const { resource, action } of perms) {
      const perm = permMap.get(`${resource}:${action}`);
      if (!perm) continue;

      const rp = rolePermissionRepo.create({
        roleId: role.id,
        permissionId: perm.id,
      });
      rolePermissions.push(rp);
    }
  }

  await rolePermissionRepo.save(rolePermissions);

  const adminPasswordHash = await hash('Admin123!');

  let adminUser = await userRepo.findOneBy({ email: 'admin@hr-suite.local' });

  if (!adminUser) {
    adminUser = userRepo.create({
      email: 'admin@hr-suite.local',
      username: 'admin',
      passwordHash: adminPasswordHash,
      isActive: true,
      passwordChangedAt: new Date(),
    });
    adminUser = await userRepo.save(adminUser);
  }

  const adminRole = roleMap.get('admin');
  if (adminRole) {
    const existingUserRole = await userRoleRepo.findOneBy({
      userId: adminUser.id,
      roleId: adminRole.id,
    });

    if (!existingUserRole) {
      await userRoleRepo.save(
        userRoleRepo.create({
          userId: adminUser.id,
          roleId: adminRole.id,
          assignedBy: adminUser.id,
        }),
      );
    }
  }
}
