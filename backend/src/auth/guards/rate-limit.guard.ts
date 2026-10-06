import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimitStoreService } from '../rate-limit/rate-limit-store.service';
import { RateLimitStorePolicy } from '../rate-limit/rate-limit-store';
import { RATE_LIMIT_ON_STORE_UNAVAILABLE_KEY } from '../decorators/rate-limit-on-store-unavailable.decorator';

// Um único contador por IP, partilhado por todas as rotas que usam este guard (hoje `login` e
// `login/mfa`), como antes de R-061 (decisão P107-07).
const RATE_LIMIT_BUCKET = 'login';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly maxRequests = 10;
  private readonly windowSeconds = 60;

  constructor(
    private readonly store: RateLimitStoreService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? 'unknown';
    const onStoreUnavailable =
      this.reflector.getAllAndOverride<RateLimitStorePolicy | undefined>(
        RATE_LIMIT_ON_STORE_UNAVAILABLE_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? 'memory';

    const count = await this.store.hit(
      `${RATE_LIMIT_BUCKET}:${ip}`,
      this.windowSeconds,
      onStoreUnavailable,
    );

    if (count > this.maxRequests) {
      throw new HttpException(
        'Demasiados pedidos. Tente novamente mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
