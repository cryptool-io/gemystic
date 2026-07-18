import type { Metadata } from 'next';
import { approvedShopReviews, summarise } from '@/lib/reviews/store';
import { RatingHeadline, ReviewList } from '@/components/reviews/ReviewList';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { JsonLd } from '@/components/JsonLd';
import { SITE } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Customer Reviews',
  description:
    'What customers say about buying natural gemstones from Gemystic Gems, quality, communication, packaging and delivery, in their own words.',
  alternates: { canonical: '/reviews' },
};

export default async function ReviewsPage() {
  const reviews = await approvedShopReviews();
  const summary = summarise(reviews);

  const ratingJsonLd =
    summary.count > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: SITE.legalName,
          url: SITE.url,
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: summary.average.toFixed(1),
            reviewCount: String(summary.count),
            bestRating: '5',
          },
        }
      : null;

  return (
    <div className="wrap max-w-3xl">
      {ratingJsonLd && <JsonLd data={ratingJsonLd} />}

      <header>
        <div className="label">Reviews</div>
        <h1 className="mt-2 font-display text-4xl">What customers say</h1>
        <p className="mt-3 leading-relaxed text-muted">
          Every review is from a verified buyer and checked before it appears. We do not
          edit or cherry-pick. Our first reviews came through Etsy, where they remain
          publicly verifiable on{' '}
          <a
            href="https://www.etsy.com/shop/GemysticGemsStudio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand underline hover:text-brand-dark"
          >
            our Etsy shop profile
          </a>
          .
        </p>
      </header>

      <div className="card mt-8 p-6">
        <RatingHeadline summary={summary} />

        {summary.count > 0 && (
          <div className="mt-5 space-y-1.5 border-t border-line pt-5">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const n = summary.distribution[star];
              const pct = summary.count ? (n / summary.count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="w-10 text-muted">{star} star</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-8 text-right text-muted">{n}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8">
        <ReviewList reviews={reviews} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-xl">Bought from us?</h2>
        <ReviewForm />
      </div>
    </div>
  );
}
