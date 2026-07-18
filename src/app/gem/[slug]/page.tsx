import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { JsonLd } from '@/components/JsonLd';
import { AddToBag } from '@/components/AddToBag';
import { allProducts, getProduct, getSpecies, relatedProducts } from '@/lib/catalog';
import { approvedForProduct, summarise } from '@/lib/reviews/store';
import { RatingHeadline, ReviewList } from '@/components/reviews/ReviewList';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { effectivePrice } from '@/lib/campaigns/store';
import { Price, PricePerCarat } from '@/components/currency/Price';
import { ProductAnalytics } from '@/components/Analytics';
import { Stars } from '@/components/reviews/Stars';
import {
  SITE, money, productJsonLd, faqJsonLd, breadcrumbJsonLd, stripMarkdown,
} from '@/lib/seo';

type Params = Promise<{ slug: string }>;

/** All pages prerendered at build; revalidated hourly so newly-approved reviews
 *  appear without a full redeploy (ISR). */
export const revalidate = 3600;

export function generateStaticParams() {
  return allProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};

  return {
    title: p.metaTitle,
    description: p.metaDescription,
    keywords: p.keywords,
    alternates: { canonical: `/gem/${p.slug}` },
    openGraph: {
      type: 'website',
      title: p.title,
      description: p.metaDescription,
      url: `${SITE.url}/gem/${p.slug}`,
      images: [{ url: p.imageLarge, alt: p.title }],
    },
  };
}

