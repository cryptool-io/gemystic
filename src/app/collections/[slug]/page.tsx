import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { JsonLd } from '@/components/JsonLd';
import { queryProducts, getSpecies, stockedSpecies } from '@/lib/catalog';
import { itemListJsonLd, faqJsonLd, breadcrumbJsonLd, money } from '@/lib/seo';

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return stockedSpecies().map((s) => ({ slug: s.key }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const s = getSpecies(slug);
  if (!s) return {};

  const items = queryProducts({ species: slug });
  const prices = items.map((p) => p.priceUsd);
  const from = prices.length ? Math.min(...prices) : 0;

  return {
    title: `Natural ${s.name} for Sale, ${items.length} Loose Stones from $${from.toFixed(0)}`,
    description: `Buy natural ${s.name.toLowerCase()} direct from our Peshawar cutting workshop. ${items.length} unique stones in stock from $${from.toFixed(0)}. ${s.priceDriver}. Full treatment disclosure on every listing.`,
    keywords: [
      `natural ${s.name.toLowerCase()}`,
      `buy ${s.name.toLowerCase()} online`,
      `loose ${s.name.toLowerCase()}`,
      `${s.name.toLowerCase()} for sale`,
      `${s.birthstone[0]?.toLowerCase()} birthstone`,
    ],
    alternates: { canonical: `/collections/${slug}` },
  };
}

export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params;
  const s = getSpecies(slug);
  if (!s) notFound();

  const items = queryProducts({ species: slug, sort: 'price-desc' });
  if (items.length === 0) notFound();

  const prices = items.map((p) => p.priceUsd);
  const from = Math.min(...prices);
  const to = Math.max(...prices);

  const byForm = items.reduce<Record<string, number>>((acc, p) => {
    acc[p.form] = (acc[p.form] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <JsonLd data={itemListJsonLd(items, `Natural ${s.name}`, `/collections/${slug}`)} />
      <JsonLd data={faqJsonLd(s.faq)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Collections', path: '/collections' },
          { name: s.name, path: `/collections/${slug}` },
        ])}
      />

      <div className="wrap">
        <header className="max-w-3xl">
          <div className="label">Collection</div>
          <h1 className="mt-2 font-display text-4xl">Natural {s.name}</h1>
          <p className="mt-4 leading-relaxed text-muted">{s.buyingNotes}</p>

          <dl className="mt-7 grid grid-cols-2 gap-5 border-t border-line pt-6 sm:grid-cols-4">
            {[
              ['In stock', String(items.length)],
              ['From', money(from)],
              ['To', money(to)],
              ['Mohs hardness', s.hardness],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="label">{k}</dt>
                <dd className="mt-1 font-display text-xl text-brand">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(byForm).map(([form, n]) => (
              <Link
                key={form}
                href={`/shop?species=${slug}&form=${form}`}
                className="chip capitalize transition hover:border-brand/60 hover:text-brand-dark"
              >
                {form} · {n}
              </Link>
            ))}
          </div>
        </header>

        <div className="mt-10 grid-products">
          {items.map((p, i) => (
            <ProductCard key={p.slug} p={p} priority={i < 4} />
          ))}
        </div>

        {/* Reference block, the substance answer engines quote */}
        <section className="mt-16 grid gap-4 md:grid-cols-3">
          <div className="card p-6">
            <h2 className="font-display text-lg text-brand">Gemmology</h2>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ['Family', s.family],
                ['Formula', s.formula],
                ['Hardness', s.hardness],
                ['Refractive index', s.refractiveIndex],
                ['Specific gravity', s.specificGravity],
                ['Crystal system', s.crystalSystem],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-lg text-brand">Treatment &amp; care</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{s.typicalTreatment}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{s.care}</p>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-lg text-brand">Tradition</h2>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ['Birthstone', s.birthstone.join(', ')],
                ['Zodiac', s.zodiac.join(', ')],
                ['Anniversary', s.anniversary],
                ['Chakra', s.chakra],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-muted">{s.metaphysical}</p>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="mb-5 font-display text-2xl">Common questions</h2>
          <div className="space-y-3">
            {s.faq.map(([q, a]) => (
              <details key={q} className="card p-5" open>
                <summary className="cursor-pointer font-display text-base marker:content-['']">
                  {q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
          <Link
            href={`/learn/${slug}`}
            className="mt-5 inline-block text-sm text-brand hover:text-brand-dark"
          >
            Full {s.name.toLowerCase()} buying guide →
          </Link>
        </section>
      </div>
    </>
  );
}
