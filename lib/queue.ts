import 'server-only';
import { hasRedis } from './redis';

/**
 * Background jobs (Trust-Agent lib/queue.ts pattern: BullMQ over Redis,
 * attempts 3, exponential backoff, completed jobs pruned).
 *
 * Degradation rule: without REDIS_URL the enqueue helper runs the work INLINE
 * instead, so features built on jobs (email retry, sheet import, Etsy sync)
 * behave identically on a box without Redis, just without retry/isolation.
 * That keeps parity with Trust-Agent's architecture while honouring this
 * project's local-first rule.
 */
export type JobName = 'email-send' | 'etsy-sync' | 'sheet-import';

interface EnqueueOptions {
  delayMs?: number;
}

const QUEUE_NAME = 'gemystic';

export async function enqueue<T extends Record<string, unknown>>(
  name: JobName,
  payload: T,
  inlineFallback: (payload: T) => Promise<void>,
  opts: EnqueueOptions = {},
): Promise<{ mode: 'queued' | 'inline' }> {
  if (!hasRedis()) {
    await inlineFallback(payload);
    return { mode: 'inline' };
  }

  const { Queue } = await import('bullmq');
  const { redis } = await import('./redis');
  const queue = new Queue(QUEUE_NAME, { connection: await redis() });
  await queue.add(name, payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
    ...(opts.delayMs ? { delay: opts.delayMs } : {}),
  });
  return { mode: 'queued' };
}

/**
 * Worker bootstrap, called from instrumentation.ts when Redis is configured.
 * Handlers are registered here as job types gain real implementations (M2+).
 */
export async function startWorker(): Promise<void> {
  if (!hasRedis()) return;

  const { Worker } = await import('bullmq');
  const { redis } = await import('./redis');

  new Worker(
    QUEUE_NAME,
    async (job) => {
      console.log(`[queue] processing ${job.name} (${job.id})`);
      // Job handlers land with their features; unknown names are a no-op so a
      // stale queue entry can never crash the worker.
    },
    { connection: await redis() },
  );
}
