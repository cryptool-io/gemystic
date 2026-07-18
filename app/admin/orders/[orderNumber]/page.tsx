import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guard';
import { getOrder, STATUS_FLOW } from '@/lib/orders/store';
import { prisma } from '@/lib/prisma';
import { money } from '@/lib/seo';
import { OrderActions } from '@/components/admin/OrderActions';

export const dynamic = 'force-dynamic';

const DOC_LABEL: Record<string, string> = {
  commercial_invoice: 'Commercial invoice',
  packing_list: 'Packing list',
  certificate_of_origin: 'Certificate of origin',
};

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await requireRole('staff', '/admin/orders');
  const { orderNumber } = await params;
  const order = await getOrder(orderNumber);
  if (!order) notFound();

  const addr = order.shippingAddress as Record<string, string>;
  const step = STATUS_FLOW.indexOf(order.status as (typeof STATUS_FLOW)[number]);
  const shipment = order.shipments[0];
  const emails = await prisma.emailLog.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-muted hover:text-brand">
          ← All orders
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl">{order.orderNumber}</h1>
          <span className="chip-brand capitalize">{order.status}</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          Placed {new Date(order.placedAt).toLocaleString('en-GB')}
          {order.paidAt && ` · paid ${new Date(order.paidAt).toLocaleString('en-GB')}`}
        </p>
      </div>

      {step >= 0 && (
        <ol className="grid grid-cols-5 gap-1 text-center text-[11px]">
          {STATUS_FLOW.map((s, i) => (
            <li key={s}>
              <div className={`h-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-line'}`} aria-hidden="true" />
              <span className={`mt-1.5 block capitalize ${i <= step ? 'text-brand' : 'text-subtle'}`}>
                {s}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div className="card p-5">
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
                        i.titleSnapshot
                      )}
                      <span className="mt-0.5 block text-xs text-muted">
                        SKU {i.skuSnapshot} ·{' '}
                        {[specs.caratWeight ? `${specs.caratWeight} ct` : null, specs.origin, specs.treatment]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span className="shrink-0">{money(Number(i.unitPrice))}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
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
                <dt className="text-muted">Shipping</dt>
                <dd>{Number(order.shippingTotal) === 0 ? 'Free' : money(Number(order.shippingTotal))}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-medium">
                <dt>Total</dt>
                <dd className="font-display text-lg text-brand">{money(Number(order.grandTotal))}</dd>
              </div>
            </dl>
            <Link href={`/order/${order.orderNumber}/invoice`} className="btn-ghost mt-4 w-full">
              Open invoice
            </Link>
          </div>

          {shipment && (
            <div className="card p-5">
              <h2 className="font-display text-lg">Shipment and documents</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="label">Carrier</dt>
                  <dd>{shipment.carrier}</dd>
                </div>
                <div>
                  <dt className="label">Tracking</dt>
                  <dd className="tabular-nums">{shipment.trackingNumber ?? '–'}</dd>
                </div>
                <div>
                  <dt className="label">Ships from</dt>
                  <dd>{shipment.shipsFrom === 'TH' ? 'Thailand' : 'Pakistan'}</dd>
                </div>
                <div>
                  <dt className="label">Declared value</dt>
                  <dd>{money(Number(shipment.declaredValue ?? 0))}</dd>
                </div>
              </dl>
              <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
                {shipment.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3">
                    <span className="text-muted">{DOC_LABEL[d.docType] ?? d.docType}</span>
                    <Link
                      href={`/admin/orders/${order.orderNumber}/documents/${d.docType}`}
                      className="text-xs text-brand hover:text-brand-dark"
                    >
                      Open →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-5">
            <h2 className="font-display text-lg">Notifications sent</h2>
            {emails.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing sent yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line text-sm">
                {emails.map((e) => (
                  <li key={e.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-fg">{e.subject}</span>
                      <span className="block truncate text-xs text-muted">
                        {e.toAddress} · {e.template}
                      </span>
                    </span>
                    <span
                      className={`chip shrink-0 text-[10px] ${e.status === 'failed' ? 'border-accent/40 text-accent-dark' : ''}`}
                    >
                      {e.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <OrderActions
            orderNumber={order.orderNumber}
            status={order.status}
            hasShipment={Boolean(shipment)}
          />

          <div className="card p-5 text-sm">
            <h2 className="font-display text-lg">Customer</h2>
            <p className="mt-2 leading-relaxed">
              {addr.fullName}
              <br />
              <a href={`mailto:${addr.email}`} className="text-brand hover:text-brand-dark">
                {addr.email}
              </a>
              <br />
              {addr.phone}
            </p>
            <p className="mt-3 leading-relaxed text-muted">
              {[addr.line1, addr.line2, addr.city, addr.region, addr.postcode, addr.countryCode]
                .filter(Boolean)
                .join(', ')}
            </p>
            <p className="mt-3 text-xs text-muted">{addr.shippingLabel}</p>
            {order.customerNote && (
              <p className="mt-3 rounded-lg bg-surface-2 p-2.5 text-xs">
                <span className="font-medium">Note:</span> {order.customerNote}
              </p>
            )}
          </div>

          <div className="card p-5 text-sm">
            <h2 className="font-display text-lg">Payments</h2>
            {order.payments.length === 0 ? (
              <p className="mt-2 text-muted">No payment recorded.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-2">
                    <span className="capitalize text-muted">
                      {p.provider}
                      {p.provider === 'demo' && ' (no funds)'}
                    </span>
                    <span>{money(Number(p.amount))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
