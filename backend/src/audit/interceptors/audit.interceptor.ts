import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Scope } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, switchMap, tap } from 'rxjs';
import { Request } from 'express';
import { DataSource } from 'typeorm';
import { AuditService } from '../services/audit.service';
import { CreateAuditLogDto } from '../dto';
import { AUDIT_KEY, AuditMetadata } from '../decorators/audit.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { GDPR_SENSITIVE_KEY } from '../../users/decorators/gdpr-sensitive.decorator';

interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Injectable({ scope: Scope.REQUEST })
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithUser>();
    const method = request.method;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const auditMeta = this.reflector.get<AuditMetadata | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );

    if (!auditMeta) {
      return next.handle();
    }

    const { action, entityType } = auditMeta;
    const entityId = this.extractEntityId(request);
    const user = request.user;

    let oldValuesPromise: Promise<Record<string, unknown> | null>;

    if (['PUT', 'PATCH'].includes(method) && entityId) {
      oldValuesPromise = this.fetchOldValues(entityType, entityId);
    } else {
      oldValuesPromise = Promise.resolve(null);
    }

    return from(oldValuesPromise).pipe(
      switchMap((oldValues) =>
        next.handle().pipe(
          tap((responseBody: unknown) => {
            let newValues: Record<string, unknown> | undefined;

            if (['POST', 'PUT', 'PATCH'].includes(method) && responseBody) {
              if (typeof responseBody === 'object') {
                newValues = responseBody as Record<string, unknown>;
              }
            }

            const entry: CreateAuditLogDto = {
              userId: user?.sub,
              action,
              entityType,
              entityId: entityId ?? 'unknown',
              oldValues: oldValues ? this.removeSensitiveFields(entityType, oldValues) : undefined,
              newValues: newValues ? this.removeSensitiveFields(entityType, newValues) : undefined,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
              module: entityType.toLowerCase(),
            };

            this.auditService.log(entry);
          }),
        ),
      ),
    );
  }

  private extractEntityId(request: Request): string | undefined {
    const params = request.params as Record<string, string | undefined>;
    return params.id ?? params.entityId;
  }

  private async fetchOldValues(
    entityType: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const repository = this.dataSource.getRepository(entityType);
      const entity = await repository.findOne({
        where: { id: entityId },
      });
      if (entity) {
        const entityRecord = entity as Record<string, unknown>;
        delete entityRecord.passwordHash;
        delete entityRecord.mfaSecret;
        return entityRecord;
      }
    } catch {
      // entity type not registered or query failed
    }
    return null;
  }

  private removeSensitiveFields(
    entityType: string,
    values: Record<string, unknown>,
  ): Record<string, unknown> {
    const sensitiveFields = this.getGdprSensitiveFields(entityType);

    if (sensitiveFields.length === 0) {
      return values;
    }

    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      filtered[key] = sensitiveFields.includes(key) ? '***' : value;
    }
    return filtered;
  }

  private getGdprSensitiveFields(entityType: string): string[] {
    try {
      const repository = this.dataSource.getRepository(entityType);
      const target = repository.target as { prototype: Record<string, unknown> };
      const prototype = target.prototype;
      const fields: string[] = [];

      const propertyNames = Object.getOwnPropertyNames(prototype);
      for (const key of propertyNames) {
        if (Reflect.getMetadata(GDPR_SENSITIVE_KEY, prototype, key)) {
          fields.push(key);
        }
      }

      return fields;
    } catch {
      return [];
    }
  }
}
