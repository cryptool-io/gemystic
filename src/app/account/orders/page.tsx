import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/guard';

export const metadata: Metadata = {
  title: 'Your Orders',
  robots: { index: false, follow: false },
};

/**
 * Order history. Mirrors the Etsy account's "Purchases" tab. Orders will
 * populate once checkout lands on the Postgres order tables; until then this
 * states the truth instead of showing a fake empty table.
 */
export default async function OrdersPage() {
  await requireUser('/account/orders');

  return (
    <div className="wrap max-w-3xl">
      <Crumbs current="Orders" />
      <h1 className="font-display text-3xl">Your orders</h1>

      <div className="card mt-6 p-8 text-center">
        <p className="font-display text-lg">No orders yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          When checkout opens, every order will appear here with its payment status,
          shipping progress, tracking number and downloadable invoice — the same view the
          admin sees, from your side.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Bought from us on Etsy? Those orders live in your Etsy account — we cannot see
          or import them.
        </p>
        <Link href="/shop" className="btn-primary mt-6">Browse the stones</Link>
      </div>
    </div>
  );
}

function Crumbs({ current }: { current: string }) {
  return (
    <nav className="mb-4 text-xs text-muted" aria-label="Breadcrumb">
      <Link href="/account" className="hover:text-brand-dark">Account</Link>
      <span className="mx-2 text-subtle">/</span>
      <span>{current}</span>
    </nav>
  );
}
