import { NextResponse } from 'next/server';
import { allProducts, GENERATED_AT } from '@/lib/catalog';
import { validateConfig, deploymentProfile, config } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness and readiness in one endpoint, used by the container healthcheck and
 * by whatever uptime monitor sits in front of the box.
 *
 * Readiness means the catalogue actually loaded, a process that is up but
 * serving an empty shop is not healthy, and a 200 here would hide that.
 */
export async function GET() {
  const started = Date.now();
  const issues = validateConfig();
  const errors = issues.filter((i) => i.level === 'error');

  let catalogueOk = false;
  let count = 0;
  try {
    count = allProducts().length;
    catalogueOk = count > 0;
  } catch {
    catalogueOk = false;
  }

  const healthy = catalogueOk && errors.length === 0;

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        catalogue: { ok: catalogueOk, products: count, generatedAt: GENERATED_AT },
        config: { ok: errors.length === 0, errors: errors.length, warnings: issues.length - errors.length },
        ai: { configured: config.ai.enabled },
      },
      deployment: deploymentProfile(),
      // Errors are safe to expose (they name env vars, never values); warnings
      // and details stay in the studio, which is noindex and internal.
      errors: errors.map((e) => `${e.area}: ${e.message}`),
      responseMs: Date.now() - started,
    },
    {
      status: healthy ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  );
}
