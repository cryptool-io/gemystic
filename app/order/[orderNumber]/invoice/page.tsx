import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getOrder } from '@/lib/orders/store';
import { SITE, money } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Invoice',
  robots: { index: false, follow: false },
};

/**
 * Invoice, rendered as a print-ready page rather than a generated PDF.
 *
 * Browsers already produce excellent PDFs from print styles ("Save as PDF"),
 * so this avoids a PDF toolchain and stays selectable, searchable and
 * accessible. The commercial invoice used for customs (admin side) reuses the
 * same layout with the export fields added.
 */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrder(orderNumber);
  if (!order) notFound();

  const addr = order.shippingAddress as Record<string, string>;
  const paidAt = order.paidAt ? new Date(order.paidAt) : null;

  return (
    <div className="wrap max-w-3xl print:max-w-none">
      <div className="card p-8 print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <div className="font-display text-2xl text-brand-deep">{SITE.name}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Hand-cut natural gemstones
              <br />
              Peshawar, Pakistan
              <br />
              {SITE.email}
            </p>
          </div>
          <div className="text-right">
            <div className="label">Invoice</div>
            <div className="font-display text-xl">{order.orderNumber}</div>
            <p className="mt-1 text-xs text-muted">
              Issued{' '}
              {(paidAt ?? new Date(order.placedAt)).toLocaleDateString('en-GB', {
                dateStyle: 'long',
              })}
            </p>
            <p className="text-xs text-muted">
              Status: <span className="capitalize">{order.status}</span>
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="label mb-1">Billed to</div>
            <p className="text-sm leading-relaxed">
              {addr.fullName}
              <br />
              {[addr.line1, addr.line2].filter(Boolean).join(', ')}
              <br />
              {[addr.city, addr.region, addr.postcode].filter(Boolean).join(', ')}
              <br />
              {addr.countryCode}
              <br />
              {addr.email}
              <br />
              {addr.phone}
            </p>
          </div>
          <div>
            <div className="label mb-1">Shipping</div>
            <p className="text-sm leading-relaxed">
              {addr.shippingLabel}
              <br />
              Insured, tracked, signature on delivery
              <br />
              HS code 7103 (precious and semi-precious stones)
            </p>
          </div>
        </section>

        <table className="mt-8 w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="py-2 font-normal">Description</th>
              <th className="py-2 text-right font-normal">Qty</th>
              <th className="py-2 text-right font-normal">Unit</th>
              <th className="py-2 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.items.map((i) => {
              const specs = (i.specsSnapshot ?? {}) as Record<string, string | number | null>;
              return (
                <tr key={i.id}>
                  <td className="py-2.5">
                    {i.titleSnapshot}
                    <span className="mt-0.5 block text-xs text-muted">
                      {[
                        specs.caratWeight ? `${specs.caratWeight} ct` : null,
                        specs.gramWeight ? `${specs.gramWeight} g` : null,
                        specs.cut,
                        specs.colour,
                        specs.origin ? `origin ${specs.origin}` : null,
                        specs.treatment ? `treatment: ${specs.treatment}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{i.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums">{money(Number(i.unitPrice))}</td>
                  <td className="py-2.5 text-right tabular-nums">{money(Number(i.lineTotal))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
          <Row label="Subtotal" value={money(Number(order.subtotal))} />
          {Number(order.discountTotal) > 0 && (
            <Row label="Discount" value={`−${money(Number(order.discountTotal))}`} />
          )}
          <Row
            label="Shipping"
            value={Number(order.shippingTotal) === 0 ? 'Free' : money(Number(order.shippingTotal))}
          />
          <div className="flex justify-between border-t border-line pt-2 font-display text-lg">
            <span>Total {order.currency}</span>
            <span className="text-brand">{money(Number(order.grandTotal))}</span>
          </div>
        </div>

        <footer className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-muted">
          <p>
            All stones are natural unless stated otherwise, and every treatment is disclosed on the
            listing and above. Declared value equals the price paid; we do not under-declare.
          </p>
          <p className="mt-2">
            Returns within {SITE.policy.returnDays} days of delivery in original condition.
            {order.payments[0]
              ? ` Paid via ${order.payments[0].provider}${order.payments[0].provider === 'demo' ? ' (demo mode, no funds moved)' : ''}.`
              : ' Payment pending.'}
          </p>
        </footer>
      </div>

      <p className="mt-4 text-center text-xs text-muted print:hidden">
        Use your browser&rsquo;s print dialog to save this invoice as a PDF.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
