import Link from 'next/link';
import { requireRole } from '@/lib/auth/guard';
import { prisma, hasDatabase } from '@/lib/prisma';
import { money } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/** Step 6: what is in transit, with the paperwork for each parcel. */
export default async function AdminShipping() {
  await requireRole('staff', '/admin/shipping');

  if (!hasDatabase()) {
    return (
      <div className="card p-8">
        <h1 className="font-display text-xl">Shipping</h1>
        <p className="mt-2 text-sm text-muted">DATABASE_URL is not set.</p>
      </div>
    );
  }

  const shipments = await prisma.shipment.findMany({
    include: { order: { select: { orderNumber: true, status: true, shippingAddress: true } }, documents: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const awaiting = await prisma.order.findMany({
    where: { status: { in: ['paid', 'processing'] } },
    select: { orderNumber: true, grandTotal: true, shippingAddress: true, status: true },
    orderBy: { placedAt: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Shipping</h1>
        <p className="mt-1 text-sm text-muted">
          Step 6: parcels waiting to go out, and everything already in transit with its export
          documents.
        </p>
      </div>

      <section>
        <h2 className="font-display text-lg">Ready to dispatch ({awaiting.length})</h2>
        {awaiting.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing is waiting on a parcel.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {awaiting.map((o) => {
              const addr = o.shippingAddress as Record<string, string>;
              return (
                <li key={o.orderNumber} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <span>
                    <Link href={`/admin/orders/${o.orderNumber}`} className="font-medium text-brand hover:text-brand-dark">
                      {o.orderNumber}
                    </Link>
                    <span className="mt-0.5 block text-xs text-muted">
                      {addr.fullName} · {addr.countryCode} · {addr.shippingLabel}
                    </span>
                  </span>
                  <span className="text-sm">{money(Number(o.grandTotal))}</span>
                  <Link href={`/admin/orders/${o.orderNumber}`} className="btn-ghost text-xs">
                    Dispatch →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg">In transit and delivered</h2>
        {shipments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No shipments yet.</p>
        ) : (
          <div className="card scroll-x mt-3">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="border-b border-line text-left text-muted">
                <tr>
                  <th className="p-3 font-normal">Order</th>
                  <th className="p-3 font-normal">Carrier</th>
                  <th className="p-3 font-normal">Tracking</th>
                  <th className="p-3 font-normal">From</th>
                  <th className="p-3 text-right font-normal">Declared</th>
                  <th className="p-3 font-normal">Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <td className="p-3">
                      <Link href={`/admin/orders/${s.order.orderNumber}`} className="text-brand hover:text-brand-dark">
                        {s.order.orderNumber}
                      </Link>
                    </td>
                    <td className="p-3 text-muted">{s.carrier ?? '–'}</td>
                    <td className="p-3 tabular-nums text-muted">{s.trackingNumber ?? '–'}</td>
                    <td className="p-3 text-muted">{s.shipsFrom === 'TH' ? 'Thailand' : 'Pakistan'}</td>
                    <td className="p-3 text-right">{money(Number(s.declaredValue ?? 0))}</td>
                    <td className="p-3">
                      <span className="flex flex-wrap gap-1">
                        {s.documents.map((d) => (
                          <Link
                            key={d.id}
                            href={`/admin/orders/${s.order.orderNumber}/documents/${d.docType}`}
                            className="chip text-[10px] hover:border-brand-ring"
                          >
                            {d.docType.replace(/_/g, ' ')}
                          </Link>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
