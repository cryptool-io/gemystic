import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getOrder } from '@/lib/orders/store';
import { PaymentPanel } from '@/components/PaymentPanel';
import { money } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Payment',
  robots: { index: false, follow: false },
};

export default async function PayPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrder(orderNumber);
  if (!order) notFound();
  // Already paid: nothing to do here, send them to the order itself.
  if (order.status !== 'pending') redirect(`/order/${orderNumber}`);

  const addr = order.shippingAddress as Record<string, string>;

  return (
    <div className="wrap">
      <h1 className="font-display text-2xl sm:text-3xl">Complete your order</h1>
      <p className="mt-1 text-sm text-muted">Order {order.orderNumber}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <PaymentPanel orderNumber={order.orderNumber} />

        <aside className="card h-fit p-5">
          <h2 className="font-display text-lg">Summary</h2>
          <ul className="mt-3 space-y-2">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-muted">{i.titleSnapshot}</span>
                <span className="text-fg">{money(Number(i.unitPrice))}</span>
              </li>
            ))}
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
              <dt className="text-muted">Shipping</dt>
              <dd>
                {Number(order.shippingTotal) === 0 ? 'Free' : money(Number(order.shippingTotal))}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2">
              <dt className="text-muted">Total</dt>
              <dd className="font-display text-xl text-brand">{money(Number(order.grandTotal))}</dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
            <div className="font-medium text-fg">Shipping to</div>
            {addr.fullName}
            <br />
            {[addr.line1, addr.line2, addr.city, addr.region, addr.postcode, addr.countryCode]
              .filter(Boolean)
              .join(', ')}
            <br />
            {addr.phone}
            <div className="mt-2">{addr.shippingLabel}</div>
          </div>

          <Link href="/cart" className="mt-4 block text-center text-xs text-muted underline hover:text-brand-dark">
            Back to cart
          </Link>
        </aside>
      </div>
    </div>
  );
}
