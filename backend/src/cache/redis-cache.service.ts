import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly enabled: boolean;

  constructor() {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;

    this.client = new Redis({
      host,
      port,
      lazyConnect: true,
      retryStrategy: (times: number): number => Math.min(times * 50, 2000),
    });

    this.enabled = true;

    this.client.on('error', (error: Error): void => {
      // eslint-disable-next-line no-console
      console.error('Redis connection error:', error.message);
    });
  }

  async get(key: string): Promise<unknown> {
    if (!this.enabled) {
      return null;
    }

    try {
      const value = await this.client.get(key);

      if (value === null) {
        return null;
      }

      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // ignore cache write errors
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      await this.client.del(key);
    } catch {
      // ignore cache delete errors
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  }

  async connect(): Promise<void> {
    if (!this.enabled || this.client.status === 'ready' || this.client.status === 'connect') {
      return;
    }

    try {
      await this.client.connect();
    } catch {
      // ignore connection errors
    }
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
