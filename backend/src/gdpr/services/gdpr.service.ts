import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, Between, In, IsNull } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { ConsentRecord } from '../entities/consent-record.entity';
import { DataSubjectRequest } from '../entities/data-subject-request.entity';
import { RetentionPolicy } from '../entities/retention-policy.entity';
import { SecurityIncident } from '../entities/security-incident.entity';

import { DataSubjectRequestType } from '../entities/data-subject-request-type.enum';
import { DataSubjectRequestStatus } from '../entities/data-subject-request-status.enum';
import { RetentionAction } from '../entities/retention-action.enum';
import { SecurityIncidentSeverity } from '../entities/security-incident-severity.enum';
import { SecurityIncidentStatus } from '../entities/security-incident-status.enum';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { User } from '../../auth/entities/user.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { RecordConsentDto } from '../dto/record-consent.dto';
import { CreateDataRequestDto } from '../dto/create-data-request.dto';
import { CreateRetentionPolicyDto } from '../dto/create-retention-policy.dto';
import { ReportIncidentDto } from '../dto/report-incident.dto';
import { UpdateIncidentDto } from '../dto/update-incident.dto';
import { UpdateRetentionPolicyDto } from '../dto/update-retention-policy.dto';
import { ConsentGrantedEvent } from '../events/consent-granted.event';
import { ConsentRevokedEvent } from '../events/consent-revoked.event';
import { DataSubjectRequestCreatedEvent } from '../events/data-subject-request-created.event';
import { DataAnonymizedEvent } from '../events/data-anonymized.event';
import { SecurityIncidentRegisteredEvent } from '../events/security-incident-registered.event';
import { DataSubjectRequestCompletedEvent } from '../events/data-subject-request-completed.event';
import { AdminService } from '../../admin/admin.service';
import { SecurityIncidentEscalatedEvent } from '../events/security-incident-escalated.event';
import { PersonalDataExportedEvent } from '../events/personal-data-exported.event';

