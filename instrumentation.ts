/**
 * Next.js instrumentation hook (Trust-Agent pattern: in-process schedulers and
 * workers boot here, guarded so build phase and edge runtimes never start them).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  if (process.env.REDIS_URL) {
    const { startWorker } = await import('./lib/queue');
    await startWorker();
    console.log('[instrumentation] queue worker started');
  }
}
