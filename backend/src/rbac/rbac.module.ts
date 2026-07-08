import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RbacService } from './services/rbac.service';
import { Role } from '../auth/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { UserRole } from '../auth/entities/user-role.entity';
import { RolePermission } from '../auth/entities/role-permission.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, UserRole, RolePermission])],
  providers: [RbacService, RolesGuard, PermissionsGuard],
  exports: [RbacService, RolesGuard, PermissionsGuard],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RbacModule {}
