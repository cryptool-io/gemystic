import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/guard';
import { allReviews } from '@/lib/reviews/store';
import { Stars } from '@/components/reviews/Stars';

export const metadata: Metadata = {
  title: 'Your Reviews',
  robots: { index: false, follow: false },
};

export default async function AccountReviewsPage() {
  const user = await requireUser('/account/reviews');

  // Reviews are keyed by the email given at submission; match on the account email.
  const mine = (await allReviews()).filter(
    (r) => r.authorEmail.toLowerCase() === user.email.toLowerCase(),
  );

  return (
    <div className="wrap max-w-3xl">
      <nav className="mb-4 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/account" className="hover:text-brand-dark">Account</Link>
        <span className="mx-2 text-subtle">/</span>
        <span>Reviews</span>
      </nav>
      <h1 className="font-display text-3xl">Your reviews</h1>

      {mine.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="font-display text-lg">No reviews yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Reviews you write (with this email address) appear here, along with their
            moderation status and any reply from the shop.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {mine.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-sm font-medium text-fg">{r.title}</span>
                </div>
                <span
                  className={`chip capitalize ${
                    r.status === 'approved'
                      ? 'chip-brand'
                      : r.status === 'rejected'
                      ? 'border-accent/40 text-accent-dark'
                      : ''
                  }`}
                >
                  {r.status === 'pending' ? 'awaiting moderation' : r.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>
              {r.productSlug && (
                <Link href={`/gem/${r.productSlug}`} className="mt-2 inline-block text-xs text-brand hover:text-brand-dark">
                  View the stone →
                </Link>
              )}
              {r.reply && (
                <div className="mt-3 rounded-lg border-l-2 border-brand-ring bg-brand-tint/50 p-3">
                  <div className="text-xs font-medium text-brand-deep">Gemystic Gems replied</div>
                  <p className="mt-1 text-sm text-muted">{r.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
