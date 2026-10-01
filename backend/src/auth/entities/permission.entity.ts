import { Entity, PrimaryGeneratedColumn, Column, Unique, OneToMany } from 'typeorm';
import { RolePermission } from './role-permission.entity';

@Entity({ schema: 'hr', name: 'permissions' })
@Unique('uq_permissions_resource_action', ['resource', 'action'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  resource: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  rolePermissions: RolePermission[];
}
