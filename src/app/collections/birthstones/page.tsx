import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { JsonLd } from '@/components/JsonLd';
import { MONTHS, productsForBirthstone, allSpecies } from '@/lib/catalog';
import { faqJsonLd, money } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Birthstones by Month — Natural Birthstone Gems for Every Month',
  description:
    'The full birthstone calendar with natural stones in stock for each month. January garnet through December topaz — genuine gems, hand-cut in Pakistan, with treatment disclosed.',
  keywords: [
    'birthstones by month', 'birthstone chart', 'january birthstone garnet',
    'may birthstone emerald', 'july birthstone ruby', 'september birthstone sapphire',
    'natural birthstone jewellery',
  ],
  alternates: { canonical: '/collections/birthstones' },
};

const FAQ: [string, string][] = [
  [
    'What are the birthstones for each month?',
    'January garnet, February amethyst, March aquamarine, April diamond (we offer clear quartz as the traditional alternative), May emerald, June pearl and moonstone, July ruby, August peridot and spinel, September sapphire, October tourmaline and opal, November citrine and topaz, December topaz, turquoise and tanzanite.',
  ],
  [
    'Why do some months have more than one birthstone?',
    'The modern list was standardised by the American National Retail Jewelers Association in 1912 and revised several times since, while older traditional and Ayurvedic lists never went away. Months gained alternates as new stones reached commercial supply — spinel was added to August in 2016, for example.',
  ],
  [
    'Does a birthstone have to be set in jewellery?',
    'No. Loose stones are commonly bought as keepsakes, for later custom setting, or simply as collector pieces. Buying the stone first and setting it afterwards usually gives a better stone for the same total budget.',
  ],
];

export default function BirthstonesPage() {
  const months = MONTHS.map((month) => {
    const products = productsForBirthstone(month);
    const species = allSpecies()
      .filter(([, s]) => s.birthstone.includes(month))
      .map(([key, s]) => ({ key, ...s }));
    return { month, products, species };
  });

  return (
    <>
      <JsonLd data={faqJsonLd(FAQ)} />

      <div className="wrap">
        <header className="max-w-3xl">
          <div className="label">Collection</div>
          <h1 className="mt-2 font-display text-4xl">Birthstones by month</h1>
          <p className="mt-4 leading-relaxed text-muted">
            The complete calendar, with what we actually have in stock for each month.
            Where a month has several traditional stones we list every one we cut — and
            where we hold nothing, we say so rather than substituting something unrelated.
          </p>
        </header>

        <nav className="mt-8 flex flex-wrap gap-2">
          {MONTHS.map((m) => (
            <a key={m} href={`#${m.toLowerCase()}`} className="chip hover:border-brand/60 hover:text-brand-dark">
              {m}
            </a>
          ))}
        </nav>

        <div className="mt-12 space-y-16">
          {months.map(({ month, products, species }) => (
            <section key={month} id={month.toLowerCase()} className="scroll-mt-24">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
                <div>
                  <h2 className="font-display text-2xl text-brand">{month}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {species.length > 0
                      ? species.map((s) => s.name).join(' · ')
                      : 'No stone from this month currently in stock'}
                  </p>
                </div>
                {products.length > 0 && (
                  <span className="text-sm text-muted">
                    {products.length} in stock from{' '}
                    <span className="text-brand">
                      {money(Math.min(...products.map((p) => p.priceUsd)))}
                    </span>
                  </span>
                )}
              </div>

              {species.length > 0 && (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
                  {species[0].metaphysical}{' '}
                  <span className="text-muted/70">
                    Mohs {species[0].hardness} — {species[0].care.split('.')[0]}.
                  </span>
                </p>
              )}

              {products.length > 0 ? (
                <div className="mt-6 grid-products">
                  {products.slice(0, 4).map((p) => (
                    <ProductCard key={p.slug} p={p} />
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-muted/70">
                  We do not currently cut a {month} stone.{' '}
                  <Link href="/shop" className="text-brand hover:text-brand-dark">
                    Browse everything in stock
                  </Link>{' '}
                  or ask the assistant for the closest alternative.
                </p>
              )}

              {products.length > 4 && species[0] && (
                <Link
                  href={`/collections/${species[0].key}`}
                  className="mt-4 inline-block text-sm text-brand hover:text-brand-dark"
                >
                  See all {products.length} {month} stones →
                </Link>
              )}
            </section>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="mb-5 font-display text-2xl">Birthstone questions</h2>
          <div className="space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="card p-5" open>
                <summary className="cursor-pointer font-display text-base marker:content-['']">
                  {q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
