import Image from 'next/image';
import Link from 'next/link';
import { justListed } from '@/lib/catalog';
import { effectivePrices } from '@/lib/campaigns/store';
import { Price } from '@/components/currency/Price';
import { Carousel } from '@/components/Carousel';

/**
 * "Just listed": the newest stones, as a carousel the visitor drives.
 *
 * It used to be an endless auto-scrolling film strip. That reads as decoration
 * rather than merchandise: nothing can be examined without chasing it, and a
 * stone that has slid past cannot be reached again. Arrows and snap scrolling
 * put the visitor in control while keeping touch swipe and keyboard access.
 */
export async function ShowcaseMarquee() {
  const stones = justListed(14);
  const pricing = await effectivePrices(stones);

  return (
    <section className="mt-16" aria-labelledby="just-listed">
      <div className="wrap mb-5 flex items-end justify-between">
        <div>
          <h2 id="just-listed" className="font-display text-2xl">Just listed</h2>
          <p className="mt-1 text-sm text-muted">
            The newest stones out of the workshop, every one a single piece.
          </p>
        </div>
        <Link href="/shop?sort=newest" className="text-sm text-brand hover:text-brand-dark">
          All new listings →
        </Link>
      </div>

      <div className="wrap">
        <Carousel ariaLabel="Just listed stones">
          {stones.map((p) => {
            const price = pricing.get(p.slug);
            return (
              <li key={p.slug} className="w-52 shrink-0 snap-start">
                <Link
                  href={`/gem/${p.slug}`}
                  className="card group block h-full overflow-hidden transition hover:border-brand-ring hover:shadow-lift"
                >
                  <span className="sheen relative block aspect-square overflow-hidden bg-surface-2">
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      sizes="208px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute bottom-2 left-2 rounded-sm bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-brand-deep backdrop-blur-sm">
                      Just listed
                    </span>
                  </span>
                  <span className="block p-3">
                    {/* Two title lines reserved so every card is the same height. */}
                    <span className="clamp-2 block min-h-[2.75em] text-xs font-medium leading-snug text-fg group-hover:text-brand">
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
        </Carousel>
      </div>
    </section>
  );
}
