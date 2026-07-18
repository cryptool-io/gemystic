import Link from 'next/link';
import { requireRole } from '@/lib/auth/guard';
import { prisma, hasDatabase } from '@/lib/prisma';
import { money } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/**
 * Step 7: money in, from real order rows.
 *
 * Margin is deliberately absent: it needs the per-stone cost price the owner
 * has not entered yet (blocker B8). Showing a made-up margin would be worse
 * than showing none, so this reports only what the orders actually prove.
 */
export default async function AdminFinances() {
  await requireRole('admin', '/admin/finances');

  if (!hasDatabase()) {
    return (
      <div className="card p-8">
        <h1 className="font-display text-xl">Finances</h1>
        <p className="mt-2 text-sm text-muted">DATABASE_URL is not set.</p>
      </div>
    );
  }

  const orders = await prisma.order.findMany({
    where: { status: { notIn: ['pending', 'cancelled'] } },
    include: { items: true, payments: true },
    orderBy: { placedAt: 'desc' },
  });

  const revenue = orders.reduce((a, o) => a + Number(o.grandTotal), 0);
  const shipping = orders.reduce((a, o) => a + Number(o.shippingTotal), 0);
  const discounts = orders.reduce((a, o) => a + Number(o.discountTotal), 0);
  const stones = orders.reduce((a, o) => a + o.items.length, 0);
  const avg = orders.length > 0 ? revenue / orders.length : 0;

  const byMonth = new Map<string, number>();
  for (const o of orders) {
    const key = new Date(o.placedAt).toISOString().slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(o.grandTotal));
  }
  const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  const peak = Math.max(1, ...months.map(([, v]) => v));

  const byProvider = new Map<string, number>();
  for (const o of orders) {
    for (const p of o.payments) {
      byProvider.set(p.provider, (byProvider.get(p.provider) ?? 0) + Number(p.amount));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Finances</h1>
        <p className="mt-1 text-sm text-muted">
          Step 7: what the orders actually record. Margins arrive with per-stone cost prices.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={money(revenue)} hint={`${orders.length} orders`} />
        <Stat label="Average order" value={money(avg)} hint={`${stones} stones sold`} />
        <Stat label="Shipping collected" value={money(shipping)} hint="included in revenue" />
        <Stat label="Discounts given" value={money(discounts)} hint="promo codes and campaigns" />
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg">Revenue by month</h2>
        {months.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No paid orders yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {months.map(([m, v]) => (
              <li key={m} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-muted tabular-nums">{m}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-2 rounded-full bg-brand"
                    style={{ width: `${Math.max(2, (v / peak) * 100)}%` }}
                  />
                </span>
                <span className="w-24 shrink-0 text-right tabular-nums">{money(v)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-display text-lg">By payment method</h2>
          {byProvider.size === 0 ? (
            <p className="mt-2 text-sm text-muted">No payments recorded.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {[...byProvider.entries()].map(([provider, amount]) => (
                <li key={provider} className="flex justify-between">
                  <span className="capitalize text-muted">
                    {provider}
                    {provider === 'demo' && ' (no funds moved)'}
                  </span>
                  <span>{money(amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-display text-lg">What is missing</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              Per-stone cost prices, so margin can be reported instead of estimated. Add them at
              intake in <Link href="/admin/inventory" className="text-brand hover:text-brand-dark">Inventory</Link>.
            </li>
            <li>
              Channel comparison against Etsy fees lives in{' '}
              <Link href="/studio/finance" className="text-brand hover:text-brand-dark">Studio finance</Link>{' '}
              until orders exist on both channels.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className="mt-1 font-display text-2xl text-brand">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{hint}</div>
    </div>
  );
}
