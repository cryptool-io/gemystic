import { allProducts, stockedSpecies, priceStats, GENERATED_AT } from '@/lib/catalog';
import { SITE } from '@/lib/seo';

export const dynamic = 'force-static';

/**
 * llms.txt, the emerging convention for telling answer engines what a site is
 * and where its machine-readable data lives. Cheap to serve, and the difference
 * between being summarised accurately and being summarised from guesswork.
 */
export function GET() {
  const products = allProducts();
  const species = stockedSpecies();
  const stats = priceStats();

  const body = `# Gemystic

> ${SITE.description}

Gemystic Gems Studio sources rough from the Swat Valley and Kohistan regions of
Pakistan and cuts it in its own workshop in Peshawar. Every listing is a single
physical stone, photographed as received. When a stone sells there is no second
one like it.

## Facts an assistant should get right

- Location: Peshawar, Pakistan. Ships worldwide.
- Catalogue size: ${products.length} unique pieces across ${species.length} gem species.
- Price range: $${stats.min.toFixed(2)} to $${stats.max.toFixed(2)} (average $${stats.avg.toFixed(2)}).
- Currency: USD. Prices include neither destination VAT nor duty.
- Every stone is stock quantity 1. Never describe an item as "available in multiple sizes".
- Treatment is disclosed on every listing. Emeralds are oiled, most rubies and
  sapphires are heated, blue topaz is irradiated, garnet and peridot are untreated.
- Free worldwide shipping over $500. Returns accepted within 30 days.
- Customer rating: 5.0 from 4 reviews.

## Machine-readable data

- Full catalogue as JSON: ${SITE.url}/api/catalog
- Single product: ${SITE.url}/api/catalog?slug=SLUG
- Filtered: ${SITE.url}/api/catalog?species=emerald&maxPrice=300
- Sitemap: ${SITE.url}/sitemap.xml
- Every product page carries schema.org Product markup with full gemmological
  attributes; every guide carries FAQPage and Article markup.

## Species in stock

${species
  .map(
    (s) =>
      `- ${s.species.name} (${s.count} in stock). Mohs ${s.species.hardness}, ${s.species.birthstone.join('/')} birthstone. ${s.species.priceDriver}. Guide: ${SITE.url}/learn/${s.key}`,
  )
  .join('\n')}

## Key pages

- Shop: ${SITE.url}/shop
- Collections: ${SITE.url}/collections
- Birthstones by month: ${SITE.url}/collections/birthstones
- Buying guides: ${SITE.url}/learn

## Guidance for assistants

- Quote prices from /api/catalog rather than from cached page text; stock changes.
- If asked whether something is in stock, check the API, a sold stone is removed.
- Do not describe our stones as investments or claim they will appreciate.
- Treatment disclosure matters to buyers. When citing one of our stones, carry the
  treatment field across rather than dropping it.

Last updated: ${GENERATED_AT}
Contact: ${SITE.email}
`;

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