export default async function GemPage({ params }: { params: Params }) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();

  const s = getSpecies(p.species);
  const related = relatedProducts(p);
  const reviews = await approvedForProduct(p.slug);
  const pricing = await effectivePrice(p);
  const ratingSummary = summarise(reviews);
  const weight = p.caratWeight ? `${p.caratWeight} ct` : p.gramWeight ? `${p.gramWeight} g` : ',';

  const specs: [string, string | null][] = [
    ['Species', s?.name ?? p.species],
    ['Variety', p.variety],
    ['Weight', weight],
    ['Cut', p.cut],
    ['Colour', p.color],
    ['Dimensions', p.dimensions],
    ['Origin', p.origin],
    ['Treatment', p.treatment],
    ['Mohs hardness', s?.hardness ?? null],
    ['Refractive index', s?.refractiveIndex ?? null],
    ['Specific gravity', s?.specificGravity ?? null],
    ['Crystal system', s?.crystalSystem ?? null],
    ['Chemical formula', s?.formula ?? null],
  ];

  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: s?.name ?? p.species, path: `/collections/${p.species}` },
    { name: p.title, path: `/gem/${p.slug}` },
  ];

  return (
    <>
      <JsonLd data={productJsonLd(p, s)} />
      <JsonLd data={breadcrumbJsonLd(trail)} />
      {s && <JsonLd data={faqJsonLd(s.faq)} />}

      <div className="wrap">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
          {trail.map((t, i) => (
            <span key={t.path}>
              {i > 0 && <span className="mx-2 text-muted/40">/</span>}
              {i === trail.length - 1 ? (
                <span className="text-muted/70">{t.name}</span>
              ) : (
                <Link href={t.path} className="hover:text-brand-dark">{t.name}</Link>
              )}
            </span>
          ))}
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Image */}
          <div>
            <div className="card relative aspect-square overflow-hidden">
              <Image
                src={p.imageLarge}
                alt={`${p.title}, natural ${p.color.toLowerCase()} ${s?.name.toLowerCase() ?? ''} from ${p.origin}, ${weight}`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
            <p className="mt-3 text-xs text-muted/60">
              Photographed under daylight-balanced light without retouching. Colour may shift
              slightly under warm indoor lighting.
            </p>
          </div>

          {/* Buy box */}
          <div>
            <div className="label">{p.formLabel}</div>
            <h1 className="mt-2 font-display text-3xl leading-tight">{p.title}</h1>

            <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <Price
                usd={pricing.priceUsd}
                original={pricing.originalUsd}
                className="font-display text-3xl text-brand"
              />
              {p.caratWeight && <PricePerCarat usd={pricing.priceUsd} carat={p.caratWeight} />}
              {pricing.campaign && (
                <span className="chip-brand">
                  {pricing.campaign.name} · −{pricing.campaign.percentOff}%
                </span>
              )}
            </div>

            <ProductAnalytics
              slug={p.slug}
              title={p.title}
              priceUsd={pricing.priceUsd}
              species={p.species}
              category={p.category}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip">{p.color}</span>
              {p.cut && <span className="chip">{p.cut}</span>}
              <span className="chip">{weight}</span>
              {p.certified && (
                <span className="chip border-brand/60 text-brand-dark">Lab certified</span>
              )}
              <span className="chip border-brand-ring/50 text-brand">One of a kind</span>
            </div>

            <AddToBag product={{ slug: p.slug, title: p.title, price: pricing.priceUsd }} />

            {/* The guarantee sits beside the buy action, not buried in a policy
                page: the single highest-leverage trust move for an unknown
                seller of high-value items (docs/CONVERSION-REVIEW.md). */}
            <p className="mt-3 text-xs leading-relaxed text-muted">
              <span className="font-medium text-fg">Our guarantee:</span> 30-day returns,
              full refund, insured and tracked from our workshop to your door. Payment is
              covered by PayPal Buyer Protection.
            </p>

            <div className="prose-gem mt-8">
              {stripMarkdown(p.description)
                .split('. ')
                .reduce<string[]>((acc, sentence, i) => {
                  // Re-flow the generated copy into readable paragraphs.
                  const idx = Math.floor(i / 3);
                  acc[idx] = (acc[idx] ? `${acc[idx]} ` : '') + sentence + (sentence.endsWith('.') ? '' : '.');
                  return acc;
                }, [])
                .map((para, i) => <p key={i}>{para}</p>)}
            </div>

            {/* Specification table, heavily weighted by answer engines */}
            <div className="card mt-8 overflow-hidden">
              <div className="border-b border-line px-5 py-3">
                <h2 className="font-display text-base">Specification</h2>
              </div>
              <dl className="divide-y divide-line text-sm">
                {specs.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex gap-4 px-5 py-2.5">
                    <dt className="w-40 shrink-0 text-muted">{k}</dt>
                    <dd className="text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-6 space-y-3 text-sm text-muted">
              <p>
                <strong className="text-fg">Ships from {p.shipsFrom === 'TH' ? 'Thailand' : 'Peshawar, Pakistan'}.</strong>{' '}
                Dispatched within 1–3 working days, tracked and insured. Free worldwide
                over $500.
              </p>
              <p>
                <strong className="text-fg">Returns.</strong> 30 days, unworn and in original
                packaging. Custom-set jewellery is excluded.
              </p>
            </div>
          </div>
        </div>

        {/* Buying guidance, genuine expertise, the thing that earns links */}
        {s && (
          <section className="mt-16 grid gap-6 md:grid-cols-2">
            <div className="card p-6">
              <h2 className="font-display text-xl text-brand">
                What to look for in {s.name.toLowerCase()}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{s.buyingNotes}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                <strong className="text-fg">Value is driven by:</strong> {s.priceDriver}.
              </p>
            </div>

            <div className="card p-6">
              <h2 className="font-display text-xl text-brand">Living with this stone</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{s.care}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="label">Birthstone</dt>
                  <dd className="mt-0.5 text-fg">{s.birthstone.join(', ')}</dd>
                </div>
                <div>
                  <dt className="label">Anniversary</dt>
                  <dd className="mt-0.5 text-fg">{s.anniversary}</dd>
                </div>
                <div>
                  <dt className="label">Chakra</dt>
                  <dd className="mt-0.5 text-fg">{s.chakra}</dd>
                </div>
                <div>
                  <dt className="label">Zodiac</dt>
                  <dd className="mt-0.5 text-fg">{s.zodiac.join(', ')}</dd>
                </div>
              </dl>
            </div>
          </section>
        )}

        {/* FAQ, emits FAQPage schema above */}
        {s && (
          <section className="mt-16">
            <h2 className="mb-6 font-display text-2xl">
              {s.name} questions, answered
            </h2>
            <div className="space-y-3">
              {s.faq.map(([q, a]) => (
                <details key={q} className="card group p-5" open>
                  <summary className="cursor-pointer font-display text-base text-fg marker:content-['']">
                    {q}
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
            <Link
              href={`/learn/${p.species}`}
              className="mt-5 inline-block text-sm text-brand hover:text-brand-dark"
            >
              Read the full {s.name.toLowerCase()} guide →
            </Link>
          </section>
        )}

        {/* Reviews */}
        <section className="mt-16 max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-2xl">Reviews</h2>
            {ratingSummary.count > 0 && (
              <div className="flex items-center gap-2">
                <Stars value={ratingSummary.average} size="md" />
                <span className="text-sm text-muted">
                  {ratingSummary.average.toFixed(1)} · {ratingSummary.count}
                </span>
              </div>
            )}
          </div>

          <div className="mt-5">
            {reviews.length > 0 ? (
              <ReviewList reviews={reviews} />
            ) : (
              <p className="text-sm text-muted">
                No reviews on this stone yet. Bought it? Be the first to review, every stone
                here is unique, so your review is the only one it will ever have.
              </p>
            )}
          </div>

          <div className="mt-6">
            <ReviewForm productSlug={p.slug} />
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 font-display text-2xl">You might also consider</h2>
            <div className="grid-products">
              {related.map((r) => (
                <ProductCard key={r.slug} p={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
