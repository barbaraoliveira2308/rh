import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { CreateAuditLogDto, AuditFiltersDto, PaginatedResult } from '../dto';

const SENSITIVE_PATTERNS = [
  'password', 'password_hash', 'passwordhash',
  'mfa_secret', 'mfasecret',
  'nif', 'iban',
  'token', 'refreshtoken', 'secret',
];

@Injectable()
export class AuditService {
  private readonly queue: CreateAuditLogDto[] = [];
  private processing = false;

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  log(entry: CreateAuditLogDto): void {
    this.queue.push(entry);
    if (!this.processing) {
      this.processing = true;
      setImmediate(() => {
        void this.processQueue();
      });
    }
  }

  async findAll(filters: AuditFiltersDto): Promise<PaginatedResult<AuditLog>> {
    const limit = filters.limit ?? 20;
    const query = this.auditLogRepository.createQueryBuilder('log');

    if (filters.userId) {
      query.andWhere('log.userId = :userId', { userId: filters.userId });
    }
    if (filters.entityType) {
      query.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
    }
    if (filters.action) {
      query.andWhere('log.action = :action', { action: filters.action });
    }
    if (filters.dateFrom) {
      query.andWhere('log.timestamp >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
    }
    if (filters.dateTo) {
      query.andWhere('log.timestamp <= :dateTo', { dateTo: new Date(filters.dateTo) });
    }
    if (filters.cursor) {
      query.andWhere('log.timestamp < :cursor', { cursor: new Date(filters.cursor) });
    }

    query.orderBy('log.timestamp', 'DESC');
    query.take(limit + 1);

    const results = await query.getMany();
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore && data.length > 0
      ? data[data.length - 1].timestamp.toISOString()
      : null;

    return { data, nextCursor, hasMore };
  }

  async findByResource(type: string, id: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType: type, entityId: id },
      order: { timestamp: 'DESC' },
    });
  }

  async findAllForExport(filters: AuditFiltersDto): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('log');

    if (filters.userId) {
      query.andWhere('log.userId = :userId', { userId: filters.userId });
    }
    if (filters.entityType) {
      query.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
    }
    if (filters.action) {
      query.andWhere('log.action = :action', { action: filters.action });
    }
    if (filters.dateFrom) {
      query.andWhere('log.timestamp >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
    }
    if (filters.dateTo) {
      query.andWhere('log.timestamp <= :dateTo', { dateTo: new Date(filters.dateTo) });
    }

    query.orderBy('log.timestamp', 'DESC');

    return query.getMany();
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const entry = this.queue.shift();
      if (!entry) break;
      try {
        await this.writeToDb(entry);
      } catch (err) {
        console.error('[Audit] Failed to write log:', err);
      }
    }
    this.processing = false;
  }

  private async writeToDb(entry: CreateAuditLogDto): Promise<void> {
    const log = this.auditLogRepository.create({
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValues: entry.oldValues ? this.maskSensitiveFields(entry.oldValues) : null,
      newValues: entry.newValues ? this.maskSensitiveFields(entry.newValues) : null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      timestamp: new Date(),
      correlationId: entry.correlationId ?? null,
      module: entry.module,
    });
    await this.auditLogRepository.save(log);
  }

  private maskSensitiveFields(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const isSensitive = SENSITIVE_PATTERNS.some(
        (pattern) => key.toLowerCase().includes(pattern),
      );
      masked[key] = isSensitive ? '***' : value;
    }
    return masked;
  }
}
