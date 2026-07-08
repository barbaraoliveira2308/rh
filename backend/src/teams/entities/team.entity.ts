import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Department } from '../../users/entities/department.entity';
import { Employee } from '../../users/entities/employee.entity';
import { TeamMember } from './team-member.entity';

@Entity({ schema: 'hr', name: 'teams' })
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  name: string;

  @Column({ name: 'department_id', type: 'uuid', nullable: false })
  departmentId: string;

  @Column({ name: 'leader_id', type: 'uuid', nullable: true })
  leaderId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Department, { nullable: false })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'leader_id' })
  leader: Employee | null;

  @OneToMany(() => TeamMember, (member) => member.team)
  members: TeamMember[];
}
