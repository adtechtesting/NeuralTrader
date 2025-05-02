import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient to prevent too many connections
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, use a global variable to maintain a singleton
  const globalForPrisma = global as unknown as { prisma?: PrismaClient };

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }

  prisma = globalForPrisma.prisma;
}

// Cache implementation
interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheItem<any>>();

export function setCached<T>(key: string, value: T, ttlMs: number = 60000): T {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
}

export function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.value as T;
}

export const dbCache = {
  get: getCached,
  set: setCached,
  clear: (key: string) => cache.delete(key),
  clearAll: () => cache.clear(),
};

export { prisma };