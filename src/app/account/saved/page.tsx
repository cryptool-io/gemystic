import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/guard';
import { SavedStones } from '@/components/account/SavedStones';

export const metadata: Metadata = {
  title: 'Saved Stones',
  robots: { index: false, follow: false },
};

/** Mirrors Etsy's "Favourites". Client-side store until the DB lands. */
export default async function SavedPage() {
  await requireUser('/account/saved');

  return (
    <div className="wrap max-w-3xl">
      <nav className="mb-4 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/account" className="hover:text-brand-dark">Account</Link>
        <span className="mx-2 text-subtle">/</span>
        <span>Saved stones</span>
      </nav>
      <h1 className="font-display text-3xl">Saved stones</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Stones you have added to your bag or saved for later. Every piece is one of a
        kind — a saved stone can still be bought by someone else, so do not sit on the
        one you want.
      </p>
      <div className="mt-6">
        <SavedStones />
      </div>
    </div>
  );
}
