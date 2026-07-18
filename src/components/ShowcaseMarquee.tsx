import Image from 'next/image';
import Link from 'next/link';
import { justListed } from '@/lib/catalog';
import { effectivePrices } from '@/lib/campaigns/store';
import { Price } from '@/components/currency/Price';

/**
 * "Just listed" showcase — a slow, continuous film-strip of the newest stones.
 *
 * The reference is the recent-sales carousels on established dealer sites: what
 * signals professionalism there is motion that is calm and continuous, not a
 * clicky slider. Pure CSS animation (no carousel library), pauses on hover so a
 * stone can be examined, and prefers-reduced-motion collapses it to a static
 * scrollable row. The track is rendered twice so the loop is seamless.
 */
export async function ShowcaseMarquee() {
  const stones = justListed(12);
  const pricing = await effectivePrices(stones);

  const CardStrip = ({ ariaHidden = false }: { ariaHidden?: boolean }) => (
    <ul className="flex shrink-0 gap-4 pr-4" aria-hidden={ariaHidden || undefined}>
      {stones.map((p) => {
        const price = pricing.get(p.slug);
        return (
          <li key={p.slug} className="w-52 shrink-0">
            <Link
              href={`/gem/${p.slug}`}
              className="card group block overflow-hidden transition hover:border-brand-ring hover:shadow-lift"
              tabIndex={ariaHidden ? -1 : undefined}
            >
              <span className="sheen relative block aspect-square overflow-hidden bg-surface-2">
                <Image
                  src={p.image}
                  alt={ariaHidden ? '' : p.title}
                  fill
                  sizes="208px"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute bottom-2 left-2 rounded bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-brand-deep backdrop-blur">
                  Just listed
                </span>
              </span>
              <span className="block p-3">
                <span className="clamp-2 block text-xs font-medium leading-snug text-fg group-hover:text-brand">
                  {p.title}
                </span>
                <Price
                  usd={price?.priceUsd ?? p.priceUsd}
                  original={price?.originalUsd ?? null}
                  className="mt-1.5 block font-display text-sm text-brand"
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className="mt-16 overflow-hidden" aria-label="Just listed">
      <div className="wrap mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl">Just listed</h2>
          <p className="mt-1 text-sm text-muted">
            The newest stones out of the workshop — every one a single piece.
          </p>
        </div>
        <Link href="/shop?sort=newest" className="text-sm text-brand hover:text-brand-dark">
          All new listings →
        </Link>
      </div>

      <div className="marquee group/marquee">
        <div className="marquee-track">
          <CardStrip />
          <CardStrip ariaHidden />
        </div>
      </div>
    </section>
  );
}
