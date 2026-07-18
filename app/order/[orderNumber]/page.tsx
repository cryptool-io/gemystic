import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrder, STATUS_FLOW } from '@/lib/orders/store';
import { money } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
};

const STATUS_COPY: Record<string, string> = {
  pending: 'Awaiting payment',
  paid: 'Paid, preparing your parcel',
  processing: 'Packing and export paperwork',
  shipped: 'On its way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { orderNumber } = await params;
  const { paid } = await searchParams;
  const order = await getOrder(orderNumber);
  if (!order) notFound();

  const addr = order.shippingAddress as Record<string, string>;
  const step = STATUS_FLOW.indexOf(order.status as (typeof STATUS_FLOW)[number]);
  const shipment = order.shipments[0];

  return (
    <div className="wrap max-w-3xl">
      {paid === '1' && (
        <div className="mb-6 rounded-lg border border-brand-ring bg-brand-tint p-4">
          <p className="font-display text-lg text-brand-deep">Thank you, your order is confirmed</p>
          <p className="mt-1 text-sm text-brand-deep/80">
            A confirmation email is on its way to {addr.email}. Your stone is now reserved for you
            and has been removed from the shop.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Order {order.orderNumber}</h1>
        <span className="chip-brand">{STATUS_COPY[order.status] ?? order.status}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        Placed {new Date(order.placedAt).toLocaleDateString('en-GB', { dateStyle: 'long' })}
      </p>

      {/* Progress */}
      {step >= 0 && (
        <ol className="mt-6 grid grid-cols-5 gap-1 text-center text-[11px]">
          {STATUS_FLOW.map((s, i) => (
            <li key={s}>
              <div
                className={`h-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-line'}`}
                aria-hidden="true"
              />
              <span className={`mt-1.5 block capitalize ${i <= step ? 'text-brand' : 'text-subtle'}`}>
                {s}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="card mt-6 p-6">
        <h2 className="font-display text-lg">Stones</h2>
        <ul className="mt-3 divide-y divide-line">
          {order.items.map((i) => {
            const specs = (i.specsSnapshot ?? {}) as Record<string, string | number | null>;
            return (
              <li key={i.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  {specs.slug ? (
                    <Link href={`/gem/${specs.slug}`} className="text-fg hover:text-brand">
                      {i.titleSnapshot}
                    </Link>
                  ) : (
                    <span className="text-fg">{i.titleSnapshot}</span>
                  )}
                  <span className="mt-0.5 block text-xs text-muted">
                    {[specs.caratWeight ? `${specs.caratWeight} ct` : null, specs.cut, specs.origin]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="shrink-0 text-fg">{money(Number(i.unitPrice))}</span>
              </li>
            );
          })}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{money(Number(order.subtotal))}</dd>
          </div>
          {Number(order.discountTotal) > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Discount</dt>
              <dd className="text-brand">−{money(Number(order.discountTotal))}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Shipping ({addr.shippingLabel})</dt>
            <dd>{Number(order.shippingTotal) === 0 ? 'Free' : money(Number(order.shippingTotal))}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2">
            <dt className="text-muted">Total</dt>
            <dd className="font-display text-xl text-brand">{money(Number(order.grandTotal))}</dd>
          </div>
        </dl>
      </div>

      {shipment && (
        <div className="card mt-4 p-6">
          <h2 className="font-display text-lg">Shipment</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="label">Carrier</dt>
              <dd>{shipment.carrier}</dd>
            </div>
            <div>
              <dt className="label">Tracking</dt>
              <dd className="tabular-nums">{shipment.trackingNumber ?? 'Pending'}</dd>
            </div>
            <div>
              <dt className="label">Ships from</dt>
              <dd>{shipment.shipsFrom === 'TH' ? 'Thailand' : 'Pakistan'}</dd>
            </div>
            {shipment.trackingUrl && (
              <div>
                <dt className="label">Track</dt>
                <dd>
                  <a
                    href={shipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:text-brand-dark"
                  >
                    Open carrier tracking
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/order/${order.orderNumber}/invoice`} className="btn-ghost">
          View invoice
        </Link>
        <Link href="/shop" className="btn-ghost">Keep browsing</Link>
      </div>
    </div>
  );
}
