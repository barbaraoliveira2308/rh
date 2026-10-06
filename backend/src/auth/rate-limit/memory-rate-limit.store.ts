import { RateLimitStore } from './rate-limit-store';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// A contagem por processo que o RateLimitGuard fazia antes de R-061; agora só é usada quando o
// Redis está indisponível.
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();

  hit(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowSeconds * 1000 };
      this.store.set(key, entry);
    }

    entry.count++;
    return Promise.resolve(entry.count);
  }

  clear(): void {
    this.store.clear();
  }
}
