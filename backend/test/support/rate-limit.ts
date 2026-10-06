import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';

// Cada suite conta os seus pedidos num prefixo próprio, para não somar logins de outras suites na
// mesma janela de 60 s nem tocar nas chaves de um Redis partilhado com o ambiente de
// desenvolvimento. As chaves expiram sozinhas ao fim da janela; `deleteRateLimitKeys` só apaga
// as do prefixo indicado (nunca FLUSHALL/FLUSHDB).
export const testRateLimitKeyPrefix = (): string => `test:${randomUUID()}:ratelimit:`;

export async function deleteRateLimitKeys(prefix: string): Promise<void> {
  const client = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
  });
  try {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await client.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } finally {
    client.disconnect();
  }
}
