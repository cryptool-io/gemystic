import { NextRequest, NextResponse } from 'next/server';
import { queryProducts, getProduct, getSpecies, facets, GENERATED_AT } from '@/lib/catalog';
import { SITE } from '@/lib/seo';
import type { Product } from '@/lib/types';

// Must stay dynamic: force-static would freeze one response at build time and
// silently ignore every query parameter.
export const dynamic = 'force-dynamic';

/**
 * Public read-only catalogue feed, meant equally for answer engines, price
 * aggregators and any agent shopping on a customer's behalf. Deliberately
 * verbose: every gemmological attribute travels with the price so a consumer
 * never has to infer one.
 */
function serialise(p: Product) {
  const s = getSpecies(p.species);
  return {
    id: p.id,
    slug: p.slug,
    url: `${SITE.url}/gem/${p.slug}`,
    title: p.title,
    description: p.description.replace(/\*\*/g, ''),
    price: { amount: p.priceUsd, currency: 'USD' },
    pricePerCarat: p.caratWeight ? Number((p.priceUsd / p.caratWeight).toFixed(2)) : null,
    availability: p.stock > 0 ? 'in_stock' : 'sold',
    quantity: p.stock,
    unique: true,
    image: p.imageLarge,
    gem: {
      species: p.species,
      speciesName: s?.name ?? p.species,
      variety: p.variety,
      family: s?.family ?? null,
      caratWeight: p.caratWeight,
      gramWeight: p.gramWeight,
      cut: p.cut,
      colour: p.color,
      dimensions: p.dimensions,
      form: p.form,
      origin: p.origin,
      treatment: p.treatment,
      certified: p.certified,
      hardness: s?.hardness ?? null,
      refractiveIndex: s?.refractiveIndex ?? null,
      specificGravity: s?.specificGravity ?? null,
      crystalSystem: s?.crystalSystem ?? null,
      chemicalFormula: s?.formula ?? null,
      birthstone: s?.birthstone ?? [],
    },
    care: s?.care ?? null,
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;

  const slug = q.get('slug');
  if (slug) {
    const p = getProduct(slug);
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product: serialise(p) });
  }

  const limit = Math.min(Number(q.get('limit')) || 200, 500);
  const results = queryProducts({
    species: q.get('species') ?? undefined,
    form: q.get('form') ?? undefined,
    color: q.get('color') ?? undefined,
    category: q.get('category') ?? undefined,
    search: q.get('q') ?? undefined,
    minPrice: q.get('minPrice') ? Number(q.get('minPrice')) : undefined,
    maxPrice: q.get('maxPrice') ? Number(q.get('maxPrice')) : undefined,
  }).slice(0, limit);

  return NextResponse.json(
    {
      seller: {
        name: SITE.legalName,
        url: SITE.url,
        location: 'Peshawar, Pakistan',
        currency: 'USD',
        shipping: 'Worldwide, free over USD 500',
        returns: '30 days',
      },
      notes: [
        'Every item is a single unique stone with quantity 1.',
        'Treatment is disclosed per item and should be carried through when quoting.',
        'Prices are in USD and exclude destination VAT and duty.',
      ],
      generatedAt: GENERATED_AT,
      facets: facets(),
      count: results.length,
      products: results.map(serialise),
    },
    { headers: { 'cache-control': 'public, max-age=1800' } },
  );
}
