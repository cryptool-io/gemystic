import Link from 'next/link';
import { requireRole } from '@/lib/auth/guard';
import { listOrders } from '@/lib/orders/store';
import { hasDatabase } from '@/lib/prisma';
import { money } from '@/lib/seo';
import { demoMode } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const STATUSES = ['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

const STATUS_CHIP: Record<string, string> = {
  pending: 'chip border-accent/40 text-accent-dark',
  paid: 'chip-brand',
  processing: 'chip-brand',
  shipped: 'chip-brand',
  delivered: 'chip',
  cancelled: 'chip',
  refunded: 'chip',
};

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireRole('staff', '/admin/orders');
  const { status, q } = await searchParams;

  if (!hasDatabase()) {
    return (
      <div className="card p-8">
        <h1 className="font-display text-xl">Orders</h1>
        <p className="mt-2 text-sm text-muted">
          DATABASE_URL is not set, so there is nowhere to read orders from.
        </p>
      </div>
    );
  }

  const orders = await listOrders({ status, q });
  const counts = {
    open: orders.filter((o) => ['paid', 'processing'].includes(o.status)).length,
    pending: orders.filter((o) => o.status === 'pending').length,
    revenue: orders
      .filter((o) => !['pending', 'cancelled'].includes(o.status))
      .reduce((a, o) => a + Number(o.grandTotal), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Orders</h1>
          <p className="mt-1 text-sm text-muted">
            Steps 4 and 5: confirm payment, then produce the paperwork and hand the parcel over.
          </p>
        </div>
        <form action="/admin/orders" className="w-full sm:w-64">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Order, email or stone…" className="field" />
        </form>
      </div>

      {demoMode() && (
        <p className="rounded-lg border border-accent/40 bg-accent-tint p-3 text-xs text-accent-dark">
          Demo payments are active: card payments complete without money moving. Add Stripe or
          PayPal keys to switch to live rails; nothing else in this flow changes.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Awaiting action" value={String(counts.open)} hint="paid or being prepared" />
        <Stat label="Awaiting payment" value={String(counts.pending)} hint="not paid yet" />
        <Stat label="Revenue (listed)" value={money(counts.revenue)} hint="excludes cancelled" />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders${s === 'all' ? '' : `?status=${s}`}`}
            className={`chip capitalize transition ${
              (status ?? 'all') === s ? 'chip-brand' : 'hover:border-brand-ring'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-display text-lg">No orders yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Orders placed through checkout appear here. To walk the flow before real customers
            arrive, run <code className="rounded-sm bg-surface-2 px-1.5 py-0.5">npm run seed:order</code>{' '}
            for a demo order.
          </p>
        </div>
      ) : (
        <div className="card scroll-x">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="p-3 font-normal">Order</th>
                <th className="p-3 font-normal">Placed</th>
                <th className="p-3 font-normal">Customer</th>
                <th className="p-3 font-normal">Stones</th>
                <th className="p-3 text-right font-normal">Total</th>
                <th className="p-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => {
                const addr = o.shippingAddress as Record<string, string>;
                return (
                  <tr key={o.id}>
                    <td className="p-3">
                      <Link
                        href={`/admin/orders/${o.orderNumber}`}
                        className="font-medium text-brand hover:text-brand-dark"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="p-3 text-muted">
                      {new Date(o.placedAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-3">
                      <span className="block truncate text-fg">{addr.fullName}</span>
                      <span className="block truncate text-xs text-muted">
                        {o.user?.email ?? o.guestEmail}
                      </span>
                    </td>
                    <td className="p-3 text-muted">
                      <span className="line-clamp-1 max-w-[18rem]">
                        {o.items.map((i) => i.titleSnapshot).join(', ')}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-brand">
                      {money(Number(o.grandTotal))}
                    </td>
                    <td className="p-3">
                      <span className={`${STATUS_CHIP[o.status] ?? 'chip'} capitalize text-[10px]`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
