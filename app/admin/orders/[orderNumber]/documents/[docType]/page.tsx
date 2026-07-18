import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/guard';
import { getOrder } from '@/lib/orders/store';
import { SITE, money } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/**
 * Export paperwork (owner step 5). Three documents off one order, print-ready:
 *
 *   commercial_invoice     what customs values the parcel by
 *   packing_list           what is physically inside, no prices
 *   certificate_of_origin  where the stones were mined and cut
 *
 * Declared value is always the price actually paid. Under-declaring is fraud,
 * voids the insurance and is the fastest way to lose a parcel of one-of-a-kind
 * stones, so the number is not editable here.
 */
const TITLES: Record<string, string> = {
  commercial_invoice: 'Commercial invoice',
  packing_list: 'Packing list',
  certificate_of_origin: 'Certificate of origin',
};

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ orderNumber: string; docType: string }>;
}) {
  await requireRole('staff', '/admin/orders');
  const { orderNumber, docType } = await params;
  const title = TITLES[docType];
  if (!title) notFound();

  const order = await getOrder(orderNumber);
  if (!order) notFound();

  const addr = order.shippingAddress as Record<string, string>;
  const shipment = order.shipments[0];
  const originCountry = shipment?.shipsFrom === 'TH' ? 'Thailand' : 'Pakistan';
  const isInvoice = docType === 'commercial_invoice';
  const isOrigin = docType === 'certificate_of_origin';

  const totalWeightG = order.items.reduce((a, i) => {
    const s = (i.specsSnapshot ?? {}) as Record<string, number | string | null>;
    const grams = Number(s.gramWeight ?? 0) || Number(s.caratWeight ?? 0) * 0.2;
    return a + grams;
  }, 0);

  return (
    <div className="max-w-3xl print:max-w-none">
      <div className="card p-8 print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <div className="font-display text-xl text-brand-deep">{SITE.name}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Exporter of natural gemstones
              <br />
              Peshawar, Pakistan
              <br />
              {SITE.email}
            </p>
          </div>
          <div className="text-right">
            <div className="label">{title}</div>
            <div className="font-display text-lg">{order.orderNumber}</div>
            <p className="mt-1 text-xs text-muted">
              {new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-6 sm:grid-cols-2 text-sm">
          <div>
            <div className="label mb-1">Consignee</div>
            <p className="leading-relaxed">
              {addr.fullName}
              <br />
              {[addr.line1, addr.line2].filter(Boolean).join(', ')}
              <br />
              {[addr.city, addr.region, addr.postcode].filter(Boolean).join(', ')}
              <br />
              {addr.countryCode}
              <br />
              {addr.phone}
            </p>
          </div>
          <div>
            <div className="label mb-1">Consignment</div>
            <p className="leading-relaxed">
              Country of origin: {originCountry}
              <br />
              HS code: 7103
              <br />
              Carrier: {shipment?.carrier ?? 'To be assigned'}
              <br />
              Tracking: {shipment?.trackingNumber ?? 'To be assigned'}
              <br />
              Gross weight: {totalWeightG.toFixed(2)} g
            </p>
          </div>
        </section>

        <table className="mt-8 w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="py-2 font-normal">Description of goods</th>
              <th className="py-2 text-right font-normal">Qty</th>
              <th className="py-2 text-right font-normal">Weight</th>
              {isInvoice && <th className="py-2 text-right font-normal">Value</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.items.map((i) => {
              const s = (i.specsSnapshot ?? {}) as Record<string, string | number | null>;
              return (
                <tr key={i.id}>
                  <td className="py-2.5">
                    {i.titleSnapshot}
                    <span className="mt-0.5 block text-xs text-muted">
                      Natural {String(s.species ?? 'gemstone')}
                      {s.cut ? `, ${s.cut} cut` : ''}
                      {s.treatment ? `, treatment: ${s.treatment}` : ''}
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{i.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {s.caratWeight ? `${s.caratWeight} ct` : s.gramWeight ? `${s.gramWeight} g` : '–'}
                  </td>
                  {isInvoice && (
                    <td className="py-2.5 text-right tabular-nums">{money(Number(i.lineTotal))}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {isInvoice && (
          <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Goods value</span>
              <span className="tabular-nums">{money(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Freight and insurance</span>
              <span className="tabular-nums">{money(Number(order.shippingTotal))}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-display text-lg">
              <span>Declared total</span>
              <span className="text-brand">{money(Number(order.grandTotal))}</span>
            </div>
          </div>
        )}

        {isOrigin && (
          <p className="mt-8 text-sm leading-relaxed">
            We certify that the goods described above are of {originCountry} origin, mined and cut
            in {originCountry === 'Pakistan' ? 'the Swat and Kohistan districts and finished in our Peshawar workshop' : 'partner workshops in Thailand'}, and
            that the particulars given are true and correct.
          </p>
        )}

        <footer className="mt-10 grid gap-8 border-t border-line pt-6 text-xs text-muted sm:grid-cols-2">
          <div>
            <div className="h-10 border-b border-line" />
            <div className="mt-1">Authorised signature</div>
          </div>
          <div>
            <div className="h-10 border-b border-line" />
            <div className="mt-1">Company stamp</div>
          </div>
        </footer>
      </div>

      <p className="mt-4 text-center text-xs text-muted print:hidden">
        Print this page or save it as a PDF to attach to the parcel.
      </p>
    </div>
  );
}
