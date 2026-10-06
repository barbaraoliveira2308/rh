import { Injectable } from '@nestjs/common';
import {
  RateLimitStoreService,
  RateLimitStoreStatus,
} from './auth/rate-limit/rate-limit-store.service';

export interface HealthStatus {
  status: string;
  timestamp: string;
  // Só informa: o Redis em baixo não faz falhar o health check, senão o orquestrador podia
  // reiniciar backends que continuam a servir pedidos (decisão P107-02).
  rateLimitStore: RateLimitStoreStatus;
}

@Injectable()
export class AppService {
  constructor(private readonly rateLimitStore: RateLimitStoreService) {}

  health(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      rateLimitStore: this.rateLimitStore.status(),
    };
  }
}