const DEADLINE_DAYS = 30;

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);
  private readonly transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(ConsentRecord)
    private readonly consentRepository: Repository<ConsentRecord>,
    @InjectRepository(DataSubjectRequest)
    private readonly requestRepository: Repository<DataSubjectRequest>,
    @InjectRepository(RetentionPolicy)
    private readonly retentionRepository: Repository<RetentionPolicy>,
    @InjectRepository(SecurityIncident)
    private readonly incidentRepository: Repository<SecurityIncident>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly adminService: AdminService,
  ) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;

    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        auth: {
          user: process.env.SMTP_USER ?? '',
          pass: process.env.SMTP_PASS ?? '',
        },
      });
    }
  }

  async recordConsent(dto: RecordConsentDto, ipAddress?: string): Promise<ConsentRecord> {
    const employee = await this.employeeRepository.findOne({
      where: { id: dto.subjectId },
    });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    const existing = await this.consentRepository.findOne({
      where: {
        subjectId: dto.subjectId,
        purpose: dto.purpose,
        isActive: true,
      },
    });

    if (existing) {
      throw new BadRequestException('Já existe um consentimento ativo para esta finalidade');
    }

    const consent = this.consentRepository.create({
      subjectId: dto.subjectId,
      purpose: dto.purpose,
      legalBasis: dto.legalBasis,
      version: dto.version ?? null,
      grantedAt: new Date(),
      revokedAt: null,
      isActive: true,
      ipAddress: ipAddress ?? null,
      collectedBy: dto.collectedBy ?? 'system',
    });

    const saved = await this.consentRepository.save(consent);

    this.eventEmitter.emit(
      'gdpr.consent.granted',
      new ConsentGrantedEvent(saved.id, saved.subjectId, saved.purpose),
    );

    return saved;
  }

  async revokeConsent(subjectId: string, purpose: string): Promise<ConsentRecord> {
    const consent = await this.consentRepository.findOne({
      where: {
        subjectId,
        purpose,
        isActive: true,
      },
    });

    if (!consent) {
      throw new NotFoundException('Consentimento ativo não encontrado');
    }

    consent.isActive = false;
    consent.revokedAt = new Date();

    const saved = await this.consentRepository.save(consent);

    this.eventEmitter.emit(
      'gdpr.consent.revoked',
      new ConsentRevokedEvent(saved.id, saved.subjectId, saved.purpose),
    );

    return saved;
  }

  async findConsents(subjectId: string): Promise<ConsentRecord[]> {
    return this.consentRepository.find({
      where: { subjectId },
      order: { createdAt: 'DESC' },
    });
  }

  async createDataRequest(dto: CreateDataRequestDto): Promise<DataSubjectRequest> {
    const employee = await this.employeeRepository.findOne({
      where: { id: dto.subjectId },
    });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + DEADLINE_DAYS);

    const request = this.requestRepository.create({
      subjectId: dto.subjectId,
      requestType: dto.requestType,
      status: DataSubjectRequestStatus.PENDING,
      requestedAt: new Date(),
      deadline,
      completedAt: null,
      responseNotes: dto.notes ?? null,
      responsePayload: null,
    });

    const saved = await this.requestRepository.save(request);

    this.eventEmitter.emit(
      'gdpr.request.created',
      new DataSubjectRequestCreatedEvent(saved.id, saved.subjectId, saved.requestType),
    );

    if (dto.requestType === DataSubjectRequestType.ERASURE) {
      await this.anonymizeEmployee(dto.subjectId, 'request');
      await this.completeRequest(saved.id, 'Dados anonimizados por pedido de apagamento', {
        anonymized: true,
      });
    } else if (dto.requestType === DataSubjectRequestType.ACCESS) {
      const payload = await this.collectSubjectData(dto.subjectId);
      await this.completeRequest(saved.id, 'Relatório de acesso gerado', payload);
      this.eventEmitter.emit(
        'gdpr.data.exported',
        new PersonalDataExportedEvent(saved.subjectId, saved.id, saved.requestType),
      );
    } else if (dto.requestType === DataSubjectRequestType.PORTABILITY) {
      const payload = await this.collectSubjectData(dto.subjectId);
      await this.completeRequest(saved.id, 'Dados exportados para portabilidade', payload);
      this.eventEmitter.emit(
        'gdpr.data.exported',
        new PersonalDataExportedEvent(saved.subjectId, saved.id, saved.requestType),
      );
    }

    return this.requestRepository.findOne({
      where: { id: saved.id },
      relations: ['subject'],
    }) as Promise<DataSubjectRequest>;
  }

  async completeRequest(
    requestId: string,
    notes?: string,
    payload?: Record<string, unknown>,
  ): Promise<DataSubjectRequest> {
    const request = await this.requestRepository.findOne({ where: { id: requestId } });

    if (!request) {
      throw new NotFoundException('Pedido não encontrado');
    }

    request.status = DataSubjectRequestStatus.COMPLETED;
    request.completedAt = new Date();
    request.responseNotes = notes ?? request.responseNotes;
    request.responsePayload = payload ?? request.responsePayload;

    const saved = await this.requestRepository.save(request);

    this.eventEmitter.emit(
      'gdpr.request.completed',
      new DataSubjectRequestCompletedEvent(saved.id, saved.subjectId, saved.requestType),
    );

    return saved;
  }

  async findRequests(): Promise<DataSubjectRequest[]> {
    return this.requestRepository.find({
      relations: ['subject'],
      order: { requestedAt: 'DESC' },
    });
  }

  async rejectRequest(requestId: string, notes: string): Promise<DataSubjectRequest> {
    const request = await this.requestRepository.findOne({ where: { id: requestId } });

    if (!request) {
      throw new NotFoundException('Pedido não encontrado');
    }

    request.status = DataSubjectRequestStatus.REJECTED;
    request.completedAt = new Date();
    request.responseNotes = notes;

    return this.requestRepository.save(request);
  }

  async anonymizeEmployee(
    employeeId: string,
    triggeredBy: 'request' | 'retention' | 'admin' = 'admin',
  ): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['user'],
    });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    const anonymizedPrefix = 'anon-' + employeeId.slice(0, 8);

    employee.firstName = anonymizedPrefix;
    employee.lastName = 'anonimized';
    employee.email = anonymizedPrefix + '@anonimized.local';
    employee.personalEmail = null;
    employee.phone = null;
    employee.nif = null;
    employee.birthDate = null;
    employee.address = null;
    employee.nationality = null;
    employee.gender = null;
    employee.photoUrl = null;
    employee.iban = null;
    employee.workLocation = null;
    employee.status = EmployeeStatus.INACTIVE;
    employee.anonymizedAt = new Date();

    const saved = await this.employeeRepository.save(employee);

    if (employee.user) {
      employee.user.email = anonymizedPrefix + '@anonimized.local';
      await this.userRepository.save(employee.user);
    }

    await this.auditLogRepository.save({
      userId: null,
      action: 'DataAnonymized',
      entityType: 'Employee',
      entityId: employeeId,
      oldValues: null,
      newValues: { triggeredBy, anonymizedAt: new Date().toISOString() },
      ipAddress: null,
      userAgent: null,
      module: 'gdpr',
    });

    this.eventEmitter.emit(
      'gdpr.data.anonymized',
      new DataAnonymizedEvent(employeeId, triggeredBy),
    );

    return saved;
  }

  @OnEvent('gdpr.data.exported')
  async handleDataExported(event: PersonalDataExportedEvent): Promise<void> {
    await this.auditLogRepository.save({
      userId: null,
      action: 'DataExported',
      entityType: 'Employee',
      entityId: event.subjectId,
      oldValues: null,
      newValues: { requestId: event.requestId, requestType: event.requestType },
      ipAddress: null,
      userAgent: null,
      module: 'gdpr',
    });
  }

  @Cron('0 3 1 * *')
  async runRetentionPolicies(): Promise<number> {
    const settings = await this.adminService.getSettings();

    let anonymizedCount = await this.anonymizeInactiveEmployeesPastCutoff(
      settings.gdprPostExitRetentionYears,
    );

    const policies = await this.retentionRepository.find({
      where: { isActive: true },
    });

    for (const policy of policies) {
      if (policy.actionAfterRetention !== RetentionAction.ANONYMIZE) {
        continue;
      }

      anonymizedCount += await this.anonymizeInactiveEmployeesPastCutoff(policy.retentionYears);
    }

    return anonymizedCount;
  }

  private async anonymizeInactiveEmployeesPastCutoff(retentionYears: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - retentionYears);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const employees = await this.employeeRepository.find({
      where: {
        status: EmployeeStatus.INACTIVE,
        employmentEndDate: LessThan(cutoffStr),
        anonymizedAt: IsNull(),
      },
    });

    let anonymizedCount = 0;

    for (const employee of employees) {
      try {
        await this.anonymizeEmployee(employee.id, 'retention');
        anonymizedCount++;
      } catch (error) {
        this.logger.error(
          'Failed to anonymize employee ' +
            employee.id +
            ': ' +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    }

    return anonymizedCount;
  }

  async reportIncident(dto: ReportIncidentDto): Promise<SecurityIncident> {
    const incident = this.incidentRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      severity: dto.severity,
      detectedAt: new Date(),
      reportedToAuthorityAt: null,
      affectedSubjects: dto.affectedSubjects ?? null,
      status: SecurityIncidentStatus.OPEN,
      resolutionNotes: null,
      reportedBy: dto.reportedBy ?? null,
    });

    const saved = await this.incidentRepository.save(incident);

    if (
      saved.severity === SecurityIncidentSeverity.HIGH ||
      saved.severity === SecurityIncidentSeverity.CRITICAL
    ) {
      await this.notifyDpo(saved);
      this.eventEmitter.emit(
        'gdpr.incident.escalated',
        new SecurityIncidentEscalatedEvent(saved.id, saved.severity),
      );
    }

    this.eventEmitter.emit(
      'gdpr.incident.registered',
      new SecurityIncidentRegisteredEvent(saved.id, saved.severity),
    );

    return saved;
  }

  async findIncidents(): Promise<SecurityIncident[]> {
    return this.incidentRepository.find({ order: { detectedAt: 'DESC' } });
  }

  async updateIncident(id: string, dto: UpdateIncidentDto): Promise<SecurityIncident> {
    const incident = await this.incidentRepository.findOne({ where: { id } });

    if (!incident) {
      throw new NotFoundException('Incidente não encontrado');
    }

    if (dto.status !== undefined) {
      incident.status = dto.status;
    }

    if (dto.resolutionNotes !== undefined) {
      incident.resolutionNotes = dto.resolutionNotes;
    }

    if (dto.reportedToAuthorityAt !== undefined) {
      incident.reportedToAuthorityAt = new Date(dto.reportedToAuthorityAt);
    }

    return this.incidentRepository.save(incident);
  }

  async createRetentionPolicy(dto: CreateRetentionPolicyDto): Promise<RetentionPolicy> {
    const policy = this.retentionRepository.create({
      dataCategory: dto.dataCategory,
      retentionYears: dto.retentionYears,
      legalReference: dto.legalReference ?? null,
      actionAfterRetention: dto.actionAfterRetention,
      isActive: dto.isActive ?? true,
    });

    return this.retentionRepository.save(policy);
  }

  async findRetentionPolicies(): Promise<RetentionPolicy[]> {
    return this.retentionRepository.find({ order: { createdAt: 'DESC' } });
  }

  async updateRetentionPolicy(id: string, dto: UpdateRetentionPolicyDto): Promise<RetentionPolicy> {
    const policy = await this.retentionRepository.findOne({ where: { id } });

    if (!policy) {
      throw new NotFoundException('Política de retenção não encontrada');
    }

    policy.isActive = dto.isActive;

    return this.retentionRepository.save(policy);
  }

  async getComplianceReport(): Promise<Record<string, unknown>> {
    const [activeConsents, pendingRequests, openIncidents, activePolicies] = await Promise.all([
      this.consentRepository.count({ where: { isActive: true } }),
      this.requestRepository.count({ where: { status: DataSubjectRequestStatus.PENDING } }),
      this.incidentRepository.count({
        where: {
          status: SecurityIncidentStatus.OPEN,
        },
      }),
      this.retentionRepository.count({ where: { isActive: true } }),
    ]);

    const overdueRequests = await this.requestRepository.count({
      where: {
        status: DataSubjectRequestStatus.PENDING,
        deadline: LessThan(new Date()),
      },
    });

    const incidents72h = await this.incidentRepository.find({
      where: {
        severity: SecurityIncidentSeverity.CRITICAL,
        status: SecurityIncidentStatus.OPEN,
      },
      order: { detectedAt: 'DESC' },
    });

    return {
      generatedAt: new Date().toISOString(),
      activeConsents,
      pendingRequests,
      overdueRequests,
      openIncidents,
      criticalIncidentsPendingAuthority: incidents72h.length,
      activeRetentionPolicies: activePolicies,
    };
  }

  async getConsentsReport(): Promise<ConsentRecord[]> {
    return this.consentRepository.find({
      where: { isActive: true },
      relations: ['subject'],
      order: { subjectId: 'ASC', purpose: 'ASC' },
    });
  }

  async getAccessHistoryReport(startDate?: string, endDate?: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where:
        startDate && endDate ? { timestamp: Between(new Date(startDate), new Date(endDate)) } : {},
      relations: ['user'],
      order: { timestamp: 'DESC' },
    });
  }

  async getErasureAndAnonymizationReport(): Promise<{
    requests: DataSubjectRequest[];
    automaticAnonymizations: AuditLog[];
  }> {
    const requests = await this.requestRepository.find({
      where: { requestType: DataSubjectRequestType.ERASURE },
      relations: ['subject'],
      order: { requestedAt: 'DESC' },
    });

    const automaticAnonymizations = await this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.action = :action', { action: 'DataAnonymized' })
      .andWhere('audit.entityType = :entityType', { entityType: 'Employee' })
      .andWhere("audit.new_values->>'triggeredBy' = :triggeredBy", { triggeredBy: 'retention' })
      .orderBy('audit.timestamp', 'DESC')
      .getMany();

    return { requests, automaticAnonymizations };
  }

  async getExportsReport(): Promise<DataSubjectRequest[]> {
    return this.requestRepository.find({
      where: {
        requestType: In([DataSubjectRequestType.ACCESS, DataSubjectRequestType.PORTABILITY]),
        status: DataSubjectRequestStatus.COMPLETED,
      },
      relations: ['subject'],
      order: { completedAt: 'DESC' },
    });
  }

  async getAuditByModuleReport(
    startDate?: string,
    endDate?: string,
  ): Promise<{ module: string; count: number }[]> {
    const query = this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.module', 'module')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.module')
      .orderBy('audit.module', 'ASC');

    if (startDate && endDate) {
      query.where('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    const rows = await query.getRawMany<{ module: string; count: string }>();

    return rows.map((row) => ({ module: row.module, count: Number(row.count) }));
  }

  private async collectSubjectData(subjectId: string): Promise<Record<string, unknown>> {
    const employee = await this.employeeRepository.findOne({
      where: { id: subjectId },
      relations: ['department', 'jobTitle', 'manager'],
    });

    const user = await this.userRepository.findOne({
      where: { id: employee?.userId },
    });

    const contracts = await this.dataSource.getRepository('Contract').find({
      where: { employeeId: subjectId },
    });

    const timesheetPeriods = await this.dataSource
      .getRepository('TimesheetPeriod')
      .find({ where: { employeeId: subjectId } });

    const absences = await this.dataSource
      .getRepository('AbsenceRequest')
      .find({ where: { employeeId: subjectId }, relations: ['absenceType'] });

    const expenseReports = await this.dataSource
      .getRepository('ExpenseReport')
      .find({ where: { employeeId: subjectId }, relations: ['items', 'items.category'] });

    const allocations = await this.dataSource
      .getRepository('ProjectAllocation')
      .find({ where: { employeeId: subjectId }, relations: ['project'] });

    const teamMemberships = await this.dataSource
      .getRepository('TeamMember')
      .find({ where: { employeeId: subjectId }, relations: ['team'] });

    const consents = await this.consentRepository.find({ where: { subjectId } });
    const requests = await this.requestRepository.find({ where: { subjectId } });
    const auditLogs = await this.auditLogRepository.find({
      where: { userId: user?.id },
      order: { timestamp: 'DESC' },
      take: 100,
    });

    return {
      employee: employee ?? null,
      user: user ? { id: user.id, email: user.email } : null,
      contracts,
      timesheetPeriods,
      absences,
      expenseReports,
      allocations,
      teamMemberships,
      consents,
      requests,
      auditLogs,
    };
  }

  private async notifyDpo(incident: SecurityIncident): Promise<void> {
    const dpoEmail = process.env.GDPR_DPO_EMAIL;

    if (!dpoEmail || !this.transporter) {
      this.logger.warn('DPO email or SMTP not configured; incident notification skipped');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'noreply@hr-suite.local',
        to: dpoEmail,
        subject: 'Alerta GDPR: Incidente ' + incident.severity + ' registado',
        text:
          'Foi registado um incidente de segurança com severidade ' +
          incident.severity +
          '.\n\n' +
          'Título: ' +
          incident.title +
          '\n' +
          'ID: ' +
          incident.id +
          '\n' +
          'Titulares afetados: ' +
          String(incident.affectedSubjects ?? 'N/A') +
          '\n',
      });
    } catch (error) {
      this.logger.error(
        'Failed to notify DPO: ' + (error instanceof Error ? error.message : String(error)),
      );
    }
  }
}
