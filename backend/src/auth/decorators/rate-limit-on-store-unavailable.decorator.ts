import { SetMetadata } from '@nestjs/common';
import { RateLimitStorePolicy } from '../rate-limit/rate-limit-store';

export const RATE_LIMIT_ON_STORE_UNAVAILABLE_KEY = 'auth:rate-limit-on-store-unavailable';

// Política da rota protegida pelo RateLimitGuard quando o Redis falha; sem o decorator é 'memory'.
// 'reject' responde 503 e fica reservado para POST /auth/password/reset-request (R3, R-064).
export const RateLimitOnStoreUnavailable = (
  policy: RateLimitStorePolicy,
): ReturnType<typeof SetMetadata> => SetMetadata(RATE_LIMIT_ON_STORE_UNAVAILABLE_KEY, policy);
