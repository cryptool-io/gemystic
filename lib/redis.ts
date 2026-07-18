import 'server-only';
import type { Redis } from 'ioredis';

/**
 * Redis connection singleton (Trust-Agent lib/redis.ts pattern). Lazy: nothing
 * connects until a caller actually asks, so the app runs fine on machines
 * without Redis — required, because none is running here yet. BullMQ queues
 * (lib/queue.ts) are the only consumer today.
 *
 * REDIS_URL unset = queues disabled; callers must check hasRedis() first and
 * fall back to inline execution, never crash.
 */
const globalForRedis = globalThis as unknown as { redisGlobal?: Redis };

export function hasRedis(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export async function redis(): Promise<Redis> {
  if (globalForRedis.redisGlobal) return globalForRedis.redisGlobal;
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not set. Background queues are disabled without Redis.');
  }
  const { default: IORedis } = await import('ioredis');
  const client = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // BullMQ requirement
    lazyConnect: true,
  });
  await client.connect();
  if (process.env.NODE_ENV !== 'production') globalForRedis.redisGlobal = client;
  return client;
}
