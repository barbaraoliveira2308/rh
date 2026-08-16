import { Inject, Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export interface AuditEvent {
  type: string;
  handlerName: string;
  success: boolean;
  userId?: string;
  email?: string;
  ip: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type AuditEventHandler = (event: AuditEvent) => void;

export const AUDIT_EVENT_HANDLER = 'AUDIT_EVENT_HANDLER';

@Injectable()
export class AuthAuditInterceptor implements NestInterceptor {
  constructor(@Inject(AUDIT_EVENT_HANDLER) private readonly handler: AuditEventHandler) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, ip } = request;
    const handlerName = context.getHandler().name;
    const route = request.route as { path?: string } | undefined;
    const body = request.body as Record<string, unknown> | undefined;
    const requestUser = (request as unknown as { user?: JwtPayload }).user;

    const baseEvent = {
      type: `${method}:${route?.path ?? 'unknown'}`,
      handlerName,
      ip: ip ?? 'unknown',
      timestamp: new Date().toISOString(),
      metadata: {
        path: route?.path,
        userAgent: request.headers['user-agent'],
      },
    };

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const loginUserId = (responseBody as { user?: { id?: string } } | undefined)?.user?.id;

          this.handler({
            ...baseEvent,
            success: true,
            userId: requestUser?.sub ?? loginUserId,
            email: body?.email as string | undefined,
          });
        },
        error: () => {
          if (handlerName !== 'login') {
            return;
          }

          this.handler({
            ...baseEvent,
            success: false,
            email: body?.email as string | undefined,
          });
        },
      }),
    );
  }
}
