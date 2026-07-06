import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

export interface AuditEvent {
  type: string;
  userId?: string;
  username?: string;
  ip: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type AuditEventHandler = (event: AuditEvent) => void;

export const AUDIT_EVENT_HANDLER = 'AUDIT_EVENT_HANDLER';

@Injectable()
export class AuthAuditInterceptor implements NestInterceptor {
  private handler: AuditEventHandler = () => {};

  setHandler(handler: AuditEventHandler): void {
    this.handler = handler;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, ip } = request;

    return next.handle().pipe(
      tap(() => {
        const body = request.body as Record<string, unknown> | undefined;
        this.handler({
          type: `${method}:${request.route?.path ?? 'unknown'}`,
          userId: (request as Record<string, unknown>)['user'] as string | undefined,
          username: body?.username as string | undefined,
          ip: ip ?? 'unknown',
          timestamp: new Date().toISOString(),
          metadata: {
            path: request.route?.path,
            userAgent: request.headers['user-agent'],
          },
        });
      }),
    );
  }
}
