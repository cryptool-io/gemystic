import { Stars } from './Stars';
import type { Review, RatingSummary } from '@/lib/reviews/store';

export function RatingHeadline({ summary }: { summary: RatingSummary }) {
  if (summary.count === 0) {
    return (
      <p className="text-sm text-muted">
        No reviews yet. If you have bought from us, you can be the first.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl text-brand">{summary.average.toFixed(1)}</span>
        <span className="text-sm text-muted">out of 5</span>
      </div>
      <div>
        <Stars value={summary.average} size="md" />
        <p className="mt-0.5 text-xs text-muted">
          {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
        </p>
      </div>
    </div>
  );
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  return (
    <ul className="divide-y divide-line">
      {reviews.map((r) => (
        <li key={r.id} className="py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-fg">{r.authorName}</span>
              <span className="chip">Verified</span>
            </div>
            <time className="text-xs text-muted" dateTime={r.createdAt}>
              {new Date(r.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </time>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <Stars value={r.rating} />
            <span className="sr-only">{r.rating} out of 5 stars</span>
            {r.title && <span className="text-sm font-medium text-fg">{r.title}</span>}
          </div>

          <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>

          {r.reply && (
            <div className="mt-3 rounded-lg border-l-2 border-brand-ring bg-brand-tint/50 p-3">
              <div className="text-xs font-medium text-brand-deep">Gemystic Gems replied</div>
              <p className="mt-1 text-sm text-muted">{r.reply}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
