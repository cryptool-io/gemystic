import { requireRole } from '@/lib/auth/guard';
import { allReviews, summarise } from '@/lib/reviews/store';
import { ReviewModeration } from '@/components/admin/ReviewModeration';

export default async function AdminReviews() {
  await requireRole('staff', '/admin/reviews');
  const reviews = await allReviews();
  const pending = reviews.filter((r) => r.status === 'pending').length;
  const summary = summarise(reviews.filter((r) => r.status === 'approved'));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Reviews</h1>
          <p className="mt-1 text-sm text-muted">
            {pending > 0 ? `${pending} awaiting moderation. ` : 'Nothing awaiting moderation. '}
            Approved average {summary.average.toFixed(1)} from {summary.count}.
          </p>
        </div>
      </div>

      <ReviewModeration
        reviews={reviews.map((r) => ({
          id: r.id,
          productSlug: r.productSlug,
          authorName: r.authorName,
          rating: r.rating,
          title: r.title,
          body: r.body,
          status: r.status,
          reply: r.reply,
          createdAt: r.createdAt,
        }))}
      />
    </div>
  );
}
