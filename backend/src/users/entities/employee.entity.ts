import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Department } from './department.entity';
import { JobTitle } from './job-title.entity';
import { GdprSensitive } from '../decorators';

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
}

@Entity({ schema: 'hr', name: 'employees' })
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true, nullable: false })
  userId: string;

  @Column({ name: 'employee_number', type: 'varchar', length: 20, unique: true, nullable: false })
  employeeNumber: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: false })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: false })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ name: 'personal_email', type: 'varchar', length: 255, nullable: true })
  personalEmail: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @GdprSensitive
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  nif: string | null;

  @GdprSensitive
  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @GdprSensitive
  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nationality: string | null;

  @GdprSensitive
  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string | null;

  @Column({ name: 'photo_url', type: 'varchar', length: 512, nullable: true })
  photoUrl: string | null;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @Column({ name: 'job_title_id', type: 'uuid', nullable: true })
  jobTitleId: string | null;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId: string | null;

  @Column({ name: 'employment_start_date', type: 'date', nullable: false })
  employmentStartDate: string;

  @Column({ name: 'employment_end_date', type: 'date', nullable: true })
  employmentEndDate: string | null;

  @Column({ type: 'varchar', length: 20, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  @Column({ name: 'work_location', type: 'varchar', length: 100, nullable: true })
  workLocation: string | null;

  @GdprSensitive
  @Column({ type: 'varchar', length: 34, nullable: true })
  iban: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @ManyToOne(() => JobTitle, { nullable: true })
  @JoinColumn({ name: 'job_title_id' })
  jobTitle: JobTitle | null;

  @ManyToOne(() => Employee, (emp) => emp.directReports, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: Employee | null;

  @OneToMany(() => Employee, (emp) => emp.manager)
  directReports: Employee[];
}
