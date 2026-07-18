import Image from 'next/image';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { JsonLd } from '@/components/JsonLd';
import { allProducts, stockedSpecies, featuredProducts } from '@/lib/catalog';
import { itemListJsonLd } from '@/lib/seo';
import { ShowcaseMarquee } from '@/components/ShowcaseMarquee';

export default function HomePage() {
  const products = allProducts();
  const featured = featuredProducts();
  const species = stockedSpecies();

  return (
    <>
      <JsonLd data={itemListJsonLd(featured, 'Featured gemstones', '/')} />

      {/* Hero */}
      <section className="wrap">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="chip mb-5">Peshawar, Pakistan · Since 2025</div>
            <h1 className="font-display text-4xl leading-tight md:text-5xl">
              Natural gemstones,{' '}
              <span className="text-brand">cut by the people who mined them</span>
            </h1>
            <p className="mt-5 max-w-lg leading-relaxed text-muted">
              Swat Valley emeralds, pigeon-blood rubies, tourmaline in every colour, mined, cut and set in our own workshops, photographed exactly as they ship.
              When a stone finds its owner, it is gone for good.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/shop" className="btn-primary">Browse the catalogue</Link>
              <Link href="/learn" className="btn-ghost">Learn about the stones</Link>
            </div>

            {/* Standing promises, not stock counters, counts change daily and
                read as noise; these are the things that stay true. */}
            <ul className="mt-10 grid grid-cols-1 gap-3 border-t border-line pt-6 text-sm sm:grid-cols-3">
              {[
                ['One of a kind', 'the photo is the stone you receive'],
                ['Treatment disclosed', 'on every listing, in plain words'],
                ['Insured worldwide', 'tracked from our workshop to you'],
              ].map(([h, sub]) => (
                <li key={h} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-0.5 text-brand">◆</span>
                  <span>
                    <span className="block font-medium text-fg">{h}</span>
                    <span className="text-muted">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Compact tiles: the hero is an invitation, not a comparison table,
              and full spec cards at this size dwarf the headline. */}
          <div className="grid grid-cols-2 gap-3 md:max-w-md md:justify-self-end">
            {featured.slice(0, 4).map((p, i) => (
              <ProductCard key={p.slug} p={p} priority={i < 2} compact />
            ))}
          </div>
        </div>
      </section>

      <ShowcaseMarquee />

      {/* Shop by species */}
      <section className="wrap mt-20 reveal">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl">Shop by stone</h2>
            <p className="mt-1 text-sm text-muted">
              Every species we cut, with a guide to each one.
            </p>
          </div>
          <Link href="/shop" className="text-sm text-brand hover:text-brand-dark">
            All {products.length} stones →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {species.map((s) => (
            <Link
              key={s.key}
              href={`/collections/${s.key}`}
              className="card group overflow-hidden transition hover:border-brand-ring hover:shadow-lift"
            >
              <div className="sheen relative aspect-[4/3] overflow-hidden bg-surface-2">
                {s.heroImage && (
                  <Image
                    src={s.heroImage}
                    alt={`${s.species.name}, representative stone`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="p-4">
                <div className="font-display text-lg text-fg group-hover:text-brand">
                  {s.species.name}
                </div>
                <div className="mt-1 text-xs text-muted">{s.count} in stock</div>
                <div className="mt-2 text-[11px] text-muted/70">
                  Mohs {s.species.hardness} · {s.species.birthstone[0]}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust / positioning */}
      <section className="wrap mt-20 reveal">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              h: 'Disclosed, always',
              p: 'Every listing states its treatment in plain language, heated, oiled, glass-filled or untouched. The trade norm is disclosure, and we hold to it even when it costs us a sale.',
            },
            {
              h: 'One stone, one listing',
              p: 'Nothing here is a catalogue photo of a representative example. The stone in the image is the stone that ships, which is why sold stones disappear for good.',
            },
            {
              h: 'Cut where it is mined',
              p: 'Swat and Kohistan rough is cut in our own Peshawar workshop. Skipping three intermediaries is the entire reason a 1ct Swat emerald here costs what it does.',
            },
          ].map((c) => (
            <div key={c.h} className="card p-6">
              <h3 className="font-display text-lg text-brand">{c.h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured grid */}
      <section className="wrap mt-20 reveal">
        <h2 className="mb-6 font-display text-2xl">Fine and rare</h2>
        <div className="grid-products">
          {featured.map((p) => (
            <ProductCard key={p.slug} p={p} />
          ))}
        </div>
      </section>

    </>
  );
}
