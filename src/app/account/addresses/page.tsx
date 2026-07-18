import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/guard';
import { AddressBook } from '@/components/account/AddressBook';

export const metadata: Metadata = {
  title: 'Your Addresses',
  robots: { index: false, follow: false },
};

export default async function AddressesPage() {
  await requireUser('/account/addresses');

  return (
    <div className="wrap max-w-3xl">
      <nav className="mb-4 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/account" className="hover:text-brand-dark">Account</Link>
        <span className="mx-2 text-subtle">/</span>
        <span>Addresses</span>
      </nav>
      <h1 className="font-display text-3xl">Delivery addresses</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Addresses used at checkout. Stored on this device for now; they move to your
        account with the database migration, so checkout can pre-fill them anywhere.
      </p>
      <div className="mt-6">
        <AddressBook />
      </div>
    </div>
  );
}
