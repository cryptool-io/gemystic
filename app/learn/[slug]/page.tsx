import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { JsonLd } from '@/components/JsonLd';
import { getSpecies, queryProducts, stockedSpecies } from '@/lib/catalog';
import { SITE, faqJsonLd, breadcrumbJsonLd, money } from '@/lib/seo';

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return stockedSpecies().map((s) => ({ slug: s.key }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const s = getSpecies(slug);
  if (!s) return {};

  return {
    title: `${s.name} Buying Guide. Value, Treatment, Durability & Care`,
    description: `How to judge ${s.name.toLowerCase()}: what drives price, which treatments are standard, how it holds up in daily wear, and how to care for it. Written by working gem cutters in Pakistan.`,
    keywords: [
      `${s.name.toLowerCase()} buying guide`,
      `how to buy ${s.name.toLowerCase()}`,
      `${s.name.toLowerCase()} value`,
      `${s.name.toLowerCase()} treatment`,
      `${s.name.toLowerCase()} hardness`,
      `is ${s.name.toLowerCase()} durable`,
    ],
    alternates: { canonical: `/learn/${slug}` },
  };
}

/** Article schema tells answer engines this is editorial, not a product page. */
function articleJsonLd(name: string, slug: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${name} Buying Guide`,
    description,
    author: { '@type': 'Organization', name: SITE.legalName },
    publisher: { '@type': 'Organization', name: SITE.legalName },
    mainEntityOfPage: `${SITE.url}/learn/${slug}`,
    about: { '@type': 'Thing', name },
  };
}

export default async function LearnPage({ params }: { params: Params }) {
  const { slug } = await params;
  const s = getSpecies(slug);
  if (!s) notFound();

  const items = queryProducts({ species: slug, sort: 'price-asc' });
  const from = items.length ? Math.min(...items.map((p) => p.priceUsd)) : null;

  const sections = [
    { h: 'What drives the price', body: s.buyingNotes, extra: `In one line: ${s.priceDriver}.` },
    { h: 'Treatment', body: s.typicalTreatment, extra: 'Any seller unwilling to state treatment in writing is telling you something. Every listing on this site states it.' },
    { h: 'Durability and daily wear', body: s.care, extra: `Mohs ${s.hardness}, ${s.crystalSystem.toLowerCase()} crystal system, specific gravity ${s.specificGravity}.` },
    { h: 'Tradition and meaning', body: s.metaphysical, extra: `Birthstone for ${s.birthstone.join(' and ')}. Associated with ${s.zodiac.join(' and ')}. Anniversary stone: ${s.anniversary}.` },
  ];

  return (
    <>
      <JsonLd data={faqJsonLd(s.faq)} />
      <JsonLd data={articleJsonLd(s.name, slug, s.buyingNotes)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Learn', path: '/learn' },
          { name: s.name, path: `/learn/${slug}` },
        ])}
      />

      <article className="wrap">
        <header className="max-w-3xl">
          <div className="label">Buying guide</div>
          <h1 className="mt-2 font-display text-4xl">{s.name}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{s.buyingNotes}</p>
        </header>

        {/* Fast-facts table: the block answer engines lift verbatim */}
        <div className="card mt-10 max-w-3xl overflow-hidden">
          <div className="border-b border-line px-5 py-3">
            <h2 className="font-display text-base">{s.name} at a glance</h2>
          </div>
          <dl className="divide-y divide-line text-sm">
            {[
              ['Mineral family', s.family],
              ['Chemical formula', s.formula],
              ['Mohs hardness', s.hardness],
              ['Refractive index', s.refractiveIndex],
              ['Specific gravity', s.specificGravity],
              ['Crystal system', s.crystalSystem],
              ['Colours', s.colors.join(', ')],
              ['Birthstone month', s.birthstone.join(', ')],
              ['Anniversary', s.anniversary],
              ['Typical treatment', s.typicalTreatment],
              ['In stock now', from !== null ? `${items.length} stones from ${money(from)}` : 'None currently'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4 px-5 py-2.5">
                <dt className="w-44 shrink-0 text-muted">{k}</dt>
                <dd className="text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-12 max-w-3xl space-y-10">
          {sections.map((sec) => (
            <section key={sec.h}>
              <h2 className="font-display text-2xl text-brand">{sec.h}</h2>
              <p className="mt-3 leading-relaxed text-muted">{sec.body}</p>
              <p className="mt-3 leading-relaxed text-muted/80">{sec.extra}</p>
            </section>
          ))}
        </div>

        <section className="mt-14 max-w-3xl">
          <h2 className="mb-5 font-display text-2xl">Frequently asked</h2>
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
        </section>

        {items.length > 0 && (
          <section className="mt-16">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-display text-2xl">{s.name} in stock</h2>
              <Link href={`/collections/${slug}`} className="text-sm text-brand hover:text-brand-dark">
                All {items.length} →
              </Link>
            </div>
            <div className="grid-products">
              {items.slice(0, 8).map((p) => (
                <ProductCard key={p.slug} p={p} />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
